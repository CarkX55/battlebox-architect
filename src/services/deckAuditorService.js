import { 
  getManaValue, 
  isLand, 
  calculateVMP, 
  calculatePerfectLandCount 
} from './deckCalculator.js';
import { CORE_PACKAGES } from '../constants/corePackages.js';
import { COMPETITIVE_ANTI_SYNERGIES } from '../constants/legacyBattleBox.js';

export const CURVE_BOUNDS = {
  blitz: { min: 0.5, max: 1.8 },
  aggressive: { min: 1.8, max: 2.4 },
  balanced: { min: 2.2, max: 3.2 },
  heavy: { min: 2.8, max: 3.8 }
};

export const ARCHETYPE_PILLAR_PROFILES = {
  aggro:    { ramp: 0, draw: 2, removal: 4, threats: 20, protection: 0 },
  tribal:   { ramp: 0, draw: 2, removal: 4, threats: 22, protection: 0 },
  tempo:    { ramp: 0, draw: 6, removal: 8, threats: 10, protection: 2 },
  midrange: { ramp: 2, draw: 4, removal: 8, threats: 12, protection: 2 },
  control:  { ramp: 2, draw: 8, removal: 14, threats: 4,  protection: 2 },
  combo:    { ramp: 4, draw: 8, removal: 4, threats: 6,  protection: 4 },
  ramp:     { ramp: 10, draw: 4, removal: 4, threats: 8,  protection: 2 },
  storm:    { ramp: 8, draw: 14, removal: 0, threats: 2,  protection: 2 },
  prison:   { ramp: 2, draw: 4, removal: 10, threats: 6,  protection: 4 }
};

export function getArchetypePillarProfile(archetype, tribe, format = 'MODERN') {
  const isCommander = format?.toUpperCase() === 'COMMANDER';
  const archLower = (archetype || 'midrange').toLowerCase();
  const hasTribe = tribe && tribe !== 'none' && tribe !== 'ninguna';
  
  let baseProfile = ARCHETYPE_PILLAR_PROFILES.midrange;
  
  if (hasTribe && !['control', 'combo', 'prison', 'storm', 'cascade', 'reanimator'].includes(archLower)) {
    baseProfile = ARCHETYPE_PILLAR_PROFILES.tribal;
  } else if (ARCHETYPE_PILLAR_PROFILES[archLower]) {
    baseProfile = ARCHETYPE_PILLAR_PROFILES[archLower];
  } else {
    if (archLower.includes('aggro') || archLower.includes('burn') || archLower.includes('affinity')) {
      baseProfile = ARCHETYPE_PILLAR_PROFILES.aggro;
    } else if (archLower.includes('tempo') || archLower.includes('delver')) {
      baseProfile = ARCHETYPE_PILLAR_PROFILES.tempo;
    } else if (archLower.includes('control')) {
      baseProfile = ARCHETYPE_PILLAR_PROFILES.control;
    } else if (archLower.includes('combo') || archLower.includes('reanimator')) {
      baseProfile = ARCHETYPE_PILLAR_PROFILES.combo;
    } else if (archLower.includes('ramp') || archLower.includes('tron')) {
      baseProfile = ARCHETYPE_PILLAR_PROFILES.ramp;
    } else if (archLower.includes('prison') || archLower.includes('stax')) {
      baseProfile = ARCHETYPE_PILLAR_PROFILES.prison;
    }
  }

  if (isCommander) {
    const commProfile = { ramp: 10, draw: 10, removal: 10, threats: 7, protection: 3 };
    
    if (archLower.includes('aggro') || archLower.includes('tribal') || hasTribe) {
      commProfile.ramp = 8;
      commProfile.threats = 12;
      commProfile.removal = 8;
    } else if (archLower.includes('control')) {
      commProfile.threats = 4;
      commProfile.removal = 14;
    } else if (archLower.includes('combo')) {
      commProfile.ramp = 12;
      commProfile.draw = 12;
      commProfile.removal = 6;
    } else if (archLower.includes('ramp')) {
      commProfile.ramp = 14;
      commProfile.threats = 10;
    } else if (archLower.includes('storm')) {
      commProfile.ramp = 12;
      commProfile.draw = 14;
      commProfile.threats = 2;
      commProfile.removal = 4;
    } else if (archLower.includes('prison')) {
      commProfile.removal = 12;
      commProfile.protection = 6;
    }
    return commProfile;
  }
  
  return { ...baseProfile };
}

// ─────────────────────────────────────────────────────────────────────────────
// ANÁLISIS DE PILARES FUNCIONALES
// Analiza el oracle_text de las cartas para categorizar qué hace realmente el
// mazo en términos de ramp, draw, removal, threats y protection.
// ─────────────────────────────────────────────────────────────────────────────

const PILLAR_KEYWORDS = {
  ramp: [
    'add {', 'add one mana', 'add mana', 'search your library for a', 'land card',
    'put a land', 'tap for mana', 'produces mana', 'mana dork', 'sol ring',
    'signet', 'talisman', 'mana rock', 'treasure', 'food token', 'treasure token',
    'create a treasure', 'creates a treasure', 'put a +1/+1 counter', // not ramp but common false positive avoidance handled below
    'additional land', 'play an additional land', 'search your library for up to',
    'put it onto the battlefield tapped', 'you may search',
  ],
  draw: [
    'draw a card', 'draw cards', 'draw two', 'draw three', 'draw x cards',
    'look at the top', 'scry', 'surveil', 'loot', 'you may draw', 'draws a card',
    'draw that many', 'draws cards', 'card draw', 'investigate', 'clue token',
    'create a clue', 'impulse draw', 'exile the top', 'you may cast',
    'midnight clock', 'wheel of fortune', 'rhystic study',
  ],
  removal: [
    'exile target', 'destroy target', 'return target', 'counter target', 'negate',
    'tap target', 'deals damage to target', 'damage to any target',
    '-x/-x', 'put into the graveyard', 'remove from combat',
    'sacrifice a creature', 'fights', 'deathtouch',
    'until end of turn target', 'destroy all', 'exile all',
    'wraths', 'board wipe', 'mass removal',
  ],
  protection: [
    'hexproof', 'shroud', 'indestructible', 'protection from',
    'ward', 'regenerate', 'can\'t be targeted',
    'can\'t be countered', 'uncounterable', 'can\'t be destroyed',
    'prevent', 'redirect damage',
  ],
  threats: [], // Threats = creatures with power ≥ 3, or planeswalkers – handled in code
};

