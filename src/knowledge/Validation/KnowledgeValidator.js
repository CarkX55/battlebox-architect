/**
 * KnowledgeValidator.js
 * Validates Knowledge Objects, resolves multi-source conflicts, and prunes stale knowledge.
 */

export class KnowledgeValidator {
  static validate(knowledgeObject) {
    if (!knowledgeObject) return { valid: false, reason: 'Null knowledge object' };
    if (knowledgeObject.deprecated) return { valid: false, reason: 'Deprecated' };
    if (knowledgeObject.confidence < 0.30) return { valid: false, reason: 'Low confidence' };

    return { valid: true };
  }

  static resolveConflict(objA, objB) {
    if (!objA) return objB;
    if (!objB) return objA;
    return objA.confidence >= objB.confidence ? objA : objB;
  }
}
