/**
 * src/services/compiler/core/gameplanIntegrityGate.js
 * 
 * GameplanIntegrityGate: V29.1 Causal Admissibility Firewall.
 * 
 * Ensures that EVERY card admitted into competition has a verifiable causal path
 * toward fulfilling the GameplanContract.
 * 
 * A card is causally admissible if and only if:
 *   1. Direct Gameplan Contribution: supplies capabilities required by the active turn functional demands.
 *   2. Recovery / Resilience: supplies capabilities that resolve failure modes (e.g. board wipe protection, recursion, resilient threats).
 *   3. Mana / Flow Transition: provides critical resource acceleration or card flow necessary for reaching the WinPath.
 * 
 * Parasite cards (cards that have zero causal paths to the active gameplan, e.g. off-plan graveyard hate
 * that creates off-tribe tokens in an aggressive deck) are rejected with full causal diagnostics in the reason ledger.
 * 
 * Axioms:
 *   1. ZERO hardcoded card names or blacklists.
 *   2. Admissibility is strictly based on causal graph reachability to the GameplanContract.
 *   3. Non-tribal and tribal archetypes are evaluated identically under the universal capability ontology.
 *   4. Deterministic and fully traceable.
 */

import { IdentityFirewall } from './identityFirewall.js';
import { extractCanonicalCmc } from './canonicalCardNormalizer.js';
import { CardExecutionProfile, TrajectoryCompatibilityVector } from './cardExecutionProfile.js';

export class GameplanIntegrityGate {
  /**
   * Convenience evaluator for raw or contract card objects.
   */
  static evaluateCardAdmissibility(card, gameplanContract, intentPackage = {}) {
    const res = this.evaluateAdmissibility({ cardContract: card, gameplanContract, intentPackage });
    return {
      admissible: res.isAdmissible,
      isAdmissible: res.isAdmissible,
      rejectionReason: res.rejectionReason,
      score: res.score,
      matchedPaths: res.matchedPaths,
      causalPathType: res.causalPathType
    };
  }

