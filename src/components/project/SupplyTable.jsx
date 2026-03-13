import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertCircle, CheckCircle2, AlertTriangle, Trash2, Plus, ChevronUp, ChevronDown, ChevronsUpDown, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COLUMNS = [
  { key: 'comercializadora', label: 'Comercializadora', width: 160, critical: true },
  { key: 'cups', label: 'CUPS', width: 200, critical: true },
  { key: 'tarifa', label: 'Tarifa', width: 90, critical: true },
  { key: 'direccion_suministro', label: 'Dirección suministro', width: 200, critical: true },
  { key: 'tipo_suministro', label: 'Tipo', width: 90, critical: true },
  { key: 'potencia_p1', label: 'Pot. P1', width: 80, type: 'number' },
  { key: 'potencia_p2', label: 'Pot. P2', width: 80, type: 'number' },
  { key: 'potencia_p3', label: 'Pot. P3', width: 80, type: 'number' },
  { key: 'potencia_p4', label: 'Pot. P4', width: 80, type: 'number' },
  { key: 'potencia_p5', label: 'Pot. P5', width: 80, type: 'number' },
  { key: 'potencia_p6', label: 'Pot. P6', width: 80, type: 'number' },
  { key: 'consumo_p1', label: 'Cons. P1', width: 90, type: 'number', manual: true },
  { key: 'consumo_p2', label: 'Cons. P2', width: 90, type: 'number', manual: true },
  { key: 'consumo_p3', label: 'Cons. P3', width: 90, type: 'number', manual: true },
  { key: 'consumo_p4', label: 'Cons. P4', width: 90, type: 'number', manual: true },
  { key: 'consumo_p5', label: 'Cons. P5', width: 90, type: 'number', manual: true },
  { key: 'consumo_p6', label: 'Cons. P6', width: 90, type: 'number', manual: true },
  { key: 'consumo_total', label: 'Cons. Total', width: 90, type: 'number', manual: true },
  { key: 'archivo_origen', label: 'Archivo origen', width: 160 },
  { key: 'validation_status', label: 'Estado', width: 100 },
  { key: 'observations', label: 'Observaciones', width: 240 },
];

const validationConfig = {
  OK: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'OK' },
  Revisar: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Revisar' },
  Incompleto: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Incompleto' }
};

function getCellBg(row, colKey, confidence, conf) {
  const criticalCols = ['comercializadora', 'cups', 'tarifa', 'direccion_suministro', 'tipo_suministro'];
  if (!criticalCols.includes(colKey)) return '';
  const val = row[colKey];
  if (!val || val === '') return 'bg-red-50';
  // Tarifa: highlight by origin
  if (colKey === 'tarifa') {
    const origin = conf?.tarifa_detectada_por;
    if (origin === 'potencias' || origin === 'inferencia') return 'bg-amber-50';
    if (origin === 'factura' || origin === 'manual') return '';
  }
  if (confidence === 'baja') return 'bg-red-50';
  if (confidence === 'media') return 'bg-amber-50';
  return '';
}

const TARIFA_ORIGIN_LABELS = {
  factura: 'Tarifa extraída directamente de la factura',
  potencias: 'Tarifa deducida por potencia contratada',
  inferencia: 'Tarifa inferida por estructura del suministro',
  manual: 'Tarifa corregida manualmente'
};

const CUPS_ORIGIN_LABELS = {
  etiqueta_cups: 'CUPS detectado junto a etiqueta explícita',
  contexto_suministro: 'CUPS detectado en bloque de datos del suministro',
  patron_ocr: 'CUPS detectado por patrón OCR (sin contexto claro)',
  manual: 'CUPS corregido manualmente'
};

// Returns true if this column should be disabled for the given row's tariff
function isCellDisabled(row, colKey) {
  const tarifa = (row.tarifa || '').toUpperCase();
  const is20TD = tarifa.includes('2.0');
  if (!is20TD) return false;
  const disabledFor20TD = ['potencia_p3', 'potencia_p4', 'potencia_p5', 'potencia_p6', 'consumo_p4', 'consumo_p5', 'consumo_p6'];
  return disabledFor20TD.includes(colKey);
}

