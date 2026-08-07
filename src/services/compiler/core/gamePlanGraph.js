/**
 * src/services/compiler/core/gamePlanGraph.js
 * 
 * GamePlanGraph: Grafo de Rutas Alternativas del Plan de Juego v18.0.
 * En lugar de secuencias lineales rígidas, proyecta rutas estratégicas alternativas
 * (e.g. Plan A: Big Mana Nykthos, Plan B: Hardened Scales Aggro, Plan C: Late-Game Value)
 * y evalúa la Fiabilidad Estructural (Structural Reliability).
 */

export class GamePlanGraph {
  constructor(data = {}) {
    this.idea = data.idea || 'Midrange';
    this.primaryBranch = data.primaryBranch || [];
    this.alternativeBranches = data.alternativeBranches || [];
    this.requiredCapabilities = data.requiredCapabilities || [];
  }

  /**
   * Proyecta el Grafo de Planes de Juego con rutas alternativas
   */
  static projectGraph(primaryIdea = 'Midrange') {
    const ideaLower = primaryIdea.toLowerCase();

    if (ideaLower.includes('hydra') || ideaLower.includes('hidra')) {
      return new GamePlanGraph({
        idea: primaryIdea,
        primaryBranch: [
          { step: 1, node: 'MANA_DORK', desc: 'Turn 1 Elf / Dork' },
          { step: 2, node: 'RAMP_ENABLER', desc: 'Turn 2 Nykthos / Ramp' },
          { step: 3, node: 'BIG_HYDRA', desc: 'Turn 3 Hydra X>=6' },
          { step: 4, node: 'FINISHER_LETHAL', desc: 'Turn 4 Finale / Overrun' }
        ],
        alternativeBranches: [
          [
            { step: 1, node: 'MANA_DORK', desc: 'Turn 1 Dork' },
            { step: 2, node: 'COUNTER_MULTIPLIER', desc: 'Turn 2 Hardened Scales' },
            { step: 3, node: 'SCALING_HYDRA', desc: 'Turn 3 Small Hydra + Double Counters' }
          ]
        ],
        requiredCapabilities: ['adds_mana', 'static_buff', 'card_advantage', 'finisher']
      });
    }

    // Default Merfolk / Tempo Branch
    return new GamePlanGraph({
      idea: primaryIdea,
      primaryBranch: [
        { step: 1, node: 'TEMPO_THREAT', desc: 'Turn 1 One-drop' },
        { step: 2, node: 'ENGINE_ENABLER', desc: 'Turn 2 Aether Vial / Lord' },
        { step: 3, node: 'TRIBAL_LORD', desc: 'Turn 3 Second Lord' },
        { step: 4, node: 'EVASION_LETHAL', desc: 'Turn 4 Islandwalk Lethal' }
      ],
      alternativeBranches: [
        [
          { step: 1, node: 'INTERACTION', desc: 'Turn 1 Disruptive Play' },
          { step: 2, node: 'CARD_DRAW', desc: 'Turn 2 Silvergill Adept' },
          { step: 3, node: 'TRIBAL_LORD', desc: 'Turn 3 Lord Pressure' }
        ]
      ],
      requiredCapabilities: ['evasive_attacker', 'gives_power', 'counterspell', 'bounce']
    });
  }

  /**
   * Evalúa la Fiabilidad Estructural (Structural Reliability %): ¿Existen todos los nodos requeridos?
   */
  evaluateStructuralReliability(deckCards = []) {
    const presentCapabilities = new Set();
    deckCards.forEach(card => {
      const oracle = (card.oracle_text || card.oracleText || '').toLowerCase();
      const type = (card.type_line || card.typeLine || '').toLowerCase();

      if (type.includes('creature') || oracle.includes('mana')) presentCapabilities.add('adds_mana');
      if (oracle.includes('counter') || oracle.includes('get +')) presentCapabilities.add('static_buff');
      if (oracle.includes('draw') || oracle.includes('look at')) presentCapabilities.add('card_advantage');
      if (oracle.includes('trample') || oracle.includes('flying')) presentCapabilities.add('finisher');
      if (type.includes('land')) presentCapabilities.add('adds_mana');
    });

    let matched = 0;
    this.requiredCapabilities.forEach(cap => {
      if (presentCapabilities.has(cap)) matched++;
    });

    const structuralPercentage = Math.round((matched / Math.max(1, this.requiredCapabilities.length)) * 100);
    return Object.freeze({
      structuralReliabilityScore: structuralPercentage,
      isStructurallySound: structuralPercentage >= 75
    });
  }
}
