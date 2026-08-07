/**
 * src/services/compiler/core/semanticCache.js
 * 
 * Multi-Tier Caching System (L1, L2, L3) para el Core del Compilador.
 * 
 * - L1: SemanticNodeCache (Almacena nodos semánticos de cartas de Scryfall/Oracle)
 * - L2: CapabilityGraphCache (Almacena subgrafos de capacidades por arquetipo)
 * - L3: SimulationReportCache (Almacena reportes de simulación Monte Carlo por hash de mazo)
 */

export class SemanticCache {
  constructor() {
    this.L1_semanticNodes = new Map();     // cardName -> RichSemanticNode
    this.L2_capabilityGraphs = new Map(); // archetypeKey -> Subgraph
    this.L3_simulationReports = new Map(); // deckHash -> SimulationReport

    this.hits = { L1: 0, L2: 0, L3: 0 };
    this.misses = { L1: 0, L2: 0, L3: 0 };
  }

  // --- L1: Semantic Node Cache ---
  getL1(cardName) {
    if (!cardName) return null;
    const key = cardName.toLowerCase().trim();
    if (this.L1_semanticNodes.has(key)) {
      this.hits.L1++;
      return this.L1_semanticNodes.get(key);
    }
    this.misses.L1++;
    return null;
  }

  setL1(cardName, semanticNode) {
    if (!cardName || !semanticNode) return;
    const key = cardName.toLowerCase().trim();
    this.L1_semanticNodes.set(key, Object.freeze(semanticNode));
  }

  // --- L2: Capability Graph Cache ---
  getL2(archetypeKey) {
    if (!archetypeKey) return null;
    const key = archetypeKey.toLowerCase().trim();
    if (this.L2_capabilityGraphs.has(key)) {
      this.hits.L2++;
      return this.L2_capabilityGraphs.get(key);
    }
    this.misses.L2++;
    return null;
  }

  setL2(archetypeKey, graphData) {
    if (!archetypeKey || !graphData) return;
    const key = archetypeKey.toLowerCase().trim();
    this.L2_capabilityGraphs.set(key, Object.freeze(graphData));
  }

  // --- L3: Simulation Report Cache ---
  getL3(deckHash) {
    if (!deckHash) return null;
    if (this.L3_simulationReports.has(deckHash)) {
      this.hits.L3++;
      return this.L3_simulationReports.get(deckHash);
    }
    this.misses.L3++;
    return null;
  }

  setL3(deckHash, simulationReport) {
    if (!deckHash || !simulationReport) return;
    this.L3_simulationReports.set(deckHash, Object.freeze(simulationReport));
  }

  getStats() {
    const totalHits = this.hits.L1 + this.hits.L2 + this.hits.L3;
    const totalMisses = this.misses.L1 + this.misses.L2 + this.misses.L3;
    const total = totalHits + totalMisses;
    const hitRate = total > 0 ? Math.round((totalHits / total) * 100) : 0;

    return {
      L1_size: this.L1_semanticNodes.size,
      L2_size: this.L2_capabilityGraphs.size,
      L3_size: this.L3_simulationReports.size,
      totalHits,
      totalMisses,
      hitRate: `${hitRate}%`
    };
  }

  clear() {
    this.L1_semanticNodes.clear();
    this.L2_capabilityGraphs.clear();
    this.L3_simulationReports.clear();
    this.hits = { L1: 0, L2: 0, L3: 0 };
    this.misses = { L1: 0, L2: 0, L3: 0 };
  }
}
