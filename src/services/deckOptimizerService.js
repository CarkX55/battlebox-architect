import { aplicarJuezFinal, getMaxAllowedCopies } from './deckArchitectService.js';
import { buildCardPool } from './ragService.js';
import { BATTLEBOX_BANLIST } from '../constants/legacyBattleBox.js';
import { hydrateDeckCards } from './cardHydrator.js';
import { isLand, calculatePerfectLandCount, generateManaBase } from './deckCalculator.js';
import { callAI, DECK_SCHEMA } from './aiFactory.js';

/**
 * Helper robusto para identificar si una carta es una tierra.
 * Soporta detección por tipo e inspección de patrones de nombres comunes.
 */
const isLandCard = (c) => {
  if (isLand(c)) return true;
  if (c.category?.toLowerCase() === 'land') return true;
  
  const nameLower = (c.name || "").toLowerCase().trim();
  
  // Tierras básicas en inglés y español
  const basicLands = ["plains", "island", "swamp", "mountain", "forest", "wastes", "llanura", "isla", "pantano", "montaña", "bosque", "yermo"];
  if (basicLands.includes(nameLower)) return true;
  
  // Patrones de tierras no básicas comunes (ej: shocklands, fetchlands, triomas, slow/fastlands)
  const landPatterns = [
    "grave", "vents", "tomb", "garden", "fountain", "crypt", "ground", "foundry", "shrine", "pool",
    "strand", "delta", "mire", "foothills", "heath", "flats", "tarn", "catacombs", "mesa", "rainforest",
    "shores", "canal", "marsh", "thicket", "coast", "cliffs", "gorge", "vantage", "courtyard", "sanctum",
    "tower", "power plant", "mine", "temple", "wastes", "nexus", "fair", "canopy", "canyon", "islet", "clearing", "peatland", "grove",
    "castle", "hall", "hive", "den", "cave", "vale", "crag", "harbor", "sanctuary", "beach", "ridge", "farmland",
    "verge", "glade", "bayou", "savannah", "tundra", "badlands", "taiga", "scrubland", "plateau", "tropical", "sea",
    "passage", "wilds", "orchard", "confluence", "city", "quarry", "waste", "steppes", "depths", "stage", "karst",
    "veta", "canal", "tumba", "jardín", "fuente", "cripta", "terreno", "fundición", "santuario", "estanque",
    "playa", "cueva", "colina", "bosque", "ruinas", "páramo", "ciénaga", "brezal", "catacumbas", "estepa",
    "pasaje", "huerto", "acantilado", "valle", "fortaleza", "guarida", "picos", "río", "lago", "mar", "isla",
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
 * Corrige el tamaño de la baraja principal y regenera/rebalancea la base de tierras
 * para asegurar que sume exactamente targetDeckSize (60 u 80).
 */
async function corregirTamañoYBaseDeMana(cards, targetDeckSize, formData, ragPool) {
  // Asegurar normalización de cantidades antes de procesar
  const normalizedCards = cards.map(c => ({
    ...c,
    quantity: Number(c.quantity || c.count || 1)
  }));

  // 1. Separar hechizos y tierras
  const spells = normalizedCards.filter(c => !isLandCard(c));
  const lands = normalizedCards.filter(c => isLandCard(c));

  // 2. Calcular objetivos matemáticos perfectos
  const targetLandCount = calculatePerfectLandCount(spells, formData, targetDeckSize === 80);
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

    // B. Inyectar hechizos sinérgicos nuevos del RAG pool
    const colorsSet = new Set(formData?.colores || []);
    const ragSpells = (ragPool || []).filter(c => {
      const type = (c.type_line || c.category || '').toLowerCase();
      if (type.includes('land')) return false;
      const cardColors = c.colors || [];
      const matchesColor = cardColors.length === 0 || cardColors.some(col => colorsSet.has(col));
      const alreadyInDeck = spells.some(s => s.name.toLowerCase() === c.name.toLowerCase());
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

    // C. Si aún faltan (RAG pool vacío o identidades incompatibles), inyectar staples genéricos
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

      // Si aún falta (caso extremo de mazo con poquísimos hechizos únicos), forzar en los de menor coste
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
    // Sobran hechizos: recortar de forma quirúrgica
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
    
    // Función auxiliar para obtener score RAG y priorizar conservación
    const getRagScore = (cardName) => {
      const nameLower = cardName.toLowerCase().trim();
      const match = (ragPool || []).find(c => c.name.toLowerCase().trim() === nameLower);
      return match ? (match.score || 0) : -100;
    };

    // Paso 1: Prunar copias redundantes de hechizos no protegidos (manteniendo mínimo 1 copia para preservar su existencia)
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

    // Paso 2: Si aún sobra, permitir borrar cartas completas no protegidas (las de menor sinergia primero)
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

    // Paso 3: Si aún sobra (caso extremo), prunar copias de cartas protegidas
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

  // 4. Regenerar la base de tierras matemáticamente según Karsten
  let finalLands = [];
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
        let landName = "Wastes";
        if (colorsArray.includes("W")) landName = "Plains";
        else if (colorsArray.includes("U")) landName = "Island";
        else if (colorsArray.includes("B")) landName = "Swamp";
        else if (colorsArray.includes("R")) landName = "Mountain";
        else if (colorsArray.includes("G")) landName = "Forest";
        lands.push({ name: landName, quantity: neededLands, category: "Land", cmc: 0 });
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
    }
    finalLands = lands;
  }

  // Filtrar cartas de cantidad vacía
  const cleanSpells = spells.filter(s => s.quantity > 0);
  const cleanLands = finalLands.filter(l => l.quantity > 0);
  
  return [...cleanSpells, ...cleanLands];
}

/**
 * Ejecuta optimización inteligente basada en IA.
 */
async function optimizarConIA(deckList, formData, aiConfig, ragPool) {
  const isYorion = deckList.some(c => c.name.toLowerCase().includes("yorion, sky nomad")) || (formData?.companero && formData.companero.toLowerCase().includes("yorion"));
  const targetDeckSize = isYorion ? 80 : 60;
  
  const spells = deckList.filter(c => !isLandCard(c));
  const targetLandCount = calculatePerfectLandCount(spells, formData, isYorion);
  const targetSpellCount = targetDeckSize - targetLandCount;

  const currentDeckText = deckList.map(c => `- ${c.quantity}x ${c.name} (${c.category || 'Spell'}, CMC ${c.cmc || 0}, Rol: ${c.role || 'n/a'})`).join('\n');
  const ragPoolText = (ragPool || []).slice(0, 80).map(c => `- ${c.name} (CMC: ${c.mana_value || c.cmc || 0}, Sinergia: ${c.score || 0}, Meta: ${c.metaPercent || 0}%)`).join('\n');

  const systemPrompt = `Eres el OPTIMIZADOR SUPREMO DE MAZOS DE MAGIC: THE GATHERING (Pro Tour Coach).
Tu misión es coger el mazo actual del usuario y optimizarlo de forma quirúrgica (mínimas modificaciones necesarias) para hacerlo lo más competitivo, sinérgico y equilibrado posible.

REGLAS DE OPTIMIZACIÓN QUIRÚRGICA:
1. PRESERVA las selecciones manuales del usuario. Mantén todos los hechizos que el usuario ya tiene en su lista, a menos que sean ilegales por banlist, tengan colores fuera de la identidad de color del mazo, o sean anti-sinergias severas.
2. Modifica ÚNICAMENTE lo que haga falta:
   - Corrige cantidades para cumplir con los límites competitivos (max 4 copias, leyendas baratas 3-4, leyendas de coste >=5 max 2 copias, etc.).
   - Si faltan hechizos para llegar a ${targetSpellCount}, inyecta las mejores opciones del RAG pool.
   - Si sobran hechizos, pruna o reduce la cantidad de las cartas menos sinérgicas o más pesadas, priorizando mantener al menos 1 copia de las cartas del usuario.
   - Si una carta es ilegal por banlist o de color incompatible, reemplázala por una carta legal similar o staple del RAG pool.
3. El mazo principal ("cards") debe contener EXACTAMENTE ${targetDeckSize} cartas en total (EXACTAMENTE ${targetSpellCount} Hechizos y EXACTAMENTE ${targetLandCount} Tierras).
4. Devuelve la respuesta en formato JSON puro que cumpla con el esquema.
`;

  const userPrompt = `
MAZO ACTUAL A OPTIMIZAR:
${currentDeckText}

CONFIGURACIÓN DE LA BARAJA:
- Arquetipo: ${formData?.archetype || 'Midrange'}
- Estrategia: ${formData?.strategy || 'Ninguna'}
- Tribu / Raza: ${formData?.tribe || 'Ninguna'}
- Colores permitidos: ${formData?.colores?.join(', ') || 'Cualquiera'}

RAG CARD POOL (Cartas de alta sinergia pre-seleccionadas):
${ragPoolText}

Optimiza la baraja principal y devuelve el resultado en JSON que cumpla con el esquema.
`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  const response = await callAI(messages, aiConfig, { forceJSON: true, schema: DECK_SCHEMA, maxTokens: 8000 });
  let cleanResponse = response;
  if (cleanResponse.includes('```json')) {
    cleanResponse = cleanResponse.replace(/```json/g, '').replace(/```/g, '').trim();
  }
  const parsed = JSON.parse(cleanResponse);
  const rawCards = parsed.cards || parsed.mainDeck || [];
  
  // Normalización robusta de la respuesta de la IA
  return rawCards.map(c => ({
    name: c.name,
    quantity: Number(c.quantity || c.count || 1),
    category: c.category || c.type || '',
    cmc: Number(c.cmc || c.mana_value || 0),
    mana_cost: c.mana_cost || '',
    type_line: c.type_line || '',
    role: c.role || ''
  }));
}

/**
 * Optimizador de Mazos.
 * Realiza una optimización inteligente de la baraja, ya sea con IA (si está configurada)
 * o con heurísticas locales deterministas, garantizando el tamaño exacto del mazo.
 */
export async function optimizarMazo(deckList, formData, aiConfig) {
  // 1. Limpieza y normalización de la lista de entrada (forzar quantity numérica)
  let nextDeck = [...deckList]
    .filter(c => !BATTLEBOX_BANLIST.includes(c.name))
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

  // Intentar optimizar con IA de forma inteligente si está configurada
  if (aiConfig && aiConfig.selectedModel && aiConfig.apiKey) {
    try {
      optimizedCards = await optimizarConIA(nextDeck, formData, aiConfig, ragPool);
      usedAI = true;
    } catch (e) {
      console.warn("Fallo al optimizar con IA, recurriendo a fallback local heurístico", e);
    }
  }

  // Fallback heurístico local si no se usa IA
  if (!usedAI) {
    try {
      const optimizedResult = await aplicarJuezFinal(
          { cards: nextDeck }, 
          null, 
          formData, 
          (msg) => console.log(msg), 
          ragPool
      );
      optimizedCards = optimizedResult.cards;
    } catch (e) {
      console.error("Fallo durante la optimización con el Juez Supremo:", e);
      optimizedCards = nextDeck;
    }
  }

  // 3. Aplicar paracaídas matemático para corregir cualquier anomalía de tamaño
  const finalDeck = await corregirTamañoYBaseDeMana(optimizedCards, targetDeckSize, formData, ragPool);

  // 4. Hidratar las cartas nuevas para garantizar que tengan todas las propiedades Scryfall
  const hydratedDeck = await hydrateDeckCards(finalDeck, 'fast', () => {});
  return hydratedDeck;
}
