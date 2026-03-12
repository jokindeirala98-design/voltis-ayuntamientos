import SectionTitle from '@/components/report/SectionTitle';
import { fmtNum } from '@/components/report/reportUtils';

function KPICard({ label, value, unit, highlight }) {
  return (
    <div className={`rounded-xl border p-5 text-center ${highlight ? 'bg-blue-900 border-blue-800' : 'bg-white border-slate-200'}`}>
      <div className={`text-2xl font-bold mb-0.5 ${highlight ? 'text-white' : 'text-slate-900'}`}>{value}</div>
      {unit && <div className={`text-xs mb-1 ${highlight ? 'text-blue-200' : 'text-slate-400'}`}>{unit}</div>}
      <div className={`text-xs ${highlight ? 'text-blue-300' : 'text-slate-500'}`}>{label}</div>
    </div>
  );
}

function SubCard({ label, count, total, color }) {
  const colorCls = color === 'orange'
    ? 'border-orange-200 bg-orange-50'
    : 'border-blue-100 bg-blue-50';
  const valueCls = color === 'orange' ? 'text-orange-900' : 'text-blue-900';

  return (
    <div className={`rounded-lg border px-4 py-3 flex items-center justify-between ${colorCls}`}>
      <div>
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className={`text-sm font-bold ${valueCls}`}>{count} suministros</p>
      </div>
      <div className="text-right">
        <p className={`text-base font-bold ${valueCls}`}>{fmtNum(total)}</p>
        <p className="text-xs text-slate-400">kWh/año</p>
      </div>
    </div>
  );
}

export default function SummaryKPISection({ rows, classified, sectionNum }) {
  const total = rows.reduce((s, r) => s + (Number(r.consumo_total) || 0), 0);
  const totalElec = classified.electric.reduce((s, r) => s + (Number(r.consumo_total) || 0), 0);
  const totalGas = classified.gas.reduce((s, r) => s + (Number(r.consumo_total) || 0), 0);

  return (
    <div className="mb-12">
      <SectionTitle number={sectionNum} title="Consumo Acumulado Total" subtitle="Resumen global de todos los suministros del proyecto" />

      <div className="grid grid-cols-2 gap-4 mb-5">
        <KPICard label="Total suministros" value={rows.length} unit="puntos de suministro" />
        <KPICard label="Consumo anual total" value={fmtNum(total)} unit="kWh/año" highlight />
      </div>

      {(classified.electric.length > 0 || classified.gas.length > 0) && (
        <div className="space-y-2">
          {classified.electric.length > 0 && (
            <SubCard label="Suministros eléctricos" count={classified.electric.length} total={totalElec} color="blue" />
          )}
          {classified.gas.length > 0 && (
            <SubCard label="Suministros de gas" count={classified.gas.length} total={totalGas} color="orange" />
          )}
        </div>
      )}
    </div>
  );
}