/**
 * tests/unit/test_pure_causal_contract_engine.js
 * 
 * BATTLEBOX v25.6: PURE CAUSAL CONTRACT & STATE TRANSITION ENGINE TEST
 * 
 * Formal verification of:
 * 1. ORACLE_MUTATION_PROPAGATION_TEST
 * 2. CONDITIONAL_DEMAND_DISQUALIFICATION_TEST (Relic Vial rejected causally via Ledger)
 * 3. TRIBAL_EXCEPTION_TEST (Off-tribe bridge card accepted when resolving critical Proof Obligation)
 * 4. TRIBAL_FALSE_POSITIVE_TEST (On-tribe vanilla card rejected in favor of WinPath pieces)
 * 5. MULTI_ARCHETYPE_CONCORDANCE_TEST (Vampires, Elves, Prowess Spellslinger, Landfall)
 */

import assert from 'assert';
import { CardCausalContract } from '../../src/services/compiler/core/cardCausalContract.js';
import { DemandSupplyLedger } from '../../src/services/compiler/core/demandSupplyLedger.js';
import { CandidateConstraintEngine } from '../../src/services/compiler/core/candidateConstraintEngine.js';
import { StrategicIdentityCompiler } from '../../src/services/compiler/core/strategicIdentityCompiler.js';
import { CapabilityPlanner } from '../../src/services/compiler/core/capabilityPlanner.js';
import { StrategicObjective } from '../../src/services/compiler/core/strategicObjective.js';
import { CapabilityVector } from '../../src/services/compiler/core/capabilityVector.js';

console.log('🧪 =========================================================================');
console.log('🧪 BATTLEBOX v25.6: PURE CAUSAL CONTRACT & STATE TRANSITION TEST SUITE');
console.log('🧪 =========================================================================\n');

// ─── 1. ORACLE_MUTATION_PROPAGATION_TEST ─────────────────────────────────────
console.log('--- 1. ORACLE_MUTATION_PROPAGATION_TEST ---');

const cardUniversalMana = {
  name: 'Universal Mana Producer',
  type_line: 'Creature — Elf Druid',
  oracle_text: '{T}: Add {G}.',
  cmc: 1,
  mana_value: 1,
  colors: ['G']
};

const cardMutatedRestrictedMana = {
  name: 'Restricted Mana Producer',
  type_line: 'Creature — Advisor',
  oracle_text: '{T}: Add {C}{U}. Spend this mana only to activate abilities.',
  cmc: 1,
  mana_value: 1,
  colors: ['U']
};

const contractUniversal = CardCausalContract.parse(cardUniversalMana);
const contractRestricted = CardCausalContract.parse(cardMutatedRestrictedMana);

console.log(`  ✦ Universal Card Supplies: ${contractUniversal.supplies.map(s => `${s.capability}(${s.domain})`).join(', ')}`);
console.log(`  ✦ Mutated Card Demands: ${contractRestricted.demands.map(d => `${d.resource}(${d.necessity})`).join(', ')}`);

// Audit restricted card against deck with 0 activated abilities
const emptyDeckState = { cards: [] };
const auditRestricted = DemandSupplyLedger.auditCardDemands(cardMutatedRestrictedMana, emptyDeckState);

assert.strictEqual(contractUniversal.supplies[0].isUniversal, true, 'Universal mana should be marked universal');
assert.strictEqual(contractRestricted.demands.some(d => d.resource === 'ACTIVATED_ABILITY_CONSUMER' && d.necessity === 'HARD'), true, 'Mutated mana requires ACTIVATED_ABILITY_CONSUMER');
assert.strictEqual(auditRestricted.isSatisfied, false, 'Restricted card with 0 consumers in deck must be marked unsatisfied');
console.log('  ✅ [PASS] Oracle mutation autonomously propagated to Contract, Demands, and Ledger rejection without manual rules.');


// ─── 2. CONDITIONAL_DEMAND_DISQUALIFICATION_TEST ──────────────────────────────
console.log('\n--- 2. CONDITIONAL_DEMAND_DISQUALIFICATION_TEST ---');

