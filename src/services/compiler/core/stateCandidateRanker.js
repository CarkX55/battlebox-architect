/**
 * STATE CANDIDATE RANKER (v23.0 Core Engine)
 * 
 * Compares candidates by evaluating the full resulting deck state:
 * State S + Candidate A -> State A'
 * State S + Candidate B -> State B'
 * State C = NO_ADDITION
 * 
 * Evaluates structured multidimensional deltas rather than a single scalar score.
 * Enforces deterministic state dominance based on WinPath closure, DemandSupplyLedger verification,
 * curve velocity, mana alignment, and zero-orphan invariants.
 * 
 * Classifies candidates into:
 *   - VALID: Functional and legal without hard constraint violations.
 *   - SYNERGISTIC: Connects to existing infrastructure and advances the WinPath.
 *   - STRATEGICALLY_DOMINATED: Valid, but another candidate produces a strictly superior causal state.
 */

import { DemandSupplyLedger } from './demandSupplyLedger.js';
import { CardCausalContract } from './cardCausalContract.js';
import { CurveExecutionAnalyzer } from './curveExecutionAnalyzer.js';
import { CardImplementer } from '../../agent/cardImplementer.js';
import { IdentityFirewall } from './identityFirewall.js';
import { StrategicPlayabilityEngine } from './strategicPlayabilityEngine.js';
import { FunctionalRedundancyGraph } from './functionalRedundancyGraph.js';
import { GameplanIntegrityGate } from './gameplanIntegrityGate.js';

export class StateCandidateRanker {
  /**
   * Compares a list of candidates against the current DeckState and IntentContract.
   * @param {Object} currentState Current DeckState (cards, curve, openDemands, provenNodes, manaPips)
   * @param {Array<Object>} candidates Pool of candidate cards with Oracle truth
   * @param {Object} strategicContract Strategic Contract (WinPath, ProofObligations, IntentLock)
   * @returns {Object} { winningCandidate, stateDelta, evaluatedStates, selectionStatus, classifications }
   */
  static rankCandidatesByStateDelta(currentState, candidates = [], strategicContract = {}, intentPackage = {}, targetSlot = {}) {
    if (!candidates || candidates.length === 0) {
      return {
        winningCandidate: null,
        stateDelta: null,
        evaluatedStates: [],
        selectionStatus: 'NO_SELECTION_SEARCH_EXHAUSTED',
        reason: 'El pool de candidatos está vacío. Se requiere expandir la búsqueda en el Knowledge Engine.'
      };
    }

    const evaluatedStates = [];

    for (const candidate of candidates) {
      const stateDelta = this.computeStateDelta(currentState, candidate, strategicContract, intentPackage, targetSlot);
      const dominanceVector = this.computeDominanceVector(stateDelta);
      
      // Tri-state classification
      let classification = 'VALID';
      if (!stateDelta.demandsSatisfiedByExistingState) {
        classification = 'STRATEGICALLY_DOMINATED';
      } else if (stateDelta.winPathNodesProven.length > 0 || stateDelta.causalEdgesAdded.length >= 2) {
        classification = 'SYNERGISTIC';
      }

      evaluatedStates.push({
        candidate,
        stateDelta,
        dominanceVector,
        classification
      });
    }

    // Adaptive Simulation Budget (v28.1): Run seeded playability simulation for top valid candidates
    const validContenders = evaluatedStates
      .filter(e => e.dominanceVector.roleValidity && !e.dominanceVector.hasUnsupportedDemands)
      .slice(0, 8);

    for (const contender of validContenders) {
      const existingCards = (currentState && Array.isArray(currentState.cards)) ? currentState.cards : [];
      const hypotheticalDeck = [...existingCards, contender.candidate];

      try {
        const simEvidence = StrategicPlayabilityEngine.simulatePlayability(hypotheticalDeck, {
          executionPolicy: strategicContract?.executionPolicy,
          simulationCount: 150,
          seed: 472918,
          candidateId: contender.candidate.name || 'candidate'
        });

        contender.dominanceVector.executionEvidence = simEvidence;
        contender.dominanceVector.stateExecution = simEvidence.execution.curveExecutionProbability;
        contender.dominanceVector.winPathQuality = simEvidence.winPath.winPathSuccessRate;
        contender.dominanceVector.resilienceScore = simEvidence.resilience.resilienceIndex / 100;
        contender.dominanceVector.experienceScore = simEvidence.experience.interactionQuality;
      } catch (err) {
        // Fallback gracefully without breaking candidate ranking
        contender.dominanceVector.stateExecution = contender.dominanceVector.stateDeltaScore || 0.5;
        contender.dominanceVector.winPathQuality = 0.5;
      }
    }

    // Sort deterministically by multi-dimensional dominance vector (9-Layer Pareto Hierarchy)
    evaluatedStates.sort((a, b) => this.compareDominanceVectors(b.dominanceVector, a.dominanceVector));

    // Mark dominated candidates relative to the best candidate
    const topCandidate = evaluatedStates[0];
    for (let i = 1; i < evaluatedStates.length; i++) {
      if (this.isStrictlyDominatedBy(evaluatedStates[i], topCandidate)) {
        evaluatedStates[i].classification = 'STRATEGICALLY_DOMINATED';
      }
    }

    const best = evaluatedStates[0];

    // Evaluate if the best state is strictly better than NO_ADDITION baseline
    if (!best || best.dominanceVector.netUtility <= 0 || !best.stateDelta.demandsSatisfiedByExistingState) {
      const hasUnmetDemands = evaluatedStates.some(e => !e.stateDelta.demandsSatisfiedByExistingState);
      const selectionStatus = hasUnmetDemands ? 'NO_SELECTION_INFRASTRUCTURE' : 'NO_SELECTION_CAUSAL';

      return {
        winningCandidate: null,
        stateDelta: null,
        evaluatedStates,
        selectionStatus,
        reason: selectionStatus === 'NO_SELECTION_INFRASTRUCTURE'
          ? 'Los candidatos disponibles requieren infraestructura no satisfecha en el DemandSupplyLedger actual.'
          : 'Ningún candidato disponible produce una mejora causal comprobable sobre el estado actual.'
      };
    }

    return {
      winningCandidate: best.candidate,
      stateDelta: best.stateDelta,
      evaluatedStates,
      selectionStatus: 'SELECTION_SUCCESS',
      reason: `El estado con ${best.candidate.name} domina las alternativas [${best.classification}] cerrando demandas (${best.stateDelta.needsClosed.join(', ') || 'tempo'}) y avanzando el WinPath.`
    };
   }

