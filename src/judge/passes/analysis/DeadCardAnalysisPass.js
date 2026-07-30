/**
 * src/judge/passes/analysis/DeadCardAnalysisPass.js
 * Analysis Pass for detecting uncastable or dead cards due to color/CMC congestion. Emits Facts.
 */

export class DeadCardAnalysisPass {
  constructor() {
    this.name = 'DeadCardAnalysisPass';
    this.type = 'AnalysisPass';
  }

  execute(strategicIR, factsRepository) {
    const cards = strategicIR.cards;
    const spells = cards.filter(c => !c.isLand);

    const highCmcSpells = spells.filter(c => c.cmc >= 6);
    const highCmcCount = highCmcSpells.reduce((sum, c) => sum + c.quantity, 0);

    const rampSpells = spells.filter(c => c.semanticFacts.includes('ProducesMana'));
    const rampCount = rampSpells.reduce((sum, c) => sum + c.quantity, 0);

    if (highCmcCount > 3 && rampCount < 4) {
      factsRepository.addFact({
        id: `fact_dead_cards_high_cmc_${Date.now()}`,
        producer: this.name,
        category: 'DeadCardRisk',
        confidence: 0.85,
        severity: 'WARNING',
        value: { highCmcCount, rampCount, affectedCards: highCmcSpells.map(c => c.cardName) },
        description: `Riesgo de cartas muertas tempranas: ${highCmcCount} coste 6+ sin suficiente ramp (${rampCount}).`
      });
    }
  }
}