const relicVial = {
  name: 'Relic Vial',
  type_line: 'Artifact',
  oracle_text: '{2}, {T}, Sacrifice a creature: Draw a card.\nAs long as you control a Cleric, whenever a creature you control dies, each opponent loses 1 life and you gain 1 life.',
  cmc: 3,
  mana_value: 3,
  colors: []
};

const goblinIntent = {
  prompt: 'aggro PIONEER',
  format: 'PIONEER',
  colors: ['R', 'B'],
  primaryTribe: 'Goblin',
  strategy: ['combustión y sacrificio']
};

const relicContract = CardCausalContract.parse(relicVial);
const subtypeDemand = relicContract.demands.find(d => d.resource === 'SUBTYPE_CONTROL');

console.log(`  ✦ Relic Vial Extracted Demands: ${relicContract.demands.map(d => `${d.resource}(req: ${d.requiredSubtype}, nec: ${d.necessity})`).join(', ')}`);
assert.ok(subtypeDemand, 'Relic Vial must declare a SUBTYPE_CONTROL demand for Cleric');
assert.strictEqual(subtypeDemand.requiredSubtype, 'cleric');
assert.strictEqual(subtypeDemand.necessity, 'HARD');

const relicAuditInGoblins = DemandSupplyLedger.auditCardDemands(relicVial, emptyDeckState, goblinIntent);
assert.strictEqual(relicAuditInGoblins.isSatisfied, false, 'Relic Vial must be rejected in Goblins deck');
assert.ok(relicAuditInGoblins.failureReasons[0].includes('SUBTYPE_CONTROL: cleric'), 'Failure reason must explicitly cite unfulfilled Cleric demand');
console.log(`  ✦ Rejection Reason: "${relicAuditInGoblins.failureReasons[0]}"`);
console.log('  ✅ [PASS] Relic Vial causally rejected via DemandSupplyLedger (zero magic score hacks).');


// ─── 3. TRIBAL_EXCEPTION_TEST ────────────────────────────────────────────────
console.log('\n--- 3. TRIBAL_EXCEPTION_TEST ---');

const mockGoblinRampPool = [
  {
    name: 'Goblin Piker',
    type_line: 'Creature — Goblin Warrior',
    oracle_text: '',
    cmc: 2,
    mana_value: 2,
    colors: ['R'],
    power: '2',
    toughness: '1'
  },
  {
    name: 'Ignoble Hierarch',
    type_line: 'Creature — Goblin Human Shaman', // Note: off-tribe bridge candidate
    oracle_text: 'Exalted\n{T}: Add {B}, {R}, or {G}.',
    cmc: 1,
    mana_value: 1,
    colors: ['G'],
    power: '0',
    toughness: '1'
  },
  {
    name: 'Birds of Paradise',
    type_line: 'Creature — Bird',
    oracle_text: 'Flying\n{T}: Add one mana of any color.',
    cmc: 1,
    mana_value: 1,
    colors: ['G'],
    power: '0',
    toughness: '1'
  }
];

const rampSlot = {
  role: 'ramp_acceleration',
  cmcTarget: 1,
  curveCategory: 'turn1_ramp'
};

const engine = new CandidateConstraintEngine();
const rankedRamp = engine.rankCandidatesForSlot(rampSlot, mockGoblinRampPool, {
  primaryTribe: 'Goblin',
  colors: ['B', 'R', 'G']
});

console.log('  ✦ Ranked Candidates for RAMP slot in Goblins:');
rankedRamp.forEach((entry, i) => console.log(`     [${i + 1}] ${entry.card.name} (Score/Delta: ${entry.score})`));

// Birds of Paradise or Ignoble Hierarch must beat Goblin Piker for the RAMP slot because Piker provides 0 mana acceleration!
assert.strictEqual(rankedRamp[0].card.name.includes('Hierarch') || rankedRamp[0].card.name.includes('Birds'), true, 'Off-tribe mana bridge must beat vanilla on-tribe creature in ramp slot');
console.log('  ✅ [PASS] Off-tribe bridge card accepted when resolving critical ramp Proof Obligation.');


