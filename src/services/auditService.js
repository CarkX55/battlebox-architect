import { callAI } from './aiFactory.js';
import { getAllCards } from './dbIngestor.js';

const AUDIT_SYSTEM_PROMPT = `Eres un JUEZ SUPREMO Y CONSTRUCTOR EXPERTO DE MAZOS DE MAGIC: THE GATHERING.
Tu objetivo es dar una calificación justa, constructiva y precisa sobre la competitividad del mazo.

=== DIRECTRICES DE EVALUACIÓN EXPERTA ===
1. CALIFICACIÓN (score): Califica del 1 al 10.
   - Si el mazo tiene playsets consistentes, una base de maná matemáticamente perfecta, y sinergias claras, califícalo con un 9 o 10.
   - Penaliza por fallos objetivos: base de tierras inservible, criaturas gigantes incasteables, falta de interacción o falta total de motor.
2. ANÁLISIS FUNCIONAL Y VERDICTO (verdict): Escribe un resumen de 2-3 frases donde menciones explícitamente:
   - El desglose de roles (Amenazas vs Respuestas vs Motores).
   - El Valor de Maná Promedio (VMP) numérico real que recibes en el prompt, indicando si es adecuado para la agresividad del mazo.
3. CONSTRUCTIVO: Enfócate en la competitividad. Reporta en "warnings" la falta de "Answers" (respuestas/removal) u optimizaciones de curva.
4. MAINBOARD ONLY: Evalúa únicamente el mazo principal. Ignora el sideboard.
5. RESPETO A LA IDENTIDAD: Toma la idea original (Arquetipo y Tribu) y llévala a su máximo potencial competitivo, manteniendo su esencia.
6. EXPLICITUD EN REEMPLAZOS: En "suggestions", DEBES especificar qué cartas se eliminan (con nombre exacto) para hacer hueco a las nuevas. Justifica por qué en el campo "text".
7. MEJORA INTEGRAL: Propón cambios estructurales severos si es necesario para alcanzar nivel Tier 1 competitivo.
8. COHERENCIA DE COLOR: NUNCA sugieras añadir cartas que no pertenezcan a los Colores especificados.
9. COHERENCIA TRIBAL: Prioriza enormemente sugerir cartas de la Tribu elegida.
10. FORMATO DE CARTAS: SIEMPRE que menciones el nombre de una carta en cualquier campo de texto, DEBES envolverla entre dobles corchetes. Ejemplo: "Necesitas más [[Lightning Bolt]]".

Debes responder ÚNICAMENTE con un JSON válido usando este esquema exacto:
{
  "score": 0,          // Calificación del 1 al 10
  "verdict": "...",    // Resumen analítico mencionando el VMP y el desglose Amenazas/Respuestas/Motores
  "criticalAlerts": [], // Alertas críticas sobre errores objetivos que rompen el mazo
  "warnings": [],       // Advertencias sobre el recuento de fuentes de maná o falta de interacción
  "suggestions": [      // Sugerencias constructivas estructuradas
    {
       "text": "Eliminar 2x [[Carta A]] para añadir 2x [[Carta B]] porque mejora la curva temprana.",
       "removes": [{"name": "Carta A", "quantity": 2}],
       "adds": [{"name": "Carta B", "quantity": 2}]
    }
  ]
}`;