  /**
   * Evaluates if candidate strictly satisfies the target slot Proof Obligation (v26.1).
   * Generates structured causal evidence without scalar heuristic shortcuts.
   */
  static evaluateRoleProofObligation(candidate, targetSlot = {}, intentPackage = {}, currentState = {}) {
    const role = (typeof targetSlot === 'string' ? targetSlot : (targetSlot.role || '')).toLowerCase();
    if (!role) {
      return {
        roleValidity: true,
        roleQuality: 0.5,
        rejectionReason: null,
        evidence: { mechanism: 'UNCONSTRAINED_SLOT', quality: 0.5 }
      };
    }

    const contract = CardCausalContract.parse(candidate);
    const compat = contract ? CardCausalContract.isCausallyCompatibleWithRole(contract, role, intentPackage) : { isCompatible: true };

    if (!compat.isCompatible) {
      return {
        roleValidity: false,
        roleQuality: 0,
        rejectionReason: compat.reason || 'FAILS_ROLE_PROOF',
        evidence: {
          mechanism: 'NONE',
          status: 'FAILS_ROLE_PROOF',
          rejectionReason: compat.reason || 'FAILS_ROLE_PROOF'
        }
      };
    }

    const faces = Array.isArray(candidate.card_faces) ? candidate.card_faces : [];
    let typeLine = (candidate.type_line || candidate.typeLine || candidate.type || '').toLowerCase();
    let oracleText = (candidate.oracle_text || candidate.oracleText || candidate.text || '').toLowerCase();
    let power = candidate.power !== undefined ? String(candidate.power) : '';
    let toughness = candidate.toughness !== undefined ? String(candidate.toughness) : '';
    if (faces.length > 0) {
      if (!typeLine) {
        typeLine = faces.map(f => f.type_line || f.typeLine || '').filter(Boolean).join(' // ').toLowerCase();
      }
      if (!oracleText) {
        oracleText = faces.map(f => f.oracle_text || f.oracleText || '').filter(Boolean).join('\n//\n').toLowerCase();
      }
      if (!power && faces[0]?.power !== undefined) {
        power = String(faces[0].power);
      }
      if (!toughness && faces[0]?.toughness !== undefined) {
        toughness = String(faces[0].toughness);
      }
    }

    const cmc = Number(candidate.cmc || candidate.mana_value || 0);

    let roleQuality = 0.5;
    let evidence = { mechanism: 'STANDARD_ROLE_EXECUTION', quality: 0.5 };

    // 1. CHEAP_REMOVAL / SPOT_REMOVAL Proof Obligation
    if (role.includes('removal') || role.includes('interaction') || role.includes('cheap_removal')) {
      const proof = contract.interactionProof;
      if (proof) {
        if (proof.effectScope === 'GRAVEYARD_HATE' || proof.effectScope === 'NONE' || proof.effectScope === 'INCIDENTAL_PING') {
          return {
            roleValidity: false,
            roleQuality: 0,
            rejectionReason: 'FAILS_ROLE_PROOF: Card is graveyard interaction or incidental ping, not actual battlefield removal.',
            evidence: { mechanism: proof.effectScope, status: 'INVALID_REMOVAL_SCOPE' }
          };
        }

        if (proof.effectScope === 'CONDITIONAL_REMOVAL' || proof.conditionality === 'HIGHLY_CONDITIONAL') {
          return {
            roleValidity: true,
            roleQuality: 0.25,
            rejectionReason: null,
            evidence: { mechanism: 'CONDITIONAL_REMOVAL', quality: 0.25 }
          };
        }

        const isActivatedArtifactRemoval = (typeLine.includes('artifact') || typeLine.includes('enchantment')) &&
          !typeLine.includes('creature') &&
          /\{[2-9wubrg]\}[,\s]*\{t\}/i.test(oracleText);
        const isTempoOrAggro = [intentPackage.tempo, intentPackage.archetype].some(s => typeof s === 'string' && (s.toLowerCase().includes('tempo') || s.toLowerCase().includes('aggro')));

        if (isActivatedArtifactRemoval && isTempoOrAggro) {
          return {
            roleValidity: false,
            roleQuality: 0,
            rejectionReason: 'FAILS_ROLE_PROOF: Activated non-creature removal trap imposes excessive tempo friction for Tempo/Aggro.',
            evidence: { mechanism: 'ACTIVATED_TRAP_MISMATCH', status: 'TEMPO_SINK_REJECTION' }
          };
        }

        let quality = 0.2;
        if (proof.timingWindow === 'INSTANT_SPEED') quality += 0.35;
        if (proof.conditionality === 'UNCONDITIONAL') quality += 0.25;
        else if (proof.conditionality === 'CONDITIONALLY_RELIABLE') quality += 0.15;
        
        if (proof.targetScope === 'ANY_TARGET' || proof.targetScope === 'NONLAND_PERMANENT' || proof.targetScope === 'CREATURE_OR_PLANESWALKER') {
          quality += 0.20;
        } else if (proof.targetScope === 'TARGET_CREATURE') {
          quality += 0.15;
        }

        // Lethal damage / kill potency bonus
        if (proof.damagePotency >= 4.5 || proof.effectScope === 'HARD_REMOVAL') {
          quality += 0.35; // Hard destroy / exile / fight
        } else if (proof.damagePotency >= 3) {
          quality += 0.25; // 3-4 damage lethal threshold
        } else if (proof.damagePotency === 2) {
          quality += 0.10;
        } else if (proof.damagePotency <= 1) {
          quality -= 0.35; // 1-damage ping penalty
        }

        const effCmc = Number(proof.manaCost !== undefined ? proof.manaCost : cmc);
        if (effCmc <= 1) quality += 0.25;
        else if (effCmc === 2) quality += 0.15;
        else if (effCmc === 3) quality += 0.05;
        else quality -= (effCmc - 3) * 0.35;

        if (typeLine.includes('instant')) quality += 0.15;
        if (typeLine.includes('saga') || typeLine.includes('class')) quality -= 0.35;

        roleQuality = Math.min(1.0, Math.max(0.1, quality));
        evidence = {
          mechanism: proof.effectScope,
          timing: proof.timingWindow,
          conditionality: proof.conditionality,
          targetScope: proof.targetScope,
          damagePotency: proof.damagePotency,
          effectiveCmc: effCmc,
          quality: Number(roleQuality.toFixed(2))
        };
      }
    }

    // 1b. COUNTER_DISRUPTION / COUNTERSPELL_SUITE Proof Obligation
    else if (role.includes('counter') || role.includes('disruption')) {
      const isCounter = contract.supplies.some(s => s.capability === 'COUNTER_DISRUPTION') ||
        (contract.interactionProof && contract.interactionProof.effectScope === 'COUNTER_SPELL') ||
        oracleText.includes('counter target');

      if (!isCounter) {
        return {
          roleValidity: false,
          roleQuality: 0,
          rejectionReason: 'FAILS_ROLE_PROOF: Card does not provide counterspell disruption.',
          evidence: { mechanism: 'NONE', status: 'NOT_COUNTERSPELL' }
        };
      }

      let quality = 0.5;
      if (cmc <= 2) quality += 0.35;
      else if (cmc === 3) quality += 0.20;
      else quality -= (cmc - 3) * 0.15;

      if (oracleText.includes('counter target spell') || oracleText.includes('counter target noncreature spell') || oracleText.includes('counter target creature spell')) quality += 0.15;
      if (oracleText.includes('unless its controller pays')) quality -= 0.05;

      roleQuality = Math.min(1.0, Math.max(0.2, quality));
      evidence = {
        mechanism: 'COUNTERMAGIC_DISRUPTION',
        cmc,
        quality: Number(roleQuality.toFixed(2))
      };
    }

    // 1c. BOARD_SWEEPER / MASS_REMOVAL Proof Obligation
    else if (role.includes('sweeper') || role.includes('board_wipe') || role.includes('mass_removal')) {
      const isSweeper = (contract.supplies.some(s => s.capability === 'BOARD_SWEEPER') ||
        oracleText.includes('destroy all') || oracleText.includes('exile all') ||
        (oracleText.includes('damage to each creature') && !oracleText.includes('deals 1 damage')) ||
        (oracleText.includes('return each creature') && oracleText.includes("to its owner's hand")));
      const isGraveyardTarget = oracleText.includes('from a graveyard') || oracleText.includes('all graveyards');

      if (!isSweeper || (isGraveyardTarget && !oracleText.includes('creature') && !oracleText.includes('permanent'))) {
        return {
          roleValidity: false,
          roleQuality: 0,
          rejectionReason: 'FAILS_ROLE_PROOF: Card does not provide a true board sweeper effect.',
          evidence: { mechanism: 'NONE', status: 'NOT_BOARD_SWEEPER' }
        };
      }

      let quality = 0.5;
      if (cmc <= 4) quality += 0.35;
      else if (cmc === 5) quality += 0.25;
      else if (cmc === 6) quality += 0.10;
      else quality -= (cmc - 6) * 0.2;

      if (oracleText.includes("can't be countered") || oracleText.includes('exile all')) quality += 0.15;

      roleQuality = Math.min(1.0, Math.max(0.2, quality));
      evidence = {
        mechanism: 'BOARD_SWEEPER',
        cmc,
        quality: Number(roleQuality.toFixed(2))
      };
    }

    // 1d. RAMP_ACCELERATION Proof Obligation
    else if (role.includes('ramp') || role.includes('acceleration')) {
      const manaSupply = contract.supplies.find(s => s.capability === 'MANA_ACCELERATION');
      if (!manaSupply) {
        return {
          roleValidity: false,
          roleQuality: 0,
          rejectionReason: 'FAILS_ROLE_PROOF: Card does not provide mana acceleration.',
          evidence: { mechanism: 'NONE', status: 'NOT_RAMP' }
        };
      }

      let quality = 0.5;
      if (cmc === 1) quality += 0.35;
      else if (cmc === 2) quality += 0.25;
      else if (cmc === 3) quality += 0.10;
      else quality -= (cmc - 3) * 0.2;

      roleQuality = Math.min(1.0, Math.max(0.2, quality));
      evidence = {
        mechanism: 'MANA_ACCELERATION',
        cmc,
        quality: Number(roleQuality.toFixed(2))
      };
    }

    // 2. AMPLIFY_BOARD_PRESSURE Proof Obligation (Multipliers & Scaling)
    else if (role.includes('amplify') || role.includes('lord') || role.includes('force_multiplier')) {
      const primaryTribe = (intentPackage.primaryTribe || '').toLowerCase();
      const tc = CardCausalContract.extractTribalContribution(candidate, primaryTribe);
      let quality = 0.3;
      const isAnthem = oracleText.includes('creatures you control get +') || (oracleText.includes('other ') && oracleText.includes('you control get +')) || (primaryTribe && oracleText.includes(primaryTribe + ' creatures you control get +')) || (primaryTribe && oracleText.includes(primaryTribe + 's you control get +'));
      const isBattleCry = oracleText.includes('battle cry');
      const grantsKeywords = oracleText.includes('have haste') || oracleText.includes('gain trample') || oracleText.includes('gain haste') || oracleText.includes('have deathtouch') || oracleText.includes('gain deathtouch');

      if (tc.isAmplifier || isAnthem) quality += 0.55; // Premier Lord Bonus
      if (tc.isPayoff) quality += 0.30;
      if (isBattleCry) quality += 0.35;
      if (grantsKeywords) quality += 0.25;
      if (cmc <= 2) quality += 0.20;
      else if (cmc === 3) quality += 0.15;

      if (typeLine.includes('creature')) quality += 0.20;
      if (primaryTribe && (typeLine.includes(primaryTribe) || tc.isMember)) quality += 0.25;
      if (typeLine.includes('class') || typeLine.includes('saga')) quality -= 0.35; // Sagas and Classes require extra mana/turns to provide anthem

      roleQuality = Math.min(1.0, quality);
      evidence = {
        mechanism: (tc.isAmplifier || isAnthem) ? 'GLOBAL_STAT_ANTHEM' : (isBattleCry ? 'BATTLE_CRY_TRIGGER' : 'KEYWORD_AMPLIFICATION'),
        timing: 'STATIC_OR_COMBAT',
        quality: Number(roleQuality.toFixed(2))
      };
    }

    // 3. CARD_FLOW Proof Obligation (Compositional Resource Access)
    else if (role.includes('flow') || role.includes('draw') || role.includes('advantage')) {
      const isAura = typeLine.includes('aura');
      const isCombatDependent = oracleText.includes('combat damage to a player') || oracleText.includes("if you didn't attack");
      const isControl = (intentPackage.tempo || '').toLowerCase().includes('control') || (intentPackage.archetype || '').toLowerCase().includes('control');

      if (isAura && isCombatDependent && isControl) {
        return {
          roleValidity: false,
          roleQuality: 0,
          rejectionReason: 'FAILS_ROLE_PROOF: Combat-dependent Aura (e.g. Curious Obsession) requires aggressive creature curve, invalid for Control.',
          evidence: { mechanism: 'AURA_COMBAT_MISMATCH', status: 'CONTROL_AURA_REJECTION' }
        };
      }

      // Check for pure graveyard-hate self-sacrificing cantrips (e.g. Lantern of the Lost)
      const isGraveyardSacCantrip = typeLine.includes('artifact') && 
        (oracleText.includes('from a graveyard') || oracleText.includes('all graveyards') || oracleText.includes('target card in a graveyard')) && 
        oracleText.includes('exile') && 
        oracleText.includes('draw a card');

      if (isGraveyardSacCantrip) {
        return {
          roleValidity: false,
          roleQuality: 0,
          rejectionReason: 'FAILS_ROLE_PROOF: Graveyard-hate artifact with incidental cantrip cannot fulfill primary CARD_FLOW slot.',
          evidence: { mechanism: 'GRAVEYARD_HATE_CANTRIP', status: 'CANTRIP_HATE_REJECTION' }
        };
      }

      const flow = contract.resourceAccessChains;
      const isTempoOrAggro = [intentPackage.tempo, intentPackage.archetype].some(s => typeof s === 'string' && (s.toLowerCase().includes('tempo') || s.toLowerCase().includes('aggro')));

      // Disqualify slow non-creature mana sinks with tap/activation in Tempo/Aggro plans
      const isSlowActivatedSink = (typeLine.includes('artifact') || typeLine.includes('enchantment')) &&
        !typeLine.includes('creature') &&
        (oracleText.includes('{t}: draw') || oracleText.includes('{t}, draw') || /\{[1-9wubrg]\}[,\s]*\{t\}[:\s]*draw/i.test(oracleText) || oracleText.includes('investigate')) &&
        cmc >= 3;

      if (isSlowActivatedSink && isTempoOrAggro) {
        return {
          roleValidity: false,
          roleQuality: 0,
          rejectionReason: 'FAILS_ROLE_PROOF: Slow activated draw engine (CMC >= 3 + tap activation) imposes fatal tempo opportunity cost for Tempo/Aggro.',
          evidence: { mechanism: 'TEMPO_SINK_MISMATCH', status: 'TEMPO_SINK_REJECTION' }
        };
      }

      let quality = 0.3;
      if (flow && flow.isCompositionalFlow) quality += 0.4;
      if (flow && (flow.chains.includes('IMPULSE_DRAW') || flow.chains.includes('DEATH_TRIGGERED_FLOW') || flow.chains.includes('COMBAT_DAMAGE_FLOW'))) quality += 0.25;
      
      if (oracleText.includes('draw two cards') || oracleText.includes('draw three cards') || oracleText.includes('look at the top')) {
        quality += 0.35; // Net card advantage
      } else if (oracleText.includes('draw a card') && (oracleText.includes('investigate') || oracleText.includes('flashback') || oracleText.includes('scry'))) {
        quality += 0.20;
      }

      if (cmc <= 2) quality += 0.2;
      else if (cmc === 3) quality += 0.15;
      else if (cmc === 4) quality += 0.10;

      roleQuality = Math.min(1.0, quality);
      evidence = {
        mechanism: (flow && flow.chains.join(', ')) || 'RAW_DRAW',
        isCompositional: Boolean(flow && flow.isCompositionalFlow),
        quality: Number(roleQuality.toFixed(2))
      };
    }

    // 4. TRIBAL_DENSITY Proof Obligation
    else if (role.includes('tribal_density') || role.includes('tribal')) {
      const primaryTribe = (intentPackage.primaryTribe || '').toLowerCase();
      const isVehicle = typeLine.includes('vehicle');
      const isLand = typeLine.includes('land') && !typeLine.includes('creature');
      const isCreature = (typeLine.includes('creature') || faces[0]?.type_line?.toLowerCase().includes('creature')) && !isVehicle && !isLand;

      if (!isCreature) {
        return {
          roleValidity: false,
          roleQuality: 0,
          rejectionReason: 'FAILS_ROLE_PROOF: Non-creature spell/vehicle/land cannot fulfill TRIBAL_DENSITY slot.',
          evidence: { mechanism: 'NONE', status: 'NON_CREATURE_REJECTION' }
        };
      }

      const isTribeMatch = IdentityFirewall.isMatchingTribe(candidate, primaryTribe);

      if (!isTribeMatch) {
        return {
          roleValidity: false,
          roleQuality: 0,
          rejectionReason: `FAILS_ROLE_PROOF: Card "${candidate.name}" does not match required tribe [${intentPackage.primaryTribe}].`,
          evidence: { mechanism: 'NONE', status: 'OFF_TRIBE_REJECTION' }
        };
      }

      const tc = CardCausalContract.extractTribalContribution(candidate, primaryTribe);
      let quality = 0.5;
      if (tc.isAmplifier) quality += 0.45; // Lord / Anthem / Keyword buff
      if (tc.isEngine) quality += 0.35;    // Card advantage / Recursion / Token engine
      if (tc.isPayoff) quality += 0.30;    // Devastating payoff / win condition
      if (typeLine.includes(primaryTribe)) quality += 0.15;
      if (oracleText.includes('haste') || oracleText.includes('deathtouch') || oracleText.includes('flying') || oracleText.includes('menace')) quality += 0.15;

      const isAggro = [intentPackage.tempo, intentPackage.archetype].some(s => typeof s === 'string' && s.toLowerCase().includes('aggro'));
      if (isAggro && cmc >= 4 && !tc.isAmplifier && !tc.isEngine && !tc.isPayoff && !oracleText.includes('haste') && !oracleText.includes('flying')) {
        quality -= 0.35; // Draft filler penalty
      }

      roleQuality = Math.min(1.0, quality);
      evidence = {
        mechanism: tc.isAmplifier ? 'TRIBAL_LORD_AMPLIFIER' : (tc.isEngine ? 'TRIBAL_ENGINE' : 'ON_TRIBE_CREATURE'),
        primaryTribe,
        isAmplifier: tc.isAmplifier,
        isEngine: tc.isEngine,
        isPayoff: tc.isPayoff,
        quality: Number(roleQuality.toFixed(2))
      };
    }

    // 5. EARLY PRESSURE / BOARD PRESENCE / TURN1 / TURN2
    else if (role.includes('pressure') || role.includes('presence') || role.includes('turn1') || role.includes('turn2')) {
      const isTurn1 = role.includes('turn1') || role.includes('turn_1') || role.includes('t1');
      const isTurn2 = role.includes('turn2') || role.includes('turn_2') || role.includes('t2');
      const isVehicle = typeLine.includes('vehicle');
      const isCreature = typeLine.includes('creature');
      const primaryTribe = (intentPackage.primaryTribe || '').toLowerCase();
      const powerNum = Number(power || candidate.power || 0);

      // Strict Mana Curve Gating for Turn-specific Pressure Slots
      if (isTurn1 && cmc > 1) {
        return {
          roleValidity: false,
          roleQuality: 0,
          rejectionReason: `FAILS_ROLE_PROOF: Card "${candidate.name}" (CMC ${cmc}) cannot be played on Turn 1 for TURN1_PRESSURE slot.`,
          evidence: { mechanism: 'CURVE_MISMATCH_T1', cmc, status: 'INVALID_TURN1_PLAY' }
        };
      }
      if (isTurn2 && cmc > 2) {
        return {
          roleValidity: false,
          roleQuality: 0,
          rejectionReason: `FAILS_ROLE_PROOF: Card "${candidate.name}" (CMC ${cmc}) cannot be played on Turn 2 for TURN2_PRESSURE slot.`,
          evidence: { mechanism: 'CURVE_MISMATCH_T2', cmc, status: 'INVALID_TURN2_PLAY' }
        };
      }

      if (isVehicle && !isCreature) {
        roleQuality = 0.35;
        evidence = { mechanism: 'VEHICLE_CONDITIONAL_PRESENCE', quality: 0.35 };
      } else if (isCreature) {
        const tc = CardCausalContract.extractTribalContribution(candidate, primaryTribe);
        let quality = 0.4;
        if (isTurn1 && cmc === 1) {
          quality = 0.6;
          if (powerNum >= 2) quality += 0.35; // 2-power 1-drops (Diregraf Ghoul)
          else if (powerNum === 1) quality += 0.20;
        } else if (isTurn2) {
          quality = 0.5;
          if (cmc === 2) {
            if (powerNum >= 3) quality += 0.35;
            else if (powerNum >= 2) quality += 0.25;
          } else if (cmc === 1) {
            quality += 0.20;
          }
        } else {
          const isAggro = [intentPackage.tempo, intentPackage.archetype].some(s => typeof s === 'string' && s.toLowerCase().includes('aggro'));
          if (cmc === 1 && powerNum >= 2) quality += 0.45;
          else if (cmc === 1 && powerNum === 1) quality += 0.25;
          if (cmc === 2 && powerNum >= 3) quality += 0.40;
          else if (cmc === 2 && powerNum >= 2) quality += 0.30;
          if (cmc === 3 && powerNum >= 3) quality += 0.25;
          if (isAggro && cmc >= 4) {
            // High CMC without haste/evasion creates severe tempo drag in Aggro board presence
            quality -= (cmc - 3) * 0.45;
          }
        }

        if (oracleText.includes('haste')) quality += 0.25;
        if (oracleText.includes('deathtouch')) quality += 0.15;
        if (tc.isAmplifier) quality += 0.35;
        if (tc.isEngine) quality += 0.30;
        if (tc.isPayoff) quality += 0.25;

        let isOnTribe = false;
        if (primaryTribe && primaryTribe !== 'none') {
          isOnTribe = Boolean(tc.isMember);
          if (isOnTribe) quality += 0.25;
        }

        roleQuality = Math.min(1.0, quality);
        evidence = {
          mechanism: 'COMBAT_BODY',
          power: powerNum,
          cmc,
          isOnTribe,
          isTurn1,
          isTurn2,
          quality: Number(roleQuality.toFixed(2))
        };
      }
    }

    // 6. FINISHER / APEX THREAT / PLANESWALKER
    else if (role.includes('finisher') || role.includes('bomb') || role.includes('apex')) {
      const isAggro = [intentPackage.tempo, intentPackage.archetype].some(s => typeof s === 'string' && s.toLowerCase().includes('aggro'));
      const isPlaneswalker = typeLine.includes('planeswalker');

      if (isAggro && cmc >= 5 && isPlaneswalker && !oracleText.includes('haste') && !oracleText.includes('damage to target player')) {
        return {
          roleValidity: false,
          roleQuality: 0,
          rejectionReason: 'FAILS_ROLE_PROOF: 5+ CMC slow control planeswalker is invalid as finisher for low-curve Aggro.',
          evidence: { mechanism: 'PLANESWALKER_CURVE_MISMATCH', status: 'AGGRO_PLANESWALKER_REJECTION' }
        };
      }

      const hasFinisher = contract.supplies.some(s => s.capability === 'FINISHER') ||
        (isAggro && (typeLine.includes('creature') && (oracleText.includes('other ') || oracleText.includes('loses half their life') || (cmc >= 3 && oracleText.includes('haste')))));

      if (!hasFinisher) {
        return {
          roleValidity: false,
          roleQuality: 0,
          rejectionReason: 'FAILS_ROLE_PROOF: Card is not a viable late-game finisher, planeswalker, or high-impact threat.',
          evidence: { mechanism: 'NONE', status: 'NOT_FINISHER' }
        };
      }

      let quality = 0.5;
      if (typeLine.includes('planeswalker')) {
        quality += 0.40; // Planeswalkers are premier control/midrange finishers
      }
      if (oracleText.includes('flash') || oracleText.includes('hexproof') || oracleText.includes('ward') || oracleText.includes("can't be countered")) {
        quality += 0.25; // Resilient finisher bonus
      }
      if (oracleText.includes('flying') || oracleText.includes('trample') || oracleText.includes('shark creature token') || oracleText.includes('create an x/x')) {
        quality += 0.20; // Evasion / scaling bonus
      }

      // In Aggro, 3-4 CMC tribal lords and recursive threats are the apex finishers
      if (isAggro && (cmc === 3 || cmc === 4)) {
        quality += 0.35;
      }

      // Penalize vanilla high-cost creatures with no evasion/protection/ETB
      if (typeLine.includes('creature') && !typeLine.includes('planeswalker') && !oracleText.includes('flying') && !oracleText.includes('trample') && !oracleText.includes('enters') && !oracleText.includes('ward') && !oracleText.includes('haste')) {
        quality -= 0.40;
      }

      roleQuality = Math.min(1.0, Math.max(0.1, quality));
      evidence = {
        mechanism: typeLine.includes('planeswalker') ? 'PLANESWALKER_FINISHER' : 'THREAT_FINISHER',
        cmc,
        quality: Number(roleQuality.toFixed(2))
      };
    }

    return {
      roleValidity: true,
      roleQuality: Number(roleQuality.toFixed(2)),
      rejectionReason: null,
      evidence
    };
  }

