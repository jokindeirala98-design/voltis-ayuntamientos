import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Tariff structure rules for Spanish electricity tariffs
function applyTariffRules(tarifa, data) {
  const normalized = (tarifa || '').toUpperCase().trim();
  const is20TD = normalized.includes('2.0');
  const warnings = [];

  if (is20TD) {
    // 2.0TD: only P1 & P2 for power, P1/P2/P3 for consumption
    const invalidPotencias = ['potencia_p3', 'potencia_p4', 'potencia_p5', 'potencia_p6'];
    const invalidConsumos = ['consumo_p4', 'consumo_p5', 'consumo_p6'];

    for (const field of invalidPotencias) {
      if (data[field] != null) {
        warnings.push(`Campo ${field} ignorado: tarifa 2.0TD no tiene más de 2 periodos de potencia`);
        data[field] = null;
      }
    }
    for (const field of invalidConsumos) {
      if (data[field] != null) {
        warnings.push(`Campo ${field} ignorado: tarifa 2.0TD solo tiene consumos P1, P2 y P3`);
        data[field] = null;
      }
    }
  }

  return warnings;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    const { file_url, filename, project_id, file_id } = await req.json();
    if (!file_url || !project_id || !file_id) {
      return Response.json({ error: 'Parámetros requeridos: file_url, project_id, file_id' }, { status: 400 });
    }

    await base44.asServiceRole.entities.UploadedFiles.update(file_id, { processing_status: 'procesando' });

    const extractionPrompt = `Eres un experto en extracción de datos de facturas energéticas españolas. Analiza esta factura y extrae los datos solicitados con la máxima fiabilidad posible.

INSTRUCCIONES CRÍTICAS:
- Si no puedes extraer un dato con alta confianza, devuelve null para ese campo y explica el motivo en las notas.
- NO inventes datos. Prefiere null antes que un dato incorrecto.
- Para CUPS: debe empezar por "ES", longitud entre 20-22 caracteres. Elimina espacios intermedios.
- Para Comercializadora: es quien EMITE la factura. NO confundir con la distribuidora (Endesa Distribución, Iberdrola Distribución, UFD, E-Distribución...).
- Para Dirección: extrae SOLO la dirección del punto de SUMINISTRO (donde se consume energía), NO la dirección de facturación.
- Para Tarifa: normaliza a uno de: 2.0TD, 3.0TD, 6.1TD, RL1, RL2, RL3, RL4.
- Para Potencias: extrae valores en kW. NO confundir con energía (kWh) ni importes (€).

REGLA FUNDAMENTAL DE PERIODOS SEGÚN TARIFA:

Tarifa 2.0TD:
  - Potencias: SOLO P1 y P2. Las columnas P3, P4, P5, P6 de potencia deben ser null.
  - Consumos: SOLO P1, P2 y P3. Los consumos P4, P5 y P6 deben ser null.
  - Si ves valores que parecen P4/P5/P6 en una factura 2.0TD, ignóralos y devuelve null.

Tarifa 3.0TD o 6.1TD:
  - Potencias: P1 a P6 (todos los periodos).
  - Consumos: P1 a P6 (todos los periodos).

Tarifa Gas (RL1/RL2/RL3/RL4):
  - No aplica periodos de potencia eléctrica.
  - Extrae solo consumo_total.

Devuelve JSON con esta estructura exacta:
{
  "comercializadora": string | null,
  "comercializadora_confidence": "alta" | "media" | "baja",
  "comercializadora_notes": string | null,
  "cups": string | null,
  "cups_confidence": "alta" | "media" | "baja",
  "cups_notes": string | null,
  "tarifa": string | null,
  "tarifa_confidence": "alta" | "media" | "baja",
  "tarifa_notes": string | null,
  "direccion_suministro": string | null,
  "direccion_suministro_confidence": "alta" | "media" | "baja",
  "direccion_suministro_notes": string | null,
  "tipo_suministro": "Electricidad" | "Gas" | null,
  "tipo_suministro_confidence": "alta" | "media" | "baja",
  "tipo_suministro_notes": string | null,
  "potencia_p1": number | null,
  "potencia_p2": number | null,
  "potencia_p3": number | null,
  "potencia_p4": number | null,
  "potencia_p5": number | null,
  "potencia_p6": number | null,
  "potencias_confidence": "alta" | "media" | "baja",
  "potencias_notes": string | null,
  "consumo_p1": number | null,
  "consumo_p2": number | null,
  "consumo_p3": number | null,
  "consumo_p4": number | null,
  "consumo_p5": number | null,
  "consumo_p6": number | null,
  "consumo_total": number | null,
  "consumos_confidence": "alta" | "media" | "baja",
  "consumos_notes": string | null,
  "validation_summary": string
}`;

    let extractedData = null;
    let extractionError = null;

    try {
      extractedData = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: extractionPrompt,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            comercializadora: { type: 'string' },
            comercializadora_confidence: { type: 'string' },
            comercializadora_notes: { type: 'string' },
            cups: { type: 'string' },
            cups_confidence: { type: 'string' },
            cups_notes: { type: 'string' },
            tarifa: { type: 'string' },
            tarifa_confidence: { type: 'string' },
            tarifa_notes: { type: 'string' },
            direccion_suministro: { type: 'string' },
            direccion_suministro_confidence: { type: 'string' },
            direccion_suministro_notes: { type: 'string' },
            tipo_suministro: { type: 'string' },
            tipo_suministro_confidence: { type: 'string' },
            tipo_suministro_notes: { type: 'string' },
            potencia_p1: { type: 'number' },
            potencia_p2: { type: 'number' },
            potencia_p3: { type: 'number' },
            potencia_p4: { type: 'number' },
            potencia_p5: { type: 'number' },
            potencia_p6: { type: 'number' },
            potencias_confidence: { type: 'string' },
            potencias_notes: { type: 'string' },
            consumo_p1: { type: 'number' },
            consumo_p2: { type: 'number' },
            consumo_p3: { type: 'number' },
            consumo_p4: { type: 'number' },
            consumo_p5: { type: 'number' },
            consumo_p6: { type: 'number' },
            consumo_total: { type: 'number' },
            consumos_confidence: { type: 'string' },
            consumos_notes: { type: 'string' },
            validation_summary: { type: 'string' }
          }
        }
      });
    } catch (llmError) {
      extractionError = llmError.message;
    }

    if (!extractedData || extractionError) {
      await base44.asServiceRole.entities.UploadedFiles.update(file_id, {
        processing_status: 'error',
        error_message: extractionError || 'No se pudo extraer datos de la factura'
      });
      return Response.json({ error: extractionError || 'Error en extracción LLM' }, { status: 500 });
    }

    // Apply tariff rules — nullify invalid period fields based on detected tariff
    const tariffWarnings = applyTariffRules(extractedData.tarifa, extractedData);

    // Auto-calculate consumo_total from periods if not already set
    if (!extractedData.consumo_total) {
      const total = ['consumo_p1', 'consumo_p2', 'consumo_p3', 'consumo_p4', 'consumo_p5', 'consumo_p6']
        .reduce((s, k) => s + (extractedData[k] || 0), 0);
      if (total > 0) extractedData.consumo_total = Math.round(total * 1000) / 1000;
    }

    // Build observations and determine validation status
    const observations = [];
    const criticalFields = ['comercializadora', 'cups', 'tarifa', 'direccion_suministro', 'tipo_suministro'];
    let hasMissing = false;
    let hasLowConfidence = false;

    for (const field of criticalFields) {
      const value = extractedData[field];
      const confidence = extractedData[`${field}_confidence`];
      const notes = extractedData[`${field}_notes`];

      if (!value) {
        hasMissing = true;
        observations.push(`${field}: ${notes || 'No encontrado'}`);
      } else if (confidence === 'baja') {
        hasLowConfidence = true;
        if (notes) observations.push(`${field}: ${notes}`);
      } else if (confidence === 'media' && notes) {
        observations.push(`${field}: ${notes}`);
      }
    }

    if (extractedData.potencias_notes) observations.push(`Potencias: ${extractedData.potencias_notes}`);
    if (extractedData.consumos_notes) observations.push(`Consumos: ${extractedData.consumos_notes}`);
    if (tariffWarnings.length > 0) {
      observations.push(...tariffWarnings);
      if (!hasMissing) hasLowConfidence = true; // flag for review if tariff rules were applied
    }

    let validation_status = 'OK';
    if (hasMissing) validation_status = 'Incompleto';
    else if (hasLowConfidence) validation_status = 'Revisar';

    const confidence_json = JSON.stringify({
      comercializadora: extractedData.comercializadora_confidence,
      cups: extractedData.cups_confidence,
      tarifa: extractedData.tarifa_confidence,
      direccion_suministro: extractedData.direccion_suministro_confidence,
      tipo_suministro: extractedData.tipo_suministro_confidence,
      potencias: extractedData.potencias_confidence,
      consumos: extractedData.consumos_confidence
    });

    const supplyRow = await base44.asServiceRole.entities.SupplyRows.create({
      project_id,
      uploaded_file_id: file_id,
      comercializadora: extractedData.comercializadora || '',
      cups: extractedData.cups ? extractedData.cups.replace(/\s+/g, '').toUpperCase() : '',
      tarifa: extractedData.tarifa || '',
      direccion_suministro: extractedData.direccion_suministro || '',
      tipo_suministro: extractedData.tipo_suministro || '',
      potencia_p1: extractedData.potencia_p1 ?? null,
      potencia_p2: extractedData.potencia_p2 ?? null,
      potencia_p3: extractedData.potencia_p3 ?? null,
      potencia_p4: extractedData.potencia_p4 ?? null,
      potencia_p5: extractedData.potencia_p5 ?? null,
      potencia_p6: extractedData.potencia_p6 ?? null,
      consumo_p1: extractedData.consumo_p1 ?? null,
      consumo_p2: extractedData.consumo_p2 ?? null,
      consumo_p3: extractedData.consumo_p3 ?? null,
      consumo_p4: extractedData.consumo_p4 ?? null,
      consumo_p5: extractedData.consumo_p5 ?? null,
      consumo_p6: extractedData.consumo_p6 ?? null,
      consumo_total: extractedData.consumo_total ?? null,
      archivo_origen: filename,
      validation_status,
      observations: observations.join(' | '),
      confidence_json
    });

    await base44.asServiceRole.entities.UploadedFiles.update(file_id, { processing_status: 'completado' });

    const logEntries = criticalFields.map(field => ({
      uploaded_file_id: file_id,
      field_name: field,
      extracted_value: String(extractedData[field] || ''),
      confidence: extractedData[`${field}_confidence`] || 'baja',
      validation_notes: extractedData[`${field}_notes`] || ''
    }));

    for (const log of logEntries) {
      await base44.asServiceRole.entities.ExtractionLogs.create(log);
    }

    return Response.json({ success: true, supply_row_id: supplyRow.id, validation_status });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});