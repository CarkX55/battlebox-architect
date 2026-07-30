/**
 * CapabilityPlan.js - Version 1
 * Immutable Abstract Strategic Plan.
 */

export class CapabilityPlan {
  static VERSION = 1;
  static COMPATIBLE_UNTIL = 2;

  constructor({ archetype, targets = {}, targetCurve = {}, priorityRules = [] }) {
    this.version = CapabilityPlan.VERSION;
    this.compatibleUntil = CapabilityPlan.COMPATIBLE_UNTIL;
    this.archetype = archetype;
    this.targets = Object.freeze({ ...targets });
    this.targetCurve = Object.freeze({ ...targetCurve });
    this.priorityRules = Object.freeze([...priorityRules]);

    Object.freeze(this);
  }
}
