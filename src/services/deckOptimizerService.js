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
  if (isLand(c)) return true;
  if (c.category?.toLowerCase() === 'land') return true;
  
  const nameLower = (c.name || "").toLowerCase().trim();
  
  // Tierras básicas
  if (isBasicLand(nameLower)) return true;
  
  // Patrones de tierras no bÃ¡sicas comunes (ej: shocklands, fetchlands, triomas, slow/fastlands)
  const landPatterns = [
    "grave", "vents", "tomb", "garden", "fountain", "crypt", "ground", "foundry", "shrine", "pool",
    "strand", "delta", "mire", "foothills", "heath", "flats", "tarn", "catacombs", "mesa", "rainforest",
    "shores", "canal", "marsh", "thicket", "coast", "cliffs", "gorge", "vantage", "courtyard", "sanctum",
    "tower", "power plant", "mine", "temple", "wastes", "nexus", "fair", "canopy", "canyon", "islet", "clearing", "peatland", "grove",
    "castle", "hall", "hive", "den", "cave", "vale", "crag", "harbor", "sanctuary", "beach", "ridge", "farmland",
    "verge", "glade", "bayou", "savannah", "tundra", "badlands", "taiga", "scrubland", "plateau", "tropical", "sea",
    "passage", "wilds", "orchard", "confluence", "city", "quarry", "waste", "steppes", "depths", "stage", "karst",
    "veta", "canal", "tumba", "jardÃ­n", "fuente", "cripta", "terreno", "fundiciÃ³n", "santuario", "estanque",
    "playa", "cueva", "colina", "bosque", "ruinas", "pÃ¡ramo", "ciÃ©naga", "brezal", "catacumbas", "estepa",
    "pasaje", "huerto", "acantilado", "valle", "fortaleza", "guarida", "picos", "rÃ­o", "lago", "mar", "isla",
    "bosquecillo", "pradera", "matorral", "cumbres"
  ];
  
  if (landPatterns.some(pat => nameLower.includes(pat))) {
    return true;
  }
  
  const typeLine = (c.type_line || "").toLowerCase();
  if (typeLine.includes("land") || typeLine.includes("tierra")) return true;
  
  return false;
};

/**
 * Corrige el Tamaño de la baraja principal y regenera/rebalancea la base de tierras
 * para asegurar que sume exactamente targetDeckSize (60 u 80).
 */
