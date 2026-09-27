/**
 * src/services/compiler/core/causalPathClassifier.js
 * 
 * V29.5 Phase C: CausalPathClassifier.
 * Universal Multi-Path Semantic & Operational Classifier for MTG Cards.
 * 
 * Invariants:
 *   1. Cards may possess multiple simultaneous typed causal paths.
 *   2. Physical card count is strictly invariant (1 card = 1 physical slot, never multiplied).
 *   3. Supported path types:
 *      - DIRECT_CAUSAL_PATH
 *      - INDIRECT_CAUSAL_PATH
 *      - INFRASTRUCTURE_PATH
 *      - RECOVERY_PATH
 *      - INTERACTION_PATH
 *      - ORPHAN_PARASITE (Inadmissible)
 */

import { CardCausalContract } from './cardCausalContract.js';

export const CAUSAL_PATH_TYPES = Object.freeze({
  DIRECT_CAUSAL_PATH: 'DIRECT_CAUSAL_PATH',
  INDIRECT_CAUSAL_PATH: 'INDIRECT_CAUSAL_PATH',
  INFRASTRUCTURE_PATH: 'INFRASTRUCTURE_PATH',
  RECOVERY_PATH: 'RECOVERY_PATH',
  INTERACTION_PATH: 'INTERACTION_PATH',
  ORPHAN_PARASITE: 'ORPHAN_PARASITE'
});

