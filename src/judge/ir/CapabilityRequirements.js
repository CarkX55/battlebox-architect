/**
 * CapabilityRequirements.js - Version 1
 * Immutable CapabilityRequirements IR acting as the versioned interface between Frontend Planner and COP Solver.
 */

export class CapabilityRequirements {
  static VERSION = 1;
  static COMPATIBLE_UNTIL = 2;

  constructor({ archetype, requirements = [], targetCurve = {}, metadata = {} }) {
    this.version = CapabilityRequirements.VERSION;
    this.compatibleUntil = CapabilityRequirements.COMPATIBLE_UNTIL;
    this.archetype = archetype;
    this.requirements = Object.freeze([...requirements]);
    this.targetCurve = Object.freeze({ ...targetCurve });
    this.metadata = Object.freeze({ ...metadata });

    Object.freeze(this);
  }
}
