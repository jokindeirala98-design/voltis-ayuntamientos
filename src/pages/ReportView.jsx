import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { classifyRows } from '@/components/report/reportUtils';
import HeaderSection from '@/components/report/sections/HeaderSection';
import SuppliesSection from '@/components/report/sections/SuppliesSection';
import SummaryKPISection from '@/components/report/sections/SummaryKPISection';
import TarifaTableSection from '@/components/report/sections/TarifaTableSection';
import PeriodosTotalSection from '@/components/report/sections/PeriodosTotalSection';
import TarifaDetailSection from '@/components/report/sections/TarifaDetailSection';
import GasSection from '@/components/report/sections/GasSection';
import LecturaRapidaSection from '@/components/report/sections/LecturaRapidaSection';
import OptimizacionSection from '@/components/report/sections/OptimizacionSection';
import PrecioIndexadoSection from '@/components/report/sections/PrecioIndexadoSection';
import {
  ArrowLeft, Edit3, Save, FileText, Loader2, CheckCircle2, AlertOctagon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

// PDF export via print
function printToPDF(filename) {
  const style = document.createElement('style');
  style.id = '__print_report_style';
  style.textContent = `
    @media print {
      body * { visibility: hidden !important; }
      #report-document, #report-document * { visibility: visible !important; }
      #report-document { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
      .no-print { display: none !important; }
    }
  `;
  document.head.appendChild(style);
  document.title = filename;
  window.print();
  document.head.removeChild(style);
}

export default function ReportView() {
  const { id, reportId } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [lecturaRapida, setLecturaRapida] = useState('');
  const [optimizacionNotes, setOptimizacionNotes] = useState({});
  const [saved, setSaved] = useState(false);

  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: () => base44.entities.Projects.filter({ id }).then(r => r[0]),
    enabled: !!id
  });

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn: async () => {
      const r = await base44.entities.ReportDocuments.filter({ id: reportId });
      const doc = r[0];
      if (doc) {
        setLecturaRapida(doc.lectura_rapida || '');
        try {
          setOptimizacionNotes(doc.optimizacion_notes ? JSON.parse(doc.optimizacion_notes) : {});
        } catch (_) {
          setOptimizacionNotes({});
        }
      }
      return doc;
    },
    enabled: !!reportId
  });

  const rows = report?.rows_snapshot ? (() => { try { return JSON.parse(report.rows_snapshot); } catch { return []; } })() : [];
  const classified = classifyRows(rows);
  const generatedAt = report?.created_date ? new Date(report.created_date) : new Date();

  let sectionNum = 1;
  const nextNum = () => sectionNum++;

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.ReportDocuments.update(reportId, {
      lectura_rapida: lecturaRapida,
      optimizacion_notes: JSON.stringify(optimizacionNotes)
    }),
    onSuccess: () => {
      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
      queryClient.invalidateQueries({ queryKey: ['report', reportId] });
    }
  });

  const handleExportPDF = () => {
    const fname = `informe_consumos_${project?.name || 'proyecto'}_${format(generatedAt, 'yyyyMMdd')}.pdf`;
    printToPDF(fname.replace(/\s+/g, '_'));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Cargando informe…
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Informe no encontrado.</p>
          <Link to={`/project/${id}`}><Button variant="outline">Volver al proyecto</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Toolbar */}
      <div className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-3 flex-wrap">
          <Link to={`/project/${id}`} className="text-slate-400 hover:text-slate-700 flex items-center gap-1.5 text-sm">
            <ArrowLeft className="w-4 h-4" /> Volver al proyecto
          </Link>
          <div className="hidden sm:block w-px h-5 bg-slate-200" />
          <span className="text-sm font-semibold text-slate-800 flex-1 min-w-0 truncate">{report.title || 'Informe energético'}</span>

          {report.status === 'borrador' && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              <AlertOctagon className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs text-amber-800 font-medium">Informe desactualizado — los datos del proyecto han cambiado.</span>
              <Link to={`/project/${id}`} className="text-xs text-amber-700 underline font-medium whitespace-nowrap">Regenerar informe</Link>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {saved && (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Guardado
              </span>
            )}

            {isEditing ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                <Button size="sm" className="bg-blue-900 hover:bg-blue-800 gap-1.5" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Guardar cambios
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setIsEditing(true)}>
                <Edit3 className="w-3.5 h-3.5" /> Editar
              </Button>
            )}

            <Button size="sm" variant="outline" className="gap-1.5" onClick={handleExportPDF}>
              <FileText className="w-3.5 h-3.5" /> Exportar PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Document */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div id="report-document" className="bg-white rounded-2xl shadow-md p-8 md:p-12">
          <HeaderSection project={project} generatedAt={generatedAt} />
          <SuppliesSection rows={rows} sectionNum={nextNum()} />
          <SummaryKPISection rows={rows} classified={classified} sectionNum={nextNum()} />
          <TarifaTableSection rows={rows} sectionNum={nextNum()} />
          <PeriodosTotalSection classified={classified} sectionNum={nextNum()} />
          {classified.td20.length > 0 && <TarifaDetailSection tarifaLabel="2.0TD" rows={classified.td20} sectionNum={nextNum()} />}
          {classified.td30.length > 0 && <TarifaDetailSection tarifaLabel="3.0TD" rows={classified.td30} sectionNum={nextNum()} />}
          {classified.td61.length > 0 && <TarifaDetailSection tarifaLabel="6.1TD" rows={classified.td61} sectionNum={nextNum()} />}
          {classified.gas.length > 0 && <GasSection rows={classified.gas} sectionNum={nextNum()} />}
          <LecturaRapidaSection text={lecturaRapida} onChange={setLecturaRapida} isEditing={isEditing} sectionNum={nextNum()} />
          <OptimizacionSection classified={classified} notes={optimizacionNotes} onNotesChange={setOptimizacionNotes} isEditing={isEditing} sectionNum={nextNum()} />
          <PrecioIndexadoSection sectionNum={nextNum()} />
        </div>
      </div>
    </div>
  );
}