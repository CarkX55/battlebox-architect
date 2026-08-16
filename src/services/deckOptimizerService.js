import { IntentBuilder } from './compiler/core/intentBuilder.js';
import { DeckState } from './agent/deckState.js';
import { TacticalSimulator } from './agent/tacticalSimulator.js';
import { aplicarJuezFinal, getMaxAllowedCopies, cleanAndParseJSON } from './deckArchitectService.js';
import { buildCardPool } from './ragService.js';
import { BATTLEBOX_VETOS } from '../constants/legacyBattleBox.js';
import { hydrateDeckCards } from './cardHydrator.js';
import { isLand, calculatePerfectLandCount, generateManaBase, isBasicLand, deckNeedsSnowLands, isLandFormatLegal } from './deckCalculator.js';
import { callAI, DECK_SCHEMA } from './aiFactory.js';
import { getAllCards } from './dbIngestor.js';
import { evaluateConsistencyRadar, analyzeFunctionalPillars, buildPillarSummaryText } from './deckAuditorService.js';
import { scoreCardForDeckDNA } from './cardScoringEngine.js';



const cleanCardNameForMatching = (name) => {
  if (!name) return "";
  let n = name.toLowerCase().trim();
  if (n.includes('//')) {
    n = n.split('//')[0].trim();
  }
  if (n.includes('/')) {
    n = n.split('/')[0].trim();
  }
  return n;
};

/**
 * Helper robusto para identificar si una carta es una tierra.
 * Soporta detecciÃ³n por tipo e inspecciÃ³n de patrones de nombres comunes.
 */
const isLandCard = (c) => {
  if (!c) return false;
  if (isLand(c)) return true;
  if (c.category?.toLowerCase() === 'land') return true;
  
  const typeLine = (c.type_line || c.typeLine || "").toLowerCase();
  if (typeLine.includes("land") || typeLine.includes("tierra")) return true;

  const nameLower = (c.name || "").toLowerCase().trim();
  if (isBasicLand(nameLower)) return true;
  
  const KNOWN_LAND_NAMES = new Set([
    "watery grave", "blood crypt", "overgrown tomb", "temple garden", "godless shrine",
    "sacred foundry", "stomping ground", "steam vents", "hallowed fountain", "breeding pool",
    "darkslick shores", "seachrome coast", "blackcleave cliffs", "copperline gorge", "razorverge thicket",
    "concealed courtyard", "spirebluff canal", "blooming marsh", "inspiring vantage", "botanical sanctum",
    "shipwreck marsh", "undercity sewers", "shadowy backstreet", "thundering falls", "gloomy backstage",
    "underground sea", "volcanic island", "tropical island", "tundra", "savannah",
    "scrubland", "badlands", "taiga", "bayou", "plateau",
    "polluted delta", "flooded strand", "bloodstained mire", "wooded foothills", "windswept heath",
    "marsh flats", "scalding tarn", "verdant catacombs", "arid mesa", "misty rainforest"
  ]);
  
  return KNOWN_LAND_NAMES.has(nameLower);
};

/**
 * Corrige el Tamaño de la baraja principal y regenera/rebalancea la base de tierras
 * para asegurar que sume exactamente targetDeckSize (60 u 80).
 */
export async function corregirTamañoYBaseDeMana(cards, targetDeckSize = 60, formData = {}, ragPool = [], preserveLands = false) {
  const intentPackage = IntentBuilder.buildFromUI(formData);
  const deckState = new DeckState(intentPackage);

  const spells = (cards || []).filter(c => c && !isLandCard(c));
  for (const s of spells) {
    if (s && (s.quantity || 1) > 0) {
      deckState.addCard(s, s.quantity || 1, 'Spell', s.role || 'FLEX');
    }
  }

  if (!preserveLands) {
    deckState.autoResolveManaBase();
  } else {
    const lands = (cards || []).filter(c => c && isLandCard(c));
    for (const l of lands) {
      if (l && (l.quantity || 1) > 0) {
        deckState.addCard(l, l.quantity || 1, 'Land', 'MANA_BASE');
      }
    }
  }

  return deckState.exportDeckList();
}

