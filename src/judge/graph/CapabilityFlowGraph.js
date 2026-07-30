/**
 * CapabilityFlowGraph.js
 * Behavioral IR modeling deck flow topology with typed relationship edges.
 */

export class CapabilityFlowGraph {
  static EDGE_TYPES = Object.freeze({
    ENABLES: 'ENABLES',
    FEEDS: 'FEEDS',
    CONSUMES: 'CONSUMES',
    BUFFERS: 'BUFFERS',
    TRANSFORMS: 'TRANSFORMS',
    BLOCKS: 'BLOCKS',
    COMPETES: 'COMPETES'
  });

  constructor({ archetype, nodes = [], edges = [] }) {
    this.archetype = archetype;
    this.nodes = Object.freeze([...nodes]);
    this.edges = Object.freeze([...edges]);

    Object.freeze(this);
  }

  static createFromRequirementGraph(archetype, requirementGraph) {
    const nodes = Array.from(requirementGraph.nodes.keys());
    const edges = requirementGraph.edges.map(e => Object.freeze({
      from: e.from,
      to: e.to,
      type: CapabilityFlowGraph.EDGE_TYPES.FEEDS,
      resource: e.resource
    }));

    return new CapabilityFlowGraph({ archetype, nodes, edges });
  }
}
