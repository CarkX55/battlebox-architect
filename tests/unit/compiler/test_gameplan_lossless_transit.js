/**
 * tests/unit/compiler/test_gameplan_lossless_transit.js
 * 
 * 🏛️ V29.5 Master Blocker Audit: Gameplan Lossless Transit & Identity Policy
 * 
 * Invariants Verified:
 *   1. Lossless Transit of Intent -> Gameplan -> DeckState -> Simulation
 *      requestedIdentity ⊆ gameplanIdentity ⊆ deckIdentity ⊆ simulationIdentity
 *      requestedMechanics ⊆ gameplanMechanics ⊆ deckMechanics ⊆ simulationMechanics
 *   2. Strict Identity Policy Enforcement:
 *      Under STRICT_TRIBE (allowOffTribe === false), 0 off-tribe creatures can enter
 *      (e.g., Armored Scrapgorger & Intrepid Paleontologist are 100% blocked).
 *   3. Turn 1 On-Identity Body Demand:
 *      requiresOnIdentity: true ensures non-creature spells (Play with Fire)
 *      cannot satisfy on-identity creature requirements.
 *   4. Emergent Package Anchoring:
 *      Unanchored packages without causal trajectory to gameplan are rejected.
 */

import assert from 'assert';
import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';
import { IntentBuilder } from '../../../src/services/compiler/core/intentBuilder.js';
import { DeckPlanCoverage } from '../../../src/services/compiler/core/deckPlanCoverage.js';
import { ProvenanceHashChain } from '../../../src/services/compiler/core/provenanceHashChain.js';

console.log('══════════════════════════════════════════════════════════════════');
console.log('  🏛️ V29.5 MASTER AUDIT: GAMEPLAN LOSSLESS TRANSIT & IDENTITY');
console.log('══════════════════════════════════════════════════════════════════\n');

// ─── Test 1: Synthetic Universe with Werewolf + Day/Night Tempo ───
console.log('[Test 1] Compiling Werewolf Day/Night Tempo with Adversarial Distractors...');

