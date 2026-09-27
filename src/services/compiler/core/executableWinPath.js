/**
 * src/services/compiler/core/executableWinPath.js
 * 
 * ExecutableWinPath: Verifiable Turn-by-Turn Strategic State Engine v29.1.
 * Models discrete turn execution contracts with concrete state requirements,
 * legal actions, failure conditions, and active recovery contingency branches.
 */

export class TurnPlan {
  constructor({
    turn = 1,
    description = '',
    requiredState = {},
    legalActions = [],
    resourceRequirements = {},
    failureConditions = [],
    alternativeActions = []
  } = {}) {
    this.turn = turn;
    this.description = description;
    this.requiredState = Object.freeze({ ...requiredState });
    this.legalActions = Object.freeze([...legalActions]);
    this.resourceRequirements = Object.freeze({ ...resourceRequirements });
    this.failureConditions = Object.freeze([...failureConditions]);
    this.alternativeActions = Object.freeze([...alternativeActions]);
    Object.freeze(this);
  }
}

export class RecoveryBranch {
  constructor({
    trigger = 'WRATH_T3',
    branchPlan = 'BURN_REACH_PIVOT',
    description = '',
    targetRoles = [],
    priority = 100
  } = {}) {
    this.trigger = trigger;
    this.branchPlan = branchPlan;
    this.description = description;
    this.targetRoles = Object.freeze([...targetRoles]);
    this.priority = priority;
    Object.freeze(this);
  }
}

export class ExecutableWinPath {
  constructor({
    archetypeKey = 'AGGRESSIVE_STRATEGY',
    expectedKillTurn = 4,
    turns = [],
    recoveryBranches = []
  } = {}) {
    this.archetypeKey = archetypeKey;
    this.expectedKillTurn = expectedKillTurn;
    this.turns = Object.freeze([...turns]);
    this.recoveryBranches = Object.freeze([...recoveryBranches]);
    Object.freeze(this);
  }