// Simple heuristic: false positive filter for ramp
const RAMP_FALSE_POSITIVES = ['put a +1/+1 counter'];

/**
 * Clasifica un spell en uno o más pilares funcionales usando oracle_text.
 * @param {Object} card - Objeto carta con oracle_text, type_line, power
 * @returns {string[]} - Lista de pilares a los que contribuye la carta
 */
function classifyCardPillar(card, tribe = null) {
  const oracle = (card.oracle_text || '').toLowerCase();
  const typeLine = (card.type_line || '').toLowerCase();
  const powerStr = (card.power || '').trim();
  const isVariablePower = powerStr.includes('*');
  const power = isVariablePower ? 3 : parseInt(powerStr || '0', 10);
  const pillars = new Set();

  // THREATS: planeswalkers
  if (typeLine.includes('planeswalker')) {
    pillars.add('threats');
  }

  // Lista de amenazas competitivas conocidas de bajo poder
  const LOW_POWER_THREATS = [
    "ragavan", "delver of secrets", "esper sentinel", "dragon's rage channeler",
    "dauthi voidwalker", "thalia, guardian of thraben", "young pyromancer", 
    "tarmogoyf", "slickshot show-off", "balmor, battlemage captain", "psychatog",
    "scute swarm", "monastery swiftspear", "soul-scar mage", "ledger shredder",
    "goblin guide", "eidolon of the great revel", "dreadhorde arcanist", "hollow one"
  ];
  
  const nameLower = (card.name || '').toLowerCase();
  const isLord = typeLine.includes('creature') && 
    (oracle.includes('get +1/+1') || oracle.includes('gets +1/+1') || oracle.includes('obtienen +1/+1') || oracle.includes('obtiene +1/+1')) && 
    (oracle.includes('other ') || oracle.includes('otras ') || oracle.includes('otros ') || oracle.includes('creatures you control') || oracle.includes('las criaturas que controlas'));

  const isTribeMember = tribe && tribe !== 'none' && tribe !== 'ninguna' && 
    typeLine.includes('creature') && 
    typeLine.includes(tribe.toLowerCase().trim());

  const isLowPowerThreat = typeLine.includes('creature') && 
    (LOW_POWER_THREATS.some(t => nameLower.includes(t)) ||
     isLord ||
     isTribeMember ||
     oracle.includes('prowess') ||
     oracle.includes('double strike') ||
     oracle.includes('infect') ||
     oracle.includes('toxic') ||
     (oracle.includes('whenever') && (oracle.includes('deals damage') || oracle.includes('draws a card') || oracle.includes('draw a card') || oracle.includes('put a +1/+1 counter')) && power >= 1));

  if (typeLine.includes('creature') && ((!isNaN(power) && power >= 3) || isLowPowerThreat)) {
    pillars.add('threats');
  }

  // RAMP
  const isRamp = PILLAR_KEYWORDS.ramp.some(kw => oracle.includes(kw)) &&
    !RAMP_FALSE_POSITIVES.some(fp => oracle.includes(fp) && !oracle.includes('add {'));
  if (isRamp) pillars.add('ramp');

  // DRAW
  if (PILLAR_KEYWORDS.draw.some(kw => oracle.includes(kw))) pillars.add('draw');

  // REMOVAL
  if (PILLAR_KEYWORDS.removal.some(kw => oracle.includes(kw))) pillars.add('removal');

  // PROTECTION
  if (PILLAR_KEYWORDS.protection.some(kw => oracle.includes(kw))) pillars.add('protection');

  // Cartas con ningún pilar detectado = "filler"
  if (pillars.size === 0) pillars.add('filler');

  return [...pillars];
}

/**
 * Analiza los pilares funcionales del mazo (sin tierras).
 * @param {Array} spells - Hechizos del mazo (ya sin tierras)
 * @param {string} format - Formato del mazo ('COMMANDER', 'MODERN', etc.)
 * @returns {Object} pillars: { ramp, draw, removal, threats, protection, filler, cards }
 *   con conteo total de copias y array de nombres de cartas que contribuyen a cada pilar.
 */
export function analyzeFunctionalPillars(spells, format = 'MODERN', archetypeOrFormData = 'midrange', tribeInput = null) {
  let archetype = 'midrange';
  let tribe = null;

  if (archetypeOrFormData && typeof archetypeOrFormData === 'object') {
    archetype = archetypeOrFormData.archetype || 'midrange';
    tribe = archetypeOrFormData.tribe || null;
  } else {
    archetype = archetypeOrFormData || 'midrange';
    tribe = tribeInput || null;
  }

  const thresholds = getArchetypePillarProfile(archetype, tribe, format);

  const pillars = {
    ramp:       { count: 0, cards: [], threshold: thresholds.ramp },
    draw:       { count: 0, cards: [], threshold: thresholds.draw },
    removal:    { count: 0, cards: [], threshold: thresholds.removal },
    threats:    { count: 0, cards: [], threshold: thresholds.threats },
    protection: { count: 0, cards: [], threshold: thresholds.protection },
    filler:     { count: 0, cards: [], threshold: 0 },
  };

  spells.forEach(card => {
    const qty = card.quantity || 1;
    const cardPillars = classifyCardPillar(card, tribe);
    cardPillars.forEach(p => {
      if (pillars[p]) {
        pillars[p].count += qty;
        if (!pillars[p].cards.includes(card.name)) {
          pillars[p].cards.push(card.name);
        }
      }
    });
  });

  // Calcular gaps y estado por pilar
  const gaps = {};
  const pillarStatus = {};
  ['ramp', 'draw', 'removal', 'threats', 'protection'].forEach(p => {
    const gap = pillars[p].threshold - pillars[p].count;
    gaps[p] = Math.max(0, gap);
    pillarStatus[p] = pillars[p].count >= pillars[p].threshold
      ? 'ok'
      : pillars[p].count >= pillars[p].threshold * 0.6
        ? 'low'
        : 'critical';
  });

  return { pillars, gaps, pillarStatus, thresholds, format: format?.toUpperCase() };
}

