/**
 * StrategyEvaluationLoop.js
 * Strategic Evaluation & IR Repair Loop.
 * Evaluates generated deck against strategic contracts. If deficiencies exist, modifies Strategy IR nodes (e.g. Increase Early Pressure) and triggers a re-compilation pass.
 */

import { StrategyIR } from './StrategyIRBuilder.js';

export class StrategyEvaluationLoop {
  static evaluateAndRepair(strategyIR, compiledDeck = []) {
    if (!strategyIR || !strategyIR.plan) {
      return { status: 'OPTIMAL', repairedIR: strategyIR, passesCount: 1 };
    }

    const plan = strategyIR.plan;
    const targets = plan.targets || {};

    // 1. Evaluate Turn 3 Early Interaction / Pressure Deficiency
    const earlyInteractionCount = compiledDeck.filter(c => {
      const text = (c.oracleText || c.oracle_text || '').toLowerCase();
      return (c.cmc || 1) <= 2 && (text.includes('destroy') || text.includes('exile') || text.includes('deal'));
    }).length;

    const requiredEarly = targets.minEarlyInteraction || 4;

    if (earlyInteractionCount < requiredEarly) {
      // IR Repair: Modify Strategy IR nodes directly, never cards
      const newNodes = strategyIR.nodes.map(node => {
        if (node.kind === 'PackageNode' && node.id === 'pkg_elf_ramp') {
          return {
            ...node,
            metadata: { ...node.metadata, repairAction: 'INCREASE_EARLY_INTERACTION_PACKAGE', targetCount: requiredEarly }
          };
        }
        return node;
      });

      const repairedIR = new StrategyIR(plan, newNodes);

      return {
        status: 'REPAIRED',
        repairsApplied: ['INCREASE_EARLY_INTERACTION_PACKAGE'],
        repairedIR,
        passesCount: 2
      };
    }

    return {
      status: 'OPTIMAL',
      repairsApplied: [],
      repairedIR: strategyIR,
      passesCount: 1
    };
  }
}
