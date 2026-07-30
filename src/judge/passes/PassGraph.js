/**
 * src/judge/passes/PassGraph.js
 * Directed Acyclic Graph (DAG) for Analysis Pass dependency resolution.
 */

export class PassGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
  }

  addPass(passName, dependencies = []) {
    this.nodes.set(passName, passName);
    this.edges.set(passName, new Set(dependencies));
  }

  resolveExecutionOrder() {
    const visited = new Set();
    const temp = new Set();
    const order = [];

    const visit = (node) => {
      if (temp.has(node)) {
        throw new Error(`Circular dependency detected in PassGraph at: ${node}`);
      }
      if (!visited.has(node)) {
        temp.add(node);
        const deps = this.edges.get(node) || new Set();
        deps.forEach(dep => visit(dep));
        temp.delete(node);
        visited.add(node);
        order.push(node);
      }
    };

    this.nodes.forEach((_, node) => {
      if (!visited.has(node)) {
        visit(node);
      }
    });

    return order;
  }
}
