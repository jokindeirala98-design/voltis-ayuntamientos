import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Copy, Check, ChevronLeft, ChevronRight, Zap, Flame, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function getPeriodsForRow(row) {
  const tipo = (row.tipo_suministro || '').toLowerCase();
  const tarifa = (row.tarifa || '').toUpperCase();
  if (tipo === 'gas') return ['consumo_total'];
  if (tarifa.includes('3.0') || tarifa.includes('6.1')) return ['consumo_p1', 'consumo_p2', 'consumo_p3', 'consumo_p4', 'consumo_p5', 'consumo_p6'];
  return ['consumo_p1', 'consumo_p2', 'consumo_p3'];
}

const PERIOD_LABELS = {
  consumo_p1: 'P1', consumo_p2: 'P2', consumo_p3: 'P3',
  consumo_p4: 'P4', consumo_p5: 'P5', consumo_p6: 'P6',
  consumo_total: 'Consumo total'
};

function isRowComplete(row) {
  const periods = getPeriodsForRow(row);
  return periods.every(p => row[p] != null && row[p] !== '' && Number(row[p]) > 0);
}

function calcTotal(draft, periods) {
  if (periods.includes('consumo_total')) return Number(draft['consumo_total']) || 0;
  return periods.reduce((s, p) => s + (Number(draft[p]) || 0), 0);
}

