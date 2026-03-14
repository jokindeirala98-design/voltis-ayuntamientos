import SectionTitle from '@/components/report/SectionTitle';

const PRESET_IMAGES = [
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69b2f98dc41f4f9a02aefed9/b63f26960_image.png',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69b2f98dc41f4f9a02aefed9/c5fa05367_image.png',
  'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69b2f98dc41f4f9a02aefed9/d61d80b46_image.png',
];

const CAPTIONS = [
  'Periodos horarios para energías',
  'Tabla de periodos horarios por meses y horas',
  'Precios indexados €/kWh por meses',
];

export default function GraficosInteresSection({ sectionNum }) {
  return (
    <div style={{ pageBreakBefore: 'always', breakBefore: 'page', paddingTop: '18mm' }} className="mb-8">
      <SectionTitle
        number={sectionNum}
        title="Gráficos de Interés"
        subtitle="Referencia visual para el análisis de periodos y precios energéticos"
        color="emerald"
      />
      <div className="flex flex-col gap-10">
        {PRESET_IMAGES.map((url, i) => (
          <div key={i} style={{ breakInside: 'avoid' }}>
            <img
              src={url}
              alt={CAPTIONS[i]}
              className="w-full rounded-xl border border-slate-200 shadow-sm"
            />
            <p className="text-xs text-center text-slate-400 mt-2 italic">{CAPTIONS[i]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}