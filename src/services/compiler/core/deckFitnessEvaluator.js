/**
 * src/services/compiler/core/deckFitnessEvaluator.js
 * 
 * DeckFitnessEvaluator & FitnessReport v1.0.
 * Post-Compilation Evaluator: Evaluates physical DeckState ONLY.
 * NEVER participates in building or modifying the deck.
 */

export class FitnessReport {
  constructor({
    staticFitness = 100,
    curveScore = 100,
    interactionScore = 100,
    densityScore = 100,
    consistencyScore = 100,
    dynamicFitness = 100,
    overallFitnessScore = 100,
    diagnostics = []
  } = {}) {
    this.staticFitness = staticFitness;
    this.curveScore = curveScore;
    this.interactionScore = interactionScore;
    this.densityScore = densityScore;
    this.consistencyScore = consistencyScore;
    this.dynamicFitness = dynamicFitness;
    this.overallFitnessScore = overallFitnessScore;
    this.diagnostics = Object.freeze([...diagnostics]);

    Object.freeze(this);
  }
}

export class DeckFitnessEvaluator {
  /**
   * Evaluate a compiled DeckState and return a FitnessReport.
   * 
   * @param {import('./deckState.js').DeckState} deckState
   * @param {import('./intentPackage.js').IntentPackage} intentPackage
   * @returns {FitnessReport}
   */
  static evaluate(deckState, intentPackage) {
    if (!deckState || !deckState.cards || deckState.cards.length === 0) {
      return new FitnessReport({ overallFitnessScore: 0 });
    }

    const cards = deckState.cards;
    const totalCards = deckState.totalCardCount;
    const diagnostics = [];

    // Static Fitness Checks
    // 1. Deck size check (60 cards target for Standard/Modern, 100 for Commander)
    const targetSize = intentPackage.format === 'COMMANDER' ? 100 : 60;
    const sizeDelta = Math.abs(totalCards - targetSize);
    const curveScore = sizeDelta === 0 ? 100 : Math.max(0, 100 - (sizeDelta * 10));
    if (sizeDelta !== 0) {
      diagnostics.push(`Deck size is ${totalCards}x (target ${targetSize}x)`);
    }

    // 2. Interaction check
    const interactionCards = cards.filter(c => (c.role || '').toLowerCase().includes('removal') || (c.role || '').toLowerCase().includes('cheap_removal'));
    const interactionDensity = interactionCards.reduce((sum, c) => sum + c.quantity, 0);
    const interactionScore = interactionDensity >= 4 ? 100 : Math.round((interactionDensity / 4) * 100);
    if (interactionDensity < 4) {
      diagnostics.push(`Interaction density is ${interactionDensity}x (minimum recommended 4x)`);
    }

    // 3. Consistency check (4x playsets ratio)
    const playsets = cards.filter(c => c.quantity >= 4);
    const playsetRatio = cards.length > 0 ? (playsets.length / cards.length) : 0;
    const consistencyScore = Math.round(playsetRatio * 100);

    const staticFitness = Math.round((curveScore * 0.4) + (interactionScore * 0.3) + (consistencyScore * 0.3));
    const dynamicFitness = 100; // Stand-in for Monte Carlo simulation

    const overallFitnessScore = Math.round((staticFitness * 0.7) + (dynamicFitness * 0.3));

    return new FitnessReport({
      staticFitness,
      curveScore,
      interactionScore,
      densityScore: 100,
      consistencyScore,
      dynamicFitness,
      overallFitnessScore,
      diagnostics
    });
  }
}
