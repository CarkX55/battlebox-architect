/**
 * src/judge/pareto/ParetoTournamentEngine.js
 * Multi-objective Pareto Tournament Engine with Discard Rationales.
 */

import { isDominatingVector } from '../passes/CostModel.js';

export class ParetoTournamentEngine {
  constructor(evaluationContext) {
    this.context = evaluationContext;
  }

  evaluateTournament(candidatePlans) {
    const nonDominatedPlans = [];
    const discardedPlans = [];

    candidatePlans.forEach((planA, i) => {
      let isDominated = false;
      let dominatingPlan = null;

      candidatePlans.forEach((planB, j) => {
        if (i !== j && isDominatingVector(planB.impactVector, planA.impactVector)) {
          isDominated = true;
          dominatingPlan = planB;
        }
      });

      if (!isDominated) {
        nonDominatedPlans.push(planA);
      } else {
        discardedPlans.push({
          plan: planA,
          reason: `Dominado por plan "${dominatingPlan.name}" en métricas de tempo o menor coste de transformación.`,
          dominatingPlanId: dominatingPlan.id
        });
      }
    });

    // Select winner from Pareto front (best win probability delta with acceptable cost)
    const winningPlan = nonDominatedPlans.sort((a, b) => b.impactVector.deltaWinProb - a.impactVector.deltaWinProb)[0] || candidatePlans[0];

    return Object.freeze({
      winner: winningPlan,
      paretoFront: Object.freeze(nonDominatedPlans),
      discardedPlans: Object.freeze(discardedPlans)
    });
  }
}