  /**
   * Computes the structured state delta when adding a candidate to currentState.
   */
  static computeStateDelta(currentState, candidate, strategicContract = {}, intentPackage = {}, targetSlot = {}) {
    const existingCards = currentState.cards || [];
    const winPath = strategicContract.winPath || [];
    const proofObligations = strategicContract.proofObligations || [];
    const openDemands = currentState.openDemands || [];

    const candidateCapabilities = candidate.capabilities || candidate.semanticTags || [];
    const winPathNodesProven = [];
    const needsClosed = [];
    const causalEdgesAdded = [];

    // 1. Role Proof Obligation Evaluation (Gate & Quality)
    const roleProof = this.evaluateRoleProofObligation(candidate, targetSlot, intentPackage, currentState);

    // 1b. Gameplan Integrity Gate (V29.1 Causal Admissibility)
    const activeGameplan = strategicContract?.gameplanContract || intentPackage?.gameplanContract;
    if (activeGameplan) {
      const gateResult = GameplanIntegrityGate.evaluateAdmissibility({
        cardContract: CardCausalContract.parse(candidate),
        gameplanContract: activeGameplan,
        intentPackage
      });
      if (!gateResult.isAdmissible) {
        roleProof.roleValidity = false;
        roleProof.rejectionReason = gateResult.rejectionReason;
        roleProof.roleQuality = 0;
      } else {
        roleProof.roleQuality = Math.min(1.0, roleProof.roleQuality * 0.5 + gateResult.score * 0.5);
      }
    }

    // 2. WinPath Nodes Proven by this candidate
    for (const node of winPath) {
      const nodeKey = typeof node === 'string' ? node : (node.id || node.name);
      if (candidateCapabilities.includes(nodeKey) || this.matchesNodeRequirement(candidate, node)) {
        winPathNodesProven.push(nodeKey);
      }
    }

    // 3. Tribal Structural Contribution Vector
    const rawTribe = intentPackage.primaryTribe ? String(intentPackage.primaryTribe).toLowerCase().trim() : '';
    const tribalContribution = CardCausalContract.extractTribalContribution(candidate, rawTribe);
    const typeLine = (candidate.type_line || candidate.typeLine || candidate.type || '').toLowerCase();
    const isCreature = typeLine.includes('creature');

    if (tribalContribution.isMember) {
      if (isCreature) {
        winPathNodesProven.push('TRIBAL_DENSITY');
        needsClosed.push('TRIBAL_MEMBER');
      }
      if (tribalContribution.isAmplifier) {
        causalEdgesAdded.push(`${candidate.name} -> TRIBAL_AMPLIFIER`);
      }
      if (tribalContribution.isEngine) {
        causalEdgesAdded.push(`${candidate.name} -> TRIBAL_RESOURCE_ENGINE`);
      }
      if (tribalContribution.isPayoff) {
        causalEdgesAdded.push(`${candidate.name} -> TRIBAL_PAYOFF`);
      }
    }

    // 4. Needs and open obligations closed
    for (const demand of openDemands) {
      if (candidateCapabilities.includes(demand) || this.candidateSatisfiesDemand(candidate, demand)) {
        needsClosed.push(demand);
      }
    }
    for (const obl of proofObligations) {
      const oblKey = typeof obl === 'string' ? obl : obl.name;
      if ((candidateCapabilities.includes(oblKey) || this.matchesNodeRequirement(candidate, oblKey)) && !needsClosed.includes(oblKey)) {
        needsClosed.push(oblKey);
      }
    }

    // 4b. Causal State Deficits Evaluation (Resolving Open State Deficits)
    const stateDeficits = currentState.stateDeficits || [];
    const closedDeficits = [];
    let deficitClosureGain = 0;

    for (const def of stateDeficits) {
      if (def.obligation === 'SURVIVAL_WINDOW') {
        const interQuality = this.evaluateInteractionQuality(candidate, strategicContract);
        if (interQuality.isInteraction && interQuality.score > 0) {
          closedDeficits.push('SURVIVAL_WINDOW');
          needsClosed.push('SURVIVAL_WINDOW');
          causalEdgesAdded.push(`${candidate.name} -> CLOSES_DEFICIT(SURVIVAL_WINDOW)`);
          deficitClosureGain += (def.severity === 'HIGH' ? 3.0 : 1.8) * Math.min(2.0, interQuality.score);
        }
      } else if (def.obligation === 'RESOURCE_FLOW') {
        const text = (candidate.oracle_text || candidate.oracleText || candidate.text || '').toLowerCase();
        const isFlow = text.includes('draw') || text.includes('look at the top') || text.includes('exile the top') || tribalContribution.isEngine;
        if (isFlow) {
          closedDeficits.push('RESOURCE_FLOW');
          needsClosed.push('RESOURCE_FLOW');
          causalEdgesAdded.push(`${candidate.name} -> CLOSES_DEFICIT(RESOURCE_FLOW)`);
          deficitClosureGain += 2.0;
        }
      } else if (def.obligation === 'EARLY_PRESSURE') {
        if (isCreature && Number(candidate.cmc || candidate.mana_value || 0) <= 2) {
          closedDeficits.push('EARLY_PRESSURE');
          needsClosed.push('EARLY_PRESSURE');
          causalEdgesAdded.push(`${candidate.name} -> CLOSES_DEFICIT(EARLY_PRESSURE)`);
          deficitClosureGain += (def.severity === 'HIGH' ? 3.5 : 2.5);
        }
      }
    }

    // Structural mismatch check for pure non-creatures in creature density slots
    const slotRole = (targetSlot.role || '').toLowerCase();
    if ((slotRole.includes('tribal_density') || slotRole.includes('board_presence')) && !isCreature) {
      needsClosed.push('NON_CREATURE_DENSITY_MISMATCH');
    }

    // 5. Universal DemandSupplyLedger Audit
    const demandAudit = DemandSupplyLedger.auditCardDemands(candidate, currentState, intentPackage);
    const demandsSatisfiedByExistingState = demandAudit.isSatisfied;
    const newDemands = demandAudit.demands;

    // 6. Causal edges added
    for (const need of needsClosed) {
      if (need !== 'NON_CREATURE_DENSITY_MISMATCH') {
        causalEdgesAdded.push(`${candidate.name} -> SATISFIES(${need})`);
      }
    }
    for (const existing of existingCards) {
      if (this.cardsHaveSynergy(candidate, existing.card || existing)) {
        causalEdgesAdded.push(`${candidate.name} <-> SYNERGY(${(existing.card || existing).name})`);
      }
    }

    // 7. Curve and Mana Delta with CurveExecutionAnalyzer
    const cmc = Number(candidate.cmc || candidate.mana_value || 0);
    const curveBefore = currentState.curve || {};
    const curveCountAtCmc = (curveBefore[cmc] || 0);
    const curveHealthImpact = this.evaluateCurveImpact(cmc, curveCountAtCmc, strategicContract.archetype);
    const curveExec = CurveExecutionAnalyzer.evaluateMarginalAddition(currentState, candidate, intentPackage, targetSlot);

    // 8. Systemic Tempo Clock & Archetype Strategy Delta
    const tempoLower = (strategicContract.archetype || intentPackage.tempo || intentPackage.archetype || '').toLowerCase();
    const isAggro = tempoLower.includes('aggro') || tempoLower.includes('burn') || tempoLower.includes('sligh');
    const isControl = tempoLower.includes('control') || tempoLower.includes('draw-go');
    const isMidrange = tempoLower.includes('midrange') || tempoLower.includes('rock') || tempoLower.includes('attrition') || tempoLower.includes('jund');

    const power = Number(candidate.power || 0);
    const oracle = (candidate.oracle_text || candidate.oracleText || candidate.text || '').toLowerCase();
    const type = (candidate.type_line || candidate.type || '').toLowerCase();
    let tempoClockDelta = 0;

    if (isAggro) {
      if (cmc <= 1 && power >= 2) tempoClockDelta += 1.8;
      else if (cmc <= 1 && power === 1) tempoClockDelta += 0.8;
      else if (cmc === 2 && power >= 3) tempoClockDelta += 1.6;
      else if (cmc === 2 && power >= 2) tempoClockDelta += 1.2;
      else if (cmc === 3 && power >= 3) tempoClockDelta += 0.8;
      else if (cmc >= 5) {
        tempoClockDelta -= 4.5; // 5+ CMC on 18-20 land aggro is dead in hand
      }
      else if (cmc === 4 && !tribalContribution.isAmplifier && !tribalContribution.isEngine && !tribalContribution.isPayoff) {
        tempoClockDelta -= 2.5; // High CMC with low offensive contribution creates tempo drag in aggro
      }
      if (tribalContribution.isAmplifier) tempoClockDelta += 2.0; // Lords are game-ending in aggro
      if (tribalContribution.isPayoff) tempoClockDelta += 1.5;
      if (tribalContribution.isEngine) tempoClockDelta += 1.2;
    } else if (isControl) {
      // Control values instant-speed answers, sweepers, and card draw over vanilla attackers
      if (type.includes('instant') || type.includes('sorcery')) tempoClockDelta += 1.5;
      if (oracle.includes('draw') || oracle.includes('look at the top')) tempoClockDelta += 1.8;
      if (oracle.includes('destroy all') || oracle.includes('exile all')) tempoClockDelta += 2.5;
      if (cmc <= 2 && type.includes('creature') && power <= 2 && !oracle.includes('draw') && !oracle.includes('counter')) {
        tempoClockDelta -= 2.0; // Low-value vanilla 1-2 drop creatures are dead weight in control
      }
    } else if (isMidrange) {
      // Midrange values 2-for-1 card advantage, removal, and high-stat 2-4 drops
      if (oracle.includes('draw') || oracle.includes('discard') || oracle.includes('create a token') || oracle.includes('when ~ enters')) {
        tempoClockDelta += 1.8;
      }
      if (cmc >= 2 && cmc <= 4 && power >= cmc) tempoClockDelta += 1.4;
      if (cmc === 1 && power <= 1 && !oracle.includes('draw') && !oracle.includes('add')) {
        tempoClockDelta -= 1.0; // Pure 1/1s with no value are suboptimal in midrange
      }
    }

    // 8b. Ramp Velocity and Anti-Synergy Evaluation
    let rampVelocityDelta = 0;
    const isRampSlot = slotRole.includes('ramp') || slotRole.includes('acceleration');
    if (isRampSlot) {
      const oracle = (candidate.oracle_text || candidate.oracleText || candidate.text || '').toLowerCase();
      const isCreatureTarget = (intentPackage.tempo || intentPackage.archetype || '').toLowerCase().includes('ramp') || (intentPackage.primaryTribe && intentPackage.primaryTribe !== 'none');
      const isSymmetricalDamage = (oracle.includes('deals 1 damage to each creature') || oracle.includes('deals 2 damage to each creature') || oracle.includes('deals 3 damage to each creature') || oracle.includes('damage to each creature without')) && !oracle.includes('opponents control') && !oracle.includes("you don't control");
      
      if (isSymmetricalDamage && isCreatureTarget) {
        rampVelocityDelta -= 4.0; // Symmetrical damage wiping friendly creatures
      } else if (cmc === 1) {
        rampVelocityDelta += 3.0; // Turn 1 dork / accelerator (Llanowar Elves, Elvish Mystic, Delighted Halfling, Bushwhack)
      } else if (cmc === 2) {
        rampVelocityDelta += 2.0; // Turn 2 ramp (Armored Scrapgorger, Paradise Druid, Ilysian Caryatid, Rampant Growth)
      } else if (cmc >= 3) {
        rampVelocityDelta -= 0.5; // 3+ CMC ramp is slower
      }
    }

    // 9. Elite Interaction Evaluation (with Diminishing Returns after Saturation)
    const isInteractionSlot = slotRole.includes('removal') || slotRole.includes('counter') || slotRole.includes('disruption') || slotRole.includes('interaction') || slotRole.includes('sweeper');
    const interactionEval = this.evaluateInteractionQuality(candidate, strategicContract);
    const existingInteractions = currentState.interactionCount || (currentState.cards || []).filter(c => {
      const t = (c.oracle_text || c.cardObj?.oracle_text || '').toLowerCase();
      return t.includes('destroy') || t.includes('exile') || t.includes('damage') || t.includes('counter target');
    }).reduce((sum, c) => sum + Number(c.quantity || c.count || 1), 0);

    let interactionBonus = 0;
    if (interactionEval.isInteraction) {
      const isInstantSpeed = type.includes('instant') || (candidate.oracle_text || candidate.text || '').toLowerCase().includes('flash');
      const timingBonus = isInstantSpeed ? 1.5 : 0.3;
      const saturationFactor = existingInteractions >= 6 ? Math.max(0.1, 1.0 - (existingInteractions - 6) * 0.15) : 1.0;
      interactionBonus = (((interactionEval.score || 0) * 0.8) + timingBonus) * saturationFactor;
      if (isInteractionSlot) {
        interactionBonus += (interactionEval.score || 0) * 0.7;
      }
    }

    // 10. Friend Power Friction Mitigation
    const frictionPenalty = this.evaluateFriendPowerFriction(candidate, intentPackage);

    // 11. Redundancy Delta
    const currentCopies = existingCards
      .filter(c => (c.name === candidate.name || (c.card && c.card.name === candidate.name)))
      .reduce((sum, c) => sum + Number(c.quantity || c.count || 1), 0);

    const redundancyDelta = {
      currentCopies,
      isLegendary: Boolean(candidate.type_line?.toLowerCase().includes('legendary')),
      redundancyPenalty: currentCopies >= 4 ? 5.0 : (candidate.type_line?.toLowerCase().includes('legendary') && currentCopies >= 2 ? 1.5 : 0)
    };

    // 12. Dynamic State Target-Scaled Synergy Delta
    const onTribeTargetsInState = existingCards.filter(c => {
      const tLine = (c.type_line || c.type || '').toLowerCase();
      return rawTribe && tLine.includes(rawTribe);
    }).reduce((sum, c) => sum + (c.quantity || 1), 0);

    let scaledSynergyBonus = 0;
    if (!isInteractionSlot) {
      if (tribalContribution.isAmplifier) {
        scaledSynergyBonus += 0.8 + Math.min(2.5, onTribeTargetsInState * 0.15);
      }
      if (tribalContribution.isPayoff) {
        scaledSynergyBonus += 0.5 + Math.min(1.5, onTribeTargetsInState * 0.10);
      }
      if (tribalContribution.isEngine) {
        scaledSynergyBonus += 0.6 + Math.min(1.5, onTribeTargetsInState * 0.10);
      }
    }

    // Calculate Layered Scores for Lexicographic Pareto Ranking
    const stateDeltaScore = Number((
      (isInteractionSlot ? 0 : (winPathNodesProven.length * 1.0)) +
      (isInteractionSlot ? 0 : (needsClosed.filter(n => n !== 'NON_CREATURE_DENSITY_MISMATCH').length * 0.8)) +
      (curveHealthImpact * 0.5) +
      (curveExec.marginalStateGain * 0.7) +
      tempoClockDelta +
      rampVelocityDelta +
      interactionBonus +
      scaledSynergyBonus +
      deficitClosureGain -
      frictionPenalty -
      redundancyDelta.redundancyPenalty
    ).toFixed(2));

    const synergyScore = Number((
      (isInteractionSlot ? 0 : (causalEdgesAdded.length * 0.4)) +
      scaledSynergyBonus
    ).toFixed(2));

    return {
      candidate,
      roleProof,
      tribalContribution,
      stateDeltaScore,
      synergyScore,
      winPathNodesProven,
      needsClosed,
      closedDeficits,
      causalEdgesAdded,
      demandsSatisfiedByExistingState,
      newDemands,
      curveDelta: { healthImpact: curveHealthImpact },
      curveExec,
      interactionEval,
      frictionPenalty,
      redundancyDelta,
      tempoClockDelta,
      opportunityCost: { isDominated: !roleProof.roleValidity || !demandsSatisfiedByExistingState }
    };
  }

