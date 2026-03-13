const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69b2f98dc41f4f9a02aefed9/';

// 4th image is the logo — using the last uploaded image
const VOLTIS_LOGO = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69b2f98dc41f4f9a02aefed9/d61d80b46_image.png';

export default function FooterSection() {
  return (
    <div
      style={{ pageBreakBefore: 'always', breakBefore: 'page', minHeight: '60vh' }}
      className="flex flex-col items-center justify-center text-center py-20 px-10"
    >
      {/* Logo placeholder area */}
      <div className="w-48 h-24 bg-blue-900 rounded-2xl flex items-center justify-center mb-8 shadow-lg">
        <span className="text-white text-2xl font-black tracking-widest">VOLTIS</span>
      </div>

      <p className="text-lg font-bold text-slate-800 mb-1">VOLTIS SOLUCIONES SL</p>
      <p className="text-sm text-slate-500 mb-10">Auditoría y Optimización Energética</p>

      <div className="max-w-xl border border-slate-200 rounded-xl p-6 bg-slate-50">
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-800">AVISO LEGAL Y CONFIDENCIALIDAD</strong><br /><br />
          El presente informe ha sido elaborado por <strong>VOLTIS SOLUCIONES SL</strong> con carácter exclusivo para el cliente destinatario.
          Queda expresamente prohibida su reproducción, difusión, distribución, comunicación pública o cualquier otro acto de explotación,
          total o parcial, sin el consentimiento previo, expreso y por escrito de <strong>VOLTIS SOLUCIONES SL</strong>.
          Cualquier uso no autorizado podrá ser perseguido con arreglo a la legislación vigente en materia de propiedad intelectual e industrial.
        </p>
      </div>

      <p className="text-xs text-slate-400 mt-8">© {new Date().getFullYear()} VOLTIS SOLUCIONES SL — Todos los derechos reservados</p>
    </div>
  );
}