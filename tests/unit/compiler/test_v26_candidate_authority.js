import assert from 'assert';
import { CandidateConstraintEngine } from '../../../src/services/compiler/core/candidateConstraintEngine.js';
import { StateCandidateRanker } from '../../../src/services/compiler/core/stateCandidateRanker.js';
import { CardCausalContract } from '../../../src/services/compiler/core/cardCausalContract.js';

console.log('================================================================');
console.log('🧪 TEST SUITE: v26.0 Phase 1 & 2 — Candidate Constraint & State Authority');
console.log('================================================================\n');

const engine = new CandidateConstraintEngine();

// 1. ELITE INTERACTION DOMINANCE TEST
console.log('--- 1. Elite Interaction Causal Dominance ---');
const fatalPush = {
  name: 'Fatal Push',
  type_line: 'Instant',
  oracle_text: 'Destroy target creature if it has mana value 2 or less. Revolt — Destroy target creature with mana value 4 or less if a permanent you control left the battlefield this turn.',
  cmc: 1,
  mana_value: 1,
  colors: ['B'],
  capabilities: ['CHEAP_REMOVAL', 'INSTANT_REMOVAL']
};

const murder = {
  name: 'Murder',
  type_line: 'Instant',
  oracle_text: 'Destroy target creature.',
  cmc: 3,
  mana_value: 3,
  colors: ['B'],
  capabilities: ['CHEAP_REMOVAL']
};

const plummete = {
  name: 'Plummet',
  type_line: 'Instant',
  oracle_text: 'Destroy target creature with flying.',
  cmc: 2,
  mana_value: 2,
  colors: ['G'],
  capabilities: ['CHEAP_REMOVAL']
};

const removalSlot = { role: 'CHEAP_REMOVAL', cmcTarget: 1, requiredDensity: 4 };
const rankedRemoval = engine.rankCandidatesForSlot(removalSlot, [murder, fatalPush], { colors: ['B'], archetype: 'Midrange' });

console.log(`  Top removal: ${rankedRemoval[0].card.name} (Score: ${rankedRemoval[0].score}) vs ${rankedRemoval[1].card.name} (Score: ${rankedRemoval[1].score})`);
assert.strictEqual(rankedRemoval[0].card.name, 'Fatal Push', 'Fatal Push (1 CMC instant) must strictly dominate Murder (3 CMC)');
assert.ok(rankedRemoval[0].score > rankedRemoval[1].score, 'Fatal Push net delta utility must be higher than Murder');
console.log('  ✅ [PASS] Fatal Push dominates via CMC efficiency and speed without hardcoded score bonuses.');

// 2. LEGENDARY REDUNDANCY PENALTY
console.log('\n--- 2. Legendary Redundancy & Collision Penalty ---');
const tovolar1 = {
  name: 'Tovolar, Dire Overlord',
  type_line: 'Legendary Creature — Human Werewolf',
  oracle_text: 'Whenever a Wolf or Werewolf you control deals combat damage to a player, draw a card.',
  cmc: 3,
  mana_value: 3,
  colors: ['R', 'G'],
  capabilities: ['CARD_FLOW', 'TRIBAL_ENGINE']
};

const werewolfDeckWithTovolar = {
  cards: [
    { card: tovolar1, count: 2, quantity: 2 }
  ]
};

const delta3rdTovolar = StateCandidateRanker.computeStateDelta(werewolfDeckWithTovolar, tovolar1, { archetype: 'Aggro' });
const vec3rdTovolar = StateCandidateRanker.computeDominanceVector(delta3rdTovolar);

console.log(`  Tovolar copy 3 redundancy penalty: ${vec3rdTovolar.redundancyPenalty}, NetUtility: ${vec3rdTovolar.netUtility}`);
assert.ok(vec3rdTovolar.redundancyPenalty > 0, 'Adding a 3rd copy of legendary Tovolar must carry redundancy penalty');
console.log('  ✅ [PASS] Legendary copies dynamically penalized by contrafactual state delta.');

// 3. FRIEND POWER NON-GAME FRICTION PENALTY
console.log('\n--- 3. Friend Power Non-Game Friction Penalty ---');
const timeWarp = {
  name: 'Time Warp',
  type_line: 'Sorcery',
  oracle_text: 'Target player takes an extra turn after this one.',
  cmc: 5,
  mana_value: 5,
  colors: ['U'],
  capabilities: ['EXTRA_TURN']
};

const normalSpell = {
  name: 'Mulldrifter',
  type_line: 'Creature — Elemental',
  oracle_text: 'When Mulldrifter enters the battlefield, draw two cards.',
  cmc: 5,
  mana_value: 5,
  colors: ['U'],
  capabilities: ['CARD_FLOW']
};

const deltaSolitaireLow = StateCandidateRanker.computeStateDelta({ cards: [] }, timeWarp, { archetype: 'Control' }, { solitaireTolerance: 'LOW' });
const deltaSolitaireHigh = StateCandidateRanker.computeStateDelta({ cards: [] }, timeWarp, { archetype: 'Control' }, { solitaireTolerance: 'HIGH', frustrationTolerance: 'HIGH' });

console.log(`  Time Warp friction (solitaire LOW): ${deltaSolitaireLow.frictionPenalty}`);
console.log(`  Time Warp friction (solitaire HIGH): ${deltaSolitaireHigh.frictionPenalty}`);
assert.ok(deltaSolitaireLow.frictionPenalty > 0, 'Extra turn spell must incur friction penalty when solitaireTolerance is LOW');
assert.strictEqual(deltaSolitaireHigh.frictionPenalty, 0, 'No friction penalty when solitaireTolerance is HIGH');
console.log('  ✅ [PASS] Non-game friction penalties adjust causally for play-with-friends formats.');

console.log('\n================================================================');
console.log('🎉 ALL TESTS PASSED: v26.0 Candidate & State Authority verified!');
console.log('================================================================\n');
