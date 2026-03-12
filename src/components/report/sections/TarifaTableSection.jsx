import SectionTitle from '@/components/report/SectionTitle';
import { fmtNum, fmtPct } from '@/components/report/reportUtils';

export default function TarifaTableSection({ rows, sectionNum }) {
  const total = rows.reduce((s, r) => s + (Number(r.consumo_total) || 0), 0);

  // Group by tarifa
  const groups = {};
  rows.forEach(r => {
    const t = r.tarifa?.trim() || 'Sin tarifa';
    if (!groups[t]) groups[t] = [];
    groups[t].push(r);
  });

  const sorted = Object.keys(groups).sort();

  return (
    <div className="mb-12">
      <SectionTitle number={sectionNum} title="Resumen por Tarifa" subtitle="Distribución de suministros y consumos agrupados por tipo tarifario" />
      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-900 text-white">
              <th className="text-left px-5 py-3 font-semibold">Tarifa</th>
              <th className="text-right px-5 py-3 font-semibold">Nº Suministros</th>
              <th className="text-right px-5 py-3 font-semibold">Consumo Total (kWh)</th>
              <th className="text-right px-5 py-3 font-semibold">% del Total</th>
              <th className="text-right px-5 py-3 font-semibold">Media por Suministro</th>
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
                  <td className="px-5 py-3 text-right text-slate-600">{fmtPct(grpTotal, total)}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{fmtNum(grpTotal / grpRows.length)}</td>
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
              <td className="px-5 py-3 text-right text-blue-700">{fmtNum(total / rows.length)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}