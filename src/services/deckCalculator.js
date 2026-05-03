import { CARD_TYPES, DECK_SIZES } from '../utils/mtgConstants.js';
import { BATTLEBOX_BANLIST } from '../constants/legacyBattleBox';

const MANA_VALUE_FALLBACK = 3;

const RAMP_KEYWORDS = ['search your library for a basic land', 'search your library for a land', 'add'];
const DRAW_KEYWORDS = ['draw a card', 'draw cards', 'draw'];

const RARITY_WEIGHTS = {
  mythic: 0.74,
  rare: 0.38,
  uncommon: 0.38,
  common: 0,
};

export function getManaValue(card) {
  return card.mana_value ?? MANA_VALUE_FALLBACK;
}

export function isLand(card) {
  const typeLine = card.type_line?.toLowerCase() ?? '';
  return typeLine.includes('land') || card.type_line === 'Land';
}

export function hasRampEffect(card) {
  const oracle = card.oracle_text?.toLowerCase() ?? '';
  return RAMP_KEYWORDS.some(keyword => oracle.includes(keyword));
}

export function hasDrawEffect(card) {
  const oracle = card.oracle_text?.toLowerCase() ?? '';
  return DRAW_KEYWORDS.some(keyword => oracle.includes(keyword));
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
  
  const totalManaValue = nonLandCards.reduce((sum, card) => {
    return sum + getManaValue(card);
  }, 0);
  
  return totalManaValue / nonLandCards.length;
}

export function calculateRA(nonLandCards) {
  return nonLandCards.filter(card => {
    const mv = getManaValue(card);
    return mv <= 2 && isRampOrDraw(card);
  }).length;
}

export function calculateMDFCAdjustment(cards) {
  return cards.reduce((total, card) => {
    return total + getMDFCAdjustment(card);
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
  const totalCards = cards.length;
  const lands = cards.filter(card => isLand(card)).length;
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

export async function generateManaBase(pipBalance, totalLands, colorIdentity, format) {
  if (!pipBalance) {
    pipBalance = { W: 20, U: 20, B: 20, R: 20, G: 20 };
  }
  
  const colors = colorIdentity.length > 0 ? colorIdentity : ['W'];
  const totalPips = Object.values(pipBalance).reduce((a, b) => a + b, 0) || 1;
  const isMulticolor = colors.length >= 2;
  
  const manaBase = [];

  const legacyDuals = [
    { name: 'Underground Sea', colors: ['U', 'B'] },
    { name: 'Volcanic Island', colors: ['U', 'R'] },
    { name: 'Tropical Island', colors: ['U', 'G'] },
    { name: 'Tundra', colors: ['W', 'U'] },
    { name: 'Badlands', colors: ['B', 'R'] },
    { name: 'Taiga', colors: ['R', 'G'] },
    { name: 'Savannah', colors: ['G', 'W'] },
    { name: 'Scrubland', colors: ['W', 'B'] },
    { name: 'Bayou', colors: ['B', 'G'] },
    { name: 'Plateau', colors: ['R', 'W'] }
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

  let remainingLands = totalLands;

  if (isMulticolor) {
    // 1. DUAL LANDS (hasta 4 copias de las válidas para los colores)
    const validDuals = legacyDuals.filter(d => d.colors.every(c => colors.includes(c)));
    validDuals.forEach(dual => {
      // 4 copias si son 2 colores, 2 copias si son 3+ colores para no ahogar el mazo
      const quantity = colors.length === 2 ? 4 : 2;
      if (remainingLands >= quantity) {
        manaBase.push({
          name: dual.name,
          quantity: quantity,
          category: 'Land',
          type_line: 'Land — Dual',
          color_identity: dual.colors
        });
        remainingLands -= quantity;
      }
    });

    // 2. FETCHLANDS (hasta 8 copias distribuidas)
    const validFetches = fetchLands.filter(f => f.colors.every(c => colors.includes(c)));
    let fetchesAllocated = 0;
    validFetches.forEach(fetch => {
      // 4 copias por fetch, máximo 8 fetchlands en total
      const quantity = colors.length === 2 ? 4 : 3;
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

  // 3. TIERRAS BÁSICAS (Para el resto del hueco, basado en Pip Balance)
  const sortedColors = [...colors].sort((a, b) => pipBalance[b] - pipBalance[a]);
  const initialRemainingForBasics = remainingLands;

  sortedColors.forEach((color, idx) => {
    if (remainingLands <= 0) return;
    
    let count;
    if (idx === sortedColors.length - 1) {
      // El último color se lleva todo el resto para asegurar llegar al total exacto
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

  console.log(`🌍 Generadas EXACTAMENTE ${totalLands} tierras en formato Profesional Legacy.`);
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