/**
 * src/services/compiler/core/stateParetoFrontier.js
 * 
 * V29.6 State Pareto Frontier & Lexicographic Decision Engine.
 * 
 * CORE PHILOSOPHY:
 * 1. The optimization unit is DeckState, not Card.
 * 2. Pareto dominance preserves candidate states; it does NOT arbitrarily collapse them into scalar sums.
 * 3. Tie-breaking on the frontier uses a strict Lexicographic Hierarchy of Objectives (zero arbitrary weighted sums).
 * 4. Only observable metrics are evaluated (no subjective scores).
 */

export class StateParetoFrontier {
  /**
   * Observable Critical Dimensions for Complete Deck State Dominance.
   */
  static CRITICAL_DIMENSIONS = Object.freeze([
    'curveExecutionRate',      // Ratio of mana spent on curve in T1-T4 (0.0 - 1.0)
    'winPathCompletionRate',   // Proportion of simulated games achieving primary gameplan condition (0.0 - 1.0)
    'resilienceRecoveryRate',  // Proportion of games recovering from sweepers/disruption (0.0 - 1.0)
    'manaCastabilityRate',     // Probability that key spells are castable in their tactical window (0.0 - 1.0)
    'tangibleResourceVelocity' // Mean count of active cards in hand + battlefield assets at T4 without stalling
  ]);

  /**
   * Evaluates whether State A Pareto-dominates State B.
   * State A dominates State B (A > B) iff:
   *   A_d >= B_d - epsilon for ALL critical dimensions d, AND
   *   A_d > B_d + epsilon for AT LEAST ONE critical dimension d.
   * 
   * @param {Object} vectorA Observable metrics vector of State A
   * @param {Object} vectorB Observable metrics vector of State B
   * @param {number} epsilon Numerical tolerance threshold
   * @returns {boolean} True if A strictly Pareto-dominates B
   */
  static dominates(vectorA, vectorB, epsilon = 0.02) {
    if (!vectorA || !vectorB) return false;

    let strictlyBetterInAtLeastOne = false;

    for (const dim of this.CRITICAL_DIMENSIONS) {
      const valA = Number(vectorA[dim] ?? 0);
      const valB = Number(vectorB[dim] ?? 0);

      // If A is worse in any dimension by more than epsilon, A cannot dominate B
      if (valA < valB - epsilon) {
        return false;
      }

      // Check if A is strictly better in this dimension
      if (valA > valB + epsilon) {
        strictlyBetterInAtLeastOne = true;
      }
    }

    return strictlyBetterInAtLeastOne;
  }

  /**
   * Filters an arbitrary cohort of candidate states down to the true Pareto Frontier.
   * Discards any state that is strictly Pareto-dominated by another state in the set.
   * 
   * @param {Array<Object>} candidateStates List of { state, metrics, ... }
   * @param {number} epsilon Tolerance threshold
   * @returns {Array<Object>} Non-dominated Pareto frontier
   */
  static extractParetoFrontier(candidateStates = [], epsilon = 0.02) {
    if (!Array.isArray(candidateStates) || candidateStates.length <= 1) {
      return [...candidateStates];
    }

    const frontier = [];

    for (let i = 0; i < candidateStates.length; i++) {
      const candidate = candidateStates[i];
      const vecC = candidate.metrics || candidate.dominanceVector || candidate;

      let isDominated = false;

      for (let j = 0; j < candidateStates.length; j++) {
        if (i === j) continue;
        const other = candidateStates[j];
        const vecO = other.metrics || other.dominanceVector || other;

        if (this.dominates(vecO, vecC, epsilon)) {
          isDominated = true;
          break;
        }
      }

      if (!isDominated) {
        frontier.push(candidate);
      }
    }

    return frontier;
  }

