import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    const { file_url, user_instructions, extra_image_urls } = await req.json();
    if (!file_url || !user_instructions) {
      return Response.json({ error: 'Se requieren file_url y user_instructions' }, { status: 400 });
    }

    const allFileUrls = [file_url, ...(extra_image_urls || [])];

    // Step 1: Analyze the invoice and generate a custom extraction template
    const analysisResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Eres un experto en facturas energéticas españolas. El usuario te proporciona una factura de ejemplo y unas instrucciones específicas sobre cómo extraer sus datos.

INSTRUCCIONES DEL USUARIO:
${user_instructions}

TU TAREA:
1. Analiza la factura cuidadosamente.
2. Identifica la comercializadora que emite la factura.
3. Detecta el tipo de suministro (Electricidad / Gas).
4. Extrae entre 5-10 palabras clave únicas del diseño/maquetación de esta factura que sirvan como "huella digital" (cabeceras de tabla, etiquetas de campo, textos distintivos del diseño, referencias internas, etc.). Evita palabras genéricas como "factura", "total", "fecha".
5. Genera un prompt de extracción MUY ESPECÍFICO para este tipo de factura, incorporando las instrucciones del usuario, la ubicación exacta de cada dato en el documento, las etiquetas específicas que usa esta comercializadora para nombrar cada campo, y cualquier peculiaridad o truco de lectura que hayas detectado.

El prompt que generes será usado tal cual por otro modelo de IA para extraer datos de facturas similares en el futuro. Sé muy detallado y específico sobre DÓNDE y CÓMO están los datos en este diseño concreto de factura.

Responde con JSON:
{
  "comercializadora": "nombre exacto de la comercializadora",
  "tipo_suministro": "Electricidad" | "Gas" | "Ambos",
  "fingerprint_keywords": ["keyword1", "keyword2", ...],
  "custom_prompt": "El prompt personalizado completo para extraer datos de este tipo de factura...",
  "notes": "Observaciones importantes sobre este tipo de factura"
}`,
      file_urls: allFileUrls,
      response_json_schema: {
        type: 'object',
        properties: {
          comercializadora: { type: 'string' },
          tipo_suministro: { type: 'string' },
          fingerprint_keywords: { type: 'array', items: { type: 'string' } },
          custom_prompt: { type: 'string' },
          notes: { type: 'string' }
        }
      }
    });

    if (!analysisResult?.comercializadora) {
      return Response.json({ error: 'No se pudo analizar la factura correctamente' }, { status: 500 });
    }

    // Step 2: Save the template
    const template = await base44.asServiceRole.entities.ExtractionTemplates.create({
      comercializadora: analysisResult.comercializadora,
      tipo_suministro: analysisResult.tipo_suministro || 'Electricidad',
      fingerprint_keywords: JSON.stringify(analysisResult.fingerprint_keywords || []),
      custom_prompt: analysisResult.custom_prompt,
      user_instructions,
      example_file_url: file_url,
      times_used: 0,
      notes: analysisResult.notes || ''
    });

    return Response.json({
      success: true,
      template_id: template.id,
      comercializadora: analysisResult.comercializadora,
      tipo_suministro: analysisResult.tipo_suministro,
      keywords_count: (analysisResult.fingerprint_keywords || []).length
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});