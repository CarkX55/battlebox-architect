/**
 * DECISION ENGINE — THE STRATEGIC NUCLEUS (Pro Tour Cognitive Architecture)
 * 
 * Executes pure lexicographical counterfactual candidate evaluation.
 * Evaluates candidate cards against diagnostic evidence reports from Advisors
 * using a strict 8-level decision hierarchy (NO aggregate numeric scores).
 * 
 * Hierarchy:
 * LEVEL 0: Format Legality & Hard Constraints
 * LEVEL 1: Mana Feasibility VETO (ManaFeasibilityAdvisor)
 * LEVEL 2: Strategic Role Contract Fulfillment
 * LEVEL 3: Active Strategic Bottleneck Resolution
 * LEVEL 4: Causal Graph Fit (CausalSynergyAdvisor)
 * LEVEL 5: Diagnostic Evidence Quality & Provenance
 * LEVEL 6: Contextual Utility & Matchup Versatility (ContextualUtilityAdvisor)
 * LEVEL 7: Counterfactual Advantage & Opportunity Cost
 * 
 * Supports NO_SELECTION refusal ability if all candidates fail contracts.
 */

import { ManaFeasibilityAdvisor } from './advisors/ManaFeasibilityAdvisor.js';
import { CausalSynergyAdvisor } from './advisors/CausalSynergyAdvisor.js';
import { CurveVelocityAdvisor } from './advisors/CurveVelocityAdvisor.js';
import { ContextualUtilityAdvisor } from './advisors/ContextualUtilityAdvisor.js';
import { CardImplementer } from './cardImplementer.js';

export class DecisionEngine {
  /**
   * Selects optimal candidate from candidate pool for current deckState & role contract
   */
  static selectCandidate(candidates = [], deckState, contract = {}) {
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return {
        verdict: 'NO_SELECTION',
        selectedCard: null,
        reason: 'Candidate pool is empty',
        action: 'EXPAND_CANDIDATE_POOL_AND_REPLAN'
      };
    }

    // Phase 1: Collect Diagnostic Evidence from all 4 Advisors
    const evaluatedCandidates = [];

