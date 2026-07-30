/**
 * ExecutionContract.js - Version 1
 * Immutable executable contract governing slot candidates andContextScore calculations.
 */

export class ExecutionContract {
  static VERSION = 1;
  static COMPATIBLE_UNTIL = 2;

  constructor({
    id,
    capability,
    objective,
    priority = 'required', // critical, required, preferred, optional
    minCount = 1,
    idealCount = 1,
    maxCount = 4,
    requiredTraits = [],
    forbiddenTraits = [],
    weights = {}
  }) {
    this.version = ExecutionContract.VERSION;
    this.compatibleUntil = ExecutionContract.COMPATIBLE_UNTIL;
    this.id = id;
    this.capability = capability;
    this.objective = objective;
    this.priority = priority;
    this.minCount = minCount;
    this.idealCount = idealCount;
    this.maxCount = maxCount;
    this.requiredTraits = Object.freeze([...requiredTraits]);
    this.forbiddenTraits = Object.freeze([...forbiddenTraits]);
    this.weights = Object.freeze({ ...weights });

    Object.freeze(this);
  }
}
