/**
 * tests/benchmarks/test_v29_11_ui_publication_boundary.js
 * 
 * V29.11 UI Publication Boundary & Sovereign Authority Benchmark.
 * 
 * Audits the Sovereign Publication Boundary Contract between Compiler,
 * Architect Service, and UI (DeckForge):
 * 
 *   INVARIANT 1 (REJECTED / UNPUBLISHED CASE):
 *     - publishedDeck === null
 *     - publicationReceipt === null
 *     - quarantinedCandidate !== null && quarantinedCandidate.quarantinedCards is populated
 *     - UI main deck cards count === 0 (suppressed, never rendered as "deck of 0 cards")
 *     - hasPublishedDeck === false
 *     - canTestHand === false, canExport === false, canArchive === false, canRate === false
 *     - Audit/Forensic operations remain accessible on quarantinedCandidate
 * 
 *   INVARIANT 2 (PUBLISHED CASE):
 *     - publishedDeck !== null
 *     - publicationReceipt !== null && publicationReceipt.status === 'PUBLISHED'
 *     - canonicalPublishedDeckHash matches frozenDeckProjectionHash
 *     - publishedDeck.cards !== quarantinedCandidate?.quarantinedCards (deep reference & semantic isolation)
 *     - hasPublishedDeck === true
 *     - canTestHand === true, canExport === true, canArchive === true, canRate === true
 * 
 *   INVARIANT 3 (ANTI-FALLBACK SOVEREIGNTY):
 *     - publishedDeck is NEVER fabricated or fallen back to { cards: cleanFinalDeck }
 *       when a publication receipt is missing or uncertified.
 * 
 * Run: node tests/benchmarks/test_v29_11_ui_publication_boundary.js
 */

import { strict as assert } from 'assert';
import { CompilerConvergencePipeline } from '../../src/knowledge/compiler/CompilerConvergencePipeline.js';
import { assembleDeckFromBlueprint } from '../../src/services/deckArchitectService.js';
import { PublicationReceipt } from '../../src/services/compiler/core/publicationReceipt.js';

console.log('================================================================');
console.log('  V29.11 UI PUBLICATION BOUNDARY & SOVEREIGN CONTRACT BENCHMARK');
console.log('================================================================\n');

