/**
 * OptimizerController.js
 * Dedicated Controller managing the multi-pass compilation loop, ConvergencePolicy, and IterationHistory.
 */

export class OptimizerController {
  constructor({ convergencePolicy, maxIterations = 3 } = {}) {
    this.convergencePolicy = convergencePolicy;
    this.maxIterations = maxIterations;
  }

  shouldContinue(state) {
    if (!state) return false;
    if (state.iteration >= this.maxIterations) return false;
    if (state.metaFeedback && state.metaFeedback.length === 0 && state.iteration > 1) return false;
    return true;
  }
}
