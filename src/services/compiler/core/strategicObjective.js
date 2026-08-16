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
    const tempoLower = (intentPackage.tempo || '').toLowerCase();
    const strategyLower = (intentPackage.strategy || []).join(' ').toLowerCase();
    const mechanicsList = (intentPackage.mechanics || []).map(m => m.toLowerCase());
    const isRamp = tempoLower.includes('ramp') || tempoLower.includes('big_mana');
    const isControl = tempoLower.includes('control');
    const isAggro = tempoLower.includes('aggro') || this.speedTier === 'FAST';
    const isSacrifice = strategyLower.includes('sacrifice') || strategyLower.includes('dies') || strategyLower.includes('aristocrat');
    const isCounters = strategyLower.includes('counter') || strategyLower.includes('+1/+1');

    const totalDeckSize = intentPackage.format === 'COMMANDER' ? 100 : 60;
    const isCommander = intentPackage.format === 'COMMANDER';
    const landTarget = isCommander ? 36 : (isRamp ? 24 : 24);
    const spellTarget = totalDeckSize - landTarget;

    const axes = [];

    // 1. Mana Base Axis
    axes.push({
      id: 'MANA_BASE',
      target: landTarget,
      weight: 10,
      mandatory: true,
      origin: { field: 'colors', value: intentPackage.colors },
      strength: 'MANDATORY'
    });

    // 2. Archetype Core Engines
    if (isSacrifice) {
      axes.push({
        id: 'RECURSIVE_FODDER',
        target: isCommander ? 12 : 8,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Recursive Fodder & Tokens' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'SACRIFICE_OUTLET',
        target: isCommander ? 10 : 6,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Sacrifice Outlets' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'DEATH_PAYOFF',
        target: isCommander ? 10 : 6,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Death & Drain Payoffs' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'CARD_FLOW',
        target: isCommander ? 8 : 4,
        weight: 8,
        mandatory: false,
        origin: { field: 'strategy', value: 'Sacrifice Draw Engines' },
        strength: 'PREFERRED'
      });
    } else if (strategyLower.includes('spell') || strategyLower.includes('prowess') || strategyLower.includes('burn') || mechanicsList.includes('prowess') || mechanicsList.includes('magecraft')) {
      axes.push({
        id: 'TURN1_PRESSURE',
        target: isCommander ? 10 : 6,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Prowess / Aggro Attackers' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'CARD_FLOW',
        target: isCommander ? 14 : 8,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Cheap Cantrips & Velocity' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'CHEAP_REMOVAL',
        target: isCommander ? 12 : 8,
        weight: 9,
        mandatory: true,
        origin: { field: 'strategy', value: 'Direct Burn & Removal' },
        strength: 'MANDATORY'
      });
    } else if (strategyLower.includes('artifact') || strategyLower.includes('affinity') || mechanicsList.includes('affinity') || mechanicsList.includes('metalcraft')) {
      axes.push({
        id: 'TURN1_PRESSURE',
        target: isCommander ? 14 : 8,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Cheap Artifact Enablers' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'BOARD_PRESENCE',
        target: isCommander ? 12 : 8,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Affinity / Modular Payoffs' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'CARD_FLOW',
        target: isCommander ? 10 : 6,
        weight: 9,
        mandatory: false,
        origin: { field: 'strategy', value: 'Artifact Draw Engines' },
        strength: 'PREFERRED'
      });
    } else if (strategyLower.includes('enchant') || strategyLower.includes('aura') || strategyLower.includes('voltron') || mechanicsList.includes('constellation')) {
      axes.push({
        id: 'TURN1_PRESSURE',
        target: isCommander ? 10 : 6,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Voltron / Hexproof Threats' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'BOARD_PRESENCE',
        target: isCommander ? 14 : 8,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Aura Buffs' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'CARD_FLOW',
        target: isCommander ? 10 : 6,
        weight: 9,
        mandatory: false,
        origin: { field: 'strategy', value: 'Enchantress Draw Engines' },
        strength: 'PREFERRED'
      });
    } else if (strategyLower.includes('life') || mechanicsList.includes('lifelink')) {
      axes.push({
        id: 'TURN1_PRESSURE',
        target: isCommander ? 10 : 6,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Lifegain Triggers' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'BOARD_PRESENCE',
        target: isCommander ? 12 : 8,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Lifegain Growth Payoffs' },
        strength: 'MANDATORY'
      });
    } else if (isRamp) {
      axes.push({
        id: 'RAMP_ACCELERATION',
        target: isCommander ? 12 : 8,
        weight: 10,
        mandatory: true,
        origin: { field: 'tempo', value: 'Ramp Acceleration' },
        strength: 'MANDATORY'
      });
      if (isCounters) {
        axes.push({
          id: 'COUNTER_SYNERGY',
          target: isCommander ? 10 : 6,
          weight: 9,
          mandatory: false,
          origin: { field: 'strategy', value: '+1/+1 Counter Multipliers' },
          strength: 'STRONG'
        });
      }
      axes.push({
        id: 'BOARD_PRESENCE',
        target: isCommander ? 14 : 8,
        weight: 9,
        mandatory: false,
        origin: { field: 'tempo', value: 'Mid-Curve Threats' },
        strength: 'PREFERRED'
      });
      axes.push({
        id: 'FINISHER',
        target: isCommander ? 10 : 6,
        weight: 9,
        mandatory: false,
        origin: { field: 'tempo', value: 'High-Curve Payoffs' },
        strength: 'PREFERRED'
      });
    } else if (isAggro) {
      axes.push({
        id: 'TURN1_PRESSURE',
        target: isCommander ? 10 : 8,
        weight: 10,
        mandatory: true,
        origin: { field: 'tempo', value: 'Turn 1 Play' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'TURN2_PRESSURE',
        target: isCommander ? 12 : 8,
        weight: 9,
        mandatory: false,
        origin: { field: 'tempo', value: 'Turn 2 Pressure' },
        strength: 'PREFERRED'
      });
      axes.push({
        id: 'BOARD_PRESENCE',
        target: isCommander ? 12 : 8,
        weight: 8,
        mandatory: false,
        origin: { field: 'tempo', value: 'Midgame Attackers' },
        strength: 'PREFERRED'
      });
    } else if (isControl) {
      axes.push({
        id: 'CHEAP_REMOVAL',
        target: isCommander ? 12 : 8,
        weight: 10,
        mandatory: true,
        origin: { field: 'tempo', value: 'Targeted Removal' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'CARD_FLOW',
        target: isCommander ? 14 : 10,
        weight: 9,
        mandatory: true,
        origin: { field: 'tempo', value: 'Card Advantage & Draw' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'FINISHER',
        target: isCommander ? 6 : 4,
        weight: 8,
        mandatory: false,
        origin: { field: 'tempo', value: 'Win Condition Threat' },
        strength: 'PREFERRED'
      });
    } else {
      // General Midrange
      axes.push({
        id: 'TURN1_PRESSURE',
        target: 4,
        weight: 8,
        mandatory: false,
        origin: { field: 'tempo', value: intentPackage.tempo },
        strength: 'PREFERRED'
      });
      axes.push({
        id: 'TURN2_PRESSURE',
        target: 8,
        weight: 9,
        mandatory: false,
        origin: { field: 'tempo', value: intentPackage.tempo },
        strength: 'PREFERRED'
      });
      axes.push({
        id: 'BOARD_PRESENCE',
        target: 8,
        weight: 9,
        mandatory: false,
        origin: { field: 'tempo', value: 'Board Presence' },
        strength: 'PREFERRED'
      });
    }

    // 3. Tribal Density
    if (intentPackage.primaryTribe) {
      axes.push({
        id: 'TRIBAL_DENSITY',
        target: Math.round(spellTarget * 0.40),
        weight: 9,
        mandatory: true,
        origin: { field: 'primaryTribe', value: intentPackage.primaryTribe },
        strength: 'STRONG'
      });
    }

    // 4. Interaction & Flow (Required by all competitive decks)
    if (!isControl) {
      axes.push({
        id: 'CHEAP_REMOVAL',
        target: isCommander ? 8 : 4,
        weight: 7,
        mandatory: true,
        origin: { field: 'format', value: intentPackage.format },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'CARD_FLOW',
        target: isCommander ? 8 : 4,
        weight: 7,
        mandatory: false,
        origin: { field: 'powerLevel', value: intentPackage.powerLevel },
        strength: 'PREFERRED'
      });
    }

    return axes;
  }
}
