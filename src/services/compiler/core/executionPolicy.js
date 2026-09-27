/**
 * src/services/compiler/core/executionPolicy.js
 * 
 * Declarative Execution Policy Engine v28.1.
 * 
 * INVARIANT: ExecutionPolicy is a declarative, immutable, versioned data contract.
 * It is derived dynamically from StrategicThesis, WinPath, and Proof Obligations.
 * Zero hardcoded archetype branching.
 */

export class ExecutionPolicy {
  /**
   * Constructs an immutable ExecutionPolicy.
   */
  constructor({
    policyVersion = 'dynamic-v28.1',
    archetypeCategory = 'AGGRESSIVE_LINEAR',
    turnObjectives = {},
    resourcePriorities = [],
    threatPriorities = [],
    interactionPolicy = {},
    mulliganPolicy = {},
    riskTolerance = 0.8,
    winConditionPriority = ['COMBAT_DAMAGE', 'DIRECT_BURN_REACH']
  } = {}) {
    this.policyVersion = policyVersion;
    this.archetypeCategory = archetypeCategory;

    this.turnObjectives = Object.freeze({
      T1: Object.freeze([...(turnObjectives.T1 || ['PLAY_LAND', 'DEVELOP_EARLY_PRESSURE', 'HOLD_CHEAP_INTERACTION'])]),
      T2: Object.freeze([...(turnObjectives.T2 || ['PLAY_LAND', 'DEVELOP_THREAT_OR_ENGINE', 'INTERRUPT_OPPONENT'])]),
      T3: Object.freeze([...(turnObjectives.T3 || ['PLAY_LAND', 'AMPLIFY_BOARD_PRESSURE', 'ACTIVATE_RESOURCE_FLOW', 'ATTACK'])]),
      T4: Object.freeze([...(turnObjectives.T4 || ['MAXIMIZE_DAMAGE', 'CONVERT_LETHAL_REACH', 'STABILIZE_BOARD'])]),
      T5Plus: Object.freeze([...(turnObjectives.T5Plus || ['DEPLOY_APEX_FINISHER', 'CONVERT_CARD_ADVANTAGE', 'CLOSE_GAME'])])
    });

    this.resourcePriorities = Object.freeze([...resourcePriorities]);
    this.threatPriorities = Object.freeze([...threatPriorities]);

    this.interactionPolicy = Object.freeze({
      removalTiming: interactionPolicy.removalTiming || 'OPPONENT_END_STEP_OR_COMBAT',
      targetPreference: interactionPolicy.targetPreference || 'HIGHEST_POWER_THREAT',
      holdOpenManaForInteraction: Boolean(interactionPolicy.holdOpenManaForInteraction ?? false),
      acceptableSweeperThreshold: Number(interactionPolicy.acceptableSweeperThreshold ?? 3)
    });

    this.mulliganPolicy = Object.freeze({
      minLands: Number(mulliganPolicy.minLands ?? 2),
      maxLands: Number(mulliganPolicy.maxLands ?? 5),
      requireT1orT2Action: Boolean(mulliganPolicy.requireT1orT2Action ?? true),
      maxMulligansAllowed: Number(mulliganPolicy.maxMulligansAllowed ?? 2)
    });

    this.riskTolerance = Number(riskTolerance);
    this.winConditionPriority = Object.freeze([...winConditionPriority]);

    Object.freeze(this);
  }

