/**
 * src/services/compiler/core/constraintGraph.js
 * 
 * BattleBox Strategic Planning Framework v4.0 — Lean Typed ConstraintGraph Core.
 * Invariant 2: ConstraintGraph represents ONLY constraints, capabilities & relationships.
 * Enforces Acyclic Graph (DAG) validation.
 */

export class ConstraintNode {
  constructor(id, type, label, data = {}) {
    this.id = id;
    this.type = type; // 'GoalNode' | 'CapabilityNode' | 'ResourceNode' | 'RiskNode' | 'SlotNode' | 'CandidateNode' | 'CardNode'
    this.label = label;
    this.priority = data.priority || 1.0;
    this.satisfied = Boolean(data.satisfied);
    this.data = Object.freeze(data);
    Object.freeze(this);
  }
}

export class ConstraintEdge {
  constructor(source, target, relation) {
    this.source = source;
    this.target = target;
    this.relation = relation; // 'requires' | 'enables' | 'conflicts' | 'supports' | 'replaces' | 'depends'
    Object.freeze(this);
  }
}

export class ConstraintGraph {
  constructor(nodes = [], edges = []) {
    this.nodes = Object.freeze([...nodes]);
    this.edges = Object.freeze([...edges]);
    this.verifyAcyclic();
    Object.freeze(this);
  }

  /**
   * Verifies that the graph is a Directed Acyclic Graph (DAG).
   * Prevents cyclic deadlocks.
   */
  verifyAcyclic() {
    const adj = new Map();
    for (const node of this.nodes) adj.set(node.id, []);
    for (const edge of this.edges) {
      if (adj.has(edge.source)) {
        adj.get(edge.source).push(edge.target);
      }
    }

    const visited = new Set();
    const recStack = new Set();

    const isCyclic = (nodeId) => {
      if (!visited.has(nodeId)) {
        visited.add(nodeId);
        recStack.add(nodeId);

        const neighbors = adj.get(nodeId) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor) && isCyclic(neighbor)) return true;
          else if (recStack.has(neighbor)) return true;
        }
      }
      recStack.delete(nodeId);
      return false;
    };

    for (const node of this.nodes) {
      if (isCyclic(node.id)) {
        throw new Error(`❌ GRAPH ERROR: Cyclic dependency detected involving node ${node.id}`);
      }
    }
    return true;
  }

  hash() {
    const raw = `${this.nodes.map(n => `${n.id}:${n.satisfied}`).sort().join('-')}_${this.edges.map(e => `${e.source}->${e.target}`).sort().join('-')}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    return `GRAPH_${Math.abs(hash).toString(16)}`;
  }
}
