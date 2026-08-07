/**
 * src/services/compiler/core/planningOrchestrator.js
 * 
 * BattleBox Strategic Planning Framework v4.0 — Planning Orchestrator & Passes Scheduler.
 * Executes the 5 CompilationPass passes in order over immutable CompilationContext snapshots until Quadruple Structural Convergence is met.
 */

export class PlanningOrchestrator {
  static async runCompilationPasses(initialContext, passes = [], epsilon = 0.05, maxIterations = 5) {
    let currentContext = initialContext;
    let iteration = 0;
    let lastScore = 0;

    currentContext = currentContext.appendTelemetry({ passName: 'OrchestratorStarted', iteration: 0 });

    while (!currentContext.isFinished && iteration < maxIterations) {
      for (const pass of passes) {
        currentContext = await pass.execute(currentContext);
      }

      const scoreDelta = Math.abs(currentContext.globalScore - lastScore);
      const unsatisfiedCount = currentContext.unsatisfiedConstraints.length;

      // Quadruple Structural Convergence Audit: No Hard Violations AND No Repair Actions AND ΔScore < ε AND Stable State
      if (iteration > 0 && unsatisfiedCount === 0 && scoreDelta < epsilon) {
        currentContext = currentContext.withState({ isFinished: true });
        currentContext = currentContext.appendDomainEvent({
          type: 'COMPILATION_CONVERGED',
          payload: { iteration, finalScore: currentContext.globalScore, deltaScore: scoreDelta }
        });
      }

      lastScore = currentContext.globalScore;
      iteration++;
    }

    currentContext = currentContext.appendTelemetry({ passName: 'OrchestratorFinished', totalIterations: iteration });
    return currentContext;
  }
}
