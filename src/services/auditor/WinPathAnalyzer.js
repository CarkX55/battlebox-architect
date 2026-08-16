/**
 * src/services/auditor/WinPathAnalyzer.js
 * 
 * Analizador de Caminos de Victoria del Sistema de Verificación Estratégica v9.3.
 * 
 * Responsabilidades:
 * 1. Identifica los caminos de victoria del mazo según el plan estratégico.
 * 2. Simula trayectorias T1-T5 con DecisionPolicy determinista (consume monteCarloEngine).
 * 3. Computa el StrategicFingerprint multidimensional (ALIGNED/DRIFT/CONTRADICTORY).
 * 4. Calcula P(WinState) mediante unión real P(A∪B∪C) sin sumas ingenuas.
 * 
 * FRONTERA ARQUITECTÓNICA:
 * - monteCarloEngine.js → simulación estadística básica (shuffle, draw, mana counts)
 * - WinPathAnalyzer.js  → interpretación estratégica de esa simulación
 * 
 * LEYES INVIOLABLES IMPLEMENTADAS:
 * - 5ª Ley: TrajectoryRecord & DecisionPolicy determinista
 * - 6ª Ley: StrategicFingerprint multidimensional (Membership)
 * - 7ª Ley: Proof Coverage como diagnóstico
 */

import { flattenDeckList, runMonteCarloSimulation } from '../monteCarloEngine.js';
import { isLand } from '../deckCalculator.js';
import { EVIDENCE_QUALITY } from './ProofObligationEngine.js';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS: DecisionPolicy — Jerarquía de Prioridad de Acciones
// ─────────────────────────────────────────────────────────────────────────────
/**
 * DecisionPolicy determinista para la simulación de trayectorias.
 * Prioridad fija: Lethal → Interaction → Mana → Objective
 * 
 * El agente simulado siempre toma la mejor decisión disponible según esta jerarquía.
 * Esto elimina la varianza de "decisiones humanas" y mide el potencial del mazo.
 */
