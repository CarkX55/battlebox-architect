/**
 * ActionEvaluator.js
 * AlphaZero-Style Legal Action Evaluator guided by ObjectiveComposition.
 * Returns an explicable ActionDecision tree.
 */

import { UtilityEvaluator } from '../eval/UtilityEvaluator.js';

export class ActionEvaluator {
  static evaluateLegalActions(legalActions, gameState, objectiveComposition) {
    const evaluatedActions = legalActions.map(action => {
      const evaluation = UtilityEvaluator.evaluate(action.card || {}, gameState, {}, objectiveComposition);

      return Object.freeze({
        action,
        expectedUtility: evaluation.score,
        risk: action.card?.cmc > 4 ? 0.3 : 0.05,
        confidence: 0.95,
        explanation: `Action evaluated for ${action.card?.name || 'Action'} with score ${evaluation.score}`,
        utilityBreakdown: Object.freeze({ ...evaluation.contributors })
      });
    });

    evaluatedActions.sort((a, b) => b.expectedUtility - a.expectedUtility);

    return Object.freeze({
      chosenAction: evaluatedActions[0] || null,
      alternatives: Object.freeze(evaluatedActions.slice(1)),
      timestamp: Date.now()
    });
  }
}
