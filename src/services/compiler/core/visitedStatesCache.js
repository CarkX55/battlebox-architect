/**
 * src/services/compiler/core/visitedStatesCache.js
 * 
 * VisitedStatesCache: Cache Criptográfico SHA-256 Determinista v14.3.
 * Genera hashes inmunes a colisiones combinando la composición ordenada de cartas,
 * el hash del blueprint y el perfil de objetivos.
 */

import crypto from 'crypto';

export class VisitedStatesCache {
  constructor() {
    this.visitedHashes = new Set();
  }

  /**
   * Genera un hash SHA-256 determinista e independiente del orden de las cartas
   */
  static computeDeckHash(deckSlots = [], blueprintHash = 'BP_DEFAULT', profileHash = 'PROF_DEFAULT') {
    const sorted = [...deckSlots]
      .map(s => `${(s.name || '').trim().toLowerCase()}:${Number(s.quantity || s.count || 1)}`)
      .sort();

    const rawPayload = `${blueprintHash}|${profileHash}|${sorted.join(';')}`;
    const hashHex = crypto.createHash('sha256').update(rawPayload).digest('hex').toUpperCase();

    return `SHA256_${hashHex.substring(0, 16)}`;
  }

  hasBeenVisited(deckSlots = [], blueprintHash = 'BP_DEFAULT', profileHash = 'PROF_DEFAULT') {
    const hash = VisitedStatesCache.computeDeckHash(deckSlots, blueprintHash, profileHash);
    return this.visitedHashes.has(hash);
  }

  markVisited(deckSlots = [], blueprintHash = 'BP_DEFAULT', profileHash = 'PROF_DEFAULT') {
    const hash = VisitedStatesCache.computeDeckHash(deckSlots, blueprintHash, profileHash);
    this.visitedHashes.add(hash);
  }

  clear() {
    this.visitedHashes.clear();
  }
}
