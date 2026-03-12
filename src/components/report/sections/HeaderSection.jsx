import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Zap } from 'lucide-react';

export default function HeaderSection({ project, generatedAt }) {
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
    </div>
  );
}