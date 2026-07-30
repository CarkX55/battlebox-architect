/**
 * src/judge/passes/analysis/EngineAnalysisPass.js
 * Analysis Pass for core engine density and synergy support. Emits Facts.
 */

export class EngineAnalysisPass {
  constructor() {
    this.name = 'EngineAnalysisPass';
    this.type = 'AnalysisPass';
  }

  execute(strategicIR, factsRepository) {
    const cards = strategicIR.cards;
    const spells = cards.filter(c => !c.isLand);

    const rampCards = spells.filter(c => c.semanticFacts.includes('ProducesMana'));
    const drawCards = spells.filter(c => c.semanticFacts.includes('CardAdvantage'));

    const rampCount = rampCards.reduce((sum, c) => sum + c.quantity, 0);
    const drawCount = drawCards.reduce((sum, c) => sum + c.quantity, 0);

    factsRepository.addFact({
      id: `fact_engine_ramp_${Date.now()}`,
      producer: this.name,
      category: 'EngineRamp',
      confidence: 0.9,
      severity: rampCount < 4 && strategicIR.archetype !== 'aggro' ? 'WARNING' : 'INFO',
      value: { rampCount },
      description: `Densidad de Aceleración (Ramp): ${rampCount} cartas.`
    });

    factsRepository.addFact({
      id: `fact_engine_draw_${Date.now()}`,
      producer: this.name,
      category: 'EngineDraw',
      confidence: 0.9,
      severity: drawCount < 4 ? 'WARNING' : 'INFO',
      value: { drawCount },
      description: `Densidad de Ventaja de Cartas (Draw): ${drawCount} cartas.`
    });
  }
}