  /**
   * Evaluates the objective execution quality of an interaction spell.
   */
  static evaluateInteractionQuality(candidate, strategicContract = {}) {
    const text = (candidate.oracle_text || candidate.oracleText || candidate.text || '').toLowerCase();
    const type = (candidate.type_line || candidate.typeLine || candidate.type || '').toLowerCase();
    const cmc = Number(candidate.cmc || candidate.mana_value || 0);
    const isCreature = type.includes('creature');

    // Incidental death triggers or player-only pings on creatures are NOT survival interaction
    const isOnlyPlayerDamage = (text.includes('target player') || text.includes('target opponent') || text.includes('each opponent')) &&
                               !text.includes('any target') && !text.includes('target creature') && !text.includes('target permanent') && !text.includes('target nonland');

    if (isCreature && (isOnlyPlayerDamage || (text.includes('when') && text.includes('dies') && !text.includes('destroy target')))) {
      return { isInteraction: false, score: 0 };
    }

    const isDirectRemoval = text.includes('destroy target') ||
                            text.includes('exile target') ||
                            text.includes('counter target') ||
                            text.includes('fights target') ||
                            text.includes('target creature gets -') ||
                            text.includes('damage to any target') ||
                            text.includes('damage to target creature') ||
                            text.includes('damage to target permanent') ||
                            text.includes('damage to each creature') ||
                            candidate.role === 'CHEAP_REMOVAL' ||
                            candidate.role === 'REMOVAL';

    if (!isDirectRemoval) {
      return { isInteraction: false, score: 0 };
    }

    let quality = 1.0;

    // Speed bonus: Instant or Flash is premier interaction
    if (type.includes('instant') || text.includes('flash')) {
      quality += 1.5;
    }

    // Mana efficiency
    if (cmc <= 1) quality += 2.2;
    else if (cmc === 2) quality += 1.6;
    else if (cmc === 3) quality += 0.6;
    else quality -= (cmc - 3) * 0.9;

    // Damage & Kill Potency
    const isHardKill = text.includes('destroy target') || text.includes('exile target') || text.includes('target creature gets -');
    const is3PlusDamage = /deals?\s+([3-9]|\d{2,}|x)\s+damage/i.test(text);
    const is2Damage = /deals?\s+2\s+damage/i.test(text);
    const is1DamagePing = /deals?\s+1\s+damage/i.test(text) && !is3PlusDamage && !isHardKill && !is2Damage;

    if (isHardKill) {
      quality += 2.0;
    } else if (is3PlusDamage) {
      quality += 1.6;
    } else if (is2Damage) {
      quality += 1.2;
    } else if (is1DamagePing) {
      quality -= 1.8;
    }

    // Broad target scope
    const isBroad = text.includes('any target') || text.includes('target nonland permanent') || text.includes('target creature or planeswalker');
    const isStandardCreature = text.includes('target creature');
    const isNarrow = (text.includes('target artifact') && !text.includes('creature')) || (text.includes('creature with flying') && !text.includes('any target'));

    if (isBroad) quality += 1.5;
    else if (isStandardCreature) quality += 1.0;
    else if (isNarrow) quality -= 1.5;

    return { isInteraction: true, score: Number(quality.toFixed(2)) };
  }

