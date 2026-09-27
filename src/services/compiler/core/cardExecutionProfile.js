/**
 * src/services/compiler/core/cardExecutionProfile.js
 * 
 * CardExecutionProfile: Multi-Dimensional Modal IR & Trajectory Compatibility v29.10.
 * 
 * Formalizes card execution characteristics across primary and alternative execution modes
 * (adventure, cycling, channel, prototype, split, cost reduction), preventing flat CMC
 * heuristics and ungrounded scalar multiplication formulas.
 * 
 * Axioms:
 *   1. A card is not a flat CMC integer. It possesses an execution profile with primary
 *      and alternative functional modes.
 *   2. An alternative mode (e.g., Cycling 1, Adventure 2) only satisfies a turn requirement
 *      if its declared functional contribution directly matches the active turn demand.
 *   3. Trajectory compatibility is an uncompressed 5-dimensional vector:
 *      { castabilityProbability, relevanceTiming, modeUtility, dependencySatisfaction, stateDelta }
 *      evaluated lexicographically / Pareto-wise, never squashed into an arbitrary scalar product.
 */

import { computeDeterministicHash } from './certifiedDeckState.js';

export const EXECUTION_MODES = Object.freeze({
  PRIMARY_CAST: 'PRIMARY_CAST',
  ADVENTURE: 'ADVENTURE',
  CYCLING: 'CYCLING',
  CHANNEL: 'CHANNEL',
  PROTOTYPE: 'PROTOTYPE',
  EVOKE: 'EVOKE',
  SPLIT_HALF: 'SPLIT_HALF',
  COST_REDUCED: 'COST_REDUCED',
  FLASHBACK: 'FLASHBACK'
});

export const TIMING_WINDOWS = Object.freeze({
  EARLY_GAME: 'EARLY_GAME',     // Turns 1-2
  MID_GAME: 'MID_GAME',         // Turns 3-4
  LATE_GAME: 'LATE_GAME',       // Turns 5+
  RECOVERY_ONLY: 'RECOVERY_ONLY'
});

/**
 * Formal IR for card execution capabilities.
 */
export class CardExecutionProfile {
  /**
   * @param {Object} params
   * @param {string} params.cardName
   * @param {Object} params.primaryMode - { cmc, typeLine, timingWindow, functionalContribution }
   * @param {Array<Object>} [params.alternativeModes=[]] - [{ modeType, cost, timingWindow, functionalContribution }]
   * @param {Object|null} [params.costReduction=null] - { reductionType, potentialDiscount, triggerDependency }
   */
  constructor({
    cardName = 'UNKNOWN',
    primaryMode = { cmc: 3, typeLine: 'Creature', timingWindow: TIMING_WINDOWS.MID_GAME, functionalContribution: 'BOARD_PRESENCE' },
    alternativeModes = [],
    costReduction = null
  } = {}) {
    this.cardName = String(cardName);
    this.primaryMode = Object.freeze({
      cmc: Number(primaryMode.cmc ?? 3),
      typeLine: String(primaryMode.typeLine || 'Unknown'),
      timingWindow: primaryMode.timingWindow || (Number(primaryMode.cmc) <= 2 ? TIMING_WINDOWS.EARLY_GAME : (Number(primaryMode.cmc) <= 4 ? TIMING_WINDOWS.MID_GAME : TIMING_WINDOWS.LATE_GAME)),
      functionalContribution: String(primaryMode.functionalContribution || 'GENERAL')
    });
    this.alternativeModes = Object.freeze(alternativeModes.map(m => Object.freeze({
      modeType: m.modeType || EXECUTION_MODES.PRIMARY_CAST,
      cost: Number(m.cost ?? 1),
      timingWindow: m.timingWindow || (Number(m.cost) <= 2 ? TIMING_WINDOWS.EARLY_GAME : TIMING_WINDOWS.MID_GAME),
      functionalContribution: String(m.functionalContribution || 'UTILITY')
    })));
    this.costReduction = costReduction ? Object.freeze({ ...costReduction }) : null;
    this.profileHash = computeDeterministicHash({
      name: this.cardName,
      primary: this.primaryMode,
      alts: this.alternativeModes,
      red: this.costReduction
    });
    Object.freeze(this);
  }