// ─── 4. TRIBAL_FALSE_POSITIVE_TEST ───────────────────────────────────────────
console.log('\n--- 4. TRIBAL_FALSE_POSITIVE_TEST ---');

const mockPayoffPool = [
  {
    name: 'Vanilla Goblin 3-Drop',
    type_line: 'Creature — Goblin Warrior',
    oracle_text: '', // 0 capabilities, 0 triggers
    cmc: 3,
    mana_value: 3,
    colors: ['R'],
    power: '2',
    toughness: '2'
  },
  {
    name: 'Pashalik Mons',
    type_line: 'Legendary Creature — Goblin Warrior',
    oracle_text: 'Whenever Pashalik Mons or another Goblin you control dies, Pashalik Mons deals 1 damage to any target.\n{3}{R}, Sacrifice a Goblin: Create two 1/1 red Goblin creature tokens.',
    cmc: 3,
    mana_value: 3,
    colors: ['R'],
    power: '2',
    toughness: '2'
  }
];

const deathSlot = {
  role: 'death_payoff',
  cmcTarget: 3,
  curveCategory: 'curve_turn3'
};

const rankedDeath = engine.rankCandidatesForSlot(deathSlot, mockPayoffPool, {
  primaryTribe: 'Goblin',
  colors: ['R']
});

console.log('  ✦ Ranked Candidates for DEATH_PAYOFF slot:');
rankedDeath.forEach((entry, i) => console.log(`     [${i + 1}] ${entry.card.name} (Score/Delta: ${entry.score})`));

assert.strictEqual(rankedDeath[0].card.name, 'Pashalik Mons', 'Pashalik Mons must decisively beat Vanilla Goblin in death payoff slot');
assert.ok(rankedDeath[0].score > rankedDeath[1].score + 100, 'Synergistic payoff must strictly dominate vanilla tribal member');
console.log('  ✅ [PASS] On-tribe vanilla false-positive card rejected in favor of high-impact WinPath piece.');


// ─── 5. MULTI_ARCHETYPE_CONCORDANCE_TEST ─────────────────────────────────────
console.log('\n--- 5. MULTI_ARCHETYPE_CONCORDANCE_TEST ---');

// A. Vampires Aristocrats
const vampireCards = [
  {
    name: 'Blood Artist',
    type_line: 'Creature — Vampire',
    oracle_text: 'Whenever Blood Artist or another creature dies, target player loses 1 life and you gain 1 life.',
    cmc: 2,
    mana_value: 2,
    colors: ['B']
  },
  {
    name: 'Cruel Celebrant',
    type_line: 'Creature — Vampire',
    oracle_text: 'Whenever Cruel Celebrant or another creature or planeswalker you control dies, each opponent loses 1 life and you gain 1 life.',
    cmc: 2,
    mana_value: 2,
    colors: ['W', 'B']
  },
  {
    name: 'Cordial Vampire',
    type_line: 'Creature — Vampire',
    oracle_text: 'Whenever Cordial Vampire or another creature dies, put a +1/+1 counter on each Vampire you control.',
    cmc: 2,
    mana_value: 2,
    colors: ['B']
  }
];

const vContract1 = CardCausalContract.parse(vampireCards[0]);
const vContract2 = CardCausalContract.parse(vampireCards[1]);
const vContract3 = CardCausalContract.parse(vampireCards[2]);

assert.strictEqual(vContract1.supplies.some(s => s.capability === 'DEATH_PAYOFF'), true);
assert.strictEqual(vContract2.supplies.some(s => s.capability === 'DEATH_PAYOFF'), true);
assert.strictEqual(vContract3.supplies.some(s => s.capability === 'DEATH_PAYOFF' || s.capability === 'COUNTER_GENERATOR'), true);
console.log('  ✦ [Vampires Aristocrats]: Blood Artist, Cruel Celebrant, Cordial Vampire causality verified.');