  /**
   * Evaluates non-game / solitaire friction cost when playing with friends.
   */
  static evaluateFriendPowerFriction(candidate, intentPackage = {}) {
    const solitaireTol = intentPackage.solitaireTolerance || 'LOW';
    const frustTol = intentPackage.frustrationTolerance || 'LOW';
    if (solitaireTol === 'HIGH' && frustTol === 'HIGH') return 0;

    const text = (candidate.oracle_text || candidate.oracleText || candidate.text || '').toLowerCase();
    let friction = 0;

    if (text.includes('take an extra turn') || text.includes('extra turn after this')) {
      friction += 2.5;
    }
    if (text.includes("players can't cast spells") || text.includes("can't activate abilities of") || text.includes("skip their untap step")) {
      friction += 3.0; // Hard lockout non-games
    }

    return friction;
  }

  /**
   * Detects whether candidate acts as an emergent bridge between distinct functional domains.
   * BRIDGE is defined as cross-domain causal connectivity that improves the global state
   * without creating unresolved hard demands and preserving/advancing the WinPath.
   */
  static detectCrossDomainBridge(candidate, currentState, strategicContract, needsClosed = [], winPathNodesProven = []) {
    const candidateDomains = this.identifyCardDomains(candidate);
    if (candidateDomains.length < 2) {
      return { isBridge: false, fromDomain: null, toDomain: null, causalEdgesAdded: [], winPathNodesImproved: [] };
    }

    const fromDomain = candidateDomains[0];
    const toDomain = candidateDomains[1];

    const causalEdgesAdded = [
      `${candidate.name} (${fromDomain}) -> CONNECTS -> (${toDomain})`
    ];

    for (const need of needsClosed) {
      causalEdgesAdded.push(`${candidate.name} -> RESOLVES(${need})`);
    }

    return {
      isBridge: true,
      fromDomain,
      toDomain,
      causalEdgesAdded,
      winPathNodesImproved: [...winPathNodesProven]
    };
  }

