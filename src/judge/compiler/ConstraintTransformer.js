/**
 * ConstraintTransformer.js
 * Receives HypothesisSet and ConstraintFeedback and transforms CapabilityRequirements into CapabilityRequirements'.
 */

import { CapabilityRequirements } from '../ir/CapabilityRequirements.js';

export class ConstraintTransformer {
  static transform(currentRequirements, hypothesisSet, constraintFeedback = []) {
    if (!currentRequirements) return currentRequirements;

    const reqs = [...(currentRequirements.requirements || [])];

    if (constraintFeedback && constraintFeedback.length > 0) {
      for (const fb of constraintFeedback) {
        if (fb.constraintFeedback && fb.constraintFeedback.newConstraints) {
          for (const newCap of fb.constraintFeedback.newConstraints) {
            const capName = newCap.split(' ')[0] || 'EarlyInteraction';
            const existing = reqs.find(r => r.capability === capName || r.id === capName);
            if (existing) {
              existing.idealCount = (existing.idealCount || 4) + 2;
              existing.minCount = (existing.minCount || 2) + 2;
            } else {
              reqs.push({
                contractKey: `${capName}_Injected_cmcany_mfalse`,
                capability: capName,
                objective: 'Dynamic feedback injection',
                curveWindow: 'any',
                mandatory: false,
                minCount: 4,
                idealCount: 6,
                maxCount: 8,
                derivedFrom: ['MetaEvaluator_Feedback'],
                priority: 'required'
              });
            }
          }
        }
      }
    }

    return new CapabilityRequirements({
      archetype: currentRequirements.archetype,
      requirements: reqs,
      targetCurve: currentRequirements.targetCurve,
      metadata: { ...currentRequirements.metadata, transformedAt: Date.now() }
    });
  }
}
