/**
 * src/services/semanticGraphService.js
 * 
 * Grafo Semántico Dirigido de Conocimiento y Motor de Auditoría de Cohesión.
 */

import { parseSemanticCard } from './semanticCardParser.js';
import { calculateDeckStateVector, calculateExecutionScore } from './deckVectorEngine.js';

/**
 * Realiza una auditoría semántica completa sobre una lista de mazo.
 * Detecta el vector de capacidades globales, el porcentaje de cohesión del mazo y las cartas huérfanas/sobrantes.
 * 
 * @param {Array} deckList Lista de cartas en el mazo
 * @returns {Object} Informe de auditoría semántica (cohesionScore, orphanCards, capabilitiesVector)
 */
export function calculateGraphCohesion(deckList = []) {
  if (!Array.isArray(deckList) || deckList.length === 0) {
    return {
      cohesionScore: 100,
      orphanCards: [],
      capabilitiesVector: {},
      summary: "Mazo vacío"
    };
  }

  const deckState = calculateDeckStateVector(deckList);
  const orphanCards = [];
  let totalScoreSum = 0;

  deckList.forEach(card => {
    const sem = card.semantic_representation || parseSemanticCard(card);
    const execScore = calculateExecutionScore(card, deckState);
    totalScoreSum += execScore;

    if (execScore < 45) {
      orphanCards.push({
        name: card.name,
        executionScore: execScore,
        card,
        reason: getOrphanReason(sem, deckState)
      });
    }
  });

  const avgExecutionScore = Math.round(totalScoreSum / deckList.length);
  const cohesionScore = Math.max(0, Math.min(100, avgExecutionScore));

  return {
    cohesionScore,
    orphanCards,
    capabilitiesVector: deckState.capabilities,
    deckStateSummary: {
      creatures: deckState.creatureCount,
      instantSorceries: deckState.instantSorceryCount,
      tokenGenerators: deckState.tokenGeneratorsCount,
      sacOutlets: deckState.sacOutletsCount,
      avgCMC: deckState.avgCMC
    }
  };
}

/**
 * Deduce la razón técnica por la cual una carta ha quedado como huérfana/sobrante.
 */
function getOrphanReason(sem, deckState) {
  if (sem.requirements.minBoardWidth > 0 && deckState.creatureCount < 8) {
    return "Falta masa crítica de criaturas/tokens para activar su efecto.";
  }
  if (sem.requirements.minInstantSorceryCount > 0 && deckState.instantSorceryCount < 6) {
    return "Mazo con insuficientes Instantes/Conjuros para activar este motor.";
  }
  if (sem.requirements.requiresSacrificeFodder && deckState.sacOutletsCount === 0) {
    return "Carta que requiere sacrificar pero el mazo carece de activadores.";
  }
  return "Baja cohesión semántica con el vector de capacidades del mazo.";
}

/**
 * Encuentra las mejores cartas de reemplazo dentro del pool candidato para sustituir a una carta huérfana.
 * 
 * @param {Object} orphanCard Carta a sustituir
 * @param {Array} candidatePool Pool de cartas disponibles
 * @param {Array} currentDeck Mazo actual
 * @returns {Array} Lista de 3 mejores sustitutos recomendados
 */
export function findAlternativeReplacement(orphanCard, candidatePool = [], currentDeck = []) {
  if (!orphanCard || !Array.isArray(candidatePool) || candidatePool.length === 0) {
    return [];
  }

  const deckState = calculateDeckStateVector(currentDeck);
  const orphanSem = orphanCard.semantic_representation || parseSemanticCard(orphanCard);

  // Filtrar cartas candidatas que no estén ya en el mazo
  const currentNames = new Set(currentDeck.map(c => c.name.toLowerCase()));
  const validCandidates = candidatePool.filter(c => !currentNames.has(c.name.toLowerCase()));

  const rankedCandidates = validCandidates.map(card => {
    const sem = card.semantic_representation || parseSemanticCard(card);
    const score = calculateExecutionScore(card, deckState);

    // Dar bonificación si la carta de reemplazo resuelve el déficit del mazo
    let recommendationBoost = 0;
    if (orphanSem.requirements.minBoardWidth > 0 && sem.enables.includes('BoardWidth')) {
      recommendationBoost += 30; // Sugiere un generador de tokens para arreglar el Finisher
    }
    if (sem.capabilities.CardDrawEfficiency > 70 && deckState.capabilities.CardDrawEfficiency < 35) {
      recommendationBoost += 20;
    }

    return {
      card,
      name: card.name,
      executionScore: Math.min(100, score + recommendationBoost),
      reason: "Alta compatibilidad semántica con el estado del mazo."
    };
  });

  rankedCandidates.sort((a, b) => b.executionScore - a.executionScore);

  return rankedCandidates.slice(0, 3);
}