  /**
   * Identifies functional domains provided by a card based on Oracle text, capabilities and types.
   */
  static identifyCardDomains(card) {
    const domains = [];
    const text = (card.oracle_text || card.text || '').toLowerCase();
    const type = (card.type_line || card.type || '').toLowerCase();

    if (type.includes('creature') && (type.includes('—') || type.includes('-'))) {
      const subtypes = type.split(/—|-/)[1]?.trim() || '';
      if (subtypes.length > 0) domains.push('TRIBAL_ENGINE');
    }
    if (text.includes('destroy') || text.includes('exile') || text.includes('deals damage to') || text.includes('counter target')) {
      domains.push('INTERACTION');
    }
    if (text.includes('draw') || text.includes('look at the top') || text.includes('investigate')) {
      domains.push('CARD_FLOW');
    }
    if (text.includes('add ') || text.includes('search your library for a land') || text.includes('treasure')) {
      domains.push('RAMP_INFRASTRUCTURE');
    }
    if (text.includes('sacrifice') || text.includes('dies') || text.includes('graveyard')) {
      domains.push('SACRIFICE_RECURSION');
    }
    if (text.includes('whenever') && (text.includes('+1/+1') || text.includes('token') || text.includes('gain life') || text.includes('loses life'))) {
      domains.push('SYNERGY_PAYOFF');
    }
    if (text.includes('hexproof') || text.includes('ward') || text.includes('indestructible') || text.includes('protection from')) {
      domains.push('PROTECTION');
    }

    return [...new Set(domains)];
  }

