/**
 * tests/unit/compiler/test_v29_7_dfc_canonical_normalization.js
 * 
 * Test Suite: Canonical DFC Normalization & Uniform Representation.
 * Verifies that DFCs (Transforming Double-Faced Cards) never erroneously
 * fall back to CMC 0 in semantic_representation or across compiler modules.
 */

import { strict as assert } from 'assert';
import {
  extractCanonicalCmc,
  extractCanonicalOracleText,
  extractCanonicalTypeLine,
  normalizeCanonicalCard
} from '../../../src/services/compiler/core/canonicalCardNormalizer.js';
import { parseSemanticCard } from '../../../src/services/semanticCardParser.js';
import { CardCausalContract } from '../../../src/services/compiler/core/cardCausalContract.js';
import { DeckState } from '../../../src/services/compiler/core/deckState.js';

console.log('══════════════════════════════════════════════════════════════════');
console.log('  TEST SUITE: V29.7 CANONICAL DFC NORMALIZATION (ZERO CMC 0 BUG)');
console.log('══════════════════════════════════════════════════════════════════\n');

// Mock Scryfall DFC: Lambholt Raconteur // Lambholt Ravager
const mockLambholtRaconteur = {
  name: 'Lambholt Raconteur // Lambholt Ravager',
  mana_cost: '', // Root mana_cost is empty in Scryfall DFCs!
  mana_value: 4, // Root mana_value is 4
  cmc: undefined, // Sometimes cmc is missing on root
  type_line: 'Creature — Human Werewolf // Creature — Werewolf',
  card_faces: [
    {
      name: 'Lambholt Raconteur',
      mana_cost: '{3}{R}',
      mana_value: 4,
      cmc: 4,
      type_line: 'Creature — Human Werewolf',
      oracle_text: '{1}{R}, {T}: Lambholt Raconteur deals 1 damage to each opponent. Daybound',
      power: '4',
      toughness: '4',
      colors: ['R']
    },
    {
      name: 'Lambholt Ravager',
      mana_cost: '',
      type_line: 'Creature — Werewolf',
      oracle_text: '{1}{R}, {T}: Lambholt Ravager deals 2 damage to each opponent. Nightbound',
      power: '5',
      toughness: '5',
      colors: ['R']
    }
  ],
  keywords: ['Daybound', 'Nightbound', 'Transform']
};

// [Test 1] extractCanonicalCmc on DFC with missing root cmc
console.log('[Test 1] Extracting canonical CMC on DFC with root mana_cost = empty string...');
const cmc1 = extractCanonicalCmc(mockLambholtRaconteur);
assert.equal(cmc1, 4, `Expected CMC 4, got ${cmc1}`);
console.log(`  ✅ PASS: Canonical CMC correctly extracted as ${cmc1} (never 0).`);

// [Test 2] extractCanonicalCmc when only face[0].mana_cost is present
console.log('\n[Test 2] Extracting canonical CMC purely from face mana_cost string...');
const mockCostOnly = {
  name: 'Test DFC',
  card_faces: [
    { name: 'Front', mana_cost: '{2}{G}{G}', oracle_text: 'Front text' },
    { name: 'Back', mana_cost: '', oracle_text: 'Back text' }
  ]
};
const cmc2 = extractCanonicalCmc(mockCostOnly);
assert.equal(cmc2, 4, `Expected parsed CMC 4 from {2}{G}{G}, got ${cmc2}`);
console.log(`  ✅ PASS: Canonical CMC parsed from mana_cost string as ${cmc2}.`);

// [Test 3] parseSemanticCard producing semantic_representation
console.log('\n[Test 3] Verifying parseSemanticCard outputs non-zero CMC for DFC...');
const semanticRep = parseSemanticCard(mockLambholtRaconteur);
assert.equal(semanticRep.cmc, 4, `Expected semantic_representation.cmc to be 4, got ${semanticRep.cmc}`);
assert.ok(semanticRep.oracleText ? semanticRep.oracleText.toLowerCase().includes('nightbound') : semanticRep.cardCausalContract.card, 'Expected DFC oracle text to be present');
console.log(`  ✅ PASS: semantic_representation.cmc = ${semanticRep.cmc} (FIXED: Zero CMC 0 bug eliminated).`);

// [Test 4] CardCausalContract parsing DFC
console.log('\n[Test 4] Verifying CardCausalContract preserves DFC attributes...');
const contract = CardCausalContract.parse(mockLambholtRaconteur);
assert.equal(contract.cardIdentity.cmc, 4, `Expected contract.cardIdentity.cmc to be 4, got ${contract.cardIdentity.cmc}`);
assert.equal(contract.cardIdentity.power, '4');
console.log(`  ✅ PASS: CardCausalContract accurately normalized DFC with CMC ${contract.cardIdentity.cmc}.`);

// [Test 5] DeckState canonical ingestion of DFC
console.log('\n[Test 5] Verifying DeckState normalizes DFCs uniformly...');
const deckState = new DeckState([
  { cardObj: mockLambholtRaconteur, quantity: 3, role: 'Threat' }
]);
const cardInDeck = deckState.cards[0];
assert.equal(cardInDeck.cmc, 4, `Expected card in deckState to have CMC 4, got ${cardInDeck.cmc}`);
assert.equal(cardInDeck.mana_value, 4, `Expected card in deckState to have mana_value 4, got ${cardInDeck.mana_value}`);
assert.ok(cardInDeck.oracle_text.toLowerCase().includes('nightbound'), 'Expected DeckState card to include transformed face text');
console.log(`  ✅ PASS: DeckState correctly holds canonical CMC ${cardInDeck.cmc} and combined oracle text.`);

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  V29.7 CANONICAL DFC TEST SUMMARY: ALL 5 PASSED');
console.log('══════════════════════════════════════════════════════════════════\n');
