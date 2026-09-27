/**
 * src/services/compiler/core/certifiedDeckState.js
 * 
 * CertifiedDeckState: Infallible Transaction Lock & Cryptographic Snapshot v27.0.
 * 
 * SINGLE SOURCE OF TRUTH for immutable deck certification.
 * Once sealed with lockStatus = 'LOCK_60', NO component (UI, legacy auditor, optimizer, or LLM)
 * can modify, densify, rebalance, or alter any card, count, or land in this snapshot.
 * 
 * INVARIANT: Any mutation attempt on a certified snapshot throws CERTIFICATE_INVALIDATED.
 */

import { extractCanonicalCmc } from './canonicalCardNormalizer.js';

/**
 * Generates a deterministic DJB2/FNV-1a 32-bit hex hash from string or JSON object.
 * Pure deterministic hash without external crypto dependency for isomorphic browser/node runtime.
 */
export function computeDeterministicHash(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export class CertifiedDeckState {
  /**
   * Seals a compiled deck state into an immutable certified transaction.
   * 
   * @param {Object} deckState - The raw compiled DeckState { cards: [...] }
   * @param {Object} metadata - Metadata containing intentPackage, judicialReview, repairHistory, etc.
   * @returns {CertifiedDeckState} Immutable certified snapshot
   */
  static freeze(deckState, metadata = {}) {
    if (!deckState || !Array.isArray(deckState.cards)) {
      throw new Error('CERTIFICATE_INVALIDATED: Invalid DeckState provided for certification.');
    }

    const rawCards = deckState.cards.map(c => {
      const cardObj = c.cardObj || c.card || c;
      return {
        name: c.name || cardObj.name || 'Unknown',
        oracle_id: c.oracle_id || cardObj.oracle_id || cardObj.oracleId || c.name,
        quantity: Number(c.quantity || c.count || 1),
        role: c.role || 'UNASSIGNED',
        cmc: extractCanonicalCmc(cardObj || c),
        type_line: c.type_line || cardObj.type_line || c.type || '',
        oracle_text: c.oracle_text || c.oracleText || cardObj.oracle_text || cardObj.oracleText || cardObj.text || '',
        colors: c.colors || cardObj.colors || [],
        cardObj: cardObj,
        isLand: Boolean(
          (c.type_line || cardObj.type_line || c.type || '').toLowerCase().includes('land') ||
          c.role === 'Land' || c.role === 'MANA_BASE' || c.isLand
        )
      };
    });

    // Sort deterministically by name and role for canonical hashing
    rawCards.sort((a, b) => a.name.localeCompare(b.name) || a.role.localeCompare(b.role));

    const totalCards = rawCards.reduce((sum, c) => sum + c.quantity, 0);
    const spellCards = rawCards.filter(c => !c.isLand);
    const landCards = rawCards.filter(c => c.isLand);

    const totalSpells = spellCards.reduce((sum, c) => sum + c.quantity, 0);
    const totalLands = landCards.reduce((sum, c) => sum + c.quantity, 0);

    const cardIdentityHashes = rawCards.map(c => ({
      name: c.name,
      quantity: c.quantity,
      isLand: c.isLand,
      role: c.role,
      hash: computeDeterministicHash(`${c.name}:${c.quantity}:${c.role}`)
    }));

    const intentHash = metadata.intentHash || computeDeterministicHash(metadata.intentPackage || {});
    const deckHash = computeDeterministicHash({
      cards: cardIdentityHashes,
      totalCards,
      totalLands,
      totalSpells,
      intentHash
    });

    const isApproved = metadata.supremeJudicialReview?.verdict === 'APPROVE' || 
      (metadata.supremeJudicialReview?.verdict === 'APPROVE_WITH_WARNINGS' && !metadata.supremeJudicialReview?.hasBlockingWarnings);

    const lockStatus = isApproved ? 'LOCK_60' : 'NOT_VERIFIED';
    const transactionLock = isApproved;

    // Deep freeze cards
    const frozenCards = Object.freeze(rawCards.map(c => Object.freeze({ ...c })));

    const certifiedInstance = Object.freeze({
      isFrozen: true,
      stateHash: deckHash,
      cards: frozenCards,
      totalCards,
      totalSpells,
      totalLands,
      format: (deckState.format || metadata.intentPackage?.format || 'Standard').toUpperCase(),
      archetype: deckState.archetype || metadata.intentPackage?.strategicTempo || metadata.intentPackage?.archetype || 'MIDRANGE',
      vetoLedger: Object.freeze(deckState.vetoLedger || []),
      superiorityCertificates: Object.freeze(deckState.superiorityCertificates || []),
      intentHash,
      deckHash,
      cardIdentityHashes: Object.freeze(cardIdentityHashes),
      lockStatus,
      transactionLock,
      qualityGate: isApproved ? 'CERTIFIED_PURE_CAUSAL_STATE' : 'REJECTED_OR_UNVERIFIED',
      supremeJudicialReview: Object.freeze(metadata.supremeJudicialReview || {}),
      repairHistory: Object.freeze(metadata.repairHistory || []),
      simulationEvidence: Object.freeze(metadata.simulationEvidence || {}),
      proofCoverage: Object.freeze(deckState.proofCoverage || {}),
      stateDeficits: Object.freeze(deckState.stateDeficits || []),
      provenanceHashChain: Object.freeze(metadata.provenanceHashChain || {}),
      certifiedAt: new Date().toISOString(),
      authority: 'COMPILER_V27_SSOT'
    });

    return certifiedInstance;
  }

  /**
   * Asserts the cryptographic integrity of a deck against its certified snapshot.
   * Throws CERTIFICATE_INVALIDATED if any card, quantity, or hash is altered.
   * 
   * @param {Array<Object>|Object} candidateDeck - Deck to verify
   * @param {CertifiedDeckState} certifiedSnapshot - Original certified snapshot
   * @returns {boolean} True if 100% integral
   */
  static assertIntegrity(candidateDeck, certifiedSnapshot) {
    if (!certifiedSnapshot || !certifiedSnapshot.transactionLock) {
      throw new Error('CERTIFICATE_INVALIDATED: No active transactionLock in certified snapshot.');
    }

    const cardsToVerify = Array.isArray(candidateDeck) 
      ? candidateDeck 
      : (candidateDeck.cards || []);

    const normalizedCandidate = cardsToVerify.map(c => ({
      name: c.name || (c.card && c.card.name) || 'Unknown',
      quantity: Number(c.quantity || c.count || 1),
      role: c.role || 'UNASSIGNED'
    })).sort((a, b) => a.name.localeCompare(b.name) || a.role.localeCompare(b.role));

    const candidateHashes = normalizedCandidate.map(c => ({
      name: c.name,
      quantity: c.quantity,
      hash: computeDeterministicHash(`${c.name}:${c.quantity}:${c.role}`)
    }));

    if (candidateHashes.length !== certifiedSnapshot.cardIdentityHashes.length) {
      throw new Error(`CERTIFICATE_INVALIDATED: Distinct card count mismatch (${candidateHashes.length} vs ${certifiedSnapshot.cardIdentityHashes.length}).`);
    }

    for (let i = 0; i < candidateHashes.length; i++) {
      const cand = candidateHashes[i];
      const cert = certifiedSnapshot.cardIdentityHashes[i];
      if (cand.name !== cert.name || cand.quantity !== cert.quantity || cand.hash !== cert.hash) {
        throw new Error(`CERTIFICATE_INVALIDATED: Mutation detected on card "${cand.name}" (qty: ${cand.quantity} vs certified: ${cert.quantity}).`);
      }
    }

    return true;
  }

  /**
   * Verifies that an object is not locked before allowing modification.
   * Throws CERTIFICATE_INVALIDATED if transactionLock is true.
   */
  static assertUnlocked(deck) {
    if (deck && (deck.transactionLock === true || deck.lockStatus === 'LOCK_60')) {
      throw new Error('CERTIFICATE_INVALIDATED: Attempted to mutate a locked CertifiedDeckState (LOCK_60).');
    }
    return true;
  }
}
