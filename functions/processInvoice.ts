import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ── Tariff structure rules ────────────────────────────────────────────────────
function applyTariffRules(tarifa, data) {
  const normalized = (tarifa || '').toUpperCase().trim();
  const is20TD = normalized.includes('2.0');
  const warnings = [];
  if (is20TD) {
    const invalidPotencias = ['potencia_p3', 'potencia_p4', 'potencia_p5', 'potencia_p6'];
    const invalidConsumos = ['consumo_p4', 'consumo_p5', 'consumo_p6'];
    for (const field of [...invalidPotencias, ...invalidConsumos]) {
      if (data[field] != null) {
        warnings.push(`Campo ${field} ignorado: tarifa 2.0TD no tiene ese periodo`);
        data[field] = null;
      }
    }
  }
  return warnings;
}

// ── Infer tariff from contracted powers ──────────────────────────────────────
function inferTariffFromPowers(data) {
  const powers = ['potencia_p1', 'potencia_p2', 'potencia_p3', 'potencia_p4', 'potencia_p5', 'potencia_p6']
    .map(k => data[k])
    .filter(v => v != null && v > 0);

  if (powers.length === 0) return null;

  const maxPower = Math.max(...powers);
  if (maxPower < 15) return '2.0TD';
  if (maxPower < 50) return '3.0TD';
  return '3.0TD'; // Avoid auto-classifying as 6.1TD unless explicitly stated in invoice
}

