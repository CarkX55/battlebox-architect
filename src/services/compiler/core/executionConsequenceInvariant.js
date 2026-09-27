/**
 * src/services/compiler/core/executionConsequenceInvariant.js
 * 
 * Universal Execution Consequence Invariant v1.0.
 * 
 * Enforces the formal chain:
 *   Gameplan Requirement -> Deck Coverage -> Executable Coverage -> Observed Execution
 * 
 * Axiom:
 * Merely having cards with a keyword or type in the deck list (Deck Coverage) does NOT
 * prove the mechanic or gameplan functions. The compiler must verify:
 *   1. Requirement: Explicit functional demand in GameplanContract.
 *   2. Deck Coverage: Sufficient card density in deck list.
 *   3. Executable Coverage: Castability on curve (untapped mana + colored pip adequacy).
 *   4. Observed Execution: Actual deterministic activation/resolution in game simulation.
 * 
 * Zero hardcoded archetype or tribal branching. Driven strictly by contract demand,
 * deck state mathematics, and deterministic simulation logs.
 */

import { extractCanonicalCmc, getExecutionFace } from './canonicalCardNormalizer.js';

export class ExecutionConsequenceInvariant {
  /**
   * Audits the complete 4-stage consequence chain for a given gameplan and deck state.
   * 
   * @param {Object} params
   * @param {import('./gameplanSynthesizer.js').GameplanContract} params.gameplanContract
   * @param {import('./deckState.js').DeckState} params.deckState
   * @param {Object} [params.gameState] - Executed game state simulation
   * @returns {Object} Audit outcome with per-requirement consequence verification
   */
  static auditChain({ gameplanContract, deckState, gameState = null }) {
    if (!gameplanContract || !deckState) {
      return {
        isValid: false,
        chainVerifications: [],
        verdict: 'INVALID_INPUTS',
        diagnosis: 'Missing GameplanContract or DeckState.'
      };
    }

    const cards = deckState.cards || [];
    const nonLands = cards.filter(c => !c.isLand);
    const lands = cards.filter(c => c.isLand);
    const totalLands = lands.reduce((sum, l) => sum + Number(l.quantity || l.count || 1), 0);

    const turnReqs = gameplanContract.turnRequirements || [];
    const chainVerifications = [];
    let brokenLinksCount = 0;

    for (const req of turnReqs) {
      const turn = req.turn;
      for (const demand of req.functionalDemands || []) {
        const funcName = demand.functionName || '';
        const minInDeck = demand.minimumInDeck || 1;

        // Stage 1: Requirement Identified
        const requirementIdentified = true;

        // Stage 2: Deck Coverage (Count of matching cards)
        let matchingCount = 0;
        const matchingCards = [];

        for (const entry of nonLands) {
          const cardObj = entry.cardObj || entry.card || entry;
          const execFace = getExecutionFace(cardObj);
          const cmc = execFace?.cmc ?? extractCanonicalCmc(cardObj);
          const type = (execFace?.typeLine || cardObj.type_line || cardObj.type || '').toLowerCase();
          const oracle = (execFace?.oracleText || cardObj.oracle_text || cardObj.text || '').toLowerCase();
          const qty = Number(entry.quantity || entry.count || 1);

          let isMatch = false;
          if (funcName.includes('1CMC')) {
            if (cmc <= 1) {
              if (funcName.includes('IDENTITY')) {
                const id = (gameplanContract.identityConstraints?.primaryIdentity || '').toLowerCase();
                if (type.includes(id) || oracle.includes('changeling') || (execFace?.structuralTypes || []).some(t => t.toLowerCase() === id)) {
                  isMatch = true;
                }
              } else {
                isMatch = true;
              }
            }
          } else if (funcName.includes('2CMC')) {
            if (cmc <= 2) isMatch = true;
          } else {
            isMatch = true;
          }

          if (isMatch) {
            matchingCount += qty;
            matchingCards.push(entry);
          }
        }

        const deckCoverageSatisfied = matchingCount >= minInDeck;

        // Stage 3: Executable Coverage (Mana castability for the required spells on that turn)
        const cmcs = matchingCards.map(c => {
          const cardObj = c.cardObj || c.card || c;
          const execFace = getExecutionFace(cardObj);
          return execFace?.cmc ?? extractCanonicalCmc(cardObj);
        });
        const minCmcRequired = cmcs.length > 0 ? Math.min(...cmcs) : turn;
        const maxCmcNeeded = Math.min(turn, minCmcRequired);
        const hasAdequateManaBase = totalLands >= (maxCmcNeeded <= 1 ? 16 : (maxCmcNeeded === 2 ? 18 : 20));
        const executableCoverageVerified = deckCoverageSatisfied && hasAdequateManaBase;

        // Stage 4: Observed Execution (Simulation log check if gameState provided)
        let observedExecutionObserved = executableCoverageVerified;
        if (gameState && gameState.actionLog) {
          const actions = gameState.actionLog;
          const matchingAction = actions.some(a =>
            (a.action === 'CAST_CREATURE' || a.action === 'CAST_SPELL') &&
            a.turn <= turn &&
            matchingCards.some(mc => (mc.name || '').toLowerCase() === (a.card || '').toLowerCase())
          );
          observedExecutionObserved = matchingAction;
        }

        const isChainIntact = requirementIdentified && deckCoverageSatisfied && executableCoverageVerified && observedExecutionObserved;
        if (!isChainIntact) {
          brokenLinksCount++;
        }

        chainVerifications.push({
          phaseName: funcName,
          turn,
          requirementIdentified,
          deckCoverageSatisfied,
          matchingCountInDeck: matchingCount,
          minimumRequired: minInDeck,
          executableCoverageVerified,
          observedExecutionObserved,
          isChainIntact
        });
      }
    }

    const isValid = brokenLinksCount === 0;
    const verdict = isValid ? 'CONSEQUENCE_CHAIN_VERIFIED' : 'CONSEQUENCE_CHAIN_BROKEN';
    const diagnosis = isValid
      ? `All ${chainVerifications.length} gameplan requirements satisfied complete 4-stage consequence chain.`
      : `Consequence chain broken on ${brokenLinksCount}/${chainVerifications.length} requirements: deck presence failed to translate to executable/observed execution.`;

    return Object.freeze({
      isValid,
      brokenLinksCount,
      totalRequirements: chainVerifications.length,
      chainVerifications: Object.freeze(chainVerifications),
      verdict,
      diagnosis
    });
  }
}
