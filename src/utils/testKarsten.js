import { getKarstenLandCount, calculateVMP, calculateRA, calculateMDFCAdjustment } from '../services/deckCalculator.js';

function createMockCard(name, type, mv, oracle = '') {
  return { name, type_line: type, mana_value: mv, oracle_text: oracle };
}

const testAggroDeck = [
  ...Array(20).fill(createMockCard('Mountain', 'Basic Land — Mountain', 0)),
  ...Array(12).fill(createMockCard('Goblin Guide', 'Creature — Goblin Shaman', 1)),
  ...Array(8).fill(createMockCard('Wild Nacatl', 'Creature — Beast', 2)),
  ...Array(4).fill(createMockCard('Lightning Bolt', 'Instant', 1, 'Lightning Bolt deals 3 damage.')),
  ...Array(4).fill(createMockCard('Monastery Swiftspear', 'Creature — Monk', 1)),
  ...Array(4).fill(createMockCard('Boros Charm', 'Instant', 2)),
  ...Array(4).fill(createMockCard('Sorin, Vengeance', 'Planeswalker', 3)),
  ...Array(4).fill(createMockCard('Riftwatcher', 'Creature — Elemental', 4)),
];

const testControlDeck = [
  ...Array(20).fill(createMockCard('Island', 'Basic Land — Island', 0)),
  ...Array(4).fill(createMockCard('Counterspell', 'Instant', 2, 'Counter target spell. Draw a card.')),
  ...Array(4).fill(createMockCard('Drown in the Loch', 'Instant', 2)),
  ...Array(4).fill(createMockCard('Mystical Dispute', 'Instant', 2)),
  ...Array(4).fill(createMockCard('Expressive Iteration', 'Instant', 2, 'Draw two cards.')),
  ...Array(4).fill(createMockCard('Farewell', 'Sorcery', 4)),
  ...Array(4).fill(createMockCard('Supreme Verdict', 'Sorcery', 4)),
  ...Array(4).fill(createMockCard('Teferi, Hero of Dominaria', 'Planeswalker', 5)),
  ...Array(4).fill(createMockCard('Memory Deluge', 'Instant', 5)),
  ...Array(4).fill(createMockCard('Chrome Host', 'Artifact', 6)),
  ...Array(4).fill(createMockCard('Ugin, the Spirit Dragon', 'Planeswalker', 8)),
];

console.log('=== TEST KARsten FORMULA ===\n');

[testAggroDeck, testControlDeck].forEach((deck, i) => {
  const name = i === 0 ? 'AGGRO DECK' : 'CONTROL DECK';
  const nonLands = deck.filter(c => c.mana_value > 0);
  const vmp = calculateVMP(nonLands);
  const ra = calculateRA(nonLands);
  const mdfc = calculateMDFCAdjustment(deck);
  const lands = getKarstenLandCount(deck, false, false);

  console.log(`--- ${name} ---`);
  console.log(`Non-lands: ${nonLands.length}`);
  console.log(`VMP (Avg CMC): ${vmp.toFixed(2)}`);
  console.log(`RA (Ramp/Draw ≤2): ${ra}`);
  console.log(`MDFC Adjust: ${mdfc.toFixed(2)}`);
  console.log(`Tierras recomendadas: ${lands}`);
  console.log(`Expected (Karsten): ${i === 0 ? '~20' : '~26'}`);
  console.log('');
});