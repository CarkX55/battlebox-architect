/**
 * src/services/strategyValidatorService.js
 * 
 * Hito 4: Validador Estratégico, Contribution Score, Explicabilidad y Coste de Oportunidad.
 */

import { analyzeCardIntelligence } from './cardIntelligenceEngine.js';

/**
 * Evalúa las puntuaciones de contribución individual (Contribution Score 0-100)
 * y aplica la salvaguarda para cartas críticas de combo/motor.
 * 
 * @param {Array} deckList Lista de cartas en el mazo
 * @param {Object} strategyPlan Plan estratégico del mazo
 * @returns {Array} Lista de cartas con sus Contribution Scores e informe de criticidad
 */
export function evaluateContributionScores(deckList = [], strategyPlan = {}) {
  if (!Array.isArray(deckList) || deckList.length === 0) {
    return [];
  }

  const reqCaps = strategyPlan.requiredCapabilities || {};

  return deckList.map(card => {
    const intel = card.card_intelligence || analyzeCardIntelligence(card);
    let contributionScore = 50;

    // Aportación a las capacidades requeridas por el plan
    if (intel.enables.includes('TurnAcceleration') && (reqCaps.ManaAcceleration || 0) > 50) contributionScore += 35;
    if (intel.enables.includes('GoWide') && (reqCaps.BoardPressure || 0) > 50) contributionScore += 30;
    if (intel.enables.includes('AlphaStrike') && (reqCaps.FinisherLethality || 0) > 50) contributionScore += 45;
    if (intel.produces.includes('Removal') && (reqCaps.RemovalImpact || 0) > 50) contributionScore += 35;
    if (intel.produces.includes('CardAdvantage') && (reqCaps.CardDrawEfficiency || 0) > 50) contributionScore += 35;

    contributionScore = Math.min(100, Math.max(10, contributionScore));

    // SALVAGUARDA DE CARTAS CRÍTICAS (Combo / Engine Core)
    const isCriticalPiece = intel.enables.includes('ComboAssembly') || intel.enables.includes('AlphaStrike') || (card.role || '').toLowerCase().includes('finisher') || (card.role || '').toLowerCase().includes('combo');

    return {
      cardName: card.name,
      contributionScore,
      isCriticalPiece,
      safeToPurge: contributionScore < 45 && !isCriticalPiece,
      recommendation: isCriticalPiece ? 'MANTENER (Pieza Crítica de Plan/Combo)' : (contributionScore < 45 ? 'REEMPLAZAR (Baja Contribución al Plan)' : 'ÓPTIMA')
    };
  });
}

/**
 * Genera un informe completo de Explicabilidad ("¿Por qué está esta carta aquí?").
 * 
 * @param {Array} deckList Lista de cartas en el mazo
 * @param {Object} strategyPlan Plan estratégico
 * @returns {Array} Reporte de explicabilidad por carta
 */
export function generateExplainabilityReport(deckList = [], strategyPlan = {}) {
  if (!Array.isArray(deckList) || deckList.length === 0) {
    return [];
  }

  const contribs = evaluateContributionScores(deckList, strategyPlan);

  return deckList.map(card => {
    const intel = card.card_intelligence || analyzeCardIntelligence(card);
    const contrib = contribs.find(c => c.cardName.toLowerCase() === card.name.toLowerCase()) || { contributionScore: 70, recommendation: 'ÓPTIMA' };

    return {
      cardName: card.name,
      cmc: card.cmc || intel.cmc,
      bestTurn: intel.bestTurn,
      contributionScore: contrib.contributionScore,
      primaryIntent: intel.cardIntent.primaryIntent,
      humanReasoning: `${intel.cardIntent.humanDescription} Encaja como pieza de ${intel.cardIntent.primaryIntent} para el plan de turno ${intel.bestTurn}.`,
      enginesEnabled: intel.enables,
      recommendation: contrib.recommendation
    };
  });
}
