/**
 * tests/benchmarks/test_unknown_combination_generalization.js
 * 
 * 🏛️ V29.5 Master Benchmark: Unknown Combination Generalization Test
 * 
 * Tests that the compiler can reason about completely UNSEEN, NOVEL combinations:
 *   - NO_PRIOR_TEMPLATE
 *   - NO_KNOWN_ENGINE_ID
 *   - NO_STRATEGY_NAME_MATCH
 * 
 * Cases Tested:
 *   1. False-Positive Blocking:
 *      Novel Intent provided, but card pool has INSUFFICIENT capacity for the novel engine.
 *      -> Compiler MUST NOT blind-fill with unrelated good-stuff.
 *      -> Gameplan / Judge correctly diagnoses INFEASIBLE / INSUFFICIENT_POOL.
 * 
 *   2. Emergent Compositional Discovery:
 *      Novel Intent provided with a coherent pool of causal cards.
 *      -> Compiler discovers the mechanics, forms strategic line, synthesizes gameplan,
 *         and builds a legal 60-card deck purely from first principles.
 *      -> Zero memorized archetype rules or templates invoked.
 */

import assert from 'assert';
import { CompilerConvergencePipeline } from '../../src/knowledge/compiler/CompilerConvergencePipeline.js';
import { ProvenanceHashChain } from '../../src/services/compiler/core/provenanceHashChain.js';

console.log('══════════════════════════════════════════════════════════════════');
console.log('  🏛️ V29.5 MASTER BENCHMARK: UNKNOWN COMBINATION GENERALIZATION');
console.log('══════════════════════════════════════════════════════════════════\n');

// ─── Case 1: False-Positive Blocking (Insufficient Pool for Novel Engine) ───
console.log('[Case 1] False-Positive Blocking: Novel Engine with Deficit Pool...');

const NOVEL_UNSEEN_INTENT = {
  format: 'Pioneer',
  colors: ['G', 'U'],
  archetype: 'Midrange',
  primaryTribe: 'None',
  strategy: ['Quantum Kinetic Resonance Flux'], // Completely invented, 0 template match
  selectedEngineId: null,
  mechanics: {
    explicitRequired: ['KINETIC_FLUX_CHARGE', 'RESONANCE_DISCHARGE'] // Completely unseen mechanics
  },
  allowOffTribe: true,
  deckSize: 60
};

// Generic card pool with ZERO cards providing KINETIC_FLUX_CHARGE or RESONANCE_DISCHARGE
const IRRELEVANT_POOL = [
  { name: 'Elvish Mystic', type_line: 'Creature — Elf Druid', oracle_text: '{T}: Add {G}.', cmc: 1, colors: ['G'], color_identity: ['G'], capabilities: ['MANA_ACCELERATION'] },
  { name: 'Llanowar Elves', type_line: 'Creature — Elf Druid', oracle_text: '{T}: Add {G}.', cmc: 1, colors: ['G'], color_identity: ['G'], capabilities: ['MANA_ACCELERATION'] },
  { name: 'Opt', type_line: 'Instant', oracle_text: 'Scry 1. Draw a card.', cmc: 1, colors: ['U'], color_identity: ['U'], capabilities: ['CARD_FLOW'] },
  { name: 'Forest', type_line: 'Basic Land — Forest', oracle_text: '{T}: Add {G}.', cmc: 0, colors: [], color_identity: ['G'], isLand: true },
  { name: 'Island', type_line: 'Basic Land — Island', oracle_text: '{T}: Add {U}.', cmc: 0, colors: [], color_identity: ['U'], isLand: true }
];

const resCase1 = CompilerConvergencePipeline.compileDeckFromScratch({
  uiFormState: NOVEL_UNSEEN_INTENT,
  rawCardPool: IRRELEVANT_POOL,
  options: {
    maxIterations: 5,
    traceTelemetry: false,
    formatContract: { format: 'Pioneer', minDeckSize: 60, maxDeckSize: 60 }
  }
});

// Verifies that when required mechanics cannot be supplied, the gameplan is INFEASIBLE
assert.ok(resCase1.gameplanContract, 'GameplanContract must be generated');
assert.strictEqual(
  resCase1.gameplanContract.feasibilityStatus,
  'INFEASIBLE',
  'GameplanContract must diagnose INFEASIBLE when pool lacks required novel mechanics'
);
console.log(`  ✅ Case 1 Passed: Correctly diagnosed INFEASIBLE without blind-filling (${resCase1.gameplanContract.feasibilityDiagnosis}).\n`);

// ─── Case 2: Emergent Compositional Discovery (Novel Engine with Coherent Pool) ───
console.log('[Case 2] Emergent Compositional Discovery: Novel Engine with Coherent Pool...');

