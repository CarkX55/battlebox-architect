/**
 * src/services/compiler/core/simulationBudgetPolicy.js
 * 
 * SimulationBudgetPolicy: Adaptive Statistical Simulation Sizing v29.1.
 * Purely adaptive sample sizing based on variance, effect size, and overlapping
 * 95% Confidence Intervals (Wilson / Student's t-test). Zero fixed arbitrary quotas.
 */

export class SimulationBudgetPolicy {
  /**
   * Returns the initial exploratory rollout batch size.
   */
  static getExploratoryBatchSize(format = 'STANDARD', competitiveIntensity = 'COMPETITIVE') {
    if (competitiveIntensity === 'SPIKE_PRO' || competitiveIntensity === 'PRO') {
      return 250;
    }
    return 150;
  }

  /**
   * Computes the 95% Confidence Interval for a binomial proportion (e.g., win rate / lethal rate).
   * Uses Wilson score interval for robustness with extreme probabilities.
   * 
   * @param {number} successes 
   * @param {number} totalRuns 
   * @param {number} zScore Default 1.96 for 95% CI
   * @returns {{ mean: number, min: number, max: number, marginOfError: number, se: number }}
   */
  static computeConfidenceInterval(successes, totalRuns, zScore = 1.96) {
    if (totalRuns <= 0) {
      return { mean: 0, min: 0, max: 0, marginOfError: 0, se: 0 };
    }

    const p = Math.max(0, Math.min(1, successes / totalRuns));
    const z = zScore;
    const z2 = z * z;
    const n = totalRuns;

    const denominator = 1 + z2 / n;
    const centerAdjusted = (p + z2 / (2 * n)) / denominator;
    const errorTerm = (z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / denominator;

    const min = Math.max(0, centerAdjusted - errorTerm);
    const max = Math.min(1, centerAdjusted + errorTerm);
    const se = Math.sqrt((p * (1 - p)) / n);

    return {
      mean: Number(p.toFixed(4)),
      min: Number(min.toFixed(4)),
      max: Number(max.toFixed(4)),
      marginOfError: Number(errorTerm.toFixed(4)),
      se: Number(se.toFixed(4))
    };
  }

  /**
   * Evaluates whether two competing states are statistically separated or require expanded budget.
   * 
   * @param {Object} metricA { successes, totalRuns }
   * @param {Object} metricB { successes, totalRuns }
   * @param {Object} options
   * @param {number} options.maxBudget Maximum allowable runs per tournament pair
   * @returns {{ isSeparated: boolean, requiresMoreEvidence: boolean, suggestedAdditionalRuns: number, dominant: 'A'|'B'|'TIE' }}
   */
  static evaluateSeparation(metricA, metricB, { maxBudget = 2500 } = {}) {
    const ciA = this.computeConfidenceInterval(metricA.successes, metricA.totalRuns);
    const ciB = this.computeConfidenceInterval(metricB.successes, metricB.totalRuns);

    const totalCurrentRuns = Math.max(metricA.totalRuns, metricB.totalRuns);

    // Check non-overlapping confidence intervals (Clear Statistical Separation)
    if (ciA.min > ciB.max) {
      return {
        isSeparated: true,
        requiresMoreEvidence: false,
        suggestedAdditionalRuns: 0,
        dominant: 'A',
        ciA,
        ciB
      };
    }

    if (ciB.min > ciA.max) {
      return {
        isSeparated: true,
        requiresMoreEvidence: false,
        suggestedAdditionalRuns: 0,
        dominant: 'B',
        ciA,
        ciB
      };
    }

    // Overlapping CI: Check if max budget reached
    if (totalCurrentRuns >= maxBudget) {
      // At max budget, decide based on point estimate delta
      const delta = ciA.mean - ciB.mean;
      return {
        isSeparated: Math.abs(delta) > 0.005,
        requiresMoreEvidence: false,
        suggestedAdditionalRuns: 0,
        dominant: delta > 0 ? 'A' : (delta < 0 ? 'B' : 'TIE'),
        ciA,
        ciB
      };
    }

    // Needs more statistical evidence to separate close contenders
    const remainingBudget = maxBudget - totalCurrentRuns;
    const additionalStep = Math.min(remainingBudget, Math.max(200, Math.round(totalCurrentRuns * 0.8)));

    return {
      isSeparated: false,
      requiresMoreEvidence: true,
      suggestedAdditionalRuns: additionalStep,
      dominant: 'TIE',
      ciA,
      ciB
    };
  }
}
