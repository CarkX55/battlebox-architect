/**
 * ConvergencePolicy.js - Version 1
 * Governs COP solver iteration bounds and statistical convergence thresholds.
 */

export class ConvergencePolicy {
  static VERSION = 1;
  static COMPATIBLE_UNTIL = 2;

  constructor({
    maxIterations = 5,
    minObjectiveImprovement = 0.005, // 0.5%
    maxConstraintGrowth = 15,
    ci95Threshold = 0.01 // 1.0%
  } = {}) {
    this.version = ConvergencePolicy.VERSION;
    this.compatibleUntil = ConvergencePolicy.COMPATIBLE_UNTIL;
    this.maxIterations = maxIterations;
    this.minObjectiveImprovement = minObjectiveImprovement;
    this.maxConstraintGrowth = maxConstraintGrowth;
    this.ci95Threshold = ci95Threshold;

    Object.freeze(this);
  }

  shouldTerminate(iteration, improvementRatio, confidenceIntervalSpan) {
    if (iteration >= this.maxIterations) return true;
    if (improvementRatio < this.minObjectiveImprovement) return true;
    if (confidenceIntervalSpan !== undefined && confidenceIntervalSpan < this.ci95Threshold) return true;
    return false;
  }
}