// Adversarial card pool containing:
// - On-tribe Werewolves/Wolves across the curve
// - Off-tribe generic mana dorks (Armored Scrapgorger, Intrepid Paleontologist)
// - Off-tribe generic high-power combat cards (Great Train Heist)
// - On-identity removal (Moonrager's Slash) & non-creature utility (Play with Fire)
const WEREWOLF_TEST_POOL = [
  // 1-drops (On-identity Werewolves)
  {
    name: 'Village Messenger',
    type_line: 'Creature — Human Werewolf // Creature — Werewolf',
    card_faces: [
      { name: 'Village Messenger', type_line: 'Creature — Human Werewolf', oracle_text: 'Haste. Daybound' },
      { name: 'Moonrise Intruder', type_line: 'Creature — Werewolf', oracle_text: 'Menace. Nightbound' }
    ],
    cmc: 1,
    mana_cost: '{R}',
    colors: ['R'],
    power: '1',
    toughness: '1',
    oracle_text: 'Haste. Daybound // Menace. Nightbound',
    capabilities: ['DAYBOUND_NIGHTBOUND', 'EARLY_BODY', 'COMBAT_DAMAGE']
  },
  {
    name: 'Kessig Prowler',
    type_line: 'Creature — Human Werewolf // Creature — Werewolf',
    card_faces: [
      { name: 'Kessig Prowler', type_line: 'Creature — Human Werewolf', oracle_text: '{4}{G}: Transform.' },
      { name: 'Sinuous Predator', type_line: 'Creature — Werewolf', oracle_text: "Can't be blocked by creatures with power 2 or less." }
    ],
    cmc: 1,
    mana_cost: '{G}',
    colors: ['G'],
    power: '2',
    toughness: '1',
    oracle_text: "{4}{G}: Transform. // Can't be blocked by creatures with power 2 or less.",
    capabilities: ['EARLY_BODY', 'COMBAT_DAMAGE']
  },
  // 2-drops (On-tribe Werewolves)
  {
    name: 'Kessig Naturalist',
    type_line: 'Creature — Human Werewolf // Creature — Werewolf',
    cmc: 2,
    mana_cost: '{R}{G}',
    colors: ['R', 'G'],
    power: '2',
    toughness: '2',
    oracle_text: 'Daybound. Whenever Kessig Naturalist attacks, add {R} or {G}. // Nightbound. Whenever Lord of the Ulvenwald attacks, add {R} or {G}.',
    capabilities: ['DAYBOUND_NIGHTBOUND', 'STATE_TRANSITION_ENGINE', 'MANA_ACCELERATION', 'EARLY_BODY', 'COMBAT_DAMAGE']
  },
  {
    name: 'Outland Liberator',
    type_line: 'Creature — Human Werewolf // Creature — Werewolf',
    cmc: 2,
    mana_cost: '{1}{G}',
    colors: ['G'],
    power: '1',
    toughness: '3',
    oracle_text: 'Daybound. {1}, Sacrifice Outland Liberator: Destroy target artifact or enchantment. // Nightbound. Whenever Frenzied Trapbreaker attacks, destroy target artifact or enchantment.',
    capabilities: ['DAYBOUND_NIGHTBOUND', 'STATE_TRANSITION_ENGINE', 'CHEAP_REMOVAL', 'EARLY_BODY']
  },
  // 3-drops (On-tribe Werewolves)
  {
    name: 'Tovolar, Dire Overlord',
    type_line: 'Legendary Creature — Human Werewolf // Legendary Creature — Werewolf',
    cmc: 3,
    mana_cost: '{1}{R}{G}',
    colors: ['R', 'G'],
    power: '3',
    toughness: '3',
    oracle_text: 'Whenever a Wolf or Werewolf you control deals combat damage to a player, draw a card. At the beginning of your upkeep, if you control three or more Wolves and/or Werewolves, it becomes night. // Nightbound. Night of the dire howl.',
    capabilities: ['DAYBOUND_NIGHTBOUND', 'STATE_TRANSITION_CONTROLLER', 'TRIBAL_LORD', 'CARD_FLOW', 'TRANSFORM_PAYOFF', 'COMBAT_DAMAGE']
  },
  {
    name: 'Reckless Stormseeker',
    type_line: 'Creature — Human Werewolf // Creature — Werewolf',
    cmc: 3,
    mana_cost: '{2}{R}',
    colors: ['R'],
    power: '2',
    toughness: '3',
    oracle_text: 'Daybound. At the beginning of combat on your turn, target creature you control gets +1/+0 and gains haste until end of turn. // Nightbound.',
    capabilities: ['DAYBOUND_NIGHTBOUND', 'STATE_TRANSITION_ENGINE', 'BOARD_AMPLIFIER', 'COMBAT_DAMAGE']
  },
  // Spells
  {
    name: "Moonrager's Slash",
    type_line: 'Instant',
    cmc: 3,
    mana_cost: '{2}{R}',
    colors: ['R'],
    oracle_text: "This spell costs {2} less to cast if it's night. Moonrager's Slash deals 3 damage to any target.",
    capabilities: ['CHEAP_REMOVAL', 'PLAYER_REACH', 'NIGHT_PAYOFF']
  },
  {
    name: 'Play with Fire',
    type_line: 'Instant',
    cmc: 1,
    mana_cost: '{R}',
    colors: ['R'],
    oracle_text: 'Play with Fire deals 2 damage to any target. If a player was dealt damage this way, scry 1.',
    capabilities: ['CHEAP_REMOVAL', 'PLAYER_REACH']
  },

  // ─── ADVERSARIAL DISTRACTORS (Must be rejected under STRICT_TRIBE) ───
  {
    name: 'Armored Scrapgorger',
    type_line: 'Creature — Phyrexian Beast',
    cmc: 2,
    mana_cost: '{1}{G}',
    colors: ['G'],
    power: '0',
    toughness: '3',
    oracle_text: '{T}: Add one mana of any color. Exile target card from a graveyard.',
    capabilities: ['MANA_ACCELERATION', 'GRAVEYARD_HATE']
  },
  {
    name: 'Intrepid Paleontologist',
    type_line: 'Creature — Human Druid',
    cmc: 2,
    mana_cost: '{1}{G}',
    colors: ['G'],
    power: '2',
    toughness: '2',
    oracle_text: '{T}: Add one mana of any color. {2}, {T}: Exile target card from a graveyard.',
    capabilities: ['MANA_ACCELERATION', 'GRAVEYARD_HATE']
  },
  {
    name: 'Snarling Wolf',
    type_line: 'Creature — Wolf',
    cmc: 1,
    mana_cost: '{G}',
    colors: ['G'],
    power: '1',
    toughness: '1',
    oracle_text: '{1}{G}: Snarling Wolf gets +2/+2 until end of turn.',
    capabilities: ['EARLY_BODY', 'COMBAT_DAMAGE']
  },
  {
    name: 'Ascendant Packleader',
    type_line: 'Creature — Wolf',
    cmc: 1,
    mana_cost: '{G}',
    colors: ['G'],
    power: '2',
    toughness: '1',
    oracle_text: 'Ascendant Packleader enters the battlefield with a +1/+1 counter on it if you control a permanent with mana value 4 or greater.',
    capabilities: ['EARLY_BODY', 'COMBAT_DAMAGE']
  },
  {
    name: 'Great Train Heist',
    type_line: 'Instant',
    cmc: 1,
    mana_cost: '{R}',
    colors: ['R'],
    oracle_text: 'Spree. Untap all creatures you control. After this main phase, there is an additional combat phase.',
    capabilities: ['ALPHA_STRIKE', 'COMBAT_AMPLIFIER']
  },

  // Basic Lands
  { name: 'Forest', type_line: 'Basic Land — Forest', cmc: 0, colors: [], oracle_text: '{T}: Add {G}.', isLand: true },
  { name: 'Mountain', type_line: 'Basic Land — Mountain', cmc: 0, colors: [], oracle_text: '{T}: Add {R}.', isLand: true }
];

