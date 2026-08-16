/**
 * src/services/compiler/core/deckExpansion.js
 * 
 * DeckExpansion: Expansión Física Determinista a 60 Slots v22.0.
 * Regla de Invariante Absoluta:
 * DeckExpansion NUNCA decide ni modifica las copias. Simplemente materializa los CapabilityPackages en la lista final.
 */

import { DeckState } from './deckState.js';

export class DeckExpansion {
  /**
   * Pure deterministic expansion function.
   * Signature: expand(copyAllocationState) => DeckState
   * 
   * Absolute Invariant:
   * ZERO DB access, ZERO options, ZERO in-place array mutations (splice, quantity +=).
   * 
   * @param {import('./copyAllocationManager.js').CopyAllocationState} copyAllocationState
   * @returns {DeckState}
   */
  static expand(copyAllocationState) {
    if (!copyAllocationState || !Array.isArray(copyAllocationState.packages)) {
      return new DeckState([]);
    }

    const cardMap = new Map();

    for (const pkg of copyAllocationState.packages) {
      const cardName = pkg.winnerCard || `[Pending: ${pkg.role}]`;
      const copies = Number(pkg.copies || pkg.allocatedDensity || 1);
      const cardObj = pkg.winnerCardObj || {};

      const existing = cardMap.get(cardName);
      if (existing) {
        existing.quantity += copies;
      } else {
        cardMap.set(cardName, {
          name: cardName,
          quantity: copies,
          role: pkg.role,
          packagePriority: pkg.priority,
          lockLevel: pkg.lockLevel,
          mana_cost: cardObj.mana_cost || cardObj.manaCost || '',
          mana_value: cardObj.mana_value || cardObj.cmc || 0,
          cmc: cardObj.cmc || cardObj.mana_value || 0,
          colors: cardObj.colors || [],
          color_identity: cardObj.color_identity || cardObj.colorIdentity || [],
          type_line: cardObj.type_line || cardObj.typeLine || '',
          oracle_text: cardObj.oracle_text || cardObj.oracleText || '',
          rarity: cardObj.rarity || 'common',
          legalities: cardObj.legalities || {},
          image_uris: cardObj.image_uris || null,
          cardObj: cardObj
        });
      }
    }

    const deckCards = Array.from(cardMap.values());
    return new DeckState(deckCards, {
      expandedAt: new Date().toISOString(),
      sourceMode: copyAllocationState.mode
    });
  }

  /**
   * Transforma una lista de CapabilityPackages en la lista física de cartas sin alterar copias
   */
  static expandPackagesToDeck(packages = []) {
    return DeckExpansion.expand({ packages }).cards;
  }
}
