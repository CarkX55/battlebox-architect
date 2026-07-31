/**
 * KnowledgeGraph.js
 * Single Multi-Typed Relationship Graph with Temporal Causal State Nodes.
 * Sub-graphs (ConceptGraph, ThreatGraph, EngineGraph, ReplacementGraph, CausalGraph) are dynamic view queries over this graph.
 */

export class KnowledgeGraph {
  constructor() {
    this.nodes = new Map();
    this.relationships = [];
  }

  addNode(node) {
    if (node && node.id) {
      this.nodes.set(node.id, node);
    }
  }

  addRelationship(rel) {
    if (rel && rel.sourceId && rel.targetId && rel.type) {
      this.relationships.push(rel);
    }
  }

  getNode(id) {
    return this.nodes.get(id) || null;
  }

  // Filter View Query: Temporal Causal State Graph View
  getCausalGraphView() {
    return this.relationships.filter(r => r.type === 'CAUSES' || r.type === 'ENABLES');
  }

  // Filter View Query: ConceptGraph View
  getConceptGraphView() {
    return this.relationships.filter(r => r.type === 'CAUSES' || r.type === 'SATISFIES');
  }

  // Filter View Query: ThreatGraph View
  getThreatGraphView() {
    return this.relationships.filter(r => r.type === 'COUNTERS');
  }

  // Filter View Query: EngineGraph View
  getEngineGraphView() {
    return this.relationships.filter(r => r.type === 'ENABLES' || r.type === 'REQUIRES' || r.type === 'PROVIDES');
  }

  // Filter View Query: ReplacementGraph View
  getReplacementGraphView() {
    return this.relationships.filter(r => r.type === 'REPLACES');
  }

  queryRelationshipsByType(type) {
    return this.relationships.filter(r => r.type === type);
  }

  queryTargetNodes(sourceId, type = null) {
    return this.relationships
      .filter(r => r.sourceId === sourceId && (!type || r.type === type))
      .map(r => this.nodes.get(r.targetId))
      .filter(Boolean);
  }
}
