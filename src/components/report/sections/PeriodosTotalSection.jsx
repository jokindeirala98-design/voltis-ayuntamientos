import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import SectionTitle from '@/components/report/SectionTitle';
import { sumPeriods, fmtNum, fmtPct, pctBadgeClass, PERIOD_COLORS, PERIOD_NAMES } from '@/components/report/reportUtils';

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
      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm mb-8" style={{ breakInside: 'avoid' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-900 text-white">
              <th className="text-left px-5 py-3">Periodo</th>
              <th className="text-right px-5 py-3">Consumo (kWh)</th>
              <th className="text-right p-0 font-semibold" style={{ minWidth: 130 }}>
                <span className="block w-full px-4 py-3 text-right">% s/ Total</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, i) => {
              const { p, val } = row;
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
      <div className="mb-8" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
        <p className="text-sm font-semibold text-slate-600 mb-4 text-center">Distribución porcentual por periodo</p>
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
                const idx = ALL_PERIODS.indexOf(entry.name);
                return <Cell key={i} fill={PERIOD_COLORS[idx >= 0 ? idx : i]} />;
              })}
            </Pie>
            <Tooltip formatter={(v, name) => [`${fmtNum(v)} kWh`, `${name} — ${PERIOD_NAMES[name] || ''}`]} />
            <Legend iconSize={12} iconType="square" formatter={(name) => `${name} — ${PERIOD_NAMES[name] || ''}`} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Bar chart */}
      <div style={{ breakInside: 'avoid' }}>
        <p className="text-sm font-semibold text-slate-600 mb-4 text-center">
          Consumo por periodo (kWh){has20 ? ' — Azul claro: fracción 2.0TD' : ''}
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : v} width={55} />
            <Tooltip formatter={(v, series, props) => [`${fmtNum(v)} kWh`, series === 'td20' ? `${props.payload.name} (2.0TD)` : props.payload.name]} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
            <Legend formatter={(val) => val === 'td20' ? '2.0TD' : 'Resto de tarifas'} />
            {has20 ? (
              <>
                <Bar dataKey="td20" stackId="a" fill="#93C5FD" radius={[0,0,0,0]} maxBarSize={60} name="td20" />
                <Bar dataKey="resto" stackId="a" radius={[4,4,0,0]} maxBarSize={60} name="resto">
                  {barData.map((entry, i) => {
                    const idx = ALL_PERIODS.indexOf(entry.name);
                    return <Cell key={i} fill={PERIOD_COLORS[idx >= 0 ? idx : i]} />;
                  })}
                </Bar>
              </>
            ) : (
              <Bar dataKey="resto" radius={[4,4,0,0]} maxBarSize={60}>
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