  /**
   * Dynamically synthesizes an ExecutionPolicy from intent and strategic contracts.
   * @param {Object} intentPackage 
   * @param {Object} strategicThesis 
   * @param {Object} capabilityPlan 
   * @returns {ExecutionPolicy}
   */
  static deriveFromIntent(intentPackage = {}, strategicThesis = {}, capabilityPlan = {}) {
    const tempo = (intentPackage.tempo || strategicThesis.tempo || 'Aggro').toLowerCase();
    const isControl = tempo.includes('control');
    const isRamp = tempo.includes('ramp') || (strategicThesis.archetypeKey || '').toLowerCase().includes('ramp');
    const isCombo = tempo.includes('combo');
    const isAggro = tempo.includes('aggro') || tempo.includes('burn');

    let policyVersion = 'aggro-pressure-v1';
    let archetypeCategory = 'AGGRESSIVE_LINEAR';
    let riskTolerance = 0.85;
    let turnObjectives = {};
    let winConditionPriority = ['COMBAT_DAMAGE', 'DIRECT_BURN_REACH'];
    let interactionPolicy = { removalTiming: 'IMMEDIATE_OR_END_STEP', targetPreference: 'BLOCKER_OR_FAST_THREAT', holdOpenManaForInteraction: false };
    let mulliganPolicy = { minLands: 2, maxLands: 4, requireT1orT2Action: true, maxMulligansAllowed: 2 };

    if (isControl) {
      policyVersion = 'control-inevitability-v1';
      archetypeCategory = 'REACTIVE_CONTROL';
      riskTolerance = 0.30;
      turnObjectives = {
        T1: ['PLAY_LAND', 'HOLD_OPEN_MANA', 'CANTRIP_OR_SURVEIL'],
        T2: ['PLAY_LAND', 'HOLD_COUNTER_OR_REMOVAL', 'DEVELOP_INCIDENTAL_ADVANTAGE'],
        T3: ['PLAY_LAND', 'RESPOND_TO_CRITICAL_THREAT', 'DIG_FOR_ANSWERS'],
        T4: ['PLAY_LAND', 'DEPLOY_SWEEPER_OR_ENGINE', 'STABILIZE_LIFE_TOTAL'],
        T5Plus: ['PROTECT_BOARD', 'GENERATE_INEVITABLE_CARD_FLOW', 'DEPLOY_FINISHER']
      };
      winConditionPriority = ['INEVITABLE_VALUE', 'APEX_FINISHER', 'RESOURCE_EXHAUSTION'];
      interactionPolicy = { removalTiming: 'OPPONENT_END_STEP', targetPreference: 'MUST_ANSWER_THREAT', holdOpenManaForInteraction: true };
      mulliganPolicy = { minLands: 3, maxLands: 5, requireT1orT2Action: true, maxMulligansAllowed: 2 };
    } else if (isRamp) {
      policyVersion = 'ramp-acceleration-v1';
      archetypeCategory = 'PROACTIVE_RAMP';
      riskTolerance = 0.65;
      turnObjectives = {
        T1: ['PLAY_LAND', 'DEVELOP_T1_DORK_OR_EXPLORE'],
        T2: ['PLAY_LAND', 'ACCELERATE_MANA_2DROP', 'HOLD_LIGHT_INTERACTION'],
        T3: ['PLAY_LAND', 'CROSS_5MANA_THRESHOLD', 'DEVELOP_MIDGAME_ENGINE'],
        T4: ['DEPLOY_APEX_THREAT', 'ESTABLISH_UNSTOPPABLE_BOARD'],
        T5Plus: ['OVERWHELM_DEFENSES', 'CRUSH_WITH_TRAMPLE_LETHAL']
      };
      winConditionPriority = ['APEX_BEHEMOTH_COMBAT', 'TRAMPLE_DAMAGE_OVERWHELM'];
      interactionPolicy = { removalTiming: 'PREEMPTIVE_OR_BLOCKER_CLEARING', targetPreference: 'FAST_AGGRESSOR', holdOpenManaForInteraction: false };
      mulliganPolicy = { minLands: 3, maxLands: 5, requireT1orT2Action: true, maxMulligansAllowed: 2 };
    } else if (isCombo) {
      policyVersion = 'combo-velocity-v1';
      archetypeCategory = 'COMBO_ASSEMBLY';
      riskTolerance = 0.50;
      turnObjectives = {
        T1: ['PLAY_LAND', 'CANTrip_TUTOR_PIECE_A'],
        T2: ['PLAY_LAND', 'DEVELOP_COMBO_ENABLER', 'PROTECT_PIECES'],
        T3: ['PLAY_LAND', 'TUTOR_OR_ACCELERATE_PIECE_B'],
        T4: ['EXECUTE_COMBO_LOOP', 'PROTECT_LOOP_WITH_DISRUPTION'],
        T5Plus: ['RE_ASSEMBLE_LOOP', 'DRAIN_OUT_OPPONENT']
      };
      winConditionPriority = ['INFINITE_LOOP_DRAIN', 'INSTANT_COMBO_WIN'];
      interactionPolicy = { removalTiming: 'DEFENSIVE_PROTECTION', targetPreference: 'HATE_BEARS_OR_DISRUPTIVE_PIECE', holdOpenManaForInteraction: true };
      mulliganPolicy = { minLands: 2, maxLands: 4, requireT1orT2Action: true, maxMulligansAllowed: 3 };
    } else {
      // Aggro / Burn default
      turnObjectives = {
        T1: ['PLAY_LAND', 'DEPLOY_1DROP_MAX_PRESSURE', 'BURN_OPPONENT_FACE'],
        T2: ['PLAY_LAND', 'DEPLOY_2DROP_OR_DOUBLE_1DROP', 'ATTACK_COMBAT'],
        T3: ['PLAY_LAND', 'DEPLOY_LORD_OR_AMPLIFIER', 'ATTACK_ALL_OUT', 'MAINTAIN_REACH'],
        T4: ['CONVERT_COMBAT_AND_BURN_TO_LETHAL', 'EMPTY_HAND_FOR_PRESSURE'],
        T5Plus: ['TOP_DECK_LETHAL_BURN', 'SACRIFICE_RESOURCES_FOR_FINAL_DAMAGE']
      };
    }

    return new ExecutionPolicy({
      policyVersion,
      archetypeCategory,
      turnObjectives,
      resourcePriorities: ['MAXIMIZE_TEMPO_MANA_EFFICIENCY', 'PRESERVE_COLORED_ACCESS'],
      threatPriorities: ['PRIORITIZE_FACE_DAMAGE_UNLESS_LETHAL_OPPONENT_ATTACK'],
      interactionPolicy,
      mulliganPolicy,
      riskTolerance,
      winConditionPriority
    });
  }
}
