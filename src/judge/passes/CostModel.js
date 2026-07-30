/**
 * src/judge/passes/CostModel.js
 * Evaluator for Multi-Objective Impact Vectors.
 */

export function createImpactVector({
  deltaConsistency = 0,
  deltaTempo = 0,
  deltaPressure = 0,
  deltaResilience = 0,
  deltaInteraction = 0,
  deltaResourceEfficiency = 0,
  deltaWinProb = 0,
  transformationCost = 0
}) {
  return Object.freeze({
    deltaConsistency,
    deltaTempo,
    deltaPressure,
    deltaResilience,
    deltaInteraction,
    deltaResourceEfficiency,
    deltaWinProb,
    transformationCost
  });
}

export function isDominatingVector(vecA, vecB) {
  // Returns true if vecA Pareto-dominates vecB (better or equal in all metrics, strictly better in at least one)
  const metrics = ['deltaConsistency', 'deltaTempo', 'deltaPressure', 'deltaResilience', 'deltaInteraction', 'deltaWinProb'];
  let betterInAtLeastOne = false;

  for (const m of metrics) {
    if (vecA[m] < vecB[m]) return false;
    if (vecA[m] > vecB[m]) betterInAtLeastOne = true;
  }

  // Lower transformation cost is better
  if (vecA.transformationCost > vecB.transformationCost) return false;
  if (vecA.transformationCost < vecB.transformationCost) betterInAtLeastOne = true;

  return betterInAtLeastOne;
}
