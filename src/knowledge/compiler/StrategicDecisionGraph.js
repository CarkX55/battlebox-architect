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
  /**
   * Generates a dynamic read-only visual decision graph based on user intent/deck state.
   * Pure visual projection view — ZERO decision authority.
   * 
   * @param {string|Object} intentInput - Intent prompt or IntentPackage
   * @returns {Object} Read-only visual graph structure
   */
  static buildDecisionGraph(intentInput = 'Custom Intent') {
    const promptStr = typeof intentInput === 'string' ? intentInput : (intentInput.prompt || intentInput.archetype || 'Custom Deck');
    const promptLower = promptStr.toLowerCase();

    let primaryEngine = 'Early Pressure & Board Swarm';
    let secondaryEngine = 'Tribal Synergy & Stat Buffs';
    let primaryGoal = 'Establish early board dominance and win by Turn 4-5';
    let fallbackPlan = 'Pivot to midgame card flow and instant interaction';

    if (promptLower.includes('human') || promptLower.includes('boros')) {
      primaryEngine = 'Human Aggro & Low-CMC Pressure';
      secondaryEngine = 'Lord Buffs & Token Swarm';
      primaryGoal = 'Deploy 1-2 CMC Humans T1-T3 and overwhelm opponent before Turn 5';
      fallbackPlan = 'Use cheap removal to clear blockers and maintain tempo';
    } else if (promptLower.includes('control')) {
      primaryEngine = 'Counter-Tempo & Sweeper Control';
      secondaryEngine = 'Card Advantage & Planeswalker Finishers';
      primaryGoal = 'Neutralize early threats and dominate late game';
      fallbackPlan = 'Grind card advantage via ETB draw engines';
    } else if (promptLower.includes('ramp') || promptLower.includes('devotion')) {
      primaryEngine = 'Mana Acceleration Engine';
      secondaryEngine = 'High-CMC Payoff Threats';
      primaryGoal = 'Accelerate mana to cast 5+ CMC threats by Turn 4';
      fallbackPlan = 'Pivot to Midrange Land Ramp';
    }

    const nodes = [
      new DecisionNode({
        id: 'node_engine_deployment',
        title: `Primary Engine Deployment (${primaryEngine})`,
        importance: 0.95,
        failureImpact: 'HIGH',
        replacementDifficulty: 'LOW',
        requiredBeforeTurn: 'T1',
        satisfiedPercentage: 96,
        conditionIf: 'Engine Density < 10',
        thenAction: 'Increase Core Package Size (+2 Slots)',
        elseAction: 'Maintain Current Threat Curve',
        fallbackPlan
      }),
      new DecisionNode({
        id: 'node_interaction_coverage',
        title: 'Interaction & Removal Coverage',
        importance: 0.88,
        failureImpact: 'MEDIUM',
        replacementDifficulty: 'MEDIUM',
        requiredBeforeTurn: 'T2',
        satisfiedPercentage: 92,
        conditionIf: 'Opposing Threat Resolved',
        thenAction: 'Cast Cheap Removal / Counterspell',
        elseAction: 'Continue Board Swarm',
        fallbackPlan: 'Pivot to Instant-Speed Removal'
      }),
      new DecisionNode({
        id: 'node_win_condition',
        title: 'Win Condition Execution',
        importance: 0.98,
        failureImpact: 'CRITICAL',
        replacementDifficulty: 'HIGH',
        requiredBeforeTurn: 'T4',
        satisfiedPercentage: 95,
        conditionIf: 'Board Advantage Established',
        thenAction: 'Execute Finisher / Full Attack',
        elseAction: 'Maintain Resource Flow & Card Advantage',
        fallbackPlan
      })
    ];

    return Object.freeze({
      intent: promptStr,
      primaryGoal,
      primaryEngine,
      secondaryEngine,
      fallbackPlan,
      failureConditions: ['Opposing Sweeper', 'Mana Screw (< 2 Lands)'],
      adaptiveResponse: 'Adjust interaction density and curve bounds',
      expectedKillTurn: 5,
      confidence: 0.95,
      nodes: Object.freeze(nodes)
    });
  }
}
