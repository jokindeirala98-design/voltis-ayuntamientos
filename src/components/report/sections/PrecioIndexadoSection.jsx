import SectionTitle from '@/components/report/SectionTitle';
import { Info } from 'lucide-react';

export default function PrecioIndexadoSection({ sectionNum }) {
  return (
    <div className="mb-12">
      <SectionTitle number={sectionNum} title="Precio Indexado de la Energía por Meses — 2025" />
      <div className="border border-dashed border-slate-300 rounded-xl p-10 bg-slate-50/50 text-center">
        <Info className="w-10 h-10 text-slate-300 mx-auto mb-4" />
        <p className="text-sm font-semibold text-slate-500 mb-2">Sección preparada para próxima actualización</p>
        <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
          Esta sección mostrará la evolución de los precios indexados de la energía eléctrica en el mercado mayorista (OMIE/PVPC)
          por meses durante 2025, así como la comparativa con los precios fijos contratados por el ayuntamiento y el análisis
          de oportunidades de optimización contractual.
        </p>
      </div>
    </div>
  );
}