export async function auditDeckWithAI(deckCards, _sideboardCards, formData, aiConfig, onProgress = () => {}) {
  onProgress('audit', '🕵️‍♂️ El Juez está auditando la estructura matemática del mazo...');
  
  const allCards = await getAllCards();
  const selectedFormat = (formData.format || 'modern').toLowerCase();
  const bannedCards = allCards.filter(c => c.legalities && c.legalities[selectedFormat] === 'banned').map(c => c.name);
  const bannedText = bannedCards.length > 0 
    ? `\n\nCARTAS BANEADAS EN ESTE FORMATO (${selectedFormat}): ${bannedCards.join(', ')}. No las sugieras.`
    : "";

  const deckListText = deckCards.map(c => `${c.quantity}x ${c.name} (Cat: ${c.category}, Cost: ${c.mana_cost || c.cmc || '?'})`).join('\n');

  // Construir string de métricas matemáticas si existen
  const metricsText = formData?.metrics ? `
=== MÉTRICAS MATEMÁTICAS ESTRICTAS ===
- Valor de Maná Promedio (VMP): ${formData.metrics.vmp}
- Fuentes de Maná Disponibles: ${JSON.stringify(formData.metrics.sources)}
  (Analiza estas métricas para comprobar si la curva es muy alta o si faltan fuentes de color, indícalo en el veredicto o warnings).
` : '';

  const userPrompt = `Analiza este mazo matemáticamente:
Arquetipo Objetivo: ${formData?.archetype || 'Desconocido'}
Estrategia: ${formData?.strategy || 'Desconocida'}
Tribu: ${formData?.tribe || 'Ninguna / Desconocida'}
Colores: ${formData?.colores?.join(', ') || 'No especificados'}${bannedText}
${metricsText}
=== DECKLIST ===
${deckListText}

Genera el reporte de auditoría estricto en JSON.`;

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

const INTERNAL_SYNERGY_PROMPT = `Eres el Crítico de Sinergia Interno de un constructor maestro de mazos de MTG.
El Diseñador acaba de crear un esqueleto inicial de hechizos (SIN TIERRAS).
Tu misión es evaluarlo en busca de fallos fatales de construcción o sinergia rota:
- Falta de "payoffs" para los "enablers" (ej. cartas que ganan vida sin cartas que triggereen al ganar vida).
- Falta de protección o interacción básica para el arquetipo.
- Cartas disfuncionales o que entorpecen la estrategia.
- Cartas fuera de los colores permitidos o sin sentido en la tribu elegida.

Si el esqueleto está bien, devuelve sugerencias vacías.
Si necesita correcciones obligatorias, provee un array "suggestions" con removes y adds. Sé exacto.
Tu json de salida debe seguir esta estructura exacta:
{
  "criticalAlerts": ["alert 1", "alert 2"],
  "suggestions": [
    {
      "text": "Cambio la Carta A por la Carta B porque necesitamos X",
      "removes": [{"name": "Carta A", "quantity": 1}],
      "adds": [{"name": "Carta B", "quantity": 1}]
    }
  ]
}
`;

export async function internalSynergyAudit(deckSpells, formData, aiConfig) {
  const deckListText = deckSpells.map(c => `${c.quantity}x ${c.name} (Cat: ${c.category}, Cost: ${c.mana_cost || c.cmc || '?'})`).join('\n');
  const userPrompt = `Revisa el siguiente esqueleto de hechizos:
Arquetipo Objetivo: ${formData?.archetype || 'Desconocido'}
Estrategia: ${formData?.strategy || 'Desconocida'}
Tribu: ${formData?.tribe || 'Ninguna'}
Colores: ${formData?.colores?.join(', ') || 'No especificados'}
=== SPELLS ===
${deckListText}
`;
  try {
    const response = await callAI([
      { role: 'system', content: INTERNAL_SYNERGY_PROMPT },
      { role: 'user', content: userPrompt }
    ], aiConfig, { forceJSON: true, maxTokens: 1000 });
    
    let jsonResult;
    try {
        jsonResult = JSON.parse(response);
    } catch(e) {
        const match = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
        if (match) {
            jsonResult = JSON.parse(match[1]);
        } else {
            const first = response.indexOf('{');
            const last = response.lastIndexOf('}');
            if (first !== -1 && last > first) {
                jsonResult = JSON.parse(response.substring(first, last + 1));
            } else {
                return { suggestions: [] };
            }
        }
    }
    return jsonResult;
  } catch (error) {
    console.warn("Error en el Crítico Interno (ignorando):", error);
    return { suggestions: [] };
  }
}
