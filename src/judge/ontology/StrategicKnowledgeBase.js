/**
 * StrategicKnowledgeBase.js - Version 1
 * Immutable Single Source of Truth (SSOT) for MTG Domain Knowledge, Engine Templates, and Failure Patterns.
 */

export class StrategicKnowledgeBase {
  static VERSION = 1;
  static COMPATIBLE_UNTIL = 2;

  static PATTERNS = Object.freeze({
    RAMP: Object.freeze({
      primaryEngine: 'ManaAcceleration',
      secondaryEngine: 'CardDraw',
      payoffEngine: 'FinisherThreat',
      targetTurn: 5,
      phaseHeuristics: Object.freeze({
        Opening: Object.freeze({ expectedMana: 3, expectedCards: 6 }),
        Development: Object.freeze({ expectedMana: 6, expectedCards: 4 }),
        Closing: Object.freeze({ expectedMana: 8, expectedCards: 2 })
      })
    }),
    MIDRANGE: Object.freeze({
      primaryEngine: 'CardDraw',
      secondaryEngine: 'TargetedRemoval',
      payoffEngine: 'MidrangeThreat',
      targetTurn: 6,
      phaseHeuristics: Object.freeze({
        Opening: Object.freeze({ expectedMana: 2, expectedCards: 7 }),
        Development: Object.freeze({ expectedMana: 4, expectedCards: 5 }),
        Closing: Object.freeze({ expectedMana: 6, expectedCards: 3 })
      })
    })
  });

  static getPattern(archetype) {
    const key = (archetype || 'RAMP').toUpperCase();
    return StrategicKnowledgeBase.PATTERNS[key] || StrategicKnowledgeBase.PATTERNS.RAMP;
  }
}
