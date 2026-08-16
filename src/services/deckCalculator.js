import { CARD_TYPES, DECK_SIZES } from '../utils/mtgConstants.js';
import { BATTLEBOX_VETOS } from '../constants/legacyBattleBox.js';
import { getAllCards } from './dbIngestor.js';

let cachedAllCards = null;
async function getCachedCards() {
  if (!cachedAllCards || cachedAllCards.length === 0) {
    cachedAllCards = await getAllCards();
  }
  return cachedAllCards;
}

const isColorlessLand = (name) => {
  if (!name) return false;
  const n = name.toLowerCase();
  if (n.includes("cavern of souls") || n.includes("secluded courtyard") || n.includes("unclaimed territory") || n.includes("mana confluence") || n.includes("city of brass")) {
    return false;
  }
  if (n.includes("urborg, tomb of yawgmoth")) {
    return false;
  }
  const colorlessNames = [
    "urza's tower", "urza's mine", "urza's power plant", "eldrazi temple", "wastes", 
    "darksteel citadel", "treasure vault", "blinkmoth nexus", "mutavault", "cabal coffers", 
    "wasteland", "ancient tomb", "reliquary tower", "ghost quarter", "field of ruin",
    "tectonic edge", "blast zone", "inventors' fair", "geier reach sanitarium", "llanowar reborn"
  ];
  return colorlessNames.some(cn => n.includes(cn));
};

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
  "thoughtcast": 1,
  "treasure cruise": 1,
  "dig through time": 2,
  "phyrexian fleshgorger": 3,
  "flare of denial": 0,
  "flare of cultivation": 0,
  "flare of malice": 0,
  "flare of fortitude": 0,
  "flare of duplication": 0,
  "lorien revealed": 1,
  "lórien revealed": 1,
  "lòrien revealed": 1,
  "lÃ³rien revealed": 1,
  "troll of khazad-dum": 1,
  "troll of khazad-dûm": 1,
  "oliphaunt": 1,
  "generous ent": 1,
  "eagles of the north": 1
};

export function getManaValue(card) {
  const name = (card.name || '').toLowerCase().trim();
  if (name in FUNCTIONAL_CMC_MAP) {
    return FUNCTIONAL_CMC_MAP[name];
  }
  return card.mana_value ?? card.cmc ?? MANA_VALUE_FALLBACK;
}

export function isLand(card) {
  if (!card) return false;
  const typeLine = (card.type_line || card.typeLine || '').toLowerCase();
  const name = (card.name || '').toLowerCase();
  const role = (card.role || '').toLowerCase();
  const BASIC_LAND_NAMES = ['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes', 'llanura', 'isla', 'pantano', 'montaña', 'bosque', 'yermo'];
  
  return typeLine.includes('land') ||
         role === 'land' ||
         role === 'mana_base' ||
         BASIC_LAND_NAMES.includes(name) ||
         BASIC_LAND_NAMES.some(b => name.startsWith(b));
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
  if (!card) return false;
  const layout = (card.layout || '').toLowerCase();
  return layout === 'modal_dfc' || (card.card_faces?.length === 2 && layout === 'transform');
}

