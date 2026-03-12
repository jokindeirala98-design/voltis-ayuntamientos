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
    s.p1 += Number(r.consumo_p1) || 0;
    s.p2 += Number(r.consumo_p2) || 0;
    s.p3 += Number(r.consumo_p3) || 0;
    s.p4 += Number(r.consumo_p4) || 0;
    s.p5 += Number(r.consumo_p5) || 0;
    s.p6 += Number(r.consumo_p6) || 0;
    s.total += Number(r.consumo_total) || 0;
  });
  return s;
}

export function getPeriodsForLabel(label) {
  if (label.includes('6.1')) return ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
  return ['P1', 'P2', 'P3'];
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

export const PERIOD_COLORS = ['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#bfdbfe'];
export const GAS_COLORS = ['#9a3412', '#c2410c', '#ea580c', '#f97316'];
export const TARIFA_COLORS = ['#1e3a8a', '#7c3aed', '#065f46', '#92400e', '#be123c', '#0e7490'];
export const PERIOD_NAMES = {
  P1: 'Punta', P2: 'Llano', P3: 'Valle', P4: 'P4', P5: 'P5', P6: 'Supervalle'
};