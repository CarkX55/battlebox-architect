import { callAI } from './aiFactory.js';

const AUDIT_SYSTEM_PROMPT = `Eres un CONSTRUCTOR EXPERTO DE MAZOS DE MAGIC: THE GATHERING, evaluando la lista de un mazo en formato competitivo de 60 cartas (Modern/Standard).
Tu objetivo es dar una calificación justa, constructiva y precisa sobre la viabilidad del mazo.

=== DIRECTRICES DE EVALUACIÓN ===
1. CALIFICACIÓN (score): Califica del 1 al 10.
   - Si el mazo tiene playsets consistentes (4x/3x/2x/1x distribuidos lógicamente), una base de maná matemáticamente adecuada y balanceada (Karsten), y sinergias claras en su estrategia, califícalo con un 9 o 10.
   - Solo debes penalizar severamente (score < 8) por fallos objetivos de construcción, tales como: base de tierras inservible (ej: sin tierras del color de tus hechizos), cartas totalmente fuera de la identidad de color, criaturas grandes incasteables sin método de aceleración/reanimación, o falta total de un motor de juego coherente.
2. VERDICTO (verdict): Escribe un resumen de 1-2 frases destacando la solidez general del mazo y su plan de juego.
3. CONSTRUCTIVO: Enfócate en la competitividad. Si encuentras detalles menores (como pocos cantrips o la falta de un removal específico), repórtalo en "warnings" o "suggestions", pero no penalices drásticamente la puntuación.
4. MAINBOARD ONLY: Evalúa únicamente el mazo principal. Ignora el sideboard por completo y no pongas alertas críticas ni advertencias sobre el banquillo.

Debes responder ÚNICAMENTE con un JSON válido usando este esquema exacto:
{
  "score": 0,          // Calificación del 1 al 10
  "verdict": "...",    // Resumen de 1-2 frases
  "criticalAlerts": [], // Alertas críticas sobre errores objetivos que rompen el mazo (vacío si no los hay)
  "warnings": [],       // Advertencias menores o mejoras recomendadas
  "suggestions": []     // Sugerencias constructivas para pulir el mazo
}`;

export async function auditDeckWithAI(deckCards, _sideboardCards, formData, aiConfig, onProgress = () => {}) {
  onProgress('audit', '🕵️‍♂️ El Juez está auditando la estructura del mazo...');
  
  const deckListText = deckCards.map(c => `${c.quantity}x ${c.name} (Cat: ${c.category}, Cost: ${c.mana_cost || c.cmc || '?'})`).join('\n');

  const userPrompt = `Analiza este mazo:
Arquetipo Objetivo: ${formData?.archetype || 'Desconocido'}
Estrategia: ${formData?.strategy || 'Desconocida'}
Colores: ${formData?.colores?.join(', ') || 'No especificados'}
  
=== DECKLIST ===
${deckListText}

Genera el reporte de auditoría estricto.`;

  try {
    const response = await callAI([
      { role: 'system', content: AUDIT_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ], aiConfig, { forceJSON: true, maxTokens: 2000 });

    let jsonResult;
    try {
        jsonResult = JSON.parse(response);
    } catch(e) {
        // Fallback para extraer JSON si Gemini lo envolvió en markdown
        const match = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
        if (match) {
            jsonResult = JSON.parse(match[1]);
        } else {
            const first = response.indexOf('{');
            const last = response.lastIndexOf('}');
            if (first !== -1 && last > first) {
                jsonResult = JSON.parse(response.substring(first, last + 1));
            } else {
                throw new Error("No se pudo parsear el JSON.");
            }
        }
    }
    return jsonResult;
  } catch (error) {
    console.error("Error en la auditoría con IA:", error);
    throw new Error("Fallo al auditar el mazo. El Juez no está disponible.");
  }
}