export function isLandCycler(card) {
  if (!card) return false;
  const oracle = (card.oracle_text || '').toLowerCase();
  return oracle.includes('cycling') && 
         (oracle.includes('plainscycling') || 
          oracle.includes('islandcycling') || 
          oracle.includes('swampcycling') || 
          oracle.includes('mountaincycling') || 
          oracle.includes('forestcycling') || 
          oracle.includes('landcycling'));
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

export function calculateManaSources(deck) {
  if (!Array.isArray(deck)) return { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  
  const sources = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };

  // Determine the colors actually used by non-land cards in the deck
  const usedColors = new Set();
  deck.forEach(card => {
    if (!card) return;
    const typeLine = (card.type_line || card.type || '').toLowerCase();
    const isLandCard = typeLine.includes('land') || card.category === 'Land';
    
    if (!isLandCard) {
      const cost = (card.mana_cost || '').toUpperCase();
      if (cost.includes('W')) usedColors.add('W');
      if (cost.includes('U')) usedColors.add('U');
      if (cost.includes('B')) usedColors.add('B');
      if (cost.includes('R')) usedColors.add('R');
      if (cost.includes('G')) usedColors.add('G');
      
      if (Array.isArray(card.color_identity)) {
        card.color_identity.forEach(c => {
          const up = c.toUpperCase();
          if (['W', 'U', 'B', 'R', 'G'].includes(up)) {
            usedColors.add(up);
          }
        });
      }
      
      if (Array.isArray(card.card_faces)) {
        card.card_faces.forEach(face => {
          const fCost = (face.mana_cost || '').toUpperCase();
          if (fCost.includes('W')) usedColors.add('W');
          if (fCost.includes('U')) usedColors.add('U');
          if (fCost.includes('B')) usedColors.add('B');
          if (fCost.includes('R')) usedColors.add('R');
          if (fCost.includes('G')) usedColors.add('G');
        });
      }
    }
  });

  const colorsToIncrement = usedColors.size > 0 ? Array.from(usedColors) : ['W', 'U', 'B', 'R', 'G'];
  
  deck.forEach(card => {
    if (!card) return;
    const qty = card.quantity || 1;
    const name = (card.name || '').toLowerCase();
    const typeLine = (card.type_line || card.type || '').toLowerCase();
    const isLandCard = typeLine.includes('land') || card.category === 'Land';
    
    // 1. Fuentes de cualquier color (Tierras Tribales / Universales / Mana Dorks)
    const producesAnyColor = 
      name.includes('sliver hive') || name.includes('cavern of souls') || 
      name.includes('secluded courtyard') || name.includes('unclaimed territory') ||
      name.includes('mana confluence') || name.includes('city of brass') ||
      name.includes('manaweft sliver') || name.includes('gemhide sliver') ||
      name.includes('birds of paradise') || name.includes('noble hierarch') ||
      name.includes('ignoble hierarch') || name.includes('sylvan caryatid') ||
      name.includes('arcane signet') || name.includes('chromatic lantern');
      
    if (producesAnyColor) {
      colorsToIncrement.forEach(col => {
        sources[col] += qty;
      });
      return; // Si da todos los colores, ya hemos terminado con esta carta
    }
    
    // Solo continuar el conteo estricto para tierras o dorks específicos
    if (!isLandCard && !hasRampEffect(card)) return;

    if (name.includes('plains') || name.includes('llanura')) sources.W += qty;
    else if (name.includes('island') || name.includes('isla')) sources.U += qty;
    else if (name.includes('swamp') || name.includes('pantano')) sources.B += qty;
    else if (name.includes('mountain') || name.includes('montaña')) sources.R += qty;
    else if (name.includes('forest') || name.includes('bosque')) sources.G += qty;
    else {
      // Shock & Dual Lands & Triomes
      if (/tundra|hallowed fountain|glacial fortress|seachrome/i.test(name)) { sources.W += qty; sources.U += qty; }
      if (/underground sea|watery grave|drowned catacomb|darkslick/i.test(name)) { sources.U += qty; sources.B += qty; }
      if (/badlands|blood crypt|dragonskull|blackcleave/i.test(name)) { sources.B += qty; sources.R += qty; }
      if (/taiga|stomping ground|rootbound|copperline/i.test(name)) { sources.R += qty; sources.G += qty; }
      if (/savannah|temple garden|sunpetal|razorverge/i.test(name)) { sources.G += qty; sources.W += qty; }
      if (/scrubland|godless shrine|isolated chapel|concealed/i.test(name)) { sources.W += qty; sources.B += qty; }
      if (/volcanic island|steam vents|sulfur falls|spirebluff/i.test(name)) { sources.U += qty; sources.R += qty; }
      if (/bayou|overgrown tomb|woodland cemetery|blooming/i.test(name)) { sources.B += qty; sources.G += qty; }
      if (/plateau|sacred foundry|clifftop|inspiring/i.test(name)) { sources.R += qty; sources.W += qty; }
      if (/tropical island|breeding pool|hinterland|botanical/i.test(name)) { sources.G += qty; sources.U += qty; }
      
      // Triomes
      if (/raffine's tower/i.test(name)) { sources.W += qty; sources.U += qty; sources.B += qty; }
      if (/xander's lounge/i.test(name)) { sources.U += qty; sources.B += qty; sources.R += qty; }
      if (/ziatora's proving ground/i.test(name)) { sources.B += qty; sources.R += qty; sources.G += qty; }
      if (/jetmir's garden/i.test(name)) { sources.R += qty; sources.G += qty; sources.W += qty; }
      if (/spara's headquarters/i.test(name)) { sources.G += qty; sources.W += qty; sources.U += qty; }
      if (/indatha triome/i.test(name)) { sources.W += qty; sources.B += qty; sources.G += qty; }
      if (/ketria triome/i.test(name)) { sources.U += qty; sources.R += qty; sources.G += qty; }
      if (/raugrin triome/i.test(name)) { sources.U += qty; sources.R += qty; sources.W += qty; }
      if (/savai triome/i.test(name)) { sources.W += qty; sources.B += qty; sources.R += qty; }
      if (/zagoth triome/i.test(name)) { sources.U += qty; sources.B += qty; sources.G += qty; }
      
      // Horizon lands & pain lands
      if (/sunbaked canyon/i.test(name)) { sources.R += qty; sources.W += qty; }
      if (/fiery islet/i.test(name)) { sources.U += qty; sources.R += qty; }
      if (/silent clearing/i.test(name)) { sources.W += qty; sources.B += qty; }
      if (/nurturing peatland/i.test(name)) { sources.B += qty; sources.G += qty; }
      if (/waterlogged grove/i.test(name)) { sources.G += qty; sources.U += qty; }
      
      // Fetches (they count as any of their two colors)
      if (/flooded strand/i.test(name)) { sources.W += qty; sources.U += qty; }
      if (/polluted delta/i.test(name)) { sources.U += qty; sources.B += qty; }
      if (/bloodstained mire/i.test(name)) { sources.B += qty; sources.R += qty; }
      if (/wooded foothills/i.test(name)) { sources.R += qty; sources.G += qty; }
      if (/windswept heath/i.test(name)) { sources.G += qty; sources.W += qty; }
      if (/marsh flats/i.test(name)) { sources.W += qty; sources.B += qty; }
      if (/scalding tarn/i.test(name)) { sources.U += qty; sources.R += qty; }
      if (/verdant catacombs/i.test(name)) { sources.B += qty; sources.G += qty; }
      if (/arid mesa/i.test(name)) { sources.R += qty; sources.W += qty; }
      if (/misty rainforest/i.test(name)) { sources.G += qty; sources.U += qty; }
      if (/prismatic vista/i.test(name)) {
        colorsToIncrement.forEach(col => {
          sources[col] += qty;
        });
      }
    }
  });
  
  return sources;
}

const BASIC_LAND_NAMES = {
  W: 'Plains',
  U: 'Island',
  B: 'Swamp',
  R: 'Mountain',
  G: 'Forest'
};

export const BASIC_LANDS_BY_COLOR = {
  W: ["plains", "snow-covered plains", "llanura", "llanura nevada"],
  U: ["island", "snow-covered island", "isla", "isla nevada"],
  B: ["swamp", "snow-covered swamp", "pantano", "pantano nevado"],
  R: ["mountain", "snow-covered mountain", "montaña", "montaña nevada"],
  G: ["forest", "snow-covered forest", "bosque", "bosque nevado"]
};

const BASIC_LAND_NAMES_SET = new Set([
  "plains", "island", "swamp", "mountain", "forest", "wastes",
  "llanura", "isla", "pantano", "montaña", "bosque", "yermo",
  "snow-covered plains", "snow-covered island", "snow-covered swamp", 
  "snow-covered mountain", "snow-covered forest", "snow-covered wastes",
  "llanura nevada", "isla nevada", "pantano nevado", "montaña nevada", "bosque nevado", "yermo nevado"
]);

const COLORED_BASIC_LAND_NAMES_SET = new Set([
  "plains", "island", "swamp", "mountain", "forest",
  "llanura", "isla", "pantano", "montaña", "bosque",
  "snow-covered plains", "snow-covered island", "snow-covered swamp", 
  "snow-covered mountain", "snow-covered forest",
  "llanura nevada", "isla nevada", "pantano nevado", "montaña nevada", "bosque nevado"
]);

export function isBasicLand(name) {
  if (!name) return false;
  return BASIC_LAND_NAMES_SET.has(name.toLowerCase().trim());
}

export function isColoredBasicLand(name) {
  if (!name) return false;
  return COLORED_BASIC_LAND_NAMES_SET.has(name.toLowerCase().trim());
}

export function deckNeedsSnowLands(nonLandSpells) {
  if (!nonLandSpells || nonLandSpells.length === 0) return false;
  return nonLandSpells.some(s => {
    const cost = (s.mana_cost || '').toUpperCase();
    if (cost.includes('{S}')) return true;

    const oracle = (s.oracle_text || s.text || '').toLowerCase();
    if (/\bsnow\b/.test(oracle) || /\bnevada\b/.test(oracle)) return true;

    const type = (s.type_line || s.category || '').toLowerCase();
    if (/\bsnow\b/.test(type) || /\bnevada\b/.test(type)) return true;

    return false;
  });
}

export async function isLandFormatLegal(landName, format) {
  if (!landName) return false;
  const allCards = await getCachedCards();
  const formatKey = (format || 'MODERN').toLowerCase();
  const nameL = landName.toLowerCase().trim();
  const dbCard = allCards.find(ac => ac && ac.name && ac.name.toLowerCase().trim() === nameL);
  if (!dbCard) return false;
  return dbCard.legalities && dbCard.legalities[formatKey] === 'legal';
}

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
  
  // Deducción de tierras virtuales por MDFC/Cicladoras de tierras
  const mdfcAndCyclersCount = nonLandCards.filter(c => {
    const nameLower = (c.name || '').toLowerCase();
    const isManualMatch = [
      "malakir rebirth", "bala ged recovery", "shatterskull smashing", "agadeem's awakening", 
      "sejiri shelter", "lorien revealed", "lÃ³rien revealed", "lÃ³rien", "lórien", "oliphaunt", 
      "generous ent", "troll of khazad-dum", "eagles of the north", "fell the profane", 
      "witch enchanter", "bridgeworks battle", "sink into stupor", "stump stump"
    ].some(m => nameLower.includes(m));
    if (isManualMatch) return true;
    
    const isDynamicMdfc = isMDFC(c) && c.card_faces?.some(face => face.type_line?.toLowerCase().includes('land'));
    return isDynamicMdfc || isLandCycler(c);
  }).reduce((sum, c) => sum + (c.quantity || 1), 0);
  
  const mdfcLandReduction = Math.floor(mdfcAndCyclersCount / 2);
  lands -= mdfcLandReduction;
  
  const strategy = (formData?.strategy || '').toLowerCase().trim();
  const archetype = (formData?.archetype || '').toLowerCase().trim();
  
  // Detección de mazo sin tierras tradicionales (Oops! All Spells, Belcher, etc.)
  const isZeroLandsDeck = 
    strategy === 'oops_all_spells' || 
    strategy === 'belcher' || 
    strategy === 'zero_lands' || 
    strategy === 'no_lands' ||
    (formData?.maxLands === 0) ||
    (archetype === 'combo' && mdfcAndCyclersCount >= 10);
    
  if (isZeroLandsDeck) {
    return 0;
  }
  
  if (strategy === 'spellslinger' || strategy === 'voltron') {
    lands -= 1.5;
  }
  if (strategy === 'landfall') {
    lands += 2.0;
  }
  
  // Limites estrictos por arquetipo competitivo
  const isRampArchetype = (archetype === 'ramp' || strategy === 'ramp');
  if (archetype === 'aggro') {
    lands = Math.min(lands, 20);
  } else if (archetype === 'control') {
    lands = Math.min(Math.max(lands, 24), 26);
  } else if (isRampArchetype) {
    if (vmp > 3.5) {
      lands = Math.max(lands, 24);
    } else if (vmp > 3.0) {
      lands = Math.max(lands, 23);
    }
  } else if (archetype === 'combo' || archetype === 'midrange') {
    lands = Math.min(lands, 24);
  } else {
    // Por defecto si no detectamos arquetipo claro, limitamos a 24 para evitar mazos injugables
    lands = Math.min(lands, 24);
  }

  // Si es Ramp con curva alta, forzar el mínimo contextual
  if (isRampArchetype && vmp > 3.0) {
    const minRampLands = vmp > 3.5 ? 24 : 23;
    lands = Math.max(lands, minRampLands);
  }

  // Ajuste de curva bidireccional (sobreescribe límites superiores si la curva real es extrema)
  if (vmp >= 4.2 && aceleradores === 0) {
    lands = lands + 1.5;
  } else if (vmp <= 1.9) {
    lands = lands - 2.0;
  }

  const manaGreed = (formData?.manaGreed || 'balanced').toLowerCase();
  if (manaGreed === 'greedy') {
    lands -= 2.0;
  } else if (manaGreed === 'safe') {
    lands += 2.0;
  }
  
  if (isYorion) {
      lands = lands * (80 / 60);
  }
  
  let minLands = isYorion ? 24 : 18;
  if (isRampArchetype && vmp > 3.0) {
    minLands = vmp > 3.5 ? 24 : 23;
  }
  let maxLands = isYorion ? 35 : 26;
  if (manaGreed === 'greedy') {
    minLands = isYorion ? 21 : 15;
  } else if (manaGreed === 'safe') {
    maxLands = isYorion ? 38 : 28;
  }
  
  return Math.round(Math.max(minLands, Math.min(maxLands, lands)));
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

  const maxColoredLandsRequired = Math.max(0, ...colors.map(c => karstenRequirements[c] || 0));
  let maxColorlessLands = Math.max(0, totalLands - maxColoredLandsRequired);
  if (formData?.maxColorlessLandsLimit !== undefined) {
    maxColorlessLands = Math.min(maxColorlessLands, formData.maxColorlessLandsLimit);
  }
  let colorlessLandsInjected = 0;

  // Función de inyección de tierras controlada
  const injectLand = (land, qty) => {
    let finalQty = qty;
    if (isColorlessLand(land.name)) {
      const allowed = Math.max(0, maxColorlessLands - colorlessLandsInjected);
      if (allowed <= 0) {
        console.log(`[KARSTEN LIMIT] Omitiendo tierra incolora ${land.name} para mantener consistencia de color.`);
        return 0;
      }
      finalQty = Math.min(qty, allowed);
      colorlessLandsInjected += finalQty;
      if (finalQty < qty) {
        console.log(`[KARSTEN LIMIT] Reduciendo tierra incolora ${land.name} de ${qty} a ${finalQty} copias.`);
      }
    }
    
    if (finalQty > 0 && remainingLands >= finalQty) {
      const existing = manaBase.find(l => l.name.toLowerCase() === land.name.toLowerCase());
      if (existing) {
        existing.quantity += finalQty;
      } else {
        manaBase.push({
          ...land,
          quantity: finalQty
        });
      }
      remainingLands -= finalQty;
      return finalQty;
    }
    return 0;
  };
  
  // 1. INYECCIÓN INTELIGENTE DE TIERRAS DE UTILIDAD (AI TOP 1 RECOMMENDATIONS)
  let injectTronSuite = false;
  const targetTronLands = ["urza's tower", "urza's power plant", "urza's mine"];
  const hasExplicitTronAIRecomm = aiUtilityLands && aiUtilityLands.some(l => l && targetTronLands.includes(l.toLowerCase().trim()));
  if (strategy === 'tron' || archetype.includes('tron') || archetype.includes('urzatron') || hasExplicitTronAIRecomm) {
    injectTronSuite = true;
  }

  // A. TIERRAS TEMÁTICAS TRIBALES/ARQUETÍPICAS DINÁMICAS (SOMMELIER DE TIERRAS & CREATURE LANDS)
  const THEMATIC_LANDS_MAP = {
    merfolk: [
      { name: "Cavern of Souls", qty: 2, type: "Land — Tribal", color_identity: [] },
      { name: "Mutavault", qty: 2, type: "Land", color_identity: [] },
      { name: "Otawara, Soaring City", qty: 1, type: "Legendary Land", color_identity: ["U"] },
      { name: "Minamo, School at Water's Edge", qty: 1, type: "Legendary Land", color_identity: ["U"] }
    ],
    saprolings: [
      { name: "Boseiju, Who Endures", qty: 1, type: "Legendary Land", color_identity: ["G"] },
      { name: "Westvale Abbey", qty: 1, type: "Land", color_identity: [] },
      { name: "Castle Garenbrig", qty: 2, type: "Land", color_identity: ["G"] }
    ],
    goblins: [
      { name: "Cavern of Souls", qty: 2, type: "Land — Tribal", color_identity: [] },
      { name: "Den of the Bugbear", qty: 2, type: "Land", color_identity: ["R"] },
      { name: "Sokenzan, Crucible of Defiance", qty: 1, type: "Legendary Land", color_identity: ["R"] }
    ],
    zombies: [
      { name: "Cavern of Souls", qty: 2, type: "Land — Tribal", color_identity: [] },
      { name: "Unholy Grotto", qty: 2, type: "Land", color_identity: [] },
      { name: "Takenuma, Abandoned Mire", qty: 1, type: "Legendary Land", color_identity: ["B"] },
      { name: "Hive of the Eye Tyrant", qty: 1, type: "Land", color_identity: ["B"] }
    ],
    vampires: [
      { name: "Cavern of Souls", qty: 2, type: "Land — Tribal", color_identity: [] },
      { name: "Castle Locthwain", qty: 2, type: "Land", color_identity: ["B"] },
      { name: "Hive of the Eye Tyrant", qty: 1, type: "Land", color_identity: ["B"] }
    ],
    demons: [
      { name: "Cavern of Souls", qty: 2, type: "Land — Tribal", color_identity: [] },
      { name: "Castle Locthwain", qty: 2, type: "Land", color_identity: ["B"] },
      { name: "Takenuma, Abandoned Mire", qty: 1, type: "Legendary Land", color_identity: ["B"] }
    ],
    giants: [
      { name: "Cavern of Souls", qty: 2, type: "Land — Tribal", color_identity: [] },
      { name: "Den of the Bugbear", qty: 2, type: "Land", color_identity: ["R"] },
      { name: "Sokenzan, Crucible of Defiance", qty: 1, type: "Legendary Land", color_identity: ["R"] }
    ],
    angels: [
      { name: "Cavern of Souls", qty: 2, type: "Land — Tribal", color_identity: [] },
      { name: "Castle Ardenvale", qty: 2, type: "Land", color_identity: ["W"] },
      { name: "Eiganjo, Seat of the Empire", qty: 1, type: "Legendary Land", color_identity: ["W"] }
    ],
    slivers: [
      { name: "Sliver Hive", qty: 4, type: "Land", color_identity: [] },
      { name: "Cavern of Souls", qty: 2, type: "Land — Tribal", color_identity: [] },
      { name: "Secluded Courtyard", qty: 2, type: "Land — Tribal", color_identity: [] }
    ],
    sea_monsters: [
      { name: "Hall of Storm Giants", qty: 2, type: "Land — Cave", color_identity: ["U"] },
      { name: "Minamo, School at Water's Edge", qty: 1, type: "Legendary Land", color_identity: ["U"] },
      { name: "Otawara, Soaring City", qty: 1, type: "Legendary Land", color_identity: ["U"] }
    ],
    dragons: [
      { name: "Haven of the Spirit Dragon", qty: 4, type: "Land", color_identity: [] },
      { name: "Crucible of the Spirit Dragon", qty: 2, type: "Land", color_identity: [] }
    ],
    elves: [
      { name: "Castle Garenbrig", qty: 2, type: "Land", color_identity: ["G"] },
      { name: "Wirewood Lodge", qty: 1, type: "Land", color_identity: ["G"] },
      { name: "Boseiju, Who Endures", qty: 1, type: "Legendary Land", color_identity: ["G"] }
    ],
    artifacts: [
      { name: "Urza's Saga", qty: 4, type: "Land — Saga", color_identity: [] },
      { name: "Darksteel Citadel", qty: 4, type: "Artifact Land", color_identity: [] },
      { name: "Academy Ruins", qty: 1, type: "Legendary Land", color_identity: ["U"] }
    ],
    dinosaurs: [
      { name: "Sunken Citadel", qty: 2, type: "Land", color_identity: [] },
      { name: "Secluded Courtyard", qty: 2, type: "Land — Tribal", color_identity: [] }
    ]
  };

  let detectedTheme = null;
  const merfolkCount = nonLandSpells.filter(c => (c.type_line || '').toLowerCase().includes('merfolk')).reduce((sum, c) => sum + (c.quantity || 1), 0);
  const saprolingCount = nonLandSpells.filter(c => {
    const t = (c.type_line || '').toLowerCase();
    const o = (c.oracle_text || '').toLowerCase();
    return t.includes('saproling') || t.includes('fungus') || o.includes('saproling');
  }).reduce((sum, c) => sum + (c.quantity || 1), 0);
  const goblinCount = nonLandSpells.filter(c => (c.type_line || '').toLowerCase().includes('goblin')).reduce((sum, c) => sum + (c.quantity || 1), 0);
  const zombieCount = nonLandSpells.filter(c => (c.type_line || '').toLowerCase().includes('zombie')).reduce((sum, c) => sum + (c.quantity || 1), 0);
  const vampireCount = nonLandSpells.filter(c => (c.type_line || '').toLowerCase().includes('vampire')).reduce((sum, c) => sum + (c.quantity || 1), 0);
  const demonCount = nonLandSpells.filter(c => (c.type_line || '').toLowerCase().includes('demon')).reduce((sum, c) => sum + (c.quantity || 1), 0);
  const giantCount = nonLandSpells.filter(c => (c.type_line || '').toLowerCase().includes('giant')).reduce((sum, c) => sum + (c.quantity || 1), 0);
  const angelCount = nonLandSpells.filter(c => (c.type_line || '').toLowerCase().includes('angel')).reduce((sum, c) => sum + (c.quantity || 1), 0);
  const sliverCount = nonLandSpells.filter(c => (c.type_line || '').toLowerCase().includes('sliver')).reduce((sum, c) => sum + (c.quantity || 1), 0);
  const seaMonsterCount = nonLandSpells.filter(c => {
    const type = (c.type_line || '').toLowerCase();
    return type.includes('kraken') || type.includes('leviathan') || type.includes('serpent') || type.includes('octopus');
  }).reduce((sum, c) => sum + (c.quantity || 1), 0);
  const dragonCount = nonLandSpells.filter(c => (c.type_line || '').toLowerCase().includes('dragon')).reduce((sum, c) => sum + (c.quantity || 1), 0);
  const elfCount = nonLandSpells.filter(c => {
    const type = (c.type_line || '').toLowerCase();
    return type.includes('elf') || type.includes('elves');
  }).reduce((sum, c) => sum + (c.quantity || 1), 0);
  const dinoCount = nonLandSpells.filter(c => (c.type_line || '').toLowerCase().includes('dinosaur')).reduce((sum, c) => sum + (c.quantity || 1), 0);
  const artifactCount = nonLandSpells.filter(c => (c.type_line || '').toLowerCase().includes('artifact')).reduce((sum, c) => sum + (c.quantity || 1), 0);

  if (merfolkCount >= 6 || tribe === 'merfolk' || archetype.includes('merfolk')) {
    detectedTheme = 'merfolk';
  } else if (saprolingCount >= 6 || tribe.includes('saproling') || tribe.includes('fungus')) {
    detectedTheme = 'saprolings';
  } else if (goblinCount >= 6 || tribe === 'goblin' || tribe === 'goblins') {
    detectedTheme = 'goblins';
  } else if (zombieCount >= 6 || tribe === 'zombie' || tribe === 'zombies') {
    detectedTheme = 'zombies';
  } else if (vampireCount >= 6 || tribe === 'vampire' || tribe === 'vampires') {
    detectedTheme = 'vampires';
  } else if (demonCount >= 6 || tribe === 'demon' || tribe === 'demons') {
    detectedTheme = 'demons';
  } else if (giantCount >= 6 || tribe === 'giant' || tribe === 'giants') {
    detectedTheme = 'giants';
  } else if (angelCount >= 6 || tribe === 'angel' || tribe === 'angels') {
    detectedTheme = 'angels';
  } else if (sliverCount >= 6 || tribe === 'sliver' || tribe === 'slivers') {
    detectedTheme = 'slivers';
  } else if (seaMonsterCount >= 6 || tribe === 'sea_monsters' || archetype.includes('sea_monsters')) {
    detectedTheme = 'sea_monsters';
  } else if (dragonCount >= 6 || tribe === 'dragons' || archetype.includes('dragons')) {
    detectedTheme = 'dragons';
  } else if (elfCount >= 8 || tribe === 'elves' || archetype.includes('elves')) {
    detectedTheme = 'elves';
  } else if (dinoCount >= 6 || tribe === 'dinosaurs' || archetype.includes('dino')) {
    detectedTheme = 'dinosaurs';
  } else if (artifactCount >= 12 || strategy === 'affinity' || archetype.includes('affinity')) {
    detectedTheme = 'artifacts';
  }

  const allCards = await getCachedCards();
  const formatKey = format.toLowerCase();
  
  const isLandFormatLegal = (landName) => {
    const nameL = landName.toLowerCase().trim();
    const dbCard = allCards.find(ac => ac && ac.name && ac.name.toLowerCase().trim() === nameL);
    if (!dbCard) return false;
    return dbCard.legalities && dbCard.legalities[formatKey] === 'legal';
  };

  const needsSnow = deckNeedsSnowLands(nonLandSpells);
  const canUseSnow = needsSnow && isLandFormatLegal("Snow-Covered Island");
  if (canUseSnow) {
    console.log(`[SOMMELIER TIERRAS] Mazo requiere nieve y es legal en ${format}. Se inyectarán tierras nevadas.`);
  }

  if (detectedTheme && THEMATIC_LANDS_MAP[detectedTheme]) {
    console.log(`[SOMMELIER TIERRAS] Tema detectado: ${detectedTheme}. Evaluando tierras temáticas.`);
    THEMATIC_LANDS_MAP[detectedTheme].forEach(land => {
      if (!isLandFormatLegal(land.name)) {
        console.log(`[SOMMELIER TIERRAS] Omitiendo tierra temática ${land.name} porque no es legal en ${format}.`);
        return;
      }
      if (land.color_identity && land.color_identity.length > 0) {
        const matchesColors = land.color_identity.some(c => actualColors.includes(c));
        if (!matchesColors) {
          console.log(`[SOMMELIER TIERRAS] Omitiendo tierra temática ${land.name} porque no coincide con los colores del mazo.`);
          return;
        }
      }
      injectLand({
        name: land.name,
        category: 'Land',
        type_line: land.type,
        color_identity: land.color_identity,
        role: "thematic-utility-land"
      }, land.qty);
    });
  }

  // B. PROCESAMIENTO DE TIERRAS DE UTILIDAD SUGERIDAS POR IA
  if (aiUtilityLands && aiUtilityLands.length > 0) {
      console.log(`[MANABASE GENERATOR] Procesando ${aiUtilityLands.length} tierras de utilidad sugeridas por IA.`);
      const uniqueUtils = {};
      let totalUtilityAdded = 0;
      
      aiUtilityLands.forEach(landName => {
          if (injectTronSuite && landName && landName.includes("Urza's")) return; // Saltarse tierras de Urza
          if (!uniqueUtils[landName]) uniqueUtils[landName] = 0;
          uniqueUtils[landName]++;
      });

      const sortedUtils = Object.entries(uniqueUtils).sort((a, b) => b[1] - a[1]).slice(0, 2);

      for (const [landName, qty] of sortedUtils) {
          const copiesToAdd = Math.min(qty, 4 - totalUtilityAdded);
          if (copiesToAdd > 0) {
              injectLand({
                  name: landName,
                  category: 'Land',
                  type_line: 'Land',
                  color_identity: [],
                  role: "ai-utility-land"
              }, copiesToAdd);
              totalUtilityAdded += copiesToAdd;
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
    if (tribe === 'eldrazi' || formColors.length === 0 || (formColors.includes('C') && actualColors.length === 0)) {
        tronSuite.push({ name: "Eldrazi Temple", quantity: 4, type_line: "Land — Eldrazi" });
        tronSuite.push({ name: "Wastes", quantity: 2, type_line: "Basic Land — Wastes" });
    }
    
    tronSuite.forEach(land => {
      injectLand({
        name: land.name,
        category: 'Land',
        type_line: land.type_line,
        color_identity: []
      }, land.quantity);
    });

    if (formColors.includes('G')) {
      injectLand({ name: "Boseiju, Who Endures", category: "Land", type_line: "Legendary Land", color_identity: ["G"] }, 1);
    }
    if (formColors.includes('U')) {
      injectLand({ name: "Otawara, Soaring City", category: "Land", type_line: "Legendary Land", color_identity: ["U"] }, 1);
    }
  }
  // A2. ELDRAZI AGGRO/MIDRANGE
  else if (tribe === 'eldrazi') {
    const eldraziSuite = [
      { name: "Eldrazi Temple", quantity: 4, type_line: "Land — Eldrazi" },
      { name: "Wastes", quantity: 1, type_line: "Basic Land — Wastes" }
    ];
    
    eldraziSuite.forEach(land => {
      injectLand({
        name: land.name,
        category: 'Land',
        type_line: land.type_line,
        color_identity: []
      }, land.quantity);
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
      injectLand({
        name: land.name,
        category: 'Land',
        type_line: land.type_line,
        color_identity: []
      }, land.quantity);
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
      injectLand({
        name: land.name,
        category: 'Land',
        type_line: land.type_line,
        color_identity: land.name === "Pendelhaven" ? ["G"] : []
      }, land.quantity);
    });
  }
  // D. REANIMATOR
  else if (strategy === 'reanimator') {
    if (formColors.includes('B')) {
      injectLand({ name: "Takenuma, Abandoned Mire", category: "Land", type_line: "Legendary Land", color_identity: ["B"] }, 1);
    }
    injectLand({ name: "Geier Reach Sanitarium", category: "Land", type_line: "Legendary Land", color_identity: [] }, 1);
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
      injectLand({
        name: h.name,
        category: 'Land',
        type_line: 'Land — Canopy',
        color_identity: h.colors
      }, qty);
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
              const added = injectLand({
                  name: tl.name,
                  category: 'Land',
                  type_line: 'Land — Tribal',
                  color_identity: []
              }, qty);
              tribalAdded += added;
          }
      });
  }

  // 2. DETECCIÓN DE FORMATO Y GENERACIÓN DE DUAL LANDS PROFESIONALES
  console.log(`[MANABASE GENERATOR] Generando base de maná profesional para formato: ${format}`);

  // Base de datos de dual lands por formato
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

  const surveilLands = [
    { name: 'Undercity Sewers', colors: ['U', 'B'] },
    { name: 'Thundering Falls', colors: ['U', 'R'] },
    { name: 'Underground Mortuary', colors: ['B', 'G'] },
    { name: 'Lush Portico', colors: ['G', 'W'] },
    { name: 'Meticulous Archive', colors: ['W', 'U'] },
    { name: 'Raucous Theater', colors: ['B', 'R'] },
    { name: 'Commercial District', colors: ['R', 'G'] },
    { name: 'Elegant Parlor', colors: ['R', 'W'] },
    { name: 'Shadowy Backstreet', colors: ['W', 'B'] },
    { name: 'Hedge Maze', colors: ['G', 'U'] }
  ].filter(land => !BATTLEBOX_VETOS.includes(land.name));

  const restlessLands = [
    { name: 'Restless Cottage', colors: ['B', 'G'] },
    { name: 'Restless Vents', colors: ['B', 'R'] },
    { name: 'Restless Reef', colors: ['U', 'B'] },
    { name: 'Restless Spire', colors: ['U', 'R'] },
    { name: 'Restless Ridge', colors: ['R', 'G'] },
    { name: 'Restless Prairie', colors: ['G', 'W'] },
    { name: 'Restless Anchorage', colors: ['W', 'U'] },
    { name: 'Restless Bivouac', colors: ['R', 'W'] },
    { name: 'Restless Fortress', colors: ['W', 'B'] },
    { name: 'Restless Vinestalk', colors: ['G', 'U'] }
  ].filter(land => !BATTLEBOX_VETOS.includes(land.name));

  const pathways = [
    { name: 'Barkchannel Pathway // Tidechannel Pathway', colors: ['G', 'U'] },
    { name: 'Blightstep Pathway // Searstep Pathway', colors: ['B', 'R'] },
    { name: 'Branchloft Pathway // Boulderloft Pathway', colors: ['G', 'W'] },
    { name: 'Clearwater Pathway // Murkwater Pathway', colors: ['U', 'B'] },
    { name: 'Darkbore Pathway // Slitherbore Pathway', colors: ['B', 'G'] },
    { name: 'Hengegate Pathway // Mistgate Pathway', colors: ['W', 'U'] },
    { name: 'Needleverge Pathway // Pillarverge Pathway', colors: ['R', 'W'] },
    { name: 'Riverglide Pathway // Lavaglide Pathway', colors: ['U', 'R'] },
    { name: 'Brightclimb Pathway // Grimclimb Pathway', colors: ['W', 'B'] },
    { name: 'Cragcrown Pathway // Timbercrown Pathway', colors: ['R', 'G'] }
  ].filter(land => !BATTLEBOX_VETOS.includes(land.name));

  const temples = [
    { name: 'Temple of Deceit', colors: ['U', 'B'] },
    { name: 'Temple of Epiphany', colors: ['U', 'R'] },
    { name: 'Temple of Malady', colors: ['B', 'G'] },
    { name: 'Temple of Plenty', colors: ['G', 'W'] },
    { name: 'Temple of Enlightenment', colors: ['W', 'U'] },
    { name: 'Temple of Malice', colors: ['B', 'R'] },
    { name: 'Temple of Abandon', colors: ['R', 'G'] },
    { name: 'Temple of Triumph', colors: ['R', 'W'] },
    { name: 'Temple of Silence', colors: ['W', 'B'] },
    { name: 'Temple of Mystery', colors: ['G', 'U'] }
  ].filter(land => !BATTLEBOX_VETOS.includes(land.name));

  const crowdLands = [
    { name: 'Morphic Pool', colors: ['U', 'B'] },
    { name: 'Luxury Suite', colors: ['B', 'R'] },
    { name: 'Sea of Clouds', colors: ['W', 'U'] },
    { name: 'Spire Garden', colors: ['R', 'G'] },
    { name: 'Bountiful Promenade', colors: ['G', 'W'] },
    { name: 'Vault of Champions', colors: ['W', 'B'] },
    { name: 'Training Center', colors: ['U', 'R'] },
    { name: 'Undergrowth Stadium', colors: ['B', 'G'] },
    { name: 'Spectator Seating', colors: ['R', 'W'] },
    { name: 'Rejuvenating Springs', colors: ['G', 'U'] }
  ].filter(land => !BATTLEBOX_VETOS.includes(land.name));

  // Función de prioridad de tierras duales según formato y preferencia del usuario
  function getDualLandsPriority(format, style) {
    const isBudget = style === 'budget';
    const isNoPain = style === 'no-pain';
    const isUtility = style === 'utility';

    if (format === 'COMMANDER') {
      if (isBudget) return ['temples', 'pains', 'slow', 'fast'];
      if (isNoPain) return ['crowd', 'slow', 'surveil', 'restless', 'fast'];
      if (isUtility) return ['restless', 'crowd', 'fetches', 'shocks', 'slow'];
      return ['crowd', 'fetches', 'shocks', 'slow', 'fast', 'triomes', 'surveil'];
    }

    if (format === 'LEGACY') {
      if (isBudget) return ['pains', 'temples'];
      if (isNoPain) return ['duals', 'slow', 'fast', 'surveil'];
      if (isUtility) return ['duals', 'fetches', 'slow', 'restless'];
      return ['duals', 'fetches', 'shocks'];
    }

    if (format === 'MODERN') {
      if (isBudget) return ['pains', 'temples', 'slow', 'fast'];
      if (isNoPain) return ['fast', 'slow', 'surveil', 'pathways', 'restless'];
      if (isUtility) return ['restless', 'fetches', 'shocks', 'slow', 'fast'];
      return ['fetches', 'shocks', 'fast', 'slow', 'triomes', 'surveil'];
    }

    if (format === 'PIONEER') {
      if (isBudget) return ['pains', 'temples', 'slow', 'fast'];
      if (isNoPain) return ['fast', 'slow', 'surveil', 'pathways', 'restless'];
      if (isUtility) return ['restless', 'shocks', 'slow', 'fast', 'pathways'];
      return ['shocks', 'fast', 'slow', 'pathways', 'surveil', 'pains'];
    }

    // STANDARD
    if (format === 'STANDARD') {
      if (isBudget) return ['pains', 'slow', 'fast'];
      if (isNoPain) return ['fast', 'slow', 'surveil', 'restless'];
      if (isUtility) return ['restless', 'fast', 'slow', 'surveil'];
      return ['fast', 'slow', 'surveil', 'restless', 'pains'];
    }

    return ['fetches', 'shocks', 'fast', 'slow'];
  }

  // --- MINIMUM BASIC LANDS GUARANTEE ---
  const currentMinBasics = Math.max(1, Math.min(minBasics, remainingLands - 2));

  if (isMulticolor) {
    const style = (formData?.manaBaseStyle || 'competitive').toLowerCase();
    
    // Determine limits based on color count and non-creature spell density
    let maxCopiesPerUnique;
    if (format === 'COMMANDER') {
      maxCopiesPerUnique = 1; // Commander is strictly singleton
    } else if (actualColors.length >= 4) {
      maxCopiesPerUnique = nonCreatureCount >= 8 ? 2 : 1;
    } else if (actualColors.length === 3) {
      maxCopiesPerUnique = nonCreatureCount >= 8 ? 3 : 2;
    } else {
      maxCopiesPerUnique = 4;
    }

    let maxTotalDuals = Math.min(16, Math.max(12, totalLands - currentMinBasics));
    if (format === 'COMMANDER') {
      maxTotalDuals = 25;
    }
    let totalDualsInjected = 0;

    // 2. DETECCIÓN DE FORMATO Y GENERACIÓN DE DUAL LANDS PROFESIONALES
    console.log(`[MANABASE GENERATOR] Generando base de maná profesional para formato: ${format} (Estilo: ${style})`);

    // Inyección especial de Command Tower para Commander
    if (format === 'COMMANDER') {
      if (isLandFormatLegal("Command Tower")) {
        injectLand({
          name: "Command Tower",
          category: 'Land',
          type_line: 'Land — Tower',
          color_identity: actualColors
        }, 1);
      }
      if (actualColors.length >= 3 && isLandFormatLegal("Exotic Orchard")) {
        injectLand({
          name: "Exotic Orchard",
          category: 'Land',
          type_line: 'Land — Orchard',
          color_identity: actualColors
        }, 1);
      }
    }

    // A. Triomes (Modern/Pioneer/Commander and 3+ Colors)
    const curve = (formData?.curveProfile || '').toLowerCase();
    const isAggressive = curve === 'aggressive' || curve === 'blitz' || archetype === 'aggro';
    
    if (actualColors.length >= 3 && (format === 'MODERN' || format === 'PIONEER' || format === 'COMMANDER') && remainingLands > currentMinBasics && !isAggressive) {
      const maxTriomes = (format === 'COMMANDER') ? 3 : ((actualColors.length >= 4) ? 2 : 1);
      let triomesInjected = 0;
      const validTriomes = triomes.filter(t => t.colors.every(c => actualColors.includes(c)));

      validTriomes.forEach(t => {
        if (triomesInjected >= maxTriomes || remainingLands <= currentMinBasics) return;
        const injected = injectLand({
          name: t.name,
          category: 'Land',
          type_line: 'Land — Triome',
          color_identity: t.colors
        }, 1);
        if (injected > 0) {
          triomesInjected++;
          console.log(`[MANABASE GENERATOR] Inyectado Trioma: 1x ${t.name}`);
        }
      });
    }

    // B. Inyectar tierras duales prioritarias según el formato y el estilo seleccionado
    const priorities = getDualLandsPriority(format, style);
    
    const categoryPools = {
      fetches: fetchLands,
      shocks: shockLands,
      duals: legacyDuals,
      fast: fastLands,
      slow: slowLands,
      surveil: surveilLands,
      restless: restlessLands,
      pathways: pathways,
      pains: painLands,
      temples: temples,
      crowd: crowdLands
    };

    // Deducir qué colores tienen pips de coste bajo (CMC <= 2)
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

    priorities.forEach(category => {
      const pool = categoryPools[category];
      if (!pool) return;

      // Filtrar tierras del pool válidas para los colores
      const validLands = pool.filter(l => l.colors.every(c => actualColors.includes(c)));

      // Ordenar por pips necesitados
      validLands.sort((a, b) => {
        const sumA = a.colors.reduce((sum, c) => sum + (pipBalance[c] || 0), 0);
        const sumB = b.colors.reduce((sum, c) => sum + (pipBalance[c] || 0), 0);
        return sumB - sumA;
      });

      validLands.forEach(land => {
        if (totalDualsInjected >= maxTotalDuals || remainingLands <= currentMinBasics) return;
        if (!isLandFormatLegal(land.name)) return;

        // Determinar cantidad a inyectar
        let maxQty = maxCopiesPerUnique;
        if (format !== 'COMMANDER') {
          if (category === 'fetches') {
            maxQty = 4;
          } else if (category === 'shocks') {
            maxQty = (actualColors.length === 2 ? 4 : 2);
          } else if (category === 'duals') {
            maxQty = (actualColors.length === 2 ? 4 : 2);
          } else if (category === 'fast') {
            const hasEarlyPip = land.colors.some(c => lowCmcColors.has(c));
            maxQty = (hasEarlyPip || archetype === 'aggro' || format === 'STANDARD') ? 4 : 2;
          } else if (category === 'slow') {
            maxQty = (archetype === 'control' || archetype === 'midrange') ? 4 : 2;
          } else if (category === 'restless') {
            maxQty = 2; // Las man-lands son lentas, máximo 2
          } else if (category === 'surveil') {
            maxQty = 2; // Surveil lands entran giradas, máximo 2
          } else if (category === 'pains') {
            maxQty = (actualColors.length === 2 ? 4 : 2);
          } else if (category === 'temples') {
            maxQty = 2; // Temples entran giradas, máximo 2
          }
        }

        let qty = Math.min(maxQty, remainingLands - currentMinBasics);
        qty = Math.min(qty, maxTotalDuals - totalDualsInjected);

        if (qty > 0) {
          const typeLabel = category.charAt(0).toUpperCase() + category.slice(1);
          const added = injectLand({
            name: land.name,
            category: 'Land',
            type_line: `Land — ${typeLabel}`,
            color_identity: land.colors
          }, qty);
          if (added > 0) {
            totalDualsInjected += added;
            console.log(`[MANABASE GENERATOR] [${style.toUpperCase()}] Inyectada dual (${category}): ${added}x ${land.name}`);
          }
        }
      });
    });

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
        const added = injectLand({
          name: land.name,
          category: 'Land',
          type_line: land.type,
          color_identity: [monoColor]
        }, qty);
        totalUtilityAdded += added;
      }
    });

    // Incoloro explícito ('C') en Monocolor
    if (formColors.includes('C') && remainingLands > currentMinBasics) {
      const painMatch = painLands.find(p => p.colors.includes(monoColor));
      if (painMatch) {
        let quantity = Math.min(4, remainingLands - currentMinBasics);
        if (quantity > 0) {
          injectLand({
            name: painMatch.name,
            category: 'Land',
            type_line: 'Land — Pain',
            color_identity: painMatch.colors
          }, quantity);
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
    const SNOW_BASIC_LAND_NAMES = {
      W: 'Snow-Covered Plains',
      U: 'Snow-Covered Island',
      B: 'Snow-Covered Swamp',
      R: 'Snow-Covered Mountain',
      G: 'Snow-Covered Forest'
    };
    const finalBasicNames = canUseSnow ? SNOW_BASIC_LAND_NAMES : BASIC_LAND_NAMES;

    Object.keys(basicLandsDistribution).forEach(color => {
      const count = basicLandsDistribution[color];
      if (count > 0) {
        const landName = finalBasicNames[color] || (canUseSnow ? 'Snow-Covered Plains' : 'Plains');
        manaBase.push({
          name: landName,
          quantity: count,
          category: 'Land',
          type_line: canUseSnow ? `Basic Snow Land — ${landName.replace('Snow-Covered ', '')}` : `Basic Land — ${landName}`,
          color_identity: [color]
        });
        remainingLands -= count;
      }
    });
  }

  if (remainingLands > 0) {
    const SNOW_BASIC_LAND_NAMES = {
      W: 'Snow-Covered Plains',
      U: 'Snow-Covered Island',
      B: 'Snow-Covered Swamp',
      R: 'Snow-Covered Mountain',
      G: 'Snow-Covered Forest'
    };
    const finalBasicNames = canUseSnow ? SNOW_BASIC_LAND_NAMES : BASIC_LAND_NAMES;
    const fallbackLand = formColors.includes('C') ? 'Wastes' : (finalBasicNames[actualColors[0]] || (canUseSnow ? 'Snow-Covered Plains' : 'Plains'));
    manaBase.push({
      name: fallbackLand,
      quantity: remainingLands,
      category: 'Land',
      type_line: canUseSnow && fallbackLand !== 'Wastes' ? `Basic Snow Land — ${fallbackLand.replace('Snow-Covered ', '')}` : `Basic Land — ${fallbackLand}`,
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

export function checkCardManaRequirement(card, sources, deckSize = 60) {
  const result = { ok: true, required: 0, actual: 0, deficit: 0, color: '' };
  if (!card) return result;
  
  const cost = (card.mana_cost || card.cost || '').toUpperCase();
  const cmc = Number(card.mana_value !== undefined ? card.mana_value : (card.cmc || 0));
  
  if (!cost || card.category === 'Land') return result;
  
  const colorsToCheck = ['W', 'U', 'B', 'R', 'G'];
  let maxDeficit = 0;
  let targetColor = '';
  let targetReq = 0;
  let targetAct = 0;
  
  colorsToCheck.forEach(color => {
    const symbol = `{${color}}`;
    const pipsCount = (cost.split(symbol).length - 1);
    if (pipsCount <= 0) return;
    
    let req = 0;
    if (pipsCount === 1) {
      if (cmc <= 1) {
        req = 14;
      } else if (cmc === 2) {
        req = 13;
      } else if (cmc === 3) {
        req = 12;
      } else if (cmc === 4) {
        req = 11;
      } else {
        req = 10;
      }
    } else if (pipsCount === 2) {
      if (cmc === 2) {
        req = 21;
      } else if (cmc === 3) {
        req = 18;
      } else if (cmc === 4) {
        req = 16;
      } else {
        req = 14;
      }
    } else if (pipsCount >= 3) {
      req = 22;
    }
    
    if (deckSize === 80) {
      req = Math.round(req * (80 / 60));
    }
    
    const actualSources = sources ? (sources[color] || 0) : 0;
    const deficit = Math.max(0, req - actualSources);
    
    if (deficit > maxDeficit || (deficit === maxDeficit && req > targetReq)) {
      maxDeficit = deficit;
      targetColor = color;
      targetReq = req;
      targetAct = actualSources;
    }
  });
  
  if (maxDeficit > 0) {
    result.ok = false;
    result.required = targetReq;
    result.actual = targetAct;
    result.deficit = maxDeficit;
    result.color = targetColor;
  }
  
  return result;
}