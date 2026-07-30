/**
 * PlanIR.js - Version 1
 * Partially Ordered Game Plan Timeline IR with Measurable Phase Goals.
 */

export class PlanIR {
  static VERSION = 1;
  static COMPATIBLE_UNTIL = 2;

  constructor({ archetype = 'Ramp', phases = [], metadata = {} } = {}) {
    this.version = PlanIR.VERSION;
    this.compatibleUntil = PlanIR.COMPATIBLE_UNTIL;
    this.archetype = archetype;

    this.phases = Object.freeze([...(phases.length > 0 ? phases : [
      {
        id: 'Opening',
        name: 'Opening Acceleration',
        targetTurn: 2,
        goals: Object.freeze({ expectedMana: 3, expectedBoardPressure: 0.2, expectedCards: 6 }),
        capabilities: Object.freeze(['ManaAcceleration'])
      },
      {
        id: 'Development',
        name: 'Midgame Development',
        targetTurn: 4,
        goals: Object.freeze({ expectedMana: 6, expectedBoardPressure: 0.5, expectedCards: 4 }),
        capabilities: Object.freeze(['CardDraw', 'TargetedRemoval'])
      },
      {
        id: 'Closing',
        name: 'Late Game Conversion',
        targetTurn: 6,
        goals: Object.freeze({ expectedMana: 8, expectedBoardPressure: 0.9, expectedCards: 2 }),
        capabilities: Object.freeze(['FinisherThreat'])
      }
    ])]);

    this.metadata = Object.freeze({ ...metadata });
    Object.freeze(this);
  }
}
