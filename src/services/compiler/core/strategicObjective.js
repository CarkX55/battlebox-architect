/**
 * STRATEGIC OBJECTIVE (v23.0 Core Engine)
 * 
 * Strategic Contract Compiler & Normalizer.
 * Translates User Intent, Strategic Thesis, and Proof Obligations into
 * formal capability axes and causal contracts.
 * 
 * Zero hardcoded archetype lists. Maps declared strategic proof obligations
 * into canonical capability dimensions.
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
   * Derive target CapabilityVector axes from Strategic Contract, IntentPackage, and DeckIdentity.
   */
  static toCapabilityAxes(intentPackage, deckIdentity = null) {
    return new StrategicObjective().toCapabilityAxes(intentPackage, deckIdentity);
  }

  /**
   * Derive target CapabilityVector axes from Strategic Contract, IntentPackage, and DeckIdentity.
   */
  toCapabilityAxes(intentPackage, deckIdentity = null) {
    const tempoLower = (intentPackage.tempo || '').toLowerCase();
    const strategyLower = (intentPackage.strategy || []).join(' ').toLowerCase();
    const mechanicsList = (intentPackage.mechanics || []).map(m => (typeof m === 'string' ? m : m?.name || '').toLowerCase());
    const engId = (intentPackage.userConstraints?.selectedEngineId || intentPackage.selectedEngineId || '').toLowerCase();
    const rawBoosts = intentPackage.userConstraints?.boostKeywords || [];
    const boostStr = (Array.isArray(rawBoosts) ? rawBoosts.join(' ') : String(rawBoosts)).toLowerCase();
    const allSignals = `${strategyLower} ${mechanicsList.join(' ')} ${engId} ${boostStr}`.toLowerCase();

    const primaryTribe = (intentPackage.primaryTribe || '').toLowerCase();
    const hasTribe = Boolean(primaryTribe && primaryTribe !== 'none' && primaryTribe !== 'null' && primaryTribe !== 'general');

    const totalDeckSize = intentPackage.format === 'COMMANDER' ? 100 : 60;
    const isCommander = intentPackage.format === 'COMMANDER';
    const isRamp = tempoLower.includes('ramp') || tempoLower.includes('big_mana');
    const isControl = tempoLower.includes('control') || (deckIdentity && (deckIdentity.archetypeKey || '').toLowerCase().includes('control'));
    const isAggro = tempoLower.includes('aggro') || this.speedTier === 'FAST';

    const landTarget = isCommander ? 36 : (isControl ? 26 : (isRamp ? 24 : (isAggro ? 22 : 24)));

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

    // 2. Archetype Identity Contract Integration:
    const mandatoryRoles = deckIdentity?.mandatoryRoles || [];
    const hasRole = (r) => mandatoryRoles.some(mr => mr.toLowerCase().replace(/_/g, ' ').includes(r.toLowerCase().replace(/_/g, ' ')));

    if (mandatoryRoles.length > 0) {
      if (hasRole('tribal density') || hasTribe) {
        axes.push({
          id: 'TRIBAL_DENSITY',
          target: isCommander ? 16 : 12,
          weight: 10,
          mandatory: true,
          origin: { field: 'deckIdentity', value: 'Tribal Density' },
          strength: 'MANDATORY'
        });
      }
      if (hasRole('ramp acceleration') || isRamp) {
        axes.push({
          id: 'RAMP_ACCELERATION',
          target: isCommander ? 12 : 8,
          weight: 10,
          mandatory: true,
          origin: { field: 'deckIdentity', value: 'Ramp Acceleration' },
          strength: 'MANDATORY'
        });
      }
      if (hasRole('turn 1 play') || hasRole('turn1 pressure')) {
        axes.push({
          id: 'TURN1_PRESSURE',
          target: isCommander ? 10 : 8,
          weight: 10,
          mandatory: true,
          origin: { field: 'deckIdentity', value: 'Turn 1 Early Pressure' },
          strength: 'MANDATORY'
        });
      }
      if (hasRole('turn 2 pressure') || hasRole('turn2 pressure')) {
        axes.push({
          id: 'TURN2_PRESSURE',
          target: isCommander ? 10 : 8,
          weight: 9,
          mandatory: true,
          origin: { field: 'deckIdentity', value: 'Turn 2 Pressure' },
          strength: 'MANDATORY'
        });
      }
      if (hasRole('counterspell suite') || hasRole('countermagic') || hasRole('counterspell') || (isControl && !hasRole('aggro'))) {
        axes.push({
          id: 'COUNTER_DISRUPTION',
          target: isCommander ? 12 : 8,
          weight: 10,
          mandatory: true,
          origin: { field: 'deckIdentity', value: 'Counterspell Suite' },
          strength: 'MANDATORY'
        });
      }
      if (hasRole('board sweeper') || hasRole('sweeper') || hasRole('mass removal') || (isControl && !hasRole('aggro') && !hasRole('tempo'))) {
        axes.push({
          id: 'BOARD_SWEEPER',
          target: isCommander ? 6 : 4,
          weight: 9,
          mandatory: true,
          origin: { field: 'deckIdentity', value: 'Board Sweepers' },
          strength: 'MANDATORY'
        });
      }
      if (hasRole('cheap removal') || hasRole('spot removal') || hasRole('removal')) {
        axes.push({
          id: 'CHEAP_REMOVAL',
          target: isCommander ? 8 : (isControl ? 8 : 4),
          weight: isControl ? 9 : 8,
          mandatory: true,
          origin: { field: 'deckIdentity', value: 'Cheap Removal' },
          strength: 'MANDATORY'
        });
      }
      if (hasRole('card flow') || hasRole('cantrip') || hasRole('card advantage') || hasRole('card draw')) {
        axes.push({
          id: 'CARD_FLOW',
          target: isCommander ? 10 : (isControl ? 8 : 4),
          weight: isControl ? 9 : 7,
          mandatory: isControl,
          origin: { field: 'deckIdentity', value: 'Card Flow' },
          strength: isControl ? 'MANDATORY' : 'PREFERRED'
        });
      }
      if (hasRole('amplify') || hasRole('lord') || (hasTribe && isAggro)) {
        axes.push({
          id: 'AMPLIFY_BOARD_PRESSURE',
          target: isCommander ? 8 : 4,
          weight: 9,
          mandatory: false,
          origin: { field: 'deckIdentity', value: 'Amplify Board Pressure' },
          strength: 'PREFERRED'
        });
      }
      if (hasRole('board presence') || hasRole('stabilization')) {
        axes.push({
          id: 'BOARD_PRESENCE',
          target: isCommander ? 8 : 4,
          weight: 8,
          mandatory: false,
          origin: { field: 'deckIdentity', value: 'Board Presence' },
          strength: 'PREFERRED'
        });
      }
      if (hasRole('finisher') && !isAggro) {
        axes.push({
          id: 'FINISHER',
          target: isCommander ? 6 : (isRamp ? 6 : (isControl ? 4 : 4)),
          weight: isControl ? 6 : 9,
          mandatory: false,
          origin: { field: 'deckIdentity', value: 'Finisher' },
          strength: 'PREFERRED'
        });
      }

      return axes;
    }

    // 2. Dynamic Strategic Obligations Compilation
    if (isLandfall) {
      axes.push({
        id: 'LAND_ACCELERATOR',
        target: isCommander ? 12 : 8,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Land Acceleration & Triggers' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'LANDFALL_PAYOFF',
        target: isCommander ? 12 : 8,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Landfall Payoffs' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'BOARD_PRESENCE',
        target: isCommander ? 8 : 4,
        weight: 8,
        mandatory: false,
        origin: { field: 'tempo', value: 'Board Presence' },
        strength: 'PREFERRED'
      });
    } else if (isBlink) {
      axes.push({
        id: 'ETB_VALUE',
        target: isCommander ? 12 : 8,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'ETB Value Creatures' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'BLINK_ENABLER',
        target: isCommander ? 10 : 6,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Blink / Flicker Enablers' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'BOARD_PRESENCE',
        target: isCommander ? 8 : 4,
        weight: 8,
        mandatory: false,
        origin: { field: 'tempo', value: 'Board Presence' },
        strength: 'PREFERRED'
      });
    } else if (isLifegain) {
      axes.push({
        id: 'LIFEGAIN_TRIGGER',
        target: isCommander ? 12 : 8,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Lifegain Triggers' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'GROWTH_PAYOFF',
        target: isCommander ? 10 : 8,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Lifegain Growth Payoffs' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'BOARD_PRESENCE',
        target: isCommander ? 8 : 4,
        weight: 8,
        mandatory: false,
        origin: { field: 'tempo', value: 'Board Presence' },
        strength: 'PREFERRED'
      });
    } else if (isReanimator) {
      axes.push({
        id: 'LOOTING_DISCARD',
        target: isCommander ? 10 : 6,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Looting & Graveyard Enablers' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'REANIMATION_SPELL',
        target: isCommander ? 10 : 6,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Reanimation Spells' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'COLOSSAL_TARGET',
        target: isCommander ? 10 : 6,
        weight: 9,
        mandatory: true,
        origin: { field: 'strategy', value: 'Colossal Payoffs' },
        strength: 'MANDATORY'
      });
    } else if (isCounters) {
      axes.push({
        id: 'COUNTER_ENGINE',
        target: isCommander ? 12 : 8,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: '+1/+1 Counter Engines' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'COUNTER_PAYOFF',
        target: isCommander ? 10 : 8,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Counter Payoffs & Scaling' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'BOARD_PRESENCE',
        target: isCommander ? 8 : 4,
        weight: 8,
        mandatory: false,
        origin: { field: 'tempo', value: 'Board Presence' },
        strength: 'PREFERRED'
      });
    } else if (isBurn) {
      axes.push({
        id: 'TURN1_PRESSURE',
        target: isCommander ? 10 : 8,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Turn 1 Early Pressure' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'TURN2_PRESSURE',
        target: isCommander ? 12 : 8,
        weight: 9,
        mandatory: true,
        origin: { field: 'strategy', value: 'Turn 2 Pressure' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'BURN_REACH',
        target: isCommander ? 12 : 8,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Direct Face Burn & Reach' },
        strength: 'MANDATORY'
      });
    } else if (isSacrifice) {
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
    } else if (isSpellslinger) {
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
    } else if (isArtifacts) {
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
    } else if (isPrison) {
      axes.push({
        id: 'TAXING_CREATURE',
        target: isCommander ? 14 : 10,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Taxing Creatures & Hatebears' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'PRISON_LOCK',
        target: isCommander ? 10 : 6,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Mana Taxes, Attack Locks & Static Denial' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'CHEAP_REMOVAL',
        target: isCommander ? 10 : 6,
        weight: 10,
        mandatory: true,
        origin: { field: 'strategy', value: 'Targeted Removal & Disruption' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'CARD_FLOW',
        target: isCommander ? 8 : 4,
        weight: 9,
        mandatory: true,
        origin: { field: 'strategy', value: 'Card Velocity & Sustained Draw' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'BOARD_PRESENCE',
        target: isCommander ? 8 : 6,
        weight: 8,
        mandatory: false,
        origin: { field: 'strategy', value: 'Board Presence & Attackers' },
        strength: 'PREFERRED'
      });
      axes.push({
        id: 'FINISHER',
        target: isCommander ? 6 : 4,
        weight: 8,
        mandatory: false,
        origin: { field: 'strategy', value: 'Asymmetric Finisher' },
        strength: 'PREFERRED'
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
        target: isCommander ? 10 : 6,
        weight: 8,
        mandatory: false,
        origin: { field: 'tempo', value: 'Board Presence' },
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
        id: 'BOARD_STABILIZATION',
        target: isCommander ? 6 : 4,
        weight: 10,
        mandatory: true,
        origin: { field: 'tempo', value: 'Board Stabilization & Sweepers' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'CARD_FLOW',
        target: isCommander ? 12 : 8,
        weight: 9,
        mandatory: true,
        origin: { field: 'tempo', value: 'Card Advantage & Draw' },
        strength: 'MANDATORY'
      });
      axes.push({
        id: 'FINISHER',
        target: isCommander ? 6 : 4,
        weight: 9,
        mandatory: true,
        origin: { field: 'tempo', value: 'Protected Win Condition' },
        strength: 'MANDATORY'
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

    // 3. Tribal Density (strictly when a valid non-null tribe is declared)
    const rawTribeStr = intentPackage.primaryTribe ? String(intentPackage.primaryTribe).toLowerCase().trim() : '';
    const isValidTribe = rawTribeStr && !['none', 'null', 'general', 'ninguna', 'sin tribu', 'omitir', 'universal', 'sin_tribu'].includes(rawTribeStr);
    if (isValidTribe) {
      // In Control WinPath, tribal density is aligned with win condition payoffs & anchors (4-6 slots), leaving space for stabilization
      const tribalTarget = isControl ? (isCommander ? 6 : 4) : Math.round(spellTarget * 0.35);
      axes.push({
        id: 'TRIBAL_DENSITY',
        target: tribalTarget,
        weight: 9,
        mandatory: true,
        origin: { field: 'primaryTribe', value: intentPackage.primaryTribe },
        strength: 'STRONG'
      });
    }

    // 4. Emergent Board Pressure Amplification (v26.1 Causal Selection Core)
    const reliesOnMultipleBodies = isValidTribe || isAggro || isBurn || allSignals.includes('swarm') || allSignals.includes('tokens') || allSignals.includes('aristocrat');
    if (reliesOnMultipleBodies && !axes.some(a => a.id === 'AMPLIFY_BOARD_PRESSURE') && !isControl) {
      axes.push({
        id: 'AMPLIFY_BOARD_PRESSURE',
        target: isCommander ? 6 : 4,
        weight: 9,
        mandatory: true,
        origin: { field: 'winPath', value: 'Board Pressure Amplification & Multipliers' },
        strength: 'MANDATORY'
      });
    }

    // 5. Interaction & Flow
    if (!axes.some(a => a.id === 'CHEAP_REMOVAL')) {
      axes.push({
        id: 'CHEAP_REMOVAL',
        target: isCommander ? 8 : 4,
        weight: 7,
        mandatory: true,
        origin: { field: 'format', value: intentPackage.format },
        strength: 'MANDATORY'
      });
    }
    
    const existingFlow = axes.find(a => a.id === 'CARD_FLOW');
    if (existingFlow) {
      existingFlow.origin = { field: 'powerLevel', value: intentPackage.powerLevel };
    } else {
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