/**
 * Analiza la devoción de maná doble o triple en los costes de hechizos y la compara
 * con las fuentes coloreadas disponibles (Fórmula Karsten).
 * @param {Array} spells - Hechizos del mazo
 * @param {Object} sources - Fuentes coloreadas { W, U, B, R, G }
 * @returns {Object} { hasDevotionWarnings, devotions, doubleDevotionCards }
 */
export function analyzeKarstenManaDevotion(spells, sources = {}) {
  const maxDevotion = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const doubleDevotionCards = [];

  spells.forEach(card => {
    const cost = card.mana_cost || '';
    ['W', 'U', 'B', 'R', 'G'].forEach(color => {
      const regex = new RegExp(`\\{${color}\\}`, 'g');
      const matches = cost.match(regex);
      const dev = matches ? matches.length : 0;
      if (dev > maxDevotion[color]) {
        maxDevotion[color] = dev;
      }
      if (dev >= 2 && !doubleDevotionCards.some(c => c.name === card.name)) {
        doubleDevotionCards.push({ name: card.name, color, devotion: dev, mana_cost: cost });
      }
    });
  });

  const results = [];
  let totalWarnings = 0;

  ['W', 'U', 'B', 'R', 'G'].forEach(color => {
    const dev = maxDevotion[color];
    if (dev === 0) return;
    const required = dev === 1 ? 13 : dev === 2 ? 19 : 22;
    const available = sources[color] || sources[color.toLowerCase()] || 0;
    
    let status = 'ok';
    if (available > 0 && available < required) {
      status = available < required - 4 ? 'critical' : 'warning';
      totalWarnings++;
    }

    results.push({
      color,
      maxDevotion: dev,
      requiredSources: required,
      availableSources: available,
      status,
      exampleCards: doubleDevotionCards.filter(c => c.color === color).map(c => c.name)
    });
  });

  return {
    hasDevotionWarnings: totalWarnings > 0,
    devotions: results,
    doubleDevotionCards
  };
}

/**
 * Analiza ratios de motor (Enablers vs Payoffs) para arquetipos sinérgicos específicos.
 * @param {Array} spells 
 * @param {string} strategy 
 * @returns {Object|null}
 */
export function analyzeEngineRatios(spells = [], strategy = '') {
  const stratLower = (strategy || '').toLowerCase();
  let result = null;

  if (stratLower.includes('reanimat') || stratLower.includes('graveyard') || stratLower.includes('dredge')) {
    let enablers = 0;
    let reanimators = 0;
    let payoffs = 0;
    spells.forEach(c => {
      const text = (c.oracle_text || '').toLowerCase();
      const cmc = c.mana_value || c.cmc || 0;
      const isCreature = (c.type_line || '').toLowerCase().includes('creature');
      if (text.includes('discard') || text.includes('mill') || text.includes('surveil') || text.includes('put into your graveyard')) enablers += (c.quantity || 1);
      if ((text.includes('return') && text.includes('graveyard')) || text.includes('reanimate') || text.includes('unearth') || text.includes('flashback')) reanimators += (c.quantity || 1);
      if (isCreature && (cmc >= 5 || text.includes('enters the battlefield'))) payoffs += (c.quantity || 1);
    });
    result = {
      strategy: 'Cementerio / Reanimación',
      enablers,
      reanimators,
      payoffs,
      enablerCount: enablers,
      engineCount: reanimators,
      payoffCount: payoffs,
      idealRatio: 'Ratio 1:1 Habilitadores vs Reanimadores (Recomendado ~6-8 de cada uno)',
      status: (enablers > 0 && reanimators > 0) ? 'ok' : 'unbalanced'
    };
  } else if (stratLower.includes('aristocrat') || stratLower.includes('sacrifice')) {
    let outlets = 0;
    let fodder = 0;
    let drainers = 0;
    spells.forEach(c => {
      const text = (c.oracle_text || '').toLowerCase();
      if (text.includes('sacrifice a')) outlets += (c.quantity || 1);
      if (text.includes('create a token') || text.includes('when this creature dies, create') || text.includes('persist')) fodder += (c.quantity || 1);
      if (text.includes('whenever another creature dies') || text.includes('loses 1 life and you gain')) drainers += (c.quantity || 1);
    });
    result = {
      strategy: 'Aristócratas',
      outlets,
      fodder,
      drainers,
      enablerCount: fodder,
      engineCount: outlets,
      payoffCount: drainers,
      idealRatio: 'Ratio ~8 Outlets : 12 Fodder : 4-6 Drainers',
      status: (outlets >= 4 && fodder >= 6 && drainers >= 2) ? 'ok' : 'unbalanced'
    };
  }

  return result;
}

/**
 * Genera un texto-resumen de los pilares funcionales para inyectar en el prompt de IA.
 * @param {Object} pillarAnalysis - Resultado de analyzeFunctionalPillars
 * @returns {string}
 */
