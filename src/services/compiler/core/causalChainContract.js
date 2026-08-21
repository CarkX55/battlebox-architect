/**
 * src/services/compiler/core/causalChainContract.js
 * 
 * CausalChainContract: Formal domain model for multi-card causal chains, cycles, and execution paths.
 * Part of BattleBox v11.0 Universal Compositional Causal Reasoning Engine.
 */

export class CausalChainContract {
  /**
   * @param {Object} params
   * @param {string} params.chainId
   * @param {Array<Object>} [params.nodes=[]]
   * @param {Array<Object>} [params.edges=[]]
   * @param {Array<string>} [params.requiredResources=[]]
   * @param {Array<string>} [params.generatedResources=[]]
   * @param {Object} [params.timingConstraints={}]
   * @param {string} [params.pathType='ACYCLIC_PATH'] - 'ACYCLIC_PATH' | 'RECURSIVE_LOOP' | 'REPEATABLE_ENGINE' | 'FINITE_LOOP' | 'NON_PROGRESS_CYCLE'
   * @param {boolean} [params.reachesWinPath=false]
   * @param {number} [params.executionProbability=1.0]
   * @param {Array<string>} [params.bottlenecks=[]]
   * @param {Object} [params.metadata={}]
   */
  constructor({
    chainId,
    nodes = [],
    edges = [],
    requiredResources = [],
    generatedResources = [],
    timingConstraints = { earliestTurn: 1, latestUsefulTurn: 6 },
    pathType = 'ACYCLIC_PATH',
    reachesWinPath = false,
    executionProbability = 1.0,
    bottlenecks = [],
    metadata = {}
  }) {
    this.chainId = chainId || `CHAIN_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    this.nodes = nodes;
    this.edges = edges;
    this.requiredResources = requiredResources;
    this.generatedResources = generatedResources;
    this.timingConstraints = timingConstraints;
    this.pathType = pathType;
    this.reachesWinPath = Boolean(reachesWinPath);
    this.executionProbability = Number(executionProbability);
    this.bottlenecks = bottlenecks;
    this.metadata = metadata;
  }

  /**
   * Serializes the chain contract to a clean JSON snapshot.
   * @returns {Object}
   */
  toJSON() {
    return {
      chainId: this.chainId,
      nodes: this.nodes,
      edges: this.edges,
      requiredResources: this.requiredResources,
      generatedResources: this.generatedResources,
      timingConstraints: this.timingConstraints,
      pathType: this.pathType,
      reachesWinPath: this.reachesWinPath,
      executionProbability: this.executionProbability,
      bottlenecks: this.bottlenecks,
      metadata: this.metadata
    };
  }
}
