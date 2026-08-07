/**
 * src/services/compiler/core/constraintStrength.js
 * 
 * ConstraintStrength Enum & Weight Scale v1.0.
 * Classifies user intent constraints into explicit priority tiers for solver negotiation:
 *   - MANDATORY (100): Non-negotiable hard contract (Format, Colors).
 *   - STRONG (80): Core strategic/tribal driver (Primary Tribe, Essential Engine).
 *   - PREFERRED (50): High-value mechanics or strategy preference.
 *   - OPTIONAL (20): Secondary synergy bonus.
 */

export const ConstraintStrength = Object.freeze({
  MANDATORY: Object.freeze({ level: 'MANDATORY', weight: 100 }),
  STRONG: Object.freeze({ level: 'STRONG', weight: 80 }),
  PREFERRED: Object.freeze({ level: 'PREFERRED', weight: 50 }),
  OPTIONAL: Object.freeze({ level: 'OPTIONAL', weight: 20 })
});