export function buildPillarSummaryText(pillarAnalysis) {
  if (!pillarAnalysis) return '';
  const { pillars, gaps, pillarStatus, thresholds } = pillarAnalysis;
  const lines = [
    `=== ANÁLISIS DE PILARES FUNCIONALES (Pre-calculado, datos matemáticos duros) ===`,
    `Formato: ${pillarAnalysis.format}`,
    ``,
    `PILAR         | Copias en Mazo | Mínimo Rec. | Estado   | Deficit`,
    `--------------|----------------|-------------|----------|--------`,
  ];
  ['ramp', 'draw', 'removal', 'threats', 'protection'].forEach(p => {
    const icon = pillarStatus[p] === 'ok' ? '✅' : pillarStatus[p] === 'low' ? '⚠️' : '🚨';
    lines.push(
      `${icon} ${p.padEnd(13)}| ${String(pillars[p].count).padEnd(14)} | ${String(thresholds[p]).padEnd(11)} | ${pillarStatus[p].padEnd(8)} | -${gaps[p]}`
    );
    if (pillars[p].cards.length > 0) {
      lines.push(`  Cartas: ${pillars[p].cards.slice(0, 6).join(', ')}${pillars[p].cards.length > 6 ? '...' : ''}`);
    }
  });
  lines.push(``);
  const criticals = Object.entries(pillarStatus).filter(([,v]) => v === 'critical').map(([k]) => k);
  const lows = Object.entries(pillarStatus).filter(([,v]) => v === 'low').map(([k]) => k);
  if (criticals.length > 0) {
    lines.push(`⚠️ PILARES CRÍTICOS (déficit severo): ${criticals.join(', ').toUpperCase()}`);
    lines.push(`   El mazo NECESITA urgentemente cartas de estos tipos funcionales.`);
  }
  if (lows.length > 0) {
    lines.push(`🟡 PILARES BAJOS (mejorable): ${lows.join(', ').toUpperCase()}`);
  }
  lines.push(`=== FIN DE ANÁLISIS DE PILARES ===`);
  return lines.join('\n');
}

/**
 * Analiza la calidad de las cartas usando edhrec_rank (si disponible).
 * @param {Array} deckCards - Todas las cartas del mazo
 * @returns {Object} { eliteCount, competitiveCount, casualCount, averageRank, qualityLabel }
 */
export function analyzeCardQuality(deckCards) {
  let eliteCount = 0;
  let competitiveCount = 0;
  let casualCount = 0;
  let unknownCount = 0;
  let totalRank = 0;
  let rankedCount = 0;

  deckCards.forEach(card => {
    const qty = card.quantity || 1;
    const rank = card.edhrec_rank;
    if (rank == null || rank === undefined) {
      unknownCount += qty;
      return;
    }
    totalRank += rank * qty;
    rankedCount += qty;
    if (rank < 500) eliteCount += qty;
    else if (rank < 5000) competitiveCount += qty;
    else casualCount += qty;
  });

  const averageRank = rankedCount > 0 ? Math.round(totalRank / rankedCount) : null;
  let qualityLabel = 'Desconocida';
  if (averageRank !== null) {
    if (averageRank < 800) qualityLabel = 'Elite';
    else if (averageRank < 4000) qualityLabel = 'Competitiva';
    else if (averageRank < 10000) qualityLabel = 'Casual';
    else qualityLabel = 'Principiante';
  }

  return { eliteCount, competitiveCount, casualCount, unknownCount, averageRank, qualityLabel };
}

/**
 * Calcula una nota determinista y matemática de viabilidad (1-10) basada en
 * los 5 pilares funcionales, la devoción de Karsten y el VMP de la curva.
 */
export function calculateDeterministicDeckScore(pillarAnalysis, karstenAnalysis, vmp, stance = 'balanced') {
  let score = 0;

  // 1. Pilares Funcionales (hasta 5.0 puntos)
  if (pillarAnalysis && pillarAnalysis.pillarStatus) {
    const statuses = Object.values(pillarAnalysis.pillarStatus);
    statuses.forEach(st => {
      if (st === 'ok') score += 1.0;
      else if (st === 'low') score += 0.6;
      else if (st === 'critical') score += 0.2;
    });
  } else {
    score += 3.0;
  }

  // 2. Base de Maná y Karsten (hasta 3.0 puntos)
  if (karstenAnalysis && karstenAnalysis.unsatisfied) {
    const unsatisfiedCount = karstenAnalysis.unsatisfied.length;
    if (unsatisfiedCount === 0) score += 3.0;
    else if (unsatisfiedCount === 1) score += 2.2;
    else if (unsatisfiedCount === 2) score += 1.5;
    else if (unsatisfiedCount === 3) score += 1.0;
    else score += 0.5;
  } else {
    score += 2.0;
  }

  // 3. Valor de Maná Promedio (VMP) y Curva (hasta 2.0 puntos)
  if (vmp != null) {
    const numVmp = parseFloat(vmp);
    if (!isNaN(numVmp)) {
      if (numVmp >= 1.5 && numVmp <= 3.2) score += 2.0;
      else if (numVmp > 3.2 && numVmp <= 3.8) score += 1.2;
      else if (numVmp < 1.5) score += 1.5;
      else score += 0.5;
    } else {
      score += 1.5;
    }
  } else {
    score += 1.5;
  }

  return Math.min(10, Math.max(1, Math.round(score)));
}

/**
 * Consolida cartas de coste ≤ 3 en playsets de 4 copias (Regla de Consistencia Pro-Tour),
 * eliminando "1-ofs" innecesarios y aumentando la cohesión de robo.
 */
