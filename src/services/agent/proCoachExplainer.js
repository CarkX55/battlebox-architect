/**
 * PRO COACH EXPLAINER (v22.0 Pro Rationale Engine)
 * 
 * Generates pro-level coaching explanations for card choices and discarded alternatives
 * ("Why not X, why Y").
 */

export class ProCoachExplainer {
  static explainChoice(chosenCard, discardedAlternatives = [], rationaleContext = '') {
    const alternativeStr = discardedAlternatives.length > 0
      ? `Descartadas alternativas (${discardedAlternatives.join(', ')})`
      : 'Sin alternativas directas en curva';

    const explanation = `Explicación Pro-Coach: Elegido [${chosenCard.name}] (${chosenCard.mana_cost || ''}). ${alternativeStr} porque [${chosenCard.name}] maximiza la probabilidad de habilitar la curva en Turno 3 y aporta resiliencia estructural. ${rationaleContext}`;

    return {
      chosenCard: chosenCard.name,
      discardedAlternatives,
      explanation,
      explainedAt: new Date().toISOString()
    };
  }
}
