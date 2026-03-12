import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SectionTitle from '@/components/report/SectionTitle';
import { fmtNum, fmtPct, GAS_COLORS } from '@/components/report/reportUtils';

const RADIAN = Math.PI / 180;
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.04) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="600">
      {`${(percent * 100).toFixed(0)}%`}
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
    <div className="mb-12">
      <SectionTitle
        number={sectionNum}
        title="Suministros de Gas"
        subtitle={`${rows.length} suministros · ${fmtNum(totalGas)} kWh totales`}
        color="orange"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Pie chart */}
        <div>
          <p className="text-sm font-medium text-slate-600 mb-3 text-center">Distribución por tarifa RL</p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={105} dataKey="value" labelLine={false} label={CustomLabel}>
                {pieData.map((_, i) => <Cell key={i} fill={GAS_COLORS[i % GAS_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${fmtNum(v)} kWh`, '']} />
              <Legend iconSize={12} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-orange-200 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-orange-800 text-white">
                <th className="text-left px-5 py-3 font-semibold">Tarifa RL</th>
                <th className="text-right px-5 py-3 font-semibold">Nº Suministros</th>
                <th className="text-right px-5 py-3 font-semibold">Consumo (kWh)</th>
                <th className="text-right px-5 py-3 font-semibold">% Total Gas</th>
              </tr>
            </thead>
            <tbody>
              {sortedRL.map((rl, i) => {
                const grp = groups[rl];
                const grpTotal = grp.reduce((s, r) => s + (Number(r.consumo_total) || 0), 0);
                return (
                  <tr key={rl} className={i % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}>
                    <td className="px-5 py-2.5 font-bold text-orange-800">{rl}</td>
                    <td className="px-5 py-2.5 text-right">{grp.length}</td>
                    <td className="px-5 py-2.5 text-right font-mono">{fmtNum(grpTotal)}</td>
                    <td className="px-5 py-2.5 text-right text-slate-600">{fmtPct(grpTotal, totalGas)}</td>
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
      </div>
    </div>
  );
}