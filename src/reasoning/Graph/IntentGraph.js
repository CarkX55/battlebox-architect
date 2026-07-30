/**
 * IntentGraph.js
 * Intent Graph and Causal Dependency Expansion Engine.
 */

export class IntentGraph {
  constructor({ archetype = 'Ramp', goals = [] } = {}) {
    this.archetype = archetype;
    this.intents = Object.freeze([...(goals.length > 0 ? goals : [
      { phase: 'Opening', intent: 'AccelerateMana', targetTurn: 2 },
      { phase: 'Development', intent: 'StabilizeBoard', targetTurn: 4 },
      { phase: 'Closing', intent: 'DeployFinisher', targetTurn: 6 }
    ])]);
    Object.freeze(this);
  }

  expandDependencies() {
    return Object.freeze([
      { capability: 'ManaAcceleration', priority: 'CRITICAL', minQuota: 8 },
      { capability: 'CardDraw', priority: 'REQUIRED', minQuota: 6 },
      { capability: 'FinisherThreat', priority: 'CRITICAL', minQuota: 10 }
    ]);
  }
}