/**
 * Ejecuta optimizaciÃ³n inteligente basada en IA.
 */
async function optimizarConIA(deckList, formData, aiConfig, ragPool, auditReport = null) {
  const isYorion = deckList.some(c => c.name.toLowerCase().includes("yorion, sky nomad")) || (formData?.companero && formData.companero.toLowerCase().includes("yorion"));
  const targetDeckSize = isYorion ? 80 : 60;
  
  const spells = deckList.filter(c => !isLandCard(c));
  const targetLandCount = calculatePerfectLandCount(spells, formData, isYorion);
  const targetSpellCount = targetDeckSize - targetLandCount;

  const currentDeckText = deckList.map(c => `- ${c.quantity}x ${c.name} (${c.category || 'Spell'}, CMC ${c.cmc || 0}, Rol: ${c.role || 'n/a'})`).join('\n');
  const ragPoolText = (ragPool || []).slice(0, 80).map(c => `- ${c.name} (CMC: ${c.mana_value || c.cmc || 0}, Sinergia: ${c.score || 0}, Meta: ${c.metaPercent || 0}%)`).join('\n');

  // Calcular pilares funcionales para que el optimizador sepa qué necesita reforzar
  const spellsForPillars = deckList.filter(c => !isLandCard(c));
  const pillarAnalysis = analyzeFunctionalPillars(spellsForPillars, formData?.format || 'MODERN', formData);
  const pillarText = buildPillarSummaryText(pillarAnalysis);

  const systemPrompt = `Eres el OPTIMIZADOR SUPREMO DE MAZOS DE MAGIC: THE GATHERING (Pro Tour Coach).
Tu misiÃ³n es coger el mazo actual del usuario y optimizarlo de forma quirÃºrgica (mÃ­nimas modificaciones necesarias) para hacerlo lo mÃ¡s competitivo, sinÃ©rgico y equilibrado posible.

REGLAS DE OPTIMIZACIÃ“N QUIRÃšRGICA:
1. PRESERVA las selecciones manuales del usuario. MantÃ©n todos los hechizos que el usuario ya tiene en su lista, a menos que sean ilegales por banlist, tengan colores fuera de la identidad de color del mazo, o sean anti-sinergias severas.
2. Modifica ÃšNICAMENTE lo que haga falta:
   - Corrige cantidades para cumplir con los lÃ­mites competitivos (max 4 copias, leyendas baratas 3-4, leyendas de coste >=5 max 2 copias, etc.).
   - Si faltan hechizos para llegar a ${targetSpellCount}, inyecta las mejores opciones del RAG pool.
   - Si sobran hechizos, pruna o reduce la cantidad de las cartas menos sinÃ©rgicas o mÃ¡s pesadas, priorizando mantener al menos 1 copia de las cartas del usuario.
   - Si una carta es ilegal por banlist o de color incompatible, reemplÃ¡zala por una carta legal similar o staple del RAG pool.
3. El mazo principal ("cards") debe contener EXACTAMENTE ${targetDeckSize} cartas en total (EXACTAMENTE ${targetSpellCount} Hechizos y EXACTAMENTE ${targetLandCount} Tierras).
4. Devuelve la respuesta en formato JSON puro que cumpla con el esquema.
`;

  let auditContext = '';
  if (auditReport) {
    const alerts = auditReport.criticalAlerts || [];
    const warnings = auditReport.warnings || [];
    const suggestions = auditReport.suggestions || [];
    const allFixes = [...alerts, ...warnings, ...suggestions];

    auditContext = `
=== AUDITORÃA DEL JUEZ SUPREMO ===
Aplica ESTRICTAMENTE estas correcciones y advertencias para reparar el mazo:
Feedback del Juez a Implementar (Â¡Importante!):
${allFixes.map(w => `- ${w}`).join('\n')}
==================================
`;
  }

  const userPrompt = `
MAZO ACTUAL A OPTIMIZAR:
${currentDeckText}

CONFIGURACIÓN DE LA BARAJA:
- Arquetipo: ${formData?.archetype || 'Midrange'}
- Estrategia: ${formData?.strategy || 'Ninguna'}
- Tribu / Raza: ${formData?.tribe || 'Ninguna'}
- Colores permitidos: ${formData?.colores?.join(', ') || 'Cualquiera'}

${pillarText}

${auditContext}

RAG CARD POOL (Cartas de alta sinergia pre-seleccionadas, úsalas preferentemente para cubrir pilares deficientes):
${ragPoolText}

Optimiza la baraja principal y devuelve el resultado en JSON que cumpla con el esquema.
`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  const response = await callAI(messages, aiConfig, { forceJSON: true, schema: DECK_SCHEMA, maxTokens: 8000 });
  const parsed = cleanAndParseJSON(response);
  const rawCards = parsed?.cards || parsed?.mainDeck || [];
  
  // NormalizaciÃ³n robusta de la respuesta de la IA
  const normalizedCards = rawCards.map(c => ({
    name: c.name,
    quantity: Number(c.quantity || c.count || 1),
    category: c.category || c.type || '',
    cmc: Number(c.cmc || c.mana_value || 0),
    mana_cost: c.mana_cost || '',
    type_line: c.type_line || '',
    role: c.role || ''
  }));

  const rawSideboard = parsed?.sideboard || [];
  const normalizedSideboard = rawSideboard.map(c => ({
    name: c.name,
    quantity: Number(c.quantity || c.count || 1),
    category: c.category || c.type || '',
    cmc: Number(c.cmc || c.mana_value || 0)
  }));

  return {
    cards: normalizedCards,
    sideboard: normalizedSideboard,
    lore: parsed?.lore || null,
    deckName: parsed?.deckName || null,
    mulligan: parsed?.mulligan || null,
    strategy: parsed?.strategy || null,
    archetype: parsed?.archetype || null
  };
}

