import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SectionTitle from '@/components/report/SectionTitle';
import { sumPeriods, fmtNum, fmtPct, pctColor, PERIOD_COLORS, PERIOD_NAMES, getPeriodsForLabel, buildChartData } from '@/components/report/reportUtils';

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
      <div className="overflow-hidden rounded-2xl mb-8" style={{ breakInside: 'avoid', border: '1px solid #E2E8F0' }}>
        <table className="w-full" style={{ fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: '#F1F5F9', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <th className="text-left px-5 py-3" style={{ color: '#475569', fontWeight: 600, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Periodo</th>
              <th className="text-right px-5 py-3" style={{ color: '#475569', fontWeight: 600, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Consumo (kWh)</th>
              <th className="text-right px-5 py-3" style={{ color: '#475569', fontWeight: 600, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', minWidth: 130 }}>% sobre Total {tarifaLabel}</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p, i) => {
              const val = sums[p.toLowerCase()] || 0;
              return (
                <tr key={p} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#F8FAFC', borderTop: '1px solid #F1F5F9' }}>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PERIOD_COLORS[i] }} />
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{p}</span>
                      <span style={{ fontSize: 12, color: '#94A3B8' }}>{PERIOD_NAMES[p]}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right" style={{ fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>{val > 0 ? fmtNum(val) : '—'}</td>
                  <td className="px-5 py-3 text-right" style={{ color: val > 0 ? pctColor(val, periodTotal) : '#94A3B8', fontWeight: 700 }}>{val > 0 ? fmtPct(val, periodTotal) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#EFF6FF', borderTop: '2px solid #BFDBFE', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <td className="px-5 py-3" style={{ fontWeight: 700, color: '#1D4ED8' }}>TOTAL</td>
              <td className="px-5 py-3 text-right" style={{ fontWeight: 700, color: '#1D4ED8', fontVariantNumeric: 'tabular-nums' }}>{fmtNum(periodTotal)}</td>
              <td className="px-5 py-3 text-right" style={{ fontWeight: 700, color: '#1D4ED8' }}>100,0 %</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Donut chart */}
      <div style={{ breakInside: 'avoid' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 16, textAlign: 'center' }}>Distribución porcentual</p>
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={110}
              dataKey="value"
              labelLine={true}
              strokeWidth={3}
              stroke="#fff"
              label={OutsideLabel}
            >
              {pieData.map((entry, i) => {
                const idx = periods.indexOf(entry.name);
                return <Cell key={i} fill={PERIOD_COLORS[idx >= 0 ? idx : i]} />;
              })}
            </Pie>
            <Tooltip formatter={(v, name) => [`${fmtNum(v)} kWh`, `${name} — ${PERIOD_NAMES[name] || ''}`]} contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #E2E8F0' }} />
            <Legend iconSize={10} iconType="circle" formatter={(name) => `${name} — ${PERIOD_NAMES[name] || ''}`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}