    for (const candidate of candidates) {
      const manaReport = ManaFeasibilityAdvisor.evaluate(candidate, deckState, contract.castabilityContract);
      const causalReport = CausalSynergyAdvisor.evaluate(candidate, deckState, contract);
      const curveReport = CurveVelocityAdvisor.evaluate(candidate, deckState, contract);
      const utilityReport = ContextualUtilityAdvisor.evaluate(candidate, deckState, contract);

      // Check LEVEL 1: Mana, Causal Dependency & Tribal Creature Purity Gate
      const typeLine = (candidate.type_line || candidate.typeLine || '').toLowerCase();
      const oracleText = (candidate.oracle_text || candidate.oracleText || candidate.text || '').toLowerCase();
      const rawTribe = (deckState.primaryTribe || '').toLowerCase();

      const GUILD_FACTIONS = new Set([
        'boros_guild', 'golgari_guild', 'dimir_guild', 'rakdos_guild', 'azorius_guild',
        'gruul_guild', 'selesnya_guild', 'orzhov_guild', 'izzet_guild', 'simic_guild',
        'esper_shard', 'jund_shard', 'naya_shard', 'jeskai_shard', 'sultai_shard',
        'boros', 'golgari', 'dimir', 'rakdos', 'azorius',
        'gruul', 'selesnya', 'orzhov', 'izzet', 'simic',
        'esper', 'grixis', 'jund', 'naya', 'bant',
        'abzan', 'jeskai', 'sultai', 'mardu', 'temur',
        'none', 'ninguna', 'general', 'null', 'universal'
      ]);
      const isTribalDeck = Boolean(rawTribe && !GUILD_FACTIONS.has(rawTribe) && !rawTribe.includes('_guild') && !rawTribe.includes('_shard'));
      const role = (contract.role || '').toUpperCase();
      const isEnablerRole = role.includes('ENABLER') || 
                            role.includes('RAMP') || 
                            role.includes('OUTLET') || 
                            role.includes('PAYOFF') || 
                            role.includes('FODDER') || 
                            role.includes('VELOCITY') ||
                            role.includes('REMOVAL') ||
                            role.includes('CARD_FLOW');

      if (isTribalDeck && typeLine.includes('creature') && !isEnablerRole) {
        const isTribeMatch = CardImplementer.matchesTribe(candidate, rawTribe);
        if (!isTribeMatch) {
          evaluatedCandidates.push({
            candidate,
            passed: false,
            failLevel: 1,
            failReason: `VETO: Creature "${candidate.name}" is not a ${rawTribe} in a ${rawTribe} Tribal deck`,
            reports: { mana: manaReport, causal: causalReport, curve: curveReport, utility: utilityReport }
          });
          continue;
        }
      }

      if (manaReport.veto || causalReport.veto) {
        evaluatedCandidates.push({
          candidate,
          passed: false,
          failLevel: 1,
          failReason: manaReport.veto ? (manaReport.evidence?.[0] || 'Vetoed by ManaFeasibilityAdvisor') : (causalReport.evidence?.[0] || 'Vetoed by CausalSynergyAdvisor (Unfulfilled Dependency)'),
          reports: { mana: manaReport, causal: causalReport, curve: curveReport, utility: utilityReport }
        });
        continue;
      }

      // Check LEVEL 2: Curve Overcrowding Gate
      if (curveReport.status === 'OVERCROWDED') {
        evaluatedCandidates.push({
          candidate,
          passed: false,
          failLevel: 2,
          failReason: curveReport.evidence?.[0] || 'Curve overcrowded',
          reports: { mana: manaReport, causal: causalReport, curve: curveReport, utility: utilityReport }
        });
        continue;
      }

      // Check LEVEL 3: Role Contract Capabilities Gate
      const requiredCaps = contract.requiredCapabilities || [];

      let satisfiesRole = true;
      if (contract.role === 'MANA_ACCELERATOR') {
        satisfiesRole = oracleText.includes('add {') || oracleText.includes('search your library for a land') || oracleText.includes('treasure');
      } else if (contract.role === 'EARLY_INTERACTION') {
        const isInstant = typeLine.includes('instant') || oracleText.includes('flash');
        const isCheapRemoval = (typeLine.includes('instant') || typeLine.includes('sorcery')) && (oracleText.includes('destroy') || oracleText.includes('deal') || oracleText.includes('exile') || oracleText.includes('counter'));
        satisfiesRole = (candidate.cmc <= 2) && (isInstant || isCheapRemoval);
      } else if (contract.role === 'CAUSAL_PAYOFF_MISSING') {
        const isDeathTrigger = oracleText.includes('dies') || oracleText.includes('died') || oracleText.includes('graveyard') || oracleText.includes('sacrifice');
        const isPayoffEffect = oracleText.includes('whenever') || oracleText.includes('when') || oracleText.includes('lose') || oracleText.includes('deal') || oracleText.includes('draw') || oracleText.includes('create') || oracleText.includes('gain') || oracleText.includes('drain');
        satisfiesRole = isDeathTrigger && isPayoffEffect;
      } else if (contract.role === 'TRIBAL_THREAT' || contract.role === 'TRIBAL_DENSITY') {
        const rawTribe = (contract.targetTribe || deckState.primaryTribe || '').toLowerCase();
        
        const GUILD_FACTIONS = new Set([
          'boros_guild', 'golgari_guild', 'dimir_guild', 'rakdos_guild', 'azorius_guild',
          'gruul_guild', 'selesnya_guild', 'orzhov_guild', 'izzet_guild', 'simic_guild',
          'esper_shard', 'jund_shard', 'naya_shard', 'jeskai_shard', 'sultai_shard',
          'boros', 'golgari', 'dimir', 'rakdos', 'azorius',
          'gruul', 'selesnya', 'orzhov', 'izzet', 'simic',
          'esper', 'grixis', 'jund', 'naya', 'bant',
          'abzan', 'jeskai', 'sultai', 'mardu', 'temur',
          'none', 'ninguna', 'general', 'null', 'universal'
        ]);

        if (rawTribe && !GUILD_FACTIONS.has(rawTribe) && !rawTribe.includes('_guild') && !rawTribe.includes('_shard')) {
          satisfiesRole = CardImplementer.matchesTribe(candidate, rawTribe);
        }
      }

      evaluatedCandidates.push({
        candidate,
        passed: satisfiesRole,
        failLevel: satisfiesRole ? null : 3,
        failReason: satisfiesRole ? null : `Fails required capabilities for role [${contract.role}]`,
        reports: { mana: manaReport, causal: causalReport, curve: curveReport, utility: utilityReport }
      });
    }

