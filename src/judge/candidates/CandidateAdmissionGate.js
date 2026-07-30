/**
 * src/judge/candidates/CandidateAdmissionGate.js
 * Unified Candidate Admission Gate. Single door for all card insertions.
 */

import { analyzeFunctionalDependencies } from '../capabilities/FunctionalDependencyMatrix.js';

export function evaluateCandidateAdmission(card, context = {}) {
  const reasons = [];

  if (!card || !card.name) {
    return Object.freeze({ allowed: false, reasons: ['INVALID_CARD'] });
  }

  // 1. DeckIdentity check (forbidden directions)
  if (context.deckIdentity && context.deckIdentity.isCardForbidden(card)) {
    reasons.push('FORBIDDEN_DIRECTION');
  }

  // 2. Functional dependencies check
  const currentDeck = context.currentDeck || [];
  const dependency = analyzeFunctionalDependencies(card, currentDeck);
  if (!dependency.isSatisfied) {
    reasons.push(`UNSATISFIED_DEPENDENCY_${dependency.missingRequirement}`);
  }

  // 3. Color Identity check
  if (context.requestedColors && context.requestedColors.length > 0 && card.colors && card.colors.length > 0) {
    const requestedSet = new Set(context.requestedColors);
    const hasIllegalColor = card.colors.some(col => !requestedSet.has(col));
    if (hasIllegalColor) {
      reasons.push('OFF_COLOR');
    }
  }

  return Object.freeze({
    allowed: reasons.length === 0,
    reasons: Object.freeze(reasons),
    dependencyDetails: dependency
  });
}
