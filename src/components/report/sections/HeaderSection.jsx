import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Zap } from 'lucide-react';

export default function HeaderSection({ project, generatedAt, coverImageUrl }) {
  const today = format(generatedAt || new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

  return (
    <div className="mb-12">
      {/* Top meta bar */}
      <div className="flex items-center justify-between pb-4 mb-8 border-b border-slate-100 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" />
          <span className="font-medium tracking-wide uppercase">Auditoría Energética Municipal</span>
        </div>
        <span>{today}</span>
      </div>

      {/* Main header */}
      {coverImageUrl ? (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm mb-0" style={{ minHeight: 280 }}>
          <img
            src={coverImageUrl}
            alt="Portada ayuntamiento"
            className="w-full h-64 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-950/80 via-blue-950/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-8 pb-8 text-white">
            <p className="text-xs font-medium tracking-widest uppercase opacity-70 mb-1">Estudio de Consumos Energéticos</p>
            <h1 className="text-3xl font-bold mb-1">{project?.name || '—'}</h1>
            {project?.client_name && project.client_name !== project.name && (
              <p className="text-blue-200 text-sm">{project.client_name}</p>
            )}
            <p className="text-blue-200 text-xs mt-3 opacity-70">Fecha: {today}</p>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 bg-gradient-to-b from-blue-50 to-white rounded-2xl border border-blue-100 px-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-900 text-white mb-6 shadow-lg">
            <Zap className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">
            {project?.name || '—'}
          </h1>
          {project?.client_name && project.client_name !== project.name && (
            <p className="text-slate-500 text-base mb-3">{project.client_name}</p>
          )}
          <p className="text-xl font-semibold text-blue-900 mb-2">Estudio de Consumos Energéticos</p>
          <p className="text-slate-400 text-sm">Informe técnico elaborado a partir de los datos consolidados de suministros</p>
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-500">
            <span>Fecha: <span className="font-medium text-slate-700">{today}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}