export function densifyDeckPlaysets(deckCards) {
  if (!deckCards || deckCards.length === 0) return deckCards;
  
  const isLandCard = (c) => {
    const type = (c.type_line || c.category || '').toLowerCase();
    return type.includes('land') || type.includes('tierra');
  };

  const newDeck = deckCards.map(c => ({ ...c }));
  const lands = newDeck.filter(c => isLandCard(c));
  const spells = newDeck.filter(c => !isLandCard(c));

  if (spells.length === 0) return deckCards;

  // 1. Identificar cartas con 2 o 3 copias no legendarias
  let coreSpells = spells.filter(c => 
    ((c.quantity || 1) === 2 || (c.quantity || 1) === 3) && 
    (c.cmc ?? c.mana_value ?? 0) <= 3 && 
    !(c.type_line || '').toLowerCase().includes('legendary')
  );

  // 2. Cartas de 1 copia no legendarias de coste <= 3
  let singletons = spells.filter(c => 
    (c.quantity || 1) === 1 && 
    (c.cmc ?? c.mana_value ?? 0) <= 3 && 
    !(c.type_line || '').toLowerCase().includes('legendary')
  );

  // CASO A: Si la gran mayoría son singletons (ej. mazo 1-of generado por fallback o IA dispersa)
  if (singletons.length > 6 && coreSpells.length < 3) {
    // Clasificar singletons: Priorizar cantrips, interacción barata (CMC <= 2) y motores sobre utilidades secundarias
    const scoreSingleton = (c) => {
      const nameL = (c.name || '').toLowerCase();
      const typeL = (c.type_line || '').toLowerCase();
      let score = 0;
      if (nameL.includes('opt') || nameL.includes('preordain') || nameL.includes('ponder') || nameL.includes('brainstorm') || nameL.includes('lightning bolt') || nameL.includes('thoughtseize') || nameL.includes('counterspell') || nameL.includes('path to exile')) score += 50;
      if (typeL.includes('instant') || typeL.includes('sorcery')) score += 20;
      if ((c.cmc ?? c.mana_value ?? 0) <= 2) score += 15;
      if (c.isMustInclude) score += 100;
      return score;
    };

    const sortedSingletons = [...singletons].sort((a, b) => scoreSingleton(b) - scoreSingleton(a));
    const toPromote = sortedSingletons.slice(0, Math.min(6, Math.floor(singletons.length / 2)));
    const toPrune = sortedSingletons.slice(toPromote.length);

    // Promover los seleccionados a 3x o 4x copias eliminando los prescindibles
    let slotsFreed = 0;
    for (let p of toPrune) {
      const idx = newDeck.findIndex(c => c.name === p.name);
      if (idx !== -1 && (newDeck[idx].quantity || 1) === 1) {
        newDeck.splice(idx, 1);
        slotsFreed += 1;
      }
    }

    for (let target of toPromote) {
      if (slotsFreed <= 0) break;
      const idx = newDeck.findIndex(c => c.name === target.name);
      if (idx !== -1) {
        const add = Math.min(4 - (newDeck[idx].quantity || 1), slotsFreed);
        newDeck[idx].quantity = (newDeck[idx].quantity || 1) + add;
        slotsFreed -= add;
      }
    }
  } else if (singletons.length >= 2 && coreSpells.length > 0) {
    // CASO B: Mezcla estándar de nucleos 2x/3x con singletons sobrantes
    let slotsFreed = 0;
    for (let s of singletons.slice(0, 4)) {
      const idx = newDeck.findIndex(c => c.name === s.name);
      if (idx !== -1 && (newDeck[idx].quantity || 1) === 1) {
        newDeck.splice(idx, 1);
        slotsFreed += 1;
      }
    }
    for (let core of coreSpells) {
      if (slotsFreed <= 0) break;
      const idx = newDeck.findIndex(c => c.name === core.name);
      if (idx !== -1 && newDeck[idx].quantity < 4) {
        const add = Math.min(4 - newDeck[idx].quantity, slotsFreed);
        newDeck[idx].quantity += add;
        slotsFreed -= add;
      }
    }
  }

  return newDeck;
}

/**
 * EL BOTÓN DE PÁNICO: Interceptor de Curva en Tiempo Real
 * Calcula el VMP de las cartas actuales y activa el 'panicMode' si la curva excede los límites seguros.
 * @param {Array} currentSpells - Array temporal de hechizos ya insertados en el mazo.
 * @param {string} curveProfile - Perfil de curva esperado (ej. 'aggressive', 'balanced').
 * @returns {Object} Estado de alarma: { panicMode: boolean, currentVmp: number, maxAllowedCmc: number }
 */
export function calculateRealTimeVMPWarning(currentSpells, curveProfile = 'balanced') {
  if (!currentSpells || currentSpells.length < 5) {
    // No hay suficiente muestra para saltar la alarma
    return { panicMode: false, currentVmp: 0, maxAllowedCmc: 99 };
  }

  const vmp = calculateVMP(currentSpells);
  const bounds = CURVE_BOUNDS[curveProfile] || CURVE_BOUNDS.balanced;

  // Si superamos el máximo absoluto tolerado para el arquetipo, entramos en pánico
  if (vmp > bounds.max) {
    // Si la curva está rota, forzamos a que solo se acepten costes muy bajos para equilibrar
    let maxAllowed = 2; 
    if (curveProfile === 'blitz' || curveProfile === 'aggressive') maxAllowed = 1;
    if (curveProfile === 'heavy') maxAllowed = 3;

    return { 
      panicMode: true, 
      currentVmp: vmp, 
      maxAllowedCmc: maxAllowed 
    };
  }

  return { panicMode: false, currentVmp: vmp, maxAllowedCmc: 99 };
}

/**
 * Evalúa la competitividad de un mazo y devuelve un Grade de Perfección.
 * @param {Array} deckList - Array de objetos carta en el mazo principal
 * @param {Array} sideboardList - Array de objetos carta en el banquillo
 * @param {Object} formData - Parámetros de generación (strategy, archetype, companero)
 * @returns {Object} Reporte de Auditoría { score, grade, metrics, warnings, strengths }
 */
