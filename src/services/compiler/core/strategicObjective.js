/**
 * src/services/compiler/core/strategicObjective.js
 * 
 * StrategicObjective: High-level domain trade-off objective model v1.0.
 * Captures user intent trade-offs (e.g. "early pressure without losing Turn 8").
 */

export class StrategicObjective {
  constructor({
    primaryTarget = 'EARLY_PRESSURE',
    secondaryTarget = 'BOARD_SWARM',
    speedTier = 'FAST',
    desiredTurnWin = 5,
    maxCurveAvg = 2.4,
    interactionLevel = 'MEDIUM',
    acceptableTradeoffs = ['LOW_LATE_GAME_POWER']
  } = {}) {
    this.primaryTarget = primaryTarget;
    this.secondaryTarget = secondaryTarget;
    this.speedTier = speedTier;
    this.desiredTurnWin = desiredTurnWin;
    this.maxCurveAvg = maxCurveAvg;
    this.interactionLevel = interactionLevel;
    this.acceptableTradeoffs = Object.freeze([...acceptableTradeoffs]);
    
    Object.freeze(this);
  }

  /**
   * Derive target CapabilityVector axes from StrategicObjective and IntentPackage.
   */
  toCapabilityAxes(intentPackage) {
    const isAggro = intentPackage.tempo === 'Aggro' || this.speedTier === 'FAST';
    const totalDeckSize = intentPackage.format === 'COMMANDER' ? 100 : 60;
    const isCommander = intentPackage.format === 'COMMANDER';
    const landTarget = isCommander ? 36 : 24;
    const spellTarget = totalDeckSize - landTarget;

    const axes = [
      {
        id: 'TURN1_PRESSURE',
        target: isAggro ? 12 : 4,
        weight: 10,
        mandatory: isAggro,
        origin: { field: 'tempo', value: intentPackage.tempo },
        strength: isAggro ? 'MANDATORY' : 'PREFERRED'
      },
      {
        id: 'TURN2_PRESSURE',
        target: isAggro ? 12 : 8,
        weight: 8,
        mandatory: false,
        origin: { field: 'tempo', value: intentPackage.tempo },
        strength: 'PREFERRED'
      },
      {
        id: 'CHEAP_REMOVAL',
        target: 6,
        weight: 7,
        mandatory: true,
        origin: { field: 'format', value: intentPackage.format },
        strength: 'MANDATORY'
      },
      {
        id: 'CARD_FLOW',
        target: 8,
        weight: 6,
        mandatory: false,
        origin: { field: 'powerLevel', value: intentPackage.powerLevel },
        strength: 'PREFERRED'
      },
      {
        id: 'MANA_BASE',
        target: landTarget,
        weight: 10,
        mandatory: true,
        origin: { field: 'colors', value: intentPackage.colors },
        strength: 'MANDATORY'
      }
    ];

    const strategyList = intentPackage.strategy || [];
    const mechanicsList = intentPackage.mechanics || [];
    const powerLevelTier = intentPackage.powerLevel || 'Competitive';

    if (intentPackage.primaryTribe) {
      axes.push({
        id: 'TRIBAL_DENSITY',
        target: Math.round(spellTarget * 0.45),
        weight: 9,
        mandatory: true,
        origin: { field: 'primaryTribe', value: intentPackage.primaryTribe },
        strength: 'STRONG'
      });
    }

    if (strategyList.length > 0 || mechanicsList.length > 0) {
      axes.push({
        id: 'BOARD_PRESENCE',
        target: Math.round(spellTarget * 0.35),
        weight: powerLevelTier === 'Competitive' ? 9 : 7,
        mandatory: false,
        origin: { field: mechanicsList.length > 0 ? 'mechanics' : 'strategy', value: mechanicsList[0] || strategyList[0] },
        strength: 'PREFERRED'
      });
    }

    return axes;
  }
}
