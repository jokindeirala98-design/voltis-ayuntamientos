import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) {
      return Response.json({ error: 'Se requiere file_url' }, { status: 400 });
    }

    // Load all existing templates
    const templates = await base44.asServiceRole.entities.ExtractionTemplates.list();
    if (!templates || templates.length === 0) {
      return Response.json({ match: null, needs_teaching: true });
    }

    // Quick fingerprint extraction from the new invoice
    const fingerprintResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analiza esta factura energética española y extrae:
1. El nombre de la comercializadora que emite la factura.
2. El tipo de suministro (Electricidad o Gas).
3. Entre 8-15 palabras o frases clave únicas del diseño de esta factura (etiquetas de campos, cabeceras, textos distintivos propios de este diseño, NO datos del cliente). Por ejemplo: nombres de columnas, títulos de secciones, referencias internas de la comercializadora.

Responde SOLO con JSON:
{
  "comercializadora": "nombre",
  "tipo_suministro": "Electricidad" | "Gas",
  "keywords": ["kw1", "kw2", ...]
}`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          comercializadora: { type: 'string' },
          tipo_suministro: { type: 'string' },
          keywords: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    const invoiceKeywords = (fingerprintResult?.keywords || []).map(k => k.toLowerCase());
    const invoiceComercializadora = (fingerprintResult?.comercializadora || '').toLowerCase();

    // Score each template against the invoice
    let bestMatch = null;
    let bestScore = 0;

    for (const template of templates) {
      let score = 0;

      // Comercializadora match (strong signal)
      const templateCom = (template.comercializadora || '').toLowerCase();
      if (invoiceComercializadora && templateCom && (
        invoiceComercializadora.includes(templateCom) ||
        templateCom.includes(invoiceComercializadora)
      )) {
        score += 50;
      }

      // Keyword overlap
      let templateKeywords = [];
      try {
        templateKeywords = JSON.parse(template.fingerprint_keywords || '[]').map(k => k.toLowerCase());
      } catch { templateKeywords = []; }

      if (templateKeywords.length > 0 && invoiceKeywords.length > 0) {
        const matches = templateKeywords.filter(tk =>
          invoiceKeywords.some(ik => ik.includes(tk) || tk.includes(ik))
        );
        const overlap = matches.length / Math.max(templateKeywords.length, 1);
        score += Math.round(overlap * 50);
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = template;
      }
    }

    // Threshold: at least 40 points (comercializadora match OR good keyword overlap)
    if (bestScore >= 40 && bestMatch) {
      // Increment usage counter
      await base44.asServiceRole.entities.ExtractionTemplates.update(bestMatch.id, {
        times_used: (bestMatch.times_used || 0) + 1
      });
      return Response.json({
        match: {
          id: bestMatch.id,
          comercializadora: bestMatch.comercializadora,
          tipo_suministro: bestMatch.tipo_suministro,
          custom_prompt: bestMatch.custom_prompt,
          score: bestScore
        },
        needs_teaching: false
      });
    }

    return Response.json({
      match: null,
      needs_teaching: true,
      detected_comercializadora: fingerprintResult?.comercializadora || null
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});