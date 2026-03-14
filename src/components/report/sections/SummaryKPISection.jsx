import { Zap, Flame, LayoutGrid, Activity } from 'lucide-react';
import SectionTitle from '@/components/report/SectionTitle';
import { fmtNum } from '@/components/report/reportUtils';

function KPICard({ label, value, unit, icon: Icon, accentColor, highlight }) {
  if (highlight) {
    return (
      <div className="rounded-2xl p-6 text-center flex flex-col items-center gap-1" style={{ backgroundColor: '#0F172A', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        {Icon && <Icon style={{ width: 22, height: 22, color: '#60A5FA', marginBottom: 6 }} />}
        <div style={{ fontSize: 32, fontWeight: 700, color: 'white', lineHeight: 1.1 }}>{value}</div>
        {unit && <div style={{ fontSize: 11, color: '#93C5FD', marginTop: 2 }}>{unit}</div>}
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{label}</div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border p-6 text-center flex flex-col items-center gap-1 bg-white" style={{ borderColor: '#E2E8F0' }}>
      {Icon && <Icon style={{ width: 22, height: 22, color: accentColor || '#2563EB', marginBottom: 6 }} />}
      <div style={{ fontSize: 32, fontWeight: 700, color: '#0F172A', lineHeight: 1.1 }}>{value}</div>
      {unit && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{unit}</div>}
      <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function SubCard({ label, count, total, color }) {
  const isGas = color === 'orange';
  const accentColor = isGas ? '#10B981' : '#2563EB';
  const bgColor = isGas ? '#F0FDF4' : '#EFF6FF';
  const borderColor = isGas ? '#BBF7D0' : '#BFDBFE';
  const Icon = isGas ? Flame : Zap;
  return (
    <div className="rounded-xl border px-5 py-4 flex items-center justify-between" style={{ backgroundColor: bgColor, borderColor, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
      <div className="flex items-center gap-3">
        <Icon style={{ width: 18, height: 18, color: accentColor, flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{label}</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>{count} suministros</p>
        </div>
      </div>
      <div className="text-right">
        <p style={{ fontSize: 18, fontWeight: 700, color: accentColor }}>{fmtNum(total)}</p>
        <p style={{ fontSize: 11, color: '#94A3B8' }}>kWh/año</p>
      </div>
    </div>
  );
}

export default function SummaryKPISection({ rows, classified, sectionNum }) {
  const total = rows.reduce((s, r) => s + (Number(r.consumo_total) || 0), 0);
  const totalElec = classified.electric.reduce((s, r) => s + (Number(r.consumo_total) || 0), 0);
  const totalGas = classified.gas.reduce((s, r) => s + (Number(r.consumo_total) || 0), 0);

  return (
    <div style={{ pageBreakBefore: 'always', breakBefore: 'page', paddingTop: '18mm' }} className="mb-8">
      <SectionTitle number={sectionNum} title="Consumo Acumulado Total" subtitle="Resumen global de todos los suministros del proyecto" />

      <div className="grid grid-cols-2 gap-4 mb-5" style={{ breakInside: 'avoid' }}>
        <KPICard label="Total suministros" value={rows.length} unit="puntos de suministro" icon={LayoutGrid} accentColor="#475569" />
        <KPICard label="Consumo anual total" value={fmtNum(total)} unit="kWh/año" icon={Activity} highlight />
      </div>

      {(classified.electric.length > 0 || classified.gas.length > 0) && (
        <div className="space-y-3" style={{ breakInside: 'avoid' }}>
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