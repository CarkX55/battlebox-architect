/**
 * StrategicDecisionGraph.js
 * Conditional Strategic Decision Graph & Fallback Planner.
 * Represents expert player conditional decision trees:
 * Primary Goal -> Conditional Branching (IF/ELSE) -> Fallback Plans -> Adaptive Meta Responses -> Strategic Weights.
 */

export class DecisionNode {
  constructor({
    id,
    title,
    importance = 0.90,
    failureImpact = 'HIGH',
    replacementDifficulty = 'MEDIUM',
    requiredBeforeTurn = 'T2',
    satisfiedPercentage = 95,
    conditionIf = null,
    thenAction = null,
    elseAction = null,
    fallbackPlan = null
  }) {
    this.id = id;
    this.title = title;
    this.importance = importance;
    this.failureImpact = failureImpact;
    this.replacementDifficulty = replacementDifficulty;
    this.requiredBeforeTurn = requiredBeforeTurn;
    this.satisfiedPercentage = satisfiedPercentage;
    this.conditionIf = conditionIf;
    this.thenAction = thenAction;
    this.elseAction = elseAction;
    this.fallbackPlan = fallbackPlan;
    Object.freeze(this);
  }
}

export class StrategicDecisionGraph {
  static buildDecisionGraph(intent = 'SELESNYA_RAMP') {
    const nodes = [
      new DecisionNode({
        id: 'node_mana_acceleration',
        title: 'Need Fast Mana (6 Mana by T4)',
        importance: 0.98,
        failureImpact: 'VERY_HIGH',
        replacementDifficulty: 'LOW',
        requiredBeforeTurn: 'T1',
        satisfiedPercentage: 96,
        conditionIf: 'Acceleration < 8',
        thenAction: 'Increase Ramp Package Size (+2 Slots)',
        elseAction: 'Maintain Current Threat Density',
        fallbackPlan: 'Pivot to Midrange Land Ramp (Topiary Stomper)'
      }),
      new DecisionNode({
        id: 'node_sweeper_resilience',
        title: 'Sweeper & Removal Resilience',
        importance: 0.88,
        failureImpact: 'HIGH',
        replacementDifficulty: 'MEDIUM',
        requiredBeforeTurn: 'T3',
        satisfiedPercentage: 90,
        conditionIf: 'Meta Removal > 35%',
        thenAction: 'Inject Protection Package (Heroic Intervention / Teferi\'s Protection)',
        elseAction: 'Inject Aggressive Finishers',
        fallbackPlan: 'Graveyard Recursion & Card Draw Engines'
      }),
      new DecisionNode({
        id: 'node_lethal_overwhelm',
        title: 'Turn 4-5 Lethal Overwhelm Finisher',
        importance: 0.95,
        failureImpact: 'CRITICAL',
        replacementDifficulty: 'HIGH',
        requiredBeforeTurn: 'T4',
        satisfiedPercentage: 94,
        conditionIf: 'Board Presence Established',
        thenAction: 'Cast Craterhoof Behemoth / Triumph of the Hordes',
        elseAction: 'Cast Card Advantage Engine (Harmonize / Deluge)',
        fallbackPlan: 'Grind Value with Midrange Threats'
      })
    ];

    return Object.freeze({
      intent,
      primaryGoal: 'Reach 6 Mana before Turn 4 & Cast Lethal Finisher',
      primaryEngine: 'Elf Ramp & Creature Mass',
      secondaryEngine: 'Token Swarm & Stat Buffs',
      fallbackPlan: 'Midrange Land Ramp & Value Recovery',
      failureConditions: ['Early Board Sweeper (Farewell / Wrath)', 'Mana Screw (< 2 Lands)'],
      adaptiveResponse: 'Increase Land Ramp & Protection Contracts',
      expectedKillTurn: 5,
      confidence: 0.94,
      nodes: Object.freeze(nodes)
    });
  }
}
