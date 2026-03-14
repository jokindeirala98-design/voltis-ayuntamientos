import { useRef, useState } from 'react';
import { read, utils } from 'xlsx';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle2, AlertTriangle, X, FileText, Loader2, AlertCircle, Info } from 'lucide-react';

// ── Normalización ───────────────────────────────────────────────────────────

function normalizeCups(v) {
  return String(v || '').toUpperCase().replace(/[\s\-_.]/g, '').trim();
}

function isValidCups(cups) {
  return /^ES/.test(cups) && cups.length >= 18 && cups.length <= 22;
}

function parseNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// ── Detección de columnas ────────────────────────────────────────────────────

const CUPS_PATTERNS = [/^cups$/i, /^codigocups$/i, /codigo\s*cups/i, /código\s*cups/i, /punto\s*de\s*suministro/i, /^cups\s/i, /cups/i];
const TARIFA_PATTERNS = [/^tarifa$/i, /^atr$/i, /^peaje$/i, /tipo\s*de\s*tarifa/i, /tarifa/i];

const PERIODO_PATTERNS = {
  consumo_p1: [/^p1$/i, /consumo\s*p1/i, /energ[íi]a\s*p1/i, /kwh\s*p1/i, /periodo\s*1/i, /p\.?1\b/i],
  consumo_p2: [/^p2$/i, /consumo\s*p2/i, /energ[íi]a\s*p2/i, /kwh\s*p2/i, /periodo\s*2/i, /p\.?2\b/i],
  consumo_p3: [/^p3$/i, /consumo\s*p3/i, /energ[íi]a\s*p3/i, /kwh\s*p3/i, /periodo\s*3/i, /p\.?3\b/i],
  consumo_p4: [/^p4$/i, /consumo\s*p4/i, /energ[íi]a\s*p4/i, /kwh\s*p4/i, /periodo\s*4/i, /p\.?4\b/i],
  consumo_p5: [/^p5$/i, /consumo\s*p5/i, /energ[íi]a\s*p5/i, /kwh\s*p5/i, /periodo\s*5/i, /p\.?5\b/i],
  consumo_p6: [/^p6$/i, /consumo\s*p6/i, /energ[íi]a\s*p6/i, /kwh\s*p6/i, /periodo\s*6/i, /p\.?6\b/i],
  consumo_total: [/^consumoanual$/i, /consumo\s*anual/i, /consumo\s*total/i, /total\s*consumo/i, /total\s*kwh/i, /kwh\s*gas/i, /anual/i, /^total$/i, /^kwh$/i, /energia\s*total/i, /energ[íi]a\s*total/i],
};

function findCol(headers, patterns) {
  for (const pat of patterns) {
    const found = headers.find(h => pat.test(h.trim()));
    if (found) return found;
  }
  return null;
}

function buildColMap(headers) {
  const map = {};
  map._cups = findCol(headers, CUPS_PATTERNS);
  map._tarifa = findCol(headers, TARIFA_PATTERNS);
  for (const [key, pats] of Object.entries(PERIODO_PATTERNS)) {
    map[key] = findCol(headers, pats);
  }
  return map;
}

// ── Clasificación de tarifa ──────────────────────────────────────────────────

function classifyTarifa(tarifa) {
  const t = String(tarifa || '').toUpperCase().replace(/\s/g, '');
  if (/RL[\s.]*[1-4]/.test(t)) return 'gas';
  if (/GAS/i.test(t)) return 'gas';
  if (/^6\.1/.test(t) || /^3\.0/.test(t)) return 'elec_6p';
  if (/^2\.0/.test(t)) return 'elec_3p';
  // Fallback: generic electricity
  if (/^[236]/.test(t)) return 'elec_6p';
  return null;
}

// Returns which consumo keys to use based on tarifa type
function consumoKeysForType(type) {
  if (type === 'gas') return ['consumo_total'];
  if (type === 'elec_3p') return ['consumo_p1', 'consumo_p2', 'consumo_p3'];
  if (type === 'elec_6p') return ['consumo_p1', 'consumo_p2', 'consumo_p3', 'consumo_p4', 'consumo_p5', 'consumo_p6'];
  return ['consumo_p1', 'consumo_p2', 'consumo_p3', 'consumo_p4', 'consumo_p5', 'consumo_p6', 'consumo_total'];
}

