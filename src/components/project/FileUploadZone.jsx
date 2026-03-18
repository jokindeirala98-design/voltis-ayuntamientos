import { useState, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import TeachInvoiceModal from '@/components/project/TeachInvoiceModal';

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff', 'application/zip'];

export default function FileUploadZone({ projectId, onProcessingComplete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef(null);

  // Teaching modal state
  const [teachModal, setTeachModal] = useState(false);
  const [teachFileUrl, setTeachFileUrl] = useState(null);
  const [teachDetectedCom, setTeachDetectedCom] = useState(null);
  // Pending files that need to be processed after teaching (or skipped)
  const pendingFilesRef = useRef([]);
  const templateCheckedRef = useRef(false);

  const updateQueueItem = useCallback((id, updates) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const extractFilesFromZip = async (zipFile) => {
    const zip = await JSZip.loadAsync(zipFile);
    const files = [];
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue;
      const ext = path.split('.').pop()?.toLowerCase();
      if (!['pdf', 'jpg', 'jpeg', 'png', 'tiff'].includes(ext)) continue;
      const blob = await zipEntry.async('blob');
      const name = path.split('/').pop();
      const type = ext === 'pdf' ? 'application/pdf' : `image/${ext}`;
      files.push(new File([blob], name, { type }));
    }
    return files;
  };

  // Upload a single file and register in DB, then fire processInvoice
  const uploadAndProcess = async (item, templateId) => {
    updateQueueItem(item.id, { status: 'procesando', progress: 10 });
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: item.file });
      updateQueueItem(item.id, { progress: 40 });

      const fileExt = item.name.split('.').pop()?.toLowerCase() || 'pdf';
      const dbFile = await base44.entities.UploadedFiles.create({
        project_id: projectId,
        original_filename: item.name,
        file_url,
        file_type: fileExt,
        processing_status: 'pendiente'
      });
      updateQueueItem(item.id, { progress: 60, db_id: dbFile.id });

      base44.functions.invoke('processInvoice', {
        file_url,
        filename: item.name,
        project_id: projectId,
        file_id: dbFile.id,
        template_id: templateId || null
      }).catch(() => {});

      updateQueueItem(item.id, { status: 'procesando', progress: 70 });

      let pollCount = 0;
      const maxPolls = 36;
      await new Promise((resolve) => {
        const interval = setInterval(async () => {
          pollCount++;
          const files = await base44.entities.UploadedFiles.filter({ id: dbFile.id });
          const fileStatus = files?.[0]?.processing_status;
          const progress = Math.min(70 + pollCount * 2, 95);
          updateQueueItem(item.id, { progress });

          if (fileStatus === 'completado') {
            clearInterval(interval);
            updateQueueItem(item.id, { status: 'completado', progress: 100 });
            resolve();
          } else if (fileStatus === 'error') {
            clearInterval(interval);
            updateQueueItem(item.id, {
              status: 'error',
              progress: 0,
              error: files?.[0]?.error_message || 'Error de procesamiento'
            });
            resolve();
          } else if (pollCount >= maxPolls) {
            clearInterval(interval);
            updateQueueItem(item.id, { status: 'error', progress: 0, error: 'Tiempo de espera agotado' });
            resolve();
          }
        }, 5000);
      });
    } catch (err) {
      updateQueueItem(item.id, {
        status: 'error',
        progress: 0,
        error: err.message || 'Error de procesamiento'
      });
    }
  };

  // Process all queued items with a given template (can be null)
  const processAllItems = async (items, templateId) => {
    setIsProcessing(true);
    for (const item of items) {
      await uploadAndProcess(item, templateId);
    }
    setIsProcessing(false);
    if (onProcessingComplete) onProcessingComplete();
  };

  const processFiles = async (rawFiles) => {
    let allFiles = [];
    for (const file of rawFiles) {
      if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
        try {
          const extracted = await extractFilesFromZip(file);
          allFiles.push(...extracted);
        } catch {
          allFiles.push(file);
        }
      } else {
        allFiles.push(file);
      }
    }

    const items = allFiles.map(f => ({
      id: `${Date.now()}-${Math.random()}`,
      file: f,
      name: f.name,
      status: 'pendiente',
      progress: 0,
      error: null
    }));

    setQueue(items);
    templateCheckedRef.current = false;
    pendingFilesRef.current = items;

    // Upload first file to check for template
    if (items.length === 0) return;

    setIsProcessing(true);
    updateQueueItem(items[0].id, { status: 'procesando', progress: 5 });

    // Upload the first file silently to get its URL for template detection
    let firstFileUrl = null;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: items[0].file });
      firstFileUrl = file_url;
      // Store the URL so we don't re-upload it
      pendingFilesRef.current = items.map((it, idx) =>
        idx === 0 ? { ...it, preUploaded: file_url } : it
      );
    } catch {
      // If upload fails, proceed without template check
    }

    updateQueueItem(items[0].id, { status: 'procesando', progress: 15 });
    setIsProcessing(false);

    if (firstFileUrl) {
      // Check if we have a template for this invoice type
      try {
        const res = await base44.functions.invoke('detectInvoiceTemplate', { file_url: firstFileUrl });
        const { match, needs_teaching, detected_comercializadora } = res?.data || {};

        if (needs_teaching) {
          // Show teaching modal — pause processing
          setTeachFileUrl(firstFileUrl);
          setTeachDetectedCom(detected_comercializadora || null);
          setTeachModal(true);
          // Reset first item to pending while user decides
          updateQueueItem(items[0].id, { status: 'pendiente', progress: 0 });
          return; // will resume via onTemplateCreated or modal close
        } else {
          // We have a template — proceed directly
          await processAllItemsWithPreUpload(pendingFilesRef.current, match?.id || null);
        }
      } catch {
        // Detection failed — just proceed normally
        await processAllItemsWithPreUpload(pendingFilesRef.current, null);
      }
    } else {
      await processAllItemsWithPreUpload(pendingFilesRef.current, null);
    }
  };

  // Process items, respecting the pre-uploaded first file
  const processAllItemsWithPreUpload = async (items, templateId) => {
    setIsProcessing(true);
    for (const item of items) {
      if (item.preUploaded) {
        // First item already uploaded — just register and process
        updateQueueItem(item.id, { status: 'procesando', progress: 40 });
        try {
          const fileExt = item.name.split('.').pop()?.toLowerCase() || 'pdf';
          const dbFile = await base44.entities.UploadedFiles.create({
            project_id: projectId,
            original_filename: item.name,
            file_url: item.preUploaded,
            file_type: fileExt,
            processing_status: 'pendiente'
          });
          updateQueueItem(item.id, { progress: 60, db_id: dbFile.id });

          base44.functions.invoke('processInvoice', {
            file_url: item.preUploaded,
            filename: item.name,
            project_id: projectId,
            file_id: dbFile.id,
            template_id: templateId || null
          }).catch(() => {});

          updateQueueItem(item.id, { status: 'procesando', progress: 70 });

          let pollCount = 0;
          const maxPolls = 36;
          await new Promise((resolve) => {
            const interval = setInterval(async () => {
              pollCount++;
              const files = await base44.entities.UploadedFiles.filter({ id: dbFile.id });
              const fileStatus = files?.[0]?.processing_status;
              updateQueueItem(item.id, { progress: Math.min(70 + pollCount * 2, 95) });
              if (fileStatus === 'completado') {
                clearInterval(interval);
                updateQueueItem(item.id, { status: 'completado', progress: 100 });
                resolve();
              } else if (fileStatus === 'error') {
                clearInterval(interval);
                updateQueueItem(item.id, { status: 'error', progress: 0, error: files?.[0]?.error_message || 'Error' });
                resolve();
              } else if (pollCount >= maxPolls) {
                clearInterval(interval);
                updateQueueItem(item.id, { status: 'error', progress: 0, error: 'Tiempo de espera agotado' });
                resolve();
              }
            }, 5000);
          });
        } catch (err) {
          updateQueueItem(item.id, { status: 'error', progress: 0, error: err.message });
        }
      } else {
        await uploadAndProcess(item, templateId);
      }
    }
    setIsProcessing(false);
    if (onProcessingComplete) onProcessingComplete();
  };

  // Called when user saves a template or skips the modal
  const handleTeachingDone = (templateId) => {
    setTeachModal(false);
    processAllItemsWithPreUpload(pendingFilesRef.current, templateId || null);
  };

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) await processFiles(files);
  }, [projectId]);

  const handleChange = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) await processFiles(files);
    e.target.value = '';
  }, [projectId]);

  const removeItem = (id) => setQueue(prev => prev.filter(i => i.id !== id));

  const completedCount = queue.filter(i => i.status === 'completado').length;
  const errorCount = queue.filter(i => i.status === 'error').length;
  const totalCount = queue.length;

  return (
    <>
      <div className="space-y-4">
        {/* Drop Zone */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
            ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
          onClick={() => !isProcessing && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.tiff,.zip"
            className="hidden"
            onChange={handleChange}
          />
          <Upload className={`w-8 h-8 mx-auto mb-3 ${isDragging ? 'text-blue-400' : 'text-slate-300'}`} />
          <p className="text-sm font-medium text-slate-700">Arrastra aquí tus facturas o selecciona archivos</p>
          <p className="text-xs text-slate-400 mt-1">También puedes subir un archivo ZIP con múltiples facturas</p>
          <p className="text-xs text-slate-400 mt-0.5">PDF, JPG, PNG · Múltiple selección</p>

          {isProcessing && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Procesando documentos…
              </div>
            </div>
          )}
        </div>

        {/* Progress summary */}
        {queue.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-700">
                {completedCount}/{totalCount} completados
                {errorCount > 0 && <span className="text-red-500 ml-2">{errorCount} con error</span>}
              </span>
              {!isProcessing && (
                <button onClick={() => setQueue([])} className="text-xs text-slate-400 hover:text-slate-600">
                  Limpiar
                </button>
              )}
            </div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {queue.map(item => (
                <div key={item.id} className="flex items-center gap-2 bg-white border border-slate-100 rounded px-3 py-1.5 text-xs">
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="flex-1 truncate text-slate-700">{item.name}</span>

                  {item.status === 'pendiente' && <span className="text-slate-400">En cola</span>}
                  {item.status === 'procesando' && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${item.progress}%` }} />
                      </div>
                      <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                    </div>
                  )}
                  {item.status === 'completado' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                  {item.status === 'error' && (
                    <span title={item.error} className="flex items-center gap-1 text-red-500">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Error
                    </span>
                  )}

                  {!isProcessing && (
                    <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-slate-500 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Teaching modal */}
      <TeachInvoiceModal
        open={teachModal}
        onClose={() => handleTeachingDone(null)}
        onTemplateCreated={(templateId) => handleTeachingDone(templateId)}
        invoiceFileUrl={teachFileUrl}
        detectedComercializadora={teachDetectedCom}
      />
    </>
  );
}