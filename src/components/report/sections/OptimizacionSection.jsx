import SectionTitle from '@/components/report/SectionTitle';
import { Edit3 } from 'lucide-react';

const OPTIMIZACION = {
  '2.0TD': {
    title: 'Optimización Tarifaria — 2.0TD',
    color: 'blue',
    puntos: [
      { titulo: 'Discriminación horaria', detalle: 'Valorar la incorporación de discriminación horaria (2.0TD DH) para aprovechar los periodos valle y reducir el coste energético en instalaciones con consumo nocturno.' },
      { titulo: 'Ajuste de potencia contratada', detalle: 'Revisar la potencia contratada en cada suministro y ajustarla a la demanda real para evitar penalizaciones y cargos innecesarios por excesos.' },
      { titulo: 'Migración tarifaria', detalle: 'Analizar la viabilidad de migrar a 3.0TD en suministros con mayor consumo y potencia contratada, donde la estructura trihoraria puede suponer un ahorro significativo.' },
      { titulo: 'Autoconsumo fotovoltaico', detalle: 'Valorar la instalación de paneles solares en aquellos suministros con mayor consumo anual y cubierta disponible, aprovechando los periodos de mayor producción.' },
    ]
  },
  '3.0TD': {
    title: 'Optimización Tarifaria — 3.0TD',
    color: 'violet',
    puntos: [
      { titulo: 'Distribución de consumos por periodo', detalle: 'Los consumos en P1 (punta) tienen el mayor coste unitario. Identificar oportunidades de desplazamiento de cargas desde P1 a P2 (llano) o P3 (valle) genera el mayor ahorro inmediato.' },
      { titulo: 'Revisión de potencias contratadas', detalle: 'Verificar que las potencias contratadas en P1, P2 y P3 se ajustan a la demanda máxima real de cada instalación. Los excesos de potencia son penalizados con el doble del precio del término fijo.' },
      { titulo: 'Gestión activa de la demanda', detalle: 'Identificar picos de demanda que generan penalizaciones por excesos de potencia. Valorar la implementación de un sistema BMS o gestión de cargas en instalaciones de mayor consumo.' },
      { titulo: 'Desplazamiento de cargas', detalle: 'En instalaciones con flexibilidad operativa (depuradoras, bombas de riego, sistemas de climatización), desplazar el consumo a periodos P2 y P3 para reducir el coste energético.' },
      { titulo: 'Autoconsumo colectivo', detalle: 'Estudiar la posibilidad de autoconsumo compartido entre suministros próximos geográficamente, lo que permite dimensionar una instalación conjunta con mayor rentabilidad.' },
    ]
  },
  '6.1TD': {
    title: 'Optimización Tarifaria — 6.1TD',
    color: 'emerald',
    puntos: [
      { titulo: 'Gestión activa de los 6 periodos', detalle: 'La tarifa 6.1TD cuenta con 6 periodos de precio diferenciado. Una gestión activa de las cargas permite maximizar el uso de los periodos de menor coste (P5/P6) y minimizar el consumo en P1 (punta).' },
      { titulo: 'Ajuste de las 6 potencias contratadas', detalle: 'Realizar un ajuste fino de las potencias contratadas en los 6 periodos para minimizar penalizaciones por excesos y optimizar el coste del término fijo de potencia.' },
      { titulo: 'Control de demanda máxima', detalle: 'Monitorizar los máximos de potencia en todos los periodos para detectar y corregir picos que elevan el término de potencia. Valorar la instalación de un sistema de telegestión.' },
    ]
  },
  'Gas': {
    title: 'Optimización Suministros de Gas',
    color: 'orange',
    puntos: [
      { titulo: 'Revisión de tarifa RL aplicada', detalle: 'Verificar que la tarifa RL aplicada en cada suministro corresponde con el rango de consumo actual. Un cambio de tarifa RL puede suponer un ahorro significativo sin ninguna inversión adicional.' },
      { titulo: 'Mantenimiento preventivo', detalle: 'Garantizar el correcto mantenimiento de calderas y quemadores para mantener el rendimiento energético óptimo y evitar sobreconsumos por degradación de equipos.' },
      { titulo: 'Sustitución de equipos', detalle: 'Valorar la sustitución de equipos de gas antiguos por equipos de alta eficiencia, como calderas de condensación o sistemas con recuperación de calor, con retorno de inversión calculable.' },
    ]
  }
};

const COLORS = {
  blue:    { header: 'bg-blue-900',    border: 'border-blue-200',    bg: 'bg-blue-50/30',   bullet: 'bg-blue-900',    title: 'text-blue-900',   obs: 'border-blue-100' },
  violet:  { header: 'bg-violet-800',  border: 'border-violet-200',  bg: 'bg-violet-50/30', bullet: 'bg-violet-800',  title: 'text-violet-900', obs: 'border-violet-100' },
  emerald: { header: 'bg-emerald-800', border: 'border-emerald-200', bg: 'bg-emerald-50/30',bullet: 'bg-emerald-800', title: 'text-emerald-900',obs: 'border-emerald-100' },
  orange:  { header: 'bg-orange-800',  border: 'border-orange-200',  bg: 'bg-orange-50/30', bullet: 'bg-orange-800',  title: 'text-orange-900', obs: 'border-orange-100' },
};

export default function OptimizacionSection({ classified, notes, onNotesChange, isEditing, sectionNum }) {
  const activeKeys = [];
  if (classified.td20.length > 0) activeKeys.push('2.0TD');
  if (classified.td30.length > 0) activeKeys.push('3.0TD');
  if (classified.td61.length > 0) activeKeys.push('6.1TD');
  if (classified.gas.length > 0) activeKeys.push('Gas');

  if (activeKeys.length === 0) return null;

  return (
    <div className="mb-12">
      <SectionTitle number={sectionNum} title="Optimización de Consumos" subtitle="Medidas de mejora identificadas por tipología tarifaria" />
      <div className="space-y-5">
        {activeKeys.map(key => {
          const data = OPTIMIZACION[key];
          if (!data) return null;
          const c = COLORS[data.color];
          const noteText = notes[key] || '';

          return (
            <div key={key} className={`rounded-xl border ${c.border} overflow-hidden shadow-sm`}>
              {/* Header */}
              <div className={`${c.header} text-white px-5 py-3.5`}>
                <h3 className="font-bold text-sm tracking-wide">{data.title}</h3>
              </div>
              {/* Bullet points */}
              <div className={`${c.bg} px-5 py-4`}>
                <div className="space-y-3 mb-4">
                  {data.puntos.map((punto, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${c.bullet} mt-1.5 shrink-0`} />
                      <div className="text-sm text-slate-700 leading-relaxed">
                        <span className="font-semibold text-slate-800">{punto.titulo}: </span>
                        {punto.detalle}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Observations box */}
                <div className={`border-t ${c.obs} pt-3 mt-3`}>
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Observaciones específicas</p>
                  {isEditing ? (
                    <textarea
                      value={noteText}
                      onChange={e => onNotesChange({ ...notes, [key]: e.target.value })}
                      placeholder="Añadir observaciones específicas para esta tarifa..."
                      className="w-full min-h-[80px] border border-slate-200 rounded-lg p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900 resize-y bg-white"
                    />
                  ) : (
                    <div className="rounded-lg p-3 min-h-[52px] border border-dashed border-slate-300 bg-white">
                      {noteText ? (
                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{noteText}</p>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Edit3 className="w-3.5 h-3.5" />
                          <span className="text-xs italic">Añadir texto</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}