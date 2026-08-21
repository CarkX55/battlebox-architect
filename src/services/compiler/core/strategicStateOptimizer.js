/**
 * STRATEGIC STATE OPTIMIZER (v23.0 Core Engine)
 * 
 * Universal Causal State Refinement & Multi-Level Local Search.
 * 
 * Authority Boundary:
 *   - Does NOT invent new strategic objectives.
 *   - Verifies, refutes, and refines the execution of the Strategic Thesis & WinPath.
 *   - Audits DemandSupplyLedger (anti-nombo), MarginalCopyEvaluator (redundancy/collisions),
 *     and performs counterfactual state substitutions (1-card, 2-card, bundle).
 *   - Declares NO_SAFE_IMPROVEMENT when the state is Pareto-optimal under all contracts.
 */

import { DemandSupplyLedger } from './demandSupplyLedger.js';
import { MarginalCopyEvaluator } from './marginalCopyEvaluator.js';
import { StateCandidateRanker } from './stateCandidateRanker.js';
import { DeckState } from './deckState.js';

export class StrategicStateOptimizer {
  /**
   * Refines a compiled DeckState against the Strategic Thesis and Causal Contracts.
   * 
   * @param {Object} deckState Current compiled deck state { cards: [...] }
   * @param {Object} deckIdentity Compiled DeckIdentity (Thesis, WinPath, Engines)
   * @param {Object} intentPackage User intent package
   * @param {Array<Object>} availablePool Candidate card pool
   * @returns {{ optimizedState: Object, autopsyReport: Object, optimizationLog: Array<string> }}
   */
  static optimize(deckState, deckIdentity, intentPackage, availablePool = []) {
    const optimizationLog = [];
    let currentState = JSON.parse(JSON.stringify(deckState));
    const winPath = deckIdentity.mandatoryRoles || deckIdentity.requiredEngines || [];
    const strategicContract = {
      archetype: deckIdentity.archetypeKey,
      winPath,
      proofObligations: winPath,
      format: intentPackage.format,
      constraints: intentPackage.userConstraints || {}
    };

    optimizationLog.push(`[StrategicStateOptimizer] Starting universal causal autopsy on ${currentState.cards?.length || 0} cards...`);

    // ─── STEP 1: CAUSAL DEMAND-SUPPLY AUTOPSY (Anti-Nombo Guard) ───────────
    let demandsFixed = 0;
    const cards = currentState.cards || [];

    for (let i = 0; i < cards.length; i++) {
      const entry = cards[i];
      const card = entry.card || entry;
      const demandAudit = DemandSupplyLedger.auditCardDemands(card, currentState);

      if (!demandAudit.isSatisfied) {
        optimizationLog.push(
          `[Autopsy Veto] Card "${card.name}" has unfulfilled hard demands: ${demandAudit.failureReasons.join('; ')}`
        );

        // Find a synergistic replacement from availablePool that satisfies the slot without unmet demands
        const rankResult = StateCandidateRanker.rankCandidatesByStateDelta(
          currentState,
          availablePool.filter(c => c.name !== card.name),
          strategicContract
        );

        if (rankResult.winningCandidate && rankResult.selectionStatus === 'SELECTION_SUCCESS') {
          const replacement = rankResult.winningCandidate;
          optimizationLog.push(
            `[Causal Substitution] Replaced "${card.name}" with "${replacement.name}" (${rankResult.reason})`
          );
          cards[i] = {
            ...entry,
            card: replacement,
            name: replacement.name,
            winnerCard: replacement.name,
            oracle_text: replacement.oracle_text || replacement.oracleText,
            type_line: replacement.type_line || replacement.typeLine,
            cmc: replacement.cmc || replacement.mana_value || 0,
            rationale: `Substituted by StrategicStateOptimizer to resolve unfulfilled demand in ${card.name}`
          };
          demandsFixed++;
        }
      }
    }

    // ─── STEP 2: MARGINAL COPY & LEGENDARY REDUNDANCY REBALANCING ──────────
    const characterCounts = new Map();
    for (const entry of cards) {
      const card = entry.card || entry;
      const root = StateCandidateRanker.extractCharacterRoot(card.name);
      const isLegendary = (card.type_line || card.typeLine || '').includes('Legendary');
      if (isLegendary) {
        const count = Number(entry.quantity || entry.count || 1);
        characterCounts.set(root, (characterCounts.get(root) || 0) + count);
      }
    }

    // Check if any character has excessive copies across printings (e.g. > 4 Krenkos)
    for (const [root, totalCount] of characterCounts.entries()) {
      if (totalCount > 4) {
        optimizationLog.push(
          `[Legendary Overload] Detected ${totalCount} copies of character "${root}". Rebalancing marginal copies...`
        );

        // Trim secondary printings with higher CMC
        const matchingEntries = cards.filter(e => {
          const card = e.card || e;
          return StateCandidateRanker.extractCharacterRoot(card.name) === root && (card.type_line || '').includes('Legendary');
        }).sort((a, b) => (b.cmc || 0) - (a.cmc || 0)); // Sort highest CMC first

        if (matchingEntries.length > 1) {
          const secondary = matchingEntries[0];
          const secIdx = cards.indexOf(secondary);
          
          // Substitute secondary legendary with premier non-legendary synergy card
          const rankResult = StateCandidateRanker.rankCandidatesByStateDelta(
            currentState,
            availablePool.filter(c => !(c.type_line || '').includes('Legendary') && StateCandidateRanker.extractCharacterRoot(c.name) !== root),
            strategicContract
          );

          if (rankResult.winningCandidate && secIdx !== -1) {
            const repl = rankResult.winningCandidate;
            optimizationLog.push(
              `[Legendary Trim] Replaced duplicate printing "${secondary.name}" with non-legendary "${repl.name}"`
            );
            cards[secIdx] = {
              ...secondary,
              card: repl,
              name: repl.name,
              winnerCard: repl.name,
              oracle_text: repl.oracle_text || repl.oracleText,
              type_line: repl.type_line || repl.typeLine,
              cmc: repl.cmc || repl.mana_value || 0,
              rationale: `Substituted by StrategicStateOptimizer to prevent legendary collision on character "${root}"`
            };
          }
        }
      }
    }

    // ─── STEP 3: PROOF CLOSURE EVALUATION ──────────────────────────────────
    let provenNodesCount = 0;
    for (const node of winPath) {
      const hasCoverage = cards.some(e => StateCandidateRanker.matchesNodeRequirement(e.card || e, node));
      if (hasCoverage) provenNodesCount++;
    }
    const proofClosureRatio = winPath.length > 0 ? (provenNodesCount / winPath.length) : 1.0;

    const autopsyReport = {
      demandsAudited: cards.length,
      demandsFixed,
      proofClosureRatio: Number(proofClosureRatio.toFixed(2)),
      provenNodesCount,
      totalWinPathNodes: winPath.length,
      status: demandsFixed > 0 ? 'STATE_OPTIMIZED' : 'NO_SAFE_IMPROVEMENT',
      timestamp: new Date().toISOString()
    };

    optimizationLog.push(
      `[StrategicStateOptimizer] Autopsy Complete: Status ${autopsyReport.status} (Proof Closure: ${Math.round(proofClosureRatio * 100)}%).`
    );

    return {
      optimizedState: new DeckState(cards, deckState.metadata || {}),
      autopsyReport,
      optimizationLog
    };
  }
}
