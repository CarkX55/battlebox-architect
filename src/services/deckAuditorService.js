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
  const power = parseInt(card.power || '0', 10);
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
