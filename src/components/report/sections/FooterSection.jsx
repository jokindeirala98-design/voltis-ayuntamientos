const VOLTIS_LOGO = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69b2f98dc41f4f9a02aefed9/76d1b347a_IMG_2768.JPG';

export default function FooterSection() {
  return (
    <div
      style={{ pageBreakBefore: 'always', breakBefore: 'page', minHeight: '40vh' }}
      className="flex flex-col items-center justify-center text-center py-20 px-10"
    >
      <img src={VOLTIS_LOGO} alt="Voltis Energía" className="h-40 object-contain mb-6" />
      <p className="text-lg font-bold text-slate-800 mb-1">VOLTIS SOLUCIONES SL</p>
      <p className="text-sm text-slate-500">Auditoría y Optimización Energética</p>
      <p className="text-xs text-slate-400 mt-8">© {new Date().getFullYear()} VOLTIS SOLUCIONES SL — Todos los derechos reservados</p>
    </div>
  );
}