  /**
   * Computes a dominance vector for deterministic multi-dimensional Pareto ordering (v26.1).
   */
  static computeDominanceVector(delta) {
    const roleProof = delta.roleProof || { roleValidity: true, roleQuality: 0.5, rejectionReason: null, evidence: {} };
    const tribalContribution = delta.tribalContribution || { isMember: false, isEnabler: false, isAmplifier: false, isEngine: false, isPayoff: false };
    const hasUnsupportedDemands = !delta.demandsSatisfiedByExistingState;
    const isDominated = !roleProof.roleValidity || hasUnsupportedDemands;
    const closedDeficitsCount = delta.closedDeficits?.length || 0;

    const netUtility = (roleProof.roleValidity ? 10.0 : -50.0) +
                       (roleProof.roleQuality * 5.0) +
                       delta.stateDeltaScore +
                       delta.synergyScore +
                       (closedDeficitsCount * 4.0) -
                       (hasUnsupportedDemands ? 20.0 : 0);

    return {
      netUtility: Number(netUtility.toFixed(2)),
      roleValidity: roleProof.roleValidity,
      rejectionReason: roleProof.rejectionReason,
      roleQuality: roleProof.roleQuality,
      closedDeficitsCount,
      stateDeltaScore: delta.stateDeltaScore,
      synergyScore: delta.synergyScore,
      hasUnsupportedDemands,
      isDominated,
      evidence: roleProof.evidence,
      tribalContribution,
      winPathProvenCount: delta.winPathNodesProven?.length || 0,
      needsClosedCount: delta.needsClosed?.length || 0,
      synergyCount: delta.causalEdgesAdded?.length || 0
    };
  }

  /**
   * Evaluates a potential orphan card through a complete contrafactual state comparison loop:
   * State A' = State without Card X
   * State B' = State without Card X + Candidate B
   * State C  = State without Card X + NO_ADDITION
   * 
   * @returns {Object} { decision: 'RESTORE_X' | 'REPLACE' | 'KEEP_REMOVED', winningCard, stateDelta }
   */
  static evaluateZeroOrphanContrafactual(currentState, potentialOrphanCard, alternativeCandidates = [], strategicContract = {}) {
    // 1. Compute baseline State A' (without Card X)
    const cardsWithoutX = (currentState.cards || []).filter(c => {
      const name = c.name || (c.card && c.card.name);
      return name !== potentialOrphanCard.name;
    });
    const stateWithoutX = { ...currentState, cards: cardsWithoutX };

    // 2. Compute State A' validity (does Thesis / WinPath remain proven without X?)
    const deltaWithoutX = this.computeStateDelta(stateWithoutX, potentialOrphanCard, strategicContract);

    // 3. Rank alternative candidates for replacement
    const replacementEvaluation = this.rankCandidatesByStateDelta(stateWithoutX, alternativeCandidates, strategicContract);

    if (replacementEvaluation.winningCandidate && replacementEvaluation.winningCandidate.name !== potentialOrphanCard.name) {
      const bestAlternative = replacementEvaluation.evaluatedStates[0];
      if (bestAlternative && bestAlternative.dominanceVector.netUtility > deltaWithoutX.dominanceVector?.netUtility) {
        return {
          decision: 'REPLACE',
          winningCard: replacementEvaluation.winningCandidate,
          stateDelta: replacementEvaluation.stateDelta,
          reason: `El candidato ${replacementEvaluation.winningCandidate.name} produce un estado causal contrafácticamente superior al reemplazar a ${potentialOrphanCard.name}.`
        };
      }
    }

    // If removing Card X degrades the state and no replacement dominates, restore Card X
    return {
      decision: 'RESTORE_X',
      winningCard: potentialOrphanCard,
      stateDelta: deltaWithoutX,
      reason: `La presencia de ${potentialOrphanCard.name} está justificada causalmente por ser el ocupante dominante del estado.`
    };
  }

