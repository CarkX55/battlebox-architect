import { CARD_TYPES, DECK_SIZES } from '../utils/mtgConstants.js';
import { BATTLEBOX_VETOS } from '../constants/legacyBattleBox.js';

const MANA_VALUE_FALLBACK = 3;

const RAMP_KEYWORDS = ['search your library for a basic land', 'search your library for a land', 'add'];
const DRAW_KEYWORDS = ['draw a card', 'draw cards', 'draw'];

const RARITY_WEIGHTS = {
  mythic: 0.74,
  rare: 0.38,
  uncommon: 0.38,
  common: 0,
};

const FUNCTIONAL_CMC_MAP = {
  "leyline binding": 1,
  "murktide regent": 2,
  "grief": 0,
  "solitude": 0,
  "fury": 0,
  "subtlety": 0,
  "endurance": 0,
  "gurmag angler": 1,
  "tasigur, the golden fang": 1,
  "hollow one": 1,
  "street wraith": 0,
  "scion of draco": 2,
  "dismember": 1,
  "thoughtcast": 1
};

export function getManaValue(card) {
  const name = (card.name || '').toLowerCase().trim();
  if (name in FUNCTIONAL_CMC_MAP) {
    return FUNCTIONAL_CMC_MAP[name];
  }
  return card.mana_value ?? card.cmc ?? MANA_VALUE_FALLBACK;
}

export function isLand(card) {
  const typeLine = card.type_line?.toLowerCase() ?? '';
  return typeLine.includes('land') || card.type_line === 'Land';
}

export function hasRampEffect(card) {
  const oracle = card.oracle_text?.toLowerCase() ?? '';
  const name = card.name?.toLowerCase() ?? '';
  const role = card.role?.toLowerCase() ?? '';
  const knownRampNames = ['birds of paradise', 'hierarch', 'elves', 'dork', 'wild growth', 'utopia sprawl', 'rampant growth', 'farseek', 'sakura-tribe', 'tomb', 'sol ring', 'mana vault', 'talisman', 'signet', 'search for tomorrow'];
  return RAMP_KEYWORDS.some(keyword => oracle.includes(keyword)) ||
         knownRampNames.some(n => name.includes(n)) ||
         role.includes('ramp') || role.includes('dork') || role.includes('fast_mana');
}

export function hasDrawEffect(card) {
  const oracle = card.oracle_text?.toLowerCase() ?? '';
  const name = card.name?.toLowerCase() ?? '';
  const role = card.role?.toLowerCase() ?? '';
  const knownDrawNames = ['preordain', 'consider', 'opt', 'ponder', 'brainstorm', 'looting', 'bauble', 'consider', 'sleight of hand', 'serum visions', 'draw', 'recall', 'vision', 'study', 'probe', 'wraith'];
  return DRAW_KEYWORDS.some(keyword => oracle.includes(keyword)) ||
         knownDrawNames.some(n => name.includes(n)) ||
         role.includes('draw') || role.includes('cantrip') || role.includes('draw_cards');
}

export function isRampOrDraw(card) {
  return hasRampEffect(card) || hasDrawEffect(card);
}

export function isMDFC(card) {
  return card.card_faces?.length === 2 && 
         card.layout === 'transform';
}

export function getMDFCAdjustment(card) {
  if (!isMDFC(card)) return 0;
  
  const faceWithLand = card.card_faces?.find(face => 
    face.type_line?.toLowerCase().includes('land')
  );
  
  if (!faceWithLand) return 0;
  
  const rarity = card.rarity?.toLowerCase() ?? 'common';
  
  if (rarity === 'mythic') return RARITY_WEIGHTS.mythic;
  if (rarity === 'rare' || rarity === 'uncommon') return RARITY_WEIGHTS.rare;
  
  return 0;
}

export function calculateVMP(nonLandCards) {
  if (nonLandCards.length === 0) return 0;
  
  let totalManaValue = 0;
  let totalQuantity = 0;
  nonLandCards.forEach(card => {
    const qty = card.quantity || 1;
    totalManaValue += getManaValue(card) * qty;
    totalQuantity += qty;
  });
  
  return totalQuantity > 0 ? totalManaValue / totalQuantity : 0;
}

export function calculateRA(nonLandCards) {
  return nonLandCards.filter(card => {
    const mv = getManaValue(card);
    return mv <= 2 && isRampOrDraw(card);
  }).reduce((sum, card) => sum + (card.quantity || 1), 0);
}

export function calculateMDFCAdjustment(cards) {
  return cards.reduce((total, card) => {
    return total + (getMDFCAdjustment(card) * (card.quantity || 1));
  }, 0);
}

export function getKarstenLandCount(cards, isCommander = false, hasCompanion = false) {
  const nonLandCards = cards.filter(card => !isLand(card));
  
  const vmp = calculateVMP(nonLandCards);
  const ra = calculateRA(nonLandCards);
  const mdfcAdjust = calculateMDFCAdjustment(cards);
  
  let lands;
  
  if (isCommander) {
    lands = 20 + (2.50 * vmp) - (0.20 * ra) - mdfcAdjust;
  } else {
    const companionMod = hasCompanion ? 0.27 : 0;
    
    if (ra >= 5 && vmp >= 3) {
      lands = 22 + (1.30 * vmp) - (0.10 * ra) + (0.27 * companionMod) - mdfcAdjust;
    } else {
      lands = 14 + (2.00 * vmp) - (0.15 * ra) + (0.27 * companionMod) - mdfcAdjust;
    }
  }
  
  return Math.round(Math.max(0, lands));
}

export function getDeckDistribution(cards, isCommander = false, hasCompanion = false) {
  const totalCards = cards.reduce((sum, c) => sum + (c.quantity || 1), 0);
  const lands = cards.filter(card => isLand(card)).reduce((sum, c) => sum + (c.quantity || 1), 0);
  const nonLands = totalCards - lands;
  const recommendedLands = getKarstenLandCount(cards, isCommander, hasCompanion);
  
  const vmp = calculateVMP(cards.filter(card => !isLand(card)));
  const ra = calculateRA(cards.filter(card => !isLand(card)));
  const mdfcAdjust = calculateMDFCAdjustment(cards);
  
  return {
    total: totalCards,
    lands,
    nonLands,
    recommendedLands,
    variance: lands - recommendedLands,
    metrics: {
      vmp: Math.round(vmp * 100) / 100,
      rampDrawCount: ra,
      mdfc_adjustment: Math.round(mdfcAdjust * 100) / 100,
    }
  };
}

const BASIC_LAND_NAMES = {
  W: 'Plains',
  U: 'Island',
  B: 'Swamp',
  R: 'Mountain',
  G: 'Forest'
};

export function calculatePerfectLandCount(nonLandCards, formData, isYorion = false) {
  const vmp = calculateVMP(nonLandCards);
  
  // Separar los aceleradores (Mana Dorks/Rocks de CMC <= 2)
  const aceleradores = nonLandCards.filter(c => {
    const mv = getManaValue(c);
    return mv <= 2 && hasRampEffect(c);
  }).reduce((sum, c) => sum + (c.quantity || 1), 0);

  // Cantrips puros (CMC <= 1, ej. Consider, Opt, Preordain, etc.)
  const cantrips = nonLandCards.filter(c => {
    const mv = getManaValue(c);
    return mv <= 1 && hasDrawEffect(c) && !hasRampEffect(c);
  }).reduce((sum, c) => sum + (c.quantity || 1), 0);

  // Fórmula exacta de Modern Karsten optimizada con Pesos Pro Tour:
  // 1 Acelerador = -0.50 Tierras
  // 1 Cantrip = -0.25 Tierras (Previene inundaciones de tierras en curvas bajas)
  let lands = 16 + (3.00 * vmp) - (0.50 * aceleradores) - (0.25 * cantrips);
  
  // Deducción de tierras virtuales por MDFC/Cicladoras de tierras (ej: Lorien Revealed, Bala Ged Recovery)
  const mdfcAndCyclers = ["malakir rebirth", "bala ged recovery", "shatterskull smashing", "agadeem's awakening", "sejiri shelter", "lorien revealed"];
  const mdfcCount = nonLandCards.filter(c => mdfcAndCyclers.some(mac => c.name.toLowerCase().includes(mac))).reduce((sum, c) => sum + (c.quantity || 1), 0);
  const mdfcLandReduction = Math.floor(mdfcCount / 2);
  lands -= mdfcLandReduction;
  
  const strategy = (formData?.strategy || '').toLowerCase();
  const archetype = (formData?.archetype || '').toLowerCase();
  
  if (strategy === 'spellslinger' || strategy === 'voltron') {
    lands -= 1.5;
  }
  if (strategy === 'landfall') {
    lands += 2.0;
  }
  
  // Limites estrictos por arquetipo competitivo
  if (archetype === 'aggro') {
    lands = Math.min(lands, 20);
  } else if (archetype === 'control') {
    lands = Math.min(Math.max(lands, 24), 26);
  } else if (archetype === 'combo' || archetype === 'midrange') {
    lands = Math.min(lands, 24);
  } else {
    // Por defecto si no detectamos arquetipo claro, limitamos a 24 para evitar mazos injugables
    lands = Math.min(lands, 24);
  }
  
  if (isYorion) {
      lands = lands * (80 / 60);
  }
  
  return Math.round(Math.max(isYorion ? 24 : 18, Math.min(isYorion ? 35 : 26, lands)));
}

