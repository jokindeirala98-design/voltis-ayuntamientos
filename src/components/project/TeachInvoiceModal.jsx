import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Brain, Upload, X, Image, Loader2, CheckCircle2 } from 'lucide-react';

export default function TeachInvoiceModal({ open, onClose, onTemplateCreated, invoiceFileUrl, detectedComercializadora }) {
  const [instructions, setInstructions] = useState('');
  const [extraImages, setExtraImages] = useState([]); // [{name, url}]
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const imgInputRef = useRef(null);

  const handleAddImages = async (files) => {
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of Array.from(files)) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push({ name: file.name, url: file_url });
    }
    setExtraImages(prev => [...prev, ...uploaded]);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!instructions.trim()) return;
    setSaving(true);
    try {
      await base44.functions.invoke('createExtractionTemplate', {
        file_url: invoiceFileUrl,
        user_instructions: instructions,
        extra_image_urls: extraImages.map(i => i.url)
      });
      setDone(true);
      setTimeout(() => {
        onTemplateCreated?.();
        onClose();
        setDone(false);
        setInstructions('');
        setExtraImages([]);
      }, 1800);
    } catch (err) {
      alert('Error al guardar la plantilla: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <Brain className="w-5 h-5 text-violet-500" />
            Enseñar a la IA a leer este tipo de factura
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="font-semibold text-slate-800">¡Plantilla guardada!</p>
            <p className="text-sm text-slate-500">La IA usará estas instrucciones para todas las facturas similares.</p>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            <div className="bg-violet-50 border border-violet-100 rounded-lg p-4 text-sm text-violet-800">
              <p className="font-medium mb-1">¿Por qué aparece este aviso?</p>
              <p className="text-violet-700">La IA no tiene instrucciones específicas para este tipo de factura
                {detectedComercializadora ? ` (${detectedComercializadora})` : ''}. 
                Puedes enseñarle cómo leer los datos correctamente para que lo haga bien en el futuro.</p>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Instrucciones para la IA <span className="text-red-500">*</span>
              </label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={7}
                placeholder={`Ejemplo:\n- El CUPS aparece en la parte superior derecha, tras la etiqueta "Referencia contrato"\n- La potencia contratada está en la tabla "Datos del suministro", columna "kW"\n- Esta comercializadora usa "Periodo Pico" para P1, "Periodo Valle" para P2 y P3\n- El consumo total aparece al final como "Energía activa total"\n- La tarifa aparece como "Modalidad" y puede poner "DHA" (= 2.0TD)`}
                className="w-full text-sm border border-slate-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 text-slate-700 placeholder-slate-300"
              />
              <p className="text-xs text-slate-400 mt-1">Cuanta más información des sobre dónde y cómo aparecen los datos, mejor funcionará.</p>
            </div>

            {/* Extra images */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Imágenes adicionales de referencia <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <p className="text-xs text-slate-400 mb-3">Puedes añadir capturas de otras páginas de la factura o de facturas del mismo tipo.</p>

              <div className="flex flex-wrap gap-2 mb-2">
                {extraImages.map((img, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-2.5 py-1.5 text-xs text-slate-600">
                    <Image className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate max-w-[120px]">{img.name}</span>
                    <button onClick={() => setExtraImages(prev => prev.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <input
                ref={imgInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
                onChange={e => handleAddImages(Array.from(e.target.files || []))}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-slate-600"
                onClick={() => imgInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? 'Subiendo…' : 'Añadir imágenes'}
              </Button>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-500">
                Omitir por ahora
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!instructions.trim() || saving}
                className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                {saving ? 'Guardando plantilla…' : 'Guardar y procesar factura'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}