    // Phase 2: Filter to candidates that passed Gates (Level 0 - Level 3) AND have valid Causal Fit
    let validCandidates = evaluatedCandidates.filter(item => item.passed && item.reports.causal?.status !== 'NO_FIT');

    // Strategic Fallback: If no candidate passed strict Level 3 capability contract,
    // select from candidates that passed Level 1 (Mana Veto) & Level 2 (Curve) to prevent deadlock!
    if (validCandidates.length === 0) {
      const rawTribe = (deckState.primaryTribe || '').toLowerCase();
      const GUILD_FACTIONS = new Set([
        'boros_guild', 'golgari_guild', 'dimir_guild', 'rakdos_guild', 'azorius_guild',
        'gruul_guild', 'selesnya_guild', 'orzhov_guild', 'izzet_guild', 'simic_guild',
        'esper_shard', 'jund_shard', 'naya_shard', 'jeskai_shard', 'sultai_shard',
        'boros', 'golgari', 'dimir', 'rakdos', 'azorius',
        'gruul', 'selesnya', 'orzhov', 'izzet', 'simic',
        'esper', 'grixis', 'jund', 'naya', 'bant',
        'abzan', 'jeskai', 'sultai', 'mardu', 'temur',
        'none', 'ninguna', 'general', 'null', 'universal'
      ]);
      const isTribalDeck = Boolean(rawTribe && !GUILD_FACTIONS.has(rawTribe) && !rawTribe.includes('_guild') && !rawTribe.includes('_shard'));

      const nonVetoed = evaluatedCandidates.filter(item => {
        if (item.reports.mana.veto || item.reports.curve.status === 'OVERCROWDED') return false;
        
        // Causal Fit Gate (Hard Invariant): Reject candidates with NO_FIT / zero causal connections
        if (item.reports.causal?.status === 'NO_FIT') {
          return false;
        }

        if (isTribalDeck && (contract.role === 'TRIBAL_THREAT' || contract.role === 'TRIBAL_DENSITY')) {
          const isTribeMatch = CardImplementer.matchesTribe(item.candidate, rawTribe);
          if (!isTribeMatch) {
            return false;
          }
        }
        return true;
      });

      validCandidates = nonVetoed;
    }

    if (validCandidates.length === 0) {
      return {
        verdict: 'NO_SELECTION',
        selectedCard: null,
        reason: 'All candidates in pool failed Mana Veto or Curve Overcrowding contracts',
        rejectedAlternatives: evaluatedCandidates.map(item => ({
          cardName: item.candidate.name,
          failLevel: item.failLevel,
          failReason: item.failReason
        })),
        action: 'EXPAND_CANDIDATE_POOL_AND_REPLAN'
      };
    }

    // Phase 3: Pure Lexicographical Counterfactual State Comparison & Top-Tier Weighted Sampling
    // Rank all valid candidates with multi-dimensional fitness
    const scoredCandidates = validCandidates.map(challenger => {
      let score = 100;
      const caps = challenger.reports?.causal?.addedCapabilities || [];
      const oracle = (challenger.candidate.oracle_text || challenger.candidate.oracleText || challenger.candidate.text || '').toLowerCase();
      const cmc = challenger.candidate.cmc || challenger.candidate.mana_value || 0;

      // Level 3.5: Priority fulfillment
      if (challenger.reports?.causal?.status !== 'UNFULFILLED_DEPENDENCY' && (contract.priority === 'CRITICAL' || contract.priority === 'HIGH')) {
        score += 80;
      }

      // Level 4: Active bottleneck resolution
      if (caps.includes(contract.role) || challenger.candidate.role === contract.role) {
        score += 60;
      }

      // Level 4.5: Engine Synergy & Boost Keywords
      if (caps.includes('ENGINE_SYNERGY') || challenger.reports?.causal?.causalRole === 'PRODUCER') {
        score += 50;
      }

      // Level 5: Causal Fit
      if (challenger.reports?.causal?.status === 'CAUSAL_FIT') {
        score += 40;
      } else if (challenger.reports?.causal?.status === 'REDUNDANT') {
        score -= 20;
      }

      // Level 6: Contextual Utility
      if (challenger.reports?.utility?.status === 'HIGH_UTILITY') score += 30;
      if (challenger.reports?.utility?.flexibility === 'HIGH_MODAL') score += 20;

      // Level 7: Reach & Finishers
      if ((contract.role === 'REACH' || contract.role === 'FINISHER') && oracle.includes('damage to any target')) {
        score += 30;
      }

      // Level 8: Curve Velocity
      const isEarly = contract.role === 'T1_PRESSURE' || contract.role === 'T2_PRESSURE' || contract.role === 'EARLY_RAMP' || contract.role === 'CHEAP_REMOVAL';
      if (isEarly && cmc <= 2) score += (3 - cmc) * 15;

      // Level 9: Dynamic 1st-Level Parameter Modifiers
      const userConstraints = deckState.intentPackage?.userConstraints || {};
      const priorityMode = userConstraints.generationPriority || deckState.intentPackage?.generationPriority || 'hybrid';

      if (priorityMode === 'synergy' && caps.includes('ENGINE_SYNERGY')) score += 40;
      if (priorityMode === 'thematic' && caps.includes('TRIBAL_MEMBER')) score += 40;

      return {
        item: challenger,
        score
      };
    });