// ── Normalize CUPS ────────────────────────────────────────────────────────────
function normalizeCUPS(raw) {
  if (!raw) return null;
  // Remove spaces, hyphens, newlines, common OCR separators
  let clean = raw.replace(/[\s\-_\n\r]/g, '').toUpperCase();
  // Fix common OCR substitutions at the start
  if (clean.startsWith('E5') || clean.startsWith('E$')) clean = 'ES' + clean.slice(2);
  if (!/^ES/.test(clean)) return null;
  if (clean.length < 18 || clean.length > 24) return null;
  if (!/^[A-Z0-9]+$/.test(clean)) return null;
  return clean;
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

    const extractionPrompt = `Eres un experto en extracción de datos de facturas energéticas españolas. Analiza la factura y extrae los datos con la máxima fiabilidad. Prefiere null a datos incorrectos.

==================================================
EXTRACCIÓN DE CUPS
==================================================
El CUPS es un código crítico. Busca primero cerca de etiquetas como:
"CUPS", "Código CUPS", "Código Universal de Punto de Suministro", "Punto de suministro", "Identificador del punto de suministro"

Normalización: elimina espacios, guiones y separadores. Convierte a mayúsculas.
Ejemplo: "ES 0021 0000 0654 3146 EB" → "ES0021000006543146EB"

Validación: debe empezar por ES, longitud 18-24 caracteres, solo alfanumérico, sin símbolos.

Atención a confusiones OCR: 0/O, 1/I, 5/S, 8/B.
Si hay ambigüedad no resoluble, marca cups_confidence = "baja".

Si encuentras varios candidatos, elige el que aparezca más cerca de la etiqueta CUPS y tenga formato más limpio.
Devuelve siempre el CUPS sin espacios.

cups_detectado_por valores:
- "etiqueta_cups" si aparece junto a etiqueta CUPS explícita
- "contexto_suministro" si aparece en bloque de datos del suministro sin etiqueta
- "patron_ocr" si fue detectado por formato pero sin contexto claro

==================================================
EXTRACCIÓN DE TARIFA (JERARQUÍA ESTRICTA)
==================================================

PRIORIDAD 1 — Lee si la tarifa aparece explícitamente en la factura.
Valores válidos: 2.0TD, 3.0TD, 6.1TD, RL1, RL2, RL3, RL4, y variantes como "2.0", "3.0", "6.1".
Si encuentras la tarifa explícita, normalízala y úsala. tarifa_detectada_por = "factura".

PRIORIDAD 2 — Si la tarifa NO aparece explícitamente, infiere por potencia contratada:
- Potencia máxima < 15 kW → 2.0TD. tarifa_detectada_por = "potencias"
- Potencia máxima >= 15 kW → 3.0TD. tarifa_detectada_por = "potencias"
- NO clasifiques como 6.1TD automáticamente si las potencias son bajas (< 50 kW). 6.1TD es para media tensión industrial.

PRIORIDAD 3 — Si no tienes potencias ni tarifa explícita, devuelve null. tarifa_detectada_por = "inferencia".

DETECCIÓN DE DISCREPANCIA: Si la tarifa de la factura y la que sugieren las potencias son diferentes, indica tarifa_discrepancia = true y detalla en tarifa_notes.

==================================================
EXTRACCIÓN DE POTENCIAS Y CONSUMOS
==================================================
Tarifa 2.0TD: solo P1 y P2 de potencia; solo P1, P2, P3 de consumo. Devuelve null en los demás.
Tarifa 3.0TD / 6.1TD: P1-P6 para potencia y consumo.

==================================================
RESTO DE CAMPOS
==================================================
- Comercializadora: quien EMITE la factura. NO confundir con distribuidora (Endesa Distribución, Iberdrola Distribución, UFD, E-Distribución...).
- Dirección: SOLO la dirección del punto de SUMINISTRO (no la de facturación).
- tipo_suministro: "Electricidad" o "Gas".

Devuelve JSON con esta estructura:
{
  "comercializadora": string|null, "comercializadora_confidence": "alta"|"media"|"baja", "comercializadora_notes": string|null,
  "cups": string|null, "cups_confidence": "alta"|"media"|"baja", "cups_notes": string|null, "cups_detectado_por": "etiqueta_cups"|"contexto_suministro"|"patron_ocr"|null,
  "tarifa": string|null, "tarifa_confidence": "alta"|"media"|"baja", "tarifa_notes": string|null, "tarifa_detectada_por": "factura"|"potencias"|"inferencia"|null, "tarifa_discrepancia": boolean,
  "direccion_suministro": string|null, "direccion_suministro_confidence": "alta"|"media"|"baja", "direccion_suministro_notes": string|null,
  "tipo_suministro": "Electricidad"|"Gas"|null, "tipo_suministro_confidence": "alta"|"media"|"baja", "tipo_suministro_notes": string|null,
  "potencia_p1": number|null, "potencia_p2": number|null, "potencia_p3": number|null, "potencia_p4": number|null, "potencia_p5": number|null, "potencia_p6": number|null,
  "potencias_confidence": "alta"|"media"|"baja", "potencias_notes": string|null,
  "consumo_p1": number|null, "consumo_p2": number|null, "consumo_p3": number|null, "consumo_p4": number|null, "consumo_p5": number|null, "consumo_p6": number|null,
  "consumo_total": number|null, "consumos_confidence": "alta"|"media"|"baja", "consumos_notes": string|null,
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
            comercializadora: { type: 'string' }, comercializadora_confidence: { type: 'string' }, comercializadora_notes: { type: 'string' },
            cups: { type: 'string' }, cups_confidence: { type: 'string' }, cups_notes: { type: 'string' }, cups_detectado_por: { type: 'string' },
            tarifa: { type: 'string' }, tarifa_confidence: { type: 'string' }, tarifa_notes: { type: 'string' }, tarifa_detectada_por: { type: 'string' }, tarifa_discrepancia: { type: 'boolean' },
            direccion_suministro: { type: 'string' }, direccion_suministro_confidence: { type: 'string' }, direccion_suministro_notes: { type: 'string' },
            tipo_suministro: { type: 'string' }, tipo_suministro_confidence: { type: 'string' }, tipo_suministro_notes: { type: 'string' },
            potencia_p1: { type: 'number' }, potencia_p2: { type: 'number' }, potencia_p3: { type: 'number' },
            potencia_p4: { type: 'number' }, potencia_p5: { type: 'number' }, potencia_p6: { type: 'number' },
            potencias_confidence: { type: 'string' }, potencias_notes: { type: 'string' },
            consumo_p1: { type: 'number' }, consumo_p2: { type: 'number' }, consumo_p3: { type: 'number' },
            consumo_p4: { type: 'number' }, consumo_p5: { type: 'number' }, consumo_p6: { type: 'number' },
            consumo_total: { type: 'number' }, consumos_confidence: { type: 'string' }, consumos_notes: { type: 'string' },
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

    // ── Post-processing: normalize CUPS ──────────────────────────────────────
    if (extractedData.cups) {
      const normalized = normalizeCUPS(extractedData.cups);
      if (!normalized) {
        extractedData.cups_notes = (extractedData.cups_notes || '') + ' CUPS no válido tras normalización, revisión requerida.';
        extractedData.cups_confidence = 'baja';
        extractedData.cups = extractedData.cups; // keep original for manual review
      } else {
        extractedData.cups = normalized;
      }
    }

    // ── Post-processing: tariff fallback from powers ──────────────────────────
    let tarifaDetectadaPor = extractedData.tarifa_detectada_por || null;
    if (!extractedData.tarifa) {
      const inferred = inferTariffFromPowers(extractedData);
      if (inferred) {
        extractedData.tarifa = inferred;
        extractedData.tarifa_confidence = 'media';
        tarifaDetectadaPor = 'potencias';
        extractedData.tarifa_notes = (extractedData.tarifa_notes || '') + ` Tarifa deducida por potencia contratada (máx ${Math.max(...['potencia_p1','potencia_p2','potencia_p3','potencia_p4','potencia_p5','potencia_p6'].map(k => extractedData[k] || 0))} kW).`;
      }
    } else {
      tarifaDetectadaPor = tarifaDetectadaPor || 'factura';
    }
    extractedData.tarifa_detectada_por = tarifaDetectadaPor;

    // ── Apply tariff period rules ─────────────────────────────────────────────
    const tariffWarnings = applyTariffRules(extractedData.tarifa, extractedData);

    // ── Auto-calculate consumo_total ──────────────────────────────────────────
    if (!extractedData.consumo_total) {
      const total = ['consumo_p1','consumo_p2','consumo_p3','consumo_p4','consumo_p5','consumo_p6']
        .reduce((s, k) => s + (extractedData[k] || 0), 0);
      if (total > 0) extractedData.consumo_total = Math.round(total * 1000) / 1000;
    }

    // ── Build observations & validation status ────────────────────────────────
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
        else observations.push(`${field}: Baja confianza, revisar`);
      } else if (confidence === 'media' && notes) {
        observations.push(`${field}: ${notes}`);
      }
    }

    // Discrepancy warning
    if (extractedData.tarifa_discrepancia) {
      observations.push('La factura indica una tarifa pero la potencia contratada sugiere otra. Revisar suministro.');
      hasLowConfidence = true;
    }

    // CUPS warnings
    if (extractedData.cups_confidence === 'baja') {
      observations.push('CUPS detectado con baja confianza. Verificar manualmente.');
    }

    if (extractedData.potencias_notes) observations.push(`Potencias: ${extractedData.potencias_notes}`);
    if (extractedData.consumos_notes) observations.push(`Consumos: ${extractedData.consumos_notes}`);
    if (tariffWarnings.length > 0) {
      observations.push(...tariffWarnings);
      if (!hasMissing) hasLowConfidence = true;
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
      consumos: extractedData.consumos_confidence,
      tarifa_detectada_por: tarifaDetectadaPor,
      cups_detectado_por: extractedData.cups_detectado_por || null
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

    for (const field of criticalFields) {
      await base44.asServiceRole.entities.ExtractionLogs.create({
        uploaded_file_id: file_id,
        field_name: field,
        extracted_value: String(extractedData[field] || ''),
        confidence: extractedData[`${field}_confidence`] || 'baja',
        validation_notes: extractedData[`${field}_notes`] || ''
      });
    }

    return Response.json({ success: true, supply_row_id: supplyRow.id, validation_status });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});