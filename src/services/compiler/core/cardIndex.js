/**
 * src/services/compiler/core/cardIndex.js
 * 
 * BattleBox Strategic Planning Framework v4.0 — Card Index Database.
 * Maps concrete MTG cards to capability tags for clean capability queries.
 */

export class CardIndex {
  constructor() {
    this.index = new Map([
      ['Llanowar Elves', { cmc: 1, type_line: 'Creature — Elf Druid', mana_cost: '{G}', colors: ['G'], tags: ['EarlyRamp', 'Creature', 'ManaSource', 'Elf'] }],
      ['Elvish Mystic', { cmc: 1, type_line: 'Creature — Elf Druid', mana_cost: '{G}', colors: ['G'], tags: ['EarlyRamp', 'Creature', 'ManaSource', 'Elf'] }],
      ['Delighted Halfling', { cmc: 1, type_line: 'Creature — Halfling Citizen', mana_cost: '{G}', colors: ['G'], tags: ['EarlyRamp', 'Creature', 'ManaSource', 'Halfling'] }],
      ['Bonecrusher Giant', { cmc: 3, type_line: 'Creature — Giant Berserker', mana_cost: '{2}{R}', colors: ['R'], tags: ['StompRemoval', 'GiantThreat', 'CardFlow2For1', 'Giant'] }],
      ['Stomp', { cmc: 2, type_line: 'Instant — Adventure', mana_cost: '{1}{R}', colors: ['R'], tags: ['StompRemoval', 'CheapRemoval', 'Instant'] }],
      ['Calamity Bearer', { cmc: 4, type_line: 'Creature — Giant Berserker', mana_cost: '{2}{R}{R}', colors: ['R'], tags: ['GiantThreat', 'Finisher', 'Giant'] }],
      ['Sunfall', { cmc: 5, type_line: 'Sorcery', mana_cost: '{3}{W}{W}', colors: ['W'], tags: ['Sweeper', 'Reset', 'Sorcery'] }]
    ]);
    Object.freeze(this);
  }

  getCards() {
    const list = [];
    for (const [cardName, details] of this.index.entries()) {
      list.push({
        id: cardName,
        name: cardName,
        cmc: details.cmc,
        type_line: details.type_line,
        mana_cost: details.mana_cost,
        colors: details.colors,
        tags: details.tags
      });
    }
    return list;
  }

  findCardsByCapabilities(requiredCapabilities = []) {
    const matched = [];
    for (const [cardName, details] of this.index.entries()) {
      const satisfiesAll = requiredCapabilities.every(req => details.tags.includes(req));
      if (satisfiesAll) {
        matched.push({ cardName, tags: details.tags });
      }
    }
    return matched;
  }
}

export const cardIndexDatabase = new CardIndex();
