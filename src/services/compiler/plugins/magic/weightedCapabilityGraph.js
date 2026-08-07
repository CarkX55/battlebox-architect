/**
 * src/services/compiler/plugins/magic/weightedCapabilityGraph.js
 * 
 * WeightedCapabilityGraph: Grafo DAG de Capacidades con Estadísticas Empíricas.
 * En lugar de constantes estáticas, almacena observaciones reales:
 * - successes
 * - failures
 * - confidence (successes / total)
 * - support (total observaciones)
 */

import { CAPABILITY_IDS } from '../../core/capabilityCatalog.js';

export class WeightedCapabilityGraph {
  constructor() {
    this.edges = new Map(); // providerCap -> Array<TransitionEdge>
    this.initializeStandardGraph();
  }

  addTransition(providerCap, consumerCap, initialConfidence = 0.85) {
    if (!this.edges.has(providerCap)) {
      this.edges.set(providerCap, []);
    }

    const initialTotal = 100;
    const initialSuccesses = Math.round(initialTotal * initialConfidence);

    const edge = {
      consumerCap,
      successes: initialSuccesses,
      failures: initialTotal - initialSuccesses,
      support: initialTotal,
      confidence: initialConfidence
    };

    this.edges.get(providerCap).push(edge);
    return edge;
  }

  recordObservation(providerCap, consumerCap, wasSuccessful) {
    if (!this.edges.has(providerCap)) return;
    const edge = this.edges.get(providerCap).find(e => e.consumerCap === consumerCap);
    if (!edge) return;

    if (wasSuccessful) edge.successes++;
    else edge.failures++;

    edge.support = edge.successes + edge.failures;
    edge.confidence = Math.round((edge.successes / edge.support) * 1000) / 1000;
  }

  initializeStandardGraph() {
    this.addTransition(CAPABILITY_IDS.MANA_ACCELERATION_T1, CAPABILITY_IDS.VALUE_THREAT, 0.92);
    this.addTransition(CAPABILITY_IDS.MANA_ACCELERATION_T1, CAPABILITY_IDS.COCO_ENGINE, 0.88);
    this.addTransition(CAPABILITY_IDS.COCO_ENGINE, CAPABILITY_IDS.FINISHER_LETHAL, 0.84);
  }

  getTransitionConfidence(providerCap, consumerCap) {
    const list = this.edges.get(providerCap) || [];
    const edge = list.find(e => e.consumerCap === consumerCap);
    return edge ? edge.confidence : 0.50;
  }
}
