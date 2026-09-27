/**
 * src/services/compiler/core/hypergeometricDistribution.js
 * 
 * HypergeometricDistribution: Canonical Mathematical Derivation Engine v29.5.
 * Eliminates all arbitrary fixed integer quotas (e.g. "12 creatures", "14 on-tribe")
 * across the entire compiler pipeline.
 * 
 * Computes exact cumulative hypergeometric probabilities and inverse hypergeometric
 * copy thresholds for verifiable turn-by-turn gameplan execution.
 */

export class HypergeometricDistribution {
  /**
   * Exact hypergeometric P(X >= 1) given:
   * @param {number} N - Population size (deck size, e.g. 60 or 100)
   * @param {number} K - Total successes in population (number of matching cards in deck)
   * @param {number} n - Sample size (cards drawn by turn T, e.g. 7 + T - 1)
   * @returns {number} Cumulative probability in [0, 1]
   */
  static atLeastOne(N, K, n) {
    if (K <= 0 || N <= 0 || n <= 0) return 0;
    if (K >= N) return 1;
    if (n >= N) return K > 0 ? 1 : 0;

    // P(X = 0) = C(N - K, n) / C(N, n)
    // Evaluated via log-gamma / log-factorial to eliminate numeric overflow
    const logP0 = this._logCombination(N - K, n) - this._logCombination(N, n);
    const p0 = Math.exp(logP0);
    return Math.max(0, Math.min(1, 1 - p0));
  }

  /**
   * Inverse Hypergeometric: Finds the minimum K successes such that P(X >= 1) >= targetP.
   * 
   * @param {number} N - Population size (e.g. 60)
   * @param {number} n - Sample size (draw window, e.g. 7 opening hand, or 8 on T2)
   * @param {number} targetP - Desired execution reliability (e.g. 0.85)
   * @returns {number} Minimum copies required in deck
   */
  static inverseAtLeastOne(N, n, targetP = 0.85) {
    if (targetP <= 0) return 0;
    if (targetP >= 1) return N;
    if (n <= 0 || N <= 0) return 0;

    for (let K = 1; K <= N; K++) {
      if (this.atLeastOne(N, K, n) >= targetP) {
        return K;
      }
    }
    return N;
  }

  /**
   * Derives a verifiable execution quota with full provenance audit.
   * 
   * @param {Object} params
   * @param {number} params.deckSize - Total deck size (default 60)
   * @param {number} params.turn - Target execution turn (e.g. 1, 2, 3)
   * @param {number} [params.drawWindow] - Number of cards seen (defaults to 7 + turn - 1)
   * @param {number} [params.targetProbability=0.85] - Reliability threshold
   * @param {string} [params.purpose='EXECUTION_RELIABILITY']
   * @returns {{ requiredCopies: number, targetProbability: number, drawWindow: number, deckSize: number, derivationFormula: string }}
   */
  static deriveQuota({
    deckSize = 60,
    turn = 1,
    drawWindow = null,
    targetProbability = 0.85,
    purpose = 'EXECUTION_RELIABILITY'
  } = {}) {
    const effectiveDrawWindow = drawWindow !== null ? drawWindow : Math.max(1, 7 + (turn - 1));
    const requiredCopies = this.inverseAtLeastOne(deckSize, effectiveDrawWindow, targetProbability);

    return {
      requiredCopies,
      targetProbability,
      drawWindow: effectiveDrawWindow,
      deckSize,
      purpose,
      derivationFormula: `INV_HYPERGEOMETRIC(N=${deckSize}, n=${effectiveDrawWindow}, targetP=${targetProbability}) => ${requiredCopies}`
    };
  }

  // ─── Mathematical Helpers ───

  static _logCombination(n, k) {
    if (k < 0 || k > n) return -Infinity;
    if (k === 0 || k === n) return 0;
    return this._logFactorial(n) - this._logFactorial(k) - this._logFactorial(n - k);
  }

  static _logFactorial(n) {
    if (n <= 1) return 0;
    let sum = 0;
    for (let i = 2; i <= n; i++) {
      sum += Math.log(i);
    }
    return sum;
  }
}
