/**
 * src/judge/plan/ExecutableStrategyPlan.js
 * Executable Strategy Plan emitted before card resolution.
 */

export function buildExecutableStrategyPlan(winningPlan, evaluationContext) {
  return Object.freeze({
    id: `plan_${Date.now().toString(36)}`,
    name: winningPlan.name,
    archetype: evaluationContext.archetype,
    format: evaluationContext.format,
    objectivesByPhase: {
      earlyGame: 'Aceleración T1-T2 y presencia en mesa',
      midGame: 'Desarrollo de motor y control del tempo',
      lateGame: 'Ejecución del Win Path y remate'
    },
    proposedSwaps: winningPlan.proposedSwaps,
    impactVector: winningPlan.impactVector,
    rationale: winningPlan.rationale,
    timestamp: new Date().toISOString()
  });
}
