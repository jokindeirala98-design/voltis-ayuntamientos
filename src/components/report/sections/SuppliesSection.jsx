import SectionTitle from '@/components/report/SectionTitle';
import { fmtNum } from '@/components/report/reportUtils';

function SupplyCard({ row, index }) {
  const isGas = row.tipo_suministro === 'Gas';
  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-white" style={{ breakInside: 'avoid' }}>
      <div className="flex items-start justify-between mb-1">
        <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded border ${
          isGas
            ? 'bg-orange-50 text-orange-800 border-orange-200'
            : 'bg-blue-50 text-blue-900 border-blue-200'
        }`}>
          {row.tarifa || '—'}
        </span>
        <span className="text-xs text-slate-400 font-mono">#{String(index + 1).padStart(2, '0')}</span>
      </div>
      <p className="text-xs font-medium text-slate-800 mb-0.5 leading-snug">{row.direccion_suministro || '—'}</p>
      <p className="text-xs font-mono text-slate-400 mb-2 tracking-wider truncate">{row.cups || '—'}</p>
      <div className="flex items-baseline gap-1 border-t border-slate-100 pt-2">
        <span className="text-sm font-bold text-slate-900">{fmtNum(row.consumo_total)}</span>
        <span className="text-xs text-slate-500">kWh/año</span>
      </div>
    </div>
  );
}

export default function SuppliesSection({ rows, sectionNum }) {
  const electric = rows.filter(r => r.tipo_suministro === 'Electricidad');
  const gas = rows.filter(r => r.tipo_suministro === 'Gas');

  return (
    <div className="mb-8" style={{ breakInside: 'avoid-page' }}>
      <SectionTitle number={sectionNum} title="Relación de Suministros" subtitle={`${rows.length} suministros en total`} />

      {electric.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Electricidad</span>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">{electric.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {electric.map((row, i) => <SupplyCard key={row.id} row={row} index={i} />)}
          </div>
        </div>
      )}

      {gas.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gas</span>
            <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-0.5 rounded-full">{gas.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {gas.map((row, i) => <SupplyCard key={row.id} row={row} index={i} />)}
          </div>
        </div>
      )}
    </div>
  );
}