import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SectionTitle from '@/components/report/SectionTitle';
import { fmtNum, fmtPct, pctBadgeClass, GAS_COLORS } from '@/components/report/reportUtils';

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

export default function GasSection({ rows, sectionNum }) {
  const totalGas = rows.reduce((s, r) => s + (Number(r.consumo_total) || 0), 0);

  const groups = {};
  rows.forEach(r => {
    const match = (r.tarifa || '').match(/RL[1-4]/i);
    const rl = match ? match[0].toUpperCase() : 'Sin RL';
    if (!groups[rl]) groups[rl] = [];
    groups[rl].push(r);
  });

  const sortedRL = Object.keys(groups).sort();
  const pieData = sortedRL.map(rl => ({
    name: rl,
    value: groups[rl].reduce((s, r) => s + (Number(r.consumo_total) || 0), 0)
  }));

  return (
    <div style={{ pageBreakBefore: 'always', breakBefore: 'page' }} className="mb-8">
      <SectionTitle
        number={sectionNum}
        title="Suministros de Gas"
        subtitle={`${rows.length} suministros · ${fmtNum(totalGas)} kWh totales`}
        color="orange"
      />

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-orange-200 shadow-sm mb-8" style={{ breakInside: 'avoid' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#9a3412', color: 'white', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <th className="text-left px-5 py-3 font-semibold">Tarifa RL</th>
              <th className="text-right px-5 py-3 font-semibold">Nº Suministros</th>
              <th className="text-right px-5 py-3 font-semibold">Consumo (kWh)</th>
              <th className="text-right p-0 font-semibold" style={{ minWidth: 120 }}>
                <span className="block w-full px-4 py-3 text-right">% Total Gas</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRL.map((rl, i) => {
              const grp = groups[rl];
              const grpTotal = grp.reduce((s, r) => s + (Number(r.consumo_total) || 0), 0);
              return (
                <tr key={rl} className={i % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}>
                  <td className="px-5 py-2.5 font-bold" style={{ color: GAS_COLORS[i % GAS_COLORS.length] }}>{rl}</td>
                  <td className="px-5 py-2.5 text-right">{grp.length}</td>
                  <td className="px-5 py-2.5 text-right font-mono">{fmtNum(grpTotal)}</td>
                  <td className="p-0">
                    <span className={pctBadgeClass(grpTotal, totalGas)}>{fmtPct(grpTotal, totalGas)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-orange-50 border-t-2 border-orange-200 font-semibold">
              <td className="px-5 py-2.5 text-orange-900">TOTAL GAS</td>
              <td className="px-5 py-2.5 text-right text-orange-900">{rows.length}</td>
              <td className="px-5 py-2.5 text-right font-mono text-orange-900">{fmtNum(totalGas)}</td>
              <td className="px-5 py-2.5 text-right text-orange-900">100,0 %</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pie chart */}
      <div style={{ breakInside: 'avoid' }}>
        <p className="text-sm font-semibold text-slate-600 mb-4 text-center">Distribución por tarifa RL</p>
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
              {pieData.map((_, i) => <Cell key={i} fill={GAS_COLORS[i % GAS_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v, name) => [`${fmtNum(v)} kWh`, name]} />
            <Legend iconSize={12} iconType="square" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}