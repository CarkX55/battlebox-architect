/**
 * src/judge/validation/IndependentValidationPipeline.js
 * Independent Final Validation Pipeline before compiling Blueprint.
 */

export class IndependentValidationPipeline {
  constructor(constraintEngine) {
    this.constraintEngine = constraintEngine;
  }

  validatePlan(candidatePlan, strategicIR) {
    const issues = [];

    // Check if candidate plan adds fictitious cards
    const adds = candidatePlan.proposedSwaps?.adds || [];
    adds.forEach(add => {
      if (!add || (!add.name && !add.signature)) {
        issues.push({
          code: 'INVALID_ADD_SIGNATURE',
          severity: 'BLOCKING',
          message: 'Intento de adición con firma o nombre inválido.'
        });
      }
    });

    return Object.freeze({
      isValid: issues.filter(i => i.severity === 'BLOCKING').length === 0,
      issues: Object.freeze(issues)
    });
  }
}
