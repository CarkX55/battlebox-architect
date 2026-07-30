/**
 * src/judge/passes/analysis/InteractionAnalysisPass.js
 * Analysis Pass for removal and counterspell interaction density. Emits Facts.
 */

export class InteractionAnalysisPass {
  constructor() {
    this.name = 'InteractionAnalysisPass';
    this.type = 'AnalysisPass';
  }

  execute(strategicIR, factsRepository) {
    const cards = strategicIR.cards;
    const spells = cards.filter(c => !c.isLand);

    const interactionCards = spells.filter(c => c.semanticFacts.includes('Interaction'));
    const interactionCount = interactionCards.reduce((sum, c) => sum + c.quantity, 0);

    const requiredInteraction = strategicIR.archetype === 'control' ? 8 : (strategicIR.archetype === 'midrange' ? 6 : 4);
    const deficit = Math.max(0, requiredInteraction - interactionCount);

    factsRepository.addFact({
      id: `fact_interaction_coverage_${Date.now()}`,
      producer: this.name,
      category: 'InteractionCoverage',
      confidence: 0.95,
      severity: deficit > 2 ? 'CRITICAL' : (deficit > 0 ? 'WARNING' : 'INFO'),
      value: { interactionCount, requiredInteraction, deficit },
      description: `Cobertura de Interacción: ${interactionCount} cartas vs ${requiredInteraction} recomendadas (Déficit: ${deficit}).`
    });
  }
}
