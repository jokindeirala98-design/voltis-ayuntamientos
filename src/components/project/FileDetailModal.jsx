import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, AlertCircle, AlertTriangle, FileText, Clock } from 'lucide-react';

const confBadge = {
  alta: 'bg-green-100 text-green-700',
  media: 'bg-amber-100 text-amber-700',
  baja: 'bg-red-100 text-red-700'
};

const statusIcon = {
  completado: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  error: <AlertCircle className="w-4 h-4 text-red-500" />,
  procesando: <Clock className="w-4 h-4 text-blue-400 animate-spin" />,
  pendiente: <Clock className="w-4 h-4 text-slate-400" />
};

export default function FileDetailModal({ row, open, onClose }) {
  const { data: file } = useQuery({
    queryKey: ['file-detail', row?.uploaded_file_id],
    queryFn: () => base44.entities.UploadedFiles.filter({ id: row.uploaded_file_id }).then(r => r[0]),
    enabled: !!row?.uploaded_file_id
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['extraction-logs', row?.uploaded_file_id],
    queryFn: () => base44.entities.ExtractionLogs.filter({ uploaded_file_id: row.uploaded_file_id }),
    enabled: !!row?.uploaded_file_id
  });

  if (!row) return null;

  const confidence = row.confidence_json ? JSON.parse(row.confidence_json) : {};

  const fields = [
    { key: 'comercializadora', label: 'Comercializadora' },
    { key: 'cups', label: 'CUPS' },
    { key: 'tarifa', label: 'Tarifa' },
    { key: 'direccion_suministro', label: 'Dirección de suministro' },
    { key: 'tipo_suministro', label: 'Tipo de suministro' },
    { key: 'potencias', label: 'Potencias' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-slate-400" />
            Detalle de extracción
          </DialogTitle>
        </DialogHeader>

        {/* File info */}
        <div className="bg-slate-50 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-1">
            {file && statusIcon[file.processing_status]}
            <span className="text-sm font-medium text-slate-900 truncate">{row.archivo_origen || 'Archivo desconocido'}</span>
          </div>
          {file?.error_message && (
            <p className="text-xs text-red-500 mt-1">{file.error_message}</p>
          )}
        </div>

        {/* Extracted values */}
        <div className="space-y-2 mb-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Datos extraídos</h3>
          {fields.map(f => {
            const conf = confidence[f.key];
            const value = f.key === 'potencias'
              ? [1,2,3,4,5,6].map(n => row[`potencia_p${n}`]).filter(v => v != null).join(', ') || null
              : row[f.key];
            return (
              <div key={f.key} className="flex items-start gap-3 py-1.5 border-b border-slate-100">
                <span className="text-xs text-slate-500 w-40 shrink-0">{f.label}</span>
                <span className={`text-xs font-medium flex-1 ${!value ? 'text-red-400 italic' : 'text-slate-900'}`}>
                  {value || 'No encontrado'}
                </span>
                {conf && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${confBadge[conf] || 'bg-slate-100 text-slate-500'}`}>
                    {conf}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Observations */}
        {row.observations && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-4">
            <h3 className="text-xs font-semibold text-amber-700 mb-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Incidencias detectadas
            </h3>
            <ul className="space-y-1">
              {row.observations.split(' | ').filter(Boolean).map((obs, i) => (
                <li key={i} className="text-xs text-amber-700">• {obs}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Extraction logs */}
        {logs.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Log de extracción</h3>
            <div className="space-y-1">
              {logs.map(log => (
                <div key={log.id} className="flex items-start gap-2 text-xs py-1 border-b border-slate-50">
                  <span className="text-slate-400 w-36 shrink-0">{log.field_name}</span>
                  <span className="flex-1 text-slate-700 truncate">{log.extracted_value || '—'}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs shrink-0 ${confBadge[log.confidence] || ''}`}>
                    {log.confidence}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}