export async function generateManaBase(pipBalance, totalLands, colorIdentity, formData, nonLandSpells = [], aiUtilityLands = []) {
  if (!pipBalance) {
    pipBalance = { W: 20, U: 20, B: 20, R: 20, G: 20 };
  }
  
  // Extraer colores basándonos en colorIdentity
  let colors = colorIdentity.filter(c => c !== 'C' && c !== '');
  
  // Robust fallback: Si el colorIdentity es incompleto (menos de 2 colores) pero el mazo tiene hechizos
  // de múltiples colores, inferimos la identidad real analizando las cartas de hechizos no-tierra
  if (colors.length < 5 && nonLandSpells && nonLandSpells.length > 0) {
    const inferredColors = new Set(colors);
    nonLandSpells.forEach(s => {
      // Buscar coste de maná
      const cost = (s.mana_cost || '').toUpperCase();
      if (cost.includes('W')) inferredColors.add('W');
      if (cost.includes('U')) inferredColors.add('U');
      if (cost.includes('B')) inferredColors.add('B');
      if (cost.includes('R')) inferredColors.add('R');
      if (cost.includes('G')) inferredColors.add('G');
      
      // Fallback a color_identity de la carta si está pre-hidratada
      if (s.color_identity && Array.isArray(s.color_identity)) {
        s.color_identity.forEach(c => inferredColors.add(c.toUpperCase()));
      }
    });
    colors = Array.from(inferredColors);
  }

  // --- REDUCCIÓN DE PIPS POR MANA DORKS ---
  // Si el mazo contiene cartas que generan maná, reducimos la dependencia de lands básicas para esos colores.
  if (nonLandSpells && nonLandSpells.length > 0) {
    nonLandSpells.forEach(s => {
      if (hasRampEffect(s)) {
        const text = (s.oracle_text || '').toLowerCase();
        const qty = s.quantity || 1;
        // Si produce de cualquier color, restamos un poco a todos
        if (text.includes('add one mana of any color') || text.includes('add {w} or {u} or {b} or {r} or {g}')) {
          ['W', 'U', 'B', 'R', 'G'].forEach(c => { pipBalance[c] = Math.max(0, pipBalance[c] - qty * 0.3); });
        } else {
          // Si produce colores específicos
          if (text.includes('add {w}')) pipBalance['W'] = Math.max(0, pipBalance['W'] - qty * 0.5);
          if (text.includes('add {u}')) pipBalance['U'] = Math.max(0, pipBalance['U'] - qty * 0.5);
          if (text.includes('add {b}')) pipBalance['B'] = Math.max(0, pipBalance['B'] - qty * 0.5);
          if (text.includes('add {r}')) pipBalance['R'] = Math.max(0, pipBalance['R'] - qty * 0.5);
          if (text.includes('add {g}')) pipBalance['G'] = Math.max(0, pipBalance['G'] - qty * 0.5);
        }
      }
    });
  }

  const actualColors = colors.length > 0 ? colors : ['W'];
  const totalPips = Object.keys(pipBalance).reduce((sum, key) => key !== 'C' ? sum + pipBalance[key] : sum, 0) || 1;
  const isMulticolor = actualColors.length >= 2;

  // === PILAR 3: MATEMÁTICA DE FUENTES DE FRANK KARSTEN PARA PIP TIMING ===
  const karstenRequirements = {};
  
  // Mapa de símbolos de maná por color
  const colorSymbolMap = { W: '{W}', U: '{U}', B: '{B}', R: '{R}', G: '{G}' };
  
  // Función auxiliar para obtener el costo de maná en texto de forma robusta
  const getCardManaCostString = (c) => {
    if (typeof c.mana_cost === 'string') return c.mana_cost;
    if (c.card_faces && typeof c.card_faces[0]?.mana_cost === 'string') return c.card_faces[0].mana_cost;
    return '';
  };
  
  // Auxiliar para contar repeticiones
  const countOccurrences = (str, sub) => {
    if (!str || !sub) return 0;
    return str.split(sub).length - 1;
  };

  // Lista de nombres clave por color para fallback en caso de cartas sin costo parseado
  const knownDoubleFallbacks = {
    U: ['counterspell', 'archmage', 'cryptic', 'murktide', 'jace', 'mana leak', 'deprive'],
    B: ['liliana', 'yawgmoth', 'grief', 'sheoldred', 'hymn to tourach', 'dismember', 'hero\'s downfall'],
    R: ['wrenn', 'eidolon', 'fury', 'seasoned pyromancer', 'koth', 'splinter twin', 'anger of the gods'],
    G: ['dryad', 'tarmogoyf', 'archdruid', 'scales', 'chord of calling', 'scavenging ooze', 'life from the loam'],
    W: ['puresteel', 'solitude', 'stoneforge', 'wrath of god', 'teferi', 'esper sentinel', 'rest in peace']
  };

  // Escaneo universal de requerimientos de Frank Karsten
  ['W', 'U', 'B', 'R', 'G'].forEach(color => {
    let requiredSources = 0;
    
    // Ignorar colores que no estén en la identidad de color del mazo (ej. pips Phyrexianos como Dismember en mazos sin Negro)
    if (!colors.includes(color)) return;
    
    nonLandSpells.forEach(s => {
      const costStr = getCardManaCostString(s);
      const nameLower = (s.name || '').toLowerCase();
      const mv = getManaValue(s);
      
      const pipsCount = countOccurrences(costStr, colorSymbolMap[color]);
      const isFallbackMatch = knownDoubleFallbacks[color].some(fb => nameLower.includes(fb));
      
      if (pipsCount >= 3) {
        // Costes triples (ej. Cryptic Command) -> Requiere 22 fuentes del color
        requiredSources = Math.max(requiredSources, 22);
      } else if (pipsCount >= 2 || (isFallbackMatch && pipsCount >= 1)) {
        if (mv <= 2) {
          // Doble pip en coste <= 2 (ej. Counterspell) -> 20 fuentes
          requiredSources = Math.max(requiredSources, 20);
        } else if (mv === 3) {
          // Doble pip en coste 3 (ej. Liliana of the Veil) -> 18 fuentes
          requiredSources = Math.max(requiredSources, 18);
        } else if (mv >= 4) {
          // Doble pip en coste >= 4 -> 16 fuentes
          requiredSources = Math.max(requiredSources, 16);
        }
      } else if (pipsCount === 1 && mv === 1) {
        // Monocolor de coste 1 (ej. Ragavan, Consider) -> Requiere 14 fuentes del color para lanzarse consistentemente en T1
        requiredSources = Math.max(requiredSources, 14);
      }
    });

    if (requiredSources > 0) {
      karstenRequirements[color] = requiredSources;
    }
  });

  console.log("[KARSTEN BASE MASTER] Requerimientos de fuentes de color detectados:", JSON.stringify(karstenRequirements));
  
  const manaBase = [];
  let remainingLands = totalLands;

  const strategy = (formData?.strategy || '').toLowerCase();
  const archetype = (formData?.archetype || '').toLowerCase();
  const tribe = (formData?.tribe || '').toLowerCase();
  const formColors = formData?.colores || [];
  const format = (formData?.format || 'MODERN').toUpperCase();

  const hasTribe = !!(formData?.tribe && formData.tribe !== 'none' && formData.tribe !== 'ninguna');
  let minBasics = 3;
  if (actualColors.length === 1) minBasics = 12;
  else if (actualColors.length === 2) minBasics = 4;
  else if (actualColors.length === 3) minBasics = 3;
  else minBasics = 3;
  
  // 1. INYECCIÓN INTELIGENTE DE TIERRAS DE UTILIDAD (AI TOP 1 RECOMMENDATIONS)
  let injectTronSuite = false;
  if (strategy === 'tron' || archetype === 'tron_blue' || archetype.includes('tron') || (tribe === 'eldrazi' && strategy === 'tron') || (archetype === 'ramp' && formColors.includes('C')) || (formColors.includes('C') && actualColors.length === 0) || formColors.length === 0) {
    injectTronSuite = true;
  }
  if (aiUtilityLands && aiUtilityLands.some(l => l && l.includes("Urza's"))) {
    injectTronSuite = true;
  }

  if (aiUtilityLands && aiUtilityLands.length > 0) {
      console.log(`[MANABASE GENERATOR] Procesando ${aiUtilityLands.length} tierras de utilidad sugeridas por IA.`);
      const uniqueUtils = {};
      let totalUtilityAdded = 0;
      
      aiUtilityLands.forEach(landName => {
          if (injectTronSuite && landName && landName.includes("Urza's")) return; // Saltarse tierras de Urza, se inyectarán con el paquete completo de 12 tierras
          if (!uniqueUtils[landName]) uniqueUtils[landName] = 0;
          uniqueUtils[landName]++;
      });

      // Limitar a máximo 2 tipos únicos de tierras especiales para no arruinar la curva de color
      const sortedUtils = Object.entries(uniqueUtils).sort((a, b) => b[1] - a[1]).slice(0, 2);

      for (const [landName, qty] of sortedUtils) {
          // Limitar la cantidad total de copias de tierras especiales a 4 en total
          const copiesToAdd = Math.min(qty, 4 - totalUtilityAdded);
          
          if (copiesToAdd > 0 && remainingLands >= copiesToAdd) {
              manaBase.push({
                  name: landName,
                  quantity: copiesToAdd,
                  category: 'Land',
                  type_line: 'Land',
                  color_identity: [], // It's fine for utility lands, pip math will ignore 'C' or empty
                  role: "ai-utility-land"
              });
              remainingLands -= copiesToAdd;
              totalUtilityAdded += copiesToAdd;
              console.log(`[MANABASE GENERATOR] Inyectada utilidad IA: ${copiesToAdd}x ${landName}`);
          }
      }
  }
  
  // 1. DYNAMIC CONFIGURATION OF KEY UTILITY / COMBOS OF LANDS
  
  // A. ELDRAZI TRON (Urza Lands Suite)
  if (injectTronSuite) {
    const tronSuite = [
      { name: "Urza's Tower", quantity: 4, type_line: "Land — Urza's Tower" },
      { name: "Urza's Power Plant", quantity: 4, type_line: "Land — Urza's Power Plant" },
      { name: "Urza's Mine", quantity: 4, type_line: "Land — Urza's Mine" }
    ];
    // Sólo agregar Eldrazi Temple y Wastes de forma estricta si es Eldrazi Tribal o Colorless Puro
    if (tribe === 'eldrazi' || formColors.length === 0 || (formColors.includes('C') && actualColors.length === 0)) {
        tronSuite.push({ name: "Eldrazi Temple", quantity: 4, type_line: "Land — Eldrazi" });
        tronSuite.push({ name: "Wastes", quantity: 2, type_line: "Basic Land — Wastes" });
    }

    
    tronSuite.forEach(land => {
      if (remainingLands >= land.quantity) {
        manaBase.push({
          name: land.name,
          quantity: land.quantity,
          category: 'Land',
          type_line: land.type_line,
          color_identity: []
        });
        remainingLands -= land.quantity;
      }
    });

    if (formColors.includes('G') && remainingLands >= 1) {
      manaBase.push({ name: "Boseiju, Who Endures", quantity: 1, category: "Land", type_line: "Legendary Land", color_identity: ["G"] });
      remainingLands--;
    }
    if (formColors.includes('U') && remainingLands >= 1) {
      manaBase.push({ name: "Otawara, Soaring City", quantity: 1, category: "Land", type_line: "Legendary Land", color_identity: ["U"] });
      remainingLands--;
    }
  }
  // A2. ELDRAZI AGGRO/MIDRANGE (No Urza lands, but Eldrazi Temple and Wastes are mandatory)
  else if (tribe === 'eldrazi') {
    const eldraziSuite = [
      { name: "Eldrazi Temple", quantity: 4, type_line: "Land — Eldrazi" },
      { name: "Wastes", quantity: 1, type_line: "Basic Land — Wastes" }
    ];
    
    eldraziSuite.forEach(land => {
      if (remainingLands >= land.quantity) {
        manaBase.push({
          name: land.name,
          quantity: land.quantity,
          category: 'Land',
          type_line: land.type_line,
          color_identity: []
        });
        remainingLands -= land.quantity;
      }
    });
  }
  // B. AFFINITY
  else if (strategy === 'affinity' || strategy === 'vehicles' || tribe === 'constructs') {
    const affinitySuite = [
      { name: "Darksteel Citadel", quantity: 4, type_line: "Artifact Land" },
      { name: "Treasure Vault", quantity: 4, type_line: "Artifact Land" },
      { name: "Blinkmoth Nexus", quantity: 3, type_line: "Land — Nexus" },
      { name: "Inventors' Fair", quantity: 1, type_line: "Legendary Land" }
    ];
    
    affinitySuite.forEach(land => {
      if (remainingLands >= land.quantity) {
        manaBase.push({
          name: land.name,
          quantity: land.quantity,
          category: 'Land',
          type_line: land.type_line,
          color_identity: []
        });
        remainingLands -= land.quantity;
      }
    });
  }
  // C. HARDENED SCALES
  else if (strategy === 'scales' || strategy === 'counters') {
    const scalesSuite = [
      { name: "Blinkmoth Nexus", quantity: 4, type_line: "Land — Nexus" },
      { name: "Llanowar Reborn", quantity: 2, type_line: "Land" },
      { name: "Pendelhaven", quantity: 1, type_line: "Legendary Land" }
    ];
    
    scalesSuite.forEach(land => {
      if (remainingLands >= land.quantity) {
        manaBase.push({
          name: land.name,
          quantity: land.quantity,
          category: 'Land',
          type_line: land.type_line,
          color_identity: land.name === "Pendelhaven" ? ["G"] : []
        });
        remainingLands -= land.quantity;
      }
    });
  }
  // D. REANIMATOR
  else if (strategy === 'reanimator') {
    if (formColors.includes('B') && remainingLands >= 1) {
      manaBase.push({ name: "Takenuma, Abandoned Mire", quantity: 1, category: "Land", type_line: "Legendary Land", color_identity: ["B"] });
      remainingLands--;
    }
    if (remainingLands >= 1) {
      manaBase.push({ name: "Geier Reach Sanitarium", quantity: 1, category: "Land", type_line: "Legendary Land", color_identity: [] });
      remainingLands--;
    }
  }
  // E. BURN / AGGRO / VOLTRON (Horizon lands draw combo)
  else if (archetype === 'aggro' || strategy === 'voltron') {
    const horizonLands = [
      { name: 'Sunbaked Canyon', colors: ['R', 'W'] },
      { name: 'Fiery Islet', colors: ['U', 'R'] },
      { name: 'Silent Clearing', colors: ['W', 'B'] },
      { name: 'Nurturing Peatland', colors: ['B', 'G'] },
      { name: 'Waterlogged Grove', colors: ['G', 'U'] }
    ];
    const validHorizons = horizonLands.filter(h => h.colors.every(c => formColors.includes(c)));
    validHorizons.forEach(h => {
      const qty = colors.length === 2 ? 4 : 2;
      if (remainingLands >= qty) {
        manaBase.push({
          name: h.name,
          quantity: qty,
          category: 'Land',
          type_line: 'Land — Canopy',
          color_identity: h.colors
        });
        remainingLands -= qty;
      }
    });
  }

  // Calculate non-creature spells count to determine if we should scale down tribal lands
  const nonCreatureSpells = (nonLandSpells || []).filter(s => {
    const cat = (s.category || '').toLowerCase();
    const type = (s.type_line || '').toLowerCase();
    return !cat.includes('creature') && !type.includes('creature');
  });
  const nonCreatureCount = nonCreatureSpells.reduce((sum, s) => sum + (s.quantity || 1), 0);

  // --- TRIBAL LANDS GUARANTEE FOR MULTICOLOR TRIBAL DECKS ---
  if (hasTribe && isMulticolor && (format === 'MODERN' || format === 'LEGACY' || format === 'PIONEER' || format === 'STANDARD')) {
      const tribalLands = [];
      
      // Cavern of Souls is legal in Modern, Legacy, Pioneer, Standard
      if (!BATTLEBOX_VETOS.includes('Cavern of Souls')) {
          tribalLands.push({ name: "Cavern of Souls", quantity: 4 });
      }
      // Secluded Courtyard is legal in Modern, Pioneer, Legacy
      if (!BATTLEBOX_VETOS.includes('Secluded Courtyard') && format !== 'STANDARD') {
          tribalLands.push({ name: "Secluded Courtyard", quantity: 4 });
      }
      // Unclaimed Territory is legal in Modern, Pioneer, Legacy
      if (!BATTLEBOX_VETOS.includes('Unclaimed Territory') && format !== 'STANDARD') {
          tribalLands.push({ name: "Unclaimed Territory", quantity: 4 });
      }
      
      let maxTribalCopies = actualColors.length >= 4 ? 12 : (actualColors.length === 3 ? 8 : 4);
      
      const creatureCount = (nonLandSpells || []).reduce((sum, s) => {
          const cat = (s.category || '').toLowerCase();
          const type = (s.type_line || '').toLowerCase();
          if (cat.includes('creature') || type.includes('creature')) {
              return sum + (s.quantity || 1);
          }
          return sum;
      }, 0);

      // Scale down tribal lands if there are non-creature spells that require normal colored sources
      if (creatureCount < 12) {
          maxTribalCopies = 0; // Don't run tribal lands if the deck is heavily spell-based (e.g. Reanimator, Control)
      } else if (nonCreatureCount > 0) {
          if (nonCreatureCount >= 16) {
              maxTribalCopies = Math.min(maxTribalCopies, 2); 
          } else if (nonCreatureCount >= 12) {
              maxTribalCopies = Math.min(maxTribalCopies, 4); // High non-creature count (Tempo / Control) -> Max 4 tribal lands
          } else if (nonCreatureCount >= 6) {
              maxTribalCopies = Math.min(maxTribalCopies, 6); // Moderate non-creature count -> Max 6 tribal lands
          } else {
              maxTribalCopies = Math.min(maxTribalCopies, 8); // Low non-creature count -> Max 8 tribal lands
          }
      }

      let tribalAdded = manaBase.filter(l => ["cavern of souls", "secluded courtyard", "unclaimed territory"].includes(l.name.toLowerCase())).reduce((sum, l) => sum + l.quantity, 0);
      const currentMinBasics = Math.max(1, Math.min(minBasics, remainingLands - 2));

      tribalLands.forEach(tl => {
          if (tribalAdded >= maxTribalCopies) return;
          let qty = Math.min(tl.quantity, remainingLands - currentMinBasics);
          qty = Math.min(qty, maxTribalCopies - tribalAdded);
          
          if (qty > 0) {
              const existingIdx = manaBase.findIndex(l => l.name.toLowerCase() === tl.name.toLowerCase());
              if (existingIdx !== -1) {
                  const existingQty = manaBase[existingIdx].quantity;
                  const addQty = Math.max(0, qty - existingQty);
                  if (addQty > 0 && remainingLands >= addQty) {
                      manaBase[existingIdx].quantity += addQty;
                      remainingLands -= addQty;
                      tribalAdded += addQty;
                      console.log(`[MANABASE GENERATOR] Tribal: Aumentada tierra tribal a ${manaBase[existingIdx].quantity}x ${tl.name}`);
                  }
              } else {
                  manaBase.push({
                      name: tl.name,
                      quantity: qty,
                      category: 'Land',
                      type_line: 'Land — Tribal',
                      color_identity: []
                  });
                  remainingLands -= qty;
                  tribalAdded += qty;
                  console.log(`[MANABASE GENERATOR] Tribal: Inyectada tierra tribal ${qty}x ${tl.name}`);
              }
          }
      });
  }

  // 2. DETECCIÓN DE FORMATO Y GENERACIÓN DE DUAL LANDS PROFESIONALES
  console.log(`[MANABASE GENERATOR] Generando base de maná profesional para formato: ${format}`);

  // Base de datos de dual lands por formato
  const shockLands = [
    { name: 'Watery Grave', colors: ['U', 'B'] },
    { name: 'Steam Vents', colors: ['U', 'R'] },
    { name: 'Overgrown Tomb', colors: ['B', 'G'] },
    { name: 'Temple Garden', colors: ['G', 'W'] },
    { name: 'Hallowed Fountain', colors: ['W', 'U'] },
    { name: 'Blood Crypt', colors: ['B', 'R'] },
    { name: 'Stomping Ground', colors: ['R', 'G'] },
    { name: 'Sacred Foundry', colors: ['R', 'W'] },
    { name: 'Godless Shrine', colors: ['W', 'B'] },
    { name: 'Breeding Pool', colors: ['G', 'U'] }
  ].filter(land => !BATTLEBOX_VETOS.includes(land.name));

  const fetchLands = [
    { name: 'Flooded Strand', colors: ['W', 'U'] },
    { name: 'Polluted Delta', colors: ['U', 'B'] },
    { name: 'Bloodstained Mire', colors: ['B', 'R'] },
    { name: 'Wooded Foothills', colors: ['R', 'G'] },
    { name: 'Windswept Heath', colors: ['G', 'W'] },
    { name: 'Marsh Flats', colors: ['W', 'B'] },
    { name: 'Scalding Tarn', colors: ['U', 'R'] },
    { name: 'Verdant Catacombs', colors: ['B', 'G'] },
    { name: 'Arid Mesa', colors: ['R', 'W'] },
    { name: 'Misty Rainforest', colors: ['G', 'U'] }
  ].filter(land => !BATTLEBOX_VETOS.includes(land.name));

  const legacyDuals = [
    { name: 'Underground Sea', colors: ['U', 'B'] },
    { name: 'Volcanic Island', colors: ['U', 'R'] },
    { name: 'Bayou', colors: ['B', 'G'] },
    { name: 'Savannah', colors: ['G', 'W'] },
    { name: 'Tundra', colors: ['W', 'U'] },
    { name: 'Badlands', colors: ['B', 'R'] },
    { name: 'Taiga', colors: ['R', 'G'] },
    { name: 'Scrubland', colors: ['W', 'B'] },
    { name: 'Plateau', colors: ['R', 'W'] },
    { name: 'Tropical Island', colors: ['G', 'U'] }
  ].filter(land => !BATTLEBOX_VETOS.includes(land.name));

  const fastLands = [
    { name: 'Darkslick Shores', colors: ['U', 'B'] },
    { name: 'Spirebluff Canal', colors: ['U', 'R'] },
    { name: 'Blooming Marsh', colors: ['B', 'G'] },
    { name: 'Razorverge Thicket', colors: ['G', 'W'] },
    { name: 'Seachrome Coast', colors: ['W', 'U'] },
    { name: 'Blackcleave Cliffs', colors: ['B', 'R'] },
    { name: 'Copperline Gorge', colors: ['R', 'G'] },
    { name: 'Inspiring Vantage', colors: ['R', 'W'] },
    { name: 'Concealed Courtyard', colors: ['W', 'B'] },
    { name: 'Botanical Sanctum', colors: ['G', 'U'] }
  ].filter(land => !BATTLEBOX_VETOS.includes(land.name));

  const slowLands = [
    { name: 'Shipwreck Marsh', colors: ['U', 'B'] },
    { name: 'Stormcarved Coast', colors: ['U', 'R'] },
    { name: 'Deathcap Glade', colors: ['B', 'G'] },
    { name: 'Overgrown Farmland', colors: ['G', 'W'] },
    { name: 'Deserted Beach', colors: ['W', 'U'] },
    { name: 'Haunted Ridge', colors: ['B', 'R'] },
    { name: 'Rockfall Vale', colors: ['R', 'G'] },
    { name: 'Sundown Pass', colors: ['R', 'W'] },
    { name: 'Shattered Sanctuary', colors: ['W', 'B'] },
    { name: 'Dreamroot Cascade', colors: ['G', 'U'] }
  ].filter(land => !BATTLEBOX_VETOS.includes(land.name));

  const triomes = [
    { name: 'Raffine\'s Tower', colors: ['W', 'U', 'B'] },
    { name: 'Xander\'s Lounge', colors: ['U', 'B', 'R'] },
    { name: 'Ziatora\'s Proving Ground', colors: ['B', 'R', 'G'] },
    { name: 'Jetmir\'s Garden', colors: ['R', 'G', 'W'] },
    { name: 'Spara\'s Headquarters', colors: ['G', 'W', 'U'] },
    { name: 'Indatha Triome', colors: ['W', 'B', 'G'] },
    { name: 'Ketria Triome', colors: ['U', 'R', 'G'] },
    { name: 'Raugrin Triome', colors: ['U', 'R', 'W'] },
    { name: 'Savai Triome', colors: ['W', 'B', 'R'] },
    { name: 'Zagoth Triome', colors: ['U', 'B', 'G'] }
  ].filter(land => !BATTLEBOX_VETOS.includes(land.name));

  const painLands = [
    { name: 'Underground River', colors: ['U', 'B'] },
    { name: 'Shivan Reef', colors: ['U', 'R'] },
    { name: 'Llanowar Wastes', colors: ['B', 'G'] },
    { name: 'Brushland', colors: ['G', 'W'] },
    { name: 'Adarkar Wastes', colors: ['W', 'U'] },
    { name: 'Sulfurous Springs', colors: ['B', 'R'] },
    { name: 'Karplusan Forest', colors: ['R', 'G'] },
    { name: 'Battlefield Forge', colors: ['R', 'W'] },
    { name: 'Caves of Koilos', colors: ['W', 'B'] },
    { name: 'Yavimaya Coast', colors: ['G', 'U'] }
  ].filter(land => !BATTLEBOX_VETOS.includes(land.name));

  // --- MINIMUM BASIC LANDS GUARANTEE ---
  const currentMinBasics = Math.max(1, Math.min(minBasics, remainingLands - 2));

  if (isMulticolor) {
    // Determine limits based on color count and non-creature spell density
    let maxCopiesPerUnique;
    if (actualColors.length >= 4) {
      maxCopiesPerUnique = nonCreatureCount >= 8 ? 2 : 1;
    } else if (actualColors.length === 3) {
      maxCopiesPerUnique = nonCreatureCount >= 8 ? 3 : 2;
    } else {
      maxCopiesPerUnique = 4;
    }

    let maxTotalDuals = 6;
    if (format === 'STANDARD' || format === 'PIONEER' || nonCreatureCount >= 8) {
      maxTotalDuals = 10; // Allow more dual lands to support high non-creature/spellslinger requirements or formats without fetches
    }
    let totalDualsInjected = 0;

    // A. FETCH LANDS INJECTION (Only Legacy and Modern)
    if (format === 'LEGACY' || format === 'MODERN') {
      const validFetches = fetchLands.filter(f => f.colors.every(c => actualColors.includes(c)));
      
      // Sort fetches by the sum of their colors' pip counts to prioritize dominant colors
      validFetches.sort((a, b) => {
        const sumA = a.colors.reduce((sum, c) => sum + (pipBalance[c] || 0), 0);
        const sumB = b.colors.reduce((sum, c) => sum + (pipBalance[c] || 0), 0);
        return sumB - sumA;
      });

      const maxFetches = (actualColors.length >= 3) ? 8 : 4;
      let fetchesAllocated = 0;

      validFetches.forEach(fetch => {
        if (fetchesAllocated >= maxFetches) return;
        const hasReq = fetch.colors.some(c => karstenRequirements[c]);
        
        let quantity;
        if (actualColors.length >= 4) {
          quantity = 1; // Toolbox approach: 1 copy of each fetch to cover all color pairs
        } else if (actualColors.length === 3) {
          quantity = hasReq ? 4 : 3; // Run 4 copies of critical fetches, 3 for others
        } else {
          quantity = 4; // In 2-color, run 4 of each
        }

        // Ensure basic lands guarantee
        quantity = Math.min(quantity, remainingLands - currentMinBasics);
        quantity = Math.min(quantity, maxFetches - fetchesAllocated);

        if (quantity > 0) {
          manaBase.push({
            name: fetch.name,
            quantity: quantity,
            category: 'Land',
            type_line: 'Land — Fetch',
            color_identity: fetch.colors
          });
          remainingLands -= quantity;
          fetchesAllocated += quantity;
          console.log(`[MANABASE GENERATOR] Inyectada fetch land: ${quantity}x ${fetch.name}`);
        }
      });
    }

    // B. DUAL LANDS / SHOCKLANDS INJECTION
    const targetDuals = (format === 'LEGACY') ? legacyDuals : (format === 'STANDARD' ? painLands : shockLands);
    const validDuals = targetDuals.filter(d => d.colors.every(c => actualColors.includes(c)));

    // Sort duals by the sum of their colors' pip counts to prioritize dominant colors
    validDuals.sort((a, b) => {
      const sumA = a.colors.reduce((sum, c) => sum + (pipBalance[c] || 0), 0);
      const sumB = b.colors.reduce((sum, c) => sum + (pipBalance[c] || 0), 0);
      return sumB - sumA;
    });

    // Two-pass injection to ensure we have at least 1 of each dual land for fetches, before adding second copies
    const dualsToInject = validDuals.map(d => ({ ...d, quantityToInject: 0 }));
    
    // Pass 1: Greedy Color Coverage Sweep
    const coveredColors = new Set();
    
    // Pass 1a: Greedy pass to cover all colors in actualColors with at least one dual land
    dualsToInject.forEach(dual => {
      if (totalDualsInjected >= maxTotalDuals || remainingLands <= currentMinBasics) return;
      
      const hasUncoveredColor = dual.colors.some(c => actualColors.includes(c) && !coveredColors.has(c));
      if (hasUncoveredColor) {
        dual.quantityToInject = 1;
        dual.colors.forEach(c => {
          if (actualColors.includes(c)) coveredColors.add(c);
        });
        totalDualsInjected += 1;
        remainingLands -= 1;
      }
    });

    // Pass 1b: Inject 1 copy of remaining valid dual lands up to maxTotalDuals (prioritizing sorted order)
    dualsToInject.forEach(dual => {
      if (totalDualsInjected >= maxTotalDuals || remainingLands <= currentMinBasics) return;
      if (dual.quantityToInject === 0) {
        dual.quantityToInject = 1;
        dual.colors.forEach(c => {
          if (actualColors.includes(c)) coveredColors.add(c);
        });
        totalDualsInjected += 1;
        remainingLands -= 1;
      }
    });

    // Pass 2: Inject remaining copies up to maxCopiesPerUnique
    dualsToInject.forEach(dual => {
      if (totalDualsInjected >= maxTotalDuals || remainingLands <= currentMinBasics) return;
      const hasReq = dual.colors.some(c => karstenRequirements[c]);
      const maxAllowed = (actualColors.length === 2 || hasReq) ? maxCopiesPerUnique : Math.min(2, maxCopiesPerUnique);
      const remainingAllowed = maxAllowed - dual.quantityToInject;
      
      const qty = Math.min(remainingAllowed, remainingLands - currentMinBasics);
      const qtyCapped = Math.min(qty, maxTotalDuals - totalDualsInjected);

      if (qtyCapped > 0) {
        dual.quantityToInject += qtyCapped;
        totalDualsInjected += qtyCapped;
        remainingLands -= qtyCapped;
      }
    });

    // Actually push to manaBase
    dualsToInject.forEach(dual => {
      if (dual.quantityToInject > 0) {
        manaBase.push({
          name: dual.name,
          quantity: dual.quantityToInject,
          category: 'Land',
          type_line: (format === 'LEGACY') ? 'Land — Original Dual' : (format === 'STANDARD' ? 'Land — Pain' : 'Land — Shock'),
          color_identity: dual.colors
        });
        console.log(`[MANABASE GENERATOR] Inyectada tierra dual: ${dual.quantityToInject}x ${dual.name}`);
      }
    });

    // C. TRIOMES INJECTION (Only Modern/Pioneer and 3+ Colors)
    const curve = (formData?.curveProfile || '').toLowerCase();
    const isAggressive = curve === 'aggressive' || curve === 'blitz' || archetype === 'aggro';
    
    if (actualColors.length >= 3 && (format === 'MODERN' || format === 'PIONEER') && remainingLands > currentMinBasics && !isAggressive) {
      const maxTriomes = (actualColors.length >= 4) ? 2 : 1;
      let triomesInjected = 0;
      const validTriomes = triomes.filter(t => t.colors.every(c => actualColors.includes(c)));

      validTriomes.forEach(t => {
        if (triomesInjected >= maxTriomes || remainingLands <= currentMinBasics) return;
        manaBase.push({
          name: t.name,
          quantity: 1,
          category: 'Land',
          type_line: 'Land — Triome',
          color_identity: t.colors
        });
        remainingLands--;
        triomesInjected++;
        console.log(`[MANABASE GENERATOR] Inyectado Trioma: 1x ${t.name}`);
      });
    }

    // D. AUXILIARY LANDS (Fastlands & Slowlands: Optimización de Turno Crítico de Pips)
    if (format === 'PIONEER' || format === 'STANDARD' || remainingLands > currentMinBasics) {
      // 1. Deducir qué colores tienen pips de coste bajo (CMC <= 2)
      const lowCmcColors = new Set();
      nonLandSpells.forEach(s => {
        const mv = getManaValue(s);
        if (mv <= 2) {
          const costStr = getCardManaCostString(s);
          if (costStr.includes('W')) lowCmcColors.add('W');
          if (costStr.includes('U')) lowCmcColors.add('U');
          if (costStr.includes('B')) lowCmcColors.add('B');
          if (costStr.includes('R')) lowCmcColors.add('R');
          if (costStr.includes('G')) lowCmcColors.add('G');
        }
      });

      // 2. Filtrar tierras auxiliares válidas y ordenarlas por pips
      const validFast = fastLands.filter(f => f.colors.every(c => actualColors.includes(c)));
      validFast.sort((a, b) => {
        const sumA = a.colors.reduce((sum, c) => sum + (pipBalance[c] || 0), 0);
        const sumB = b.colors.reduce((sum, c) => sum + (pipBalance[c] || 0), 0);
        return sumB - sumA;
      });

      const validSlow = slowLands.filter(s => s.colors.every(c => actualColors.includes(c)));
      validSlow.sort((a, b) => {
        const sumA = a.colors.reduce((sum, c) => sum + (pipBalance[c] || 0), 0);
        const sumB = b.colors.reduce((sum, c) => sum + (pipBalance[c] || 0), 0);
        return sumB - sumA;
      });

      // 3. Inyectar Fastlands primero si el par de colores tiene pips tempranos de CMC <= 2
      validFast.forEach(fast => {
        if (remainingLands <= currentMinBasics) return;
        
        // ¿Tiene pips tempranos?
        const hasEarlyPip = fast.colors.some(c => lowCmcColors.has(c));
        
        if (hasEarlyPip || archetype === 'aggro') {
          let quantity = (archetype === 'aggro' || format === 'STANDARD') ? 4 : 2;
          quantity = Math.min(quantity, remainingLands - currentMinBasics);

          if (quantity > 0) {
            manaBase.push({
              name: fast.name,
              quantity: quantity,
              category: 'Land',
              type_line: 'Land — Fast',
              color_identity: fast.colors
            });
            remainingLands -= quantity;
            console.log(`[MANABASE GENERATOR] [CRITICAL PIP] Inyectada Fastland para tempo temprano: ${quantity}x ${fast.name}`);
          }
        }
      });

      // 4. Inyectar Slowlands si no se requería tempo temprano o si queda espacio
      validSlow.forEach(slow => {
        if (remainingLands <= currentMinBasics) return;
        
        // Evitar slowlands en barajas ultra-agresivas/blitz para que no entren giradas en turnos críticos
        if (isAggressive) return;

        const hasEarlyPip = slow.colors.some(c => lowCmcColors.has(c));
        
        // Priorizar slowlands si no se requiere velocidad inmediata (Control/Midrange o costes >= 3)
        if (!hasEarlyPip || archetype === 'control' || archetype === 'midrange') {
          let quantity = (archetype === 'control' || archetype === 'midrange') ? 4 : 2;
          quantity = Math.min(quantity, remainingLands - currentMinBasics);

          if (quantity > 0) {
            manaBase.push({
              name: slow.name,
              quantity: quantity,
              category: 'Land',
              type_line: 'Land — Slow',
              color_identity: slow.colors
            });
            remainingLands -= quantity;
            console.log(`[MANABASE GENERATOR] [CRITICAL PIP] Inyectada Slowland para late-game de valor: ${quantity}x ${slow.name}`);
          }
        }
      });
    }

    // E. WASTELAND (Legacy only, Aggro/Midrange/Taxes/Tempo strategies)
    if (format === 'LEGACY' && remainingLands > currentMinBasics) {
      if (['aggro', 'midrange', 'tempo', 'taxes'].includes(archetype) || ['aggro', 'midrange', 'prison'].includes(strategy)) {
        const qtyWasteland = Math.min(3, remainingLands - currentMinBasics);
        if (qtyWasteland > 0 && !BATTLEBOX_VETOS.includes('Wasteland')) {
          manaBase.push({
            name: 'Wasteland',
            quantity: qtyWasteland,
            category: 'Land',
            type_line: 'Land',
            color_identity: []
          });
          remainingLands -= qtyWasteland;
          console.log(`[MANABASE GENERATOR] Inyectada Wasteland: ${qtyWasteland}x`);
        }
      }
    }

    // F. UNIVERSAL 5-COLOR LANDS (If 4 or 5 colors)
    if (actualColors.length >= 4 && remainingLands > currentMinBasics) {
      const rainbowLands = [
        { name: "City of Brass", quantity: 4 },
        { name: "Mana Confluence", quantity: 4 }
      ].filter(land => !BATTLEBOX_VETOS.includes(land.name));
      
      let rainbowAdded = 0;
      const maxRainbow = 6;

      rainbowLands.forEach(rb => {
        if (remainingLands <= currentMinBasics || rainbowAdded >= maxRainbow) return;
        let quantity = Math.min(rb.quantity, remainingLands - currentMinBasics);
        quantity = Math.min(quantity, maxRainbow - rainbowAdded);
        if (quantity > 0) {
          manaBase.push({
            name: rb.name,
            quantity: quantity,
            category: 'Land',
            type_line: 'Land — 5-Color',
            color_identity: []
          });
          remainingLands -= quantity;
          rainbowAdded += quantity;
          console.log(`[MANABASE GENERATOR] Inyectada tierra universal 5C: ${quantity}x ${rb.name}`);
        }
      });
    }

    // G. PAINLANDS FOR COLORLESS TIMING
    if (formColors.includes('C') && remainingLands > currentMinBasics) {
      const validPains = painLands.filter(p => p.colors.every(c => actualColors.includes(c)));
      // Ordenar validPains por los pips que más falten, igual que arriba
      validPains.sort((a, b) => {
        const sumA = a.colors.reduce((sum, c) => sum + (pipBalance[c] || 0), 0);
        const sumB = b.colors.reduce((sum, c) => sum + (pipBalance[c] || 0), 0);
        return sumB - sumA;
      });

      let painLandsAdded = 0;
      // Límite estricto de painlands en total para evitar matar al jugador
      const maxPainLands = actualColors.length >= 3 ? 2 : 4; 

      validPains.forEach(pain => {
        if (remainingLands <= currentMinBasics || painLandsAdded >= maxPainLands) return;
        let quantity = Math.min(maxPainLands - painLandsAdded, remainingLands - currentMinBasics);
        if (quantity > 0) {
          manaBase.push({
            name: pain.name,
            quantity: quantity,
            category: 'Land',
            type_line: 'Land — Pain',
            color_identity: pain.colors
          });
          remainingLands -= quantity;
          painLandsAdded += quantity;
          console.log(`[MANABASE GENERATOR] Inyectada pain land para incoloro: ${quantity}x ${pain.name}`);
        }
      });
    }
  } else if (actualColors.length === 1) {
    // === MONO-COLOR UTILITY & TRIBAL LANDS ===
    const monoColor = actualColors[0];
    const utilityLandsToInject = [];

    const monoCreatureCount = (nonLandSpells || []).reduce((sum, s) => {
        const cat = (s.category || '').toLowerCase();
        const type = (s.type_line || '').toLowerCase();
        if (cat.includes('creature') || type.includes('creature')) {
            return sum + (s.quantity || 1);
        }
        return sum;
    }, 0);

    // A. Tribal support for Mono-color
    if (hasTribe && monoCreatureCount >= 12) {
      if (!BATTLEBOX_VETOS.includes('Cavern of Souls')) {
        utilityLandsToInject.push({ name: "Cavern of Souls", qty: 2, type: "Land — Cavern" });
      }
      if (!BATTLEBOX_VETOS.includes('Mutavault') && format !== 'STANDARD') {
        utilityLandsToInject.push({ name: "Mutavault", qty: 2, type: "Land" });
      }
    }

    // B. Strategic engines
    if (monoColor === 'B' && (strategy === 'control' || strategy === 'reanimator' || archetype === 'control')) {
      if (!BATTLEBOX_VETOS.includes('Cabal Coffers')) {
        utilityLandsToInject.push({ name: "Cabal Coffers", qty: 2, type: "Land" });
      }
      if (!BATTLEBOX_VETOS.includes('Urborg, Tomb of Yawgmoth')) {
        utilityLandsToInject.push({ name: "Urborg, Tomb of Yawgmoth", qty: 1, type: "Legendary Land" });
      }
      utilityLandsToInject.push({ name: "Castle Locthwain", qty: 2, type: "Land" });
      utilityLandsToInject.push({ name: "Takenuma, Abandoned Mire", qty: 1, type: "Legendary Land" });
    }
    else if (monoColor === 'G' && (strategy === 'ramp' || archetype === 'midrange')) {
      utilityLandsToInject.push({ name: "Nykthos, Shrine to Nyx", qty: 2, type: "Legendary Land" });
      utilityLandsToInject.push({ name: "Castle Garenbrig", qty: 2, type: "Land" });
      utilityLandsToInject.push({ name: "Boseiju, Who Endures", qty: 1, type: "Legendary Land" });
      utilityLandsToInject.push({ name: "Lair of the Hydra", qty: 1, type: "Land — Cave" });
    }
    else if (monoColor === 'R' && archetype === 'aggro') {
      utilityLandsToInject.push({ name: "Castle Embereth", qty: 1, type: "Land" });
      utilityLandsToInject.push({ name: "Den of the Bugbear", qty: 2, type: "Land — Cave" });
      utilityLandsToInject.push({ name: "Ramunap Ruins", qty: 2, type: "Land" });
    }
    else {
      // Fallback base de datos de monoLands genéricas
      const genericMonoLands = {
        'W': [
          { name: "Castle Ardenvale", qty: 2, type: "Land" },
          { name: "Eiganjo, Seat of the Empire", qty: 1, type: "Legendary Land" },
          { name: "Cave of the Frost Dragon", qty: 2, type: "Land — Cave" }
        ],
        'U': [
          { name: "Castle Vantress", qty: 2, type: "Land" },
          { name: "Otawara, Soaring City", qty: 1, type: "Legendary Land" },
          { name: "Hall of Storm Giants", qty: 2, type: "Land — Cave" }
        ],
        'B': [
          { name: "Castle Locthwain", qty: 2, type: "Land" },
          { name: "Takenuma, Abandoned Mire", qty: 1, type: "Legendary Land" },
          { name: "Hive of the Eye Tyrant", qty: 2, type: "Land — Cave" }
        ],
        'R': [
          { name: "Castle Embereth", qty: 2, type: "Land" },
          { name: "Sokenzan, Crucible of Defiance", qty: 1, type: "Legendary Land" },
          { name: "Den of the Bugbear", qty: 2, type: "Land — Cave" }
        ],
        'G': [
          { name: "Castle Garenbrig", qty: 2, type: "Land" },
          { name: "Boseiju, Who Endures", qty: 1, type: "Legendary Land" },
          { name: "Lair of the Hydra", qty: 2, type: "Land — Cave" }
        ]
      };
      const list = genericMonoLands[monoColor] || [];
      list.forEach(item => utilityLandsToInject.push(item));
      if (!BATTLEBOX_VETOS.includes('Mutavault') && utilityLandsToInject.length < 5) {
        utilityLandsToInject.push({ name: "Mutavault", qty: 2, type: "Land" });
      }
    }

    // Limit special utility lands strictly to max 6 slots to guarantee at least 12-14 basics
    let totalUtilityAdded = 0;
    const maxUtilityAllowed = 6;

    utilityLandsToInject.forEach(land => {
      if (totalUtilityAdded >= maxUtilityAllowed) return;
      let qty = Math.min(land.qty, remainingLands - currentMinBasics);
      qty = Math.min(qty, maxUtilityAllowed - totalUtilityAdded);

      if (qty > 0) {
        manaBase.push({
          name: land.name,
          quantity: qty,
          category: 'Land',
          type_line: land.type,
          color_identity: [monoColor]
        });
        remainingLands -= qty;
        totalUtilityAdded += qty;
        console.log(`[MANABASE GENERATOR] Inyectada utilidad monocolor: ${qty}x ${land.name} (Total Utility: ${totalUtilityAdded}/${maxUtilityAllowed})`);
      }
    });

    // Incoloro explícito ('C') en Monocolor
    if (formColors.includes('C') && remainingLands > currentMinBasics) {
      const painMatch = painLands.find(p => p.colors.includes(monoColor));
      if (painMatch) {
        let quantity = Math.min(4, remainingLands - currentMinBasics);
        if (quantity > 0) {
          manaBase.push({
            name: painMatch.name,
            quantity: quantity,
            category: 'Land',
            type_line: 'Land — Pain',
            color_identity: painMatch.colors
          });
          remainingLands -= quantity;
          console.log(`[MANABASE GENERATOR] Inyectada pain land para incoloro (mono): ${quantity}x ${painMatch.name}`);
        }
      }
    }
  }

  // 3. BASIC LANDS (Based on Pip Balance using Largest Remainder Method)
  const basicLandsDistribution = {};
  actualColors.forEach(c => { basicLandsDistribution[c] = 0; });
  
  if (remainingLands > 0) {
    const totalRemaining = remainingLands;
    let allocated = 0;
    const fractionalParts = [];

    // First pass: allocate floor
    actualColors.forEach(color => {
      const percentage = (pipBalance[color] || 0) / totalPips;
      const exact = percentage * totalRemaining;
      const floorVal = Math.floor(exact);
      basicLandsDistribution[color] = floorVal;
      allocated += floorVal;
      fractionalParts.push({ color, fraction: exact - floorVal });
    });

    // Second pass: allocate remaining to the largest fractional parts
    let leftover = totalRemaining - allocated;
    fractionalParts.sort((a, b) => b.fraction - a.fraction);
    
    for (let i = 0; i < leftover; i++) {
      if (i < fractionalParts.length) {
        basicLandsDistribution[fractionalParts[i].color]++;
      }
    }

    // Push to manaBase
    Object.keys(basicLandsDistribution).forEach(color => {
      const count = basicLandsDistribution[color];
      if (count > 0) {
        const landName = BASIC_LAND_NAMES[color] || 'Plains';
        manaBase.push({
          name: landName,
          quantity: count,
          category: 'Land',
          type_line: `Basic Land — ${landName}`,
          color_identity: [color]
        });
        remainingLands -= count;
      }
    });
  }

  if (remainingLands > 0) {
    const fallbackLand = formColors.includes('C') ? 'Wastes' : (BASIC_LAND_NAMES[actualColors[0]] || 'Plains');
    manaBase.push({
      name: fallbackLand,
      quantity: remainingLands,
      category: 'Land',
      type_line: `Basic Land — ${fallbackLand}`,
      color_identity: actualColors[0] ? [actualColors[0]] : []
    });
    remainingLands = 0;
  }

  console.log(`🌍 Generadas EXACTAMENTE ${totalLands} tierras en formato Profesional ${format}.`);
  return manaBase;
}

