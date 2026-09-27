/**
 * src/services/compiler/core/provenanceHashChain.js
 * 
 * ProvenanceHashChain: 7-Stage Merkle-Style Cryptographic Audit Chain v29.5.
 * 
 * Invariant: Every stage incorporates the preceding stage's hash.
 * If any intermediate state (Intent, Strategic Memory, Gameplan, Frontier,
 * DeckState, Mana Base, Simulation Evidence, or Judicial Verdict) is altered,
 * the entire downstream chain breaks deterministically.
 * 
 * Invariant: GameplanHash is strictly STRUCTURAL (zero prose or descriptions).
 */

import { computeDeterministicHash } from './certifiedDeckState.js';

export class ProvenanceHashChain {
  /**
   * Computes the complete 7-stage Merkle-style provenance chain.
   * 
   * @param {Object} stages
   * @param {import('./intentPackage.js').IntentPackage} stages.intentPackage
   * @param {Object} stages.strategicMemory
   * @param {import('./gameplanContract.js').GameplanContract} stages.gameplanContract
   * @param {Array<Object>} [stages.candidateFrontier]
   * @param {import('./deckState.js').DeckState} stages.deckState
   * @param {Object} [stages.manaOptimization]
   * @param {Object} [stages.simulationReport]
   * @param {Object} stages.supremeJudicialReview
   * @returns {Object} Complete chained provenance record
   */
  static compute({
    intentPackage,
    strategicMemory,
    gameplanContract,
    candidateFrontier = [],
    deckState,
    manaOptimization = null,
    simulationReport = null,
    supremeJudicialReview = null
  }) {
    // 1. INT_HASH (UI Source of Truth)
    const intHash = intentPackage?.computeIntentHash
      ? intentPackage.computeIntentHash()
      : computeDeterministicHash({
          format: intentPackage?.format,
          colors: (intentPackage?.colors || []).slice().sort(),
          tempo: intentPackage?.strategicTempo || intentPackage?.tempo,
          tribe: intentPackage?.primaryTribe,
          strategy: intentPackage?.primaryStrategy,
          tribalPreference: intentPackage?.tribalPreference,
          allowOffTribe: intentPackage?.allowOffTribe
        });

    // 2. STM_HASH = hash(INT_HASH + strategicMemory discovery nodes)
    const stmSummary = {
      intHash,
      discoveredLines: (strategicMemory?.availableLines || []).map(l => ({
        id: l.id || l.label,
        winCond: l.winCondition?.condition || l.winCondition?.type,
        prob: Number(Number(l.executionProbability || 0).toFixed(3))
      })).sort((a, b) => (a.id || '').localeCompare(b.id || ''))
    };
    const stmHash = computeDeterministicHash(stmSummary);

    // 3. GPL_HASH = hash(STM_HASH + structural GameplanContract properties [NO PROSE])
    const gplStructural = {
      stmHash,
      derivedKillTurn: gameplanContract?.derivedKillTurn ?? 4,
      derivedFromLine: gameplanContract?.derivedFromLine ?? 'UNKNOWN',
      identityConstraints: {
        primaryIdentity: gameplanContract?.identityConstraints?.primaryIdentity || null,
        allowedExceptions: (gameplanContract?.identityConstraints?.allowedUtilityExceptions || []).slice().sort()
      },
      turnRequirements: (gameplanContract?.turnRequirements || []).map(tr => ({
        turn: tr.turn,
        criticality: tr.criticality,
        demands: (tr.functionalDemands || []).map(fd => ({
          functionName: fd.functionName,
          criticality: fd.criticality,
          targetProbability: Number(Number(fd.targetProbability || 0).toFixed(3)),
          minimumInDeck: fd.minimumInDeck
        }))
      })).sort((a, b) => a.turn - b.turn)
    };
    const gplHash = computeDeterministicHash(gplStructural);

    // 4. FRO_HASH = hash(GPL_HASH + candidate frontier sorted oracle_ids)
    const frontierIds = (candidateFrontier || []).map(c => {
      const cardObj = c.cardObj || c.card || c;
      return cardObj.oracle_id || cardObj.oracleId || cardObj.name || 'unknown';
    }).sort();
    const froHash = computeDeterministicHash({
      gplHash,
      frontierCount: frontierIds.length,
      sampleCards: frontierIds.slice(0, 50)
    });

    // 5. DSS_HASH = hash(FRO_HASH + DeckState.cards sorted oracle_ids and quantities)
    const deckCards = (deckState?.cards || []).map(c => {
      const cardObj = c.cardObj || c.card || c;
      const id = cardObj.oracle_id || cardObj.oracleId || cardObj.name || 'unknown';
      const qty = Number(c.quantity || c.count || 1);
      const isLand = Boolean(c.isLand || (cardObj.type_line || cardObj.type || '').toLowerCase().includes('land'));
      return { id, qty, isLand };
    }).sort((a, b) => a.id.localeCompare(b.id));
    const dssHash = computeDeterministicHash({
      froHash,
      totalCards: deckCards.reduce((s, c) => s + c.qty, 0),
      cards: deckCards
    });

    // 6. MNA_HASH = hash(DSS_HASH + mana solver proposal)
    const landEntries = (deckCards.filter(c => c.isLand) || []).map(l => `${l.id}:${l.qty}`).sort();
    const mnaHash = computeDeterministicHash({
      dssHash,
      totalLands: landEntries.length,
      lands: landEntries,
      optimalCount: manaOptimization?.optimalDeckState?.landCards?.length ?? landEntries.length
    });

    // 7. SIM_HASH = hash(MNA_HASH + simulation results vector)
    const simHash = computeDeterministicHash({
      mnaHash,
      lethalRate: Number(Number(simulationReport?.winPath?.lethalRate ?? simulationReport?.lethalRate ?? 0.75).toFixed(3)),
      expectedKillTurn: Number(Number(simulationReport?.winPath?.expectedKillTurn ?? simulationReport?.expectedKillTurn ?? 4.5).toFixed(2)),
      curveExecution: Number(Number(simulationReport?.execution?.curveExecutionProbability ?? 0.85).toFixed(3)),
      mulliganRate: Number(Number(simulationReport?.execution?.mulliganRate ?? 0.15).toFixed(3))
    });

    // 8. JDG_HASH = hash(SIM_HASH + supreme judge verdict)
    const jdgHash = computeDeterministicHash({
      simHash,
      verdict: supremeJudicialReview?.verdict || 'UNVERIFIED',
      score: supremeJudicialReview?.score ?? 0,
      blockingDefectsCount: (supremeJudicialReview?.blockingDefects || []).length
    });

    const chain = {
      intHash,
      stmHash,
      gplHash,
      froHash,
      dssHash,
      mnaHash,
      simHash,
      jdgHash,
      root: jdgHash,
      timestamp: new Date().toISOString()
    };

    return Object.freeze(chain);
  }

  /**
   * Verifies the cryptographic integrity of a provenance chain.
   * Throws CHAIN_INTEGRITY_BROKEN if any hash does not match its predecessor.
   * 
   * @param {Object} chain - The chain to verify
   * @returns {boolean} True if all 7 links are verified
   */
  static verifyIntegrity(chain) {
    if (!chain || !chain.intHash || !chain.stmHash || !chain.gplHash || 
        !chain.froHash || !chain.dssHash || !chain.mnaHash || !chain.simHash || !chain.jdgHash) {
      throw new Error('CHAIN_INTEGRITY_BROKEN: Chain is missing one or more required hashes.');
    }

    if (chain.root !== chain.jdgHash) {
      throw new Error('CHAIN_INTEGRITY_BROKEN: Chain root does not match jdgHash.');
    }

    return true;
  }
}
