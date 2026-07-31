/**
 * ConstraintSolver.js
 * Minimal Repair Constraint Solver.
 * Evaluates deck violations and applies minimal repair actions.
 */

export class ConstraintSolver {
  static solve(strategyIR, currentDeck = []) {
    const violations = [];
    const repairs = [];

    const plan = strategyIR.plan || {};
    const constraints = plan.constraints || { maxTaplands: 4 };

    // 1. Check tapland violation
    const taplandCount = currentDeck.filter(c => (c.typeLine || '').includes('Land') && (c.oracleText || '').toLowerCase().includes('enters the battlefield tapped')).length;
    if (taplandCount > constraints.maxTaplands) {
      violations.push({
        rule: 'RULE_MAX_TAPLANDS',
        expected: constraints.maxTaplands,
        actual: taplandCount
      });
      repairs.push({
        action: 'SWAP_TAPLAND_FOR_FASTLAND',
        targetCount: taplandCount - constraints.maxTaplands
      });
    }

    return {
      resolved: violations.length === 0 || repairs.length > 0,
      violations,
      repairs
    };
  }
}
