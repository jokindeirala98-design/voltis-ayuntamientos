import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Zap } from 'lucide-react';

export default function HeaderSection({ project, generatedAt, coverImageUrl }) {
  const today = format(generatedAt || new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

  return (
    <div className="cover-page flex flex-col" style={{ minHeight: '100vh', pageBreakAfter: 'always', breakAfter: 'page' }}>
      {/* Top meta bar */}
      <div className="flex items-center justify-between pb-3 mb-0 border-b border-slate-200 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" />
          <span className="font-medium tracking-wide uppercase">Auditoría Energética Municipal</span>
        </div>
        <span>{today}</span>
      </div>

      {coverImageUrl ? (
        /* ── With cover image ── */
        <div className="flex-1 flex flex-col">
          {/* Image fills most of the page */}
          <div className="relative flex-1 overflow-hidden rounded-2xl mt-4" style={{ minHeight: '55vh' }}>
            <img
              src={coverImageUrl}
              alt="Portada"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 via-blue-950/20 to-transparent" />
          </div>

          {/* Text block below image */}
          <div className="mt-8 pb-6 text-center">
            <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-3">
              Auditoría Energética Municipal
            </p>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              {project?.name || '—'}
            </h1>
            {project?.client_name && project.client_name !== project.name && (
              <p className="text-slate-500 text-lg mb-3">{project.client_name}</p>
            )}
            <div className="inline-block bg-blue-900 text-white px-6 py-2 rounded-full mt-2 mb-4">
              <p className="text-lg font-semibold">Estudio de Consumos Energéticos</p>
            </div>
            <p className="text-slate-400 text-sm mt-3">
              Informe técnico elaborado a partir de los datos consolidados de suministros
            </p>
            <p className="text-slate-400 text-xs mt-4">Fecha: <span className="font-semibold text-slate-700">{today}</span></p>
          </div>
        </div>
      ) : (
        /* ── Without cover image ── */
        <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-900 text-white mb-8 shadow-xl">
            <Zap className="w-10 h-10" />
          </div>
          <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-4">
            Auditoría Energética Municipal
          </p>
          <h1 className="text-5xl font-bold text-slate-900 mb-3">{project?.name || '—'}</h1>
          {project?.client_name && project.client_name !== project.name && (
            <p className="text-slate-500 text-xl mb-4">{project.client_name}</p>
          )}
          <div className="bg-blue-900 text-white px-8 py-3 rounded-full mt-3 mb-5">
            <p className="text-xl font-semibold">Estudio de Consumos Energéticos</p>
          </div>
          <p className="text-slate-400 text-base max-w-lg mt-2">
            Informe técnico elaborado a partir de los datos consolidados de suministros
          </p>
          <div className="mt-10 border-t border-slate-200 pt-6 text-slate-400 text-sm">
            Fecha: <span className="font-semibold text-slate-700">{today}</span>
          </div>
        </div>
      )}
    </div>
  );
}