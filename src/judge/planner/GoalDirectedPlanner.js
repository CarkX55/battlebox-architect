/**
 * src/judge/planner/GoalDirectedPlanner.js
 * Goal-Directed Strategic Planner. Reads FactsRepository and generates multiple Candidate Plans.
 */

import { createImpactVector } from '../passes/CostModel.js';

export class GoalDirectedPlanner {
  constructor(evaluationContext) {
    this.context = evaluationContext;
  }

  generateCandidatePlans(factsRepository, strategicIR) {
    const facts = factsRepository.getAllFacts();
    const candidatePlans = [];

    const criticalPipFacts = facts.filter(f => f.category === 'ManaPipDeficit' && f.severity === 'CRITICAL');
    const interactionFacts = facts.filter(f => f.category === 'InteractionCoverage' && f.severity !== 'INFO');

    // Candidate Plan A: Fix Mana Deficit
    if (criticalPipFacts.length > 0) {
      const deficientColor = criticalPipFacts[0].value.color;
      candidatePlans.push({
        id: 'plan_fix_mana_deficit',
        name: `Reequilibrar maná para color ${deficientColor}`,
        goals: ['FixManaDeficit', 'IncreaseConsistency'],
        proposedSwaps: {
          removes: [],
          adds: [{ signature: `Land, ${deficientColor}`, quantity: 2 }]
        },
        impactVector: createImpactVector({
          deltaConsistency: 0.15,
          deltaTempo: 0.0,
          deltaWinProb: 0.12,
          transformationCost: 2
        }),
        rationale: `El hecho ${criticalPipFacts[0].id} indica un déficit crítico en fuentes ${deficientColor}.`
      });
    }

    // Candidate Plan B: Improve Interaction
    if (interactionFacts.length > 0) {
      const deficit = interactionFacts[0].value.deficit || 2;
      candidatePlans.push({
        id: 'plan_improve_interaction',
        name: 'Inyectar remoción/interrupción rápida (CMC 1-2)',
        goals: ['ImproveInteraction', 'IncreaseResilience'],
        proposedSwaps: {
          removes: [],
          adds: [{ signature: 'Instant/Sorcery, Interaction, CMC 1-2', quantity: deficit }]
        },
        impactVector: createImpactVector({
          deltaConsistency: 0.05,
          deltaInteraction: 0.25,
          deltaResilience: 0.10,
          deltaWinProb: 0.10,
          transformationCost: deficit
        }),
        rationale: `El hecho ${interactionFacts[0].id} reporta un déficit de ${deficit} cartas de interacción.`
      });
    }

    // Default Baseline Plan (No Changes)
    candidatePlans.push({
      id: 'plan_baseline_current',
      name: 'Mantener configuración actual intacta',
      goals: ['PreserveCurrentState'],
      proposedSwaps: { removes: [], adds: [] },
      impactVector: createImpactVector({
        deltaConsistency: 0.0,
        deltaWinProb: 0.0,
        transformationCost: 0
      }),
      rationale: 'Línea de base sin modificaciones.'
    });

    return Object.freeze(candidatePlans);
  }
}
