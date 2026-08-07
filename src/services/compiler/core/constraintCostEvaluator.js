/**
 * src/services/compiler/core/constraintCostEvaluator.js
 * 
 * ConstraintCostEvaluator: Principle #7 Constraint Economics Auditor v1.0.
 * Quantifies the mathematical cost/restriction tax of each user constraint on the search universe.
 */

export class ConstraintCostEvaluator {
  /**
   * Evaluates the constraint cost tax for each user constraint in IntentPackage.
   * 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage 
   * @param {import('./deckIdentityModel.js').DeckIdentity} targetIdentity 
   * @returns {{ constraintCosts: Array<Object>, totalConstraintTax: number, mostRestrictiveConstraint: Object }}
   */
  static evaluateCosts(intentPackage, targetIdentity) {
    const costs = [];

    // 1. Tribal Constraint Tax
    if (intentPackage.primaryTribe) {
      const isRareTribe = ['giant', 'drake', 'gorgon', 'demon'].includes(intentPackage.primaryTribe.toLowerCase());
      const tribalCost = isRareTribe ? -12 : -6;
      costs.push({
        field: 'primaryTribe',
        value: intentPackage.primaryTribe,
        costPercentage: tribalCost,
        explanation: `Tribal constraint "${intentPackage.primaryTribe}" eliminates non-${intentPackage.primaryTribe} creature synergies.`
      });
    }

    // 2. Tempo / Curve Tax
    if (intentPackage.tempo) {
      const isAggroGiants = intentPackage.tempo.toLowerCase() === 'aggro' && targetIdentity.archetypeKey.includes('GIANTS');
      const tempoCost = isAggroGiants ? -10 : -5;
      costs.push({
        field: 'tempo',
        value: intentPackage.tempo,
        costPercentage: tempoCost,
        explanation: `Tempo requirement "${intentPackage.tempo}" constrains curve and timing windows.`
      });
    }

    // 3. Format Tax
    if (intentPackage.format) {
      costs.push({
        field: 'format',
        value: intentPackage.format,
        costPercentage: -3,
        explanation: `Format constraint "${intentPackage.format}" restricts card pool size.`
      });
    }

    // 4. Color Tax
    if (intentPackage.colors && intentPackage.colors.length > 2) {
      costs.push({
        field: 'colors',
        value: intentPackage.colors.join('/'),
        costPercentage: -5,
        explanation: `3+ Color constraint "${intentPackage.colors.join('/')}" demands dedicated mana base allocation.`
      });
    }

    const totalConstraintTax = costs.reduce((sum, item) => sum + item.costPercentage, 0);

    const sortedCosts = [...costs].sort((a, b) => a.costPercentage - b.costPercentage);
    const mostRestrictiveConstraint = sortedCosts[0] || { field: 'none', costPercentage: 0 };

    return {
      constraintCosts: Object.freeze(costs),
      totalConstraintTax,
      mostRestrictiveConstraint: Object.freeze(mostRestrictiveConstraint)
    };
  }
}
