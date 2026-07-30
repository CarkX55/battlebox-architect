/**
 * src/judge/passes/analysis/ManaAnalysisPass.js
 * Analysis Pass for Mana distribution and pip requirements. Emits Facts to FactsRepository.
 */

export class ManaAnalysisPass {
  constructor() {
    this.name = 'ManaAnalysisPass';
    this.type = 'AnalysisPass';
  }

  execute(strategicIR, factsRepository) {
    const cards = strategicIR.cards;
    const lands = cards.filter(c => c.isLand);
    const spells = cards.filter(c => !c.isLand);

    const landCount = lands.reduce((sum, c) => sum + c.quantity, 0);
    const spellCount = spells.reduce((sum, c) => sum + c.quantity, 0);

    // Emit ManaRatio Fact
    factsRepository.addFact({
      id: `fact_mana_ratio_${Date.now()}`,
      producer: this.name,
      category: 'ManaDistribution',
      confidence: 1.0,
      severity: landCount < 20 ? 'WARNING' : 'INFO',
      value: { landCount, spellCount, total: strategicIR.totalDeckSize },
      description: `Mazo con ${landCount} tierras y ${spellCount} hechizos.`
    });

    // Check Karsten pip devotions
    const pips = strategicIR.pips;
    Object.entries(pips).forEach(([color, pipCount]) => {
      if (pipCount > 0) {
        const matchingLands = lands.filter(l => l.colors.includes(color) || l.cardName.toLowerCase().includes(color === 'W' ? 'plains' : color === 'U' ? 'island' : color === 'B' ? 'swamp' : color === 'R' ? 'mountain' : 'forest'));
        const sources = matchingLands.reduce((sum, l) => sum + l.quantity, 0);
        const requiredSources = Math.max(12, Math.round(pipCount * 0.7));

        if (sources < requiredSources) {
          factsRepository.addFact({
            id: `fact_pip_deficit_${color}_${Date.now()}`,
            producer: this.name,
            category: 'ManaPipDeficit',
            confidence: 0.95,
            severity: sources < requiredSources - 4 ? 'CRITICAL' : 'WARNING',
            value: { color, pipCount, sources, requiredSources, deficit: requiredSources - sources },
            description: `Déficit de maná ${color}: tienes ${sources} fuentes vs ${requiredSources} requeridas por Karsten Math.`
          });
        }
      }
    });
  }
}
