import { useRef, useState } from 'react';
import { read, utils } from 'xlsx';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle2, AlertTriangle, X } from 'lucide-react';

// Normalize a CUPS string: uppercase, no spaces
function normalizeCups(v) {
  return String(v || '').toUpperCase().replace(/\s+/g, '').trim();
}

// Try to detect the CUPS column name in the Excel headers
function findCupsCol(headers) {
  return headers.find(h => /cups/i.test(h));
}

// Map Excel column names to entity keys
const CONSUMO_MAP = {
  'consumo p1': 'consumo_p1', 'consumo_p1': 'consumo_p1',
  'consumo p2': 'consumo_p2', 'consumo_p2': 'consumo_p2',
  'consumo p3': 'consumo_p3', 'consumo_p3': 'consumo_p3',
  'consumo p4': 'consumo_p4', 'consumo_p4': 'consumo_p4',
  'consumo p5': 'consumo_p5', 'consumo_p5': 'consumo_p5',
  'consumo p6': 'consumo_p6', 'consumo_p6': 'consumo_p6',
  'consumo total': 'consumo_total', 'consumo_total': 'consumo_total',
};

export default function ImportConsumosButton({ rows, onUpdated }) {
  const inputRef = useRef();
  const [result, setResult] = useState(null); // { updated, notFound, errors }
  const [loading, setLoading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setLoading(true);
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = utils.sheet_to_json(ws, { defval: null });

      if (!data.length) {
        setResult({ updated: 0, notFound: [], errors: ['El archivo está vacío'] });
        setLoading(false);
        return;
      }

      const headers = Object.keys(data[0]).map(h => h.toLowerCase().trim());
      const cupsCol = Object.keys(data[0]).find(h => /cups/i.test(h));

      if (!cupsCol) {
        setResult({ updated: 0, notFound: [], errors: ['No se encontró columna CUPS en el Excel'] });
        setLoading(false);
        return;
      }

      // Build a map from normalized CUPS → excel row
      const excelByCups = {};
      data.forEach(row => {
        const cups = normalizeCups(row[cupsCol]);
        if (cups) excelByCups[cups] = row;
      });

      // Build map from normalized CUPS → supply row
      const supplyByCups = {};
      rows.forEach(r => {
        const cups = normalizeCups(r.cups);
        if (cups) supplyByCups[cups] = r;
      });

      const notFound = [];
      let updated = 0;

      const updates = [];
      Object.entries(excelByCups).forEach(([cups, excelRow]) => {
        const supply = supplyByCups[cups];
        if (!supply) {
          notFound.push(cups);
          return;
        }
        // Extract consumo fields
        const patch = {};
        Object.entries(excelRow).forEach(([col, val]) => {
          const key = CONSUMO_MAP[col.toLowerCase().trim()];
          if (key && val !== null && val !== '') {
            patch[key] = parseFloat(val) || null;
          }
        });
        if (Object.keys(patch).length > 0) {
          updates.push({ id: supply.id, patch });
        }
      });

      // Save all updates
      await Promise.all(updates.map(({ id, patch }) =>
        base44.entities.SupplyRows.update(id, patch)
      ));
      updated = updates.length;

      setResult({ updated, notFound, errors: [] });
      if (onUpdated) onUpdated();
    } catch (err) {
      setResult({ updated: 0, notFound: [], errors: [err.message] });
    }
    setLoading(false);
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      <Button
        size="sm"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="gap-1.5 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
      >
        <Upload className="w-3.5 h-3.5" />
        {loading ? 'Importando…' : 'Añadir consumos'}
      </Button>

      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Resultado de importación</h3>
              <button onClick={() => setResult(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {result.errors.length > 0 ? (
              <div className="flex items-start gap-2 text-red-600 text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{result.errors[0]}</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  {result.updated} suministros actualizados
                </div>
                {result.notFound.length > 0 && (
                  <div>
                    <p className="text-xs text-amber-700 font-medium mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {result.notFound.length} CUPS del Excel no encontrados en la tabla:
                    </p>
                    <div className="bg-amber-50 rounded p-2 max-h-32 overflow-y-auto">
                      {result.notFound.map(c => (
                        <p key={c} className="text-xs font-mono text-amber-800">{c}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button size="sm" className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-white" onClick={() => setResult(null)}>
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </>
  );
}