import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import FileUploadZone from '@/components/project/FileUploadZone';
import SupplyTable from '@/components/project/SupplyTable';
import FileDetailModal from '@/components/project/FileDetailModal';
import ExportExcelButton from '@/components/project/ExportExcelButton';
import GenerateReportButton from '@/components/report/GenerateReportButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Zap, FileText, CheckCircle2, AlertCircle,
  AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Trash2, AlertOctagon
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ProjectDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [detailRow, setDetailRow] = useState(null);
  const [showUpload, setShowUpload] = useState(true);
  const [visibleRows, setVisibleRows] = useState([]);

  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: () => base44.entities.Projects.filter({ id }).then(r => r[0]),
    enabled: !!id
  });

  const { data: rows = [], refetch: refetchRows } = useQuery({
    queryKey: ['supply-rows', id],
    queryFn: () => base44.entities.SupplyRows.filter({ project_id: id }, '-created_date', 200),
    enabled: !!id,
    refetchInterval: 5000
  });

  const { data: files = [], refetch: refetchFiles } = useQuery({
    queryKey: ['project-files', id],
    queryFn: () => base44.entities.UploadedFiles.filter({ project_id: id }, '-created_date', 200),
    enabled: !!id,
    refetchInterval: 5000
  });

  const { data: existingReport } = useQuery({
    queryKey: ['report-latest', id],
    queryFn: async () => {
      const reports = await base44.entities.ReportDocuments.filter({ project_id: id }, '-created_date', 1);
      return reports[0] || null;
    },
    enabled: !!id
  });

  const [confirmDeleteFileId, setConfirmDeleteFileId] = useState(null);
  const [deleteFileMsg, setDeleteFileMsg] = useState('');

  const updateProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.Projects.update(id, data)
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId) => {
      // Delete all supply rows linked to this file
      const linked = await base44.entities.SupplyRows.filter({ uploaded_file_id: fileId });
      await Promise.all(linked.map(r => base44.entities.SupplyRows.delete(r.id)));
      // Delete the file itself
      await base44.entities.UploadedFiles.delete(fileId);
      // Mark any existing report as stale
      if (existingReport) {
        await base44.entities.ReportDocuments.update(existingReport.id, { status: 'borrador' });
      }
    },
    onSuccess: () => {
      setConfirmDeleteFileId(null);
      setDeleteFileMsg('Factura y suministros eliminados correctamente');
      setTimeout(() => setDeleteFileMsg(''), 3500);
      refetchFiles();
      refetchRows();
      queryClient.invalidateQueries({ queryKey: ['report-latest', id] });
    }
  });

  const onProcessingComplete = () => {
    refetchRows();
    refetchFiles();
    queryClient.invalidateQueries({ queryKey: ['project', id] });
    // Update project stats
    setTimeout(async () => {
      const updatedRows = await base44.entities.SupplyRows.filter({ project_id: id });
      const updatedFiles = await base44.entities.UploadedFiles.filter({ project_id: id });
      const hasError = updatedFiles.some(f => f.processing_status === 'error');
      const allDone = updatedFiles.every(f => ['completado', 'error'].includes(f.processing_status));
      updateProjectMutation.mutate({
        total_files: updatedFiles.length,
        total_rows: updatedRows.length,
        processing_status: hasError ? 'con_errores' : (allDone ? 'completado' : 'procesando')
      });
    }, 1500);
  };

  const okCount = rows.filter(r => r.validation_status === 'OK').length;
  const revisarCount = rows.filter(r => r.validation_status === 'Revisar').length;
  const incompletoCount = rows.filter(r => r.validation_status === 'Incompleto').length;

  const fileStatusBg = {
    pendiente: 'bg-slate-100 text-slate-600',
    procesando: 'bg-blue-100 text-blue-700',
    completado: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700'
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="max-w-full px-6 py-3 flex items-center gap-4">
          <Link to="/" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-900">
              {project?.name || 'Cargando…'}
            </span>
            {project?.client_name && project.client_name !== project.name && (
              <span className="text-sm text-slate-400">· {project.client_name}</span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ExportExcelButton rows={rows} projectName={project?.name} />
            <GenerateReportButton rows={rows} project={project} existingReport={existingReport} />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-6 py-5 gap-5 max-w-full overflow-hidden">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3" />Facturas
            </div>
            <div className="text-xl font-semibold text-slate-900">{files.length}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />Suministros OK
            </div>
            <div className="text-xl font-semibold text-green-600">{okCount}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-500" />Revisar
            </div>
            <div className="text-xl font-semibold text-amber-600">{revisarCount}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-red-500" />Incompletos
            </div>
            <div className="text-xl font-semibold text-red-600">{incompletoCount}</div>
          </div>
        </div>

        {/* Upload section */}
        <div className="bg-white border border-slate-200 rounded-lg shrink-0">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            onClick={() => setShowUpload(v => !v)}
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Subir facturas
            </span>
            {showUpload ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {showUpload && (
            <div className="px-4 pb-4">
              <FileUploadZone projectId={id} onProcessingComplete={onProcessingComplete} />
            </div>
          )}
        </div>

        {/* Files list */}
        {files.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg shrink-0 max-h-52 overflow-y-auto">
            <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <span className="text-xs font-medium text-slate-600">Documentos procesados ({files.length})</span>
              <div className="flex items-center gap-3">
                {deleteFileMsg && (
                  <span className="text-xs text-green-600 font-medium">{deleteFileMsg}</span>
                )}
                <button
                  onClick={() => { refetchFiles(); refetchRows(); }}
                  className="text-slate-400 hover:text-slate-600"
                  title="Actualizar"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {files.map(f => {
              const isConfirming = confirmDeleteFileId === f.id;
              const isDeleting = deleteFileMutation.isPending && confirmDeleteFileId === f.id;
              return (
                <div
                  key={f.id}
                  className={`flex items-center gap-3 px-4 py-2 border-b border-slate-50 last:border-0 group transition-colors ${isConfirming ? 'bg-red-50' : ''}`}
                >
                  <FileText className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  <span className="text-xs text-slate-700 flex-1 truncate">{f.original_filename}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${fileStatusBg[f.processing_status] || 'bg-slate-100 text-slate-500'}`}>
                    {f.processing_status === 'completado' ? 'Completado'
                      : f.processing_status === 'error' ? 'Error'
                      : f.processing_status === 'procesando' ? 'Procesando…'
                      : 'Pendiente'}
                  </span>
                  {f.error_message && (
                    <span className="text-xs text-red-400 truncate max-w-xs" title={f.error_message}>{f.error_message}</span>
                  )}
                  {f.created_date && (
                    <span className="text-xs text-slate-300 shrink-0">{format(new Date(f.created_date), 'dd/MM HH:mm', { locale: es })}</span>
                  )}
                  {/* Delete controls */}
                  {isConfirming ? (
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      <span className="text-xs text-red-600 font-medium">¿Eliminar factura y sus suministros?</span>
                      <button
                        onClick={() => deleteFileMutation.mutate(f.id)}
                        disabled={isDeleting}
                        className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
                      >
                        {isDeleting ? '…' : 'Sí, eliminar'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteFileId(null)}
                        className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteFileId(f.id)}
                      className="p-0.5 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      title="Eliminar factura"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Supply Table */}
        <div className="bg-white border border-slate-200 rounded-lg flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-700">
                Tabla de suministros
                <span className="text-xs text-slate-400 ml-2 font-normal">Haz clic en cualquier celda para editar</span>
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-200 inline-block" /> Campo requerido vacío o baja confianza</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-100 inline-block" /> Confianza media</span>
              <span className="flex items-center gap-1"><span className="text-blue-300">✏</span> Rellenar manualmente</span>
            </div>
          </div>
          <div className="flex-1 overflow-hidden p-2">
            <SupplyTable
              rows={rows}
              projectId={id}
              onViewDetail={setDetailRow}
              onRowDeleted={refetchRows}
              onRowAdded={refetchRows}
              onRowUpdated={refetchRows}
            />
          </div>
        </div>
      </div>

      {/* File detail modal */}
      <FileDetailModal
        row={detailRow}
        open={!!detailRow}
        onClose={() => setDetailRow(null)}
      />


    </div>
  );
}