/**
 * Optimizador de Mazos.
 * Realiza una optimizaciÃ³n inteligente de la baraja, ya sea con IA (si estÃ¡ configurada)
 * o con heurÃ­sticas locales deterministas, garantizando el Tamaño exacto del mazo.
 */
export async function optimizarMazo(deckList, formData, aiConfig, preserveLands = true, auditReport = null) {
  // 1. Limpieza y normalizaciÃ³n de la lista de entrada (forzar quantity numÃ©rica)
  let nextDeck = [...deckList]
    .filter(c => !BATTLEBOX_VETOS.includes(c.name))
    .map(c => ({
      ...c,
      quantity: Number(c.quantity || c.count || 1)
    }));
  
  // 2. Obtener RAG pool para inyecciones
  let ragPool = [];
  try {
    const ragResult = await buildCardPool(formData);
    ragPool = ragResult.pool || [];
  } catch (e) {
    console.warn("Fallo al obtener RAG pool en optimizador", e);
  }

  const isYorion = nextDeck.some(c => c.name.toLowerCase().includes("yorion, sky nomad")) || (formData?.companero && formData.companero.toLowerCase().includes("yorion"));
  const targetDeckSize = isYorion ? 80 : 60;

  let optimizedCards = [];
  let usedAI = false;
  let aiLore = null;
  let aiSideboard = null;
  let aiDeckName = null;
  let aiMulligan = null;
  let aiStrategy = null;
  let aiArchetype = null;

  // Intentar optimizar con IA de forma inteligente si estÃ¡ configurada
  if (aiConfig && aiConfig.selectedModel && aiConfig.apiKey) {
    try {
      const parsedResult = await optimizarConIA(nextDeck, formData, aiConfig, ragPool, auditReport);
      optimizedCards = parsedResult.cards;
      aiLore = parsedResult.lore;
      aiSideboard = parsedResult.sideboard;
      aiDeckName = parsedResult.deckName;
      aiMulligan = parsedResult.mulligan;
      aiStrategy = parsedResult.strategy;
      aiArchetype = parsedResult.archetype;
      usedAI = true;
    } catch (e) {
      console.warn("Fallo al optimizar con IA, recurriendo a fallback local heurÃ­stico", e);
    }
  }

  // Fallback heurÃ­stico local si no se usa IA
  if (!usedAI) {
    try {
      const optimizedResult = await aplicarJuezFinal(
          { cards: nextDeck }, 
          null, 
          formData, 
          (msg) => console.log(msg), 
          ragPool,
          preserveLands,
          false
      );
      optimizedCards = optimizedResult.cards;
      aiSideboard = optimizedResult.sideboard;
      aiLore = "OptimizaciÃ³n determinista heurÃ­stica basada en los estÃ¡ndares Pro Tour.";
    } catch (e) {
      console.error("Fallo durante la optimizaciÃ³n con el Juez Supremo:", e);
      optimizedCards = nextDeck;
    }
  }

  // 3. Aplicar paracaÃ­das matemÃ¡tico para corregir cualquier anomalÃ­a de Tamaño
  if (preserveLands) {
    const originalLands = nextDeck.filter(c => isLandCard(c));
    const optimizedSpellsOnly = optimizedCards.filter(c => !isLandCard(c));
    optimizedCards = [...optimizedSpellsOnly, ...originalLands];
  }

  const finalDeck = await corregirTamañoYBaseDeMana(optimizedCards, targetDeckSize, formData, ragPool, preserveLands);

  // 4. Hidratar las cartas nuevas para garantizar que tengan todas las propiedades Scryfall
  const hydratedDeck = await hydrateDeckCards(finalDeck, 'fast', () => {});
  
  return {
    cards: hydratedDeck,
    lore: aiLore,
    sideboard: aiSideboard,
    deckName: aiDeckName,
    mulligan: aiMulligan,
    strategy: aiStrategy,
    archetype: aiArchetype
  };
}