async function corregirTamañoYBaseDeMana(cards, targetDeckSize, formData, ragPool, preserveLands = false) {
  // Asegurar normalizaciÃ³n de cantidades antes de procesar
  const normalizedCards = cards.map(c => ({
    ...c,
    quantity: Number(c.quantity || c.count || 1)
  }));

  // 1. Separar hechizos y tierras
  const spells = normalizedCards.filter(c => !isLandCard(c));
  const lands = normalizedCards.filter(c => isLandCard(c));

  // 2. Calcular objetivos matemÃ¡ticos perfectos
  const targetLandCount = preserveLands 
    ? lands.reduce((sum, c) => sum + c.quantity, 0)
    : calculatePerfectLandCount(spells, formData, targetDeckSize === 80);
  const targetSpellCount = targetDeckSize - targetLandCount;

  // 3. Ajustar cantidad de Hechizos a targetSpellCount
  let currentSpellCount = spells.reduce((sum, c) => sum + c.quantity, 0);
  let needed = targetSpellCount - currentSpellCount;

  if (needed > 0) {
    // Faltan hechizos: rellenar
    // A. Subir cantidades de hechizos existentes hasta su cap
    for (let spell of spells) {
      if (needed <= 0) break;
      const maxLimit = getMaxAllowedCopies(spell.name, spell.category, spell.cmc, ragPool);
      if (spell.quantity < maxLimit) {
        const add = Math.min(maxLimit - spell.quantity, needed);
        spell.quantity += add;
        needed -= add;
      }
    }

    // B. Inyectar hechizos sinÃ©rgicos nuevos del RAG pool
    const colorsSet = new Set(formData?.colores || []);
    const ragSpells = (ragPool || []).filter(c => {
      const type = (c.type_line || c.category || '').toLowerCase();
      if (type.includes('land')) return false;
      const cardColors = c.colors || [];
      const matchesColor = cardColors.length === 0 || cardColors.some(col => colorsSet.has(col));
      const alreadyInDeck = spells.some(s => cleanCardNameForMatching(s.name) === cleanCardNameForMatching(c.name));
      return matchesColor && !alreadyInDeck;
    });

    for (let rs of ragSpells) {
      if (needed <= 0) break;
      const maxLimit = getMaxAllowedCopies(rs.name, rs.category || 'Creature', rs.mana_value || rs.cmc || 2, ragPool);
      const qty = Math.min(needed, maxLimit);
      if (qty > 0) {
        spells.push({
          name: rs.name,
          quantity: qty,
          category: rs.category || (rs.type_line?.toLowerCase().includes('creature') ? 'Creature' : 'Instant'),
          cmc: rs.mana_value || rs.cmc || 2,
          role: rs.role || 'utility',
          mana_cost: rs.mana_cost || '',
          type_line: rs.type_line || ''
        });
        needed -= qty;
      }
    }

    // C. Si aÃºn faltan (RAG pool vacÃ­o o identidades incompatibles), inyectar staples genÃ©ricos
    if (needed > 0) {
      const standardStaples = [
        { name: "Lightning Bolt", color: "R", category: "Instant", cmc: 1 },
        { name: "Counterspell", color: "U", category: "Instant", cmc: 2 },
        { name: "Fatal Push", color: "B", category: "Instant", cmc: 1 },
        { name: "Swords to Plowshares", color: "W", category: "Instant", cmc: 1 },
        { name: "Llanowar Elves", color: "G", category: "Creature", cmc: 1 }
      ];
      for (let staple of standardStaples) {
        if (needed <= 0) break;
        if (colorsSet.has(staple.color)) {
          const qty = Math.min(needed, 4);
          spells.push({
            name: staple.name,
            quantity: qty,
            category: staple.category,
            cmc: staple.cmc,
            role: 'interaction',
            mana_cost: '',
            type_line: staple.category
          });
          needed -= qty;
        }
      }
    }

    // D. Caso de emergencia absoluto: rellenar copias distribuidas en vez de inyectar a una sola carta
    if (needed > 0 && spells.length > 0) {
      let progress = true;
      while (needed > 0 && progress) {
        progress = false;
        for (let spell of spells) {
          if (needed <= 0) break;
          const isLegendary = (spell.type_line || '').toLowerCase().includes('legendary') || spell.role?.includes('legend');
          const maxLimit = isLegendary ? 1 : 4;
          if (spell.quantity < maxLimit) {
            spell.quantity += 1;
            needed -= 1;
            progress = true;
          }
        }
      }

      // Si aÃºn falta (caso extremo de mazo con poquÃ­simos hechizos Ãºnicos), forzar en los de menor coste
      if (needed > 0) {
        spells.sort((a, b) => (a.cmc || 2) - (b.cmc || 2));
        let idx = 0;
        while (needed > 0) {
          spells[idx % spells.length].quantity += 1;
          needed -= 1;
          idx++;
        }
      }
    }
  } else if (needed < 0) {
    // Sobran hechizos: recortar de forma quirÃºrgica
    let excess = -needed;
    const isProtected = (s) => {
      const roleLower = (s.role || '').toLowerCase();
      return roleLower.includes('must-include') || 
             roleLower.includes('combo_piece') || 
             roleLower.includes('combo_enabler') || 
             roleLower.includes('finisher') ||
             roleLower.includes('win_cond') ||
             roleLower.includes('boss');
    };
    
    // FunciÃ³n auxiliar para obtener score RAG y priorizar conservaciÃ³n
    const getRagScore = (cardName) => {
      const nameLower = cardName.toLowerCase().trim();
      const match = (ragPool || []).find(c => c.name.toLowerCase().trim() === nameLower);
      return match ? (match.score || 0) : -100;
    };

    // Paso 1: Prunar copias redundantes de hechizos no protegidos (manteniendo mÃ­nimo 1 copia para preservar su existencia)
    const candidates = spells.filter(s => !isProtected(s));
    candidates.sort((a, b) => {
      const scoreA = getRagScore(a.name);
      const scoreB = getRagScore(b.name);
      if (scoreA !== scoreB) {
        return scoreA - scoreB; // Menor score RAG (menos sinergia) se pruna primero
      }
      return b.cmc - a.cmc; // A igual score, prunar de mayor coste primero
    });

    for (let s of candidates) {
      if (excess <= 0) break;
      if (s.quantity > 1) {
        const canRemove = s.quantity - 1;
        const remove = Math.min(canRemove, excess);
        s.quantity -= remove;
        excess -= remove;
      }
    }

    // Paso 2: Si aÃºn sobra, permitir borrar cartas completas no protegidas (las de menor sinergia primero)
    if (excess > 0) {
      for (let s of candidates) {
        if (excess <= 0) break;
        if (s.quantity > 0) {
          const remove = Math.min(s.quantity, excess);
          s.quantity -= remove;
          excess -= remove;
        }
      }
    }

    // Paso 3: Si aÃºn sobra (caso extremo), prunar copias de cartas protegidas
    if (excess > 0) {
      const protectedSpells = spells.filter(s => isProtected(s));
      protectedSpells.sort((a, b) => b.cmc - a.cmc);
      for (let s of protectedSpells) {
        if (excess <= 0) break;
        if (s.quantity > 0) {
          const remove = Math.min(s.quantity, excess);
          s.quantity -= remove;
          excess -= remove;
        }
      }
    }
  }

  // 4. Regenerar la base de tierras matemÃ¡ticamente segÃºn Karsten
  let finalLands = [];
  if (preserveLands) {
    finalLands = lands;
  } else {
    try {
      const colorsArray = Array.from(new Set(formData?.colores || []));
      const pips = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
      spells.forEach(s => {
        const cost = (s.mana_cost || '').toUpperCase();
        if (cost.includes('W')) pips.W += s.quantity || 1;
        if (cost.includes('U')) pips.U += s.quantity || 1;
        if (cost.includes('B')) pips.B += s.quantity || 1;
        if (cost.includes('R')) pips.R += s.quantity || 1;
        if (cost.includes('G')) pips.G += s.quantity || 1;
      });

      finalLands = await generateManaBase(pips, targetLandCount, colorsArray, formData, spells, []);
    } catch (err) {
    console.error("Fallo al regenerar base de tierras en optimizador:", err);
    // Fallback: simple ajuste proporcional de tierras existentes
    let currentLandCount = lands.reduce((sum, c) => sum + (c.quantity || 1), 0);
    let neededLands = targetLandCount - currentLandCount;
    if (neededLands > 0) {
      if (lands.length > 0) {
        lands[0].quantity += neededLands;
      } else {
        const colorsArray = Array.from(new Set(formData?.colores || []));
        const needsSnow = deckNeedsSnowLands(spells);
        const formatKey = (formData?.format || 'MODERN').toLowerCase();
        
        const allCards = await getAllCards();
        const canUseSnow = needsSnow && allCards.some(ac => ac && ac.name === "Snow-Covered Island" && ac.legalities && ac.legalities[formatKey] === 'legal');

        let landName = "Wastes";
        if (colorsArray.includes("W")) landName = canUseSnow ? "Snow-Covered Plains" : "Plains";
        else if (colorsArray.includes("U")) landName = canUseSnow ? "Snow-Covered Island" : "Island";
        else if (colorsArray.includes("B")) landName = canUseSnow ? "Snow-Covered Swamp" : "Swamp";
        else if (colorsArray.includes("R")) landName = canUseSnow ? "Snow-Covered Mountain" : "Mountain";
        else if (colorsArray.includes("G")) landName = canUseSnow ? "Snow-Covered Forest" : "Forest";
        
        lands.push({
          name: landName,
          quantity: neededLands,
          category: "Land",
          type_line: canUseSnow && landName !== "Wastes" ? `Basic Snow Land — ${landName.replace('Snow-Covered ', '')}` : `Basic Land — ${landName}`,
          cmc: 0
        });
      }
    } else if (neededLands < 0) {
      let excessLands = -neededLands;
      for (let l of lands) {
        if (excessLands <= 0) break;
        if (l.quantity > 1) {
          const remove = Math.min(l.quantity - 1, excessLands);
          l.quantity -= remove;
          excessLands -= remove;
        }
      }
      if (excessLands > 0 && lands.length > 0) {
        lands[0].quantity = Math.max(1, lands[0].quantity - excessLands);
      }
      finalLands = lands;
    }
  }
}

  // Filtrar cartas de cantidad vacÃ­a
  const cleanSpells = spells.filter(s => s.quantity > 0);
  const cleanLands = finalLands.filter(l => l.quantity > 0);
  
  return [...cleanSpells, ...cleanLands];
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
      if (sug && sug._invalid) return; // Guard clause to ignore invalid suggestions
      
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
          // Saltar adds de cartas que no existen en la BD local
          const normalizedAddName = cleanCardNameForMatching(add.name);
          const dbCard = allCards.find(c => cleanCardNameForMatching(c.name) === normalizedAddName);
          if (!dbCard) {
            console.warn(`[ApplyAudit] Ignorando add de carta no encontrada en BD: "${add.name}"`);
            return;
          }

          const existingIndex = newDeck.findIndex(c => cleanCardNameForMatching(c.name) === normalizedAddName);
          if (existingIndex !== -1) {
            newDeck[existingIndex] = { ...newDeck[existingIndex], quantity: newDeck[existingIndex].quantity + add.quantity };
          } else {
            newDeck.push({
              name: dbCard.name,
              quantity: add.quantity,
              category: dbCard.type_line?.toLowerCase().includes('creature') ? 'Creature' : 'Spell',
              cmc: dbCard.mana_value || 0,
              type_line: dbCard.type_line,
              mana_cost: dbCard.mana_cost || '',
              oracle_text: dbCard.oracle_text || '',
              colors: dbCard.colors || [],
              color_identity: dbCard.color_identity || [],
            });
          }
        });
      }
    });
  }

  const isYorion = newDeck.some(c => c.name.toLowerCase().includes("yorion, sky nomad"));
  const targetDeckSize = isYorion ? 80 : 60;
  
  let currentTotal = newDeck.reduce((sum, c) => sum + c.quantity, 0);

  const karstenNeedsFix = auditReport?._karstenAnalysis?.devotions?.some(d => d.status === 'critical' || d.status === 'warning');

  // PARACAÍDAS INTELIGENTE:
  // Se activa si el mazo no suma targetDeckSize (ej. el usuario eliminó tierras) o si Karsten detectó escasez de fuentes de maná
  if (currentTotal !== targetDeckSize || karstenNeedsFix || (suggestions && suggestions.length > 0)) {
    let ragPool = [];
    try {
      const ragResult = await buildCardPool(formData);
      ragPool = ragResult.pool || [];
    } catch (e) {
      console.warn("Fallo al obtener RAG pool en optimizador programático", e);
    }
    
    newDeck = await corregirTamañoYBaseDeMana(newDeck, targetDeckSize, formData, ragPool, false);
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