  /**
   * Evaluates if this card has any executable mode that satisfies a specific turn demand.
   * 
   * @param {Object} params
   * @param {number} params.turnNumber
   * @param {number} params.availableMana
   * @param {string} params.demandedRole
   * @returns {Object|null} The best matching executable mode or null if incompatible
   */
  getExecutableModeForDemand({ turnNumber, availableMana, demandedRole }) {
    // 1. Check primary mode
    const primaryEffectiveCost = this._computeEffectiveCost(this.primaryMode.cmc, turnNumber);
    if (primaryEffectiveCost <= availableMana) {
      if (!demandedRole || this._matchesRole(this.primaryMode.functionalContribution, demandedRole)) {
        return {
          mode: EXECUTION_MODES.PRIMARY_CAST,
          cost: primaryEffectiveCost,
          contribution: this.primaryMode.functionalContribution,
          isAlternative: false
        };
      }
    }

    // 2. Check alternative modes
    for (const alt of this.alternativeModes) {
      if (alt.cost <= availableMana) {
        // Crucial Axiom: Alternative mode only satisfies if its functional contribution matches the demand!
        // E.g., Cycling 1 only matches if demandedRole is CANTRIP, CARD_VELOCITY, or MANA_FILTER.
        // It CANNOT satisfy EARLY_BOARD_PRESENCE or REMOVAL.
        if (!demandedRole || this._matchesRole(alt.functionalContribution, demandedRole)) {
          return {
            mode: alt.modeType,
            cost: alt.cost,
            contribution: alt.functionalContribution,
            isAlternative: true
          };
        }
      }
    }

    return null;
  }

  /**
   * Helper to compute effective cost considering cost reductions.
   */
  _computeEffectiveCost(baseCmc, turnNumber) {
    if (!this.costReduction) return baseCmc;
    // If cost reduction trigger applies (e.g., turn >= trigger turn or board count)
    const discount = Number(this.costReduction.potentialDiscount || 0);
    return Math.max(1, baseCmc - discount);
  }

  _matchesRole(contribution, demandedRole) {
    if (!demandedRole || demandedRole === 'ANY') return true;
    const c = contribution.toUpperCase();
    const d = demandedRole.toUpperCase();
    if (c === d) return true;
    if (d.includes('VELOCITY') && (c.includes('CANTRIP') || c.includes('DRAW') || c.includes('CYCLING'))) return true;
    if (d.includes('INTERACTION') && (c.includes('REMOVAL') || c.includes('DISRUPTION') || c.includes('COUNTER'))) return true;
    if (d.includes('BOARD') && (c.includes('CREATURE') || c.includes('THREAT') || c.includes('TOKEN'))) return true;
    return false;
  }

