/**
 * CausalKnowledgeGraph.js
 * Graph of Causal Relationships between Strategic Concepts, Engines, and Capabilities.
 */

export class CausalKnowledgeGraph {
  constructor({ nodes = [], edges = [] } = {}) {
    this.nodes = Object.freeze([...nodes]);
    this.edges = Object.freeze([...(edges.length > 0 ? edges : [
      { from: 'ManaAcceleration', to: 'Tempo', relation: 'causes', strength: 0.90 },
      { from: 'CardDraw', to: 'Inevitability', relation: 'enables', strength: 0.85 },
      { from: 'BoardReset', to: 'Initiative', relation: 'invalidates', strength: 0.88 },
      { from: 'TargetedRemoval', to: 'ThreatDensity', relation: 'blocks', strength: 0.80 }
    ])]);
    Object.freeze(this);
  }

  getRelationsFor(id) {
    return this.edges.filter(e => e.from === id || e.to === id);
  }
}
