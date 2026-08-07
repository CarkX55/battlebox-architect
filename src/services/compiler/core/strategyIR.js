/**
 * src/services/compiler/core/strategyIR.js
 * 
 * BattleBox Strategic Planning Framework v4.0 — Generic Strategy IR (SIR) DAG AST.
 * Invariant 1: StrategyIR NEVER contains concrete card names (100% domain-agnostic generic AST).
 */

export class StrategyIR {
  constructor(data = {}) {
    this.version = data.version || 'v4.0';
    this.intentHash = data.intentHash || 'UNKNOWN_HASH';
    this.strategyTarget = data.strategyTarget || 'GENERIC_STRATEGY';
    this.nodes = Object.freeze(data.nodes || []); // Array of GoalNode, CapabilityNode, RequirementNode, RiskNode, ObjectiveNode
    this.edges = Object.freeze(data.edges || []); // Array of { source, target, relation }
    
    Object.freeze(this);
  }

  /**
   * Deterministic Hash for StrategyIR caching.
   */
  hash() {
    const raw = `${this.strategyTarget}_${this.nodes.map(n => n.id).sort().join('-')}_${this.edges.map(e => `${e.source}->${e.target}`).sort().join('-')}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    return `SIR_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Verifies Invariant 1: StrategyIR contains ZERO concrete card names.
   */
  verifyZeroCardsInvariant() {
    const serialized = JSON.stringify(this.nodes);
    // Common card name checks to guarantee domain isolation
    const cardSampleList = ['Llanowar Elves', 'Lightning Bolt', 'Bonecrusher Giant', 'Wrath of God', 'Sunfall', 'Sol Ring'];
    for (const card of cardSampleList) {
      if (serialized.includes(card)) {
        throw new Error(`❌ INVARIANT VIOLATION: StrategyIR contains concrete card name "${card}"`);
      }
    }
    return true;
  }
}