export function injectManaBase(deck, pipBalance, format) {
  const isCommander = format.includes('commander');
  const targetTotal = isCommander ? 100 : 60;
  
  const nonLands = deck.filter(c => c.category !== 'Land');
  const currentLands = deck.filter(c => c.category === 'Land');
  const currentTotal = nonLands.reduce((sum, c) => sum + c.quantity, 0) + currentLands.reduce((sum, c) => sum + c.quantity, 0);
  
  const landsNeeded = targetTotal - currentTotal;
  
  if (landsNeeded <= 0) {
    console.log('✅ Mazo ya tiene tierras suficientes');
    return deck;
  }
  
  console.log(`🧮 Tierras necesarias: ${landsNeeded}`);
  
  return deck;
}

// Probabilidad Hipergeométrica Exacta de Frank Karsten
export function calculateKarstenProbability(sourcesCount, turnNeeded, pipsNeeded, deckSize = 60) {
  if (sourcesCount <= 0) return 0;
  
  const cardsDrawn = 6 + turnNeeded;
  let successfulStates = 0;

  const choose = (n, k) => {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    let res = 1;
    for (let i = 1; i <= k; i++) {
      res = res * (n - i + 1) / i;
    }
    return Math.round(res);
  };

  const N = deckSize;
  const K = sourcesCount;
  const n = cardsDrawn;

  for (let x = pipsNeeded; x <= n; x++) {
    successfulStates += choose(K, x) * choose(N - K, n - x);
  }
  
  const totalStates = choose(N, n);
  if (totalStates === 0) return 0;
  
  const prob = (successfulStates / totalStates) * 100;
  return Math.round(Math.min(100, Math.max(0, prob)));
}

