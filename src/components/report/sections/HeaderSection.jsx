import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Zap } from 'lucide-react';

export default function HeaderSection({ project, generatedAt, coverImageUrl }) {
  const today = format(generatedAt || new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

  return (
    <div className="cover-page flex flex-col" style={{ height: '257mm', pageBreakAfter: 'always', breakAfter: 'page', overflow: 'hidden' }}>
      {/* Top meta bar */}
      <div className="flex items-center justify-between pb-3 mb-0 border-b border-slate-200 text-xs text-slate-400" style={{ flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" />
          <span className="font-medium tracking-wide uppercase">Auditoría Energética Municipal</span>
        </div>
        <span>{today}</span>
      </div>

      {coverImageUrl ? (
        /* ── With cover image ── */
        <div className="flex flex-col" style={{ flex: 1, minHeight: 0 }}>
          {/* Image: fixed height so text always fits below on same page */}
          <div className="relative rounded-2xl mt-4 overflow-hidden" style={{ height: '140mm', flexShrink: 0 }}>
            <img
              src={coverImageUrl}
              alt="Portada"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(7,22,54,0.85) 0%, rgba(7,22,54,0.1) 60%, transparent 100%)' }} />
          </div>

          {/* Text block below image — always on same page */}
          <div className="text-center" style={{ paddingTop: '20px', paddingBottom: '16px', flexShrink: 0 }}>
            <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-3">
              Auditoría Energética Municipal
            </p>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              {project?.name || '—'}
            </h1>
            {project?.client_name && project.client_name !== project.name && (
              <p className="text-slate-500 text-lg mb-3">{project.client_name}</p>
            )}
            <div className="inline-block text-white px-6 py-2 rounded-full mt-2 mb-4" style={{ backgroundColor: '#1e3a8a' }}>
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