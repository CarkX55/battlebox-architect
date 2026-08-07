/**
 * src/services/compiler/core/constraintVariables.js
 * 
 * BattleBox Strategic Planning Framework v4.0 — Mathematical Constraint Variables.
 * Replaces static slot indices with mathematical variables (RampDensity >= 10, SweeperResilience >= 0.75).
 */

export class ConstraintVariable {
  constructor(name, operator, targetValue, weight = 1.0) {
    this.name = name;
    this.operator = operator; // '>=', '<=', '==', '>'
    this.targetValue = targetValue;
    this.weight = weight;
  }

  evaluate(actualValue) {
    switch (this.operator) {
      case '>=': return actualValue >= this.targetValue;
      case '<=': return actualValue <= this.targetValue;
      case '==': return Math.abs(actualValue - this.targetValue) < 0.001;
      case '>':  return actualValue > this.targetValue;
      default:   return actualValue >= this.targetValue;
    }
  }
}

export class StandardConstraintVariables {
  static createDefaultVariables() {
    return [
      new ConstraintVariable('RampDensity', '>=', 10, 1.0),
      new ConstraintVariable('InteractionDensity', '>=', 8, 0.9),
      new ConstraintVariable('ThreatDensity', '>=', 14, 1.0),
      new ConstraintVariable('SweeperResilience', '>=', 0.75, 0.85),
      new ConstraintVariable('ManaScrewProbability', '<=', 0.05, 1.0)
    ];
  }
}
