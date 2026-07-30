/**
 * src/judge/patches/TransactionalBlueprint.js
 * Compiled Transactional Blueprint artifact containing exact OUT/IN operations.
 */

export function buildTransactionalBlueprint(resolvedSwaps, winningPlan, paretoResults) {
  return Object.freeze({
    id: `blueprint_${Date.now().toString(36)}`,
    removes: Object.freeze([...resolvedSwaps.removes]),
    adds: Object.freeze([...resolvedSwaps.adds]),
    rationale: winningPlan.rationale,
    expectedImpact: winningPlan.impactVector,
    discardedPlans: paretoResults.discardedPlans,
    timestamp: new Date().toISOString()
  });
}
