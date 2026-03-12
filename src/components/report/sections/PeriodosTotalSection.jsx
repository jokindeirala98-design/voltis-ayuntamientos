import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SectionTitle from '@/components/report/SectionTitle';
import { sumPeriods, fmtNum, fmtPct, PERIOD_COLORS, PERIOD_NAMES, buildChartData } from '@/lib/reportUtils';

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

export default function PeriodosTotalSection({ classified, sectionNum }) {
  const { electric, td61 } = classified;
  const sums = sumPeriods(electric);
  const has61 = td61.length > 0;
  const periods = has61 ? ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'] : ['P1', 'P2', 'P3'];
  const periodTotal = periods.reduce((s, p) => s + (sums[p.toLowerCase()] || 0), 0);

  if (electric.length === 0 || periodTotal === 0) return null;

  const pieData = buildChartData(sums, periods);

  return (
    <div className="mb-12">
      <SectionTitle
        number={sectionNum}
        title="Consumo Total por Periodos — Electricidad"
        subtitle={`Agregado de ${electric.length} suministros eléctricos`}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="text-left px-5 py-3">Periodo</th>
                <th className="text-right px-5 py-3">Consumo (kWh)</th>
                <th className="text-right px-5 py-3">% s/ Total</th>
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
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: PERIOD_COLORS[i] }} />
                        <span className="font-semibold">{p}</span>
                        <span className="text-slate-400 text-xs">· {PERIOD_NAMES[p]}</span>
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono">{fmtNum(val)}</td>
                    <td className="px-5 py-2.5 text-right text-slate-600">{fmtPct(val, periodTotal)}</td>
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
        {/* Pie */}
        <div>
          <p className="text-sm font-medium text-slate-600 mb-3 text-center">Distribución por periodos</p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={105} dataKey="value" labelLine={false} label={CustomLabel}>
                {pieData.map((_, i) => <Cell key={i} fill={PERIOD_COLORS[i % PERIOD_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${fmtNum(v)} kWh`, '']} />
              <Legend formatter={(name) => `${name} — ${PERIOD_NAMES[name] || ''}`} iconSize={12} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}