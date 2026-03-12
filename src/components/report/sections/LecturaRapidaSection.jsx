import SectionTitle from '@/components/report/SectionTitle';
import { Edit3 } from 'lucide-react';

export default function LecturaRapidaSection({ text, onChange, isEditing, sectionNum }) {
  return (
    <div className="mb-12">
      <SectionTitle number={sectionNum} title="Lectura Rápida" subtitle="Resumen ejecutivo del estudio energético" />
      {isEditing ? (
        <textarea
          value={text}
          onChange={e => onChange(e.target.value)}
          placeholder="Añadir texto de lectura rápida del informe..."
          className="w-full min-h-[180px] border border-blue-300 rounded-xl p-5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900 resize-y leading-relaxed"
        />
      ) : (
        <div className="border border-dashed border-slate-300 rounded-xl p-6 min-h-[100px] bg-slate-50/50">
          {text ? (
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{text}</p>
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <Edit3 className="w-4 h-4" />
              <span className="text-sm italic">Añadir texto</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}