// Probabilidad de robar al menos targetLandDrop tierras para el turno N
export function calculateLandDropProbability(totalLands, targetLandDrop, turn, deckSize = 60) {
  if (totalLands <= 0 || targetLandDrop <= 0) return 0;
  
  const cardsDrawn = 6 + turn;
  let successfulStates = 0;

  const choose = (n, k) => {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    let res = 1;
    for (let i = 1; i <= k; i++) {
      res = res * (n - i + 1) / i;
    }
    return Math.round(res);
  };

  const N = deckSize;
  const K = totalLands;
  const n = cardsDrawn;

  for (let x = targetLandDrop; x <= n; x++) {
    successfulStates += choose(K, x) * choose(N - K, n - x);
  }
  
  const totalStates = choose(N, n);
  if (totalStates === 0) return 0;
  
  const prob = (successfulStates / totalStates) * 100;
  return Math.round(Math.min(100, Math.max(0, prob)));
}

// Cobertura de Maná: promedio de probabilidad de tener al menos 1 fuente de cada color requerido para el turno 2
export function calculateManaCoverage(sourcesObj, colorsNeeded, deckSize = 60) {
  if (!colorsNeeded || colorsNeeded.length === 0) return 100;
  
  let totalProb = 0;
  let activeColorsCount = 0;
  
  for (const color of colorsNeeded) {
    const srcCount = sourcesObj[color] || 0;
    if (srcCount > 0) {
      // Probabilidad de tener al menos 1 fuente de este color en el turno 2 (8 cartas vistas)
      const prob = calculateKarstenProbability(srcCount, 2, 1, deckSize);
      totalProb += prob;
      activeColorsCount++;
    } else {
      activeColorsCount++; // Contamos el color como 0% si se requiere pero no hay fuentes
    }
  }
  
  if (activeColorsCount === 0) return 100;
  return Math.round(totalProb / activeColorsCount);
}