  /**
   * Generates a canonical ExecutableWinPath tailored to an archetype and tempo.
   * @param {string} archetypeKey 
   * @param {Object} deckIdentity 
   * @param {Object} intentPackage 
   * @returns {ExecutableWinPath}
   */
  static generateForArchetype(archetypeKey = 'Aggro', deckIdentity = {}, intentPackage = {}) {
    const tempo = (intentPackage?.tempo || archetypeKey || 'Aggro').toLowerCase();
    const isAggro = tempo.includes('aggro') || tempo.includes('burn') || tempo.includes('sligh');
    const isControl = tempo.includes('control') || tempo.includes('tapout');
    const isCombo = tempo.includes('combo') || tempo.includes('storm');

    if (isAggro) {
      return new ExecutableWinPath({
        archetypeKey,
        expectedKillTurn: deckIdentity?.expectedKillTurn || 4,
        turns: [
          new TurnPlan({
            turn: 1,
            description: 'Deploy aggressive Turn 1 creature threat or fast enabler',
            requiredState: { minUntappedLands: 1, threatsInHand: 1 },
            legalActions: ['PLAY_LAND', 'CAST_1_DROP_CREATURE', 'PASS_HOLD_INSTANT_BURN'],
            resourceRequirements: { mana: 1 },
            failureConditions: ['NO_LAND', 'NO_1_DROP_OR_ACCELERATOR'],
            alternativeActions: ['HOLD_INTERACTION']
          }),
          new TurnPlan({
            turn: 2,
            description: 'Establish 2-body board presence and apply first combat damage',
            requiredState: { minUntappedLands: 2, boardPresence: 1 },
            legalActions: ['PLAY_LAND', 'CAST_2_DROP_THREAT', 'CAST_DUAL_1_DROPS', 'ATTACK_COMBAT'],
            resourceRequirements: { mana: 2 },
            failureConditions: ['MANA_SCREW_T2', 'EMPTY_BOARD'],
            alternativeActions: ['REMOVE_OPPONENT_BLOCKER', 'IMPULSE_CARD_DRAW']
          }),
          new TurnPlan({
            turn: 3,
            description: 'Amplify board damage via Lord / Multiplier / Haste and swing for heavy pressure',
            requiredState: { minUntappedLands: 3, boardPower: 4 },
            legalActions: ['PLAY_LAND', 'CAST_AMPLIFIER_OR_LORD', 'CAST_HASTE_ATTACKER', 'ATTACK_COMBAT'],
            resourceRequirements: { mana: 3 },
            failureConditions: ['BOARD_WIPED', 'POWER_STALLED_BY_BLOCKERS'],
            alternativeActions: ['CAST_REMOVAL_CLEAR_PATH', 'RELOAD_CARD_FLOW']
          }),
          new TurnPlan({
            turn: 4,
            description: 'Convert accumulated pressure into lethal damage via direct burn or alpha strike',
            requiredState: { opponentLifeRemaining: 10 },
            legalActions: ['CAST_DIRECT_BURN_FACE', 'ALPHA_STRIKE_COMBAT', 'ACTIVATE_REACH_ABILITY'],
            resourceRequirements: { mana: 4 },
            failureConditions: ['OPPONENT_LIFE_TOO_HIGH', 'OUT_OF_GAS'],
            alternativeActions: ['DEVELOP_RECURSIVE_THREAT', 'SUSTAINED_ATTRITION']
          })
        ],
        recoveryBranches: [
          new RecoveryBranch({
            trigger: 'WRATH_T3',
            branchPlan: 'BURN_REACH_PIVOT',
            description: 'If board wiped on T3, immediately bypass combat and pivot to direct face burn and hasty finishers',
            targetRoles: ['CHEAP_REMOVAL', 'BURN_REACH', 'CARD_FLOW'],
            priority: 100
          }),
          new RecoveryBranch({
            trigger: 'HEAVY_BLOCKERS',
            branchPlan: 'REMOVAL_AND_EVASION_PIVOT',
            description: 'If opponent drops high toughness blockers, use removal on key defenders or burn over the top',
            targetRoles: ['CHEAP_REMOVAL', 'EVASION_THREAT'],
            priority: 85
          }),
          new RecoveryBranch({
            trigger: 'OUT_OF_GAS',
            branchPlan: 'CARD_FLOW_RELOAD',
            description: 'If hand is depleted without lethal, trigger impulse draw or recursive engine',
            targetRoles: ['CARD_FLOW', 'RECURSIVE_THREAT'],
            priority: 90
          })
        ]
      });
    }

    if (isControl) {
      return new ExecutableWinPath({
        archetypeKey,
        expectedKillTurn: 8,
        turns: [
          new TurnPlan({
            turn: 1,
            description: 'Play tapped dual / fetch land and hold cheap cantrip or interaction',
            requiredState: { minUntappedLands: 1 },
            legalActions: ['PLAY_LAND', 'CAST_CANTRIP', 'HOLD_REMOVAL'],
            resourceRequirements: { mana: 1 },
            failureConditions: ['NO_LAND'],
            alternativeActions: ['PASS']
          }),
          new TurnPlan({
            turn: 2,
            description: 'Hold open instant-speed counterspell or spot removal',
            requiredState: { minUntappedLands: 2 },
            legalActions: ['PLAY_LAND', 'HOLD_COUNTERSPELL', 'HOLD_SPOT_REMOVAL'],
            resourceRequirements: { mana: 2 },
            failureConditions: ['COLOR_SCREW_T2'],
            alternativeActions: ['CAST_IMPULSE_DRAW']
          }),
          new TurnPlan({
            turn: 3,
            description: 'Maintain reactive shield or deploy value stabilization permanent',
            requiredState: { minUntappedLands: 3 },
            legalActions: ['PLAY_LAND', 'CAST_SPOT_REMOVAL', 'HOLD_DISRUPTION', 'CAST_VALUE_ENGINE'],
            resourceRequirements: { mana: 3 },
            failureConditions: ['OVERWHELMED_BY_FAST_AGGRO'],
            alternativeActions: ['DIG_FOR_SWEEPER']
          }),
          new TurnPlan({
            turn: 4,
            description: 'Stabilize the game via Board Sweeper or Planeswalker lock',
            requiredState: { minUntappedLands: 4 },
            legalActions: ['PLAY_LAND', 'CAST_BOARD_SWEEPER', 'CAST_PLANESWALKER_CONTROL'],
            resourceRequirements: { mana: 4 },
            failureConditions: ['FAILED_TO_RESOLVE_SWEEPER'],
            alternativeActions: ['DOUBLE_SPOT_REMOVAL']
          })
        ],
        recoveryBranches: [
          new RecoveryBranch({
            trigger: 'COUNTERED_SWEEPER',
            branchPlan: 'POINT_REMOVAL_ATTRITION',
            description: 'If mass sweeper fails, lean into 1-for-1 point removal and card advantage engine',
            targetRoles: ['CHEAP_REMOVAL', 'CARD_FLOW'],
            priority: 95
          })
        ]
      });
    }

    // Default Midrange / Adaptive WinPath
    return new ExecutableWinPath({
      archetypeKey,
      expectedKillTurn: 5,
      turns: [
        new TurnPlan({
          turn: 1,
          description: 'Establish mana foundation or point disruption (Thoughtseize / Dork / Cantrip)',
          requiredState: { minUntappedLands: 1 },
          legalActions: ['PLAY_LAND', 'CAST_1_DROP_DORK', 'CAST_DISRUPTION'],
          resourceRequirements: { mana: 1 },
          failureConditions: ['NO_LAND'],
          alternativeActions: ['PASS']
        }),
        new TurnPlan({
          turn: 2,
          description: 'Deploy high-value 2-drop engine or interaction',
          requiredState: { minUntappedLands: 2 },
          legalActions: ['PLAY_LAND', 'CAST_2_DROP_THREAT', 'CAST_REMOVAL'],
          resourceRequirements: { mana: 2 },
          failureConditions: ['MANA_SCREW_T2'],
          alternativeActions: ['RAMP_ACCELERATE']
        }),
        new TurnPlan({
          turn: 3,
          description: 'Deploy two-for-one value engine or premier midrange threat',
          requiredState: { minUntappedLands: 3 },
          legalActions: ['PLAY_LAND', 'CAST_3_DROP_ENGINE', 'CAST_THREAT_HOLD_REMOVAL'],
          resourceRequirements: { mana: 3 },
          failureConditions: ['EMPTY_HAND_OR_FLOOD'],
          alternativeActions: ['DIG_FOR_PAYOFF']
        }),
        new TurnPlan({
          turn: 4,
          description: 'Squeeze card advantage, control combat, and begin closing clock',
          requiredState: { minUntappedLands: 4 },
          legalActions: ['PLAY_LAND', 'CAST_MIDRANGE_FINISHER', 'ATTACK_COMBAT'],
          resourceRequirements: { mana: 4 },
          failureConditions: ['OUT_ATTRITED'],
          alternativeActions: ['BOARD_STABILIZATION']
        })
      ],
      recoveryBranches: [
        new RecoveryBranch({
          trigger: 'WRATH_T3',
          branchPlan: 'RECURSIVE_THREAT_REBUILD',
          description: 'If wiped, activate graveyard recursion or card advantage planeswalkers',
          targetRoles: ['CARD_FLOW', 'BOARD_PRESENCE'],
          priority: 90
        })
      ]
    });
  }