export async function applyAuditChangesProgrammatically(deckList, suggestions = [], allCards = [], formData = {}, auditReport = null) {
  let newDeck = [...deckList];

  if (Array.isArray(suggestions)) {
    suggestions.forEach(sug => {
      if (!sug || sug._invalid) return; // Guard clause to ignore invalid suggestions
      
      if (sug.removes && Array.isArray(sug.removes)) {
        sug.removes.forEach(remove => {
          const index = newDeck.findIndex(c => cleanCardNameForMatching(c.name) === cleanCardNameForMatching(remove.name));
          if (index !== -1) {
            newDeck[index] = { ...newDeck[index], quantity: newDeck[index].quantity - remove.quantity };
            if (newDeck[index].quantity <= 0) {
              newDeck.splice(index, 1);
            }
          }
        });
      }

      if (sug.adds && Array.isArray(sug.adds)) {
        sug.adds.forEach(add => {
          const normalizedAddName = cleanCardNameForMatching(add.name);
          let dbCard = allCards.find(c => cleanCardNameForMatching(c.name) === normalizedAddName);
          if (!dbCard) {
            dbCard = { 
              name: add.name, 
              quantity: add.quantity, 
              type_line: 'Spell', 
              mana_value: 2, 
              cmc: 2 
            };
          }

          const existingIndex = newDeck.findIndex(c => cleanCardNameForMatching(c.name) === normalizedAddName);
          if (existingIndex !== -1) {
            newDeck[existingIndex] = { ...newDeck[existingIndex], quantity: newDeck[existingIndex].quantity + add.quantity };
          } else {
            newDeck.push({
              name: dbCard.name,
              quantity: add.quantity,
              category: dbCard.type_line?.toLowerCase().includes('creature') ? 'Creature' : dbCard.type_line?.toLowerCase().includes('land') ? 'Land' : 'Spell',
              cmc: dbCard.mana_value || dbCard.cmc || 0,
              type_line: dbCard.type_line || 'Spell',
              mana_cost: dbCard.mana_cost || '',
              oracle_text: dbCard.oracle_text || '',
              colors: dbCard.colors || [],
              color_identity: dbCard.color_identity || [],
              image_uris: dbCard.image_uris
            });
          }
        });
      }
    });
  }

  // Check if explicit land suggestions were applied
  const hasExplicitLandChanges = Array.isArray(suggestions) && suggestions.some(sug => {
    if (!sug || sug._invalid) return false;
    const hasLandAdd = (sug.adds || []).some(a => a.name && (isLandCard(a) || a.type_line?.toLowerCase().includes('land')));
    const hasLandRemove = (sug.removes || []).some(r => r.name && (isLandCard(r) || r.type_line?.toLowerCase().includes('land')));
    return hasLandAdd || hasLandRemove;
  });

  if (!hasExplicitLandChanges) {
    // Build IntentPackage and DeckState to enforce user constraints and Karsten land resolution
    const intentPackage = IntentBuilder.buildFromUI(formData);
    const deckState = new DeckState(intentPackage);

    const nonLandSpells = newDeck.filter(c => !isLandCard(c));
    for (const spell of nonLandSpells) {
      deckState.addCard(
        spell,
        spell.quantity || 1,
        'Supreme Judge Audit Suggestion Applied',
        spell.role || 'FLEX'
      );
    }

    // Auto-resolve Karsten land base matching current non-land spell suite
    deckState.autoResolveManaBase();
    newDeck = deckState.exportDeckList();
  }

  return newDeck;
}