export class CausalPathClassifier {
  /**
   * Classifies a card relative to a GameplanContract into all valid causal paths.
   * 
   * @param {Object} card 
   * @param {import('./gameplanContract.js').GameplanContract} gameplan 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage 
   * @returns {{ admissible: boolean, causalPaths: Array<{ type: string, capability: string, targetRequirement: string, proof: string, confidence: number }>, primaryPath: string }}
   */
  static classify(card, gameplan, intentPackage) {
    if (!card) {
      return {
        admissible: false,
        causalPaths: [{ type: CAUSAL_PATH_TYPES.ORPHAN_PARASITE, capability: 'NONE', targetRequirement: 'NONE', proof: 'Null card object', confidence: 0 }],
        primaryPath: CAUSAL_PATH_TYPES.ORPHAN_PARASITE
      };
    }

    const contract = card.causalContract || CardCausalContract.parse(card);
    const supplies = contract.supplies || [];
    const typeLine = (card.type_line || card.typeLine || '').toLowerCase();
    const oracleText = (card.oracle_text || card.oracleText || '').toLowerCase();
    const cmc = Number(card.cmc || card.mana_value || 0);

    const winCondition = gameplan?.winCondition || 'COMBAT_DAMAGE';
    const requiredCapabilities = new Set(gameplan?.requiredCapabilities || []);
    const paths = [];

    // 1. INFRASTRUCTURE_PATH: Mana ramp, fixing, land manipulation, cheap velocity cantrips
    const isManaDork = cmc <= 2 && typeLine.includes('creature') && (oracleText.includes('{t}: add') || oracleText.includes('add one mana'));
    const isRampSpell = (oracleText.includes('search your library for a') && oracleText.includes('land')) || (oracleText.includes('additional land') || oracleText.includes('onto the battlefield'));
    const isVelocityCantrip = cmc <= 1 && (typeLine.includes('instant') || typeLine.includes('sorcery')) && oracleText.includes('draw a card');

    if (isManaDork || isRampSpell || isVelocityCantrip || supplies.includes('MANA_RAMP') || supplies.includes('MANA_FIXING') || supplies.includes('CARD_VELOCITY')) {
      paths.push({
        type: CAUSAL_PATH_TYPES.INFRASTRUCTURE_PATH,
        capability: isManaDork ? 'MANA_DORK' : (isRampSpell ? 'RAMP_ENGINE' : 'CARD_VELOCITY'),
        targetRequirement: 'INFRASTRUCTURE_STABILIZATION',
        proof: `Provides essential mana/card velocity: CMC ${cmc}`,
        confidence: 0.95
      });
    }

    // 2. INTERACTION_PATH: Removal, counterspells, discard, bounce
    const isRemoval = oracleText.includes('destroy') || oracleText.includes('exile') || (oracleText.includes('deals') && (oracleText.includes('target creature') || oracleText.includes('any target')));
    const isCounter = oracleText.includes('counter target');
    const isDiscard = oracleText.includes('target player reveals') || oracleText.includes('target opponent discards') || oracleText.includes('discards a card');

    if (isRemoval || isCounter || isDiscard || supplies.includes('CHEAP_REMOVAL') || supplies.includes('HARD_COUNTER') || supplies.includes('TARGETED_DISCARD')) {
      paths.push({
        type: CAUSAL_PATH_TYPES.INTERACTION_PATH,
        capability: isRemoval ? 'REMOVAL' : (isCounter ? 'COUNTER' : 'DISCARD'),
        targetRequirement: 'INTERACTION_CONTROL',
        proof: `Interactive disruption: ${isRemoval ? 'Removal' : (isCounter ? 'Counterspell' : 'Discard')}`,
        confidence: 0.90
      });
    }

    // 3. RECOVERY_PATH: Graveyard recursion, flash back, rebuild engines
    const isRecursion = oracleText.includes('return target') && oracleText.includes('from your graveyard') || oracleText.includes('escape') || oracleText.includes('flashback');
    const isDeathPayoff = oracleText.includes('whenever') && (oracleText.includes('dies') || oracleText.includes('sacrificed'));

    if (isRecursion || isDeathPayoff || supplies.includes('GRAVEYARD_RECURSION') || supplies.includes('RECOVERY')) {
      paths.push({
        type: CAUSAL_PATH_TYPES.RECOVERY_PATH,
        capability: isRecursion ? 'RECURSION' : 'DEATH_TRIGGER_VALUE',
        targetRequirement: 'SWEEPER_AND_ATTRITION_RECOVERY',
        proof: `Recovers board or resources after removal/deaths`,
        confidence: 0.85
      });
    }

    // 4. DIRECT_CAUSAL_PATH: Direct execution of WinCondition
    // Burn lethal
    const dealsDirectPlayerDamage = oracleText.includes('deals') && (oracleText.includes('any target') || oracleText.includes('target player') || oracleText.includes('each opponent'));
    if (dealsDirectPlayerDamage && (winCondition.includes('BURN') || requiredCapabilities.has('PLAYER_REACH'))) {
      paths.push({
        type: CAUSAL_PATH_TYPES.DIRECT_CAUSAL_PATH,
        capability: 'PLAYER_REACH',
        targetRequirement: 'LETHAL_DIRECT_DAMAGE',
        proof: `Direct burn spell executing kill turn reach`,
        confidence: 0.95
      });
    }

    // Combat Damage threats matching turn requirements
    const isThreat = typeLine.includes('creature') && (Number(card.power || 0) > 0 || oracleText.includes('gets +') || oracleText.includes('haste'));
    if (isThreat && (winCondition.includes('COMBAT') || winCondition.includes('LETHAL') || !winCondition.includes('NON_COMBAT'))) {
      const primaryTribe = intentPackage?.primaryTribe;
      const isMatchingTribe = primaryTribe && primaryTribe !== 'None'
        ? typeLine.includes(primaryTribe.toLowerCase())
        : true;

      if (isMatchingTribe || intentPackage?.allowOffTribe === true) {
        paths.push({
          type: CAUSAL_PATH_TYPES.DIRECT_CAUSAL_PATH,
          capability: cmc <= 1 ? 'T1_BODY' : (cmc <= 2 ? 'T2_CURVE_PRESSURE' : 'MID_CURVE_THREAT'),
          targetRequirement: 'COMBAT_PRESSURE_WINPATH',
          proof: `Attack threat advancing board pressure: CMC ${cmc}`,
          confidence: 0.90
        });
      }
    }

    // 5. INDIRECT_CAUSAL_PATH: Tribal lords, token generators, synergy amplifiers
    const isLordOrAmplifier = oracleText.includes('other creatures you control get') || oracleText.includes('other goblins get') || oracleText.includes('other werewolves get') || oracleText.includes('create') && oracleText.includes('token');
    if (isLordOrAmplifier || supplies.includes('TRIBAL_LORD') || supplies.includes('TOKEN_PRODUCTION')) {
      paths.push({
        type: CAUSAL_PATH_TYPES.INDIRECT_CAUSAL_PATH,
        capability: 'SYNERGY_AMPLIFIER',
        targetRequirement: 'BOARD_SCALE_AMPLIFICATION',
        proof: `Amplifies existing board threats and tokens`,
        confidence: 0.90
      });
    }

    // If no valid path was found, it is an ORPHAN_PARASITE
    if (paths.length === 0) {
      paths.push({
        type: CAUSAL_PATH_TYPES.ORPHAN_PARASITE,
        capability: 'NONE',
        targetRequirement: 'NONE',
        proof: `Card does not provide any causal path demanded by current gameplan`,
        confidence: 0.0
      });
    }

    const admissible = paths.some(p => p.type !== CAUSAL_PATH_TYPES.ORPHAN_PARASITE);
    const primaryPath = paths[0]?.type || CAUSAL_PATH_TYPES.ORPHAN_PARASITE;

    return {
      admissible,
      causalPaths: Object.freeze(paths),
      primaryPath
    };
  }
}
