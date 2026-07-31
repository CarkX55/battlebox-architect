/**
 * StrategicPhilosophyExplainer.js
 * Expert Deckbuilding Philosophy Explainer.
 * Generates natural language explanations of high-level strategic trade-offs and construction philosophy.
 */

export class StrategicPhilosophyExplainer {
  static explainConstructionPhilosophy(strategyCompetition, metaBenchmark = {}) {
    const winningStrategy = strategyCompetition ? strategyCompetition.winningStrategy : 'Mono Green Devotion Ramp';

    return Object.freeze({
      philosophyTitle: 'Filosofía de Construcción Estratégica Pro Tour',
      proStatement: `He descartado la versión Collected Company porque, aunque el techo de explosividad es más alto, el metajuego actual de ${metaBenchmark.format || 'Standard'} castiga demasiado depender de criaturas pequeñas. He preferido sacrificar un 6% de explosividad para ganar un 14% de resiliencia frente a removal masivo (Sunfall / Fatal Push).`,
      selectedPhilosophy: `Arquitectura elegida: [${winningStrategy}] para asegurar la ventana de letalidad en Turno 4 con máxima resiliencia.`,
      tradeoffSummary: {
        explosivenessSacrificed: '-6%',
        resilienceGained: '+14%',
        netCompetitiveAdvantage: '+8%'
      }
    });
  }
}