export function auditarMazo(deckList, sideboardList, formData) {
  let score = 0;
  const warnings = [];
  const strengths = [];

  const metrics = {
    manaScore: 0,
    curveScore: 0,
    consistencyScore: 0,
    structureScore: 0,
    strategyScore: 20, // Inicializado a 20, penalizado según no-bos o core ausente
    totalCardsMain: 0,
    totalCardsSide: 0,
    vmp: 0,
    landDeviation: 0
  };

  // 1. Cálculos base
  const totalMain = deckList.reduce((sum, c) => sum + (c.quantity || 1), 0);
  const totalSide = sideboardList?.reduce((sum, c) => sum + (c.quantity || 1), 0) || 0;
  
  metrics.totalCardsMain = totalMain;
  metrics.totalCardsSide = totalSide;

  const isYorion = formData?.companero?.toLowerCase().includes('yorion');
  const targetMainSize = isYorion ? 80 : 60;

  // --- STRUCTURE SCORE (Max 20) ---
  if (totalMain === targetMainSize) {
    metrics.structureScore = 20;
    strengths.push(`Tamaño del mazo perfecto (${targetMainSize} cartas).`);
  } else {
    metrics.structureScore = 0;
    warnings.push(`El mazo principal tiene ${totalMain} cartas (debería tener ${targetMainSize}).`);
  }
  score += metrics.structureScore;

  // 2. Separación de Tierras y Spells
  const lands = deckList.filter(isLand);
  const spells = deckList.filter(c => !isLand(c));
  
  const landCount = lands.reduce((sum, c) => sum + (c.quantity || 1), 0);

  // --- MANA SCORE (Max 20) ---
  if (totalMain > 0 && spells.length > 0) {
    const perfectLands = calculatePerfectLandCount(spells, formData, isYorion);
    const deviation = Math.abs(landCount - Math.round(perfectLands));
    metrics.landDeviation = deviation;

    if (deviation <= 0.5) {
      metrics.manaScore = 20;
      strengths.push(`Base de maná matemáticamente perfecta (Karsten). Ideal: ~${Math.round(perfectLands)}, Actual: ${landCount}.`);
    } else if (deviation <= 1.5) {
      metrics.manaScore = 15;
      strengths.push("Base de maná aceptable, desviación menor a 2 tierras.");
    } else if (deviation <= 2.5) {
      metrics.manaScore = 10;
      warnings.push(`Desviación de maná. Tienes ${landCount} tierras, la matemática recomienda ~${Math.round(perfectLands)}.`);
    } else {
      metrics.manaScore = 0;
      warnings.push(`Peligro severo de Maná. Tienes ${landCount} tierras, pero necesitas ~${Math.round(perfectLands)} para tus costes.`);
    }
    score += metrics.manaScore;
  }

  // --- CURVE SCORE (Max 20) ---
  if (spells.length > 0) {
    const vmp = calculateVMP(spells);
    metrics.vmp = Math.round(vmp * 100) / 100;

    // Obtener perfil de curva y rango objetivo
    const profile = formData?.curveProfile || 'balanced';
    const bounds = CURVE_BOUNDS[profile] || CURVE_BOUNDS.balanced;

    let curveDeviation = 0;
    if (vmp < bounds.min) {
      curveDeviation = bounds.min - vmp;
    } else if (vmp > bounds.max) {
      curveDeviation = vmp - bounds.max;
    }

    if (curveDeviation <= 0.2) {
      metrics.curveScore = 20;
      strengths.push(`Curva de maná óptima para la estrategia (${metrics.vmp} VMP en perfil ${profile}).`);
    } else if (curveDeviation <= 0.5) {
      metrics.curveScore = 15;
    } else if (curveDeviation <= 1.0) {
      metrics.curveScore = 10;
      warnings.push(`Curva ligeramente ineficiente para el arquetipo (VMP: ${metrics.vmp}, perfil deseado: ${profile}).`);
    } else {
      metrics.curveScore = 0;
      warnings.push(`Curva de maná muy desconectada de la estrategia seleccionada (VMP: ${metrics.vmp}, perfil deseado: ${profile}).`);
    }
    score += metrics.curveScore;
  }

  // --- CONSISTENCY SCORE (Max 20) ---
  if (spells.length > 0) {
    let playsets = 0;
    let singletons = 0;
    let totalNonLegendarySpells = 0;

    spells.forEach(c => {
      const typeLine = (c.type_line || '').toLowerCase();
      if (!typeLine.includes('legendary')) {
        totalNonLegendarySpells++;
        if (c.quantity === 4) playsets++;
        if (c.quantity === 1) singletons++;
      }
    });

    if (totalNonLegendarySpells > 0) {
      // Un mazo consistente tiene buenos playsets y pocos singletons (salvo tutores)
      const singletonRatio = singletons / totalNonLegendarySpells;
      const playsetRatio = playsets / totalNonLegendarySpells;

      const playstyle = (formData?.playstyle || 'balanced').toLowerCase();

      if (playstyle === 'linear') {
        // En lineal queremos máxima redundancia (muchos playsets)
        if (playsetRatio >= 0.5 && singletonRatio < 0.1) {
          metrics.consistencyScore = 20;
          strengths.push("Alta redundancia lineal ideal. Mazo repleto de playsets de 4x.");
        } else if (playsetRatio >= 0.3 && singletonRatio < 0.25) {
          metrics.consistencyScore = 15;
        } else {
          metrics.consistencyScore = 10;
          warnings.push("Varianza lineal mejorable. Se recomiendan más playsets (4x) para esta configuración lineal.");
        }
      } else if (playstyle === 'adaptive') {
        // En adaptativo valoramos la variedad (singletons y doubletons)
        if (singletonRatio >= 0.4 && playsetRatio <= 0.1) {
          metrics.consistencyScore = 20;
          strengths.push("Excelente versatilidad adaptativa. Configuración tipo Toolbox con variedad de 1-ofs.");
        } else if (singletonRatio >= 0.25 && playsetRatio <= 0.25) {
          metrics.consistencyScore = 15;
        } else {
          metrics.consistencyScore = 10;
          warnings.push("Varianza adaptativa subóptima. Se sugieren más cartas únicas (1-of/2-of) para mayor flexibilidad.");
        }
      } else {
        // Modo balanceado estándar
        if (playsetRatio >= 0.4 && singletonRatio < 0.2) {
          metrics.consistencyScore = 20;
          strengths.push("Alta redundancia balanceada. Gran cantidad de Playsets (4x) minimiza la varianza.");
        } else if (playsetRatio >= 0.2 && singletonRatio < 0.4) {
          metrics.consistencyScore = 15;
          strengths.push("Consistencia aceptable.");
        } else if (singletonRatio >= 0.6) {
          metrics.consistencyScore = 5;
          warnings.push("Varianza alta. Demasiadas copias únicas (1-of) sin tutores obvios.");
        } else {
          metrics.consistencyScore = 10;
        }
      }
    } else {
      metrics.consistencyScore = 10;
    }
    score += metrics.consistencyScore;
  }

  // --- STRATEGY SCORE (Max 20) ---
  if (spells.length > 0) {
    const activeStrategy = (formData?.strategy || '').toLowerCase();
    const activeTribe = (formData?.tribe || '').toLowerCase();
    
    // A. Control de Anti-sinergias Graves
    COMPETITIVE_ANTI_SYNERGIES.forEach(rule => {
      if (rule.strategy.toLowerCase() === activeStrategy) {
        const hasAntiSynergyCard = deckList.some(c => c.name.toLowerCase() === rule.card.toLowerCase());
        if (hasAntiSynergyCard) {
          metrics.strategyScore = Math.max(0, metrics.strategyScore - 5);
          warnings.push(`Anti-sinergia severa: "${rule.card}" fricciona con tu estrategia "${activeStrategy}". Razón: ${rule.reason}`);
        }
      }
    });

    // B. Presencia del Core Package
    if (activeStrategy && CORE_PACKAGES[activeStrategy]) {
      const formatKey = (formData?.format || 'MODERN').toUpperCase();
      const pkg = CORE_PACKAGES[activeStrategy];
      const formatPkg = pkg[formatKey] || pkg.MODERN || pkg.default;
      const variant = formatPkg?.default || [];
      
      if (variant.length > 0) {
        let corePresent = 0;
        let totalCoreNeeded = variant.length;
        
        variant.forEach(item => {
          const inDeck = deckList.some(c => c.name.toLowerCase() === item.name.toLowerCase());
          if (inDeck) corePresent++;
        });

        const coreRatio = corePresent / totalCoreNeeded;
        if (coreRatio < 0.75) {
          const missingPct = Math.round((1 - coreRatio) * 100);
          const penalty = Math.round((1 - coreRatio) * 10); // penalización de hasta 10 puntos
          metrics.strategyScore = Math.max(0, metrics.strategyScore - penalty);
          warnings.push(`Falta de consistencia Core. Has omitido el ${missingPct}% de las cartas clave del Core de la estrategia.`);
        } else {
          strengths.push(`Coherencia de Motores excelente: el ${Math.round(coreRatio * 100)}% del core táctico está presente.`);
        }
      }
    }

    // C. Distribución de Criaturas por Arquetipo o Tribu
    const totalCreatures = deckList.filter(c => !isLand(c) && (c.type_line || '').toLowerCase().includes('creature')).reduce((sum, c) => sum + (c.quantity || 1), 0);
    const arch = (formData?.archetype || 'midrange').toLowerCase();
    const hasTribe = !!(formData?.tribe && formData.tribe !== 'none' && formData.tribe !== 'ninguna');
    
    if (hasTribe && !['control', 'combo', 'prison', 'storm'].includes(arch)) {
      if (totalCreatures < 20) {
        metrics.strategyScore = Math.max(0, metrics.strategyScore - 5);
        warnings.push(`Falta de amenaza tribal: Tu mazo es de arquetipo Tribal pero solo tienes ${totalCreatures} criaturas (se recomiendan >= 22 para maximizar sinergias).`);
      }
    } else if (arch === 'aggro' && totalCreatures < 16) {
      metrics.strategyScore = Math.max(0, metrics.strategyScore - 5);
      warnings.push(`Falta de amenaza física: Tu mazo es Aggro pero solo tienes ${totalCreatures} criaturas (se recomiendan >= 20).`);
    } else if (arch === 'control' && totalCreatures > 12) {
      metrics.strategyScore = Math.max(0, metrics.strategyScore - 5);
      warnings.push(`Exceso de criaturas en mazo de Control: Tienes ${totalCreatures} criaturas (se recomiendan <= 8 para evitar no-bos con iras).`);
    } else if (arch === 'tempo' && (totalCreatures < 8 || totalCreatures > 16)) {
      metrics.strategyScore = Math.max(0, metrics.strategyScore - 3);
      warnings.push(`Inconsistencia en amenazas de Tempo: Tienes ${totalCreatures} criaturas (se recomiendan de 10 a 14).`);
    }

    if (metrics.strategyScore >= 18) {
      strengths.push("Coherencia táctica y sinérgica impecable. Sin conflictos estratégicos detectados.");
    }
    
    score += metrics.strategyScore;
  }

  // CALCULAR GRADO FINAL
  let grade = 'F';
  if (score >= 95) grade = 'S';
  else if (score >= 85) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 50) grade = 'C';

  return {
    score,
    grade,
    metrics,
    warnings,
    strengths
  };
}

