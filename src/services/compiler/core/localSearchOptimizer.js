/**
 * src/services/compiler/core/localSearchOptimizer.js
 * 
 * LocalSearchOptimizer v1.0.
 * Local Search Perturbation Optimizer:
 * Tests 1-card replacement perturbations on CopyAllocationState to maximize ObjectiveScore.
 */

import { CapabilityPackage } from './capabilityPackage.js';

export class LocalSearchOptimizer {
  /**
   * Run local search perturbations over allocation state.
   * 
   * @param {import('./copyAllocationManager.js').CopyAllocationState} allocationState
   * @param {Function} objectiveEvaluator - Function evaluating CopyAllocationState => number score
   * @param {number} maxIterations - Maximum perturbation passes
   * @returns {{ optimizedState: import('./copyAllocationManager.js').CopyAllocationState, initialScore: number, finalScore: number, improvementsMade: number }}
   */
  static optimize(allocationState, objectiveEvaluator, maxIterations = 5) {
    if (!allocationState || !allocationState.packages || allocationState.packages.length === 0) {
      return { optimizedState: allocationState, initialScore: 0, finalScore: 0, improvementsMade: 0 };
    }

    let currentBestState = allocationState;
    let currentBestScore = objectiveEvaluator ? objectiveEvaluator(currentBestState) : 100;
    const initialScore = currentBestScore;
    let improvementsMade = 0;

    for (let iter = 0; iter < maxIterations; iter++) {
      let improvedInIter = false;

      const packages = currentBestState.packages;
      for (let i = 0; i < packages.length; i++) {
        const pkg = packages[i];
        if (!pkg.alternatives || pkg.alternatives.length === 0) continue;

        for (const altCard of pkg.alternatives) {
          // Construct perturbed package list with altCard replacing winnerCard
          const newPackages = packages.map((p, idx) => {
            if (idx === i) {
              return new CapabilityPackage({
                ...p,
                winnerCard: altCard,
                alternatives: p.alternatives.filter(a => a !== altCard).concat([p.winnerCard]),
                rationale: `Local search perturbation replaced "${p.winnerCard}" with "${altCard}"`
              });
            }
            return p;
          });

          const perturbedState = new currentBestState.constructor({
            packages: newPackages,
            mode: currentBestState.mode,
            modeSource: currentBestState.modeSource,
            format: currentBestState.format
          });

          const perturbedScore = objectiveEvaluator ? objectiveEvaluator(perturbedState) : currentBestScore;

          if (perturbedScore > currentBestScore) {
            currentBestState = perturbedState;
            currentBestScore = perturbedScore;
            improvementsMade++;
            improvedInIter = true;
            break; // Accept hill-climb step
          }
        }

        if (improvedInIter) break;
      }

      if (!improvedInIter) break; // Convergence reached
    }

    return {
      optimizedState: currentBestState,
      initialScore,
      finalScore: currentBestScore,
      improvementsMade
    };
  }
}
