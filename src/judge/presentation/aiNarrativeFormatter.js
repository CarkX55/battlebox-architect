/**
 * src/judge/presentation/aiNarrativeFormatter.js
 * AI Narrative Formatter for structured, non-monolithic Supreme Judge reports.
 */

export function formatSupremeJudgeReport({
  strategicIR,
  factsRepository,
  constraintCheck,
  executablePlan,
  paretoResults,
  blueprint,
  auditFingerprint
}) {
  const facts = factsRepository.getAllFacts();
  const criticalFacts = facts.filter(f => f.severity === 'CRITICAL' || f.severity === 'WARNING');

  return Object.freeze({
    auditFingerprint,
    isLegal: constraintCheck.isLegal,
    legalityViolations: constraintCheck.violations,
    dimensions: {
      legalityScore: constraintCheck.isLegal ? 100 : 0,
      consistencyScore: Math.round(85 + (executablePlan?.impactVector?.deltaConsistency || 0) * 100),
      interactionScore: Math.round(75 + (executablePlan?.impactVector?.deltaInteraction || 0) * 100),
      overallHealth: Math.round(80 + (executablePlan?.impactVector?.deltaWinProb || 0) * 100)
    },
    factsSummary: criticalFacts.map(f => ({
      category: f.category,
      severity: f.severity,
      description: f.description
    })),
    winningPlan: {
      name: executablePlan.name,
      rationale: executablePlan.rationale,
      impactVector: executablePlan.impactVector
    },
    paretoDiscarded: paretoResults.discardedPlans.map(d => ({
      planName: d.plan.name,
      reason: d.reason
    })),
    blueprint
  });
}
