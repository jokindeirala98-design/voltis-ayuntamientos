const COLOR_HEX = {
  blue: '#1e3a8a',
  orange: '#9a3412',
  violet: '#6d28d9',
  emerald: '#047857',
};

export default function SectionTitle({ number, title, subtitle, color = 'blue' }) {
  const bgColor = COLOR_HEX[color] || COLOR_HEX.blue;
  return (
    <div className="flex items-start gap-3 mb-6" style={{ breakInside: 'avoid', breakAfter: 'avoid' }}>
      <div
        className="flex items-center justify-center w-8 h-8 rounded-lg text-white text-sm font-bold shrink-0 mt-0.5"
        style={{ backgroundColor: bgColor, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', flexShrink: 0 }}
      >
        {number}
      </div>
      <div className="flex-1 border-b border-slate-200 pb-2">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}