  /**
   * Evaluates if a card is causally admissible given the active GameplanContract.
   * 
   * @param {Object} params
   * @param {Object} params.cardContract - Pre-parsed CardCausalContract or card object
   * @param {import('./gameplanSynthesizer.js').GameplanContract} params.gameplanContract
   * @param {import('./intentPackage.js').IntentPackage} params.intentPackage
   * @returns {Object} { isAdmissible: boolean, admissible: boolean, score: number, matchedPaths: Array<string>, rejectionReason: string|null }
   */
  static evaluateAdmissibility({ cardContract, gameplanContract, intentPackage = {} }) {
    if (!gameplanContract || !cardContract) {
      return { isAdmissible: true, admissible: true, score: 0.5, matchedPaths: ['DEFAULT_OPEN'], rejectionReason: null };
    }

    const cardObj = cardContract.cardIdentity || cardContract.cardObj || cardContract;
    const cardCaps = new Set((cardContract.supplies || []).map(s => s.capability));
    const oracle = (cardObj.oracleText || cardObj.oracle_text || cardObj.text || '').toLowerCase();
    const typeLine = (cardObj.typeLine || cardObj.type_line || cardObj.type || '').toLowerCase();
    const power = Number(cardObj.power || 0);
    const cmc = extractCanonicalCmc(cardObj);
    const cardName = cardObj.name || 'Unknown';
    const derivedKillTurn = Number(gameplanContract.derivedKillTurn || 5);
    const hasRamp = (gameplanContract.turnRequirements || []).some(tr => 
      (tr.functionalDemands || []).some(fd => fd.functionName.includes('RAMP') || fd.functionName.includes('MANA_ACCELERATION'))
    ) || (gameplanContract.winCondition?.type || '').toUpperCase().includes('RAMP')
      || (gameplanContract.requiredEngines || []).some(e => (e.engineId || '').toUpperCase().includes('RAMP') || (e.engineId || '').toUpperCase().includes('ACCELERATION'));

    // 0. Identity Constraints & Forbidden Strategic Axes Hard Gate (v29.4)
    const idConstraints = gameplanContract.identityConstraints || {};
    const primaryIdentity = (idConstraints.primaryIdentity || intentPackage.primaryTribe || '').toLowerCase().trim();
    const allowedUtilityExceptions = new Set(idConstraints.allowedUtilityExceptions || ['MANA_ACCELERATION', 'CHEAP_REMOVAL', 'CARD_FLOW', 'COUNTER_DISRUPTION', 'BOARD_SWEEPER']);
    const forbiddenAxes = idConstraints.forbiddenStrategicAxes || [];

    // Check Forbidden Axes
    for (const f of forbiddenAxes) {
      if (cardCaps.has(f)) {
        return {
          isAdmissible: false,
          score: 0,
          matchedPaths: [],
          rejectionReason: `FORBIDDEN_AXIS_EXCLUSION: Card "${cardName}" supplies forbidden strategic axis [${f}]`
        };
      }
    }

    // Check Tribal Identity Exclusion for Creatures & Non-Creatures
    const isCreature = typeLine.includes('creature');
    let isOnIdentity = true;
    let isApprovedUtility = false;

    if (primaryIdentity && primaryIdentity !== 'none') {
      const allowOffTribe = intentPackage ? intentPackage.allowOffTribe === true : (gameplanContract.identityConstraints?.identityPolicy?.creatureMembershipMode === 'ALLOW_APPROVED_EXTERNAL_ENGINE');

      if (isCreature) {
        const isMember = IdentityFirewall.isMatchingTribe(cardContract.cardIdentity || cardContract, primaryIdentity);
        
        if (isMember) {
          isOnIdentity = true;
        } else {
          isOnIdentity = false;
          // V29.5 Master Invariant: If allowOffTribe is false, off-identity creatures are STRICTLY forbidden
          if (!allowOffTribe) {
            return {
              isAdmissible: false,
              score: 0,
              causalPathType: 'ORPHAN_PARASITE',
              matchedPaths: [],
              rejectionReason: `GAMEPLAN_IDENTITY_EXCLUSION: Creature "${cardName}" (${typeLine}) is off-identity for primary tribe "${primaryIdentity}" and allowOffTribe is false.`
            };
          }

          // If allowOffTribe is true, check if card qualifies under allowed utility or engine exceptions
          isApprovedUtility = (cardContract.supplies || []).some(s => allowedUtilityExceptions.has(s.capability));
          if (!isApprovedUtility) {
            return {
              isAdmissible: false,
              score: 0,
              causalPathType: 'ORPHAN_PARASITE',
              matchedPaths: [],
              rejectionReason: `GAMEPLAN_IDENTITY_EXCLUSION: Off-tribe creature "${cardName}" provides no approved utility or engine capability [${Array.from(allowedUtilityExceptions).join(', ')}]`
            };
          }
        }
      } else {
        // Non-creature spells: If the spell mentions or is named after an alien tribe, it must match primaryIdentity
        const alienTribeMatches = /goblin|elf|elves|zombie|merfolk|vampire|sliver|knight|soldier|dragon|dinosaur/i.test(cardName) || /goblin|elf|elves|zombie|merfolk|vampire|sliver|knight|soldier|dragon|dinosaur/i.test(oracle);
        const isOnTribeSpell = cardName.toLowerCase().includes(primaryIdentity) || oracle.includes(primaryIdentity);
        if (alienTribeMatches && !isOnTribeSpell) {
          return {
            isAdmissible: false,
            score: 0,
            causalPathType: 'ORPHAN_PARASITE',
            matchedPaths: [],
            rejectionReason: `GAMEPLAN_IDENTITY_EXCLUSION: Spell "${cardName}" is an alien tribal spell for primary tribe "${primaryIdentity}".`
          };
        }

        // In strict tribal decks, off-tribe non-creature spells MUST be approved utility exceptions or burn reach
        if (!allowOffTribe && !isOnTribeSpell) {
          const isUtilityException = (cardContract.supplies || []).some(s => allowedUtilityExceptions.has(s.capability)) ||
            cardCaps.has('CHEAP_REMOVAL') || cardCaps.has('CARD_FLOW') || cardCaps.has('PLAYER_REACH') ||
            (cmc <= 3 && (oracle.includes('counter target') || /deals\s+(\d+|x)\s+damage/i.test(oracle)));

          if (!isUtilityException) {
            return {
              isAdmissible: false,
              score: 0,
              causalPathType: 'ORPHAN_PARASITE',
              matchedPaths: [],
              rejectionReason: `GAMEPLAN_IDENTITY_EXCLUSION: Off-tribe spell "${cardName}" provides no approved utility exception [${Array.from(allowedUtilityExceptions).join(', ')}].`
            };
          }
        }
      }
    }

    // Trajectory Timing & Modal Playability Invariant (v29.10):
    // In plans without ramp acceleration, cards whose primary CMC exceeds the derived kill turn
    // must possess a viable alternative execution mode (cycling, adventure, prototype, cost reduction)
    // that directly fulfills an active demand within the permissible window.
    const executionProfile = CardExecutionProfile.fromCard(cardContract);
    if (!hasRamp && cmc > derivedKillTurn) {
      const hasPlayableMode = executionProfile.alternativeModes.some(m => m.cost <= derivedKillTurn) ||
        (executionProfile.costReduction && (cmc - (executionProfile.costReduction.potentialDiscount || 0)) <= derivedKillTurn);

      if (!hasPlayableMode) {
        return {
          isAdmissible: false,
          score: 0,
          causalPathType: 'TIMING_ENVELOPE_EXCLUSION',
          matchedPaths: [],
          rejectionReason: `TRAJECTORY_CURVE_CEILING_EXCEEDED: Card "${cardName}" (CMC ${cmc}) exceeds derived kill turn T${derivedKillTurn} without ramp acceleration or early modal mode.`
        };
      }
    }

    const matchedPaths = [];
    let causalScore = 0;

    // 1. Direct Turn Functional Demand Matching
    const turnRequirements = gameplanContract.turnRequirements || [];
    for (const turnReq of turnRequirements) {
      for (const demand of turnReq.functionalDemands || []) {
        const constraints = demand.constraints || {};

        // CMC match
        if (constraints.cmc?.max != null && cmc > constraints.cmc.max) continue;
        if (constraints.cmc?.min != null && cmc < constraints.cmc.min) continue;

        // Type match
        if (constraints.type && !typeLine.includes(constraints.type)) continue;

        // Identity constraint on turn demand: off-identity non-utility cannot satisfy body demands
        if (constraints.requiresOnIdentity && isCreature && !isOnIdentity && !isApprovedUtility) continue;

        // Role / capability match
        if (demand.functionName.includes('BODY') && isCreature) {
          matchedPaths.push(`T${turnReq.turn}_BODY_DEPLOYMENT`);
          causalScore += (isOnIdentity ? 1.2 : 0.6);
        }

        if (demand.functionName.includes('AMPLIFY') && (
          cardCaps.has('TRIBAL_LORD') ||
          cardCaps.has('COUNTER_GENERATOR') ||
          oracle.includes('creatures you control get +') ||
          oracle.includes('have haste') ||
          oracle.includes('battle cry')
        )) {
          // In tribal decks, non-creature amplification spells must belong to the tribe
          if (primaryIdentity && primaryIdentity !== 'none' && !isCreature) {
            const isTribalSpell = oracle.includes(primaryIdentity) || cardName.toLowerCase().includes(primaryIdentity);
            if (!isTribalSpell) continue;
          }
          matchedPaths.push(`T${turnReq.turn}_AMPLIFICATION`);
          causalScore += 1.5;
        }

        if (demand.functionName.includes('LETHAL') || demand.functionName.includes('CONVERT') || demand.functionName.includes('REACH') || demand.functionName.includes('FINISHER')) {
          // Causal terminal-node proof + execution evidence (Universal conversion)
          // 1. Damage to face
          if (cardCaps.has('PLAYER_REACH') || (cardCaps.has('CHEAP_REMOVAL') && cardContract.supplies.some(s => s.canHitPlayer)) || /deals\s+(\d+|x)\s+damage\s+to\s+(any\s+target|target\s+player|each\s+opponent)/i.test(oracle)) {
            matchedPaths.push(`T${turnReq.turn}_DIRECT_BURN_REACH`);
            causalScore += 1.2;
          }
          // 2. Combat lethal / board conversion
          if (cardCaps.has('COMBAT_FINISHER') || cardCaps.has('FINISHER') || cardCaps.has('LARGE_FINISHER') || (power >= 3 && (oracle.includes('haste') || oracle.includes('trample') || oracle.includes('flying')))) {
            matchedPaths.push(`T${turnReq.turn}_COMBAT_FINISHER`);
            causalScore += 1.0;
          }
          // 3. Resource lock / sacrifice drain
          if (cardCaps.has('DEATH_PAYOFF') || cardCaps.has('SACRIFICE_OUTLET')) {
            matchedPaths.push(`T${turnReq.turn}_SACRIFICE_DRAIN_LETHAL`);
            causalScore += 1.4;
          }
          // 4. Token / swarm alpha conversion
          if (cardCaps.has('TOKEN_GENERATOR') || cardCaps.has('TRIBAL_LORD') || cardCaps.has('SWARM_LETHAL')) {
            matchedPaths.push(`T${turnReq.turn}_SWARM_LETHAL`);
            causalScore += 1.2;
          }
        }
      }
    }

    // 1b. Universal Strategic Infrastructure Matching (Interaction, Sweepers, Card Flow, Ramp)
    const maxInteractionCmc = Math.min(3, Math.max(1, derivedKillTurn - 1));
    const isDirectRemovalOrCounter = cardCaps.has('INTERACTION') || 
      cardCaps.has('CHEAP_REMOVAL') || 
      cardCaps.has('COUNTERSPELL') || 
      /^(counter|destroy|exile)\s+target/i.test(oracle) ||
      (oracle.includes('destroy target') && !oracle.includes('combat damage')) ||
      (oracle.includes('exile target') && !oracle.includes('combat damage')) ||
      /deals\s+(\d+|x)\s+damage\s+to\s+(any\s+target|target\s+creature)/i.test(oracle);

    if (cmc <= maxInteractionCmc && isDirectRemovalOrCounter) {
      matchedPaths.push('INTERACTION_SUPPORT');
      causalScore += 1.0;
    }

    if (cardCaps.has('SWEEPER') || oracle.includes('destroy all') || oracle.includes('exile all')) {
      matchedPaths.push('SWEEPER_CONTROL');
      causalScore += 1.2;
    }

    if (cardCaps.has('CARD_FLOW') || oracle.includes('draw a card') || oracle.includes('draw two cards') || oracle.includes('look at the top')) {
      matchedPaths.push('CARD_FLOW_SUPPORT');
      causalScore += 1.0;
    }

    if (cardCaps.has('MANA_ACCELERATION') || cardCaps.has('LAND_ACCELERATION') || cardCaps.has('LANDFALL_PAYOFF') || /\{t\}:\s*add/i.test(oracle) || /search your library for.*land/i.test(oracle) || /landfall/i.test(oracle)) {
      matchedPaths.push('RESOURCE_ACCELERATION');
      causalScore += 1.0;
    }

    // 1c. Indirect Causal Path Matching (Protection, Spot Removal, Fodder)
    if (oracle.includes('hexproof') || oracle.includes('indestructible') || oracle.includes('protection from') || oracle.includes('phase out')) {
      matchedPaths.push('INDIRECT_PROTECTION_PRESERVES_BOARD');
      causalScore += 1.0;
    }

    if (oracle.includes('fight') || oracle.includes('deals damage to target creature') || oracle.includes('destroy target nonland permanent')) {
      matchedPaths.push('INDIRECT_REMOVAL_CLEARS_PATH');
      causalScore += 0.9;
    }

    if (oracle.includes('when this creature dies, create') || oracle.includes('when ~ dies, create a treasure') || oracle.includes('when this creature enters the battlefield, create a treasure')) {
      matchedPaths.push('INDIRECT_RESOURCE_ACCELERATION');
      causalScore += 0.9;
    }

    // 2. Recovery / Resilience Path Matching
    const recoveryPlans = gameplanContract.recoveryPlans || [];
    const primaryTribe = (intentPackage.primaryTribe || gameplanContract.identityConstraints?.primaryIdentity || '').toLowerCase().trim();

    for (const plan of recoveryPlans) {
      if (plan.requiredFunction === 'DIRECT_DAMAGE_TO_FACE' && cardCaps.has('PLAYER_REACH')) {
        matchedPaths.push(`RECOVERY_BURN_REACH`);
        causalScore += 0.8;
      }
      if (plan.requiredFunction === 'CARD_FLOW_RECOVERY' && cardCaps.has('CARD_FLOW')) {
        matchedPaths.push(`RECOVERY_CARD_FLOW`);
        causalScore += 0.8;
      }
      if (plan.requiredFunction === 'RESILIENT_THREATS') {
        const isOffTribeToken = primaryTribe && !oracle.includes(primaryTribe) && !typeLine.includes(primaryTribe);
        if (!isOffTribeToken && (
          cardCaps.has('DEATH_PAYOFF') ||
          (cardCaps.has('TOKEN_GENERATOR') && typeLine.includes('creature')) ||
          cardCaps.has('REANIMATION_SPELL') ||
          oracle.includes('indestructible') ||
          oracle.includes('when this creature dies')
        )) {
          matchedPaths.push(`RECOVERY_RESILIENT_THREAT`);
          causalScore += 0.8;
        }
      }
    }

    // 3. WinPath Causal Connection
    const winCondType = (gameplanContract.winCondition?.type || '').toUpperCase();
    if (winCondType.includes('BURN') && cardCaps.has('PLAYER_REACH')) {
      matchedPaths.push(`WINPATH_BURN`);
      causalScore += 1.0;
    }
    if (winCondType.includes('DRAIN') && (cardCaps.has('SACRIFICE_OUTLET') || cardCaps.has('DEATH_PAYOFF'))) {
      matchedPaths.push(`WINPATH_SACRIFICE_DRAIN`);
      causalScore += 1.0;
    }
    if (winCondType.includes('SWARM') && (cardCaps.has('TOKEN_GENERATOR') || cardCaps.has('TRIBAL_LORD'))) {
      matchedPaths.push(`WINPATH_SWARM_ALPHA`);
      causalScore += 1.0;
    }
    if ((winCondType.includes('RAMP') || winCondType.includes('LANDFALL')) && (cardCaps.has('MANA_ACCELERATION') || cardCaps.has('LAND_ACCELERATION') || cardCaps.has('LANDFALL_PAYOFF') || cardCaps.has('FINISHER') || /landfall/i.test(oracle))) {
      matchedPaths.push(`WINPATH_RAMP_THREAT`);
      causalScore += 1.0;
    }

    // 4. Tribal Synergy Multiplier (if tribal intent)
    if (primaryTribe && typeLine.includes(primaryTribe)) {
      matchedPaths.push(`TRIBAL_MEMBER_${primaryTribe.toUpperCase()}`);
      causalScore *= 1.25;
    }

    // 5. Parasite Detection & Causal Path Typing:
    if (matchedPaths.length === 0) {
      return {
        isAdmissible: false,
        score: 0,
        causalPathType: 'ORPHAN_PARASITE',
        matchedPaths: [],
        rejectionReason: `PARASITE_EXCLUSION: No causal path to active GameplanContract (${gameplanContract.derivedFromLine || 'Unknown'}) or its failure recovery plans.`
      };
    }

    let causalPathType = 'DIRECT_CAUSAL_PATH';
    if (matchedPaths.some(p => p.includes('INTERACTION') || p.includes('SWEEPER') || p.includes('REMOVAL') || p.includes('COUNTERSPELL'))) {
      causalPathType = 'INTERACTION_PATH';
    } else if (matchedPaths.some(p => p.includes('RESOURCE_ACCELERATION') || p.includes('MANA') || p.includes('CARD_FLOW'))) {
      causalPathType = 'INFRASTRUCTURE_PATH';
    } else if (matchedPaths.some(p => p.includes('RECOVERY') || p.includes('PROTECTION'))) {
      causalPathType = 'RECOVERY_PATH';
    } else if (matchedPaths.some(p => p.includes('INDIRECT') || p.includes('FODDER'))) {
      causalPathType = 'INDIRECT_CAUSAL_PATH';
    } else {
      causalPathType = 'DIRECT_CAUSAL_PATH';
    }

    return {
      isAdmissible: true,
      score: Number(causalScore.toFixed(3)),
      causalPathType,
      matchedPaths,
      rejectionReason: null
    };
  }

