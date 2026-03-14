import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SectionTitle from '@/components/report/SectionTitle';
import { fmtNum, fmtPct, GAS_COLORS, pctColor } from '@/components/report/reportUtils';

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
    const match = (r.tarifa || '').match(/RL[\s.]*([1-4])/i);
    const rl = match ? `RL${match[1]}` : 'Sin RL';
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
      <div className="overflow-hidden rounded-2xl mb-8" style={{ breakInside: 'avoid', border: '1px solid #E2E8F0' }}>
        <table className="w-full" style={{ fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: '#F1F5F9', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <th className="text-left px-5 py-3" style={{ color: '#475569', fontWeight: 600, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Tarifa RL</th>
              <th className="text-right px-5 py-3" style={{ color: '#475569', fontWeight: 600, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Nº Suministros</th>
              <th className="text-right px-5 py-3" style={{ color: '#475569', fontWeight: 600, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Consumo (kWh)</th>
              <th className="text-right px-5 py-3" style={{ color: '#475569', fontWeight: 600, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', minWidth: 120 }}>% Total Gas</th>
            </tr>
          </thead>
          <tbody>
            {sortedRL.map((rl, i) => {
              const grp = groups[rl];
              const grpTotal = grp.reduce((s, r) => s + (Number(r.consumo_total) || 0), 0);
              return (
                <tr key={rl} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#F8FAFC', borderTop: '1px solid #F1F5F9' }}>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: GAS_COLORS[i % GAS_COLORS.length] }} />
                      <span style={{ fontWeight: 700, color: GAS_COLORS[i % GAS_COLORS.length] }}>{rl}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right" style={{ color: '#0F172A' }}>{grp.length}</td>
                  <td className="px-5 py-3 text-right" style={{ fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>{fmtNum(grpTotal)}</td>
                  <td className="px-5 py-3 text-right" style={{ color: '#475569', fontWeight: 500 }}>{fmtPct(grpTotal, totalGas)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#ECFDF5', borderTop: '2px solid #A7F3D0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <td className="px-5 py-3" style={{ fontWeight: 700, color: '#059669' }}>TOTAL GAS</td>
              <td className="px-5 py-3 text-right" style={{ fontWeight: 700, color: '#059669' }}>{rows.length}</td>
              <td className="px-5 py-3 text-right" style={{ fontWeight: 700, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>{fmtNum(totalGas)}</td>
              <td className="px-5 py-3 text-right" style={{ fontWeight: 700, color: '#059669' }}>100,0 %</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Donut chart */}
      <div style={{ breakInside: 'avoid' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 16, textAlign: 'center' }}>Distribución por tarifa RL</p>
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
              {pieData.map((_, i) => <Cell key={i} fill={GAS_COLORS[i % GAS_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v, name) => [`${fmtNum(v)} kWh`, name]} contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #E2E8F0' }} />
            <Legend iconSize={10} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}