export default function QuickConsumoModal({ rows, projectId, onClose, onUpdated }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('pendientes'); // 'todos' | 'pendientes'
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState({});
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set());
  const [finished, setFinished] = useState(false);
  const inputRefs = useRef([]);

  const sortedRows = (() => {
    const incomplete = rows.filter(r => !isRowComplete(r));
    const complete = rows.filter(r => isRowComplete(r));
    return filter === 'pendientes' ? incomplete : [...incomplete, ...complete];
  })();

  const currentRow = sortedRows[index];
  const periods = currentRow ? getPeriodsForRow(currentRow) : [];
  const total = sortedRows.length;
  const completedCount = rows.filter(r => isRowComplete(r)).length;

  // Init draft when row changes
  useEffect(() => {
    if (!currentRow) return;
    const d = {};
    periods.forEach(p => { d[p] = currentRow[p] != null ? String(currentRow[p]) : ''; });
    setDraft(d);
    setSaving(false);
    // Focus first input
    setTimeout(() => { inputRefs.current[0]?.focus(); inputRefs.current[0]?.select(); }, 50);
  }, [index, currentRow?.id, filter]);

  const saveCurrentRow = useCallback(async (row, draftData, periodsList) => {
    const newData = {};
    periodsList.forEach(p => {
      const v = draftData[p];
      newData[p] = v !== '' && v != null ? parseFloat(v) || null : null;
    });
    const tot = calcTotal(draftData, periodsList);
    if (!periodsList.includes('consumo_total')) newData.consumo_total = tot > 0 ? tot : null;

    // Optimistic update
    queryClient.setQueryData(['supply-rows', projectId], (old) =>
      old?.map(r => r.id === row.id ? { ...r, ...newData } : r) || []
    );
    setSavedIds(prev => new Set([...prev, row.id]));
    setSaving(true);
    await base44.entities.SupplyRows.update(row.id, newData);
    setSaving(false);
    if (onUpdated) onUpdated();
  }, [queryClient, projectId, onUpdated]);

  const goNext = useCallback(async () => {
    if (!currentRow) return;
    await saveCurrentRow(currentRow, draft, periods);
    if (index < total - 1) {
      setIndex(i => i + 1);
    } else {
      setFinished(true);
    }
  }, [currentRow, draft, periods, index, total, saveCurrentRow]);

  const goPrev = useCallback(() => {
    if (index > 0) setIndex(i => i - 1);
  }, [index]);

  const handleKeyDown = useCallback((e, periodIdx) => {
    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      if (periodIdx < periods.length - 1) {
        inputRefs.current[periodIdx + 1]?.focus();
        inputRefs.current[periodIdx + 1]?.select();
      } else {
        goNext();
      }
    }
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      if (periodIdx > 0) {
        inputRefs.current[periodIdx - 1]?.focus();
        inputRefs.current[periodIdx - 1]?.select();
      }
    }
  }, [periods, goNext]);

  const copyCups = () => {
    navigator.clipboard.writeText(currentRow?.cups || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (finished) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-10 text-center max-w-md w-full mx-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">¡Consumos cargados!</h2>
          <p className="text-slate-500 text-sm mb-6">La tabla ha sido actualizada con todos los consumos introducidos.</p>
          <Button onClick={onClose} className="bg-blue-900 hover:bg-blue-800 text-white">Cerrar</Button>
        </div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-10 text-center max-w-md w-full mx-4">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Todo completado</h2>
          <p className="text-slate-500 text-sm mb-6">Todos los suministros ya tienen consumos cargados.</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => setFilter('todos')}>Ver todos</Button>
            <Button onClick={onClose} className="bg-blue-900 hover:bg-blue-800 text-white">Cerrar</Button>
          </div>
        </div>
      </div>
    );
  }

  const progress = total > 0 ? ((index) / total) * 100 : 0;
  const complete = currentRow ? isRowComplete(currentRow) : false;
  const tipo = (currentRow?.tipo_suministro || '').toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Carga rápida de consumos</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Suministro <span className="font-semibold text-slate-700">{index + 1}</span> de{' '}
                <span className="font-semibold text-slate-700">{total}</span>
                <span className="ml-2 text-slate-400">·</span>
                <span className="ml-2 text-green-600 font-medium">{completedCount} completos</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                <button
                  onClick={() => { setFilter('pendientes'); setIndex(0); }}
                  className={`px-3 py-1.5 font-medium transition-colors ${filter === 'pendientes' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  Pendientes
                </button>
                <button
                  onClick={() => { setFilter('todos'); setIndex(0); }}
                  className={`px-3 py-1.5 font-medium transition-colors border-l border-slate-200 ${filter === 'todos' ? 'bg-blue-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  Todos
                </button>
              </div>
              <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Supply info */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tipo === 'gas' ? 'bg-orange-100' : 'bg-blue-100'}`}>
              {tipo === 'gas' ? <Flame className="w-4 h-4 text-orange-600" /> : <Zap className="w-4 h-4 text-blue-700" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-slate-900 tracking-wide">{currentRow?.cups || '—'}</span>
                <button
                  onClick={copyCups}
                  className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-all ${copied ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600'}`}
                >
                  {copied ? <><Check className="w-3 h-3" />CUPS copiado</> : <><Copy className="w-3 h-3" />Copiar</>}
                </button>
                {complete && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Completo
                  </span>
                )}
                {!complete && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                    <AlertTriangle className="w-3 h-3" /> Pendiente
                  </span>
                )}
              </div>
              {currentRow?.direccion_suministro && (
                <p className="text-xs text-slate-500 mt-0.5 truncate">{currentRow.direccion_suministro}</p>
              )}
              <div className="flex items-center gap-3 mt-1">
                {currentRow?.tarifa && (
                  <span className="text-xs font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">{currentRow.tarifa}</span>
                )}
                {currentRow?.tipo_suministro && (
                  <span className="text-xs text-slate-500">{currentRow.tipo_suministro}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Consumo inputs */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className={`grid gap-4 ${periods.length <= 3 ? 'grid-cols-1 max-w-xs' : 'grid-cols-2 sm:grid-cols-3'}`}>
            {periods.map((p, i) => (
              <div key={p}>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  {PERIOD_LABELS[p]}
                </label>
                <input
                  ref={el => inputRefs.current[i] = el}
                  type="text"
                  inputMode="decimal"
                  value={draft[p] ?? ''}
                  onChange={e => setDraft(d => ({ ...d, [p]: e.target.value }))}
                  onKeyDown={e => handleKeyDown(e, i)}
                  onFocus={e => e.target.select()}
                  placeholder="0"
                  className="w-full text-lg font-mono px-4 py-3 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            ))}
          </div>

          {/* Live total preview */}
          {!periods.includes('consumo_total') && (
            <div className="mt-5 flex items-center gap-2 text-sm">
              <span className="text-slate-500">Total calculado:</span>
              <span className="font-bold text-slate-900 font-mono">
                {calcTotal(draft, periods).toLocaleString('es-ES')} kWh
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goPrev}
            disabled={index === 0}
            className="gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Anterior
          </Button>

          <div className="flex-1" />

          <Button
            variant="outline"
            size="sm"
            onClick={async () => { await saveCurrentRow(currentRow, draft, periods); }}
            disabled={saving}
            className="text-xs"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>

          {index < total - 1 ? (
            <Button
              size="sm"
              onClick={goNext}
              disabled={saving}
              className="gap-1 bg-blue-900 hover:bg-blue-800 text-white"
            >
              Guardar y siguiente <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={goNext}
              disabled={saving}
              className="gap-1 bg-green-700 hover:bg-green-600 text-white"
            >
              <Check className="w-3.5 h-3.5" /> Finalizar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}