  /**
   * Evaluates if a game state satisfies the turn plan at the specified turn index.
   * @param {Object} gameState DeterministicGameState instance
   * @param {number} turnNumber Current turn
   * @returns {{ isSatisfied: boolean, failureCause: string|null, actionExecuted: string|null }}
   */
  evaluateTurnSatisfaction(gameState, turnNumber) {
    const plan = this.turns.find(t => t.turn === turnNumber);
    if (!plan) return { isSatisfied: true, failureCause: null, actionExecuted: 'LATE_GAME_FREE_PLAY' };

    const lands = (gameState.battlefield || []).filter(p => p.isLand).length;
    const creatures = (gameState.battlefield || []).filter(p => p.isCreature || (p.typeLine && p.typeLine.includes('creature'))).length;
    const hand = gameState.hand || [];

    if (lands < (plan.requiredState.minUntappedLands || 1)) {
      return { isSatisfied: false, failureCause: 'MANA_SCREW_UNDER_WINPATH', actionExecuted: null };
    }

    if (plan.requiredState.threatsInHand && creatures === 0 && !hand.some(c => (c.typeLine || '').includes('creature'))) {
      return { isSatisfied: false, failureCause: 'NO_THREAT_IN_HAND_OR_BOARD', actionExecuted: null };
    }

    return { isSatisfied: true, failureCause: null, actionExecuted: plan.legalActions[0] || 'STEP_SATISFIED' };
  }

  /**
   * Retrieves the active recovery contingency plan when an adversarial event occurs.
   * @param {string} trigger 
   * @returns {RecoveryBranch|null}
   */
  getRecoveryPlanForDisruption(trigger = 'WRATH_T3') {
    return this.recoveryBranches.find(r => r.trigger === trigger) || this.recoveryBranches[0] || null;
  }
}
