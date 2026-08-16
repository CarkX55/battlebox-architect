/**
 * STRATEGIC KNOWLEDGE GRAPH (v20.0 Core Knowledge Graph)
 * 
 * Relational Graph Database connecting Cards, Capabilities, Archetypes, and Meta Trends.
 * Enables pathway queries (`Supports`, `AppearsWith`, `Counters`, `Accelerates`).
 */

export const GRAPH_EDGE_TYPES = Object.freeze({
  SUPPORTS: 'Supports',
  APPEARS_WITH: 'AppearsWith',
  COUNTERS: 'Counters',
  ACCELERATES: 'Accelerates',
  FIXES_MANA_FOR: 'FixesManaFor'
});

export class StrategicKnowledgeGraph {
  constructor() {
    this.edges = [];
  }

  addEdge(source, relation, target, weight = 1.0) {
    this.edges.push({
      source,
      relation,
      target,
      weight,
      timestamp: new Date().toISOString()
    });
  }

  findRelationsFrom(source) {
    return this.edges.filter(e => e.source === source);
  }

  findRelationsTo(target) {
    return this.edges.filter(e => e.target === target);
  }

  getSynergiesForCard(cardName) {
    const fromEdges = this.findRelationsFrom(cardName);
    const toEdges = this.findRelationsTo(cardName);
    return [...fromEdges, ...toEdges];
  }
}

export const strategicKnowledgeGraph = new StrategicKnowledgeGraph();

// Seed initial knowledge graph edges
strategicKnowledgeGraph.addEdge('Llanowar Elves', GRAPH_EDGE_TYPES.ACCELERATES, 'Bonecrusher Giant', 0.95);
strategicKnowledgeGraph.addEdge('Bonecrusher Giant', GRAPH_EDGE_TYPES.SUPPORTS, 'Tempo Strategy', 0.90);
strategicKnowledgeGraph.addEdge('Sunfall', GRAPH_EDGE_TYPES.COUNTERS, 'Creature Swarm', 0.98);
strategicKnowledgeGraph.addEdge('Stomping Ground', GRAPH_EDGE_TYPES.FIXES_MANA_FOR, 'Naya Color Pair', 1.0);
