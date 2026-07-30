/**
 * EmergentRequirementGraph.js
 * Auto-Assembling Graph that dynamically links node dependencies whenever CapabilityA.produces matches CapabilityB.requires.
 */

import { CapabilityOntology } from '../ontology/CapabilityOntology.js';

export class EmergentRequirementGraph {
  static buildGraph() {
    const nodes = new Map();
    const edges = [];

    const caps = CapabilityOntology.capabilities;
    for (const [id, cap] of Object.entries(caps)) {
      nodes.set(id, { ...cap });
    }

    // Connect node A -> node B if A.produces intersects B.requires
    for (const [idA, capA] of nodes.entries()) {
      for (const [idB, capB] of nodes.entries()) {
        if (idA === idB) continue;

        const matchingResource = capA.produces.find(res => capB.requires.includes(res));
        if (matchingResource) {
          edges.push(Object.freeze({
            from: idA,
            to: idB,
            resource: matchingResource
          }));
        }
      }
    }

    return Object.freeze({ nodes: Object.freeze(nodes), edges: Object.freeze(edges) });
  }
}
