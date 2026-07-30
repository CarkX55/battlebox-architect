/**
 * CapabilityVector.js - Version 1
 * Minimal mathematical Functional IR containing interfaces, effects, and traits.
 */

export class CapabilityVector {
  static VERSION = 1;
  static COMPATIBLE_UNTIL = 2;

  constructor({ id, interfaces = [], effects = [], traits = [] }) {
    this.version = CapabilityVector.VERSION;
    this.compatibleUntil = CapabilityVector.COMPATIBLE_UNTIL;
    this.id = id;
    this.interfaces = Object.freeze([...interfaces]);
    this.effects = Object.freeze([...effects]);
    this.traits = Object.freeze([...traits]);

    Object.freeze(this);
  }
}
