export default function SectionTitle({ number, title, subtitle, color = 'blue' }) {
  const colorMap = {
    blue: 'bg-blue-900',
    orange: 'bg-orange-800',
    violet: 'bg-violet-800',
    emerald: 'bg-emerald-800',
  };
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${colorMap[color] || colorMap.blue} text-white text-sm font-bold shrink-0 mt-0.5`}>
        {number}
      </div>
      <div className="flex-1 border-b border-slate-200 pb-2">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}