const CONSUMO_NAV_COLS = ['consumo_p1', 'consumo_p2', 'consumo_p3', 'consumo_p4', 'consumo_p5', 'consumo_p6'];

function EditableCell({ value, onChange, type = 'text', disabled = false, cellId, onEnterNav }) {
  if (disabled) {
    return (
      <div className="w-full h-full px-1.5 py-0.5 text-xs text-slate-200 bg-slate-50 cursor-not-allowed select-none" title="No aplica para esta tarifa">
        —
      </div>
    );
  }
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);
  const committedRef = useRef(false);

  const start = () => {
    committedRef.current = false;
    setDraft(value != null ? String(value) : '');
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 10);
  };

  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    setEditing(false);
    const parsed = type === 'number' && draft !== '' ? parseFloat(draft) : draft;
    if (parsed !== value) onChange(type === 'number' && draft === '' ? null : parsed);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode={type === 'number' ? 'decimal' : 'text'}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') { commit(); onEnterNav && onEnterNav(); }
          if (e.key === 'Escape') { committedRef.current = true; setEditing(false); }
        }}
        className="w-full h-full px-1.5 py-0.5 text-xs border border-blue-400 outline-none rounded focus:ring-1 ring-blue-300"
      />
    );
  }

  return (
    <div
      tabIndex={0}
      onClick={start}
      onFocus={start}
      data-cell-id={cellId}
      className="w-full h-full px-1.5 py-0.5 cursor-pointer text-xs truncate outline-none"
      title={String(value ?? '')}
    >
      {value !== null && value !== undefined && value !== '' ? String(value) : (
        <span className="text-slate-300">—</span>
      )}
    </div>
  );
}

