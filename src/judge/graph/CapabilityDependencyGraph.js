/**
 * CapabilityDependencyGraph.js
 * Directed Acyclic Graph (DAG) for Causal Capability Dependencies with Weights and Criticality.
 */

export class CapabilityDependencyGraph {
  constructor({ nodes = [], edges = [] } = {}) {
    this.nodes = Object.freeze([...(nodes.length > 0 ? nodes : [
      'ManaAcceleration', 'CardDraw', 'TargetedRemoval', 'BoardReset', 'FinisherThreat'
    ])]);

    this.edges = Object.freeze([...(edges.length > 0 ? edges : [
      { from: 'ManaAcceleration', to: 'FinisherThreat', strength: 0.95, critical: true },
      { from: 'CardDraw', to: 'FinisherThreat', strength: 0.80, critical: false },
      { from: 'TargetedRemoval', to: 'FinisherThreat', strength: 0.75, critical: false }
    ])]);

    Object.freeze(this);
  }

  getDependenciesFor(capability) {
    return this.edges.filter(e => e.to === capability);
  }

  getFeedsFrom(capability) {
    return this.edges.filter(e => e.from === capability);
  }
}
