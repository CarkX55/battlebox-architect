/**
 * COACH EXPLANATION TOOL (v23.0 Software Tool)
 * 
 * Consolidated software tool for generating pro-level coaching explanations ("Why not X, why Y").
 */

export class CoachExplanationTool {
  static formatExplanation(chosenCard, discardedAlternatives = [], rationaleContext = '') {
    const altText = discardedAlternatives.length > 0
      ? `Descartadas alternativas (${discardedAlternatives.join(', ')})`
      : 'Sin alternativas directas en curva';

    const explanation = `Explicación Pro-Coach: Elegido [${chosenCard.name}]. ${altText} porque [${chosenCard.name}] maximiza la probabilidad de habilitar la curva T3 y aporta resiliencia estructural. ${rationaleContext}`;

    return {
      chosenCard: chosenCard.name,
      discardedAlternatives,
      explanation
    };
  }
}
