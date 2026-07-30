/**
 * MetaEvaluator.js
 * Analyzes MatchupMatrix and generates structured diagnosis traces.
 * Emits versioned ConstraintFeedback objects (v1).
 */

export class MetaEvaluator {
  static evaluate(matchupMatrixResults, convergencePolicy) {
    const feedbackList = [];

    for (const [scenName, res] of Object.entries(matchupMatrixResults)) {
      if (res.winRate < 50) {
        const observation = `Suboptimal win rate against ${scenName} (${res.winRate}%)`;
        const evidence = Object.freeze({ winRate: res.winRate, CI95: res.confidenceInterval95, failureModes: res.dominantFailureModes });
        const diagnosis = 'InteractionDensityBelowThreshold';
        const hypothesis = 'Increasing early interaction or cheaper ramp will boost win rate above 60%';
        const recommendation = 'Inject GreenSources >= 20 constraint or lower average curve';

        feedbackList.push(Object.freeze({
          version: 1,
          compatibleUntil: 2,
          observation,
          evidence,
          diagnosis,
          hypothesis,
          recommendation,
          constraintFeedback: Object.freeze({
            newConstraints: Object.freeze(['EarlyRemoval >= 6']),
            objectiveAdjustments: Object.freeze([{ target: 'Consistency', delta: 0.1 }]),
            priority: 'HIGH',
            estimatedImpact: '+12% win rate',
            implementationCost: 'LOW',
            confidence: 0.92
          })
        }));
      }
    }

    return Object.freeze(feedbackList);
  }
}
