import { useState } from 'react';
import { utils, writeFile } from 'xlsx';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { format } from 'date-fns';

const HEADERS = [
  'Comercializadora', 'CUPS', 'Tarifa', 'Dirección suministro', 'Tipo suministro',
  'Potencia P1', 'Potencia P2', 'Potencia P3', 'Potencia P4', 'Potencia P5', 'Potencia P6',
  'Consumo P1', 'Consumo P2', 'Consumo P3', 'Consumo P4', 'Consumo P5', 'Consumo P6',
  'Consumo Total', 'Archivo origen', 'Estado validación', 'Observaciones'
];

const KEYS = [
  'comercializadora', 'cups', 'tarifa', 'direccion_suministro', 'tipo_suministro',
  'potencia_p1', 'potencia_p2', 'potencia_p3', 'potencia_p4', 'potencia_p5', 'potencia_p6',
  'consumo_p1', 'consumo_p2', 'consumo_p3', 'consumo_p4', 'consumo_p5', 'consumo_p6',
  'consumo_total', 'archivo_origen', 'validation_status', 'observations'
];

export default function ExportExcelButton({ rows, projectName }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    setExporting(true);
    try {
      const data = rows.map(row => {
        const obj = {};
        HEADERS.forEach((h, i) => {
          obj[h] = row[KEYS[i]] ?? '';
        });
        return obj;
      });

      const ws = utils.json_to_sheet(data, { header: HEADERS });

      // Column widths
      ws['!cols'] = [
        { wch: 22 }, { wch: 24 }, { wch: 10 }, { wch: 28 }, { wch: 14 },
        { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
        { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
        { wch: 12 }, { wch: 24 }, { wch: 14 }, { wch: 40 }
      ];

      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Suministros');

      const safeProjectName = (projectName || 'proyecto').replace(/[^a-zA-Z0-9_\-áéíóúÁÉÍÓÚñÑ ]/g, '_');
      const dateStr = format(new Date(), 'yyyyMMdd');
      writeFile(wb, `auditoria_suministros_${safeProjectName}_${dateStr}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={exporting || rows.length === 0}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Download className="w-4 h-4" />
      {exporting ? 'Exportando…' : 'Exportar Excel'}
    </Button>
  );
}