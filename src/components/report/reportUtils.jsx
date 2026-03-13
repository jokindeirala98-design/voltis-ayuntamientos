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
// Distinct professional palette for energy periods
export const PERIOD_COLORS = [
  '#1e40af', // P1 Punta — azul corporativo
  '#7c3aed', // P2 Llano — violeta
  '#047857', // P3 Valle — verde
  '#b45309', // P4 — ámbar oscuro
  '#be123c', // P5 — rojo rosado
  '#0e7490', // P6 Supervalle — teal
];

// Gas RL tariffs: warm, clearly distinct tones
export const GAS_COLORS = [
  '#7c2d12', // RL1 — caoba oscuro
  '#c2410c', // RL2 — naranja quemado
  '#b45309', // RL3 — ámbar
  '#a16207', // RL4 — dorado oscuro
];

// Multi-tariff chart colors
export const TARIFA_COLORS = [
  '#1e40af', '#7c3aed', '#047857', '#b45309', '#be123c', '#0e7490'
];

export const PERIOD_NAMES = {
  P1: 'Punta', P2: 'Llano', P3: 'Valle', P4: 'P4', P5: 'P5', P6: 'Supervalle'
};

// ── Percentage color coding ──────────────────────────────────────────────────
// Configurable thresholds (easily adjustable here)
export const PCT_THRESHOLDS = {
  high: 50,   // >= 50% → rojo
  medium: 20, // >= 20% → ámbar
              // <  20% → verde
};

/**
 * Returns a Tailwind class string to visually code a percentage by importance.
 * Usage: <span className={pctBadgeClass(value, total)}>...</span>
 */
export function pctBadgeClass(n, total, thresholds = PCT_THRESHOLDS) {
  if (!total || !n || isNaN(n)) return 'text-slate-500';
  const pct = (n / total) * 100;
  if (pct >= thresholds.high) {
    return 'inline-block rounded px-1.5 py-0.5 text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200';
  }
  if (pct >= thresholds.medium) {
    return 'inline-block rounded px-1.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  }
  return 'inline-block rounded px-1.5 py-0.5 text-xs bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
}