  /**
   * Factory method: constructs a CardExecutionProfile from standard card metadata/contract.
   */
  static fromCard(card) {
    if (!card) return new CardExecutionProfile();
    const cmc = Number(card.cmc ?? 3);
    const typeLine = String(card.type_line || card.type || '');
    const oracle = String(card.oracle_text || '').toLowerCase();

    const alts = [];

    // Cycling
    const cyclingMatch = oracle.match(/cycling\s*(?:\{(\d+|[wubrg])\})?/i);
    if (cyclingMatch) {
      alts.push({
        modeType: EXECUTION_MODES.CYCLING,
        cost: cyclingMatch[1] ? (parseInt(cyclingMatch[1], 10) || 1) : 2,
        timingWindow: TIMING_WINDOWS.EARLY_GAME,
        functionalContribution: 'CARD_VELOCITY'
      });
    }

    // Channel
    if (oracle.includes('channel —')) {
      alts.push({
        modeType: EXECUTION_MODES.CHANNEL,
        cost: 2,
        timingWindow: TIMING_WINDOWS.EARLY_GAME,
        functionalContribution: 'INSTANT_UTILITY'
      });
    }

    // Adventure
    if (typeLine.toLowerCase().includes('adventure') || card.adventure_text) {
      alts.push({
        modeType: EXECUTION_MODES.ADVENTURE,
        cost: 2,
        timingWindow: TIMING_WINDOWS.EARLY_GAME,
        functionalContribution: 'EARLY_INTERACTION'
      });
    }

    // Prototype
    if (oracle.includes('prototype')) {
      alts.push({
        modeType: EXECUTION_MODES.PROTOTYPE,
        cost: 2,
        timingWindow: TIMING_WINDOWS.EARLY_GAME,
        functionalContribution: 'EARLY_BOARD_PRESENCE'
      });
    }

    // Cost reduction (Delve, Affinity, Convoke)
    let costReduction = null;
    if (oracle.includes('delve')) {
      costReduction = { reductionType: 'DELVE', potentialDiscount: 3, triggerDependency: 'GRAVEYARD_THRESHOLD' };
    } else if (oracle.includes('affinity')) {
      costReduction = { reductionType: 'AFFINITY', potentialDiscount: 3, triggerDependency: 'ARTIFACT_COUNT' };
    } else if (oracle.includes('convoke')) {
      costReduction = { reductionType: 'CONVOKE', potentialDiscount: 2, triggerDependency: 'CREATURE_TAP' };
    }

    const functionalContribution = typeLine.toLowerCase().includes('creature') ? 'BOARD_PRESENCE' : 'SPELL_UTILITY';

    return new CardExecutionProfile({
      cardName: card.name || 'Unknown',
      primaryMode: {
        cmc,
        typeLine,
        timingWindow: cmc <= 2 ? TIMING_WINDOWS.EARLY_GAME : (cmc <= 4 ? TIMING_WINDOWS.MID_GAME : TIMING_WINDOWS.LATE_GAME),
        functionalContribution
      },
      alternativeModes: alts,
      costReduction
    });
  }
}

/**
 * Multi-dimensional Trajectory Compatibility Vector.
 * Replaces flat scalar formulas (P_cast * P_relevant * Delta).
 */
export class TrajectoryCompatibilityVector {
  /**
   * @param {Object} params
   * @param {number} params.castabilityProbability - [0.0, 1.0]
   * @param {number} params.relevanceTiming - [0.0, 1.0] Alignment with gameplan turn demands
   * @param {number} params.modeUtility - [0.0, 1.0] Utility of active mode in current state
   * @param {number} params.dependencySatisfaction - [0.0, 1.0] Fraction of required precursors present
   * @param {number} params.stateDelta - Expected empirical value change in state (win prob, clock delta)
   */
  constructor({
    castabilityProbability = 0.5,
    relevanceTiming = 0.5,
    modeUtility = 0.5,
    dependencySatisfaction = 1.0,
    stateDelta = 0.0
  } = {}) {
    this.castabilityProbability = Number(castabilityProbability || 0);
    this.relevanceTiming = Number(relevanceTiming || 0);
    this.modeUtility = Number(modeUtility || 0);
    this.dependencySatisfaction = Number(dependencySatisfaction || 0);
    this.stateDelta = Number(stateDelta || 0);
    Object.freeze(this);
  }

  /**
   * Vector dominance comparison (Pareto check).
   * Vector A dominates Vector B if A is at least as good in all dimensions and strictly better in at least one.
   */
  dominates(other) {
    if (!other) return true;
    let strictlyBetter = false;

    if (this.castabilityProbability < other.castabilityProbability) return false;
    if (this.castabilityProbability > other.castabilityProbability) strictlyBetter = true;

    if (this.relevanceTiming < other.relevanceTiming) return false;
    if (this.relevanceTiming > other.relevanceTiming) strictlyBetter = true;

    if (this.modeUtility < other.modeUtility) return false;
    if (this.modeUtility > other.modeUtility) strictlyBetter = true;

    if (this.dependencySatisfaction < other.dependencySatisfaction) return false;
    if (this.dependencySatisfaction > other.dependencySatisfaction) strictlyBetter = true;

    if (this.stateDelta < other.stateDelta) return false;
    if (this.stateDelta > other.stateDelta) strictlyBetter = true;

    return strictlyBetter;
  }
}