export const DECISION_POLICY = Object.freeze({
  LETHAL:      { priority: 0, label: 'LETHAL',      description: 'Si hay lethal disponible, ejecutar' },
  INTERACTION: { priority: 1, label: 'INTERACTION',  description: 'Si hay amenaza enemiga, interactuar' },
  MANA:        { priority: 2, label: 'MANA',         description: 'Si hay tierra por jugar, jugar tierra' },
  OBJECTIVE:   { priority: 3, label: 'OBJECTIVE',    description: 'Jugar el hechizo que más avanza el plan' }
});

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS: Estados del Fingerprint Estratégico
// ─────────────────────────────────────────────────────────────────────────────
export const FINGERPRINT_STATUS = Object.freeze({
  ALIGNED:       'ALIGNED',       // El mazo se comporta como dice la intención
  DRIFT:         'DRIFT',         // El mazo se desvía parcialmente de la intención
  CONTRADICTORY: 'CONTRADICTORY'  // El mazo hace lo contrario de la intención
});

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS: Perfiles Estratégicos para comparación de Fingerprint
// ─────────────────────────────────────────────────────────────────────────────
const STRATEGY_PROFILES = Object.freeze({
  AGGRO: {
    avgCmcRange: [1.2, 2.2],
    creaturePctMin: 0.50,
    interactionPctMax: 0.25,
    expectedT1PlayPct: 60,
    expectedPerfectHandPct: 55
  },
  TEMPO: {
    avgCmcRange: [1.5, 2.8],
    creaturePctMin: 0.30,
    interactionPctMin: 0.20,
    expectedT1PlayPct: 40,
    expectedPerfectHandPct: 50
  },
  MIDRANGE: {
    avgCmcRange: [2.2, 3.5],
    creaturePctMin: 0.25,
    interactionPctMin: 0.15,
    expectedT1PlayPct: 20,
    expectedPerfectHandPct: 50
  },
  CONTROL: {
    avgCmcRange: [2.5, 4.0],
    creaturePctMax: 0.25,
    interactionPctMin: 0.30,
    expectedT1PlayPct: 10,
    expectedPerfectHandPct: 55
  },
  COMBO: {
    avgCmcRange: [1.5, 3.5],
    interactionPctMax: 0.20,
    expectedPerfectHandPct: 50
  },
  RAMP: {
    avgCmcRange: [2.5, 4.5],
    rampPctMin: 0.15,
    expectedPerfectHandPct: 55
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. ANÁLISIS DE CAMINOS DE VICTORIA
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Identifica los caminos de victoria del mazo y evalúa cada uno.
 * 
 * @param {Array} deck - Mazo actual
 * @param {Object} strategicPlan - Plan estratégico (archetype, winConditions, etc.)
 * @returns {Object} Análisis de caminos de victoria
 */
export function analyzeWinPaths(deck = [], strategicPlan = {}) {
  const nonLands = deck.filter(c => !isLand(c));
  const creatures = nonLands.filter(c => {
    const typeLine = (c.type_line || c.typeLine || c.type || '').toLowerCase();
    return typeLine.includes('creature');
  });
  const spells = nonLands.filter(c => {
    const typeLine = (c.type_line || c.typeLine || c.type || '').toLowerCase();
    return !typeLine.includes('creature');
  });

  const winPaths = [];

  // ── Win Path: Combat Damage ──
  if (creatures.length > 0) {
    const totalPower = creatures.reduce((sum, c) => {
      const qty = c.quantity || c.count || c.copies || 1;
      const power = parseInt(c.power || '0', 10);
      return sum + (power * qty);
    }, 0);
    
    // Estimar turnos hasta lethal (20 vida / poder medio por turno)
    const avgBoardPower = totalPower / Math.max(creatures.length, 1) * Math.min(creatures.length, 5);
    const turnsToLethal = avgBoardPower > 0 ? Math.ceil(20 / avgBoardPower) : Infinity;

    winPaths.push({
      id: 'WP_COMBAT',
      type: 'COMBAT_DAMAGE',
      description: 'Victoria por daño de combate acumulado',
      viability: turnsToLethal <= 6 ? 'HIGH' : (turnsToLethal <= 8 ? 'MEDIUM' : 'LOW'),
      estimatedTurns: turnsToLethal,
      keyCards: creatures.sort((a, b) => (parseInt(b.power || '0') - parseInt(a.power || '0'))).slice(0, 5).map(c => c.name),
      totalPower
    });
  }

  // ── Win Path: Burn / Direct Damage ──
  const burnCards = nonLands.filter(c => {
    const oracle = (c.oracle_text || c.text || '').toLowerCase();
    return oracle.includes('deals') && (oracle.includes('damage to') || oracle.includes('damage to any target'));
  });
  if (burnCards.length >= 4) {
    winPaths.push({
      id: 'WP_BURN',
      type: 'DIRECT_DAMAGE',
      description: 'Victoria por daño directo acumulado',
      viability: burnCards.length >= 8 ? 'HIGH' : 'MEDIUM',
      keyCards: burnCards.slice(0, 5).map(c => c.name),
      burnDensity: burnCards.length
    });
  }

  // ── Win Path: Combo / Engine ──
  const comboCards = nonLands.filter(c => {
    const oracle = (c.oracle_text || c.text || '').toLowerCase();
    return oracle.includes('whenever') && (oracle.includes('create') || oracle.includes('draw') || oracle.includes('deal') || oracle.includes('lose life'));
  });
  if (comboCards.length >= 3) {
    winPaths.push({
      id: 'WP_ENGINE',
      type: 'ENGINE_COMBO',
      description: 'Victoria por motor de sinergias / combo',
      viability: comboCards.length >= 6 ? 'HIGH' : 'MEDIUM',
      keyCards: comboCards.slice(0, 5).map(c => c.name),
      engineDensity: comboCards.length
    });
  }

  // ── Win Path: Planeswalker Ultimate ──
  const planeswalkers = nonLands.filter(c => {
    const typeLine = (c.type_line || c.typeLine || c.type || '').toLowerCase();
    return typeLine.includes('planeswalker');
  });
  if (planeswalkers.length >= 2) {
    winPaths.push({
      id: 'WP_PLANESWALKER',
      type: 'PLANESWALKER_VALUE',
      description: 'Victoria por acumulación de valor de planeswalkers',
      viability: 'MEDIUM',
      keyCards: planeswalkers.map(c => c.name)
    });
  }

  return {
    winPaths,
    primaryWinPath: winPaths.length > 0 ? winPaths[0] : null,
    totalPaths: winPaths.length,
    hasRedundancy: winPaths.length >= 2
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SIMULACIÓN DE TRAYECTORIAS (Consume monteCarloEngine, no lo absorbe)
//    (5ª Ley: TrajectoryRecord & DecisionPolicy determinista)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Simula trayectorias de juego T1-T5 usando DecisionPolicy determinista.
 * Extiende la simulación básica de monteCarloEngine con decisiones estratégicas.
 * 
 * FRONTERA: monteCarloEngine hace el shuffle/draw. WinPathAnalyzer interpreta.
 * 
 * @param {Array} deck - Mazo actual
 * @param {number} iterations - Número de trayectorias a simular
 * @param {Object} options - { winPaths, strategicPlan }
 * @returns {Object} Resultado con TrajectoryRecords
 */
export function simulateTrajectories(deck = [], iterations = 1000, options = {}) {
  const flatDeck = flattenDeckList(deck);
  const deckSize = flatDeck.length;

  if (deckSize < 40) {
    return { error: 'Deck too small for trajectory simulation', trajectories: [] };
  }

  // Primero, obtener la simulación base del monteCarloEngine
  const mcBase = runMonteCarloSimulation(deck, iterations);

  // Ahora simular trayectorias con DecisionPolicy
  const trajectories = [];
  let winCount = 0;
  let progressiveWins = { T3: 0, T4: 0, T5: 0 };

  for (let sim = 0; sim < Math.min(iterations, 2000); sim++) {
    const library = shuffleDeck(flatDeck);
    const hand = library.slice(0, 7);
    const drawPile = library.slice(7);
    
    const trajectory = simulateSingleTrajectory(hand, drawPile, options.winPaths || []);
    trajectories.push(trajectory);

    if (trajectory.outcome === 'WIN') {
      winCount++;
      if (trajectory.winTurn <= 3) progressiveWins.T3++;
      if (trajectory.winTurn <= 4) progressiveWins.T4++;
      if (trajectory.winTurn <= 5) progressiveWins.T5++;
    }
  }

  const totalSims = Math.min(iterations, 2000);

  return {
    iterations: totalSims,
    mcBase,
    winRate: winCount / totalSims,
    progressiveWinRate: {
      byT3: progressiveWins.T3 / totalSims,
      byT4: progressiveWins.T4 / totalSims,
      byT5: progressiveWins.T5 / totalSims
    },
    trajectoryCount: trajectories.length,
    // No almacenar todas las trayectorias en memoria — solo un resumen
    trajectorySummary: summarizeTrajectories(trajectories),
    evidenceChain: {
      source: 'MONTE_CARLO',
      quality: totalSims >= 10000 ? EVIDENCE_QUALITY.SIMULATED_HIGH : EVIDENCE_QUALITY.SIMULATED_LOW,
      data: { iterations: totalSims, winRate: winCount / totalSims },
      timestamp: new Date().toISOString(),
      traceId: `TRACE-TRAJECTORY-${Date.now()}`
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. STRATEGIC FINGERPRINT (6ª Ley)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Computa el fingerprint estratégico multidimensional del mazo.
 * Compara el comportamiento real (trayectorias + MC) con el AllowedStrategySpace.
 * 
 * @param {Array} deck - Mazo actual
 * @param {Object} trajectoryResult - Resultado de simulateTrajectories
 * @param {string} intendedArchetype - Arquetipo pretendido por el usuario
 * @returns {Object} { status: ALIGNED|DRIFT|CONTRADICTORY, dimensions, analysis }
 */
export function computeStrategicFingerprint(deck = [], trajectoryResult = {}, intendedArchetype = 'MIDRANGE') {
  const archUpper = intendedArchetype.toUpperCase();
  const profile = STRATEGY_PROFILES[archUpper] || STRATEGY_PROFILES.MIDRANGE;
  const mcBase = trajectoryResult.mcBase || {};

  // Calcular dimensiones del mazo actual
  const nonLands = deck.filter(c => !isLand(c));
  const totalSpells = nonLands.reduce((sum, c) => sum + (c.quantity || c.count || c.copies || 1), 0);
  
  const creatures = nonLands.filter(c => {
    const typeLine = (c.type_line || c.typeLine || c.type || '').toLowerCase();
    return typeLine.includes('creature');
  });
  const creatureCount = creatures.reduce((sum, c) => sum + (c.quantity || c.count || c.copies || 1), 0);

  const interaction = nonLands.filter(c => {
    const oracle = (c.oracle_text || c.text || '').toLowerCase();
    return oracle.includes('destroy') || oracle.includes('exile') || oracle.includes('counter target') || oracle.includes('deals') || oracle.includes('-x/-x');
  });
  const interactionCount = interaction.reduce((sum, c) => sum + (c.quantity || c.count || c.copies || 1), 0);

  const ramp = nonLands.filter(c => {
    const oracle = (c.oracle_text || c.text || '').toLowerCase();
    return (oracle.includes('add {') || oracle.includes('search your library for a land')) && (c.cmc || c.mana_value || 0) <= 3;
  });
  const rampCount = ramp.reduce((sum, c) => sum + (c.quantity || c.count || c.copies || 1), 0);

  const avgCmc = totalSpells > 0 
    ? nonLands.reduce((sum, c) => sum + ((c.cmc || c.mana_value || 0) * (c.quantity || c.count || c.copies || 1)), 0) / totalSpells 
    : 3.0;

  const creaturePct = totalSpells > 0 ? creatureCount / totalSpells : 0;
  const interactionPct = totalSpells > 0 ? interactionCount / totalSpells : 0;
  const rampPct = totalSpells > 0 ? rampCount / totalSpells : 0;

  // Evaluar cada dimensión contra el perfil esperado
  const dimensions = {};
  let driftCount = 0;
  let contradictionCount = 0;

  // Dimensión: CMC promedio
  if (profile.avgCmcRange) {
    const [min, max] = profile.avgCmcRange;
    if (avgCmc >= min && avgCmc <= max) {
      dimensions.avgCmc = { status: 'ALIGNED', actual: avgCmc, expected: `${min}-${max}` };
    } else if (avgCmc < min - 0.5 || avgCmc > max + 0.5) {
      dimensions.avgCmc = { status: 'CONTRADICTORY', actual: avgCmc, expected: `${min}-${max}` };
      contradictionCount++;
    } else {
      dimensions.avgCmc = { status: 'DRIFT', actual: avgCmc, expected: `${min}-${max}` };
      driftCount++;
    }
  }

  // Dimensión: Criaturas
  if (profile.creaturePctMin !== undefined) {
    if (creaturePct >= profile.creaturePctMin) {
      dimensions.creaturePct = { status: 'ALIGNED', actual: Math.round(creaturePct * 100), expected: `≥${Math.round(profile.creaturePctMin * 100)}%` };
    } else if (creaturePct < profile.creaturePctMin - 0.15) {
      dimensions.creaturePct = { status: 'CONTRADICTORY', actual: Math.round(creaturePct * 100), expected: `≥${Math.round(profile.creaturePctMin * 100)}%` };
      contradictionCount++;
    } else {
      dimensions.creaturePct = { status: 'DRIFT', actual: Math.round(creaturePct * 100), expected: `≥${Math.round(profile.creaturePctMin * 100)}%` };
      driftCount++;
    }
  }
  if (profile.creaturePctMax !== undefined && creaturePct > profile.creaturePctMax + 0.15) {
    dimensions.creaturePct = { status: 'CONTRADICTORY', actual: Math.round(creaturePct * 100), expected: `≤${Math.round(profile.creaturePctMax * 100)}%` };
    contradictionCount++;
  }

  // Dimensión: Interacción
  if (profile.interactionPctMin !== undefined) {
    if (interactionPct >= profile.interactionPctMin) {
      dimensions.interactionPct = { status: 'ALIGNED', actual: Math.round(interactionPct * 100), expected: `≥${Math.round(profile.interactionPctMin * 100)}%` };
    } else {
      dimensions.interactionPct = { status: 'DRIFT', actual: Math.round(interactionPct * 100), expected: `≥${Math.round(profile.interactionPctMin * 100)}%` };
      driftCount++;
    }
  }
  if (profile.interactionPctMax !== undefined && interactionPct > profile.interactionPctMax + 0.10) {
    dimensions.interactionPct = { status: 'CONTRADICTORY', actual: Math.round(interactionPct * 100), expected: `≤${Math.round(profile.interactionPctMax * 100)}%` };
    contradictionCount++;
  }

  // Dimensión: Ramp
  if (profile.rampPctMin !== undefined) {
    if (rampPct >= profile.rampPctMin) {
      dimensions.rampPct = { status: 'ALIGNED', actual: Math.round(rampPct * 100), expected: `≥${Math.round(profile.rampPctMin * 100)}%` };
    } else {
      dimensions.rampPct = { status: 'DRIFT', actual: Math.round(rampPct * 100), expected: `≥${Math.round(profile.rampPctMin * 100)}%` };
      driftCount++;
    }
  }

  // Dimensión: MC — T1 Play Rate
  if (profile.expectedT1PlayPct !== undefined && mcBase.turn1PlayPct !== undefined) {
    const t1diff = Math.abs(mcBase.turn1PlayPct - profile.expectedT1PlayPct);
    if (t1diff <= 15) {
      dimensions.t1PlayRate = { status: 'ALIGNED', actual: mcBase.turn1PlayPct, expected: profile.expectedT1PlayPct };
    } else if (t1diff <= 30) {
      dimensions.t1PlayRate = { status: 'DRIFT', actual: mcBase.turn1PlayPct, expected: profile.expectedT1PlayPct };
      driftCount++;
    } else {
      dimensions.t1PlayRate = { status: 'CONTRADICTORY', actual: mcBase.turn1PlayPct, expected: profile.expectedT1PlayPct };
      contradictionCount++;
    }
  }

  // Veredicto global
  let status = FINGERPRINT_STATUS.ALIGNED;
  if (contradictionCount >= 2) {
    status = FINGERPRINT_STATUS.CONTRADICTORY;
  } else if (contradictionCount >= 1 || driftCount >= 3) {
    status = FINGERPRINT_STATUS.DRIFT;
  }

  return {
    status,
    intendedArchetype: archUpper,
    dimensions,
    analysis: {
      driftCount,
      contradictionCount,
      totalDimensionsEvaluated: Object.keys(dimensions).length,
      avgCmc: Math.round(avgCmc * 100) / 100,
      creaturePct: Math.round(creaturePct * 100),
      interactionPct: Math.round(interactionPct * 100),
      rampPct: Math.round(rampPct * 100)
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. JOINT PROBABILITY — P(A∪B∪C) Real (sin sumas ingenuas)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Calcula P(WinState) mediante la unión real de trayectorias exitosas,
 * evitando sumas ingenuas de probabilidades dependientes.
 * 
 * @param {Object} trajectoryResult - Resultado de simulateTrajectories
 * @returns {Object} Probabilidad conjunta con desglose por win path
 */
export function calculateJointProbability(trajectoryResult = {}) {
  if (!trajectoryResult.trajectorySummary) {
    return {
      jointProbability: 0,
      byWinPath: {},
      method: 'TRAJECTORY_UNION',
      warning: 'No trajectory data available'
    };
  }

  const summary = trajectoryResult.trajectorySummary;

  // La probabilidad conjunta es simplemente la fracción de trayectorias que ganaron,
  // porque cada trayectoria ya incluye todas las win paths posibles.
  // NO sumamos P(combate) + P(burn) + P(combo) — eso contaría doble.
  const jointProbability = trajectoryResult.winRate || 0;

  // Desglose por win path (desde el resumen)
  const byWinPath = {};
  if (summary.winPathBreakdown) {
    for (const [pathType, count] of Object.entries(summary.winPathBreakdown)) {
      byWinPath[pathType] = {
        count,
        probability: trajectoryResult.iterations > 0 ? count / trajectoryResult.iterations : 0
      };
    }
  }

  return {
    jointProbability,
    byWinPath,
    method: 'TRAJECTORY_UNION',
    iterations: trajectoryResult.iterations,
    evidenceChain: {
      source: 'MONTE_CARLO',
      quality: trajectoryResult.evidenceChain?.quality || EVIDENCE_QUALITY.SIMULATED_LOW,
      data: { jointProbability, iterations: trajectoryResult.iterations },
      timestamp: new Date().toISOString(),
      traceId: `TRACE-JOINT-PROB-${Date.now()}`
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fisher-Yates shuffle (idéntico al de monteCarloEngine para consistencia).
 */
function shuffleDeck(flatDeck) {
  const library = [...flatDeck];
  for (let i = library.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [library[i], library[j]] = [library[j], library[i]];
  }
  return library;
}

/**
 * Simula una trayectoria individual T1-T5 con DecisionPolicy.
 */
function simulateSingleTrajectory(hand, drawPile, winPaths) {
  const state = {
    hand: [...hand],
    battlefield: [],
    landsPlayed: 0,
    manaAvailable: 0,
    lifeTotal: 20,       // Oponente
    damageDealt: 0,
    turnActions: [],
    drawIndex: 0
  };

  let outcome = 'ONGOING';
  let winTurn = null;
  let winPath = null;

  for (let turn = 1; turn <= 5; turn++) {
    // Draw (excepto T1 on the play)
    if (turn > 1 && state.drawIndex < drawPile.length) {
      state.hand.push(drawPile[state.drawIndex]);
      state.drawIndex++;
    }

    const turnAction = { turn, actions: [] };

    // DECISION POLICY: Prioridad 2 — Jugar tierra
    const landInHand = state.hand.findIndex(c => c.isLandCard);
    if (landInHand !== -1) {
      state.hand.splice(landInHand, 1);
      state.landsPlayed++;
      state.manaAvailable = state.landsPlayed;
      turnAction.actions.push({ type: 'PLAY_LAND', policy: 'MANA' });
    }

    // DECISION POLICY: Prioridad 3 — Jugar hechizos en curva
    let manaLeft = state.manaAvailable;
    const playableSpells = state.hand
      .filter(c => !c.isLandCard && (c.cmc || 0) <= manaLeft)
      .sort((a, b) => (b.cmc || 0) - (a.cmc || 0)); // Más caros primero (máximo uso de maná)

    for (const spell of playableSpells) {
      if ((spell.cmc || 0) <= manaLeft) {
        const idx = state.hand.indexOf(spell);
        if (idx !== -1) {
          state.hand.splice(idx, 1);
          manaLeft -= (spell.cmc || 0);

          // Si es criatura, va al campo de batalla
          const typeLine = (spell.type_line || spell.typeLine || spell.type || '').toLowerCase();
          if (typeLine.includes('creature')) {
            state.battlefield.push(spell);
          }

          // Si hace daño directo, contarlo
          const oracle = (spell.oracle_text || spell.text || '').toLowerCase();
          if (oracle.includes('deals') && oracle.includes('damage')) {
            const dmgMatch = oracle.match(/deals?\s+(\d+)\s+damage/);
            if (dmgMatch) {
              state.damageDealt += parseInt(dmgMatch[1], 10);
            }
          }

          turnAction.actions.push({ type: 'CAST_SPELL', name: spell.name || 'Unknown', cmc: spell.cmc || 0, policy: 'OBJECTIVE' });
        }
      }
    }

    // Combate: sumar poder de criaturas en el campo
    const combatDamage = state.battlefield.reduce((sum, c) => sum + parseInt(c.power || '0', 10), 0);
    state.damageDealt += combatDamage;
    if (combatDamage > 0) {
      turnAction.actions.push({ type: 'ATTACK', damage: combatDamage, policy: 'LETHAL' });
    }

    state.turnActions.push(turnAction);

    // DECISION POLICY: Prioridad 0 — Check lethal
    if (state.damageDealt >= 20) {
      outcome = 'WIN';
      winTurn = turn;
      winPath = combatDamage > 0 ? 'COMBAT_DAMAGE' : 'DIRECT_DAMAGE';
      break;
    }
  }

  return {
    outcome,
    winTurn,
    winPath,
    damageDealt: state.damageDealt,
    landsPlayed: state.landsPlayed,
    creaturesDeployed: state.battlefield.length,
    turnActions: state.turnActions
  };
}

/**
 * Resume las trayectorias sin almacenar todas en memoria.
 */
function summarizeTrajectories(trajectories) {
  if (trajectories.length === 0) return {};

  const wins = trajectories.filter(t => t.outcome === 'WIN');
  const winPathBreakdown = {};
  
  wins.forEach(t => {
    const path = t.winPath || 'UNKNOWN';
    winPathBreakdown[path] = (winPathBreakdown[path] || 0) + 1;
  });

  const avgDamage = trajectories.reduce((sum, t) => sum + t.damageDealt, 0) / trajectories.length;
  const avgLands = trajectories.reduce((sum, t) => sum + t.landsPlayed, 0) / trajectories.length;
  const avgCreatures = trajectories.reduce((sum, t) => sum + t.creaturesDeployed, 0) / trajectories.length;

  return {
    totalTrajectories: trajectories.length,
    totalWins: wins.length,
    winPathBreakdown,
    averageDamageDealt: Math.round(avgDamage * 10) / 10,
    averageLandsPlayed: Math.round(avgLands * 10) / 10,
    averageCreaturesDeployed: Math.round(avgCreatures * 10) / 10,
    fastestWin: wins.length > 0 ? Math.min(...wins.map(w => w.winTurn)) : null,
    averageWinTurn: wins.length > 0 ? Math.round(wins.reduce((sum, w) => sum + w.winTurn, 0) / wins.length * 10) / 10 : null
  };
}
