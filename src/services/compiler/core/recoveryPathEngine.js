/**
 * src/services/compiler/core/recoveryPathEngine.js
 * 
 * Recovery Path Engine & Multi-Vector Resilience Analyzer v28.1.
 * 
 * Maps Primary WinPath (Plan A), Alternate Vectors (Plan B), and Recovery Engines (Plan C).
 * Measures the mathematical probability of recovering from devastating board wipe or removal.
 */

import { CardCausalContract } from './cardCausalContract.js';

export class RecoveryPathEngine {
  /**
   * Evaluates the multi-path recovery potential of a deck.
   * 
   * @param {Array<Object>|Object} deckInput 
   * @param {Object} options 
   * @returns {Object} Structured Recovery Analysis Report
   */
  static evaluateRecoveryPaths(deckInput, options = {}) {
    const rawCards = Array.isArray(deckInput) ? deckInput : (deckInput?.cards || []);
    
    let primaryCombatThreats = 0;
    let directBurnReach = 0;
    let cardFlowEngines = 0;
    let recursionAndGraveyard = 0;
    let totalSpells = 0;

    for (const entry of rawCards) {
      const card = entry.card || entry;
      const count = Number(entry.quantity || entry.count || 1);
      const contract = CardCausalContract.parse(card);
      const oracle = (card.oracle_text || card.oracleText || '').toLowerCase();
      const type = (card.type_line || card.type || '').toLowerCase();

      if (!type.includes('land')) {
        totalSpells += count;
      }

      if (type.includes('creature')) {
        primaryCombatThreats += count;
      }

      if (contract.interactionProof.effectScope === 'DAMAGE_REMOVAL' && contract.interactionProof.targetScope === 'ANY_TARGET') {
        directBurnReach += count;
      }

      if (contract.resourceAccessChains.hasResourceFlow || oracle.includes('draw') || oracle.includes('exile the top') || oracle.includes('you may play it')) {
        cardFlowEngines += count;
      }

      if (oracle.includes('return') && (oracle.includes('from your graveyard') || oracle.includes('from a graveyard')) || oracle.includes('reanimate')) {
        recursionAndGraveyard += count;
      }
    }

    const baselineSpells = Math.max(1, totalSpells);
    const primaryRate = Math.min(1.0, (primaryCombatThreats / (baselineSpells * 0.5)));
    const alternateRate = Math.min(1.0, (directBurnReach / (baselineSpells * 0.25)));
    const recoveryEngineRate = Math.min(1.0, ((cardFlowEngines * 1.5 + recursionAndGraveyard * 2.0) / (baselineSpells * 0.25)));

    const singlePointOfFailure = primaryCombatThreats > 10 && directBurnReach === 0 && cardFlowEngines === 0;

    // Resilience index calculation: balanced between primary strength and secondary recovery engines
    const resilienceScore = Math.round(
      (primaryRate * 35) +
      (alternateRate * 35) +
      (recoveryEngineRate * 30)
    );

    return Object.freeze({
      primaryPathProbability: Number(primaryRate.toFixed(4)),
      alternatePathProbability: Number(alternateRate.toFixed(4)),
      recoveryProbability: Number(recoveryEngineRate.toFixed(4)),
      singlePointOfFailure,
      resilienceIndex: Math.min(100, Math.max(10, resilienceScore)),
      summary: {
        primaryPlanA: 'COMBAT_SWARM_AGGRESSION',
        alternatePlanB: directBurnReach >= 4 ? 'DIRECT_BURN_REACH' : 'NONE',
        recoveryPlanC: cardFlowEngines >= 4 ? 'RECURSIVE_CARD_FLOW' : 'LOW_RESILIENCE'
      }
    });
  }
}
