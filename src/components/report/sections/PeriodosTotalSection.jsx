import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import SectionTitle from '@/components/report/SectionTitle';
import { sumPeriods, fmtNum, fmtPct, pctColor, PERIOD_COLORS, PERIOD_NAMES } from '@/components/report/reportUtils';

const RADIAN = Math.PI / 180;
const ALL_PERIODS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];

// Periods that only appear in 2.0TD supplies (shared periods with 3.0/6.1)
const TD20_PERIODS = new Set(['P1', 'P2', 'P3']);

// Colors for bar: 2.0TD uses lighter/striped shades for P1/P2/P3
const BAR_COLORS_TD20 = ['#93C5FD', '#67E8F9', '#6EE7B7']; // light blue/cyan/green
const BAR_COLORS_REST = ['#3B82F6', '#06B6D4', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];

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

export default function PeriodosTotalSection({ classified, sectionNum }) {
  const { electric, td20 } = classified;
  const sums = sumPeriods(electric);

  // Always show all 6 periods for all electricity supplies
  const periodTotal = ALL_PERIODS.reduce((s, p) => s + (sums[p.toLowerCase()] || 0), 0);
  if (electric.length === 0 || periodTotal === 0) return null;

  const tableRows = ALL_PERIODS.map(p => ({ p, val: sums[p.toLowerCase()] || 0 }));
  const pieData = tableRows.filter(r => r.val > 0).map(r => ({ name: r.p, value: r.val }));

  // For bar chart: mark P1/P2/P3 from 2.0TD as lighter
  const has20 = td20.length > 0;
  const sums20 = sumPeriods(td20);
  const sumsRest = {};
  ALL_PERIODS.forEach(p => {
    const pk = p.toLowerCase();
    sumsRest[pk] = Math.max(0, (sums[pk] || 0) - (sums20[pk] || 0));
  });

  // Bar uses stacked: 2.0TD portion vs rest
  const barData = ALL_PERIODS.map((p, i) => {
    const total = sums[p.toLowerCase()] || 0;
    const part20 = sums20[p.toLowerCase()] || 0;
    const partRest = Math.max(0, total - part20);
    return { name: p, td20: has20 ? part20 : 0, resto: has20 ? partRest : total };
  }).filter(d => d.td20 + d.resto > 0);

  return (
    <div style={{ pageBreakBefore: 'always', breakBefore: 'page' }} className="mb-8">
      <SectionTitle
        number={sectionNum}
        title="Consumo Total por Periodos — Electricidad"
        subtitle={`Agregado de ${electric.length} suministros eléctricos`}
      />

      {/* Table */}
      <div className="overflow-hidden rounded-2xl mb-8" style={{ breakInside: 'avoid', border: '1px solid #E2E8F0' }}>
        <table className="w-full" style={{ fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: '#F1F5F9', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <th className="text-left px-5 py-3" style={{ color: '#475569', fontWeight: 600, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Periodo</th>
              <th className="text-right px-5 py-3" style={{ color: '#475569', fontWeight: 600, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Consumo (kWh)</th>
              <th className="text-right px-5 py-3" style={{ color: '#475569', fontWeight: 600, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', minWidth: 130 }}>% s/ Total</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, i) => {
              const { p, val } = row;
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
      <div className="mb-8" style={{ breakInside: 'avoid' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 16, textAlign: 'center' }}>Distribución porcentual por periodo</p>
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
              activeShape={() => null}
            >
              {pieData.map((entry, i) => {
                const idx = ALL_PERIODS.indexOf(entry.name);
                return <Cell key={i} fill={PERIOD_COLORS[idx >= 0 ? idx : i]} />;
              })}
            </Pie>
            <Tooltip formatter={(v, name) => [`${fmtNum(v)} kWh`, `${name} — ${PERIOD_NAMES[name] || ''}`]} contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #E2E8F0' }} />
            <Legend iconSize={10} iconType="circle" formatter={(name) => `${name} — ${PERIOD_NAMES[name] || ''}`} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Bar chart */}
      <div style={{ breakInside: 'avoid' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 16, textAlign: 'center' }}>
          Consumo por periodo (kWh){has20 ? ' — Tono claro: fracción 2.0TD' : ''}
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : v} width={55} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v, series, props) => [`${fmtNum(v)} kWh`, series === 'td20' ? `${props.payload.name} (2.0TD)` : props.payload.name]} contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #E2E8F0' }} />
            <Legend formatter={(val) => val === 'td20' ? '2.0TD' : 'Resto de tarifas'} />
            {has20 ? (
              <>
                <Bar dataKey="td20" stackId="a" fill="#93C5FD" radius={[0,0,0,0]} maxBarSize={56} name="td20" />
                <Bar dataKey="resto" stackId="a" radius={[6,6,0,0]} maxBarSize={56} name="resto">
                  {barData.map((entry, i) => {
                    const idx = ALL_PERIODS.indexOf(entry.name);
                    return <Cell key={i} fill={PERIOD_COLORS[idx >= 0 ? idx : i]} />;
                  })}
                </Bar>
              </>
            ) : (
              <Bar dataKey="resto" radius={[6,6,0,0]} maxBarSize={56}>
                {barData.map((entry, i) => {
                  const idx = ALL_PERIODS.indexOf(entry.name);
                  return <Cell key={i} fill={PERIOD_COLORS[idx >= 0 ? idx : i]} />;
                })}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}