// === CARACTERÍSTICA C: SIMULACIÓN DEL TURNO DE ORO (Montecarlo) ===
// Ejecuta 1,000 partidas solitarias automatizadas (Hand + Draws)
// para calcular en qué turno el mazo lanza consistentemente su jugada clave/finisher.
export function calculateTurnoDeOro(deckList, iterations = 1000) {
  if (!deckList || deckList.length === 0) return { avgTurn: 0, winRate: 0, consistency: 0 };
  
  let successCount = 0;
  let turnResults = [];
  
  const cmcList = [];
  const landsList = [];
  
  deckList.forEach(c => {
    const qty = c.quantity || 1;
    for (let i = 0; i < qty; i++) {
      if (c.category === 'Land') {
        landsList.push(c);
      } else {
        cmcList.push(getManaValue(c));
      }
    }
  });
  
  const totalCards = cmcList.length + landsList.length;
  if (totalCards < 40) return { avgTurn: 0, winRate: 0, consistency: 0 };
  
  // Turno de Oro: lanzar hechizos del top de la curva del mazo.
  // Filtramos amenazas reales (ignoramos picos absurdos aislados de coste 10+ si hay muy pocos)
  const validCmcs = cmcList.filter(c => c > 0 && c <= 8).sort((a,b) => a - b);
  const maxThreatCmc = validCmcs.length > 0 ? validCmcs[Math.floor(validCmcs.length * 0.90)] || 4 : 4;
  
  for (let i = 0; i < iterations; i++) {
    // 1. Barajar el mazo simplificado (L = Tierra, S = Hechizo)
    const deck = [...Array(landsList.length).fill('L'), ...Array(cmcList.length).fill('S')];
    for (let j = deck.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [deck[j], deck[k]] = [deck[k], deck[j]];
    }
    
    // 2. Robar mano inicial (7 cartas)
    let handLands = 0;
    for (let j = 0; j < 7; j++) {
      if (deck[j] === 'L') handLands++;
    }
    
    // 3. Simular turnos hasta lanzar maxThreatCmc
    let landsInPlay = 0;
    let currentTurn = 1;
    let cardIndex = 7;
    
    while (currentTurn <= 10) {
      if (handLands > 0) {
        landsInPlay++;
        handLands--;
      }
      
      if (landsInPlay >= maxThreatCmc) {
        turnResults.push(currentTurn);
        // "Success" es lograr lanzar el finisher antes o en el turno óptimo (maxThreatCmc + 1)
        if (currentTurn <= maxThreatCmc + 1) successCount++;
        break;
      }
      
      // Draw per turn
      if (cardIndex < deck.length) {
        if (deck[cardIndex] === 'L') handLands++;
        cardIndex++;
      }
      currentTurn++;
    }
  }
  
  if (turnResults.length > 0) {
    const totalTurns = turnResults.reduce((a, b) => a + b, 0);
    const avgTurn = totalTurns / turnResults.length;
    const winRate = (successCount / iterations) * 100;
    
    // Consistencia basada en desviación estándar
    const variance = turnResults.reduce((sq, n) => sq + Math.pow(n - avgTurn, 2), 0) / turnResults.length;
    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, Math.min(100, 100 - (stdDev * 15)));
    
    return {
      avgTurn: Math.round(avgTurn * 10) / 10,
      winRate: Math.round(winRate),
      consistency: Math.round(consistency)
    };
  }
  
  return { avgTurn: 0, winRate: 0, consistency: 0 };
}

