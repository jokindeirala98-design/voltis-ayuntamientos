import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import ValidationModal from '@/components/report/ValidationModal';
import { validateRows, classifyRows } from '@/components/report/reportUtils';
import { FileBarChart2, Loader2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function GenerateReportButton({ rows, project, existingReport }) {
  const navigate = useNavigate();
  const [showValidation, setShowValidation] = useState(false);
  const [validationIssues, setValidationIssues] = useState([]);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    const issues = validateRows(rows);
    if (issues.length > 0) {
      setValidationIssues(issues);
      setShowValidation(true);
      return;
    }

    setGenerating(true);
    const today = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });
    const title = `Estudio de Consumos Energéticos — ${project?.name || ''} — ${today}`;
    const version = (existingReport?.report_version || 0) + 1;

    const doc = await base44.entities.ReportDocuments.create({
      project_id: project.id,
      title,
      report_version: version,
      status: 'generado',
      lectura_rapida: existingReport?.lectura_rapida || '',
      optimizacion_notes: existingReport?.optimizacion_notes || '',
      rows_snapshot: JSON.stringify(rows)
    });

    setGenerating(false);
    navigate(`/project/${project.id}/report/${doc.id}`);
  };

  const handleView = () => {
    navigate(`/project/${project.id}/report/${existingReport.id}`);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {existingReport && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handleView}>
            <Eye className="w-3.5 h-3.5" /> Ver informe
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={generating}
          className="gap-1.5 bg-blue-900 hover:bg-blue-800 text-white"
        >
          {generating ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generando…</>
          ) : (
            <><FileBarChart2 className="w-3.5 h-3.5" /> {existingReport ? 'Regenerar informe' : 'Generar informe'}</>
          )}
        </Button>
      </div>

      <ValidationModal
        open={showValidation}
        onClose={() => setShowValidation(false)}
        issues={validationIssues}
      />
    </>
  );
}