  /**
   * Strictly breaks ties among Pareto-optimal states using the Lexicographic Hierarchy of Objectives.
   * INVARIANT: ZERO linear weighted sums (no 0.3*X + 0.2*Y).
   * 
   * Tier 1: HARD CONSTRAINTS
   *   - Size match, legality, zero identity leaks, zero unfulfilled critical obligations.
   * Tier 2: CRITICAL OBJECTIVES
   *   - Gameplan curve execution rate & tactical window castability.
   * Tier 3: STRATEGIC OBJECTIVES
   *   - WinPath completion / win probability & post-sweeper recovery rate.
   * Tier 4: SECONDARY OBJECTIVES
   *   - Resource velocity & non-game minimization.
   * 
   * @param {Object} stateA Complete state A
   * @param {Object} stateB Complete state B
   * @param {Object} intentPackage Intent Package & Gameplan Contract
   * @returns {number} Positive if A is preferred, negative if B is preferred, 0 if tied
   */
  static compareLexicographic(stateA, stateB, intentPackage = {}) {
    const vecA = stateA.metrics || stateA.dominanceVector || stateA;
    const vecB = stateB.metrics || stateB.dominanceVector || stateB;

    // ─── TIER 1: HARD CONSTRAINTS ───────────────────────────────────────────
    const critFailA = Number(stateA.criticalFailuresCount ?? stateA.criticalFailures?.length ?? 0);
    const critFailB = Number(stateB.criticalFailuresCount ?? stateB.criticalFailures?.length ?? 0);
    if (critFailA !== critFailB) {
      return critFailB - critFailA; // Fewer critical failures strictly preferred
    }

    const illegalA = Boolean(stateA.hasIdentityLeak || stateA.isIllegal);
    const illegalB = Boolean(stateB.hasIdentityLeak || stateB.isIllegal);
    if (illegalA !== illegalB) {
      return illegalA ? -1 : 1;
    }

    // ─── TIER 2: CRITICAL OBJECTIVES (Gameplan Curve & Tactical Castability) ──
    const curveA = Number(vecA.curveExecutionRate ?? 0);
    const curveB = Number(vecB.curveExecutionRate ?? 0);
    const curveDiff = curveA - curveB;
    if (Math.abs(curveDiff) >= 0.05) {
      return curveDiff > 0 ? 1 : -1;
    }

    const castA = Number(vecA.manaCastabilityRate ?? 0);
    const castB = Number(vecB.manaCastabilityRate ?? 0);
    const castDiff = castA - castB;
    if (Math.abs(castDiff) >= 0.05) {
      return castDiff > 0 ? 1 : -1;
    }

    // ─── TIER 3: STRATEGIC OBJECTIVES (WinPath Completion & Recovery) ─────────
    const winA = Number(vecA.winPathCompletionRate ?? 0);
    const winB = Number(vecB.winPathCompletionRate ?? 0);
    const winDiff = winA - winB;
    if (Math.abs(winDiff) >= 0.04) {
      return winDiff > 0 ? 1 : -1;
    }

    const recA = Number(vecA.resilienceRecoveryRate ?? 0);
    const recB = Number(vecB.resilienceRecoveryRate ?? 0);
    const recDiff = recA - recB;
    if (Math.abs(recDiff) >= 0.06) {
      return recDiff > 0 ? 1 : -1;
    }

    // ─── TIER 4: SECONDARY OBJECTIVES (Resource Velocity & Non-Game Avoidance)
    const resA = Number(vecA.tangibleResourceVelocity ?? 0);
    const resB = Number(vecB.tangibleResourceVelocity ?? 0);
    const resDiff = resA - resB;
    if (Math.abs(resDiff) >= 0.20) {
      return resDiff > 0 ? 1 : -1;
    }

    const nonGameA = Number(vecA.nonGameRisk ?? 0);
    const nonGameB = Number(vecB.nonGameRisk ?? 0);
    const nonGameDiff = nonGameB - nonGameA; // Lower nonGameRisk is better
    if (Math.abs(nonGameDiff) >= 0.03) {
      return nonGameDiff > 0 ? 1 : -1;
    }

    // Stable deterministic fallback
    return 0;
  }

  /**
   * Selects the single best state from a candidate set by:
   * 1. Extracting the Pareto Frontier.
   * 2. Sorting the frontier by the Lexicographic Hierarchy of Objectives.
   * 
   * @param {Array<Object>} candidateStates 
   * @param {Object} intentPackage 
   * @returns {{ winningState: Object, frontier: Array<Object>, auditTrail: Object }}
   */
  static selectBestState(candidateStates = [], intentPackage = {}) {
    if (!candidateStates || candidateStates.length === 0) {
      return { winningState: null, frontier: [], auditTrail: { reason: 'EMPTY_CANDIDATE_SET' } };
    }

    const frontier = this.extractParetoFrontier(candidateStates);
    frontier.sort((a, b) => this.compareLexicographic(b, a, intentPackage));

    const winningState = frontier[0] || candidateStates[0];

    return {
      winningState,
      frontier,
      auditTrail: {
        totalEvaluated: candidateStates.length,
        frontierSize: frontier.length,
        winnerId: winningState.id || winningState.compositionHash || 'WINNER',
        eliminatedDominatedCount: candidateStates.length - frontier.length
      }
    };
  }
}
