/**
 * src/services/compiler/core/deckIdentityModel.js
 * 
 * DeckIdentity Model v1.2 (Strategic Identity Dominance).
 * Expanded Strategic Domain Model capturing mandatory, optional, and forbidden engines,
 * strategic philosophies, and toCapabilityAxes derivation.
 */

export class DeckIdentity {
  constructor({
    archetypeKey = 'GENERIC_AGGRO',
    gameplan = 'Generic aggressive creature pressure',
    mandatoryEngines = [],
    requiredEngines = [],
    optionalEngines = [],
    forbiddenEngines = [],
    expectedCurveRange = { min: 1, max: 4 },
    mandatoryRoles = [],
    strengths = [],
    weaknesses = [],
    victoryPattern = 'Combat damage overrun',
    failurePattern = 'Mana screw or board wipe',
    recoveryPattern = 'Card draw and secondary threats',
    manaPhilosophy = 'Standard land count (24 lands)',
    curvePhilosophy = 'Low average CMC (1-3)',
    removalPhilosophy = 'Cheap efficient removal (4-6 copies)',
    cardAdvantagePhilosophy = 'Sustained card flow (4-8 copies)',
    finishPhilosophy = 'Aggressive combat finish',
    expectedKillTurn = 5,
    requiresManaRamp = false
  } = {}) {
    const combinedMandatory = mandatoryEngines.length > 0 ? mandatoryEngines : requiredEngines;
    this.archetypeKey = archetypeKey;
    this.gameplan = gameplan;
    this.mandatoryEngines = Object.freeze([...combinedMandatory]);
    this.requiredEngines = this.mandatoryEngines;
    this.optionalEngines = Object.freeze([...optionalEngines]);
    this.forbiddenEngines = Object.freeze([...forbiddenEngines]);
    this.expectedCurveRange = Object.freeze({ ...expectedCurveRange });
    this.mandatoryRoles = Object.freeze([...mandatoryRoles]);
    this.strengths = Object.freeze([...strengths]);
    this.weaknesses = Object.freeze([...weaknesses]);
    this.victoryPattern = victoryPattern;
    this.failurePattern = failurePattern;
    this.recoveryPattern = recoveryPattern;
    this.manaPhilosophy = manaPhilosophy;
    this.curvePhilosophy = curvePhilosophy;
    this.removalPhilosophy = removalPhilosophy;
    this.cardAdvantagePhilosophy = cardAdvantagePhilosophy;
    this.finishPhilosophy = finishPhilosophy;
    this.expectedKillTurn = expectedKillTurn;
    this.requiresManaRamp = Boolean(requiresManaRamp);

    Object.freeze(this);
  }

  /**
   * Derives CapabilityVector target axes EXCLUSIVELY from this DeckIdentity.
   * Enforces Principle #5: Strategic Identity Dominance.
   * 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage 
   * @returns {Array<Object>}
   */
  toCapabilityAxes(intentPackage = {}) {
    const isCommander = intentPackage.format === 'COMMANDER';
    const totalDeckSize = isCommander ? 100 : 60;
    const landTarget = isCommander ? 36 : (this.requiresManaRamp ? 24 : 24);
    const spellTarget = totalDeckSize - landTarget;

    const axes = [];

    // 1. Mana Base Axis
    axes.push({
      id: 'MANA_BASE',
      target: landTarget,
      weight: 10,
      mandatory: true,
      origin: { field: 'colors', value: intentPackage.colors || ['C'] },
      strength: 'MANDATORY'
    });

    // 2. Early Pressure / Curve Axes based on Curve Philosophy
    if (this.expectedCurveRange.min <= 2) {
      axes.push({
        id: 'TURN1_PRESSURE',
        target: Math.round(spellTarget * 0.30),
        weight: 10,
        mandatory: true,
        origin: { field: 'tempo', value: intentPackage.tempo },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'TURN2_PRESSURE',
        target: Math.round(spellTarget * 0.30),
        weight: 8,
        mandatory: false,
        origin: { field: 'tempo', value: intentPackage.tempo },
        strength: 'PREFERRED'
      });
    } else {
      // High-curve / Midrange Stomp profile (e.g. Giants)
      axes.push({
        id: 'TURN1_PRESSURE',
        target: 4,
        weight: 6,
        mandatory: false,
        origin: { field: 'tempo', value: intentPackage.tempo },
        strength: 'PREFERRED'
      });
    }

    // 3. Removal Axis based on Removal Philosophy
    axes.push({
      id: 'CHEAP_REMOVAL',
      target: 6,
      weight: 8,
      mandatory: true,
      origin: { field: 'format', value: intentPackage.format || 'Standard' },
      strength: 'MANDATORY'
    });

    // 4. Tribal / Engine Axes based on Mandatory Engines
    if (this.mandatoryEngines.includes('Stomp Engine') || this.mandatoryEngines.includes('Go Wide Swarm')) {
      axes.push({
        id: 'TRIBAL_DENSITY',
        target: Math.round(spellTarget * 0.45),
        weight: 10,
        mandatory: true,
        origin: { field: 'primaryTribe', value: intentPackage.primaryTribe || 'Giant' },
        strength: 'STRONG'
      });
    }

    // 5. Board Presence Axis
    axes.push({
      id: 'BOARD_PRESENCE',
      target: Math.round(spellTarget * 0.35),
      weight: 8,
      mandatory: false,
      origin: { field: 'mechanics', value: intentPackage.mechanics ? intentPackage.mechanics[0] : 'Stomp' },
      strength: 'PREFERRED'
    });

    // 6. Card Flow Axis
    axes.push({
      id: 'CARD_FLOW',
      target: 8,
      weight: 7,
      mandatory: false,
      origin: { field: 'powerLevel', value: intentPackage.powerLevel || 'Competitive' },
      strength: 'PREFERRED'
    });

    return axes;
  }

  toJSON() {
    return {
      archetypeKey: this.archetypeKey,
      gameplan: this.gameplan,
      mandatoryEngines: this.mandatoryEngines,
      optionalEngines: this.optionalEngines,
      forbiddenEngines: this.forbiddenEngines,
      expectedCurveRange: this.expectedCurveRange,
      mandatoryRoles: this.mandatoryRoles,
      strengths: this.strengths,
      weaknesses: this.weaknesses,
      victoryPattern: this.victoryPattern,
      failurePattern: this.failurePattern,
      recoveryPattern: this.recoveryPattern,
      manaPhilosophy: this.manaPhilosophy,
      curvePhilosophy: this.curvePhilosophy,
      removalPhilosophy: this.removalPhilosophy,
      cardAdvantagePhilosophy: this.cardAdvantagePhilosophy,
      finishPhilosophy: this.finishPhilosophy,
      expectedKillTurn: this.expectedKillTurn,
      requiresManaRamp: this.requiresManaRamp
    };
  }
}
