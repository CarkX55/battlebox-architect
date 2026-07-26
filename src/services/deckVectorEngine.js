/**
 * src/services/deckVectorEngine.js
 * 
 * Motor de Cálculo de Estado de Vectores de Mazo y Execution Scores Dinámicos.
 */

import { parseSemanticCard } from './semanticCardParser.js';

/**
 * Calcula el Vector de Estado acumulado de una lista de cartas del mazo.
 * 
 * @param {Array} deckCards Lista de cartas presentes actualmente en el mazo
 * @returns {Object} Vector de estado del mazo (deckState)
 */
export function calculateDeckStateVector(deckCards = []) {
  const state = {
    totalCards: deckCards.length,
    creatureCount: 0,
    instantSorceryCount: 0,
    artifactCount: 0,
    tokenGeneratorsCount: 0,
    sacOutletsCount: 0,
    deathPayoffsCount: 0,
    countersCount: 0,
    avgCMC: 0,
    capabilities: {
      ManaAcceleration: 0,
      TempoBoost: 0,
      BoardPressure: 0,
      FinisherLethality: 0,
      CardDrawEfficiency: 0,
      RemovalImpact: 0,
      EarlyGameScore: 0,
      LateGameScore: 0
    },
    activeStrategies: new Set()
  };

  if (!Array.isArray(deckCards) || deckCards.length === 0) {
    return state;
  }

  let totalCMC = 0;

  deckCards.forEach(card => {
    const sem = card.semantic_representation || parseSemanticCard(card);
    const qty = card.qty || 1;

    totalCMC += (sem.cmc || 2) * qty;

    // Métricas por Tipo
    const typeLower = (sem.typeLine || '').toLowerCase();
    if (typeLower.includes('creature')) state.creatureCount += qty;
    if (typeLower.includes('instant') || typeLower.includes('sorcery')) state.instantSorceryCount += qty;
    if (typeLower.includes('artifact')) state.artifactCount += qty;

    // Conectores y Motores
    if (sem.enables.includes('BoardWidth')) state.tokenGeneratorsCount += qty;
    if (sem.enables.includes('SacOutlet')) state.sacOutletsCount += qty;
    if (sem.enables.includes('DeathPayoff')) state.deathPayoffsCount += qty;
    if (sem.requirements.requiresCounters) state.countersCount += qty;

    sem.enables.forEach(strat => state.activeStrategies.add(strat));
    sem.multiplies.forEach(strat => state.activeStrategies.add(strat));

    // Acumulación de Capacidades
    Object.keys(state.capabilities).forEach(cap => {
      state.capabilities[cap] += (sem.capabilities[cap] || 0) * qty;
    });
  });

  state.avgCMC = state.totalCards > 0 ? (totalCMC / state.totalCards).toFixed(2) : 0;

  // Promediar capacidades
  if (state.totalCards > 0) {
    Object.keys(state.capabilities).forEach(cap => {
      state.capabilities[cap] = Math.round(state.capabilities[cap] / state.totalCards);
    });
  }

  return state;
}

/**
 * Calcula el Execution Score dinámico (0-100) para una carta dada frente al estado actual del mazo.
 * 
 * @param {Object} card Carta candidata a evaluar
 * @param {Object} deckState Vector de estado del mazo
 * @returns {Number} Execution Score entre 0 y 100
 */
export function calculateExecutionScore(card, deckState) {
  if (!card) return 0;
  if (!deckState || deckState.totalCards === 0) {
    // Si el mazo está vacío, devolver el score de base de la carta
    const sem = card.semantic_representation || parseSemanticCard(card);
    return Math.max(50, sem.capabilities.BoardPressure || sem.capabilities.RemovalImpact || 50);
  }

  const sem = card.semantic_representation || parseSemanticCard(card);
  let score = 70; // Base neutra de arranque

  const req = sem.requirements;

  // 1. EVALUACIÓN DE REQUISITOS (Penalizaciones severas si no se cumplen)
  if (req.minBoardWidth > 0) {
    const creatureRatio = deckState.creatureCount / Math.max(1, deckState.totalCards);
    if (creatureRatio < 0.25 && deckState.tokenGeneratorsCount < 4) {
      score -= 45; // Penalizar fuertemente cartas Go-Wide / Finishers sin mesa
    } else if (creatureRatio >= 0.40) {
      score += 25; // Bonificar Finishers cuando hay masa crítica de criaturas
    }
  }

  if (req.minInstantSorceryCount > 0) {
    if (deckState.instantSorceryCount < 6) {
      score -= 40; // Spellslinger inútil en mazo sin instantes
    } else {
      score += 20;
    }
  }

  if (req.requiresSacrificeFodder) {
    if (deckState.tokenGeneratorsCount + deckState.creatureCount < 8 && !sem.enables.includes('BoardWidth')) {
      score -= 35; // Sac-outlet o payoff sin víctimas
    } else {
      score += 20;
    }
  }

  if (req.requiresCounters) {
    if (deckState.countersCount < 3) {
      score -= 30; // Modificador de contadores sin contadores
    }
  }

  // 2. CONFLICTOS ESTRATÉGICOS
  sem.conflicts.forEach(conflict => {
    if (conflict === 'GoWideStrategy' && deckState.creatureCount > 15) {
      score -= 25; // Wipe en mazo Go-Wide
    }
  });

  // 3. APORTE A LAS NECESIDADES DEL MAZO
  // Si el mazo carece de Robo de Cartas y la carta aporta Robo:
  if (deckState.capabilities.CardDrawEfficiency < 30 && sem.capabilities.CardDrawEfficiency > 60) {
    score += 20;
  }
  // Si el mazo carece de Aceleración y la carta es Ramp temprano:
  if (deckState.capabilities.ManaAcceleration < 25 && sem.capabilities.ManaAcceleration > 70) {
    score += 20;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