/**
 * Evaluación determinista ultra-rápida en memoria (<5ms).
 * Utilizada por el bucle agéntico Pre-Flight y el Asistente en vivo del Blueprint.
 * 
 * @param {Array} deck - Mazo completo con criaturas, hechizos y tierras.
 * @param {Object} formData - Parámetros del mazo (arquetipo, estrategia, colores, formato).
 * @returns {Object} { score: number, criticalViolations: Array, warnings: Array, recommendedSwaps: Array }
 */
export function evaluateDeckHealthFast(deck = [], formData = {}) {
  const spellsOnly = deck.filter(c => !isLand(c));
  const landsOnly = deck.filter(c => isLand(c));
  const deckSize = deck.reduce((sum, c) => sum + (c.quantity || 1), 0);
  const totalLands = landsOnly.reduce((sum, c) => sum + (c.quantity || 1), 0);
  
  let score = 100;
  const criticalViolations = [];
  const warnings = [];
  const recommendedSwaps = [];

  // 1. CHEQUEO DE TAMAÑO Y TIERRAS
  const isCommander = (formData.format || '').toUpperCase() === 'COMMANDER';
  const targetSize = isCommander ? 100 : 60;
  const targetLandRatio = isCommander ? 0.37 : 0.38; // ~23-24 tierras en 60
  
  if (deckSize !== targetSize) {
    score -= 15;
    criticalViolations.push(`Tamaño de mazo no estándar (${deckSize}/${targetSize} cartas).`);
  }

  const minLands = isCommander ? 34 : 20;
  const maxLands = isCommander ? 42 : 27;
  if (totalLands < minLands) {
    score -= 12;
    criticalViolations.push(`Tierras insuficientes (${totalLands} tierras). Riesgo severo de mana screw.`);
  } else if (totalLands > maxLands) {
    score -= 8;
    warnings.push(`Exceso de tierras (${totalLands} tierras). Riesgo de mana flood.`);
  }

  // 2. CURVA Y VMP
  const vmp = calculateVMP(spellsOnly);
  const arch = (formData.archetype || 'midrange').toLowerCase();
  
  if (arch.includes('aggro') && vmp > 2.6) {
    score -= 10;
    warnings.push(`Curva demasiado alta para Aggro (VMP ${vmp.toFixed(2)}). Se recomiendan costes 1-2.`);
  } else if (arch.includes('control') && vmp < 2.0) {
    score -= 8;
    warnings.push(`Curva demasiado baja para Control (VMP ${vmp.toFixed(2)}). Falta valor de late-game.`);
  }

  // 3. REQUISITOS DE COLOR (KARSTEN MATH CHECK)
  const colors = formData.colores || [];
  if (colors.length > 1) {
    spellsOnly.forEach(card => {
      const cost = card.mana_cost || '';
      const cmc = card.cmc || card.mana_value || 0;
      
      // Detectar pips dobles/triples en turnos 1-3
      colors.forEach(col => {
        const regex = new RegExp(col, 'g');
        const matches = cost.match(regex);
        const pipCount = matches ? matches.length : 0;
        
        if (pipCount >= 2 && cmc <= 3) {
          // Hechizo muy intensivo en color
          recommendedSwaps.push({
            cardName: card.name,
            reason: `Elevada intensidad de color (${pipCount}x ${col} en Turno ${cmc}). Considerar sustituto menos intensivo.`
          });
        }
      });
    });
  }

  // 4. ANTI-SINERGIAS COMPETITIVAS
  const activeStrategy = (formData.strategy || '').toLowerCase();
  COMPETITIVE_ANTI_SYNERGIES.forEach(rule => {
    if (rule.strategy.toLowerCase() === activeStrategy) {
      const antiCard = deck.find(c => c.name?.toLowerCase() === rule.card.toLowerCase());
      if (antiCard) {
        score -= 15;
        criticalViolations.push(`Anti-sinergia detectada: "${rule.card}" arruina el motor "${activeStrategy}". ${rule.reason}`);
      }
    }
  });

  return {
    score: Math.max(0, score),
    criticalViolations,
    warnings,
    recommendedSwaps
  };
}

