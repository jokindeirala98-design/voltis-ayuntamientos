import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ValidationModal({ open, onClose, issues }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <XCircle className="w-5 h-5" />
            No es posible generar el informe
          </DialogTitle>
          <DialogDescription>
            Faltan datos obligatorios en {issues.length} suministro(s). Revisa los campos marcados y completa la información pendiente antes de continuar.
          </DialogDescription>
        </DialogHeader>
        <div className="border border-red-100 rounded-lg bg-red-50 p-4 max-h-64 overflow-y-auto">
          <p className="text-xs font-semibold text-red-700 mb-3 uppercase tracking-wide">
            Suministros con datos incompletos:
          </p>
          <ul className="space-y-3">
            {issues.map((issue, i) => (
              <li key={i} className="text-sm">
                <p className="font-medium text-slate-800 mb-1 truncate">{issue.label}</p>
                <ul className="ml-3 space-y-0.5">
                  {issue.missing.map((m, j) => (
                    <li key={j} className="flex items-center gap-1.5 text-red-600 text-xs">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {m}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose} className="bg-blue-900 hover:bg-blue-800">
            Volver a la tabla y corregir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}