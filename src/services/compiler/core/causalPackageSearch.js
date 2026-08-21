/**
 * src/services/compiler/core/causalPackageSearch.js
 * 
 * CausalPackageSearch: Multi-card package discovery and Graph State Delta evaluation.
 * Part of BattleBox v11.0.
 */

import { CausalGraphEngine } from './causalGraphEngine.js';

export class CausalPackageSearch {
  /**
   * Evaluates adding a package of 1-4 cards to a base deck state.
   * Emits a CausalGraphSnapshot and a relative Pareto dominance comparator.
   * 
   * @param {Object} baseDeckState 
   * @param {Array<Object>} packageCards 
   * @param {Object} [options={}] 
   * @returns {Object}
   */
  static evaluatePackageAddition(baseDeckState, packageCards = [], options = {}) {
    const existingCards = (baseDeckState.cards || []).map(item => item.card || item);
    const combinedCards = [...existingCards, ...packageCards];

    const graph = CausalGraphEngine.buildGraphFromCards(combinedCards, {
      winPathType: options.winPath || 'GENERAL_WIN'
    });

    const graphSnapshot = graph.createSnapshot();

    return {
      packageCards,
      graphSnapshot,
      dominates: (otherEvaluation) => {
        if (!otherEvaluation || !otherEvaluation.graphSnapshot) return true;

        const myClustersCount = graphSnapshot.clusters?.length || 0;
        const otherClustersCount = otherEvaluation.graphSnapshot.clusters?.length || 0;

        const myChainsCount = graphSnapshot.chains?.length || 0;
        const otherChainsCount = otherEvaluation.graphSnapshot.chains?.length || 0;

        // If package establishes emergent clusters that the other lacks, it dominates
        if (myClustersCount > otherClustersCount) return true;
        if (myClustersCount === otherClustersCount && myChainsCount > otherChainsCount) return true;

        return false;
      }
    };
  }
}