/**
 * Calcula el Radar de Consistencia Estadística (7 métricas de 0 a 100) para un mazo de 60 cartas.
 */
export function evaluateConsistencyRadar(deck = [], deckDNA = {}) {
  const spellsOnly = deck.filter(c => !isLand(c));
  const landsOnly = deck.filter(c => isLand(c));
  
  // 1. CONSISTENCIA (Ratio de playsets 4x/3x)
  let playsetsCount = 0;
  spellsOnly.forEach(c => {
    const qty = c.count || c.qty || 1;
    if (qty >= 4) playsetsCount += 2;
    else if (qty === 3) playsetsCount += 1;
  });
  const consistenciaScore = Math.min(100, Math.round(50 + (playsetsCount * 4)));

  // 2. CURVA (Alineación con VMP y DeckSkeleton)
  const vmp = calculateVMP(spellsOnly);
  const targetWinTurn = deckDNA.gamePlan?.winTurnTarget || 5;
  let curvaScore = 80;
  if (targetWinTurn <= 4 && vmp <= 2.2) curvaScore = 95;
  else if (targetWinTurn >= 6 && vmp >= 3.0) curvaScore = 90;

  // 3. SINERGIA GLOBAL
  let sinergiaScore = 85;

  // 4. RESILIENCIA (Ventaja de cartas e interacción)
  let resilienciaScore = 80;
  const drawCards = spellsOnly.filter(c => (c.oracle_text || cardText(c)).toLowerCase().includes('draw'));
  if (drawCards.length >= 4) resilienciaScore += 12;

  // 5. VELOCIDAD (Turno medio de victoria estimado)
  let velocidadScore = Math.min(100, Math.max(40, Math.round(110 - (targetWinTurn * 10))));

  // 6. VERSATILIDAD (Flexibilidad y respuestas)
  let versatilidadScore = 82;

  // 7. MANABASE (Frank Karsten check)
  const targetLands = deckDNA.deckSkeleton?.landsTarget || 22;
  const actualLands = landsOnly.reduce((acc, c) => acc + (c.count || c.qty || 1), 0);
  let manabaseScore = Math.max(0, 100 - (Math.abs(actualLands - targetLands) * 8));

  function cardText(c) {
    return c.text || c.oracle_text || '';
  }

  const overallHealth = Math.round(
    (consistenciaScore + curvaScore + sinergiaScore + resilienciaScore + velocidadScore + versatilidadScore + manabaseScore) / 7
  );

  return {
    overallHealth,
    radar: {
      consistencia: consistenciaScore,
      curva: curvaScore,
      sinergia: sinergiaScore,
      resiliencia: resilienciaScore,
      velocidad: velocidadScore,
      versatilidad: versatilidadScore,
      manabase: manabaseScore
    }
  };
}