export function getLandColors(landName) {
  if (!landName || typeof landName !== 'string') return [];
  const nameLower = landName.toLowerCase().trim();
  
  // rainbow lands
  const rainbowLands = [
    "cavern of souls", "mana confluence", "city of brass", "reflecting pool", 
    "exotic orchard", "forbidden orchard", "gemstone mine", "aether hub", 
    "plaza of heroes", "spire of industry", "ancient ziggurat", "pillar of the paruns", 
    "secluded courtyard", "unclaimed territory", "command tower", "ally encampment"
  ];
  if (rainbowLands.some(rl => nameLower.includes(rl))) {
    return ["W", "U", "B", "R", "G"];
  }

  const res = [];
  
  // basic lands
  if (nameLower.includes("plains") || nameLower === "eiganjo, seat of the empire") res.push("W");
  if (nameLower.includes("island") || nameLower === "otawara, soaring city") res.push("U");
  if (nameLower.includes("swamp") || nameLower === "takenuma, abandoned mire") res.push("B");
  if (nameLower.includes("mountain") || nameLower === "sokenzan, crucible of defiance") res.push("R");
  if (nameLower.includes("forest") || nameLower === "boseiju, who endures") res.push("G");
  
  // dual lands (check known patterns)
  const uwLands = ["hallowed fountain", "flooded strand", "tundra", "seachrome coast", "deserted beach", "glacial fortress", "adarkar wastes", "port town", "prairie stream", "hengegate pathway", "celestial colonnade", "meandering river", "tranquil cove", "glacial floodplain"];
  const ubLands = ["watery grave", "polluted delta", "underground sea", "darkslick shores", "shipwreck marsh", "drowned catacomb", "underground river", "choked estuary", "sunken hollow", "clearwater pathway", "creeping tar pit", "dismal backwater", "ice tunnel"];
  const brLands = ["blood crypt", "bloodstained mire", "badlands", "blackcleave cliffs", "haunted ridge", "dragonskull summit", "sulfurous springs", "foreboding ruins", "smoldering marsh", "blightstep pathway", "lavaclaw reaches", "cinder barrens", "bloodfell caves", "sulfur mire"];
  const rgLands = ["stomping ground", "wooded foothills", "taiga", "copperline gorge", "rockfall vale", "rootbound crag", "karplusan forest", "game trail", "cinder glade", "cragcrown pathway", "raging ravine", "timber gorge", "rugged highlands", "highland forest"];
  const gwLands = ["temple garden", "windswept heath", "savannah", "razorverge thicket", "overgrown farmland", "sunpetal grove", "brushland", "fortified village", "canopy vista", "branchloft pathway", "stirring wildwood", "blossoming sands", "arctic treeline"];
  const wbLands = ["godless shrine", "marsh flats", "scrubland", "concealed courtyard", "shattered sanctuary", "isolated chapel", "caves of koilos", "shineshadow temple", "fetid heath", "shambling vent", "brightclimb pathway", "scoured barrens", "snowfield sinkhole"];
  const urLands = ["steam vents", "scalding tarn", "volcanic island", "spirebluff canal", "stormcarved coast", "sulfur falls", "shivan reef", "wandering fumarole", "riverglide pathway", "swiftwater cliffs", "volatile fjord"];
  const bgLands = ["overgrown tomb", "verdant catacombs", "bayou", "blooming marsh", "deathcap glade", "woodland cemetery", "llanowar wastes", "hissing quagmire", "darkbore pathway", "jungle hollow", "woodland chasm"];
  const rwLands = ["sacred foundry", "arid mesa", "plateau", "inspiring vantage", "sundown pass", "clifftop retreat", "battlefield forge", "needle spires", "needleverge pathway", "wind-scarred crag", "alpine meadow"];
  const guLands = ["breeding pool", "misty rainforest", "tropical island", "botanical sanctum", "dreamroot cascade", "hinterland harbor", "yavimaya coast", "lumbering falls", "barkchannel pathway", "thornwood falls", "rimewood falls"];

  if (uwLands.some(l => nameLower.includes(l))) { res.push("W", "U"); }
  if (ubLands.some(l => nameLower.includes(l))) { res.push("U", "B"); }
  if (brLands.some(l => nameLower.includes(l))) { res.push("B", "R"); }
  if (rgLands.some(l => nameLower.includes(l))) { res.push("R", "G"); }
  if (gwLands.some(l => nameLower.includes(l))) { res.push("G", "W"); }
  if (wbLands.some(l => nameLower.includes(l))) { res.push("W", "B"); }
  if (urLands.some(l => nameLower.includes(l))) { res.push("U", "R"); }
  if (bgLands.some(l => nameLower.includes(l))) { res.push("B", "G"); }
  if (rwLands.some(l => nameLower.includes(l))) { res.push("R", "W"); }
  if (guLands.some(l => nameLower.includes(l))) { res.push("G", "U"); }

  // triomes
  if (nameLower.includes("raffine's tower") || nameLower.includes("raffine")) res.push("W", "U", "B");
  if (nameLower.includes("xander's lounge") || nameLower.includes("xander")) res.push("U", "B", "R");
  if (nameLower.includes("ziatora's proving ground") || nameLower.includes("ziatora")) res.push("B", "R", "G");
  if (nameLower.includes("jetmir's garden") || nameLower.includes("jetmir")) res.push("R", "G", "W");
  if (nameLower.includes("spara's headquarters") || nameLower.includes("spara")) res.push("G", "W", "U");
  if (nameLower.includes("indatha")) res.push("W", "B", "G");
  if (nameLower.includes("ketria")) res.push("U", "R", "G");
  if (nameLower.includes("raugrin")) res.push("U", "R", "W");
  if (nameLower.includes("savai")) res.push("W", "B", "R");
  if (nameLower.includes("zagoth")) res.push("U", "B", "G");

  // horizon canopy style lands
  if (nameLower.includes("sunbaked canyon")) res.push("R", "W");
  if (nameLower.includes("fiery islet")) res.push("U", "R");
  if (nameLower.includes("silent clearing")) res.push("W", "B");
  if (nameLower.includes("nurturing peatland")) res.push("B", "G");
  if (nameLower.includes("waterlogged grove")) res.push("G", "U");

  return [...new Set(res)];
}