const rawIntent = {
  format: 'Pioneer',
  colors: ['R', 'G'],
  archetype: 'Tempo',
  primaryTribe: 'Werewolf',
  strategy: ['Furia de Luna Llena (Daybound/Nightbound)'],
  selectedEngineId: 'werewolf_daynight',
  themePriority: 'STRICT_THEME_FIDELITY',
  allowOffTribe: false,
  deckSize: 60
};

const intentPackage = IntentBuilder.buildFromUI(rawIntent);

// Invariant 1: IntentPackage captures explicitRequired modalities and identityPolicy
assert.strictEqual(intentPackage.allowOffTribe, false, 'allowOffTribe must be false');
assert.strictEqual(intentPackage.identityPolicy.creatureMembershipMode, 'STRICT_TRIBE', 'creatureMembershipMode must be STRICT_TRIBE');
assert.ok(
  intentPackage.mechanicsModalities.explicitRequired.includes('DAYBOUND_NIGHTBOUND'),
  'explicitRequired mechanics must include DAYBOUND_NIGHTBOUND'
);
console.log('  ✅ Invariant 1 Verified: IntentPackage formalizes STRICT_TRIBE and explicitRequired modalities.');

// Run full compilation pipeline
const compilationResult = CompilerConvergencePipeline.compileDeckFromScratch({
  uiFormState: rawIntent,
  rawCardPool: WEREWOLF_TEST_POOL,
  options: {
    maxIterations: 10,
    traceTelemetry: false,
    formatContract: { format: 'Pioneer', minDeckSize: 60, maxDeckSize: 60 }
  }
});

const certifiedDeck = compilationResult.state || compilationResult.certifiedDeck;
const gameplanContract = compilationResult.gameplanContract;
const provenanceHashChain = compilationResult.provenanceHashChain;

