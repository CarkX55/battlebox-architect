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
      mana_cost: c.mana_cost || c.manaCost || '',
      mana_value: c.mana_value ?? c.cmc ?? 0,
      cmc: c.cmc ?? c.mana_value ?? 0,
      colors: Object.freeze([...(c.colors || [])]),
      color_identity: Object.freeze([...(c.color_identity || c.colorIdentity || [])]),
      type_line: c.type_line || c.typeLine || '',
      oracle_text: c.oracle_text || c.oracleText || '',
      rarity: c.rarity || 'common',
      image_uris: c.image_uris || null,
      cardObj: c.cardObj || null
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