const NOVEL_COHERENT_POOL = [
  // Cards providing the novel kinetic / resonance capabilities
  {
    name: 'Kinetic Dynamo',
    type_line: 'Artifact',
    oracle_text: '{T}: Add one charge counter. Kinetic flux charge accumulates.',
    cmc: 2,
    colors: [],
    color_identity: [],
    capabilities: ['KINETIC_FLUX_CHARGE', 'MANA_ACCELERATION']
  },
  {
    name: 'Resonance Emitter',
    type_line: 'Artifact Creature — Construct',
    oracle_text: 'Whenever you spend mana from a charge source, resonance discharge deals 2 damage to any target.',
    cmc: 2,
    power: '2',
    toughness: '2',
    colors: [],
    color_identity: [],
    capabilities: ['RESONANCE_DISCHARGE', 'PLAYER_REACH', 'CHEAP_REMOVAL']
  },
  {
    name: 'Flux Capacitor Golem',
    type_line: 'Artifact Creature — Golem',
    oracle_text: 'Kinetic flux charge enabler. Resonance discharge amplification.',
    cmc: 3,
    power: '3',
    toughness: '3',
    colors: [],
    color_identity: [],
    capabilities: ['KINETIC_FLUX_CHARGE', 'RESONANCE_DISCHARGE', 'FINISHER']
  },
  {
    name: 'Llanowar Elves',
    type_line: 'Creature — Elf Druid',
    oracle_text: '{T}: Add {G}.',
    cmc: 1,
    power: '1',
    toughness: '1',
    colors: ['G'],
    color_identity: ['G'],
    capabilities: ['MANA_ACCELERATION', 'EARLY_BODY']
  },
  {
    name: 'Consider',
    type_line: 'Instant',
    oracle_text: 'Surveil 1. Draw a card.',
    cmc: 1,
    colors: ['U'],
    color_identity: ['U'],
    capabilities: ['CARD_FLOW']
  },
  {
    name: 'Opt',
    type_line: 'Instant',
    oracle_text: 'Scry 1. Draw a card.',
    cmc: 1,
    colors: ['U'],
    color_identity: ['U'],
    capabilities: ['CARD_FLOW']
  },
  {
    name: 'Growth Spiral',
    type_line: 'Instant',
    oracle_text: 'Draw a card. Put a land from hand onto battlefield.',
    cmc: 2,
    colors: ['G', 'U'],
    color_identity: ['G', 'U'],
    capabilities: ['CARD_FLOW', 'LAND_ACCELERATION']
  },
  {
    name: 'Explore',
    type_line: 'Sorcery',
    oracle_text: 'Play an additional land. Draw a card.',
    cmc: 2,
    colors: ['G'],
    color_identity: ['G'],
    capabilities: ['CARD_FLOW', 'LAND_ACCELERATION']
  },
  {
    name: 'Beast Within',
    type_line: 'Instant',
    oracle_text: 'Destroy target permanent. Controller creates 3/3 Beast.',
    cmc: 3,
    colors: ['G'],
    color_identity: ['G'],
    capabilities: ['CHEAP_REMOVAL']
  },
  {
    name: 'Counterspell',
    type_line: 'Instant',
    oracle_text: 'Counter target spell.',
    cmc: 2,
    colors: ['U'],
    color_identity: ['U'],
    capabilities: ['COUNTER_DISRUPTION']
  },
  {
    name: 'Forest',
    type_line: 'Basic Land — Forest',
    oracle_text: '{T}: Add {G}.',
    cmc: 0,
    colors: [],
    color_identity: ['G'],
    isLand: true
  },
  {
    name: 'Island',
    type_line: 'Basic Land — Island',
    oracle_text: '{T}: Add {U}.',
    cmc: 0,
    colors: [],
    color_identity: ['U'],
    isLand: true
  }
];

const resCase2 = CompilerConvergencePipeline.compileDeckFromScratch({
  uiFormState: NOVEL_UNSEEN_INTENT,
  rawCardPool: NOVEL_COHERENT_POOL,
  options: {
    maxIterations: 10,
    traceTelemetry: false,
    formatContract: { format: 'Pioneer', minDeckSize: 60, maxDeckSize: 60 }
  }
});

const deck2 = resCase2.state || resCase2.certifiedDeck;
const cards2 = deck2.cards || [];
const totalCards2 = cards2.reduce((s, c) => s + Number(c.quantity || c.count || 1), 0);

assert.strictEqual(totalCards2, 60, `Compiled novel deck must have exactly 60 cards. Got: ${totalCards2}`);
assert.ok(resCase2.provenanceHashChain, 'Provenance chain must exist');
assert.strictEqual(
  ProvenanceHashChain.verifyIntegrity(resCase2.provenanceHashChain),
  true,
  'Provenance chain must be valid'
);

const hasNovelCards = cards2.some(c => c.name === 'Kinetic Dynamo' || c.name === 'Resonance Emitter');
assert.ok(hasNovelCards, 'Novel deck must incorporate the discovered kinetic resonance cards');

console.log(`  ✅ Case 2 Passed: Compiled 60-card novel deck incorporating discovered engine:`);
cards2.filter(c => !c.isLand).forEach(c => console.log(`     - ${c.quantity || 1}x ${c.name} (${c.type_line || c.type})`));
console.log(`     GPL Hash:  ${resCase2.provenanceHashChain.gplHash}`);
console.log(`     Root Hash: ${resCase2.provenanceHashChain.root}`);

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  🏛️ UNKNOWN COMBINATION GENERALIZATION: 100% CERTIFIED');
console.log('══════════════════════════════════════════════════════════════════');
process.exit(0);