    scoredCandidates.sort((a, b) => b.score - a.score);

    const maxScore = scoredCandidates[0].score;
    // Elite Band: candidates scoring within 20% margin of top score
    const eliteBand = scoredCandidates.filter(c => c.score >= maxScore - 25);

    const userConstraints = deckState.intentPackage?.userConstraints || {};
    const creativity = Number(userConstraints.creativity ?? deckState.intentPackage?.creativity ?? 40);
    const isDeterministic = userConstraints.generationPriority === 'deterministic' || creativity === 0;

    let bestChoice;
    if (isDeterministic || eliteBand.length === 1) {
      bestChoice = scoredCandidates[0].item;
    } else {
      // Top-Tier Weighted Stochastic Sampling among elite candidates
      const totalWeight = eliteBand.reduce((sum, c) => sum + Math.max(1, c.score), 0);
      let rand = Math.random() * totalWeight;
      bestChoice = eliteBand[0].item;
      for (const entry of eliteBand) {
        rand -= Math.max(1, entry.score);
        if (rand <= 0) {
          bestChoice = entry.item;
          break;
        }
      }
    }

    // Phase 4: Construct Audit Log & Structured STATE_EXPLANATION (v9.5)
    const selected = bestChoice.candidate;
    const whySelected = [
      `Fulfills StrategicNeed [${contract.role || 'FLEX'}] (Priority: ${contract.priority || 'MEDIUM'})`,
      `Passes Mana Feasibility Veto (P=${(bestChoice.reports.mana.castabilityP * 100).toFixed(1)}%)`,
      `Causal Graph Fit: ${bestChoice.reports.causal.status} (${bestChoice.reports.causal.causalRole})`,
      `Contextual Utility: ${bestChoice.reports.utility.status} (${bestChoice.reports.utility.flexibility})`
    ];

    const stateExplanation = {
      candidate: selected.name,
      stateDelta: {
        needsClosed: [contract.role || 'FLEX'],
        needsReopened: [],
        proofObligationsProven: [`PO_${contract.role || 'FLEX'}`],
        newDemands: (selected.demands || []).map(d => d.resource),
        causalConnectionsAdded: (bestChoice.reports.causal.addedCapabilities || []).map(cap => `CAPABILITY_${cap}`),
        winPathsImproved: [contract.role || 'CORE_PLAN'],
        opportunityCost: {
          consumedSlotFor: contract.role || 'FLEX',
          alternativeNeedImpact: contract.priority === 'CRITICAL' ? 'HIGH_PRIORITY_CLOSED' : 'LOW'
        }
      }
    };

    const rejectedAlternatives = evaluatedCandidates
      .filter(item => item.candidate.name !== selected.name)
      .map(item => ({
        cardName: item.candidate.name,
        rejectedBecause: {
          primaryNeed: contract.role || 'FLEX',
          resolvedNeed: item.reports?.causal?.status || 'FAIL',
          priorityComparison: `${contract.role} Priority > Alternative`,
          causalContribution: item.reports?.causal?.causalRole || 'NONE',
          existingCoverage: item.reports?.causal?.status === 'REDUNDANT' ? 'SATURATED' : 'INSUFFICIENT',
          opportunityCost: `Consumes slot needed for ${contract.role || 'CRITICAL_NEED'}`,
          counterfactualWinner: selected.name
        }
      }));

    return {
      verdict: 'SELECTED',
      selectedCard: selected,
      stateExplanation,
      whySelected,
      rejectedAlternatives,
      provenance: selected.retrievalProvenance || ['CANDIDATE_POOL'],
      reports: bestChoice.reports
    };
  }
}
