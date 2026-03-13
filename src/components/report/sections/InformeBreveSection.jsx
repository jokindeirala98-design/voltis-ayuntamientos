import SectionTitle from '@/components/report/SectionTitle';

export default function InformeBreveSection({ text, onChange, isEditing, sectionNum }) {
  return (
    <div style={{ pageBreakBefore: 'always', breakBefore: 'page' }} className="mb-8">
      <SectionTitle
        number={sectionNum}
        title="Informe Breve"
        subtitle="Resumen ejecutivo y conclusiones del estudio energético"
        color="violet"
      />
      {isEditing ? (
        <textarea
          value={text}
          onChange={e => onChange(e.target.value)}
          placeholder="Redacta aquí el informe breve o pega el texto desde otro documento…"
          className="w-full min-h-64 p-4 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400 resize-y leading-relaxed text-slate-700"
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 min-h-48">
          {text ? (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{text}</p>
          ) : (
            <p className="text-sm text-slate-400 italic">
              Pulsa "Editar" para redactar o pegar el informe breve aquí.
            </p>
          )}
        </div>
      )}
    </div>
  );
}