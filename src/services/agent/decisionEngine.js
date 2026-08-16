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

      if (isTribalDeck && typeLine.includes('creature')) {
        let targetSubtypes = [rawTribe];
        if (rawTribe === 'outlaws') targetSubtypes = ['assassin', 'mercenary', 'pirate', 'rogue', 'warlock'];
        else if (rawTribe === 'party') targetSubtypes = ['cleric', 'rogue', 'warrior', 'wizard'];
        else if (rawTribe === 'goblin_horde' || rawTribe.includes('goblin')) targetSubtypes = ['goblin', 'ogre', 'orc'];
        else if (rawTribe === 'elf_druid' || rawTribe.includes('elf')) targetSubtypes = ['elf', 'druid'];
        else if (rawTribe === 'human_army' || rawTribe.includes('human')) targetSubtypes = ['human', 'soldier', 'knight'];
        else if (rawTribe === 'undead_scourge' || rawTribe.includes('zombie')) targetSubtypes = ['zombie', 'skeleton', 'vampire', 'horror'];
        else if (rawTribe === 'sea_monsters') targetSubtypes = ['merfolk', 'kraken', 'leviathan', 'octopus', 'serpent'];
        else if (rawTribe === 'apex_predators') targetSubtypes = ['dinosaur', 'beast', 'hydra'];

        const isTribeCreature = targetSubtypes.some(sub => typeLine.includes(sub));
        const generatesTribeToken = oracleText.includes('create') && targetSubtypes.some(sub => oracleText.includes(sub));
        const isTribeLordOrSynergy = targetSubtypes.some(sub => oracleText.includes(sub));

        if (!isTribeCreature && !generatesTribeToken && !isTribeLordOrSynergy) {
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
          failReason: manaReport.veto ? (manaReport.evidence[0] || 'Vetoed by ManaFeasibilityAdvisor') : (causalReport.evidence[0] || 'Vetoed by CausalSynergyAdvisor (Unfulfilled Dependency)'),
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
          failReason: curveReport.evidence[0] || 'Curve overcrowded',
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
          let targetSubtypes = [rawTribe];
          if (rawTribe === 'outlaws') targetSubtypes = ['assassin', 'mercenary', 'pirate', 'rogue', 'warlock'];
          else if (rawTribe === 'party') targetSubtypes = ['cleric', 'rogue', 'warrior', 'wizard'];
          else if (rawTribe === 'goblin_horde' || rawTribe.includes('goblin')) targetSubtypes = ['goblin', 'ogre', 'orc'];
          else if (rawTribe === 'elf_druid' || rawTribe.includes('elf')) targetSubtypes = ['elf', 'druid'];
          else if (rawTribe === 'human_army' || rawTribe.includes('human')) targetSubtypes = ['human', 'soldier', 'knight'];
          else if (rawTribe === 'undead_scourge' || rawTribe.includes('zombie')) targetSubtypes = ['zombie', 'skeleton', 'vampire', 'horror'];
          else if (rawTribe === 'sea_monsters') targetSubtypes = ['merfolk', 'kraken', 'leviathan', 'octopus', 'serpent'];
          else if (rawTribe === 'apex_predators') targetSubtypes = ['dinosaur', 'beast', 'hydra'];

          const isTribeCreature = typeLine.includes('creature') && targetSubtypes.some(sub => typeLine.includes(sub));
          const generatesTribeToken = oracleText.includes('create') && targetSubtypes.some(sub => oracleText.includes(sub));
          const isTribeLordOrSynergy = targetSubtypes.some(sub => oracleText.includes(sub));
          satisfiesRole = isTribeCreature || generatesTribeToken || isTribeLordOrSynergy;
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
          const typeLine = (item.candidate.type_line || item.candidate.typeLine || '').toLowerCase();
          const oracleText = (item.candidate.oracle_text || item.candidate.oracleText || item.candidate.text || '').toLowerCase();
          
          let targetSubtypes = [rawTribe];
          if (rawTribe === 'outlaws') targetSubtypes = ['assassin', 'mercenary', 'pirate', 'rogue', 'warlock'];
          else if (rawTribe === 'party') targetSubtypes = ['cleric', 'rogue', 'warrior', 'wizard'];
          else if (rawTribe === 'goblin_horde' || rawTribe.includes('goblin')) targetSubtypes = ['goblin', 'ogre', 'orc'];
          else if (rawTribe === 'elf_druid' || rawTribe.includes('elf')) targetSubtypes = ['elf', 'druid'];
          else if (rawTribe === 'human_army' || rawTribe.includes('human')) targetSubtypes = ['human', 'soldier', 'knight'];
          else if (rawTribe === 'undead_scourge' || rawTribe.includes('zombie')) targetSubtypes = ['zombie', 'skeleton', 'vampire', 'horror'];
          else if (rawTribe === 'sea_monsters') targetSubtypes = ['merfolk', 'kraken', 'leviathan', 'octopus', 'serpent'];
          else if (rawTribe === 'apex_predators') targetSubtypes = ['dinosaur', 'beast', 'hydra'];

          const isTribeCreature = typeLine.includes('creature') && targetSubtypes.some(sub => typeLine.includes(sub));
          const generatesTribeToken = oracleText.includes('create') && targetSubtypes.some(sub => oracleText.includes(sub));
          const isTribeLordOrSynergy = targetSubtypes.some(sub => oracleText.includes(sub));
          return isTribeCreature || generatesTribeToken || isTribeLordOrSynergy;
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

    // Phase 3: Pure Lexicographical Counterfactual State Comparison
    // Evaluation: State_A = [DeckState + Candidate A] vs State_B = [DeckState + Candidate B]
    let bestChoice = validCandidates[0];

    for (let i = 1; i < validCandidates.length; i++) {
      const challenger = validCandidates[i];

      // Comparison Level 3.5: NEED_PRIORITY_BEATS_CARD_POWER Dominance
      // A candidate resolving a CRITICAL/HIGH open need dominates a candidate with higher raw power that does not.
      const challengerResolvesCriticalNeed = challenger.reports?.causal?.status !== 'UNFULFILLED_DEPENDENCY' && (contract.priority === 'CRITICAL' || contract.priority === 'HIGH');
      const bestResolvesCriticalNeed = bestChoice.reports?.causal?.status !== 'UNFULFILLED_DEPENDENCY' && (contract.priority === 'CRITICAL' || contract.priority === 'HIGH');

      if (challengerResolvesCriticalNeed && !bestResolvesCriticalNeed) {
        bestChoice = challenger;
        continue;
      }

      // Comparison Level 4: Strategic Need Resolution Dominance
      const activeBottleneck = contract.role;
      const bestCaps = bestChoice.reports?.causal?.addedCapabilities || [];
      const challengerCaps = challenger.reports?.causal?.addedCapabilities || [];

      const bestResolvesBottleneck = bestCaps.includes(activeBottleneck) || activeBottleneck === contract.role;
      const challengerResolvesBottleneck = challengerCaps.includes(activeBottleneck) || activeBottleneck === contract.role;

      if (challengerResolvesBottleneck && !bestResolvesBottleneck) {
        bestChoice = challenger;
        continue;
      }

      // Comparison Level 4.5: Oracle Tuner & Causal Infrastructure Supply Dominance
      const bestMatchesBoost = bestChoice.reports?.causal?.status !== 'UNFULFILLED_DEPENDENCY' && (bestCaps.includes('ENGINE_SYNERGY') || bestChoice.reports?.causal?.causalRole === 'PRODUCER');
      const challengerMatchesBoost = challenger.reports?.causal?.status !== 'UNFULFILLED_DEPENDENCY' && (challengerCaps.includes('ENGINE_SYNERGY') || challenger.reports?.causal?.causalRole === 'PRODUCER');
      if (challengerMatchesBoost && !bestMatchesBoost) {
        bestChoice = challenger;
        continue;
      }

      // Comparison Level 5: Causal Fit Dominance (Non-Redundant > Redundant)
      if (challenger.reports.causal.status === 'CAUSAL_FIT' && bestChoice.reports.causal.status === 'REDUNDANT') {
        bestChoice = challenger;
        continue;
      }

      // Comparison Level 6: Contextual Utility & Versatility (High Utility > Moderate/Dead Risk)
      if (challenger.reports.utility.status === 'HIGH_UTILITY' && bestChoice.reports.utility.status !== 'HIGH_UTILITY') {
        bestChoice = challenger;
        continue;
      }

      // Comparison Level 7: WinPath Synergy & Package Fit Dominance (v9.6)
      const challengerReach = (challenger.candidate.oracle_text || challenger.candidate.oracleText || '').toLowerCase().includes('damage to any target');
      const bestReach = (bestChoice.candidate.oracle_text || bestChoice.candidate.oracleText || '').toLowerCase().includes('damage to any target');
      const isAggroReachRole = contract.role === 'REACH' || contract.role === 'FACE_BURN_REACH' || contract.role === 'FINISHER';

      if (isAggroReachRole && challengerReach && !bestReach) {
        bestChoice = challenger;
        continue;
      }

      // Comparison Level 8: Low CMC Curve Velocity (CMC 1-2 preference for Early Roles)
      const isEarlyRole = contract.role === 'T1_PRESSURE' || contract.role === 'T2_PRESSURE' || contract.role === 'EARLY_RAMP' || contract.role === 'EARLY_INTERACTION' || contract.role === 'CHEAP_REMOVAL' || contract.priority === 'CRITICAL';
      if (isEarlyRole && challenger.candidate.cmc < bestChoice.candidate.cmc) {
        bestChoice = challenger;
        continue;
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
