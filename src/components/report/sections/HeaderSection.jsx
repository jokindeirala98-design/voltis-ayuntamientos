import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Zap } from 'lucide-react';

export default function HeaderSection({ project, generatedAt, coverImageUrl }) {
  const today = format(generatedAt || new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

  return (
    <div className="cover-page flex flex-col" style={{ height: '257mm', pageBreakAfter: 'always', breakAfter: 'page', overflow: 'hidden' }}>
      {/* Top meta bar */}
      <div className="flex items-center justify-between pb-3 mb-0" style={{ borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
        <div className="flex items-center gap-2">
          <Zap style={{ width: 14, height: 14, color: '#2563EB' }} />
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#2563EB' }}>
            Auditoría Energética Municipal
          </span>
        </div>
        <span style={{ fontSize: 11, color: '#94A3B8' }}>{today}</span>
      </div>

      {coverImageUrl ? (
        /* ── With cover image ── */
        <div className="flex flex-col" style={{ flex: 1, minHeight: 0 }}>
          <div className="relative rounded-2xl mt-5 overflow-hidden" style={{ height: '145mm', flexShrink: 0 }}>
            <img
              src={coverImageUrl}
              alt="Portada"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(7,22,54,0.9) 0%, rgba(7,22,54,0.2) 55%, transparent 100%)' }} />
          </div>

          <div className="text-center" style={{ paddingTop: 28, paddingBottom: 16, flexShrink: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#2563EB', marginBottom: 10 }}>
              Estudio de Consumos Energéticos
            </p>
            <h1 style={{ fontSize: 36, fontWeight: 700, color: '#0F172A', lineHeight: 1.15, marginBottom: 6 }}>
              {project?.name || '—'}
            </h1>
            {project?.client_name && project.client_name !== project.name && (
              <p style={{ fontSize: 16, color: '#475569', marginBottom: 8 }}>{project.client_name}</p>
            )}
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 16 }}>
              Informe técnico · <span style={{ color: '#475569', fontWeight: 600 }}>{today}</span>
            </p>
          </div>
        </div>
      ) : (
        /* ── Without cover image ── */
        <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-8" style={{ flex: 1 }}>
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-8" style={{ backgroundColor: '#0F172A', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <Zap style={{ width: 36, height: 36, color: '#60A5FA' }} />
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#2563EB', marginBottom: 16 }}>
            Estudio de Consumos Energéticos
          </p>
          <h1 style={{ fontSize: 42, fontWeight: 700, color: '#0F172A', lineHeight: 1.15, marginBottom: 10 }}>
            {project?.name || '—'}
          </h1>
          {project?.client_name && project.client_name !== project.name && (
            <p style={{ fontSize: 18, color: '#475569', marginBottom: 8 }}>{project.client_name}</p>
          )}
          <p style={{ fontSize: 14, color: '#94A3B8', maxWidth: 480, marginTop: 12, lineHeight: 1.6 }}>
            Informe técnico elaborado a partir de los datos consolidados de suministros municipales
          </p>
          <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #E2E8F0', color: '#94A3B8', fontSize: 13 }}>
            Fecha: <span style={{ fontWeight: 600, color: '#475569' }}>{today}</span>
          </div>
        </div>
      )}
    </div>
  );
}