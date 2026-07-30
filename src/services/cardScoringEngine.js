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
import { calculateExecutionScore, calculateDeckStateVector } from './deckVectorEngine.js';

/**
 * Evalúa y calcula una puntuación de 0 a 100 para una carta frente al DeckDNA60.
 */
export function scoreCardForDeckDNA(card, deckDNA, injectedCoreCards = [], occupiedCurve = {}) {
  if (!card || !deckDNA) return 0;

  // 0. EJECUTABILIDAD SEMÁNTICA Y VECTORIAL (35%)
  const deckState = calculateDeckStateVector(injectedCoreCards);
  const semanticExecScore = calculateExecutionScore(card, deckState);

  // 1. AFINIDAD CON EL GAMEPLAN (25%)
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
    if (know.roles.length > 0) gamePlanScore += 25;
  }
  gamePlanScore = Math.min(100, Math.max(0, gamePlanScore));

  // 2. SINERGIA CON EL CORE PACKAGE (20%)
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

  // 3. ENCAJE EN LA CURVA DEL DECK SKELETON (10%)
  let curveScore = 50;
  const cmc = typeof card.cmc === 'number' ? card.cmc : parseInt(card.cmc || 2, 10);
  const targetCurve = deckDNA.deckSkeleton?.curveDistribution || { 1: 12, 2: 14, 3: 8, 4: 4, 5: 0 };
  const targetSlotCount = targetCurve[cmc] || (cmc >= 5 ? targetCurve[5] || 0 : 4);

  if (targetSlotCount > 0) {
    const currentOccupied = occupiedCurve[cmc] || 0;
    if (currentOccupied < targetSlotCount) {
      curveScore = 95;
    } else {
      curveScore = 30;
    }
  } else {
    curveScore = 20;
  }

  // 4. EFICIENCIA DE MANÁ Y METAGAME (10%)
  let efficiencyScore = 50;
  if (cmc <= 1) efficiencyScore = 95;
  else if (cmc === 2) efficiencyScore = 85;
  else if (cmc === 3) efficiencyScore = 70;
  else if (cmc === 4) efficiencyScore = 55;
  else efficiencyScore = 40;

  // 5. PENALIZACIÓN DE DIVERGENCIA DE PLAN (PlanDivergenceTax)
  let planDivergenceTax = 0;
  const oracleLower = (card.oracle_text || card.text || '').toLowerCase();
  const archetypeLower = (deckDNA.archetype || '').toLowerCase();

  if ((archetypeLower.includes('wall') || archetypeLower.includes('defender')) && oracleLower.includes("can't be blocked by creatures with defender")) {
    planDivergenceTax = 80; // Wall Crawl penalty
  }
  if ((archetypeLower.includes('wall') || archetypeLower.includes('defender')) && oracleLower.includes('spiders you control')) {
    planDivergenceTax = 80;
  }

  // CÁLCULO FINAL PONDERADO (0-100)
  const baseScore = Math.round(
    (semanticExecScore * 0.35) +
    (gamePlanScore * 0.25) +
    (coreSynergyScore * 0.20) +
    (curveScore * 0.10) +
    (efficiencyScore * 0.10)
  );

  const finalScore = baseScore - planDivergenceTax;
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
