import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import SectionTitle from '@/components/report/SectionTitle';
import { sumPeriods, fmtNum, fmtPct, pctBadgeClass, PERIOD_COLORS, PERIOD_NAMES, getPeriodsForLabel, buildChartData } from '@/components/report/reportUtils';

const RADIAN = Math.PI / 180;

export default function TarifaDetailSection({ tarifaLabel, rows, sectionNum }) {
  const sums = sumPeriods(rows);
  const periods = getPeriodsForLabel(tarifaLabel);
  const periodTotal = periods.reduce((s, p) => s + (sums[p.toLowerCase()] || 0), 0);
  const totalConsumption = rows.reduce((s, r) => s + (Number(r.consumo_total) || 0), 0);

  if (periodTotal === 0) return null;

  const barData = buildChartData(sums, periods, false);
  const pieData = buildChartData(sums, periods, true);

  return (
    <div className="mb-12">
      <SectionTitle
        number={sectionNum}
        title={`Consumos ${tarifaLabel}`}
        subtitle={`${rows.length} suministros · ${fmtNum(totalConsumption)} kWh totales`}
      />

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-sm font-medium text-slate-600 mb-3 text-center">Consumo por periodo (kWh)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : v}
                width={50}
              />
              <Tooltip
                formatter={(v, name, props) => [`${fmtNum(v)} kWh`, `${props.payload.name} — ${PERIOD_NAMES[props.payload.name] || ''}`]}
                contentStyle={{ fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {barData.map((entry, i) => {
                  const idx = periods.indexOf(entry.name);
                  return <Cell key={i} fill={PERIOD_COLORS[idx >= 0 ? idx : i]} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-600 mb-3 text-center">Distribución porcentual</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={85}
                dataKey="value"
                labelLine={false}
                strokeWidth={2}
                stroke="#fff"
                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
                  if (percent < 0.05) return null;
                  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
                  const x = cx + r * Math.cos(-midAngle * RADIAN);
                  const y = cy + r * Math.sin(-midAngle * RADIAN);
                  return (
                    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="700">
                      {`${name} ${(percent * 100).toFixed(0)}%`}
                    </text>
                  );
                }}
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

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-900 text-white">
              <th className="text-left px-5 py-3">Periodo</th>
              <th className="text-right px-5 py-3">Consumo (kWh)</th>
              <th className="text-right px-5 py-3">% sobre Total {tarifaLabel}</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p, i) => {
              const val = sums[p.toLowerCase()] || 0;
              if (val === 0) return null;
              return (
                <tr key={p} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-5 py-2.5">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: PERIOD_COLORS[i] }} />
                      <span className="font-semibold">{p}</span>
                      <span className="text-slate-400 text-xs">· {PERIOD_NAMES[p]}</span>
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono">{fmtNum(val)}</td>
                  <td className="px-5 py-2.5 text-right">
                    <span className={pctBadgeClass(val, periodTotal)}>{fmtPct(val, periodTotal)}</span>
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
    </div>
  );
}