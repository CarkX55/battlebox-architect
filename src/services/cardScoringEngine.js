/**
 * src/services/cardScoringEngine.js
 * 
 * Motor Determinista de Puntuación de Cartas (Score 0-100) para 60 Cartas.
 * 
 * Evalúa cuantitativamente el encaje de cada carta candidata frente al `DeckDNA60`:
 * 1. Afinidad con el GamePlan (30%)
 * 2. Sinergia con el CorePackage / Cartas fijas (25%)
 * 3. Encaje en la Curva del DeckSkeleton (20%)
 * 4. Eficiencia de Maná y CMC (15%)
 * 5. Relevancia de Metagame / MTGTop8 Staples (10%)
 */

import { getCardKnowledge, calculatePairwiseSynergyScore } from './knowledgeGraphService.js';

/**
 * Evalúa y calcula una puntuación de 0 a 100 para una carta frente al DeckDNA60.
 */
export function scoreCardForDeckDNA(card, deckDNA, injectedCoreCards = [], occupiedCurve = {}) {
  if (!card || !deckDNA) return 0;

  // 1. AFINIDAD CON EL GAMEPLAN (30%)
  let gamePlanScore = 50; // Base neutra
  const know = getCardKnowledge(card);
  const archetype = (deckDNA.archetype || 'aggro').toLowerCase();

  if (archetype.includes('aggro') || archetype.includes('blitz')) {
    if (know.roles.includes('Threat') || know.roles.includes('Burn') || know.tags.includes('Haste') || know.tags.includes('Prowess')) {
      gamePlanScore += 45;
    }
  } else if (archetype.includes('control')) {
    if (know.roles.includes('Removal') || know.roles.includes('Counterspell') || know.roles.includes('CardDraw')) {
      gamePlanScore += 45;
    }
  } else if (archetype.includes('tempo')) {
    if (know.roles.includes('Interaction') || know.roles.includes('CardDraw') || know.tags.includes('Flash') || know.tags.includes('Flying')) {
      gamePlanScore += 45;
    }
  } else {
    // Generico
    if (know.roles.length > 0) gamePlanScore += 25;
  }
  gamePlanScore = Math.min(100, Math.max(0, gamePlanScore));

  // 2. SINERGIA CON EL CORE PACKAGE (25%)
  let coreSynergyScore = 50;
  if (injectedCoreCards.length > 0) {
    let totalPairwiseScore = 0;
    let comparisons = 0;

    injectedCoreCards.forEach(coreCard => {
      const pScore = calculatePairwiseSynergyScore(card, coreCard);
      totalPairwiseScore += pScore;
      comparisons++;
    });

    if (comparisons > 0) {
      const avgPairwise = totalPairwiseScore / comparisons; // 0..10
      coreSynergyScore = Math.min(100, avgPairwise * 10);
    }
  }

  // 3. ENCAJE EN LA CURVA DEL DECK SKELETON (20%)
  let curveScore = 50;
  const cmc = typeof card.cmc === 'number' ? card.cmc : parseInt(card.cmc || 2, 10);
  const targetCurve = deckDNA.deckSkeleton?.curveDistribution || { 1: 12, 2: 14, 3: 8, 4: 4, 5: 0 };
  const targetSlotCount = targetCurve[cmc] || (cmc >= 5 ? targetCurve[5] || 0 : 4);

  if (targetSlotCount > 0) {
    const currentOccupied = occupiedCurve[cmc] || 0;
    if (currentOccupied < targetSlotCount) {
      curveScore = 95; // Alto incentivo para llenar el hueco de curva
    } else {
      curveScore = 30; // Penalización por saturar ese coste de maná
    }
  } else {
    curveScore = 20; // Penalización si la curva no quiere cartas de este coste
  }

  // 4. EFICIENCIA DE MANÁ (15%)
  let efficiencyScore = 50;
  if (cmc <= 1) efficiencyScore = 95;
  else if (cmc === 2) efficiencyScore = 85;
  else if (cmc === 3) efficiencyScore = 70;
  else if (cmc === 4) efficiencyScore = 55;
  else efficiencyScore = 40;

  // 5. RELEVANCIA DE METAGAME / STAPLE (10%)
  let metaScore = card.metaScore || card.popularity || 50;
  metaScore = Math.min(100, Math.max(0, metaScore));

  // CÁLCULO FINAL PONDERADO (0-100)
  const finalScore = Math.round(
    (gamePlanScore * 0.30) +
    (coreSynergyScore * 0.25) +
    (curveScore * 0.20) +
    (efficiencyScore * 0.15) +
    (metaScore * 0.10)
  );

  return Math.max(0, Math.min(100, finalScore));
}

/**
 * Puntuación y ordenación determinista de un pool completo de cartas candidatas.
 */
export function scoreAndRankCandidatePool(cardPool = [], deckDNA, injectedCoreCards = []) {
  if (!Array.isArray(cardPool) || cardPool.length === 0) return [];

  const occupiedCurve = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  injectedCoreCards.forEach(c => {
    const cmc = c.cmc || 2;
    const bucket = cmc >= 5 ? 5 : cmc;
    occupiedCurve[bucket] = (occupiedCurve[bucket] || 0) + (c.qty || 4);
  });

  const scoredPool = cardPool.map(card => {
    const score = scoreCardForDeckDNA(card, deckDNA, injectedCoreCards, occupiedCurve);
    const know = getCardKnowledge(card);
    return {
      ...card,
      score,
      roles: know.roles,
      tags: know.tags,
      engines: know.engines
    };
  });

  // Ordenar descendentemente por Score (100 -> 0)
  scoredPool.sort((a, b) => b.score - a.score);

  return scoredPool;
}
