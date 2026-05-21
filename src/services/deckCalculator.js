import { CARD_TYPES, DECK_SIZES } from '../utils/mtgConstants.js';
import { BATTLEBOX_BANLIST } from '../constants/legacyBattleBox.js';

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

export function calculatePerfectLandCount(nonLandCards, formData) {
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
  
  const strategy = (formData?.strategy || '').toLowerCase();
  const archetype = (formData?.archetype || '').toLowerCase();
  
  if (strategy === 'spellslinger' || strategy === 'voltron') {
    lands -= 1.5;
  }
  if (strategy === 'landfall') {
    lands += 2.0;
  }
  if (archetype === 'aggro') {
    lands = Math.min(lands, 20);
  }
  if (archetype === 'control') {
    lands = Math.max(lands, 24);
  }
  
  return Math.round(Math.max(18, Math.min(26, lands)));
}

export async function generateManaBase(pipBalance, totalLands, colorIdentity, formData, nonLandSpells = []) {
  if (!pipBalance) {
    pipBalance = { W: 20, U: 20, B: 20, R: 20, G: 20 };
  }
  
  const colors = colorIdentity.filter(c => c !== 'C' && c !== '');
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
  
  // 1. DYNAMIC CONFIGURATION OF KEY UTILITY / COMBOS OF LANDS
  
  // A. ELDRAZI TRON (Urza Lands Suite)
  if (tribe === 'eldrazi' || strategy === 'prison' || formColors.includes('C') || formColors.length === 0) {
    const tronSuite = [
      { name: "Urza's Tower", quantity: 4, type_line: "Land — Urza's Tower" },
      { name: "Urza's Power", quantity: 4, type_line: "Land — Urza's Power" },
      { name: "Urza's Mine", quantity: 4, type_line: "Land — Urza's Mine" },
      { name: "Eldrazi Temple", quantity: 4, type_line: "Land — Eldrazi" },
      { name: "Wastes", quantity: 2, type_line: "Basic Land — Wastes" }
    ];
    
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
  // F. CONTROL / MIDRANGE (Manlands & Channel Lands)
  else if (archetype === 'control' || archetype === 'midrange') {
    // 1. Inyección de Man-Lands Temáticas (Amenazas Ofensivas en tierras)
    if (formColors.includes('W') && formColors.includes('U') && remainingLands >= 2) {
      manaBase.push({ name: "Celestial Colonnade", quantity: 2, category: "Land", type_line: "Land", color_identity: ["W", "U"] });
      remainingLands -= 2;
    } else if (formColors.includes('U') && formColors.includes('B') && remainingLands >= 2) {
      manaBase.push({ name: "Creeping Tar Pit", quantity: 2, category: "Land", type_line: "Land", color_identity: ["U", "B"] });
      remainingLands -= 2;
    } else if (formColors.includes('U') && formColors.includes('R') && remainingLands >= 1) {
      manaBase.push({ name: "Wandering Fumarole", quantity: 1, category: "Land", type_line: "Land", color_identity: ["U", "R"] });
      remainingLands--;
    } else if (formColors.includes('B') && formColors.includes('G') && remainingLands >= 1) {
      manaBase.push({ name: "Hissing Quagmire", quantity: 1, category: "Land", type_line: "Land", color_identity: ["B", "G"] });
      remainingLands--;
    } else if (formColors.includes('R') && formColors.includes('W') && remainingLands >= 1) {
      manaBase.push({ name: "Needle Spires", quantity: 1, category: "Land", type_line: "Land", color_identity: ["R", "W"] });
      remainingLands--;
    } else if (formColors.includes('G') && formColors.includes('W') && remainingLands >= 1) {
      manaBase.push({ name: "Stirring Wildwood", quantity: 1, category: "Land", type_line: "Land", color_identity: ["G", "W"] });
      remainingLands--;
    }

    // Monocolores o complementarias: Dungeons & Dragons man-lands / utility
    if (formColors.includes('U') && remainingLands >= 1) {
      manaBase.push({ name: "Hall of Storm Giants", quantity: 1, category: "Land", type_line: "Land — Cave", color_identity: ["U"] });
      remainingLands--;
    }
    if (formColors.includes('B') && remainingLands >= 1) {
      manaBase.push({ name: "Hive of the Eye Tyrant", quantity: 1, category: "Land", type_line: "Land — Cave", color_identity: ["B"] });
      remainingLands--;
    }
    if (formColors.includes('R') && remainingLands >= 1) {
      manaBase.push({ name: "Den of the Bugbear", quantity: 1, category: "Land", type_line: "Land — Cave", color_identity: ["R"] });
      remainingLands--;
    }
    if (formColors.includes('W') && remainingLands >= 1) {
      manaBase.push({ name: "Cave of the Frost Dragon", quantity: 1, category: "Land", type_line: "Land — Cave", color_identity: ["W"] });
      remainingLands--;
    }
    if (formColors.includes('G') && remainingLands >= 1) {
      manaBase.push({ name: "Lair of the Hydra", quantity: 1, category: "Land", type_line: "Land — Cave", color_identity: ["G"] });
      remainingLands--;
    }

    // 2. Channel Lands de Kamigawa (Utilidad Incondicional)
    if (formColors.includes('G') && remainingLands >= 1) {
      manaBase.push({ name: "Boseiju, Who Endures", quantity: 1, category: "Land", type_line: "Legendary Land", color_identity: ["G"] });
      remainingLands--;
    }
    if (formColors.includes('U') && remainingLands >= 1) {
      manaBase.push({ name: "Otawara, Soaring City", quantity: 1, category: "Land", type_line: "Legendary Land", color_identity: ["U"] });
      remainingLands--;
    }
    if (formColors.includes('W') && remainingLands >= 1) {
      manaBase.push({ name: "Eiganjo, Seat of the Empire", quantity: 1, category: "Land", type_line: "Legendary Land", color_identity: ["W"] });
      remainingLands--;
    }
    if (formColors.includes('B') && remainingLands >= 1) {
      manaBase.push({ name: "Takenuma, Abandoned Mire", quantity: 1, category: "Land", type_line: "Legendary Land", color_identity: ["B"] });
      remainingLands--;
    }
    if (formColors.includes('R') && remainingLands >= 1) {
      manaBase.push({ name: "Sokenzan, Crucible of Defiance", quantity: 1, category: "Land", type_line: "Legendary Land", color_identity: ["R"] });
      remainingLands--;
    }
  }

  // 2. MODERN SHOCK LANDS
  const modernShocks = [
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
  ].filter(land => !BATTLEBOX_BANLIST.includes(land.name));

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
  ].filter(land => !BATTLEBOX_BANLIST.includes(land.name));

  if (isMulticolor) {
    const validShocks = modernShocks.filter(d => d.colors.every(c => actualColors.includes(c)));
    validShocks.forEach(shock => {
      const hasReq = shock.colors.some(c => karstenRequirements[c]);
      const quantity = (actualColors.length === 2 || hasReq) ? 4 : 2;
      if (remainingLands >= quantity) {
        manaBase.push({
          name: shock.name,
          quantity: quantity,
          category: 'Land',
          type_line: 'Land — Shock',
          color_identity: shock.colors
        });
        remainingLands -= quantity;
      }
    });

    const validFetches = fetchLands.filter(f => f.colors.every(c => actualColors.includes(c)));
    let fetchesAllocated = 0;
    validFetches.forEach(fetch => {
      const hasReq = fetch.colors.some(c => karstenRequirements[c]);
      const quantity = (actualColors.length === 2 || hasReq) ? 4 : 3;
      if (remainingLands >= quantity && fetchesAllocated < 8) {
        manaBase.push({
          name: fetch.name,
          quantity: quantity,
          category: 'Land',
          type_line: 'Land — Fetch',
          color_identity: fetch.colors
        });
        remainingLands -= quantity;
        fetchesAllocated += quantity;
      }
    });
  }

  // 3. BASIC LANDS (Based on Pip Balance)
  const sortedColors = [...actualColors].sort((a, b) => (pipBalance[b] || 0) - (pipBalance[a] || 0));
  const initialRemainingForBasics = remainingLands;

  sortedColors.forEach((color, idx) => {
    if (remainingLands <= 0) return;
    
    let count;
    if (idx === sortedColors.length - 1) {
      count = remainingLands;
    } else {
      const percentage = (pipBalance[color] || 0) / totalPips;
      count = Math.floor(percentage * initialRemainingForBasics);
    }
    
    count = Math.max(0, count);
    
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

  console.log(`🌍 Generadas EXACTAMENTE ${totalLands} tierras en formato Profesional Modern.`);
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