/**
 * Ejecuta el Bucle de Optimización Iterativa del Juez (Máximo 3 pases).
 * 
 * Pase 1: Sustituye las 5-8 cartas peor puntuadas o redundantes.
 * Pase 2: Sustituye 2-3 cartas si la puntuación sigue por debajo del 85%.
 * Pase 3: 1 retoque fino final.
 */
export async function executeIterativeOptimizationLoop(deck = [], deckDNA = {}, candidatePool = []) {
  let currentDeck = [...deck];
  let iterations = 0;
  const maxIterations = 3;

  while (iterations < maxIterations) {
    const audit = evaluateConsistencyRadar(currentDeck, deckDNA);
    
    // Si la salud global supera el 85%, el Juez aprueba el mazo inmediatamente
    if (audit.overallHealth >= 85) {
      console.log(`[Juez Optimizer] Mazo APROBADO en pase ${iterations + 1} con Salud: ${audit.overallHealth}%`);
      return { finalDeck: currentDeck, audit, passesExecuted: iterations + 1 };
    }

    iterations++;
    console.log(`[Juez Optimizer] Ejecutando pase de optimización ${iterations}/${maxIterations} (Salud actual: ${audit.overallHealth}%)...`);

    // Determinar cantidad de cartas a sustituir en este pase
    const swapTargetCount = iterations === 1 ? 6 : iterations === 2 ? 3 : 1;

    // Identificar cartas no-tierra peor puntuadas que no pertenezcan al CorePackage locked
    const nonLandSpells = currentDeck.filter(c => !isLand(c) && !c.isCoreLocked);
    
    // Calcular puntación de cada carta del mazo actual
    const evaluatedSpells = nonLandSpells.map(card => ({
      ...card,
      currentScore: scoreCardForDeckDNA(card, deckDNA, currentDeck.filter(c => c.isCoreLocked))
    }));

    evaluatedSpells.sort((a, b) => a.currentScore - b.currentScore);
    const cardsToReplace = evaluatedSpells.slice(0, swapTargetCount);

    if (cardsToReplace.length === 0) break;

    // Buscar sustitutos en candidatePool con mayor puntuación
    cardsToReplace.forEach(badCard => {
      const bestCandidate = candidatePool.find(cand => 
        !currentDeck.some(dc => dc.name.toLowerCase() === cand.name.toLowerCase()) &&
        (cand.score || 0) > (badCard.currentScore || 0)
      );

      if (bestCandidate) {
        const index = currentDeck.findIndex(dc => dc.name.toLowerCase() === badCard.name.toLowerCase());
        if (index !== -1) {
          const originalQty = currentDeck[index].count || currentDeck[index].qty || 4;
          currentDeck[index] = {
            ...bestCandidate,
            count: originalQty,
            qty: originalQty,
            isOptimizedSwap: true
          };
        }
      }
    });
  }

  const finalAudit = evaluateConsistencyRadar(currentDeck, deckDNA);
  return { finalDeck: currentDeck, audit: finalAudit, passesExecuted: iterations };
}


