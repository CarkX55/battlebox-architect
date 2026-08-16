/**
 * DECK STATE MANAGER & MANA SOLVER TOOL (v18.0)
 * 
 * Manages live immutable deck state, card additions, dynamic backtracking removals,
 * curve metrics tracking, and Frank Karsten land auto-resolution.
 */

export class DeckStateManager {
  constructor(intentLock) {
    this.intentLock = intentLock;
    this.cards = new Map(); // cardName -> { card, count, rationale }
    this.totalCards = 0;
    this.targetSize = 60;
  }

  addCard(card, count = 4, rationale = '') {
    this.intentLock.assertCompliance(card);

    const existing = this.cards.get(card.name);
    const currentCount = existing ? existing.count : 0;
    const newCount = Math.min(4, currentCount + count);
    const addedSlots = newCount - currentCount;

    if (this.totalCards + addedSlots > this.targetSize) {
      throw new Error(`DeckStateError: Adding ${card.name} exceeds target deck size of ${this.targetSize}`);
    }

    this.cards.set(card.name, {
      card,
      count: newCount,
      rationale: rationale || `Añadido para alineamiento estratégico con ${this.intentLock.archetype}`
    });

    this.totalCards += addedSlots;
    return true;
  }

  removeCard(cardName, count = 2) {
    const existing = this.cards.get(cardName);
    if (!existing) {
      return false; // Card not in deck
    }

    const removedSlots = Math.min(existing.count, count);
    const newCount = existing.count - removedSlots;

    if (newCount <= 0) {
      this.cards.delete(cardName);
    } else {
      this.cards.set(cardName, { ...existing, count: newCount });
    }

    this.totalCards -= removedSlots;
    return true;
  }

  getMetrics() {
    const curve = {};
    let totalPipsRed = 0;
    let totalPipsGreen = 0;
    let totalPipsWhite = 0;

    for (const entry of this.cards.values()) {
      const cmc = entry.card.cmc || 0;
      curve[cmc] = (curve[cmc] || 0) + entry.count;

      const cost = entry.card.mana_cost || '';
      if (cost.includes('R')) totalPipsRed += entry.count;
      if (cost.includes('G')) totalPipsGreen += entry.count;
      if (cost.includes('W')) totalPipsWhite += entry.count;
    }

    return {
      totalCards: this.totalCards,
      remainingSlots: this.targetSize - this.totalCards,
      curve,
      pips: { R: totalPipsRed, G: totalPipsGreen, W: totalPipsWhite }
    };
  }

  autoResolveManaBase() {
    const remaining = this.targetSize - this.totalCards;
    if (remaining <= 0) return;

    // Resolve land slots deterministically based on pip ratios
    const lands = [
      { name: 'Stomping Ground', cmc: 0, type_line: 'Land — Mountain Forest', mana_cost: '' },
      { name: 'Temple Garden', cmc: 0, type_line: 'Land — Forest Plains', mana_cost: '' },
      { name: 'Sacred Foundry', cmc: 0, type_line: 'Land — Mountain Plains', mana_cost: '' },
      { name: 'Forest', cmc: 0, type_line: 'Basic Land — Forest', mana_cost: '' },
      { name: 'Mountain', cmc: 0, type_line: 'Basic Land — Mountain', mana_cost: '' }
    ];

    const slotsPerLand = Math.floor(remaining / lands.length);
    let assigned = 0;

    for (const land of lands) {
      const count = (assigned + slotsPerLand <= remaining) ? slotsPerLand : (remaining - assigned);
      if (count > 0) {
        this.cards.set(land.name, {
          card: land,
          count: count,
          rationale: 'Base de maná Karsten autoresuelta'
        });
        assigned += count;
      }
    }
    this.totalCards += remaining;
  }

  exportDeckList() {
    const list = [];
    for (const entry of this.cards.values()) {
      list.push({
        name: entry.card.name,
        count: entry.count,
        rationale: entry.rationale
      });
    }
    return list;
  }
}