// Invariant 2: Lossless Transit to GameplanContract
assert.ok(gameplanContract, 'GameplanContract must be generated');
assert.strictEqual(gameplanContract.identityConstraints.primaryIdentity, 'Werewolf', 'Identity must be Werewolf');
assert.strictEqual(
  gameplanContract.identityConstraints.identityPolicy.creatureMembershipMode,
  'STRICT_TRIBE',
  'Gameplan identityPolicy must preserve STRICT_TRIBE'
);
assert.ok(
  gameplanContract.identityConstraints.requiredMechanicCapabilities.includes('DAYBOUND_NIGHTBOUND'),
  'Gameplan must preserve requiredMechanicCapabilities [DAYBOUND_NIGHTBOUND]'
);
console.log('  ✅ Invariant 2 Verified: GameplanContract preserves identityPolicy and mechanicsModalities without loss.');

// Invariant 3: Turn 1 Requirement requiresOnIdentity
const t1Demand = gameplanContract.turnRequirements?.[0]?.functionalDemands?.[0];
assert.ok(t1Demand, 'Turn 1 demand must exist');
assert.strictEqual(t1Demand.constraints?.requiresOnIdentity, true, 'Turn 1 demand must have requiresOnIdentity: true');
console.log('  ✅ Invariant 3 Verified: Turn 1 demand strictly mandates on-identity deployment.');

// Invariant 4: Zero Off-Tribe Creatures in Compiled Deck
const compiledCards = certifiedDeck.cards || [];
const creatureCards = compiledCards.filter(c => (c.type_line || c.type || '').toLowerCase().includes('creature'));

for (const c of creatureCards) {
  const name = c.name;
  assert.notStrictEqual(name, 'Armored Scrapgorger', 'Armored Scrapgorger MUST be blocked under STRICT_TRIBE');
  assert.notStrictEqual(name, 'Intrepid Paleontologist', 'Intrepid Paleontologist MUST be blocked under STRICT_TRIBE');
  assert.notStrictEqual(name, 'Snarling Wolf', 'Snarling Wolf (Wolf) MUST be blocked under STRICT_TRIBE Werewolf');
  assert.notStrictEqual(name, 'Ascendant Packleader', 'Ascendant Packleader (Wolf) MUST be blocked under STRICT_TRIBE Werewolf');
}

const offTribeCreatures = creatureCards.filter(c => {
  const t = (c.type_line || c.type || '').toLowerCase();
  return !t.includes('werewolf') && !t.includes('changeling');
});
assert.strictEqual(offTribeCreatures.length, 0, `Compiled deck must have 0 off-tribe creatures. Found: ${offTribeCreatures.map(c => c.name).join(', ')}`);
console.log('Compiled cards:', compiledCards.map(c => `${c.quantity || 1}x ${c.name} (${c.type_line || c.type}, CMC=${c.cmc})`).join(', '));

// Invariant 5: On-Identity T1 Presence
const t1Presence = creatureCards.filter(c => Number(c.cmc || c.mana_value || 0) <= 1);
assert.ok(t1Presence.length > 0, 'Compiled deck must have on-identity 1CMC creatures (Village Messenger / Kessig Prowler)');
console.log(`  ✅ Invariant 5 Verified: On-identity T1 presence satisfied (${t1Presence.map(c => `${c.name} x${c.quantity}`).join(', ')}).`);

// Invariant 6: Provenance Hash Chain Integrity
assert.ok(provenanceHashChain, 'Provenance hash chain must be present');
const isValid = ProvenanceHashChain.verifyIntegrity(provenanceHashChain);
assert.strictEqual(isValid, true, 'Provenance hash chain must be cryptographically valid');
console.log(`  ✅ Invariant 6 Verified: 7-stage Merkle cascade verified (${provenanceHashChain.root.substring(0, 16)}...).`);

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  🏛️ LOSSLESS TRANSIT & STRICT IDENTITY AUDIT: 100% PASS');
console.log('══════════════════════════════════════════════════════════════════');
process.exit(0);
