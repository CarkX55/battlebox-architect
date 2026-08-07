/**
 * src/services/compiler/core/deckState.js
 * 
 * DeckState: Physical Deck Snapshot IR v1.0.
 * Immutable physical deck array produced purely by DeckExpansion.expand(copyAllocationState).
 */

export class DeckState {
  constructor(cards = [], metadata = {}) {
    this.cards = Object.freeze(cards.map(c => Object.freeze({
      name: c.name,
      quantity: Number(c.quantity || c.copies || 1),
      role: c.role || 'General',
      packagePriority: c.packagePriority || 'SUPPORT',
      lockLevel: c.lockLevel || 'LOCK_SOFT',
      colors: Object.freeze([...(c.colors || [])]),
      type_line: c.type_line || c.typeLine || ''
    })));

    this.totalCardCount = this.cards.reduce((sum, c) => sum + c.quantity, 0);
    this.distinctCardCount = this.cards.length;
    this.metadata = Object.freeze({ ...metadata });

    Object.freeze(this);
  }

  validate() {
    if (!Array.isArray(this.cards)) {
      throw new Error('[DeckState Validation Error] cards must be an array.');
    }
  }

  toJSON() {
    return {
      totalCardCount: this.totalCardCount,
      distinctCardCount: this.distinctCardCount,
      cards: this.cards,
      metadata: this.metadata
    };
  }
}
