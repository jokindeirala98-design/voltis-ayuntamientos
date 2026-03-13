// Validation — returns array of issues [{label, missing:[]}]
export function validateRows(rows) {
  const issues = [];
  rows.forEach((row) => {
    const label = row.direccion_suministro?.trim() || row.cups?.trim() || 'Sin identificar';
    const missing = [];
    if (!row.direccion_suministro?.trim()) missing.push('Dirección de suministro');
    if (!row.cups?.trim()) missing.push('CUPS');
    if (!row.tarifa?.trim()) missing.push('Tarifa');
    if (!row.tipo_suministro?.trim()) missing.push('Tipo de suministro');
    if (!row.consumo_total || Number(row.consumo_total) === 0) missing.push('Consumo anual');
    if (row.tipo_suministro === 'Electricidad') {
      const p = (Number(row.consumo_p1) || 0) + (Number(row.consumo_p2) || 0) + (Number(row.consumo_p3) || 0);
      if (p === 0) missing.push('Consumos por periodo (P1/P2/P3)');
    }
    if (row.tipo_suministro === 'Gas' && !/RL[1-4]/i.test(row.tarifa || '')) {
      missing.push('Tarifa RL de gas (RL1/RL2/RL3/RL4)');
    }
    if (missing.length > 0) issues.push({ label, missing });
  });
  return issues;
}

export function classifyRows(rows) {
  const electric = rows.filter(r => r.tipo_suministro === 'Electricidad');
  const gas = rows.filter(r => r.tipo_suministro === 'Gas');
  const td20 = electric.filter(r => /2\.0/.test(r.tarifa || ''));
  const td30 = electric.filter(r => /3\.0/.test(r.tarifa || ''));
  const td61 = electric.filter(r => /6\.1/.test(r.tarifa || ''));
  return { electric, gas, td20, td30, td61 };
}

export function sumPeriods(rows) {
  const s = { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0, total: 0 };
  rows.forEach(r => {
    const validKeys = getValidConsumoPeriods(r.tarifa);
    validKeys.forEach(key => { s[key.replace('consumo_', '')] += Number(r[key]) || 0; });
    s.total += Number(r.consumo_total) || 0;
  });
  return s;
}

export function getPeriodsForLabel(label) {
  const upper = (label || '').toUpperCase();
  if (upper.includes('3.0') || upper.includes('6.1')) return ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
  // 2.0TD and default: 3 consumption periods only
  return ['P1', 'P2', 'P3'];
}

// Returns only valid consumption period keys for a given tariff label
export function getValidConsumoPeriods(label) {
  const upper = (label || '').toUpperCase();
  if (upper.includes('3.0') || upper.includes('6.1')) return ['consumo_p1','consumo_p2','consumo_p3','consumo_p4','consumo_p5','consumo_p6'];
  return ['consumo_p1','consumo_p2','consumo_p3'];
}

export function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Math.round(n).toLocaleString('es-ES');
}

export function fmtPct(n, total) {
  if (!total || !n) return '0,0 %';
  return ((n / total) * 100).toFixed(1).replace('.', ',') + ' %';
}

export function buildChartData(sums, periods, filterZero = true) {
  const data = periods.map(p => ({
    name: p,
    value: Math.round(sums[p.toLowerCase()] || 0)
  }));
  return filterZero ? data.filter(d => d.value > 0) : data;
}

// ── Color palettes ──────────────────────────────────────────────────────────
export const PERIOD_COLORS = [
  '#3B82F6', // P1 — blue-500
  '#06B6D4', // P2 — cyan-500
  '#10B981', // P3 — emerald-500
  '#8B5CF6', // P4 — violet-500
  '#F59E0B', // P5 — amber-500
  '#EF4444', // P6 — red-500
];

export const GAS_COLORS = [
  '#F97316', // RL1 — orange-500
  '#EF4444', // RL2 — red-500
  '#EAB308', // RL3 — yellow-500
  '#84CC16', // RL4 — lime-500
];

export const TARIFA_COLORS = [
  '#3B82F6', '#06B6D4', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'
];

export const PERIOD_NAMES = {
  P1: 'Punta', P2: 'Llano', P3: 'Valle', P4: 'P4', P5: 'P5', P6: 'Supervalle'
};

/**
 * Returns Tailwind classes for a full-cell % indicator.
 * <td className="p-0"><span className={pctBadgeClass(...)}>{fmtPct(...)}</span></td>
 */
export function pctBadgeClass(n, total) {
  if (!total || !n || isNaN(n) || Number(n) === 0) {
    return 'block w-full px-4 py-2.5 text-xs font-medium text-right text-slate-400';
  }
  const pct = (n / total) * 100;
  if (pct >= 40) return 'block w-full px-4 py-2.5 text-xs font-bold text-right bg-red-500 text-white';
  if (pct >= 20) return 'block w-full px-4 py-2.5 text-xs font-bold text-right bg-amber-400 text-amber-900';
  return 'block w-full px-4 py-2.5 text-xs font-bold text-right bg-emerald-500 text-white';
}