export default function SupplyTable({ rows, projectId, onRowDeleted, onRowAdded, onRowUpdated, onViewDetail }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [savingRows, setSavingRows] = useState(new Set());
  const [savedRows, setSavedRows] = useState(new Set());
  const tableRef = useRef(null);

  const queryClient = useQueryClient();
  const debounceTimers = useRef({});

  // Navigate to next consumo cell on Enter
  const handleEnterNav = useCallback((rowId, colKey, filteredRows) => {
    const colIdx = CONSUMO_NAV_COLS.indexOf(colKey);
    if (colIdx === -1) return;

    const nextCol = CONSUMO_NAV_COLS[colIdx + 1];
    if (nextCol) {
      // Next period in same row
      setTimeout(() => {
        const el = tableRef.current?.querySelector(`[data-cell-id="${rowId}_${nextCol}"]`);
        el?.focus();
      }, 20);
    } else {
      // Move to first consumo of next row
      const rowIdx = filteredRows.findIndex(r => r.id === rowId);
      const nextRow = filteredRows[rowIdx + 1];
      if (nextRow) {
        setTimeout(() => {
          const el = tableRef.current?.querySelector(`[data-cell-id="${nextRow.id}_consumo_p1"]`);
          el?.focus();
        }, 20);
      }
    }
  }, []);

  // ── Optimistic cell update + debounced API save ──────────────────────────
  const handleCellChange = useCallback((row, key, value) => {
    const newData = { [key]: value };

    // Auto-recalculate consumo_total if consumo_px changes
    if (key.startsWith('consumo_p')) {
      const updatedRow = { ...row, [key]: value };
      const total = ['consumo_p1', 'consumo_p2', 'consumo_p3', 'consumo_p4', 'consumo_p5', 'consumo_p6']
        .reduce((sum, k) => sum + (parseFloat(updatedRow[k]) || 0), 0);
      if (total > 0) newData.consumo_total = Math.round(total * 1000) / 1000;
    }

    // Revalidate status when critical fields change
    const criticals = ['comercializadora', 'cups', 'tarifa', 'direccion_suministro', 'tipo_suministro'];
    if (criticals.includes(key)) {
      const updatedRow = { ...row, [key]: value };
      const hasEmpty = criticals.some(k => !updatedRow[k] || updatedRow[k] === '');
      if (!hasEmpty && row.validation_status === 'Incompleto') {
        newData.validation_status = 'Revisar';
      }
    }

    // 1. Optimistic update in cache — instantaneous, no re-fetch
    queryClient.setQueryData(['supply-rows', projectId], (old) =>
      old?.map(r => r.id === row.id ? { ...r, ...newData } : r) || []
    );

    // 2. Show saving indicator
    setSavingRows(prev => new Set([...prev, row.id]));
    setSavedRows(prev => { const s = new Set(prev); s.delete(row.id); return s; });

    // 3. Debounce API call per row (300ms)
    if (debounceTimers.current[row.id]) clearTimeout(debounceTimers.current[row.id]);
    debounceTimers.current[row.id] = setTimeout(async () => {
      try {
        await base44.entities.SupplyRows.update(row.id, newData);
        setSavingRows(prev => { const s = new Set(prev); s.delete(row.id); return s; });
        setSavedRows(prev => new Set([...prev, row.id]));
        setTimeout(() => setSavedRows(prev => { const s = new Set(prev); s.delete(row.id); return s; }), 2000);
        if (onRowUpdated) onRowUpdated();
      } catch (_) {
        setSavingRows(prev => { const s = new Set(prev); s.delete(row.id); return s; });
      }
      delete debounceTimers.current[row.id];
    }, 300);
  }, [queryClient, projectId, onRowUpdated]);

  // ── Delete row ────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SupplyRows.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(['supply-rows', projectId], (old) =>
        old?.filter(r => r.id !== id) || []
      );
      setConfirmDeleteId(null);
      if (onRowDeleted) onRowDeleted();
    }
  });

  // ── Add row ───────────────────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: () => base44.entities.SupplyRows.create({
      project_id: projectId,
      validation_status: 'Incompleto',
      observations: 'Fila añadida manualmente'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supply-rows', projectId] });
      if (onRowAdded) onRowAdded();
    }
  });

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  // Filter & sort
  let filtered = rows;
  if (filter) {
    const q = filter.toLowerCase();
    filtered = filtered.filter(r =>
      (r.cups || '').toLowerCase().includes(q) ||
      (r.direccion_suministro || '').toLowerCase().includes(q) ||
      (r.comercializadora || '').toLowerCase().includes(q) ||
      (r.archivo_origen || '').toLowerCase().includes(q)
    );
  }
  if (statusFilter !== 'all') {
    filtered = filtered.filter(r => r.validation_status === statusFilter);
  }
  if (sortKey) {
    filtered = [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  // Saving status indicator
  const totalSaving = savingRows.size;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por CUPS, dirección, comercializadora…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded px-3 py-1.5 w-72 outline-none focus:border-blue-400"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-blue-400 bg-white"
        >
          <option value="all">Todos los estados</option>
          <option value="OK">OK</option>
          <option value="Revisar">Revisar</option>
          <option value="Incompleto">Incompleto</option>
        </select>
        <span className="text-xs text-slate-400">{filtered.length} filas</span>

        {/* Save status indicator */}
        <div className="ml-auto flex items-center gap-2">
          {totalSaving > 0 && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Guardando cambios…
            </span>
          )}
          {totalSaving === 0 && savedRows.size > 0 && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="w-3 h-3" /> Cambios guardados
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isPending}
            className="gap-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Añadir fila
          </Button>
        </div>
      </div>

      {/* Table */}
      <div ref={tableRef} className="flex-1 overflow-auto border border-slate-200 rounded-lg">
        <table className="text-xs border-collapse" style={{ minWidth: COLUMNS.reduce((s, c) => s + c.width, 90) }}>
          <thead>
            <tr className="bg-slate-50 sticky top-0 z-10">
              <th className="w-10 border-b border-r border-slate-200 px-2 text-slate-400 font-normal">#</th>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className="border-b border-r border-slate-200 px-1.5 py-2 text-left font-medium text-slate-600 cursor-pointer hover:bg-slate-100 select-none"
                  style={{ width: col.width, minWidth: col.width }}
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    <span className="truncate">{col.label}</span>
                    {col.manual && <span className="text-blue-300" title="Edición manual">✏</span>}
                    <SortIcon k={col.key} />
                  </div>
                </th>
              ))}
              <th className="w-20 border-b border-slate-200 px-2 text-slate-400 font-normal">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 2} className="py-12 text-center text-slate-400">
                  {rows.length === 0 ? 'Sube facturas para ver los suministros extraídos' : 'No hay resultados para ese filtro'}
                </td>
              </tr>
            )}
            {filtered.map((row, idx) => {
              const conf = row.confidence_json ? (() => { try { return JSON.parse(row.confidence_json); } catch { return {}; } })() : {};
              const vc = validationConfig[row.validation_status] || validationConfig.Incompleto;
              const VIcon = vc.icon;
              const isConfirmingDelete = confirmDeleteId === row.id;
              const isSaving = savingRows.has(row.id);
              const isSaved = savedRows.has(row.id);

              return (
                <tr
                  key={row.id}
                  className={`group border-b border-slate-100 transition-colors ${
                    isConfirmingDelete ? 'bg-red-50' : 'hover:bg-slate-50/50'
                  } ${isSaving ? 'opacity-80' : ''}`}
                >
                  <td className="border-r border-slate-100 px-2 text-slate-400 text-center select-none">
                    <div className="flex items-center justify-center gap-1">
                      <span>{idx + 1}</span>
                      {isSaving && <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-400" />}
                      {!isSaving && isSaved && <Check className="w-2.5 h-2.5 text-green-500" />}
                    </div>
                  </td>
                  {COLUMNS.map(col => {
                    if (col.key === 'validation_status') {
                      return (
                        <td key={col.key} className={`border-r border-slate-100 ${vc.bg}`} style={{ width: col.width }}>
                          <div className={`flex items-center gap-1 px-2 py-1 ${vc.color}`}>
                            <VIcon className="w-3 h-3 shrink-0" />
                            <span className="truncate font-medium">{row.validation_status}</span>
                          </div>
                        </td>
                      );
                    }
                    const cellBg = getCellBg(row, col.key, conf[col.key], conf);
                    // Tooltip for tarifa and cups origin
                    let cellTitle = undefined;
                    if (col.key === 'tarifa' && conf?.tarifa_detectada_por) {
                      cellTitle = TARIFA_ORIGIN_LABELS[conf.tarifa_detectada_por] || conf.tarifa_detectada_por;
                    }
                    if (col.key === 'cups' && conf?.cups_detectado_por) {
                      cellTitle = CUPS_ORIGIN_LABELS[conf.cups_detectado_por] || conf.cups_detectado_por;
                    }
                    return (
                      <td
                        key={col.key}
                        className={`border-r border-slate-100 ${cellBg} p-0`}
                        style={{ width: col.width, height: 30 }}
                        title={cellTitle}
                      >
                        <EditableCell
                          value={row[col.key]}
                          type={col.type || 'text'}
                          disabled={isCellDisabled(row, col.key)}
                          onChange={val => handleCellChange(row, col.key, val)}
                          cellId={`${row.id}_${col.key}`}
                          onEnterNav={CONSUMO_NAV_COLS.includes(col.key) ? () => handleEnterNav(row.id, col.key, filtered) : undefined}
                        />
                      </td>
                    );
                  })}

                  {/* Actions cell */}
                  <td className="px-1 text-center" style={{ width: 80 }}>
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteMutation.mutate(row.id)}
                          disabled={deleteMutation.isPending}
                          className="text-xs px-1.5 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
                          title="Confirmar eliminación"
                        >
                          {deleteMutation.isPending ? '…' : 'Sí'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onViewDetail && onViewDetail(row)}
                          className="p-0.5 text-slate-400 hover:text-slate-600"
                          title="Ver detalle"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(row.id)}
                          className="p-0.5 text-slate-300 hover:text-red-500"
                          title="Eliminar suministro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}