// ── Normaliza nombre de columna para comparación ─────────────────────────────
function normHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/[\s_\-\.]/g, '');
}

// ── Procesado de un sheet ────────────────────────────────────────────────────

function processSheet(data, filename) {
  if (!data.length) return { rows: [], warnings: [`${filename}: hoja vacía`] };

  const headers = Object.keys(data[0]);
  const warnings = [];
  const extracted = [];

  // ── Detectar columnas por nombre normalizado ──────────────────────────────
  const nh = headers.map(h => ({ orig: h, norm: normHeader(h) }));

  const findH = (...candidates) => {
    for (const c of candidates) {
      const cn = normHeader(c);
      const found = nh.find(x => x.norm === cn);
      if (found) return found.orig;
    }
    // fallback: partial match
    for (const c of candidates) {
      const cn = normHeader(c);
      const found = nh.find(x => x.norm.includes(cn) || cn.includes(x.norm));
      if (found) return found.orig;
    }
    return null;
  };

  const cupsCol    = findH('codigocups', 'cups', 'codigocups', 'puntosuministro', 'puntodesuministro');
  const tarifaCol  = findH('tarifa', 'atr', 'peaje', 'tipotarifa', 'tipodetatifa');
  const anualCol   = findH('consumoanual', 'consumoanual', 'consumoanual', 'kwhanual', 'kwhanuales', 'totalanual');

  // ── Detectar si es hoja GAS ──────────────────────────────────────────────
  // Un valor contiene RL1-RL4 si al normalizarlo como string contiene RL seguido de 1-4
  const containsRL = v => /RL[\s.]*[1-4]/i.test(String(v ?? ''));
  let isGasSheet = false;
  let detectedTarifaCol = tarifaCol;

  // Escanear TODAS las columnas y TODAS las filas buscando RL1-RL4
  outer: for (const h of headers) {
    for (const row of data) {
      if (containsRL(row[h])) {
        isGasSheet = true;
        detectedTarifaCol = h;
        break outer;
      }
    }
  }

  // Fallback: si tiene columna "consumoanual" y "codigocups" es casi seguro gas
  if (!isGasSheet && anualCol && nh.some(x => x.norm.includes('codigocups') || x.norm === 'codigocups')) {
    isGasSheet = true;
  }

  // ── Columna de consumo para gas: prioridad "Consumoanual", luego patrones ──
  let gasConsumoCol = anualCol;
  if (isGasSheet && !gasConsumoCol) {
    // buscar cualquier header que contenga "anual"
    gasConsumoCol = nh.find(x => x.norm.includes('anual'))?.orig || null;
  }
  if (isGasSheet && !gasConsumoCol) {
    // buscar cualquier header que contenga "consumo" y no sea cups/codigo
    gasConsumoCol = nh.find(x => x.norm.includes('consumo') && !x.norm.includes('cups') && !x.norm.includes('codigo'))?.orig || null;
  }

  if (isGasSheet && !gasConsumoCol) {
    warnings.push(`${filename}: hoja de gas detectada pero no se encontró columna de consumo anual`);
  }

  // ── colMap para electricidad ──────────────────────────────────────────────
  const colMap = isGasSheet ? null : buildColMap(headers);

  data.forEach((row, i) => {
    // --- Detectar CUPS ---
    let rawCups = cupsCol ? row[cupsCol] : null;
    if (!rawCups) {
      for (const v of Object.values(row)) {
        const nc = normalizeCups(v);
        if (isValidCups(nc)) { rawCups = v; break; }
      }
    }

    const cups = normalizeCups(rawCups);
    if (!cups || !isValidCups(cups)) return;

    const tarifaRaw = detectedTarifaCol ? String(row[detectedTarifaCol] || '').trim() : '';

    if (isGasSheet) {
      // ── RUTA GAS: solo consumo_total desde columna anual ─────────────────
      let total = gasConsumoCol ? parseNum(row[gasConsumoCol]) : null;

      if (total === null || total === 0) {
        warnings.push(`Fila ${i + 2} (${cups}): no se encontró consumo anual — fila omitida`);
        return;
      }

      extracted.push({
        cups,
        tarifa: tarifaRaw,
        tipoTarifa: 'gas',
        consumos: { consumo_total: total },
        source: filename
      });

    } else {
      // ── RUTA ELECTRICIDAD: buscar periodos ───────────────────────────────
      let tipoTarifa = classifyTarifa(tarifaRaw);
      if (!tipoTarifa) {
        for (const v of Object.values(row)) {
          const t = classifyTarifa(v);
          if (t) { tipoTarifa = t; break; }
        }
      }

      const consumos = {};
      const allowedKeys = tipoTarifa
        ? consumoKeysForType(tipoTarifa)
        : ['consumo_total', 'consumo_p1', 'consumo_p2', 'consumo_p3', 'consumo_p4', 'consumo_p5', 'consumo_p6'];

      for (const key of allowedKeys) {
        const col = colMap[key];
        if (col && row[col] !== null && row[col] !== undefined && row[col] !== '') {
          const num = parseNum(row[col]);
          if (num !== null) consumos[key] = num;
        }
      }

      if (Object.keys(consumos).length === 0) {
        warnings.push(`Fila ${i + 2} (${cups}): no se encontraron consumos — fila omitida`);
        return;
      }

      if (tipoTarifa === 'elec_3p') {
        const t = (consumos.consumo_p1 || 0) + (consumos.consumo_p2 || 0) + (consumos.consumo_p3 || 0);
        if (t > 0) consumos.consumo_total = Math.round(t * 1000) / 1000;
      } else if (tipoTarifa === 'elec_6p') {
        const t = ['consumo_p1','consumo_p2','consumo_p3','consumo_p4','consumo_p5','consumo_p6']
          .reduce((s, k) => s + (consumos[k] || 0), 0);
        if (t > 0) consumos.consumo_total = Math.round(t * 1000) / 1000;
      }

      extracted.push({ cups, tarifa: tarifaRaw, tipoTarifa, consumos, source: filename });
    }
  });

  return { rows: extracted, warnings };
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function ImportConsumosButton({ rows, onUpdated }) {
  const inputRef = useRef();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState([]); // [{ name, data, warnings }]
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState(null); // { matches, conflicts, notFound, warnings }
  const [done, setDone] = useState(null); // { updated, conflicts, notFound, warnings }

  const reset = () => {
    setFiles([]);
    setPreview(null);
    setDone(null);
    setLoading(false);
    setApplying(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = () => { reset(); setOpen(false); };

  // ── Step 1: read files ──────────────────────────────────────────────────
  const handleFilesChange = async (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    e.target.value = '';
    setLoading(true);
    setPreview(null);
    setDone(null);

    const parsed = [];
    for (const file of selected) {
      const buffer = await file.arrayBuffer();
      const wb = read(buffer);
      let allRows = [];
      let allWarnings = [];
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const data = utils.sheet_to_json(ws, { defval: null });
        const { rows: sheetRows, warnings } = processSheet(data, `${file.name} [${sheetName}]`);
        allRows = allRows.concat(sheetRows);
        allWarnings = allWarnings.concat(warnings);
      }
      parsed.push({ name: file.name, rows: allRows, warnings: allWarnings });
    }

    setFiles(parsed);

    // ── Step 2: build preview ─────────────────────────────────────────────
    // Merge all extracted rows, detect conflicts
    const byExcelCups = {}; // cups → [extracted]
    for (const f of parsed) {
      for (const r of f.rows) {
        if (!byExcelCups[r.cups]) byExcelCups[r.cups] = [];
        byExcelCups[r.cups].push(r);
      }
    }

    const supplyByCups = {};
    rows.forEach(r => {
      const c = normalizeCups(r.cups);
      if (c) supplyByCups[c] = r;
    });

    const matches = [];
    const conflicts = [];
    const notFound = [];
    const globalWarnings = parsed.flatMap(f => f.warnings);

    for (const [cups, entries] of Object.entries(byExcelCups)) {
      const supply = supplyByCups[cups];
      if (!supply) { notFound.push(cups); continue; }

      if (entries.length > 1) {
        // Check if values are identical
        const keys = Object.keys(entries[0].consumos);
        const identical = entries.every(e => keys.every(k => e.consumos[k] === entries[0].consumos[k]));
        if (!identical) {
          conflicts.push({ cups, entries });
          continue;
        }
      }

      matches.push({ cups, supply, consumos: entries[0].consumos, tarifa: entries[0].tarifa, tipoTarifa: entries[0].tipoTarifa });
    }

    setPreview({ matches, conflicts, notFound, warnings: globalWarnings });
    setLoading(false);
  };

  // ── Step 3: apply to DB ─────────────────────────────────────────────────
  const handleApply = async () => {
    if (!preview) return;
    setApplying(true);

    const results = await Promise.allSettled(
      preview.matches.map(({ supply, consumos, tarifa, tipoTarifa }) => {
        const patch = { ...consumos };
        // For gas: also set tarifa and tipo_suministro
        if (tipoTarifa === 'gas') {
          if (tarifa) patch.tarifa = String(tarifa).trim();
          if (!supply.tipo_suministro || supply.tipo_suministro === '') patch.tipo_suministro = 'Gas';
        }
        return base44.entities.SupplyRows.update(supply.id, patch);
      })
    );

    const failed = results.filter(r => r.status === 'rejected').length;
    setDone({
      updated: results.length - failed,
      failed,
      conflicts: preview.conflicts.length,
      notFound: preview.notFound,
      warnings: preview.warnings,
    });
    setApplying(false);
    if (onUpdated) onUpdated();
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
      >
        <Upload className="w-3.5 h-3.5" />
        Añadir consumos
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Añadir consumos desde Excel</h3>
                <p className="text-xs text-slate-400 mt-0.5">Sube uno o varios archivos .xlsx con datos de CUPS y consumos</p>
              </div>
              <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 ml-4">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Done state */}
              {done ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">
                      {done.updated} suministro{done.updated !== 1 ? 's' : ''} actualizado{done.updated !== 1 ? 's' : ''} correctamente
                    </span>
                  </div>
                  {done.failed > 0 && <InfoLine color="red" icon={AlertCircle} text={`${done.failed} actualizaciones fallaron`} />}
                  {done.conflicts > 0 && <InfoLine color="amber" icon={AlertTriangle} text={`${done.conflicts} CUPS con conflicto de datos no aplicados — revisar manualmente`} />}
                  {done.notFound.length > 0 && (
                    <CupsList title={`${done.notFound.length} CUPS del Excel no encontrados en la tabla`} items={done.notFound} color="amber" />
                  )}
                  {done.warnings.length > 0 && (
                    <WarnList warnings={done.warnings} />
                  )}
                </div>
              ) : preview ? (
                /* Preview state */
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <StatBox label="Actualizables" value={preview.matches.length} color="emerald" />
                    <StatBox label="No encontrados" value={preview.notFound.length} color="amber" />
                    <StatBox label="Conflictos" value={preview.conflicts.length} color="red" />
                  </div>

                  {preview.matches.length > 0 && (
                    <MatchList matches={preview.matches} />
                  )}
                  {preview.conflicts.length > 0 && (
                    <ConflictList conflicts={preview.conflicts} />
                  )}
                  {preview.notFound.length > 0 && (
                    <CupsList title={`${preview.notFound.length} CUPS no encontrados en la tabla`} items={preview.notFound} color="amber" />
                  )}
                  {preview.warnings.length > 0 && (
                    <WarnList warnings={preview.warnings} />
                  )}
                </div>
              ) : (
                /* Upload state */
                <>
                  <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 rounded-xl p-8 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors">
                    <input
                      ref={inputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      multiple
                      className="hidden"
                      onChange={handleFilesChange}
                    />
                    {loading ? (
                      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8 text-slate-300" />
                    )}
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-600">
                        {loading ? 'Procesando archivos…' : 'Haz clic para subir archivos Excel'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Puedes subir uno o varios .xlsx a la vez
                      </p>
                    </div>
                  </label>

                  <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
                    <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1"><Info className="w-3 h-3" /> Formato esperado</p>
                    <p className="text-xs text-slate-600 font-medium mt-1">Electricidad:</p>
                    <p className="text-xs text-slate-500">• Columna <strong>CUPS</strong> (o "Código CUPS", "Punto de suministro")</p>
                    <p className="text-xs text-slate-500">• Columna <strong>Tarifa</strong> (ej: 2.0TD, 3.0TD, 6.1TD…)</p>
                    <p className="text-xs text-slate-500">• Columnas de consumo: <strong>P1, P2, P3</strong>… o "Consumo P1", "Energía P1"…</p>
                    <p className="text-xs text-slate-600 font-medium mt-1">Gas:</p>
                    <p className="text-xs text-slate-500">• Columna <strong>CodigoCUPS</strong></p>
                    <p className="text-xs text-slate-500">• Columna <strong>Tarifa</strong> con valores RL1, RL2, RL3 o RL4 (detecta gas automáticamente)</p>
                    <p className="text-xs text-slate-500">• Columna <strong>Consumoanual</strong> con el consumo en kWh</p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 shrink-0 flex justify-end gap-2">
              {done ? (
                <Button size="sm" className="bg-slate-800 hover:bg-slate-700 text-white text-xs" onClick={handleClose}>
                  Cerrar
                </Button>
              ) : preview ? (
                <>
                  <Button size="sm" variant="outline" className="text-xs" onClick={reset}>
                    Subir otros archivos
                  </Button>
                  <Button
                    size="sm"
                    disabled={applying || preview.matches.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                    onClick={handleApply}
                  >
                    {applying && <Loader2 className="w-3 h-3 animate-spin" />}
                    Aplicar {preview.matches.length} consumos a la tabla
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" className="text-xs" onClick={handleClose}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatBox({ label, value, color }) {
  const colors = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    red: 'bg-red-50 border-red-200 text-red-700',
  };
  return (
    <div className={`border rounded-lg px-3 py-2 text-center ${colors[color]}`}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs mt-0.5">{label}</p>
    </div>
  );
}

function MatchList({ matches }) {
  return (
    <div>
      <p className="text-xs font-medium text-emerald-700 mb-1 flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" /> {matches.length} suministros listos para actualizar
      </p>
      <div className="bg-emerald-50 border border-emerald-100 rounded-lg max-h-36 overflow-y-auto divide-y divide-emerald-100">
        {matches.map(m => (
          <div key={m.cups} className="flex items-center gap-2 px-3 py-1.5">
            <span className="font-mono text-xs text-emerald-800 flex-1 truncate">{m.cups}</span>
            {m.tarifa && <span className="text-xs text-emerald-600 bg-emerald-100 rounded px-1.5 py-0.5 shrink-0">{m.tarifa}</span>}
            <span className="text-xs text-emerald-500 shrink-0">
              {Object.entries(m.consumos).filter(([k, v]) => v !== null && k !== 'consumo_total').map(([k]) => k.replace('consumo_', '').toUpperCase()).join(' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConflictList({ conflicts }) {
  return (
    <div>
      <p className="text-xs font-medium text-red-700 mb-1 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" /> {conflicts.length} conflictos detectados (no se aplicarán)
      </p>
      <div className="bg-red-50 border border-red-100 rounded-lg max-h-28 overflow-y-auto divide-y divide-red-100">
        {conflicts.map(c => (
          <div key={c.cups} className="px-3 py-1.5">
            <p className="font-mono text-xs text-red-800">{c.cups}</p>
            <p className="text-xs text-red-500">Aparece en {c.entries.length} archivos con valores distintos</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CupsList({ title, items, color }) {
  const colors = { amber: 'text-amber-700 bg-amber-50 border-amber-100 text-amber-800', red: 'text-red-700 bg-red-50 border-red-100 text-red-800' };
  const [tc, bc, ic] = colors[color]?.split(' ') || colors.amber.split(' ');
  return (
    <div>
      <p className={`text-xs font-medium mb-1 flex items-center gap-1 ${tc}`}>
        <AlertTriangle className="w-3 h-3" /> {title}
      </p>
      <div className={`border rounded-lg max-h-28 overflow-y-auto divide-y px-3 py-1 ${bc} border-${color}-100`}>
        {items.map(c => <p key={c} className={`text-xs font-mono py-1 ${ic}`}>{c}</p>)}
      </div>
    </div>
  );
}

function WarnList({ warnings }) {
  if (!warnings.length) return null;
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
        <Info className="w-3 h-3" /> {warnings.length} avisos
      </p>
      <div className="bg-slate-50 border border-slate-200 rounded-lg max-h-24 overflow-y-auto px-3 py-1 divide-y divide-slate-100">
        {warnings.map((w, i) => <p key={i} className="text-xs text-slate-500 py-1">{w}</p>)}
      </div>
    </div>
  );
}

function InfoLine({ color, icon: Icon, text }) {
  const colors = { red: 'bg-red-50 border-red-200 text-red-700', amber: 'bg-amber-50 border-amber-200 text-amber-700' };
  return (
    <div className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm ${colors[color]}`}>
      <Icon className="w-4 h-4 shrink-0" />
      <span>{text}</span>
    </div>
  );
}