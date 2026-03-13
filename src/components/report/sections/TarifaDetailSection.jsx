import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SectionTitle from '@/components/report/SectionTitle';
import { sumPeriods, fmtNum, fmtPct, pctBadgeClass, PERIOD_COLORS, PERIOD_NAMES, getPeriodsForLabel, buildChartData } from '@/components/report/reportUtils';

const RADIAN = Math.PI / 180;

function OutsideLabel({ cx, cy, midAngle, outerRadius, percent, name }) {
  if (percent < 0.03) return null;
  const LABEL_R = outerRadius + 22;
  const x = cx + LABEL_R * Math.cos(-midAngle * RADIAN);
  const y = cy + LABEL_R * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#334155" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight="600">
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function TarifaDetailSection({ tarifaLabel, rows, sectionNum }) {
  const sums = sumPeriods(rows);
  const periods = getPeriodsForLabel(tarifaLabel);
  const periodTotal = periods.reduce((s, p) => s + (sums[p.toLowerCase()] || 0), 0);
  const totalConsumption = rows.reduce((s, r) => s + (Number(r.consumo_total) || 0), 0);

  if (periodTotal === 0) return null;

  const pieData = buildChartData(sums, periods, true);

  return (
    <div style={{ pageBreakBefore: 'always', breakBefore: 'page' }} className="mb-8">
      <SectionTitle
        number={sectionNum}
        title={`Consumos ${tarifaLabel}`}
        subtitle={`${rows.length} suministros · ${fmtNum(totalConsumption)} kWh totales`}
      />

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm mb-8" style={{ breakInside: 'avoid' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#1e3a8a', color: 'white', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <th className="text-left px-5 py-3">Periodo</th>
              <th className="text-right px-5 py-3">Consumo (kWh)</th>
              <th className="text-right p-0 font-semibold" style={{ minWidth: 130 }}>
                <span className="block w-full px-4 py-3 text-right">% sobre Total {tarifaLabel}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p, i) => {
              const val = sums[p.toLowerCase()] || 0;
              return (
                <tr key={p} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-5 py-2.5">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: PERIOD_COLORS[i] }} />
                      <span className="font-semibold">{p}</span>
                      <span className="text-slate-400 text-xs">· {PERIOD_NAMES[p]}</span>
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono">{val > 0 ? fmtNum(val) : '—'}</td>
                  <td className="p-0">
                    <span className={pctBadgeClass(val, periodTotal)}>{val > 0 ? fmtPct(val, periodTotal) : '—'}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-blue-50 border-t-2 border-blue-200 font-semibold">
              <td className="px-5 py-2.5 text-blue-900">TOTAL</td>
              <td className="px-5 py-2.5 text-right font-mono text-blue-900">{fmtNum(periodTotal)}</td>
              <td className="px-5 py-2.5 text-right text-blue-900">100,0 %</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pie chart */}
      <div style={{ breakInside: 'avoid' }}>
        <p className="text-sm font-semibold text-slate-600 mb-4 text-center">Distribución porcentual</p>
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={110}
              dataKey="value"
              labelLine={true}
              strokeWidth={2}
              stroke="#fff"
              label={OutsideLabel}
            >
              {pieData.map((entry, i) => {
                const idx = periods.indexOf(entry.name);
                return <Cell key={i} fill={PERIOD_COLORS[idx >= 0 ? idx : i]} />;
              })}
            </Pie>
            <Tooltip formatter={(v, name) => [`${fmtNum(v)} kWh`, `${name} — ${PERIOD_NAMES[name] || ''}`]} />
            <Legend iconSize={12} iconType="square" formatter={(name) => `${name} — ${PERIOD_NAMES[name] || ''}`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}