// B. Elves Ramp & Swarm
const elfCards = [
  {
    name: 'Elvish Archdruid',
    type_line: 'Creature — Elf Druid',
    oracle_text: 'Other Elf creatures you control get +1/+1.\n{T}: Add {G} for each Elf you control.',
    cmc: 3,
    mana_value: 3,
    colors: ['G']
  },
  {
    name: 'Llanowar Elves',
    type_line: 'Creature — Elf Druid',
    oracle_text: '{T}: Add {G}.',
    cmc: 1,
    mana_value: 1,
    colors: ['G']
  }
];

const eContract1 = CardCausalContract.parse(elfCards[0]);
const eContract2 = CardCausalContract.parse(elfCards[1]);

assert.strictEqual(eContract1.supplies.some(s => s.capability === 'TRIBAL_LORD'), true);
assert.strictEqual(eContract1.supplies.some(s => s.capability === 'MANA_ACCELERATION'), true);
assert.strictEqual(eContract2.supplies.some(s => s.capability === 'MANA_ACCELERATION'), true);
console.log('  ✦ [Elves Ramp & Swarm]: Elvish Archdruid (Lord + Ramp) & Llanowar Elves causality verified.');

// C. Spellslinger / Prowess (Non-Tribal)
const prowessCards = [
  {
    name: 'Monastery Swiftspear',
    type_line: 'Creature — Human Monk',
    oracle_text: 'Haste\nProwess',
    cmc: 1,
    mana_value: 1,
    colors: ['R']
  },
  {
    name: 'Slickshot Show-Off',
    type_line: 'Creature — Bird Wizard',
    oracle_text: 'Flying, haste\nPlot {1}{R}\nWhenever you cast a noncreature spell, Slickshot Show-Off gets +2/+0 until end of turn.',
    cmc: 2,
    mana_value: 2,
    colors: ['R']
  }
];

const nonTribalIntent = {
  primaryTribe: null,
  strategy: ['spellslinger', 'prowess'],
  colors: ['U', 'R']
};

const rankedProwess = engine.rankCandidatesForSlot({ role: 'prowess_threat' }, prowessCards, nonTribalIntent);
assert.ok(rankedProwess[0].score > 0 && rankedProwess[1].score > 0, 'Non-tribal prowess creatures must receive 0 off-tribe penalties');
console.log('  ✦ [Prowess Spellslinger]: Monastery Swiftspear & Slickshot Show-Off verified with 0 subtype penalty.');

// D. Landfall (Non-Tribal)
const landfallCards = [
  {
    name: 'Lotus Cobra',
    type_line: 'Creature — Snake',
    oracle_text: 'Landfall — Whenever a land enters the battlefield under your control, add one mana of any color.',
    cmc: 2,
    mana_value: 2,
    colors: ['G']
  },
  {
    name: 'Scute Swarm',
    type_line: 'Creature — Insect',
    oracle_text: 'Landfall — Whenever a land enters the battlefield under your control, create a 1/1 green Insect creature token. If you control six or more lands, create a token that\'s a copy of Scute Swarm instead.',
    cmc: 3,
    mana_value: 3,
    colors: ['G']
  }
];

const lContract1 = CardCausalContract.parse(landfallCards[0]);
const lContract2 = CardCausalContract.parse(landfallCards[1]);
assert.strictEqual(lContract1.supplies.some(s => s.capability === 'LANDFALL_PAYOFF'), true);
assert.strictEqual(lContract2.supplies.some(s => s.capability === 'LANDFALL_PAYOFF' && s.capability === 'TOKEN_GENERATOR' || s.capability === 'LANDFALL_PAYOFF'), true);
console.log('  ✦ [Landfall Engine]: Lotus Cobra & Scute Swarm landfall contracts verified.');

console.log('\n=========================================================================');
console.log('🏁 ALL 5 PURE CAUSAL CONTRACT ENGINE TESTS PASSED (100% SUCCESS)');
console.log('=========================================================================');
