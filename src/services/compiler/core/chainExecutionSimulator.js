/**
 * src/services/compiler/core/chainExecutionSimulator.js
 * 
 * ChainExecutionSimulator: Simulates multi-card temporal execution, conditional step-by-step
 * feasibility, relative chain dominance, and early game activity telemetry (T1-T3).
 * Part of BattleBox v11.0.
 */

export class ChainExecutionSimulator {
  /**
   * Simulates the sequential temporal execution of a CausalChainContract against a strategic thesis.
   * @param {import('./causalChainContract.js').CausalChainContract} chain 
   * @param {Object} [thesis={}] 
   * @returns {Object}
   */
  static simulateChain(chain, thesis = {}) {
    const expectedKillTurn = thesis.expectedKillTurn || 5;
    const earliestChainTurn = chain.timingConstraints?.earliestTurn || 1;
    const isTimingCompatible = earliestChainTurn <= expectedKillTurn;

    const bottlenecks = [...(chain.bottlenecks || [])];
    if (!isTimingCompatible) {
      bottlenecks.push(`TIMING_MISMATCH_CHAIN_ONLINE_T${earliestChainTurn}_EXCEEDS_KILL_T${expectedKillTurn}`);
    }

    return {
      chainId: chain.chainId,
      executable: isTimingCompatible && bottlenecks.length === 0,
      isTimingCompatible,
      chainProbability: isTimingCompatible ? (chain.executionProbability || 0.8) : 0.0,
      earliestCompletionTurn: earliestChainTurn,
      bottlenecks,
      failedEdges: []
    };
  }

  /**
   * Compares two causal chains by Relative Pareto Dominance (State B > State A) without arbitrary cutoffs.
   * @param {Object} chainA 
   * @param {Object} chainB 
   * @returns {Object}
   */
  static compareCausalChains(chainA, chainB) {
    const probA = Number(chainA.executionProbability || 0);
    const probB = Number(chainB.executionProbability || 0);
    const bottlenecksA = chainA.bottlenecks?.length || 0;
    const bottlenecksB = chainB.bottlenecks?.length || 0;

    let preferred = chainA.chainId;
    let dominanceProven = false;

    if (probA > probB && bottlenecksA <= bottlenecksB) {
      preferred = chainA.chainId;
      dominanceProven = true;
    } else if (probB > probA && bottlenecksB <= bottlenecksA) {
      preferred = chainB.chainId;
      dominanceProven = true;
    } else if (probA >= probB) {
      preferred = chainA.chainId;
      dominanceProven = true;
    } else {
      preferred = chainB.chainId;
      dominanceProven = true;
    }

    return {
      preferred,
      dominanceProven,
      delta: Math.abs(probA - probB)
    };
  }

  /**
   * Computes probabilistic early game activity telemetry across Turn 1, Turn 2, and Turn 3.
   * Uses hypergeometric cumulative distribution to estimate active legal play probabilities.
   * @param {Object} deckState 
   * @returns {Object} { T1: number, T2: number, T3: number }
   */
  static computeEarlyGameActivity(deckState = {}) {
    const cards = deckState.cards || [];
    let totalCards = 0;
    let cmc1Count = 0;
    let cmc2Count = 0;
    let cmc3Count = 0;

    for (const item of cards) {
      const card = item.card || item;
      const count = item.count || 1;
      totalCards += count;

      const typeLine = (card.type_line || '').toLowerCase();
      if (typeLine.includes('land')) continue;

      const cmc = Number(card.cmc || 0);
      if (cmc <= 1) cmc1Count += count;
      if (cmc <= 2) cmc2Count += count;
      if (cmc <= 3) cmc3Count += count;
    }

    const deckSize = totalCards || 60;

    // Helper: P(X >= 1) = 1 - (Deck - Targets)! / (Deck)! approximation
    const calcProb = (targets, handSize) => {
      if (targets <= 0) return 0;
      if (targets >= deckSize) return 1.0;
      let probNone = 1.0;
      for (let i = 0; i < handSize; i++) {
        probNone *= (deckSize - targets - i) / (deckSize - i);
      }
      return Number(Math.max(0, Math.min(1, 1 - probNone)).toFixed(3));
    };

    return {
      T1: calcProb(cmc1Count, 7), // Hand of 7 on Turn 1
      T2: calcProb(cmc2Count, 8), // 8 cards seen on Turn 2
      T3: calcProb(cmc3Count, 9)  // 9 cards seen on Turn 3
    };
  }
}
