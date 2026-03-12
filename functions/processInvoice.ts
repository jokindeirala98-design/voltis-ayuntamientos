import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    const { file_url, filename, project_id, file_id } = await req.json();
    if (!file_url || !project_id || !file_id) {
      return Response.json({ error: 'Parámetros requeridos: file_url, project_id, file_id' }, { status: 400 });
    }

    // Update file status to "procesando"
    await base44.asServiceRole.entities.UploadedFiles.update(file_id, { processing_status: 'procesando' });

    // Extract data from invoice using LLM with vision
    const extractionPrompt = `Eres un experto en extracción de datos de facturas energéticas españolas. Analiza esta factura y extrae los datos solicitados con la máxima fiabilidad posible.

INSTRUCCIONES CRÍTICAS:
- Si no puedes extraer un dato con alta confianza, devuelve null para ese campo y explica el motivo en el campo de notas correspondiente.
- NO inventes datos. Prefiere null antes que un dato incorrecto.
- Para CUPS: debe empezar por "ES", longitud entre 20-22 caracteres. Elimina espacios intermedios.
- Para Comercializadora: es quien EMITE la factura. NO confundir con la distribuidora (Endesa Distribución, Iberdrola Distribución, UFD, E-Distribución, etc.). La distribuidora suele mencionarse en conceptos de peajes.
- Para Dirección: distingue entre dirección de SUMINISTRO (punto físico donde se consume energía) y dirección de FACTURACIÓN (donde vive el titular). Son diferentes. Extrae SOLO la de suministro.
- Para Tarifa: normaliza a uno de: 2.0TD, 3.0TD, 6.1TD, RL1, RL2, RL3, RL4. Si ves "2.0A", "2.1DH" u otras antiguas, intenta mapear al equivalente moderno o devuelve null con nota.
- Para Potencias: extrae solo valores numéricos en kW. NO confundir con energía (kWh) ni con importes (€).

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
        if (notes) observations.push(`${field}: ${notes}`);
        else observations.push(`${field}: No encontrado`);
      } else if (confidence === 'baja') {
        hasLowConfidence = true;
        if (notes) observations.push(`${field}: ${notes}`);
      } else if (confidence === 'media' && notes) {
        observations.push(`${field}: ${notes}`);
      }
    }

    if (extractedData.potencias_notes) observations.push(`Potencias: ${extractedData.potencias_notes}`);

    let validation_status = 'OK';
    if (hasMissing) validation_status = 'Incompleto';
    else if (hasLowConfidence) validation_status = 'Revisar';

    const confidence_json = JSON.stringify({
      comercializadora: extractedData.comercializadora_confidence,
      cups: extractedData.cups_confidence,
      tarifa: extractedData.tarifa_confidence,
      direccion_suministro: extractedData.direccion_suministro_confidence,
      tipo_suministro: extractedData.tipo_suministro_confidence,
      potencias: extractedData.potencias_confidence
    });

    // Create SupplyRow
    const supplyRow = await base44.asServiceRole.entities.SupplyRows.create({
      project_id,
      uploaded_file_id: file_id,
      comercializadora: extractedData.comercializadora || '',
      cups: extractedData.cups ? extractedData.cups.replace(/\s+/g, '').toUpperCase() : '',
      tarifa: extractedData.tarifa || '',
      direccion_suministro: extractedData.direccion_suministro || '',
      tipo_suministro: extractedData.tipo_suministro || '',
      potencia_p1: extractedData.potencia_p1 || null,
      potencia_p2: extractedData.potencia_p2 || null,
      potencia_p3: extractedData.potencia_p3 || null,
      potencia_p4: extractedData.potencia_p4 || null,
      potencia_p5: extractedData.potencia_p5 || null,
      potencia_p6: extractedData.potencia_p6 || null,
      archivo_origen: filename,
      validation_status,
      observations: observations.join(' | '),
      confidence_json
    });

    // Update file status
    await base44.asServiceRole.entities.UploadedFiles.update(file_id, {
      processing_status: 'completado'
    });

    // Create extraction logs for critical fields
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