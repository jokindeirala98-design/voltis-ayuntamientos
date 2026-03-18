import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ── Normalize tariff format ───────────────────────────────────────────────────
function normalizeTariffFormat(tarifa) {
  if (!tarifa) return tarifa;
  const t = String(tarifa).toUpperCase().replace(/\s/g, '');
  if (/2\.0/.test(t)) return '2.0TD';
  if (/3\.0/.test(t)) return '3.0TD';
  if (/6\.1/.test(t)) return '6.1TD';
  const rl = t.match(/RL([1-4])/);
  if (rl) return `RL${rl[1]}`;
  return tarifa; // devuelve original si no encaja
}

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
// Si solo hay 2 potencias → 2.0TD SIEMPRE (independientemente del valor)
// Si hay 6 potencias → 3.0TD por defecto (6.1TD requiere indicación explícita)
function inferTariffFromPowers(data) {
  const allKeys = ['potencia_p1', 'potencia_p2', 'potencia_p3', 'potencia_p4', 'potencia_p5', 'potencia_p6'];
  const presentPowers = allKeys.filter(k => data[k] != null && data[k] > 0);

  if (presentPowers.length === 0) return null;

  // Regla principal: número de potencias detectadas
  if (presentPowers.length <= 2) return '2.0TD';

  // 3 o más potencias → 3.0TD por defecto
  return '3.0TD';
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

    const { file_url, filename, project_id, file_id, template_id } = await req.json();
    if (!file_url || !project_id || !file_id) {
      return Response.json({ error: 'Parámetros requeridos: file_url, project_id, file_id' }, { status: 400 });
    }

    await base44.asServiceRole.entities.UploadedFiles.update(file_id, { processing_status: 'procesando' });

    // Load custom prompt from template if available
    let templateCustomPrompt = null;
    if (template_id) {
      try {
        const templates = await base44.asServiceRole.entities.ExtractionTemplates.filter({ id: template_id });
        if (templates?.[0]?.custom_prompt) {
          templateCustomPrompt = templates[0].custom_prompt;
        }
      } catch { /* ignore */ }
    }

    const baseExtractionPrompt = `Eres un experto en extracción de datos de facturas energéticas españolas. Analiza la factura y extrae los datos con la máxima fiabilidad. Prefiere null a datos incorrectos.

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

PRIORIDAD 2 — Si la tarifa NO aparece explícitamente, infiere por NÚMERO de potencias contratadas detectadas:
- Si detectas EXACTAMENTE 2 potencias (P1 y P2) → 2.0TD. tarifa_detectada_por = "potencias"
- Si detectas 3 o más potencias (P1 a P6) → 3.0TD. tarifa_detectada_por = "potencias"
- NUNCA clasifiques como 6.1TD automáticamente. 6.1TD solo si aparece EXPLÍCITO en la factura.

PRIORIDAD 3 — Si no tienes potencias ni tarifa explícita, devuelve null. tarifa_detectada_por = "inferencia".

NORMALIZACIÓN OBLIGATORIA: Siempre devuelve la tarifa en uno de estos formatos exactos: "2.0TD", "3.0TD", "6.1TD", "RL1", "RL2", "RL3", "RL4". Nunca devuelvas "2.0", "3.0" sin el sufijo "TD".

DETECCIÓN DE DISCREPANCIA: Si la tarifa de la factura y la que sugieren las potencias son diferentes, indica tarifa_discrepancia = true y detalla en tarifa_notes.

==================================================
EXTRACCIÓN DE POTENCIAS
==================================================
Extrae ÚNICAMENTE las potencias contratadas (kW). NO extraigas consumos energéticos (kWh).
Los consumos serán aportados por separado mediante Excel y NO deben extraerse de la factura.
Tarifa 2.0TD: solo P1 y P2 de potencia. Devuelve null en potencia_p3 a potencia_p6.
Tarifa 3.0TD / 6.1TD: P1-P6 para potencia.

==================================================
RESTO DE CAMPOS
==================================================
- Comercializadora: quien EMITE la factura. NO confundir con distribuidora (Endesa Distribución, Iberdrola Distribución, UFD, E-Distribución...).
- Dirección: SOLO la dirección del punto de SUMINISTRO (no la de facturación).
- tipo_suministro: "Electricidad" o "Gas".

Devuelve JSON con esta estructura exacta:
{
  "comercializadora": string|null, "comercializadora_confidence": "alta"|"media"|"baja", "comercializadora_notes": string|null,
  "cups": string|null, "cups_confidence": "alta"|"media"|"baja", "cups_notes": string|null, "cups_detectado_por": "etiqueta_cups"|"contexto_suministro"|"patron_ocr"|null,
  "tarifa": string|null, "tarifa_confidence": "alta"|"media"|"baja", "tarifa_notes": string|null, "tarifa_detectada_por": "factura"|"potencias"|"inferencia"|null, "tarifa_discrepancia": boolean,
  "direccion_suministro": string|null, "direccion_suministro_confidence": "alta"|"media"|"baja", "direccion_suministro_notes": string|null,
  "tipo_suministro": "Electricidad"|"Gas"|null, "tipo_suministro_confidence": "alta"|"media"|"baja", "tipo_suministro_notes": string|null,
  "potencia_p1": number|null, "potencia_p2": number|null, "potencia_p3": number|null, "potencia_p4": number|null, "potencia_p5": number|null, "potencia_p6": number|null,
  "potencias_confidence": "alta"|"media"|"baja", "potencias_notes": string|null,
  "consumo_p1": null, "consumo_p2": null, "consumo_p3": null, "consumo_p4": null, "consumo_p5": null, "consumo_p6": null,
  "consumo_total": null, "consumos_confidence": "alta"|"media"|"baja", "consumos_notes": "Consumos no extraídos de factura",
  "validation_summary": string
}`;

    // Use custom template prompt if available, prepend it to the base prompt
    const extractionPrompt = templateCustomPrompt
      ? `INSTRUCCIONES ESPECÍFICAS PARA ESTE TIPO DE FACTURA (tienen prioridad sobre las instrucciones generales):\n\n${templateCustomPrompt}\n\n---\n\nINSTRUCCIONES GENERALES DE EXTRACCIÓN:\n\n${baseExtractionPrompt}`
      : baseExtractionPrompt;

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

    // ── Post-processing: normalizar formato de tarifa ────────────────────────
    if (extractedData.tarifa) {
      extractedData.tarifa = normalizeTariffFormat(extractedData.tarifa);
    }

    // ── Post-processing: tariff fallback/override from powers ────────────────
    let tarifaDetectadaPor = extractedData.tarifa_detectada_por || null;
    const allPotKeys = ['potencia_p1', 'potencia_p2', 'potencia_p3', 'potencia_p4', 'potencia_p5', 'potencia_p6'];
    const presentPotCount = allPotKeys.filter(k => extractedData[k] != null && extractedData[k] > 0).length;

    // Si el LLM devolvió tarifa pero tenemos 2 potencias y la tarifa no es 2.0TD → override
    if (extractedData.tarifa && extractedData.tarifa !== '2.0TD' && presentPotCount > 0 && presentPotCount <= 2) {
      extractedData.tarifa_notes = (extractedData.tarifa_notes || '') + ` Tarifa corregida a 2.0TD: solo se detectaron ${presentPotCount} potencia(s) contratada(s).`;
      extractedData.tarifa = '2.0TD';
      extractedData.tarifa_confidence = 'media';
      tarifaDetectadaPor = 'potencias';
    } else if (!extractedData.tarifa) {
      const inferred = inferTariffFromPowers(extractedData);
      if (inferred) {
        extractedData.tarifa = inferred;
        extractedData.tarifa_confidence = 'media';
        tarifaDetectadaPor = 'potencias';
        extractedData.tarifa_notes = (extractedData.tarifa_notes || '') + ` Tarifa deducida por número de potencias detectadas (${presentPotCount}).`;
      }
    } else {
      tarifaDetectadaPor = tarifaDetectadaPor || 'factura';
    }
    extractedData.tarifa_detectada_por = tarifaDetectadaPor;

    // ── Validación: 3.0TD con potencias > 35kW → posible 6.1TD ──────────────
    if (extractedData.tarifa === '3.0TD') {
      const maxPot = Math.max(...allPotKeys.map(k => extractedData[k] || 0));
      if (maxPot > 35) {
        extractedData.tarifa_notes = (extractedData.tarifa_notes || '') + ` REVISAR: potencia máxima de ${maxPot} kW supera 35 kW, podría ser tarifa 6.1TD.`;
        extractedData.tarifa_confidence = 'baja';
      }
    }

    // ── Apply tariff period rules ─────────────────────────────────────────────
    const tariffWarnings = applyTariffRules(extractedData.tarifa, extractedData);

    // ── Consumos siempre a null (se rellenan desde Excel) ────────────────────
    extractedData.consumo_p1 = null;
    extractedData.consumo_p2 = null;
    extractedData.consumo_p3 = null;
    extractedData.consumo_p4 = null;
    extractedData.consumo_p5 = null;
    extractedData.consumo_p6 = null;
    extractedData.consumo_total = null;

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