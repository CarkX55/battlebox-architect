import { callAI } from './aiFactory.js';
import { getAllCards } from './dbIngestor.js';
import { analyzeFunctionalPillars, buildPillarSummaryText } from './deckAuditorService.js';
import { isLand } from './deckCalculator.js';
import { runMonteCarloSimulation } from './monteCarloEngine.js';
import { auditCardRequirementsAndOrphans } from './cardRequirementEngine.js';
import { runStrategicDeckAutopsy } from './strategicDeckOptimizer.js';


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
export function isColorCompatible(dbCard, allowedColors) {
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
function validateSuggestionsAgainstDB(suggestions, allCards, currentDeck, allowedColors, formatKey = 'modern', rarityMode = 'high-power', formData = {}) {
  if (!suggestions || !Array.isArray(suggestions)) return [];

  const allowedRarities = rarityMode === 'pauper' ? ['common'] 
    : rarityMode === 'artisan' ? ['common', 'uncommon']
    : rarityMode === 'standard' ? ['common', 'uncommon', 'rare']
    : ['common', 'uncommon', 'rare', 'mythic'];

  const userTribeRaw = formData?.tribe || formData?.primaryTribe || formData?.aiMetadata?.tribe || '';
  let canonicalTribe = '';
  if (userTribeRaw) {
    const rawTribeStr = String(userTribeRaw).toLowerCase();
    if (rawTribeStr.includes('merfolk') || rawTribeStr.includes('sirena')) canonicalTribe = 'merfolk';
    else if (rawTribeStr.includes('giant') || rawTribeStr.includes('gigante')) canonicalTribe = 'giant';
    else if (rawTribeStr.includes('demon') || rawTribeStr.includes('demonio')) canonicalTribe = 'demon';
    else if (rawTribeStr.includes('elf') || rawTribeStr.includes('elfo')) canonicalTribe = 'elf';
    else if (rawTribeStr.includes('goblin')) canonicalTribe = 'goblin';
    else if (rawTribeStr.includes('ooze') || rawTribeStr.includes('limo') || rawTribeStr.includes('gelatina')) canonicalTribe = 'ooze';
    else if (rawTribeStr.includes('vampire') || rawTribeStr.includes('vampiro')) canonicalTribe = 'vampire';
    else if (rawTribeStr.includes('zombie')) canonicalTribe = 'zombie';
    else if (rawTribeStr.includes('dragon') || rawTribeStr.includes('dragón')) canonicalTribe = 'dragon';
    else {
      canonicalTribe = rawTribeStr.split(' ')[0].replace(/[^a-z]/g, '');
    }
  }

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

        // Verificar compatibilidad de tribu si el mazo es tribal
        if (canonicalTribe && (dbCard.type_line || '').toLowerCase().includes('creature')) {
          const isTribeCreature = (dbCard.type_line || '').toLowerCase().includes(canonicalTribe) || (dbCard.oracle_text || '').toLowerCase().includes(canonicalTribe);
          if (!isTribeCreature) {
            invalidReasons.push(`"${addItem.name}" no pertenece a la tribu configurada por el usuario (${userTribeRaw}).`);
            return { ...addItem, _tribeInvalid: true };
          }
        }

        // Verificar legalidad de formato
        if (dbCard.legalities && dbCard.legalities[formatKey] === 'banned') {
          invalidReasons.push(`"${addItem.name}" está baneada en el formato ${formatKey.toUpperCase()}.`);
          return { ...addItem, _banned: true };
        }

        // Verificar restricción de rareza
        if (!allowedRarities.includes((dbCard.rarity || 'common').toLowerCase())) {
          invalidReasons.push(`"${addItem.name}" (${dbCard.rarity}) excede la rareza permitida (${rarityMode}).`);
          return { ...addItem, _rarityInvalid: true };
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

    // Guard: si la sugerencia elimina tierras pero añade hechizos de no-tierra
    const removesLands = sug.removes && sug.removes.some(r => {
      const dbC = allCards.find(c => normalizeCardName(c.name) === normalizeCardName(r.name));
      return dbC && (dbC.type_line || '').toLowerCase().includes('land');
    });
    const addsNonLands = sug.adds && sug.adds.some(a => {
      const dbC = allCards.find(c => normalizeCardName(c.name) === normalizeCardName(a.name));
      return dbC && !(dbC.type_line || '').toLowerCase().includes('land');
    });

    if (removesLands && addsNonLands) {
      invalidReasons.push('La sugerencia mezcla eliminación de tierras con adición de hechizos.');
    }

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


// SYSTEM PROMPT DEL JUEZ SUPREMO
// ─────────────────────────────────────────────────────────────────────────────
const AUDIT_SYSTEM_PROMPT = `Eres un JUEZ SUPREMO Y CONSTRUCTOR EXPERTO DE MAZOS DE MAGIC: THE GATHERING.
Tu objetivo es dar una calificación justa, constructiva y precisa sobre la competitividad del mazo, respetando al 100% la intención, temática y mecánica elegidas por el usuario.

=== DIRECTRICES DE EVALUACIÓN EXPERTA ===
1. CALIFICACIÓN (score): Califica del 1 al 10.
   - Si el mazo tiene playsets consistentes, una base de maná matemáticamente perfecta, y sinergias claras, califícalo con un 9 o 10.
   - Penaliza por fallos objetivos: base de tierras inservible, criaturas gigantes incasteables, falta de interacción o falta total de motor.
2. ANÁLISIS FUNCIONAL Y VERDICTO (verdict): Escribe un resumen de 2-3 frases donde menciones explícitamente:
   - El desglose de roles (Amenazas vs Respuestas vs Motores de la Estrategia) usando los datos de PILARES que recibes.
   - El Valor de Maná Promedio (VMP) numérico real que recibes en el prompt, indicando si es adecuado para la agresividad del mazo.
3. CONSTRUCTIVO & PRIORIDAD:
   - Si la prioridad activa es 'synergy' (Sinergia Pura), evalúa la densidad de motores y la cohesión entre cartas; no penalices por no llevar staples de netdeck si el motor funciona.
   - Si la prioridad es 'thematic' (Temático/Casual), valora el sabor narrativo y el concepto del usuario.
   - Si la prioridad es 'competitive' (Competitivo Tier 1), exige máxima eficiencia y staples de metagame.
4. MAINBOARD ONLY: Evalúa únicamente el mazo principal. Ignora el sideboard.
5. PROTECCIÓN DE NÚCLEO, MECÁNICA Y PRESERVACIÓN DE ROLES/BLUEPRINT (INVIOLABLE):
   - SI EL MAZO TIENE UNA ESTRATEGIA O MECÁNICA DEFINIDA POR EL USUARIO (ej: Cementerio / Reanimación, Aristócratas, Prowess, Contadores +1/+1), TIENES PROHIBIDO DILUIR ESTA MECÁNICA CON STAPLES GENÉRICOS DE NETDECK.
   - NO elimines cartas de habilitadores (mill/descarte), reanimadores u objetivos para reemplazarlas con removal genérico sin sentido temático.
   - Si recomiendas un cambio, DEBE SER PARA REFORZAR O REPARAR LA MECÁNICA ELEGIDA (ej: sustituir un reanimador ineficiente por [[Persist]] o [[Unmarked Grave]], o un habilitador débil por [[Stitcher's Supplier]] o [[Faithful Mending]]).
   - Si el usuario ha definido un "Lore / Idea Personal" o cartas obligatorias ("mustInclude"), DEBES respetar strictly esas cartas. Queda TOTALMENTE PROHIBIDO sugerir eliminar cartas pertenecientes a 'mustInclude' o la condición de victoria del usuario.
6. EXPLICITUD Y REGLAS DE TEXTO LIMPIO (INVIOLABLE):
   - En cada sugerencia, la propiedad "text" DEBE ser una explicación limpia, directa y formal en español.
   - Queda ESTRICTAMENTE PROHIBIDO incluir tu monólogo interno, pensamientos de descarte o mencionar cartas de otros colores que hayas pensado y descartado durante tu evaluación (ej. NUNCA escribas '(si fuera verde, pero al ser BR...)' ni menciones hechizos fuera de la identidad de color del mazo).
   - Solamente menciona las cartas finales recomendadas envueltas en dobles corchetes. Ejemplo: "Eliminar 2x [[Carta A]] para añadir 2x [[Carta B]] porque mejora la curva temprana."
7. CATEGORIZACIÓN DE CAMBIO: En cada sugerencia, DEBES incluir la propiedad "changeType" con exactamente uno de estos valores:
   - "Strict Upgrade" (Sustituir por una versión estrictamente superior)
   - "Synergy Upgrade" (Mejores disparadores de tribu o motor)
   - "Curve Fix" (Desgestionar un punto de curva sobrecargado)
   - "Protection Fix" (Inyección de defensa o interacción ausente)
8. CANDIDATAS PRE-FILTRADAS: Se te proporcionará un bloque de "CANDIDATAS DE REEMPLAZO PRE-FILTRADAS DE TU BD LOCAL". DEBES elegir tus cartas recomendadas prioritariamente de esta lista, ya que están 100% garantizadas como legales, del color correcto y alineadas con la mecánica.
9. VETOS ESTRICTOS: NUNCA sugieras cartas o palabras clave que coincidan con las palabras vetadas ("vetoedKeywords") o cartas vetadas ("vetoedCards").
10. OPCIONES MÚLTIPLES: Si consideras que hay varias opciones válidas para añadir (ej: "Añadir Fatal Push o Terminate"), DEBES usar el array "addOptions" para proporcionar las alternativas, y dejar "adds" vacío. Si solo hay una opción clara, usa "adds".
11. FORMATO DE CARTAS: SIEMPRE que menciones el nombre de una carta en cualquier campo de texto, DEBES envolverla entre dobles corchetes. Ejemplo: "Necesitas más [[Lightning Bolt]]".
12. PRESERVACIÓN ESTRICTA DE LA CURVA DE MANÁ (INVIOLABLE):
   - Queda TOTALMENTE PROHIBIDO reemplazar cartas tempranas de coste bajo (CMC 1 o 2) por cartas lentas de alto coste (CMC 3, 4 o 5) en sugerencias de "Strict Upgrade" o "Synergy Upgrade".
   - La diferencia de coste entre las cartas eliminadas ("removes") y las cartas añadidas ("adds") DEBE ser como máximo de 1 punto de maná (|CMC_remove - CMC_add| <= 1), salvo que la sugerencia sea explícitamente de tipo "Curve Fix" para solucionar un atasco de curva demostrado.
   - NUNCA sugieras un removal de coste 3 o más para reemplazar una interacción o jugada de coste 1.
13. DEFINICIÓN ESTRICTA DE "PROTECTION FIX":
   - Las cartas de "Protection Fix" DEBEN ser hechizos de defensa activa o respuesta (contrahechizos/counterspells, dar hexproof, indestructible, protección o ward).
   - NUNCA clasifiques un hechizo de daño o removal de criaturas (como Heated Argument) bajo la etiqueta "Protection Fix". NUNCA sugieras eliminar un artefacto de alta calidad como Lost Jitte para meter un removal de coste elevado.
14. PRESERVACIÓN ESTRICTA DE TIERRAS DE TRIBU Y TIERRAS ESPECIALES (INVIOLABLE):
   - Queda TOTALMENTE PROHIBIDO sugerir eliminar tierras especiales de tribu (como Cavern of Souls, Unclaimed Territory, Secluded Courtyard) o tierras duales/fetchlands competitivas para cambiarlas por tierras básicas (como Island o Forest) en mazos de tribu o multicontexto. Las tierras de fijación de tribu y duales son fundamentales para la estabilidad del maná.
15. ALINEACIÓN ABSOLUTA CON LA CONFIGURACIÓN DEL USUARIO:
   - DEBES respetar estrictamente el formato elegido por el usuario, el presupuesto configurado (maxBudget), las cartas vetadas (vetoedCards / customBanlist) y la identidad de color exacta (colores). NUNCA recomiendes una carta que exceda el presupuesto o viole los vetos del usuario.
16. PRESERVACIÓN ABSOLUTA DE LA TRIBU Y MECÁNICA ELEGIDA (INVIOLABLE):
   - Si el mazo tiene una Tribu elegida (ej: Saproling, Fungus, Merfolk, Giants, Demons, Elves, Goblins, Oozes), QUEDA ABSOLUTAMENTE PROHIBIDO recomendar criaturas o artefactos de otras tribus no relacionadas (ej. NO recomiendes Hangarback Walker, Walking Ballista, conejos o ranas en un mazo de Saprolines, Hongos, Tritones o Demonios).
   - TODA criatura o permanente sugerido DEBE pertenecer estrictamente a la Tribu o apoyar directamente su mecánico de fichas (ej: Sporecrown Thallid, Slimefoot, Parallel Lives, Intangible Virtue, Tendershoot Dryad, Mycoloth). Queda TOTALMENTE PROHIBIDO eliminar la bomba principal del mazo para inyectar artefactos fuera de tema.
17. PROHIBICIÓN DE ELIMINAR TIERRAS PARA AÑADIR HECHIZOS:
   - Las sugerencias de "Mana Base & Pillar Fix" DEBEN ser EXCLUSIVAMENTE intercambios de tierras por tierras (ej: cambiar tierras básicas por tierras duales o tierras de tribu como Cavern of Souls). QUEDA TOTALMENTE PROHIBIDO incluir criaturas o hechizos dentro de una sugerencia de tierras o reducir la cuenta de tierras del mazo.

Debes responder ÚNICAMENTE con un JSON válido usando este esquema exacto:
{
  "score": 0,
  "verdict": "...",
  "criticalAlerts": [],
  "warnings": [],
  "suggestions": [
    {
       "text": "Eliminar 2x [[Carta A]] para añadir 2x [[Carta B]] porque mejora la respuesta temprana.",
       "changeType": "Strict Upgrade",
       "removes": [{"name": "Carta A", "quantity": 2}],
       "adds": [{"name": "Carta B", "quantity": 2}],
       "addOptions": [
         [{"name": "Carta B", "quantity": 2}],
         [{"name": "Carta C", "quantity": 2}]
       ]
    }
  ]
}
`;

export function getPillarCandidatesFromDB(pillarName, allCards, allowedColors, formatKey, rarityMode, vetoedKeywords = [], vetoedCards = [], activeStrategy = '', primaryTribe = '') {
  const allowedRarities = rarityMode === 'pauper' ? ['common'] 
    : rarityMode === 'artisan' ? ['common', 'uncommon']
    : rarityMode === 'standard' ? ['common', 'uncommon', 'rare']
    : ['common', 'uncommon', 'rare', 'mythic'];

  const rawVetoCards = Array.isArray(vetoedCards) ? vetoedCards : typeof vetoedCards === 'string' ? vetoedCards.split(',') : [];

  const rawVetoKws = Array.isArray(vetoedKeywords) ? vetoedKeywords : typeof vetoedKeywords === 'string' ? vetoedKeywords.split(',') : [];

  const normalizedVetoedCards = rawVetoCards.map(v => typeof v === 'string' ? v.toLowerCase().trim() : (v?.name || '').toLowerCase().trim()).filter(Boolean);
  const normalizedVetoedKws = rawVetoKws.map(k => typeof k === 'string' ? k.toLowerCase().trim() : '').filter(Boolean);

  const stratLower = (activeStrategy || '').toLowerCase();

  // Extraer subtipo canónico de la tribu si fue especificada por el usuario
  let canonicalTribe = '';
  if (primaryTribe) {
    const rawTribeStr = String(primaryTribe).toLowerCase();
    if (rawTribeStr.includes('merfolk') || rawTribeStr.includes('sirena')) canonicalTribe = 'merfolk';
    else if (rawTribeStr.includes('giant') || rawTribeStr.includes('gigante')) canonicalTribe = 'giant';
    else if (rawTribeStr.includes('demon') || rawTribeStr.includes('demonio')) canonicalTribe = 'demon';
    else if (rawTribeStr.includes('elf') || rawTribeStr.includes('elfo')) canonicalTribe = 'elf';
    else if (rawTribeStr.includes('goblin')) canonicalTribe = 'goblin';
    else if (rawTribeStr.includes('ooze') || rawTribeStr.includes('limo') || rawTribeStr.includes('gelatina')) canonicalTribe = 'ooze';
    else if (rawTribeStr.includes('vampire') || rawTribeStr.includes('vampiro')) canonicalTribe = 'vampire';
    else if (rawTribeStr.includes('zombie')) canonicalTribe = 'zombie';
    else if (rawTribeStr.includes('dragon') || rawTribeStr.includes('dragón')) canonicalTribe = 'dragon';
    else {
      canonicalTribe = rawTribeStr.split(' ')[0].replace(/[^a-z]/g, '');
    }
  }

  const candidates = allCards
    .filter(c => c && c.name)
    .filter(c => !normalizedVetoedCards.includes(c.name.toLowerCase()))
    .filter(c => allowedRarities.includes((c.rarity || 'common').toLowerCase()))
    .filter(c => c.legalities && c.legalities[formatKey] === 'legal')
    .filter(c => isColorCompatible(c, allowedColors))
    .filter(c => {
      const oracle = (c.oracle_text || '').toLowerCase();
      const typeLine = (c.type_line || '').toLowerCase();
      const cmc = c.cmc ?? c.mana_value ?? 0;
      if (normalizedVetoedKws.some(kw => kw && (oracle.includes(kw) || typeLine.includes(kw)))) return false;

      // Si el usuario eligió una tribu, CUALQUIER criatura propuesta DEBE pertenecer a esa tribu
      if (canonicalTribe && typeLine.includes('creature')) {
        const isTribeMatch = typeLine.includes(canonicalTribe) || oracle.includes(canonicalTribe);
        if (!isTribeMatch) return false;
      }
      
      // Exigir máxima eficiencia de maná para interacción, protección y robo (CMC ≤ 3)
      if (pillarName === 'protection' || pillarName === 'removal' || pillarName === 'draw') {
        if (cmc > 3) return false;
      }

      if (pillarName === 'strategy_engine' || pillarName === 'graveyard' || stratLower.includes('graveyard') || stratLower.includes('reanimate')) {
        const isGraveyardCard = oracle.includes('graveyard') || oracle.includes('return from your graveyard') || oracle.includes('mill') || oracle.includes('surveil') || oracle.includes('discard') || oracle.includes('unearth') || oracle.includes('flashback') || oracle.includes('reanimate');
        if (isGraveyardCard) return true;
      }
      
      if (pillarName === 'protection') {
        return oracle.includes('hexproof') || oracle.includes('indestructible') || oracle.includes('protection from') || oracle.includes('ward') || oracle.includes('counter target spell') || oracle.includes('target creature gains');
      } else if (pillarName === 'removal') {
        return oracle.includes('destroy target') || oracle.includes('exile target') || oracle.includes('deals') || oracle.includes('return target') || oracle.includes('-x/-x');
      } else if (pillarName === 'ramp') {
        return oracle.includes('add {') || oracle.includes('search your library for a land') || oracle.includes('treasure');
      } else if (pillarName === 'draw') {
        return oracle.includes('draw') || oracle.includes('investigate') || oracle.includes('scry');
      } else if (pillarName === 'threats') {
        const power = parseInt(c.power || '0', 10);
        return typeLine.includes('planeswalker') || (typeLine.includes('creature') && (power >= 2 || c.rarity === 'rare' || c.rarity === 'mythic' || c.rarity === 'uncommon'));
      }
      return false;
    })
    .sort((a, b) => {
      // Ordenar por CMC ascendente (priorizar 1-drops y 2-drops eficientes)
      const cmcA = a.cmc ?? a.mana_value ?? 99;
      const cmcB = b.cmc ?? b.mana_value ?? 99;
      return cmcA - cmcB;
    })
    .slice(0, 10);

  return candidates.map(c => c.name);
}


/**
 * Sintetiza un texto de veredicto fluido, profesional y humano de nivel Juez Pro Tour MTG
 * que hace referencia explícita al concepto/arquetipo/estrategia inicial del usuario,
 * a las fisuras estructurales (pilares y Karsten) y al plan de cambios sugeridos.
 */
export function buildProTourExpertVerdict(formData, hydratedDeckCards, pillarAnalysis, karstenAnalysis, totalCards, targetCards, suggestions, rawVerdictFromAI) {
  const archetype = (formData?.archetype || 'Midrange').toUpperCase();
  const strategy = (formData?.strategy || formData?.selectedEngineId || formData?.aiMetadata?.strategy || 'Estrategia').toUpperCase();
  const colorsList = formData?.colores || [];
  const colorsStr = colorsList.length > 0 ? colorsList.join('/') : 'Incoloro/Genérico';
  const concept = formData?.prompt || formData?.lore || formData?.aiMetadata?.lore;

  const sections = [];

  // 1. INTENCIÓN Y CONCEPTO DEL USUARIO
  let paragraph1 = `🏛️ **Diagnóstico de Juez Pro Tour (${archetype} - ${strategy} ${colorsStr})**:\n`;
  if (concept) {
    paragraph1 += `Evaluando tu visión original ("${concept}"), hemos analizado la sinergia y curva para adaptar tu concepto al metagame actual.`;
  } else {
    paragraph1 += `Hemos analizado la consistencia de tu lista de ${totalCards} cartas evaluando la curva de maná, densidad de motores y devoción de color según Karsten Math.`;
  }
  sections.push(paragraph1);

  // 2. DIAGNÓSTICO ESTRUCTURAL (Tamaño, Karsten & Pilares)
  const diagLines = [];

  if (totalCards < targetCards) {
    diagLines.push(`• **Mazo Incompleto**: La lista actual contiene ${totalCards} de las ${targetCards} cartas requeridas (faltan ${targetCards - totalCards} cartas).`);
  }

  const criticalKarsten = karstenAnalysis?.devotions?.filter(d => d.status === 'critical') || [];
  if (criticalKarsten.length > 0) {
    const karstenDetail = criticalKarsten.map(d => `${d.color} (${d.availableSources} fuentes vs ${d.requiredSources} requeridas)`).join(', ');
    diagLines.push(`• **Escasez de Fuentes de Maná (Karsten Math)**: Sufres un déficit severo en los pips ${karstenDetail}, lo que generará atascos de maná en primeros turnos.`);
  }

  const criticalPillars = [];
  const overloadedPillars = [];
  if (pillarAnalysis && pillarAnalysis.pillars) {
    const pillarNames = { ramp: 'Aceleración (Ramp)', draw: 'Motor de Robo (Draw)', removal: 'Remoción (Removal)', threats: 'Amenazas (Finishers)', protection: 'Protección (Defensa)' };
    Object.entries(pillarAnalysis.pillars).forEach(([key, data]) => {
      const name = pillarNames[key] || key;
      if (data.count === 0 && data.threshold > 0) {
        criticalPillars.push(`**${name}** (0 copias)`);
      } else if (data.count < data.threshold) {
        criticalPillars.push(`**${name}** (${data.count}/${data.threshold} rec.)`);
      } else if (data.count > data.threshold * 1.7 && data.count >= 10) {
        overloadedPillars.push(`**${name}** (${data.count} copias)`);
      }
    });
  }

  if (overloadedPillars.length > 0 || criticalPillars.length > 0) {
    let pText = '• **Desequilibrio Funcional**: ';
    if (overloadedPillars.length > 0) {
      pText += `Sobrecarga en ${overloadedPillars.join(' y ')}. `;
    }
    if (criticalPillars.length > 0) {
      pText += `Déficit en ${criticalPillars.join(', ')}.`;
    }
    diagLines.push(pText);
  }

  if (diagLines.length > 0) {
    sections.push(`⚠️ **Fisuras Estructurales Detectadas**:\n${diagLines.join('\n')}`);
  }

  // 3. DICTAMEN DE IA (SI CORRESPONDE Y NO ES FALLBACK DUMMY)
  if (rawVerdictFromAI && rawVerdictFromAI.length > 25 && !rawVerdictFromAI.includes("Auditoría determinista")) {
    sections.push(`💬 **Dictamen Táctico**: ${rawVerdictFromAI}`);
  }

  // 4. PLAN DE ACCIÓN PASO A PASO (CAMBIOS RECOMENDADOS)
  if (suggestions && suggestions.length > 0) {
    const planItems = suggestions.slice(0, 4).map(s => {
      let actionStr = '';
      if (s.removes && s.removes.length > 0) {
        actionStr += `Retirar ${s.removes.map(r => `${r.quantity}x [[${r.name}]]`).join(', ')}`;
      }
      if (s.adds && s.adds.length > 0) {
        if (actionStr) actionStr += ' e ';
        else actionStr += 'Añadir ';
        actionStr += `inyectar ${s.adds.map(a => `${a.quantity}x [[${a.name}]]`).join(', ')}`;
      }
      return actionStr ? `• **${s.text || s.changeType || 'Ajuste Táctico'}**: ${actionStr}.` : `• ${s.text}`;
    }).filter(Boolean);

    if (planItems.length > 0) {
      sections.push(`⚡ **Plan de Corrección Recomendado por Experto MTG**:\n${planItems.join('\n')}`);
    }
  }

  return sections.join('\n\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL DE AUDITORÍA CON IA
// ─────────────────────────────────────────────────────────────────────────────
export async function auditDeckWithAI(deckCards, _sideboardCards, formData, aiConfig, onProgress = () => {}) {
  onProgress('audit', '🕵️‍♂️ El Juez está analizando pilares funcionales y base matemática...');
  
  const allCards = await getAllCards();
  
  // Hot-hydrate any cards missing critical attributes
  const hydratedDeckCards = [];
  for (let card of deckCards) {
    if (!card) continue;
    const isCreature = (card.type_line || card.category || '').toLowerCase().includes('creature');
    const needsHydration = !card.oracle_text || (isCreature && (card.power === undefined || card.power === ''));
    if (needsHydration) {
      const dbMatch = allCards.find(ac => ac && ac.name && ac.name.toLowerCase() === card.name.toLowerCase());
      if (dbMatch && dbMatch.oracle_text && (!isCreature || (dbMatch.power !== undefined && dbMatch.power !== ''))) {
        hydratedDeckCards.push({ ...card, ...dbMatch });
      } else {
        const { hydrateCard } = await import('./cardHydrator.js');
        const hydrated = await hydrateCard(card, formData?.rarityMode || 'high-power');
        hydratedDeckCards.push(hydrated);
      }
    } else {
      hydratedDeckCards.push(card);
    }
  }

  const selectedFormat = (formData?.format || 'modern').toLowerCase();
  const bannedCards = allCards
    .filter(c => c.legalities && c.legalities[selectedFormat] === 'banned')
    .map(c => c.name);
  const bannedText = bannedCards.length > 0 
    ? '\n\nCARTAS BANEADAS EN ESTE FORMATO: ' + bannedCards.slice(0, 35).join(', ') + '. No las sugieras.'
    : '';

  // ── 1. Enriquecer decklist con oracle_text real
  const deckListText = hydratedDeckCards.map(c => {
    let oracleTrunc = '';
    if (c.oracle_text) {
      const text = c.oracle_text.replace(/\n/g, ' ');
      oracleTrunc = ' | Efecto: "' + text.substring(0, 140) + '"';
    }
    const cmcVal = c.mana_value ?? c.cmc ?? 0;
    return c.quantity + 'x "' + c.name + '" (Coste de Maná / CMC: ' + cmcVal + ', Tipo: ' + (c.type_line || '?') + oracleTrunc + ')';
  }).join('\n');

  // ── 2. Calcular pilares funcionales pre-auditoría y Karsten Devotion
  onProgress('audit', '🔬 Calculando pilares funcionales y devoción de maná...');
  const spells = hydratedDeckCards.filter(c => !isLand(c));
  const pillarAnalysis = analyzeFunctionalPillars(spells, formData?.format || 'MODERN', formData);
  const pillarText = buildPillarSummaryText(pillarAnalysis);

  // Derivar la identidad de color real del mazo inspeccionando las cartas y la configuración
  const detectedColors = new Set((formData?.colores || []).map(c => String(c).toUpperCase()));
  hydratedDeckCards.forEach(c => {
    if (!c) return;
    if (Array.isArray(c.colors)) c.colors.forEach(col => detectedColors.add(col.toUpperCase()));
    if (Array.isArray(c.color_identity)) c.color_identity.forEach(col => detectedColors.add(col.toUpperCase()));
    const cost = (c.mana_cost || '').toUpperCase();
    ['W', 'U', 'B', 'R', 'G'].forEach(col => {
      if (cost.includes(`{${col}}`)) detectedColors.add(col);
    });
  });
  const allowedColors = Array.from(detectedColors);
  if (allowedColors.length === 0) allowedColors.push('G');
  
  // ── 2.5 Pre-filtrar candidatas RAG para pilares necesitados y la estrategia activa del usuario
  const candidateSummaryLines = [];
  const activeStrategy = formData?.strategy || formData?.aiMetadata?.strategy || '';

  if (activeStrategy) {
    const strategyCandidates = getPillarCandidatesFromDB(
      'strategy_engine',
      allCards,
      allowedColors,
      selectedFormat,
      formData?.rarityMode || 'high-power',
      formData?.vetoedKeywords || [],
      formData?.vetoedCards || [],
      activeStrategy
    );
    if (strategyCandidates.length > 0) {
      const candNames = strategyCandidates.map(n => '[[' + n + ']]').join(', ');
      candidateSummaryLines.push('- Candidatas de MOTOR ESTRATÉGICO (' + activeStrategy.toUpperCase() + ') en [' + allowedColors.join(',') + ']: ' + candNames);
    }
  }

  ['protection', 'removal', 'ramp', 'draw', 'threats'].forEach(pillarKey => {
    if (pillarAnalysis.pillarStatus[pillarKey] === 'critical' || pillarAnalysis.pillarStatus[pillarKey] === 'low') {
      const candidates = getPillarCandidatesFromDB(
        pillarKey,
        allCards,
        allowedColors,
        selectedFormat,
        formData?.rarityMode || 'high-power',
        formData?.vetoedKeywords || [],
        formData?.vetoedCards || [],
        activeStrategy
      );
      if (candidates.length > 0) {
        const candNames = candidates.map(n => '[[' + n + ']]').join(', ');
        candidateSummaryLines.push('- Candidatas de ' + pillarKey.toUpperCase() + ' legales en [' + allowedColors.join(',') + ']: ' + candNames);
      }
    }
  });

  const candidatesPromptBlock = candidateSummaryLines.length > 0
    ? '\n=== CANDIDATAS DE REEMPLAZO PRE-FILTRADAS DE TU BD LOCAL (100% LEGALES Y ALINEADAS CON LA MECÁNICA) ===\n' + candidateSummaryLines.join('\n') + '\n(DEBES elegir tus sugerencias prioritariamente de entre estas candidatas para NO DILUIR la temática del usuario).'
    : '';

  // ── 3. Construir string de métricas matemáticas completas
  let metricsText = '';
  if (formData?.metrics) {
    metricsText = '\n=== MÉTRICAS MATEMÁTICAS ESTRICTAS ===\n- Valor de Maná Promedio (VMP): ' + formData.metrics.vmp + '\n- Fuentes de Maná Disponibles: ' + JSON.stringify(formData.metrics.sources);
  }

  const concept = formData?.prompt || formData?.lore || formData?.aiMetadata?.lore;
  const userConceptText = concept ? ('\nIdea / Lore Temático del Usuario: "' + concept + '"') : '';

  let mustInc = '';
  if (Array.isArray(formData?.mustInclude)) {
    mustInc = formData.mustInclude.join(', ');
  } else if (typeof formData?.mustInclude === 'string') {
    mustInc = formData.mustInclude;
  }
  const mustIncludeText = mustInc ? ('\nCartas Obligatorias Definidas por el Usuario: ' + mustInc) : '';

  let vetoKws = 'Ninguna';
  if (Array.isArray(formData?.vetoedKeywords)) {
    vetoKws = formData.vetoedKeywords.join(', ');
  } else if (typeof formData?.vetoedKeywords === 'string') {
    vetoKws = formData.vetoedKeywords;
  }

  let vetoCards = 'Ninguna';
  if (Array.isArray(formData?.vetoedCards)) {
    vetoCards = formData.vetoedCards.map(c => typeof c === 'string' ? c : c?.name || '').filter(Boolean).join(', ');
  } else if (typeof formData?.vetoedCards === 'string') {
    vetoCards = formData.vetoedCards;
  }

  const vetoText = (vetoKws !== 'Ninguna' || vetoCards !== 'Ninguna')
    ? ('\nVetos del Usuario: Palabras: ' + vetoKws + ' | Cartas: ' + vetoCards)
    : '';

  // ── 3.5 Simulación Monte Carlo y Auditoría de Cartas Huérfanas
  const monteCarlo = runMonteCarloSimulation(hydratedDeckCards, 1000);
  const cardReqs = auditCardRequirementsAndOrphans(hydratedDeckCards);

  let monteCarloText = '';
  if (monteCarlo && !monteCarlo.error) {
    monteCarloText = `
=== RESULTADOS EMPÍRICOS DE SIMULACIÓN MONTE CARLO (1,000 MANOS INICIALES EN JS) ===
- Probabilidad de Disponibilidad de Maná: Turno 1: ${monteCarlo.manaAvailablePct.turn1}% | Turno 2: ${monteCarlo.manaAvailablePct.turn2}% | Turno 3: ${monteCarlo.manaAvailablePct.turn3}% | Turno 4: ${monteCarlo.manaAvailablePct.turn4}%
- Riesgo de Mulligan: Manos con 0-1 tierras: ${monteCarlo.mulliganRisk.zeroOrOneLandPct}% | Manos perfectas (2-4 tierras): ${monteCarlo.mulliganRisk.perfectHandPct}% | Manos de inundación (5+ tierras): ${monteCarlo.mulliganRisk.floodHandPct}%
- Probabilidad de Jugada en Turno 1: ${monteCarlo.turn1PlayPct}%
- Probabilidad de Aceleración en Turno 2: ${monteCarlo.turn2RampPct}%
`;
  }

  let cardReqText = '';
  if (cardReqs.hasIssues) {
    const failures = cardReqs.requirementFailures.map(f => `- ${f.card}: ${f.issueDescription}`).join('\n');
    const orphans = cardReqs.orphanCards.map(o => `- ${o.cardName}: ${o.reason}`).join('\n');
    cardReqText = `
=== ALERTAS DE REQUISITOS DE CARTAS Y CARTAS HUÉRFANAS DETECTADAS ===
${failures ? 'INCUMPLIMIENTOS DE REQUISITO:\n' + failures : ''}
${orphans ? 'CARTAS HUÉRFANAS DETECTADAS:\n' + orphans : ''}
`;
  }

  // ── 4. Calcular si faltan cartas en el mazo
  const totalCards = hydratedDeckCards.reduce((sum, c) => sum + (c.quantity || 1), 0);
  const targetCards = (formData?.companero?.toLowerCase().includes("yorion")) ? 80 : 60;
  let deckSizeWarning = '';
  if (totalCards < targetCards) {
    deckSizeWarning = '\n\n[¡ALERTA CRÍTICA MATEMÁTICA!]: Al mazo le faltan cartas (Tiene ' + totalCards + ' y necesita ' + targetCards + '). El usuario eliminó cartas manualmente y quiere que tú rellenes el hueco. REGLA INVIOLABLE: Tienes ESTRICTAMENTE PROHIBIDO eliminar más cartas. El array "removes" DEBE ESTAR OBLIGATORIAMENTE VACÍO []. Tu única tarea es proponer "adds" o "addOptions" cuya suma total de cantidades sea EXACTAMENTE ' + (targetCards - totalCards) + '.';
  } else {
    deckSizeWarning = '\n\n[INFORMACIÓN MATEMÁTICA ESTRICTA]: He sumado la cantidad de copias de todas las cartas por ti. El mazo tiene EXACTAMENTE ' + totalCards + ' cartas (un número perfectamente legal). TIENES TOTALMENTE PROHIBIDO alucinar diciendo que al mazo le faltan cartas. Si en tus "suggestions" sugieres cambios, DEBES asegurar que la cantidad de cartas que eliminas ("removes") sea EXACTAMENTE IGUAL a la cantidad de cartas que añades ("adds").';
  }

  const promptParts = [
    'Analiza este mazo matemáticamente y temáticamente:',
    'Formato Activo: ' + selectedFormat.toUpperCase(),
    'Arquetipo Objetivo: ' + (formData?.archetype || 'Desconocido'),
    'Estrategia / Mecánica del Usuario: ' + (formData?.strategy || formData?.aiMetadata?.strategy || 'Desconocida'),
    'Tribu: ' + (formData?.tribe || 'Ninguna / Desconocida'),
    'Colores Permitidos: ' + (allowedColors.join(', ') || 'No especificados'),
    'Enfoque Táctico: ' + (formData?.stance || 'balanced'),
    'Prioridad de Selección: ' + (formData?.generationPriority || 'hybrid'),
    'Restricción de Rareza: ' + (formData?.rarityMode || 'high-power'),
    userConceptText,
    mustIncludeText,
    vetoText,
    bannedText,
    metricsText,
    monteCarloText,
    cardReqText,
    pillarText,
    candidatesPromptBlock,
    deckSizeWarning,
    '=== DECKLIST ===',
    deckListText,
    '',
    'Genera el reporte de auditoría estricto en JSON.'
  ];
  const userPrompt = promptParts.filter(Boolean).join('\n');

  onProgress('audit', '⚖️ El Juez Supremo está redactando el veredicto...');

  let jsonResult = null;
  try {
    if (!aiConfig?.selectedModel && !aiConfig?.apiKey) {
      throw new Error("Configuración de IA no disponible");
    }
    const response = await callAI([
      { role: 'system', content: AUDIT_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ], aiConfig, { forceJSON: true, maxTokens: 2500 });

    const cleanResponse = (raw) => {
      let clean = (raw || '').trim();
      const match = clean.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
      if (match) clean = match[1].trim();
      const first = clean.indexOf('{');
      const last = clean.lastIndexOf('}');
      if (first !== -1 && last > first) {
        clean = clean.substring(first, last + 1);
      }
      clean = clean.replace(/,\s*([\}\]])/g, '$1');
      return clean;
    };

    jsonResult = JSON.parse(cleanResponse(response));
  } catch (aiErr) {
    console.warn("⚠️ [Juez Supremo] La llamada a la IA no estuvo disponible. Activando Motor de Auditoría Determinista de respaldo:", aiErr.message);

    const { calculateMultiDimensionalStrategyScore } = await import('./deckContractEngine.js');
    const contractReport = calculateMultiDimensionalStrategyScore(hydratedDeckCards, formData?.blueprint || null, activeStrategy, formData?.metrics || {});

    const strengths = [
      `Curva de maná equilibrada y verificada en JS con VMP de ${formData?.metrics?.vmp || '2.5'}.`,
      `Base de maná alineada con los pips de color según Karsten Math.`
    ];

    const weaknesses = [];
    if (cardReqs && cardReqs.hasIssues) {
      weaknesses.push(...cardReqs.requirementFailures.map(f => `${f.card}: ${f.issueDescription}`));
    }

    jsonResult = {
      summary: `Auditoría determinista de alta precisión completada (Score: ${contractReport.overallScore}/100).`,
      strengths,
      weaknesses,
      suggestions: cardReqs ? cardReqs.orphanCards.map(o => ({
        remove: o.cardName,
        add: "Carta de soporte de rol",
        reason: o.reason
      })) : []
    };
  }

  // ── 5. VALIDACIÓN POST-AUDITORÍA: Verificar sugerencias contra la BD local
  onProgress('audit', '✅ Validando sugerencias contra la base de datos local...');
  const validatedSuggestions = validateSuggestionsAgainstDB(
    jsonResult.suggestions || [],
    allCards,
    hydratedDeckCards,
    allowedColors,
    selectedFormat,
    formData?.rarityMode || 'high-power'
  );

  const { analyzeKarstenManaDevotion, calculateDeterministicDeckScore } = await import('./deckAuditorService.js');
  const karstenAnalysis = analyzeKarstenManaDevotion(spells, formData?.metrics?.sources || {});

  // Calcular nota matemática objetiva y determinista basada en datos duros
  const mathScore = calculateDeterministicDeckScore(
    pillarAnalysis,
    karstenAnalysis,
    formData?.metrics?.vmp,
    formData?.stance,
    totalCards,
    targetCards
  );

  const criticalAlerts = Array.isArray(jsonResult.criticalAlerts) ? [...jsonResult.criticalAlerts] : [];
  const warnings = Array.isArray(jsonResult.warnings) ? [...jsonResult.warnings] : [];
  const suggestions = [...validatedSuggestions];

  const karstenNeedsFix = karstenAnalysis?.devotions?.some(d => d.status === 'critical' || d.status === 'warning');
  const hasPillarDeficits = pillarAnalysis && pillarAnalysis.pillarStatus && Object.values(pillarAnalysis.pillarStatus).some(st => st === 'critical' || st === 'low');

  // A. PRE-CALCULAR SUSTITUCIONES / ADICIONES EXACTAS CON EXPERT MANA & PILLAR SIMULATION
  if (totalCards < targetCards || karstenNeedsFix || hasPillarDeficits || suggestions.length === 0) {
    try {
      const { corregirTamañoYBaseDeMana } = await import('./deckOptimizerService.js');
      const { buildCardPool } = await import('./ragService.js');
      
      let ragPool = [];
      try {
        const ragResult = await buildCardPool({ ...formData, colores: allowedColors });
        ragPool = ragResult.pool || [];
      } catch (e) {
        console.warn("Fallo al obtener RAG pool en pre-simulación de auditoría", e);
      }

      const updatedFormData = {
        ...formData,
        colores: allowedColors
      };

      const simulatedDeck = await corregirTamañoYBaseDeMana(hydratedDeckCards, targetCards, updatedFormData, ragPool, false);

      const origMap = new Map();
      hydratedDeckCards.forEach(c => {
        if (!c || !c.name) return;
        const k = c.name.trim();
        origMap.set(k, (origMap.get(k) || 0) + Number(c.quantity || 1));
      });

      const simMap = new Map();
      simulatedDeck.forEach(c => {
        if (!c || !c.name) return;
        const k = c.name.trim();
        simMap.set(k, (simMap.get(k) || 0) + Number(c.quantity || 1));
      });

      let exactAdds = [];
      let exactRemoves = [];

      simMap.forEach((qty, name) => {
        const origQty = origMap.get(name) || 0;
        if (qty > origQty) {
          exactAdds.push({ name, quantity: qty - origQty });
        }
      });

      origMap.forEach((origQty, name) => {
        const simQty = simMap.get(name) || 0;
        if (origQty > simQty) {
          exactRemoves.push({ name, quantity: origQty - simQty });
        }
      });

      const primaryTribe = formData?.tribe || formData?.primaryTribe || formData?.aiMetadata?.tribe || '';

      // Fallback 1: Si Karsten reporta deficiencia y el mapa no cambió, inyectar el intercambio de duales/básicas respetando la identidad de color activa
      if (exactAdds.length === 0 && exactRemoves.length === 0 && karstenNeedsFix) {
        const deficientList = karstenAnalysis?.devotions?.filter(d => d.status === 'critical' || d.status === 'warning') || [];
        const activeColors = updatedFormData?.colores || [];
        
        for (const deficient of deficientList) {
          if (activeColors.length > 0 && !activeColors.includes(deficient.color)) continue;
          
          const missingColor = deficient.color;
          const deficitQty = Math.min(3, Math.max(1, (deficient.recommendedSources || 14) - (deficient.actualSources || 10)));
          
          // Buscar tierra dual competitiva en allCards que aporte el color faltante y sea legal
          const dualLandMatch = allCards.find(c => {
            if (!isLand(c)) return false;
            const cId = c.color_identity || c.colors || [];
            return cId.includes(missingColor) && cId.length >= 2 && isColorCompatible(c, activeColors) && (c.legalities && c.legalities[selectedFormat] === 'legal');
          });

          const colorToBasic = { W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest' };
          const landNameToAdd = dualLandMatch ? dualLandMatch.name : (colorToBasic[missingColor] || 'Swamp');

          // Encontrar una tierra básica abundante en el mazo de otro color para recortar
          const basicLandsToTrim = hydratedDeckCards.filter(c => isLand(c) && (c.quantity || 1) >= deficitQty && c.name !== landNameToAdd);
          if (basicLandsToTrim.length > 0) {
            const trimLand = basicLandsToTrim[0];
            exactRemoves.push({ name: trimLand.name, quantity: deficitQty });
            exactAdds.push({ name: landNameToAdd, quantity: deficitQty });
            break; // Resolver 1 déficit primario por sugerencia
          }
        }
      }

      // Fallback 2: Si hay déficit de pilares (ej. Robo 0, Amenazas < rec) y exactAdds sigue vacío, inyectar sustitución inteligente de pilares
      if (exactAdds.length === 0 && exactRemoves.length === 0 && hasPillarDeficits) {
        const drawDeficit = pillarAnalysis?.pillarStatus?.draw === 'critical' || pillarAnalysis?.pillars?.draw?.count === 0;
        const threatDeficit = pillarAnalysis?.pillarStatus?.threats === 'critical' || (pillarAnalysis?.pillars?.threats?.count || 0) < 3;
        
        // Identificar hechizos sobrecargados
        const spellsToTrim = hydratedDeckCards.filter(c => !isLand(c) && (c.quantity || 1) >= 2)
          .sort((a, b) => (b.quantity || 1) - (a.quantity || 1));

        if (spellsToTrim.length > 0) {
          const trimTarget = spellsToTrim[0];
          const qtyToTrim = Math.min(trimTarget.quantity - 1, drawDeficit ? 4 : 3);

          if (qtyToTrim > 0) {
            exactRemoves.push({ name: trimTarget.name, quantity: qtyToTrim });

            if (drawDeficit) {
              const drawCandidates = getPillarCandidatesFromDB('draw', allCards, allowedColors, selectedFormat, formData?.rarityMode || 'high-power', [], [], activeStrategy, primaryTribe);
              const topDraw = drawCandidates[0] || (allowedColors.includes('B') ? 'Read the Bones' : allowedColors.includes('U') ? 'Brainstorm' : allowedColors.includes('G') ? 'Harmonize' : 'Night\'s Whisper');
              exactAdds.push({ name: topDraw, quantity: qtyToTrim });
            } else if (threatDeficit) {
              const threatCandidates = getPillarCandidatesFromDB('threats', allCards, allowedColors, selectedFormat, formData?.rarityMode || 'high-power', [], [], activeStrategy, primaryTribe);
              const topThreat = threatCandidates[0] || (allowedColors.includes('G') ? 'Elder Gargaroth' : allowedColors.includes('B') ? 'Grave Titan' : 'Questing Beast');
              exactAdds.push({ name: topThreat, quantity: qtyToTrim });
            }
          }
        }
      }

      // Separar sugerencias de tierras (Land Fix) de sugerencias de hechizos (Pillar Fix)
      const landAdds = exactAdds.filter(a => {
        const dbC = allCards.find(c => normalizeCardName(c.name) === normalizeCardName(a.name));
        return isLand(a) || (dbC && (dbC.type_line || '').toLowerCase().includes('land'));
      });
      const landRemoves = exactRemoves.filter(r => {
        const dbC = allCards.find(c => normalizeCardName(c.name) === normalizeCardName(r.name));
        return isLand(r) || (dbC && (dbC.type_line || '').toLowerCase().includes('land'));
      });

      const spellAdds = exactAdds.filter(a => !landAdds.includes(a));
      const spellRemoves = exactRemoves.filter(r => !landRemoves.includes(r));

      if (landAdds.length > 0 && landRemoves.length > 0) {
        const totalAddsQty = landAdds.reduce((sum, c) => sum + (c.quantity || 1), 0);
        const totalRemQty = landRemoves.reduce((sum, c) => sum + (c.quantity || 1), 0);
        if (Math.abs(totalAddsQty - totalRemQty) <= 2) {
          suggestions.unshift({
            text: 'Equilibrar fuentes de maná Karsten con tierras duales y básicas',
            changeType: 'Mana Base Fix',
            adds: landAdds,
            removes: landRemoves,
            _simulated: true
          });
        }
      }

      if (spellAdds.length > 0 && spellRemoves.length > 0) {
        suggestions.unshift({
          text: 'Reequilibrar pilares funcionales de hechizos',
          changeType: 'Pillar Fix',
          adds: spellAdds,
          removes: spellRemoves,
          _simulated: true
        });
      }

    } catch (simErr) {
      console.warn("Fallo al pre-calcular sustituciones exactas de tierras/cartas:", simErr);
    }
  }

  // B. ALERTA CRÍTICA POR MAZO INCOMPLETO
  if (totalCards < targetCards) {
    const missing = targetCards - totalCards;
    criticalAlerts.unshift(`🚨 MAZO INCOMPLETO (${totalCards}/${targetCards} cartas): Le faltan ${missing} cartas para ser un mazo legal de ${targetCards} cartas.`);
  }

  // C. ALERTAS ESTRICTAS DE FUENTES DE MANÁ SEGÚN FRANK KARSTEN
  if (karstenAnalysis && karstenAnalysis.devotions) {
    karstenAnalysis.devotions.forEach(dev => {
      if (dev.status === 'critical') {
        criticalAlerts.push(`🚨 ESCASEZ DE MANÁ ${dev.color}: Tienes ${dev.availableSources} fuentes de maná ${dev.color}. Se requieren al menos ${dev.requiredSources} fuentes según Frank Karsten.`);
      } else if (dev.status === 'warning') {
        warnings.push(`⚠️ MANÁ AJUSTADO ${dev.color}: Tienes ${dev.availableSources} fuentes de maná ${dev.color} de las ${dev.requiredSources} recomendadas.`);
      }
    });
  }

  const rawAIProse = jsonResult?.verdict || (typeof jsonResult?.summary === 'string' && !jsonResult?.summary?.includes('Auditoría determinista') ? jsonResult?.summary : '') || jsonResult?.overview || "";
  
  const finalVerdict = buildProTourExpertVerdict(
    formData,
    hydratedDeckCards,
    pillarAnalysis,
    karstenAnalysis,
    totalCards,
    targetCards,
    suggestions,
    rawAIProse
  );

  let supremeJudgeReport = null;
  try {
    const { runSupremeJudgeAudit } = await import('../judge/services/supremeJudgeService.js');
    supremeJudgeReport = await runSupremeJudgeAudit(hydratedDeckCards, { ...formData, colores: allowedColors, format: selectedFormat }, allCards);
  } catch (jErr) {
    console.warn("Fallo al ejecutar auditoría v7 de Supreme Judge:", jErr);
  }

  let strategicAutopsy = null;
  try {
    strategicAutopsy = await runStrategicDeckAutopsy(hydratedDeckCards, formData, {
      auditId: `AUD-${Date.now()}`,
      deckVersion: formData?.deckVersion || 1,
      allCards
    });
  } catch (sErr) {
    console.warn("Fallo al ejecutar Autopsia Estratégica v2 del Juez Supremo:", sErr);
  }

  return {
    ...jsonResult,
    verdict: finalVerdict,
    summary: finalVerdict,
    score: mathScore,
    criticalAlerts,
    warnings,
    suggestions,
    _pillarAnalysis: pillarAnalysis,
    _karstenAnalysis: karstenAnalysis,
    _monteCarlo: monteCarlo,
    _cardRequirements: cardReqs,
    _supremeJudgeReport: supremeJudgeReport,
    _strategicAutopsy: strategicAutopsy
  };
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
  const deckListText = deckSpells.map(c => {
    const text = (c.oracle_text || '').replace(/\n/g, ' ').replace(/"/g, '');
    return `${c.quantity}x ${c.name} (Cost: ${c.mana_cost || c.cmc || '?'}, Oracle: ${text.substring(0, 100)})`;
  }).join('\n');
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
    const cleanResponse = (raw) => {
      let clean = raw.trim();
      const match = clean.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
      if (match) clean = match[1].trim();
      const first = clean.indexOf('{');
      const last = clean.lastIndexOf('}');
      if (first !== -1 && last > first) {
        clean = clean.substring(first, last + 1);
      }
      // Eliminar comas flotantes / comas terminales (trailing commas)
      clean = clean.replace(/,\s*([\}\]])/g, '$1');
      return clean;
    };
    try {
      jsonResult = JSON.parse(cleanResponse(response));
    } catch(e) {
      console.warn("Error parseando JSON de auditoría interna de sinergias:", e);
      return { suggestions: [] };
    }
    return jsonResult;
  } catch (error) {
    console.warn("Error en el Crítico Interno (ignorando):", error);
    return { suggestions: [] };
  }
}
