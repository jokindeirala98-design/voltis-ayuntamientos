import SectionTitle from '@/components/report/SectionTitle';
import { fmtNum, fmtPct, pctBadgeClass } from '@/components/report/reportUtils';

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
    <div className="mb-8" style={{ pageBreakBefore: 'always', breakBefore: 'page', breakInside: 'avoid' }}>
      <SectionTitle number={sectionNum} title="Resumen por Tarifa" subtitle="Distribución de suministros y consumos agrupados por tipo tarifario" />
      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-900 text-white">
              <th className="text-left px-5 py-3 font-semibold">Tarifa</th>
              <th className="text-right px-5 py-3 font-semibold">Nº Suministros</th>
              <th className="text-right px-5 py-3 font-semibold">Consumo Total (kWh)</th>
              <th className="text-right p-0 font-semibold" style={{ minWidth: 120 }}>
                <span className="block w-full px-4 py-3 text-right">% del Total</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((tarifa, i) => {
              const grpRows = groups[tarifa];
              const grpTotal = grpRows.reduce((s, r) => s + (Number(r.consumo_total) || 0), 0);
              return (
                <tr key={tarifa} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-5 py-3 font-bold text-blue-900">{tarifa}</td>
                  <td className="px-5 py-3 text-right text-slate-700">{grpRows.length}</td>
                  <td className="px-5 py-3 text-right font-mono text-slate-800">{fmtNum(grpTotal)}</td>
                  <td className="p-0">
                    <span className={pctBadgeClass(grpTotal, total)}>{fmtPct(grpTotal, total)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-blue-50 border-t-2 border-blue-200 font-semibold">
              <td className="px-5 py-3 text-blue-900">TOTAL</td>
              <td className="px-5 py-3 text-right text-blue-900">{rows.length}</td>
              <td className="px-5 py-3 text-right font-mono text-blue-900">{fmtNum(total)}</td>
              <td className="px-5 py-3 text-right text-blue-900">100,0 %</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}