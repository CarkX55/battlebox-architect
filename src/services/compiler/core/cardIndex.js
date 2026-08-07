/**
 * src/services/compiler/core/cardIndex.js
 * 
 * BattleBox Strategic Planning Framework v4.0 — Card Index Database.
 * Maps concrete MTG cards to capability tags for clean capability queries.
 */

export class CardIndex {
  constructor() {
    this.index = new Map([
      ['Llanowar Elves', ['EarlyRamp', 'Creature', 'ManaSource', 'Elf']],
      ['Elvish Mystic', ['EarlyRamp', 'Creature', 'ManaSource', 'Elf']],
      ['Delighted Halfling', ['EarlyRamp', 'Creature', 'ManaSource', 'Halfling']],
      ['Bonecrusher Giant', ['StompRemoval', 'GiantThreat', 'CardFlow2For1', 'Giant']],
      ['Stomp', ['StompRemoval', 'CheapRemoval', 'Instant']],
      ['Calamity Bearer', ['GiantThreat', 'Finisher', 'Giant']],
      ['Sunfall', ['Sweeper', 'Reset', 'Sorcery']]
    ]);
    Object.freeze(this);
  }

  findCardsByCapabilities(requiredCapabilities = []) {
    const matched = [];
    for (const [cardName, tags] of this.index.entries()) {
      const satisfiesAll = requiredCapabilities.every(req => tags.includes(req));
      if (satisfiesAll) {
        matched.push({ cardName, tags });
      }
    }
    return matched;
  }
}
