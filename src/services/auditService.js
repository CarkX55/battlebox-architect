import { callAI } from './aiFactory.js';
import { getAllCards } from './dbIngestor.js';
import { analyzeFunctionalPillars, buildPillarSummaryText } from './deckAuditorService.js';
import { isLand } from './deckCalculator.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: normaliza nombres de cartas para matching (doble cara, slashes)
// ─────────────────────────────────────────────────────────────────────────────
const normalizeCardName = (name = '') => {
  let n = name.toLowerCase().trim();
  if (n.includes('//')) n = n.split('//')[0].trim();
  if (n.includes('/')) n = n.split('/')[0].trim();
  return n;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Determina si una carta es cromáticamente compatible con el mazo
// ─────────────────────────────────────────────────────────────────────────────
function isColorCompatible(dbCard, allowedColors) {
  if (!allowedColors || allowedColors.length === 0) return true;
  const cardColors = dbCard.color_identity || dbCard.colors || [];
  if (cardColors.length === 0) return true; // Incolora = siempre compatible
  return cardColors.every(c => allowedColors.includes(c));
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDACIÓN POST-IA: verifica cada sugerencia contra la BD local
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Valida las sugerencias devueltas por la IA contra la base de datos local.
 * Marca sugerencias inválidas con _invalid: true y _invalidReasons: string[].
 * NO elimina sugerencias inválidas — la UI informa al usuario con un badge de error.
 *
 * @param {Array} suggestions   - Array de sugerencias de la IA
 * @param {Array} allCards      - Todas las cartas de la BD local
 * @param {Array} currentDeck   - Lista actual del mazo
 * @param {Array} allowedColors - Colores permitidos del formData
 * @returns {Array} suggestions anotadas
 */
function validateSuggestionsAgainstDB(suggestions, allCards, currentDeck, allowedColors) {
  if (!suggestions || !Array.isArray(suggestions)) return [];

  return suggestions.map(sug => {
    const invalidReasons = [];

    const validateAddList = (addList) => {
      if (!addList || !Array.isArray(addList)) return addList;
      return addList.map(addItem => {
        const normalizedName = normalizeCardName(addItem.name);
        const dbCard = allCards.find(c => normalizeCardName(c.name) === normalizedName);

        if (!dbCard) {
          invalidReasons.push(`"${addItem.name}" no existe en la base de datos local.`);
          return { ...addItem, _notFound: true };
        }

        // Verificar compatibilidad de color
        if (!isColorCompatible(dbCard, allowedColors)) {
          const cardColorStr = (dbCard.color_identity || dbCard.colors || []).join(',');
          invalidReasons.push(
            `"${addItem.name}" tiene colores [${cardColorStr}] incompatibles con la identidad del mazo [${allowedColors.join(',')}].`
          );
          return { ...addItem, _colorInvalid: true };
        }

        // Verificar límite de 4 copias (excepto tierras básicas)
        const inDeck = currentDeck.find(c => normalizeCardName(c.name) === normalizedName);
        const currentQty = inDeck ? (inDeck.quantity || 1) : 0;
        const isBasic = (dbCard.type_line || '').toLowerCase().includes('basic');
        const maxCopies = isBasic ? 99 : 4;
        if (currentQty + (addItem.quantity || 1) > maxCopies) {
          invalidReasons.push(
            `"${addItem.name}": Ya tienes ${currentQty} copias. Añadir ${addItem.quantity} superaría el límite de ${maxCopies}.`
          );
          return { ...addItem, _overLimit: true };
        }

        return addItem;
      });
    };

    const validatedAdds = validateAddList(sug.adds);
    const validatedAddOptions = sug.addOptions
      ? sug.addOptions.map(optGroup => validateAddList(optGroup))
      : sug.addOptions;

    const hasAnyInvalid = invalidReasons.length > 0;

    return {
      ...sug,
      adds: validatedAdds,
      addOptions: validatedAddOptions,
      ...(hasAnyInvalid && {
        _invalid: true,
        _invalidReasons: invalidReasons,
      }),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT DEL JUEZ SUPREMO
// ─────────────────────────────────────────────────────────────────────────────
const AUDIT_SYSTEM_PROMPT = `Eres un JUEZ SUPREMO Y CONSTRUCTOR EXPERTO DE MAZOS DE MAGIC: THE GATHERING.
Tu objetivo es dar una calificación justa, constructiva y precisa sobre la competitividad del mazo.

=== DIRECTRICES DE EVALUACIÓN EXPERTA ===
1. CALIFICACIÓN (score): Califica del 1 al 10.
   - Si el mazo tiene playsets consistentes, una base de maná matemáticamente perfecta, y sinergias claras, califícalo con un 9 o 10.
   - Penaliza por fallos objetivos: base de tierras inservible, criaturas gigantes incasteables, falta de interacción o falta total de motor.
2. ANÁLISIS FUNCIONAL Y VERDICTO (verdict): Escribe un resumen de 2-3 frases donde menciones explícitamente:
   - El desglose de roles (Amenazas vs Respuestas vs Motores) usando los datos de PILARES que recibes.
   - El Valor de Maná Promedio (VMP) numérico real que recibes en el prompt, indicando si es adecuado para la agresividad del mazo.
3. CONSTRUCTIVO: Enfócate en la competitividad. Reporta en "warnings" la falta de "Answers" (respuestas/removal) u optimizaciones de curva.
4. MAINBOARD ONLY: Evalúa únicamente el mazo principal. Ignora el sideboard.
5. PROTECCIÓN DE NÚCLEO (CRÍTICO): Si el usuario ha definido un "Lore / Idea Personal", DEBES respetar estrictamente las cartas clave que representan esa idea. Tu labor es optimizar la base de maná y las cartas de soporte, NUNCA sugerir eliminar la condición de victoria o el capricho temático del usuario.
6. EXPLICITUD EN REEMPLAZOS: En "suggestions", DEBES especificar qué cartas se eliminan para hacer hueco a las nuevas. Justifica por qué en "text". EXCEPCIÓN: Si se te informa de que al mazo le faltan cartas para llegar al mínimo legal (60 u 80), tu prioridad es AÑADIR cartas para rellenar esos huecos SIN usar "removes" (déjalo vacío).
7. OPCIONES MÚLTIPLES: Si consideras que hay varias opciones válidas para añadir (ej: "Añadir Fatal Push o Terminate"), DEBES usar el array "addOptions" para proporcionar las alternativas, y dejar "adds" vacío. Si solo hay una opción clara, usa "adds".
8. MEJORA INTEGRAL: Propón cambios estructurales severos si es necesario para alcanzar nivel Tier 1 competitivo (salvo el núcleo).
9. COHERENCIA DE COLOR (ESTRICTO): NUNCA, bajo ningún concepto, sugieras en el texto ni incluyas en los arrays (adds/addOptions) cartas que no pertenezcan a los "Colores" especificados por el usuario. Si el mazo es Jund (BRG), no puedes sugerir cartas Azules ni Blancas.
10. COHERENCIA TRIBAL: Prioriza enormemente sugerir cartas de la Tribu elegida.
11. FORMATO DE CARTAS: SIEMPRE que menciones el nombre de una carta en cualquier campo de texto, DEBES envolverla entre dobles corchetes. Ejemplo: "Necesitas más [[Lightning Bolt]]".
12. REDUNDANCIA FUNCIONAL Y STRICT UPGRADES:
   - Distingue claramente entre efectos acumulativos (modificadores numéricos +X/+Y como Lords, dorks/aceleradores de maná, hechizos de daño directo, robo de cartas, disparadores/triggers, reductores de coste y efectos de impuestos/stax). Está PERMITIDO y recomendado llevar múltiples cartas diferentes con estos efectos acumulativos para mejorar la consistencia del mazo. NUNCA penalices o consideres redundante esta acumulación de efectos.
   - En cambio, detecta redundancia negativa únicamente en habilidades de palabras clave estáticas no acumulativas en mesa (Volar, Prisa, Vigilancia, etc.) si se saturan en mazos genéricos.
   - NUNCA sugieras "añadir" una versión funcionalmente inferior o redundante si el mazo ya cuenta con copias de la versión superior.
13. LÍMITE LEGAL (REGLA DE 4X) Y REGLA DE LEYENDAS:
   - NUNCA sugieras añadir copias de una carta si la suma total en el mazo supera las 4 copias permitidas. (Excepción: Tierras básicas).
   - LÍMITE DE LEYENDAS PRO TOUR: Permite llevar hasta 4 copias en cartas legendarias de bajo coste (CMC <= 3) que sirvan de motores o amenazas baratas. Sin embargo, penaliza llevar 4 copias de leyendas pesadas de coste alto (CMC >= 4) a menos que el mazo cuente con formas muy claras de descartarlas, sugiriendo reducir a 2 o 3 copias para evitar el atasco.
14. ANÁLISIS MATEMÁTICO REAL: Tienes estrictamente prohibido decir que la base de maná es "frágil" o "inestable" basándote solo en los nombres de las tierras. MIRA LAS "FUENTES DE MANÁ DISPONIBLES" EN LAS MÉTRICAS. Si los números de las fuentes de color proporcionados son aceptables (ej >14), elogia la base de maná en lugar de criticarla falsamente.
15. ARQUETIPOS Y VELOCIDAD (VMP): Si el arquetipo es "Midrange" o "Control", un Valor de Maná Promedio (VMP) de hasta 3.0 es perfectamente aceptable y competitivo para su estrategia. Tienes ESTRICTAMENTE PROHIBIDO quejarte de que el mazo es "demasiado lento" si el VMP es menor o igual a 3.0 para estos arquetipos. Solo los mazos Aggro exigen VMP muy bajos (< 2.2).
16. DIRECTIVA DE INTERACTIVIDAD Y DIVERSIÓN (BATTLE BOX EQUITY):
    - Califica negativamente (score penalizado) si el mazo carece por completo de formas de interactuar con el oponente, o si consiste en combos degenerados que ganan de golpe de forma solitaria en los primeros turnos sin dar oportunidad de responder.
    - Debes sugerir cambiar piezas de combos instantáneos no interactivos o locks de bloqueo absoluto por motores de valor dinámicos, trucos de combate e interacción reactiva de pila.
17. DATOS DE PILARES FUNCIONALES (OBLIGATORIO LEER Y RESPETAR):
    - Recibirás un análisis pre-calculado matemáticamente exacto de los PILARES FUNCIONALES (ramp, draw, removal, threats, protection) basado en el oracle_text real de las cartas.
    - DEBES basar tu análisis y sugerencias en estos datos duros.
    - Si un pilar está marcado como 🚨 CRÍTICO, es OBLIGATORIO incluir sugerencias para mejorar ese pilar.
    - Si un pilar está marcado como ⚠️ BAJO, menciónalo en warnings.
    - No contradigas ni ignores estos datos pre-calculados.


Debes responder ÚNICAMENTE con un JSON válido usando este esquema exacto:
{
  "score": 0,
  "verdict": "...",
  "criticalAlerts": [],
  "warnings": [],
  "suggestions": [
    {
       "text": "Eliminar 2x [[Carta A]] para añadir 2x [[Carta B]] porque mejora la curva temprana.",
       "removes": [{"name": "Carta A", "quantity": 2}],
       "adds": [{"name": "Carta B", "quantity": 2}],
       "addOptions": [
         [{"name": "Carta B", "quantity": 2}],
         [{"name": "Carta C", "quantity": 2}]
       ]
    }
  ]
}`;

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL DE AUDITORÍA CON IA
// ─────────────────────────────────────────────────────────────────────────────
export async function auditDeckWithAI(deckCards, _sideboardCards, formData, aiConfig, onProgress = () => {}) {
  onProgress('audit', '🕵️‍♂️ El Juez está analizando pilares funcionales y base matemática...');
  
  const allCards = await getAllCards();
  const selectedFormat = (formData.format || 'modern').toLowerCase();
  const bannedCards = allCards
    .filter(c => c.legalities && c.legalities[selectedFormat] === 'banned')
    .map(c => c.name);
  const bannedText = bannedCards.length > 0 
    ? `\n\nCARTAS BANEADAS EN ESTE FORMATO (${selectedFormat}): ${bannedCards.join(', ')}. No las sugieras.`
    : "";

  // ── 1. Enriquecer decklist con oracle_text real (truncado a 140 chars para no saturar tokens)
  const deckListText = deckCards.map(c => {
    const oracleTrunc = c.oracle_text
      ? ` | Efecto: "${c.oracle_text.replace(/\n/g, ' ').substring(0, 140)}${c.oracle_text.length > 140 ? '…' : ''}"`
      : '';
    return `${c.quantity}x ${c.name} (CMC: ${c.mana_value ?? c.cmc ?? '?'}, Tipo: ${c.type_line || '?'}${oracleTrunc})`;
  }).join('\n');

  // ── 2. Calcular pilares funcionales pre-auditoría (datos matemáticamente duros)
  onProgress('audit', '🔬 Calculando pilares funcionales del mazo...');
  const spells = deckCards.filter(c => !isLand(c));
  const pillarAnalysis = analyzeFunctionalPillars(spells, formData?.format || 'MODERN', formData);
  const pillarText = buildPillarSummaryText(pillarAnalysis);

  // ── 3. Construir string de métricas matemáticas si existen
  const metricsText = formData?.metrics ? `
=== MÉTRICAS MATEMÁTICAS ESTRICTAS ===
- Valor de Maná Promedio (VMP): ${formData.metrics.vmp}
- Fuentes de Maná Disponibles: ${JSON.stringify(formData.metrics.sources)}
  (Analiza estas métricas para comprobar si la curva es muy alta o si faltan fuentes de color, indícalo en el veredicto o warnings).
` : '';

  const userLoreText = formData?.prompt
    ? `\nLore / Idea Personal del Usuario (¡DEBES PROTEGER ESTAS CARTAS!): "${formData.prompt}"`
    : '';

  // ── 4. Calcular si faltan cartas en el mazo
  const totalCards = deckCards.reduce((sum, c) => sum + (c.quantity || 1), 0);
  const targetCards = (formData?.companero?.toLowerCase().includes("yorion")) ? 80 : 60;
  const deckSizeWarning = totalCards < targetCards
    ? `\n\n[¡ALERTA CRÍTICA MATEMÁTICA!]: Al mazo le faltan cartas (Tiene ${totalCards} y necesita ${targetCards}). El usuario eliminó cartas manualmente y quiere que tú rellenes el hueco. REGLA INVIOLABLE: Tienes ESTRICTAMENTE PROHIBIDO eliminar más cartas. El array "removes" DEBE ESTAR OBLIGATORIAMENTE VACÍO []. Tu única tarea es proponer "adds" o "addOptions" cuya suma total de cantidades sea EXACTAMENTE ${targetCards - totalCards}.`
    : `\n\n[INFORMACIÓN MATEMÁTICA ESTRICTA]: He sumado la cantidad de copias de todas las cartas por ti. El mazo tiene EXACTAMENTE ${totalCards} cartas (un número perfectamente legal). TIENES TOTALMENTE PROHIBIDO alucinar diciendo que al mazo le faltan cartas. Si en tus 'suggestions' sugieres cambios, DEBES asegurar que la cantidad de cartas que eliminas ("removes") sea EXACTAMENTE IGUAL a la cantidad de cartas que añades ("adds"), de modo que el mazo se mantenga exactamente en ${totalCards} cartas.`;

  const userPrompt = `Analiza este mazo matemáticamente:
Arquetipo Objetivo: ${formData?.archetype || 'Desconocido'}
Estrategia: ${formData?.strategy || 'Desconocida'}
Tribu: ${formData?.tribe || 'Ninguna / Desconocida'}
Colores: ${formData?.colores?.join(', ') || 'No especificados'}${userLoreText}${bannedText}
${metricsText}
${pillarText}
${deckSizeWarning}
=== DECKLIST (con textos de carta reales para que puedas evaluar qué hace cada carta) ===
${deckListText}

Genera el reporte de auditoría estricto en JSON.`;

  onProgress('audit', '⚖️ El Juez Supremo está redactando el veredicto...');

  try {
    const response = await callAI([
      { role: 'system', content: AUDIT_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ], aiConfig, { forceJSON: true, maxTokens: 2500 });

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
          throw new Error("No se pudo parsear el JSON.");
        }
      }
    }

    // ── 5. VALIDACIÓN POST-IA: Verificar sugerencias contra la BD local
    onProgress('audit', '✅ Validando sugerencias contra la base de datos local...');
    const allowedColors = formData?.colores || [];
    const validatedSuggestions = validateSuggestionsAgainstDB(
      jsonResult.suggestions || [],
      allCards,
      deckCards,
      allowedColors
    );

    // Adjuntar el análisis de pilares al resultado para que la UI pueda mostrarlo
    return {
      ...jsonResult,
      suggestions: validatedSuggestions,
      _pillarAnalysis: pillarAnalysis,
    };
  } catch (error) {
    console.error("Error en la auditoría con IA:", error);
    throw new Error("Fallo al auditar el mazo. El Juez no está disponible.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDITORÍA INTERNA DE SINERGIAS (para esqueleto blueprints)
// ─────────────────────────────────────────────────────────────────────────────
const INTERNAL_SYNERGY_PROMPT = `Eres el Crítico de Sinergia Interno de un constructor maestro de mazos de MTG.
El Diseñador acaba de crear un esqueleto inicial de hechizos (SIN TIERRAS).
Tu misión es evaluarlo en busca de fallos fatales de construcción o sinergia rota:
- Falta de "payoffs" para los "enablers" (ej. cartas que ganan vida sin cartas que triggereen al ganar vida).
- Falta de protección o interacción básica para el arquetipo.
- Cartas disfuncionales o que entorpecen la estrategia.
- Cartas fuera de los colores permitidos o sin sentido en la tribu elegida.
- Detección de Antijuego (Battle Box Equity): Identifica y sugiere eliminar combos degenerados de victoria instantánea en turnos tempranos o cartas de bloqueo pasivo absoluto que impidan interactuar al oponente. Sugiere motores de valor o trucos de combate interactivos alternativos.

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
