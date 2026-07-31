/**
 * CardRoleIntelligence.js
 * Deep Card Role Intelligence & Strategic Role Graph.
 * Defines expert card role metadata beyond Oracle text:
 * Primary Role, Supported Plans (Plan A/B/C), Criticality (0.0 to 1.0), Best Turns, Dead After Turn, Replacement Cost, and Strategic Dependencies.
 */

export class CardRoleMetadata {
  constructor({
    cardName,
    primaryRole,
    supportedPlans = [],
    criticality = 0.80,
    bestTurns = ['T1'],
    deadAfterTurn = 7,
    replacementCost = 'MEDIUM',
    strategicDependencies = [],
    failureModeImpact = 'MODERATE'
  }) {
    this.cardName = cardName;
    this.primaryRole = primaryRole;
    this.supportedPlans = Object.freeze([...supportedPlans]);
    this.criticality = criticality;
    this.bestTurns = Object.freeze([...bestTurns]);
    this.deadAfterTurn = deadAfterTurn;
    this.replacementCost = replacementCost;
    this.strategicDependencies = Object.freeze([...strategicDependencies]);
    this.failureModeImpact = failureModeImpact;
    Object.freeze(this);
  }
}

export const KNOWN_CARD_ROLE_REGISTRY = Object.freeze({
  'Llanowar Elves': new CardRoleMetadata({
    cardName: 'Llanowar Elves',
    primaryRole: 'Primary Tempo Enabler',
    supportedPlans: ['Plan A: Fast Mana Dork into Turn 4 Overrun'],
    criticality: 0.99,
    bestTurns: ['T1'],
    deadAfterTurn: 6,
    replacementCost: 'VERY_HIGH',
    strategicDependencies: ['Forest / Green Mana Source'],
    failureModeImpact: 'HIGH_TEMPO_LOSS'
  }),
  'Collected Company': new CardRoleMetadata({
    cardName: 'Collected Company',
    primaryRole: 'Emergency Board Reconstruction & Flash Advantage',
    supportedPlans: ['Plan A: Fast Mana Dork into Turn 4 Overrun', 'Plan B: Collected Company Value Engine Grind'],
    criticality: 0.96,
    bestTurns: ['T3', 'T4'],
    deadAfterTurn: 12,
    replacementCost: 'IRREPLACEABLE',
    strategicDependencies: ['28+ Creatures CMC <= 3'],
    failureModeImpact: 'CRITICAL_PLAN_PIVOT'
  }),
  'Ezuri, Renegade Leader': new CardRoleMetadata({
    cardName: 'Ezuri, Renegade Leader',
    primaryRole: 'Lethal Overrun Finisher & Regeneration Engine',
    supportedPlans: ['Plan A: Fast Mana Dork into Turn 4 Overrun'],
    criticality: 0.94,
    bestTurns: ['T4', 'T5'],
    deadAfterTurn: 10,
    replacementCost: 'HIGH',
    strategicDependencies: ['Elvish Archdruid', 'High Elf Density'],
    failureModeImpact: 'LETHAL_DELAY'
  })
});

export class CardRoleIntelligence {
  static getCardRole(cardName) {
    if (!cardName) return null;
    const name = cardName.trim();
    return KNOWN_CARD_ROLE_REGISTRY[name] || new CardRoleMetadata({
      cardName: name,
      primaryRole: 'General Synergistic Filler',
      supportedPlans: ['Plan B: Collected Company Value Engine Grind'],
      criticality: 0.70,
      bestTurns: ['T2', 'T3'],
      deadAfterTurn: 8,
      replacementCost: 'LOW',
      strategicDependencies: [],
      failureModeImpact: 'LOW'
    });
  }

  static evaluatePlanSurvivalOnDisruption(disruptedCardName, targetPlan = 'Plan A') {
    const metadata = this.getCardRole(disruptedCardName);
    const criticality = metadata ? metadata.criticality : 0.50;
    const planSurvivalPercentage = Number(((1.0 - (criticality * 0.40)) * 100).toFixed(1));

    return Object.freeze({
      disruptedCardName,
      targetPlan,
      criticality,
      planSurvivalPercentage,
      pivotRecommendation: planSurvivalPercentage < 70 ? 'Pivot to Plan B (Value Grind)' : 'Maintain Plan A (Fast Overrun)'
    });
  }
}
