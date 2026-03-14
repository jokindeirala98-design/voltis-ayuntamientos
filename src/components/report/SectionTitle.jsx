const COLOR_HEX = {
  blue: '#2563EB',
  orange: '#10B981',
  violet: '#7C3AED',
  emerald: '#059669',
};

export default function SectionTitle({ number, title, subtitle, color = 'blue' }) {
  const accentColor = COLOR_HEX[color] || COLOR_HEX.blue;
  return (
    <div className="flex items-start gap-4 mb-8" style={{ breakInside: 'avoid', breakAfter: 'avoid' }}>
      <div style={{
        width: 4,
        backgroundColor: accentColor,
        borderRadius: 4,
        alignSelf: 'stretch',
        minHeight: 40,
        flexShrink: 0,
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact'
      }} />
      <div className="flex-1 pb-3" style={{ borderBottom: '1px solid #E2E8F0' }}>
        <div className="flex items-baseline gap-2.5">
          <span className="text-xs font-bold tracking-widest" style={{ color: accentColor }}>
            {String(number).padStart(2, '0')}
          </span>
          <h2 className="font-semibold" style={{ fontSize: 20, color: '#0F172A', lineHeight: 1.3 }}>{title}</h2>
        </div>
        {subtitle && <p className="text-sm mt-1" style={{ color: '#475569' }}>{subtitle}</p>}
      </div>
    </div>
  );
}