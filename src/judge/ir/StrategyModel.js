/**
 * StrategyModel.js - Version 1
 * Probabilistic Weighted Strategic Lines IR Graph.
 */

export class StrategyModel {
  static VERSION = 1;
  static COMPATIBLE_UNTIL = 2;

  constructor({ archetype = 'Ramp', strategicLines = [], metadata = {} } = {}) {
    this.version = StrategyModel.VERSION;
    this.compatibleUntil = StrategyModel.COMPATIBLE_UNTIL;
    this.archetype = archetype;
    this.strategicLines = Object.freeze([...(strategicLines.length > 0 ? strategicLines : [
      { id: 'Plan_A', name: 'Primary Ramp Engine', probability: 0.70 },
      { id: 'Plan_B', name: 'Secondary Card Value', probability: 0.20 },
      { id: 'Plan_C', name: 'Control Stabilizer', probability: 0.10 }
    ])]);
    this.metadata = Object.freeze({ ...metadata });

    Object.freeze(this);
  }
}
