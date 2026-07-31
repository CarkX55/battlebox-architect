/**
 * WinPlanOptimizer.js
 * Win-Plan Execution Probability Optimizer.
 * Evaluates how effectively a compiled deck executes its multi-tier win plans (Plan A, Plan B, Plan C)
 * against expected metagame interaction levels.
 */

import { DynamicStrategicEngine } from '../domain/DynamicStrategicEngine.js';

export class WinPlanOptimizer {
  static evaluateDeckWinPlanExecution(deckState, metaInteractionDensity = 0.30) {
    const boundCards = deckState.slots.map(s => s.chosenCard).filter(Boolean);
    const winPlans = DynamicStrategicEngine.buildDeckWinPlans('Ramp');

    const dorksCount = boundCards.filter(c => {
      const text = (c.oracle_text || c.oracleText || c.name || '').toLowerCase();
      return text.includes('add') || text.includes('mana');
    }).length;

    const finishersCount = boundCards.filter(c => (c.cmc || 0) >= 5).length;
    const drawCount = boundCards.filter(c => {
      const text = (c.oracle_text || c.oracleText || '').toLowerCase();
      return text.includes('draw');
    }).length;

    // Calculate Execution Probabilities
    const planAProb = Math.min(0.95, Number(((dorksCount / 10) * (finishersCount / 4) * (1 - metaInteractionDensity * 0.3)).toFixed(3)));
    const planBProb = Math.min(0.90, Number(((drawCount / 8) * 0.85).toFixed(3)));
    const planCProb = Math.min(0.85, Number(((boundCards.length / 60) * 0.75).toFixed(3)));

    const maxWinPlanExecutionScore = Number(((planAProb * 0.50) + (planBProb * 0.35) + (planCProb * 0.15)).toFixed(3));

    return Object.freeze({
      metaInteractionDensity,
      winPlans,
      planAExecutionProbability: planAProb,
      planBExecutionProbability: planBProb,
      planCExecutionProbability: planCProb,
      maxWinPlanExecutionScore,
      rating: maxWinPlanExecutionScore >= 0.75 ? 'HIGHLY_CONSISTENT_WIN_PLAN' : 'VIABLE_WIN_PLAN'
    });
  }
}
