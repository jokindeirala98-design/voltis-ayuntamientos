import SectionTitle from '@/components/report/SectionTitle';
import { fmtNum, fmtPct, pctColor } from '@/components/report/reportUtils';

export default function TarifaTableSection({ rows, sectionNum }) {
  const total = rows.reduce((s, r) => s + (Number(r.consumo_total) || 0), 0);

  const groups = {};
  rows.forEach(r => {
    const t = r.tarifa?.trim() || 'Sin tarifa';
    if (!groups[t]) groups[t] = [];
    groups[t].push(r);
  });

  const sorted = Object.keys(groups).sort();

  return (
    <div className="mb-8" style={{ breakInside: 'avoid' }}>
      <SectionTitle number={sectionNum} title="Resumen por Tarifa" subtitle="Distribución de suministros y consumos agrupados por tipo tarifario" />
      <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid #E2E8F0' }}>
        <table className="w-full" style={{ fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: '#F1F5F9', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <th className="text-left px-5 py-3" style={{ color: '#475569', fontWeight: 600, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Tarifa</th>
              <th className="text-right px-5 py-3" style={{ color: '#475569', fontWeight: 600, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Nº Suministros</th>
              <th className="text-right px-5 py-3" style={{ color: '#475569', fontWeight: 600, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Consumo Total (kWh)</th>
              <th className="text-right px-5 py-3" style={{ color: '#475569', fontWeight: 600, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', minWidth: 120 }}>% del Total</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((tarifa, i) => {
              const grpRows = groups[tarifa];
              const grpTotal = grpRows.reduce((s, r) => s + (Number(r.consumo_total) || 0), 0);
              return (
                <tr key={tarifa} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#F8FAFC', borderTop: '1px solid #F1F5F9' }}>
                  <td className="px-5 py-3" style={{ fontWeight: 700, color: '#1D4ED8' }}>{tarifa}</td>
                  <td className="px-5 py-3 text-right" style={{ color: '#475569' }}>{grpRows.length}</td>
                  <td className="px-5 py-3 text-right" style={{ fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>{fmtNum(grpTotal)}</td>
                  <td className="px-5 py-3 text-right" style={{ color: '#475569', fontWeight: 500 }}>{fmtPct(grpTotal, total)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#EFF6FF', borderTop: '2px solid #BFDBFE', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <td className="px-5 py-3" style={{ fontWeight: 700, color: '#1D4ED8' }}>TOTAL</td>
              <td className="px-5 py-3 text-right" style={{ fontWeight: 700, color: '#1D4ED8' }}>{rows.length}</td>
              <td className="px-5 py-3 text-right" style={{ fontWeight: 700, color: '#1D4ED8', fontVariantNumeric: 'tabular-nums' }}>{fmtNum(total)}</td>
              <td className="px-5 py-3 text-right" style={{ fontWeight: 700, color: '#1D4ED8' }}>100,0 %</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}