  /**
   * Filters an entire card pool, admitting only causally connected cards.
   * 
   * @param {Array<Object>} candidates - List of parsed card contracts or card objects
   * @param {import('./gameplanSynthesizer.js').GameplanContract} gameplanContract
   * @param {import('./intentPackage.js').IntentPackage} intentPackage
   * @returns {Object} { admitted: Array<Object>, rejected: Array<Object>, filterReport: Object }
   */
  static filterPool({ candidates = [], gameplanContract, intentPackage = {} }) {
    const admitted = [];
    const rejected = [];

    for (const card of candidates) {
      const evaluation = this.evaluateAdmissibility({
        cardContract: card.contract || card,
        gameplanContract,
        intentPackage
      });

      if (evaluation.isAdmissible) {
        admitted.push({
          card,
          admissibilityScore: evaluation.score,
          matchedPaths: evaluation.matchedPaths
        });
      } else {
        rejected.push({
          card,
          reason: evaluation.rejectionReason
        });
      }
    }

    return {
      admitted,
      rejected,
      filterReport: {
        totalInput: candidates.length,
        admittedCount: admitted.length,
        rejectedCount: rejected.length,
        admissibilityRatio: candidates.length > 0 ? admitted.length / candidates.length : 0
      }
    };
  }

  /**
   * Evaluates a candidate card against a GameplanContract to produce an uncompressed
   * 5-dimensional TrajectoryCompatibilityVector (v29.10).
   * 
   * @param {Object} card
   * @param {Object} gameplanContract
   * @param {Object} [intentPackage]
   * @returns {TrajectoryCompatibilityVector}
   */
  static evaluateTrajectoryCompatibilityVector(card, gameplanContract = {}, intentPackage = {}) {
    const admissibility = this.evaluateAdmissibility({ cardContract: card, gameplanContract, intentPackage });
    const profile = CardExecutionProfile.fromCard(card);
    const cmc = profile.primaryMode.cmc;
    const killTurn = gameplanContract.derivedKillTurn || 4;

    // 1. Castability probability (derived from CMC vs kill turn and color requirements)
    const castabilityProbability = cmc <= killTurn ? Math.max(0.2, 1.0 - (cmc * 0.12)) : 0.05;

    // 2. Relevance timing (1.0 if matched active turn demands, 0.5 if recovery, 0.1 if orphan)
    let relevanceTiming = 0.1;
    if (admissibility.isAdmissible) {
      if (admissibility.causalPathType === 'DIRECT_CAUSAL_PATH') relevanceTiming = 0.95;
      else if (admissibility.causalPathType === 'INTERACTION_PATH') relevanceTiming = 0.85;
      else if (admissibility.causalPathType === 'INFRASTRUCTURE_PATH') relevanceTiming = 0.80;
      else if (admissibility.causalPathType === 'RECOVERY_PATH') relevanceTiming = 0.60;
    }

    // 3. Mode utility (active primary or alternative mode score)
    const modeUtility = profile.alternativeModes.length > 0 ? 0.90 : (cmc <= 3 ? 0.80 : 0.60);

    // 4. Dependency satisfaction (fraction of matched paths)
    const dependencySatisfaction = admissibility.matchedPaths.length > 0 ? Math.min(1.0, admissibility.matchedPaths.length * 0.4) : 0.0;

    // 5. State delta
    const stateDelta = admissibility.isAdmissible ? admissibility.score * 0.05 : -0.10;

    return new TrajectoryCompatibilityVector({
      castabilityProbability,
      relevanceTiming,
      modeUtility,
      dependencySatisfaction,
      stateDelta
    });
  }
}