  /**
   * Compares two dominance vectors deterministically through strict 9-Layer Lexicographic Pareto criteria (v28.3).
   * Hierarchy:
   * 1. ROLE VALIDITY (Strict Gate)
   * 2. DEMAND/SUPPLY INTEGRITY (Zero broken demands)
   * 3. PROOF OBLIGATION CLOSURE (Closing open State Deficits vs adding redundant pieces)
   * 4. ROLE QUALITY (Intrinsic Functional Execution for the Obligation)
   * 5. STATE EXECUTION (Empirical Simulation Playability & Curve Velocity)
   * 6. WINPATH QUALITY (Empirical Lethal/WinPath Success)
   * 7. RESILIENCE (Adversarial Survival & Recovery)
   * 8. STRATEGIC STATE DELTA (Impact on deck state & tempo clock)
   * 9. SYNERGY & TRIBAL VALUE (Structural & tribal synergy)
   * 10. PLAY EXPERIENCE (Pacto de Amigos Tie-Breaker)
   */
  static compareDominanceVectors(a, b) {
    const aValid = a?.roleValidity === true;
    const bValid = b?.roleValidity === true;

    // Layer 1: ROLE VALIDITY (Strict Gate)
    if (aValid !== bValid) {
      return aValid ? 1 : -1;
    }
    if (!aValid && !bValid) {
      return (a?.netUtility || 0) - (b?.netUtility || 0);
    }

    // Layer 2: UNSUPPORTED DEMANDS (DemandSupplyLedger Integrity)
    const aDemands = Boolean(a?.hasUnsupportedDemands);
    const bDemands = Boolean(b?.hasUnsupportedDemands);
    if (aDemands !== bDemands) {
      return aDemands ? -1 : 1;
    }

    // Layer 3: PROOF OBLIGATION CLOSURE (State Deficit Resolution)
    const aDeficits = Number(a?.closedDeficitsCount || 0);
    const bDeficits = Number(b?.closedDeficitsCount || 0);
    if (aDeficits !== bDeficits) {
      return aDeficits > bDeficits ? 1 : -1;
    }

    // Layer 4: ROLE QUALITY (Intrinsic Functional Execution for the Obligation)
    const aQuality = Number(a?.roleQuality || 0);
    const bQuality = Number(b?.roleQuality || 0);
    const qualityDiff = aQuality - bQuality;
    if (Math.abs(qualityDiff) >= 0.15) {
      return qualityDiff > 0 ? 1 : -1;
    }

    // Layer 5: STATE EXECUTION (Empirical Simulation Playability & Curve Velocity)
    const aExec = Number(a?.stateExecution ?? a?.stateDeltaScore ?? 0);
    const bExec = Number(b?.stateExecution ?? b?.stateDeltaScore ?? 0);
    const execDiff = aExec - bExec;
    if (Math.abs(execDiff) >= 0.15) {
      return execDiff > 0 ? 1 : -1;
    }

    // Layer 6: WINPATH QUALITY (Empirical Lethal / Node Closure)
    const aWin = Number(a?.winPathQuality ?? 0);
    const bWin = Number(b?.winPathQuality ?? 0);
    const winDiff = aWin - bWin;
    if (Math.abs(winDiff) >= 0.15) {
      return winDiff > 0 ? 1 : -1;
    }

    // Layer 7: RESILIENCE (Recovery Probability & Adversarial Survival)
    const aRes = Number(a?.resilienceScore ?? 0);
    const bRes = Number(b?.resilienceScore ?? 0);
    const resDiff = aRes - bRes;
    if (Math.abs(resDiff) >= 0.15) {
      return resDiff > 0 ? 1 : -1;
    }

    // Layer 8: STRATEGIC STATE DELTA (Impact on deck state & tempo clock)
    const aState = Number(a?.stateDeltaScore || 0);
    const bState = Number(b?.stateDeltaScore || 0);
    const stateDiff = aState - bState;
    if (Math.abs(stateDiff) >= 0.20) {
      return stateDiff > 0 ? 1 : -1;
    }

    // Layer 9: SYNERGY & TRIBAL VALUE
    const aSynergy = Number(a?.synergyScore || 0);
    const bSynergy = Number(b?.synergyScore || 0);
    const synergyDiff = aSynergy - bSynergy;
    if (Math.abs(synergyDiff) >= 0.10) {
      return synergyDiff > 0 ? 1 : -1;
    }

    // Layer 10: PLAY EXPERIENCE (Pacto de Amigos Tie-Breaker)
    const aExp = Number(a?.experienceScore ?? 0);
    const bExp = Number(b?.experienceScore ?? 0);
    const expDiff = aExp - bExp;
    if (Math.abs(expDiff) >= 0.10) {
      return expDiff > 0 ? 1 : -1;
    }

    // Fallback: Net utility
    return (Number(a?.netUtility) || 0) - (Number(b?.netUtility) || 0);
  }

  static isStrictlyDominatedBy(evaluatedA, evaluatedB) {
    const vecA = evaluatedA.dominanceVector;
    const vecB = evaluatedB.dominanceVector;

    if (!vecA.roleValidity && vecB.roleValidity) return true;
    if (vecA.hasUnsupportedDemands && !vecB.hasUnsupportedDemands) return true;

    return (
      vecB.roleQuality >= vecA.roleQuality &&
      vecB.stateDeltaScore >= vecA.stateDeltaScore &&
      vecB.synergyScore > vecA.synergyScore
    );
  }

  static extractCharacterRoot(name = '') {
    if (!name) return '';
    // Extracts root character name before commas (e.g. "Krenko, Baron of Tin Street" -> "krenko")
    const parts = name.toLowerCase().split(',');
    return parts[0].trim();
  }

  static matchesNodeRequirement(card, node) {
    const cardText = (card.oracle_text || card.oracleText || card.text || '').toLowerCase();
    const typeLine = (card.type_line || card.typeLine || card.type || '').toLowerCase();
    const nodeStr = (typeof node === 'string' ? node : (node.id || node.name || '')).toLowerCase();
    const cmc = Number(card.cmc || card.mana_value || 0);

    if (nodeStr.includes('ramp') || nodeStr.includes('mana')) {
      return cardText.includes('add ') || cardText.includes('search your library for a') || (cmc <= 2 && typeLine.includes('creature') && cardText.includes('mana'));
    }
    if (nodeStr.includes('cheap_removal') || nodeStr.includes('cheap removal')) {
      const isRemoval = cardText.includes('destroy target') || cardText.includes('exile target') || cardText.includes('deals ') || cardText.includes('counter target') || cardText.includes('target creature gets -');
      return isRemoval && cmc <= 3;
    }
    if (nodeStr.includes('sweeper') || nodeStr.includes('board_wipe')) {
      return cardText.includes('destroy all') || cardText.includes('exile all') || cardText.includes('all creatures get -');
    }
    if (nodeStr.includes('removal') || nodeStr.includes('interaction')) {
      return cardText.includes('destroy') || cardText.includes('exile') || cardText.includes('damage') || cardText.includes('counter target');
    }
    if (nodeStr.includes('tribal_density') || nodeStr.includes('board_presence') || nodeStr.includes('creature')) {
      return typeLine.includes('creature');
    }
    if (nodeStr.includes('burn') || nodeStr.includes('reach') || nodeStr.includes('player_targetable')) {
      return cardText.includes('deals damage to any target') || cardText.includes('deals damage to target player') || cardText.includes('deals damage to target opponent') || cardText.includes('each opponent loses');
    }
    if (nodeStr.includes('draw') || nodeStr.includes('advantage') || nodeStr.includes('card_flow')) {
      return cardText.includes('draw') || cardText.includes('look at the top');
    }
    if (nodeStr.includes('sacrifice') || nodeStr.includes('sac_outlet')) {
      return cardText.includes('sacrifice a') || cardText.includes('sacrifice another');
    }
    if (nodeStr.includes('fodder') || nodeStr.includes('token')) {
      return (cardText.includes('create') && cardText.includes('token')) || (cmc <= 1 && typeLine.includes('creature'));
    }
    return false;
  }

  static candidateSatisfiesDemand(card, demand) {
    return this.matchesNodeRequirement(card, demand);
  }

  static cardsHaveSynergy(cardA, cardB) {
    const textA = (cardA.oracle_text || cardA.text || '').toLowerCase();
    const textB = (cardB.oracle_text || cardB.text || '').toLowerCase();
    const typeA = (cardA.type_line || cardA.type || '').toLowerCase();
    const typeB = (cardB.type_line || cardB.type || '').toLowerCase();

    // Tribal synergies
    const subtypesA = typeA.split('—')[1] || '';
    const subtypesB = typeB.split('—')[1] || '';
    const wordsA = subtypesA.split(' ').filter(w => w.length > 2);
    for (const word of wordsA) {
      if (textB.includes(word) || textA.includes(word)) return true;
    }

    // Mechanical synergies (Sacrifice <-> Dies/Graveyard, Artifacts <-> Affinity/Bargain, Counters <-> Proliferate)
    if (textA.includes('sacrifice') && (textB.includes('dies') || textB.includes('graveyard') || textB.includes('descend'))) return true;
    if (textB.includes('sacrifice') && (textA.includes('dies') || textA.includes('graveyard') || textA.includes('descend'))) return true;
    if ((typeA.includes('artifact') || textA.includes('treasure')) && (textB.includes('artifact') || textB.includes('bargain'))) return true;
    if ((typeB.includes('artifact') || textB.includes('treasure')) && (textA.includes('artifact') || textA.includes('bargain'))) return true;

    return false;
  }

  static evaluateCurveImpact(cmc, currentCountAtCmc, archetype = 'Aggro') {
    const arch = (archetype || 'Aggro').toLowerCase();
    if (arch.includes('aggro')) {
      if (cmc === 1) return currentCountAtCmc < 12 ? 1.0 : (currentCountAtCmc < 16 ? 0.5 : -0.2);
      if (cmc === 2) return currentCountAtCmc < 14 ? 1.0 : (currentCountAtCmc < 18 ? 0.3 : -0.5);
      if (cmc === 3) return currentCountAtCmc < 8 ? 0.8 : (currentCountAtCmc < 12 ? 0.1 : -0.8);
      if (cmc >= 4) return currentCountAtCmc < 4 ? 0.2 : -1.0;
    }
    if (arch.includes('control')) {
      if (cmc === 1 || cmc === 2) return currentCountAtCmc < 14 ? 1.0 : 0.4;
      if (cmc === 3 || cmc === 4) return currentCountAtCmc < 12 ? 0.9 : 0.2;
      if (cmc >= 5) return currentCountAtCmc < 6 ? 0.5 : -0.5;
    }
    return currentCountAtCmc < 8 ? 0.7 : 0.1;
  }

  static isStrictlyDominatedCard(candidate, existingCards) {
    const cmc = Number(candidate.cmc || candidate.mana_value || 0);
    const power = Number(candidate.power || 0);
    const toughness = Number(candidate.toughness || 0);
    const text = (candidate.oracle_text || candidate.text || '').trim();

    if (cmc >= 4 && power <= 2 && toughness <= 2 && text.length === 0) {
      return true;
    }
    return false;
  }
}
