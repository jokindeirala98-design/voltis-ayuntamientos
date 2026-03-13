import { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ImageIcon, X, Loader2 } from 'lucide-react';

export default function CoverImageStep({ coverImageUrl, onConfirm, onBack }) {
  const [imageUrl, setImageUrl] = useState(coverImageUrl || null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(file_url);
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  };

  // Paste support
  const handlePaste = useCallback(async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imgItem = items.find(it => it.type.startsWith('image/'));
    if (imgItem) {
      const file = imgItem.getAsFile();
      if (file) handleFile(file);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Portada del informe</h2>
            <p className="text-xs text-slate-500 mt-0.5">Arrastra, pega o adjunta una imagen del ayuntamiento</p>
          </div>
          <button onClick={() => onBack()} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-6">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onPaste={handlePaste}
            onClick={() => !uploading && fileRef.current?.click()}
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => handleFile(e.target.files[0])}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                <p className="text-sm text-slate-500">Subiendo imagen…</p>
              </div>
            ) : imageUrl ? (

              <div className="flex flex-col items-center gap-3">
                <img src={imageUrl} alt="Portada" className="h-40 object-cover rounded-lg shadow border border-slate-200" />
                <p className="text-xs text-slate-500">Haz clic para cambiar la imagen</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <ImageIcon className="w-10 h-10" />
                <p className="text-sm font-medium">Arrastra, pega (Ctrl+V) o haz clic para subir</p>
                <p className="text-xs">JPG, PNG o WebP</p>
              </div>
            )}
          </div>

          {imageUrl && (
            <button
              onClick={() => setImageUrl(null)}
              className="mt-2 text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Quitar imagen
            </button>
          )}
        </div>

        <div className="px-6 pb-5 flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => onBack()}>Cancelar</Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onConfirm(null)}
            >
              Continuar sin imagen
            </Button>
            <Button
              size="sm"
              onClick={() => onConfirm(imageUrl)}
              disabled={uploading}
              className="bg-blue-900 hover:bg-blue-800 text-white"
            >
              {imageUrl ? 'Generar informe' : 'Continuar sin imagen'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}