function createRichViableCardPool() {
  return [
    // 1-Drops (Red Aggro / Burn)
    { name: 'Monastery Swiftspear', type_line: 'Creature — Human Monk', oracle_text: 'Haste, Prowess', cmc: 1, power: '1', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Soul-Scar Mage', type_line: 'Creature — Human Wizard', oracle_text: 'Prowess', cmc: 1, power: '1', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Kumano Faces Kakkazan', type_line: 'Enchantment — Saga', oracle_text: 'Deals 1 damage to each opponent. Next creature enters with +1/+1 counter.', cmc: 1, colors: ['R'], color_identity: ['R'] },
    { name: 'Play with Fire', type_line: 'Instant', oracle_text: 'Play with Fire deals 2 damage to any target. Scry 1.', cmc: 1, colors: ['R'], color_identity: ['R'] },
    { name: 'Lightning Bolt', type_line: 'Instant', oracle_text: 'Lightning Bolt deals 3 damage to any target.', cmc: 1, colors: ['R'], color_identity: ['R'] },
    { name: 'Spikefield Hazard', type_line: 'Instant // Land', oracle_text: 'Deals 1 damage to any target. If it dies, exile it.', cmc: 1, colors: ['R'], color_identity: ['R'] },

    // 2-Drops
    { name: 'Eidolon of the Great Revel', type_line: 'Enchantment Creature — Spirit', oracle_text: 'Whenever a player casts a spell with mana value 3 or less, Eidolon deals 2 damage to that player.', cmc: 2, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Kari Zev, Skyship Raider', type_line: 'Legendary Creature — Human Pirate', oracle_text: 'First strike, menace. Whenever Kari Zev attacks, create Ragavan.', cmc: 2, power: '1', toughness: '3', colors: ['R'], color_identity: ['R'] },
    { name: 'Roil Eruption', type_line: 'Sorcery', oracle_text: 'Roil Eruption deals 3 damage to any target.', cmc: 2, colors: ['R'], color_identity: ['R'] },
    { name: 'Searing Blood', type_line: 'Instant', oracle_text: 'Searing Blood deals 2 damage to target creature. If it dies, deals 3 damage to player.', cmc: 2, colors: ['R'], color_identity: ['R'] },
    { name: 'Abrade', type_line: 'Instant', oracle_text: 'Choose one — Deals 3 damage to target creature; or destroy target artifact.', cmc: 2, colors: ['R'], color_identity: ['R'] },

    // 3-Drops
    { name: 'Bonecrusher Giant', type_line: 'Creature — Giant', oracle_text: 'Stomp deals 2 damage to any target. Whenever Bonecrusher Giant becomes target, deals 2 damage to player.', cmc: 3, power: '4', toughness: '3', colors: ['R'], color_identity: ['R'] },
    { name: 'Chandra, Dressed to Kill', type_line: 'Legendary Planeswalker — Chandra', oracle_text: '+1: Add {R}. Deals 1 damage. +1: Exile top card of library. -7: Emblem.', cmc: 3, colors: ['R'], color_identity: ['R'] },

    // Lands
    { name: 'Mountain', type_line: 'Basic Land — Mountain', oracle_text: '{T}: Add {R}.', cmc: 0, colors: [], color_identity: ['R'] },
    { name: 'Den of the Bugbear', type_line: 'Land', oracle_text: '{T}: Add {R}. Becomes creature.', cmc: 0, colors: [], color_identity: ['R'] },
    { name: 'Ramunap Ruins', type_line: 'Land — Desert', oracle_text: '{T}: Add {R}. Sacrifice Desert: Deals 2 damage.', cmc: 0, colors: [], color_identity: ['R'] }
  ];
}

function createDeficitCardPool() {
  return [
    { name: 'Gilded Goose', type_line: 'Creature — Bird', oracle_text: 'Flying. Enters: create Food. {T}: Add one mana of any color.', cmc: 1, power: '0', toughness: '2', colors: ['G'], color_identity: ['G'] },
    { name: 'Elvish Mystic', type_line: 'Creature — Elf Druid', oracle_text: '{T}: Add {G}.', cmc: 1, power: '1', toughness: '1', colors: ['G'], color_identity: ['G'] },
    { name: 'Elder Gargaroth', type_line: 'Creature — Beast', oracle_text: 'Vigilance, reach, trample. Attacks or blocks: create 3/3, gain 3 life, or draw a card.', cmc: 5, power: '6', toughness: '6', colors: ['G'], color_identity: ['G'] },
    { name: 'Carnage Tyrant', type_line: 'Creature — Dinosaur', oracle_text: 'Cannot be countered. Trample, hexproof.', cmc: 6, power: '7', toughness: '6', colors: ['G'], color_identity: ['G'] },
    { name: 'Craterhoof Behemoth', type_line: 'Creature — Beast', oracle_text: 'Haste. Enters: creatures get +X/+X and trample.', cmc: 8, power: '5', toughness: '5', colors: ['G'], color_identity: ['G'] },
    { name: 'Sheoldred, the Apocalypse', type_line: 'Legendary Creature — Phyrexian Praetor', oracle_text: 'Deathtouch. Draw card: gain 2 life. Opponent draws: loses 2 life.', cmc: 4, power: '4', toughness: '5', colors: ['B'], color_identity: ['B'] },
    { name: 'Forest', type_line: 'Basic Land — Forest', oracle_text: '{T}: Add {G}.', cmc: 0, colors: [], color_identity: ['G'] },
    { name: 'Swamp', type_line: 'Basic Land — Swamp', oracle_text: '{T}: Add {B}.', cmc: 0, colors: [], color_identity: ['B'] }
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: REJECTED / UNPUBLISHED CANDIDATE (Smoking Gun Reproduction)
// ─────────────────────────────────────────────────────────────────────────────
console.log('[TEST 1] Rejected / Uncertified Candidate Boundary Audit...');

const deficitCompilation = CompilerConvergencePipeline.compileDeckFromScratch({
  userPrompt: 'Quiero un mazo competitivo Midrange Golgari pero sin cartas baratas.',
  archetype: 'Midrange',
  format: 'Pioneer',
  rawCardPool: createDeficitCardPool(),
  uiFormState: {
    archetype: 'Midrange',
    format: 'Pioneer',
    colors: ['B', 'G'],
    deckSize: 60,
    powerLevel: 'COMPETITIVE'
  }
});

const uiResultRejected = await assembleDeckFromBlueprint(
  {},
  { format: 'Pioneer', archetype: 'Midrange', colors: ['B', 'G'], deckSize: 60 },
  {},
  () => {},
  { convergenceResult: deficitCompilation }
);

console.log(`  Compilation buildStatus:     ${deficitCompilation.buildStatus}`);
console.log(`  UI publishedDeck is null:    ${uiResultRejected.publishedDeck === null}`);
console.log(`  UI publicationReceipt null:  ${uiResultRejected.publicationReceipt === null}`);
console.log(`  UI cards length (suppressed):${uiResultRejected.cards.length}`);
console.log(`  UI quarantinedCandidate:     ${uiResultRejected.quarantinedCandidate !== null}`);
console.log(`  Quarantined cards count:     ${uiResultRejected.quarantinedCandidate?.quarantinedCards?.length}`);
console.log(`  Quarantined status:          ${uiResultRejected.quarantinedCandidate?.status}`);
console.log(`  Terminal Reason:             ${uiResultRejected.quarantinedCandidate?.terminalReason}`);

// Contract Invariant Assertions
assert.strictEqual(uiResultRejected.publishedDeck, null, 'INVARIANT: publishedDeck MUST BE NULL on failed certification');
assert.strictEqual(uiResultRejected.publicationReceipt, null, 'INVARIANT: publicationReceipt MUST BE NULL on failed certification');
assert.strictEqual(uiResultRejected.cards.length, 0, 'INVARIANT: cleanFinalDeck cards MUST BE 0 so UI never mounts uncertified deck');
assert.notStrictEqual(uiResultRejected.quarantinedCandidate, null, 'INVARIANT: quarantinedCandidate must be present');
assert.strictEqual(uiResultRejected.quarantinedCandidate.status, 'NOT_PUBLISHED', 'INVARIANT: quarantinedCandidate status must be NOT_PUBLISHED');
assert.strictEqual(uiResultRejected.quarantinedCandidate.isQuarantined, true, 'INVARIANT: quarantinedCandidate must be marked isQuarantined: true');
assert.strictEqual(uiResultRejected.quarantinedCandidate.quarantinedCards.length > 0, true, 'INVARIANT: quarantinedCards must preserve candidate cards for autopsy');

// Structural Isolation & Deep Immutability Assertions
assert.strictEqual(Object.isFrozen(uiResultRejected.quarantinedCandidate.quarantinedCards), true, 'INVARIANT: quarantinedCards array must be Object.freeze');
const firstQuarantined = uiResultRejected.quarantinedCandidate.quarantinedCards[0];
assert.strictEqual(firstQuarantined.isQuarantined, true, 'INVARIANT: Card must carry structural isQuarantined flag');
assert.strictEqual(firstQuarantined.quarantineStatus, 'QUARANTINED_UNPUBLISHED_CANDIDATE', 'INVARIANT: Card must carry explicit quarantineStatus');
assert.strictEqual(firstQuarantined.isCertified, false, 'INVARIANT: Card isCertified must be false');
assert.strictEqual(firstQuarantined.isPlayable, false, 'INVARIANT: Card isPlayable must be false');
assert.strictEqual(Object.isFrozen(firstQuarantined), true, 'INVARIANT: Quarantined card object must be frozen');

// Sovereign UI Gate Authority: (receipt status === 'PUBLISHED' + matching deckHash)
const receiptRejected = uiResultRejected.publicationReceipt;
const receiptRejectedHash = receiptRejected?.canonicalPublishedDeckHash || receiptRejected?.publishedDeckHash;
const publishedRejectedHash = uiResultRejected.publishedDeck?.deckHash;

const hasPublishedDeckRejected = Boolean(
  receiptRejected?.status === 'PUBLISHED' &&
  receiptRejectedHash &&
  publishedRejectedHash &&
  receiptRejectedHash === publishedRejectedHash &&
  Array.isArray(uiResultRejected.publishedDeck?.cards) &&
  uiResultRejected.publishedDeck.cards.length > 0
);

assert.strictEqual(hasPublishedDeckRejected, false, 'hasPublishedDeck MUST BE false for uncertified candidate');

const canTestHandRejected = hasPublishedDeckRejected;
const canExportRejected = hasPublishedDeckRejected;
const canArchiveRejected = hasPublishedDeckRejected;
const canRateRejected = hasPublishedDeckRejected;

assert.strictEqual(canTestHandRejected, false, 'Test Hand MUST BE blocked when publishedDeck is null');
assert.strictEqual(canExportRejected, false, 'Export MUST BE blocked when publishedDeck is null');
assert.strictEqual(canArchiveRejected, false, 'Archive MUST BE blocked when publishedDeck is null');
assert.strictEqual(canRateRejected, false, 'Rate Deck MUST BE blocked when publishedDeck is null');

console.log('  -> PASS: Rejected / Uncertified candidate boundary strictly preserves quarantine with structural immutability.\n');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: PUBLISHED CERTIFIED CASE
// ─────────────────────────────────────────────────────────────────────────────
console.log('[TEST 2] Published Certified Deck Boundary Audit...');

const viableCompilation = CompilerConvergencePipeline.compileDeckFromScratch({
  userPrompt: 'Quiero un mazo agresivo Mono Red Burn para Pioneer.',
  archetype: 'Aggro',
  format: 'Pioneer',
  rawCardPool: createRichViableCardPool(),
  uiFormState: {
    archetype: 'Aggro',
    format: 'Pioneer',
    colors: ['R'],
    deckSize: 60,
    powerLevel: 'COMPETITIVE'
  }
});

const uiResultPublished = await assembleDeckFromBlueprint(
  {},
  { format: 'Pioneer', archetype: 'Aggro', colors: ['R'], deckSize: 60 },
  {},
  () => {},
  { convergenceResult: viableCompilation }
);

console.log(`  Compilation buildStatus:     ${viableCompilation.buildStatus}`);
console.log(`  UI publishedDeck exists:     ${uiResultPublished.publishedDeck !== null}`);
console.log(`  UI receipt status:           ${uiResultPublished.publicationReceipt?.status}`);
console.log(`  UI published cards count:    ${uiResultPublished.publishedDeck?.cards?.length}`);
console.log(`  UI published deckHash:       ${uiResultPublished.publishedDeck?.deckHash}`);
console.log(`  UI receipt deckHash:         ${uiResultPublished.publicationReceipt?.canonicalPublishedDeckHash}`);
console.log(`  UI quarantinedCandidate:     ${uiResultPublished.quarantinedCandidate === null}`);

// Contract Invariant Assertions
assert.notStrictEqual(uiResultPublished.publishedDeck, null, 'INVARIANT: publishedDeck must be populated for certified deck');
assert.notStrictEqual(uiResultPublished.publicationReceipt, null, 'INVARIANT: publicationReceipt must be present');
assert.strictEqual(uiResultPublished.publicationReceipt.status, 'PUBLISHED', 'INVARIANT: publicationReceipt.status must be PUBLISHED');
assert.strictEqual(uiResultPublished.quarantinedCandidate, null, 'INVARIANT: quarantinedCandidate must be null for certified deck');
assert.strictEqual(uiResultPublished.publishedDeck.deckHash, uiResultPublished.publicationReceipt.canonicalPublishedDeckHash, 'INVARIANT: publishedDeck.deckHash MUST MATCH publicationReceipt.canonicalPublishedDeckHash');

const totalPhysicalCards = uiResultPublished.cards.reduce((sum, c) => sum + (c.quantity || 1), 0);
assert.strictEqual(totalPhysicalCards, 60, 'INVARIANT: published deck must contain exact target 60 physical cards');
assert.strictEqual(uiResultPublished.publishedDeck.cards.reduce((sum, c) => sum + (c.quantity || 1), 0), 60, 'INVARIANT: publishedDeck.cards must contain exact target 60 physical cards');

// Reference, Structural and Semantic Isolation Assertion
if (uiResultRejected.quarantinedCandidate) {
  assert.notStrictEqual(
    uiResultPublished.publishedDeck.cards,
    uiResultRejected.quarantinedCandidate.quarantinedCards,
    'INVARIANT: publishedDeck.cards must NEVER share object reference with quarantinedCards'
  );
}

// Published cards must NOT have quarantine tags
const firstPublishedCard = uiResultPublished.publishedDeck.cards[0];
assert.strictEqual(firstPublishedCard.isQuarantined, undefined, 'Certified published card must NOT carry isQuarantined flag');

// Sovereign UI Gate Authority: (receipt status === 'PUBLISHED' + matching deckHash)
const receiptApproved = uiResultPublished.publicationReceipt;
const receiptApprovedHash = receiptApproved?.canonicalPublishedDeckHash || receiptApproved?.publishedDeckHash;
const publishedApprovedHash = uiResultPublished.publishedDeck?.deckHash;

const hasPublishedDeckApproved = Boolean(
  receiptApproved?.status === 'PUBLISHED' &&
  receiptApprovedHash &&
  publishedApprovedHash &&
  receiptApprovedHash === publishedApprovedHash &&
  Array.isArray(uiResultPublished.publishedDeck?.cards) &&
  uiResultPublished.publishedDeck.cards.length > 0
);

assert.strictEqual(hasPublishedDeckApproved, true, 'hasPublishedDeck MUST BE true for certified published deck');

const canTestHandApproved = hasPublishedDeckApproved;
const canExportApproved = hasPublishedDeckApproved;
const canArchiveApproved = hasPublishedDeckApproved;
const canRateApproved = hasPublishedDeckApproved;

assert.strictEqual(canTestHandApproved, true, 'Test Hand is available for published deck');
assert.strictEqual(canExportApproved, true, 'Export is available for published deck');
assert.strictEqual(canArchiveApproved, true, 'Archive is available for published deck');
assert.strictEqual(canRateApproved, true, 'Rate is available for published deck');

console.log('  -> PASS: Published deck boundary certified and verified under receipt status + deckHash authority.\n');

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: ANTI-FALLBACK & TAMPERED HASH INVARIANCE AUDIT
// ─────────────────────────────────────────────────────────────────────────────
console.log('[TEST 3] Anti-Fallback & Tampered Hash Invariance Audit...');

// Subtest 3.1: Missing publicationReceipt -> assembleDeckFromBlueprint NEVER falls back
const missingReceiptConvergence = {
  buildStatus: 'SUCCESS',
  compilationOutcome: {
    publishability: true,
    publishedDeck: { cards: [{ name: 'Rogue Card', quantity: 4 }] },
    publicationReceipt: null // Missing receipt!
  },
  publicationReceipt: null,
  certifiedDeck: { cards: [{ name: 'Rogue Card', quantity: 4 }] }
};

const uiResultMissingReceipt = await assembleDeckFromBlueprint(
  {},
  { format: 'Pioneer', archetype: 'Aggro', colors: ['R'], deckSize: 60 },
  {},
  () => {},
  { convergenceResult: missingReceiptConvergence }
);

assert.strictEqual(uiResultMissingReceipt.publishedDeck, null, 'SOVEREIGN GATE: publishedDeck must be null when PublicationReceipt is missing');
assert.strictEqual(uiResultMissingReceipt.cards.length, 0, 'SOVEREIGN GATE: cards must be empty when PublicationReceipt is missing');
assert.strictEqual(uiResultMissingReceipt.isPublishable, false, 'SOVEREIGN GATE: isPublishable must be false without valid PublicationReceipt');

// Subtest 3.2: Tampered Hash Mismatch (receipt status === 'PUBLISHED' BUT hash does not match deck)
const tamperedHashConvergence = {
  buildStatus: 'SUCCESS',
  compilationOutcome: {
    publishability: true,
    publishedDeck: { cards: [{ name: 'Rogue Card', quantity: 4 }] },
    publicationReceipt: {
      status: 'PUBLISHED',
      canonicalPublishedDeckHash: 'FORGED_NON_MATCHING_HASH_000000000',
      receiptId: 'RECEIPT_FORGED'
    }
  },
  publicationReceipt: {
    status: 'PUBLISHED',
    canonicalPublishedDeckHash: 'FORGED_NON_MATCHING_HASH_000000000',
    receiptId: 'RECEIPT_FORGED'
  },
  certifiedDeck: { cards: [{ name: 'Rogue Card', quantity: 4 }] }
};

const uiResultTamperedHash = await assembleDeckFromBlueprint(
  {},
  { format: 'Pioneer', archetype: 'Aggro', colors: ['R'], deckSize: 60 },
  {},
  () => {},
  { convergenceResult: tamperedHashConvergence }
);

console.log(`  Tampered Hash publishedDeck: ${uiResultTamperedHash.publishedDeck === null}`);
console.log(`  Tampered Hash cards count:   ${uiResultTamperedHash.cards.length}`);
console.log(`  Tampered Hash isPublishable: ${uiResultTamperedHash.isPublishable}`);

assert.strictEqual(uiResultTamperedHash.publishedDeck, null, 'SOVEREIGN GATE: publishedDeck must be null when receipt hash mismatches deck');
assert.strictEqual(uiResultTamperedHash.cards.length, 0, 'SOVEREIGN GATE: cards must be empty when receipt hash mismatches deck');
assert.strictEqual(uiResultTamperedHash.isPublishable, false, 'SOVEREIGN GATE: isPublishable must be false when receipt hash mismatches deck');

console.log('  -> PASS: Zero-fallback sovereign authority with (receipt status + deckHash) confirmed.\n');

console.log('================================================================');
console.log('  ALL V29.11 UI PUBLICATION BOUNDARY INVARIANTS VERIFIED (100%)');
console.log('================================================================');
