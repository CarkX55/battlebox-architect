/**
 * tests/unit/compiler/test_legacy_authority_zero.js
 * 
 * V29.5 Phase C: Legacy Authority Zero & 4-Way Mutation Poisoning Audit.
 * 
 * Asserts that mutating or poisoning outputs from StrategicIdentityCompiler
 * produces ZERO deviation in GameplanContract, DeckState, and SupremeJudge.
 * 
 * Mutations:
 *   - Mutation A: archetypeKey = 'POISONED_NONSENSE_ARCHETYPE'
 *   - Mutation B: gameplan = 'POISONED_NONSENSE_GAMEPLAN'
 *   - Mutation C: mandatoryRoles = ['POISON_1', 'POISON_2']
 *   - Mutation D: Completely empty object {}
 */

import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';
import { StrategicIdentityCompiler } from '../../../src/services/compiler/core/strategicIdentityCompiler.js';
import { DeckIdentity } from '../../../src/services/compiler/core/deckIdentityModel.js';

console.log('══════════════════════════════════════════════════════════════════');
console.log('  🏛️ V29.5 PHASE C: LEGACY AUTHORITY ZERO (MUTATION POISONING)');
console.log('══════════════════════════════════════════════════════════════════\n');

const testPool = [
  { name: 'Goblin Guide', type_line: 'Creature — Goblin Scout', oracle_text: 'Haste.', cmc: 1, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
  { name: 'Foundry Street Denizen', type_line: 'Creature — Goblin Warrior', oracle_text: 'Whenever another enters...', cmc: 1, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
  { name: 'Torch Courier', type_line: 'Creature — Goblin', oracle_text: 'Haste. {T}, Sacrifice: Target gains haste.', cmc: 1, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
  { name: 'Skirk Prospector', type_line: 'Creature — Goblin', oracle_text: 'Sacrifice a Goblin: Add {R}.', cmc: 1, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
  { name: 'Battle Cry Goblin', type_line: 'Creature — Goblin Shaman', oracle_text: 'Whenever attacks...', cmc: 2, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
  { name: 'Rundvelt Hordemaster', type_line: 'Creature — Goblin Warrior', oracle_text: 'Other Goblins get +1/+1.', cmc: 2, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
  { name: 'Goblin Instigator', type_line: 'Creature — Goblin Rogue', oracle_text: 'When enters, create token.', cmc: 2, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
  { name: 'Goblin Chieftain', type_line: 'Creature — Goblin Warrior', oracle_text: 'Other Goblins get +1/+1 and haste.', cmc: 3, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
  { name: 'Play with Fire', type_line: 'Instant', oracle_text: 'Deals 2 damage to any target.', cmc: 1, colors: ['R'], color_identity: ['R'] },
  { name: 'Shock', type_line: 'Instant', oracle_text: 'Deals 2 damage to any target.', cmc: 1, colors: ['R'], color_identity: ['R'] },
  { name: 'Lightning Strike', type_line: 'Instant', oracle_text: 'Deals 3 damage to any target.', cmc: 2, colors: ['R'], color_identity: ['R'] },
  { name: 'Mountain', type_line: 'Basic Land — Mountain', oracle_text: '{T}: Add {R}.', cmc: 0, colors: [], color_identity: ['R'] }
];

const inputArgs = {
  userPrompt: 'Quiero un mazo Mono Red Goblins Aggro en Pioneer.',
  format: 'Pioneer',
  archetype: 'Aggro',
  rawCardPool: testPool,
  uiFormState: {
    format: 'Pioneer',
    colors: ['R'],
    primaryTribe: 'Goblin',
    tempo: 'Aggro',
    strategy: ['Goblin Aggro Velocity'],
    mechanics: []
  }
};

// 1. Baseline Compilation
console.log('[Test 1] Running Baseline Compilation...');
const baseline = CompilerConvergencePipeline.compileDeckFromScratch(inputArgs);
const baseline2 = CompilerConvergencePipeline.compileDeckFromScratch(inputArgs);
const baseCards = baseline.state.cards.map(c => `${c.quantity || 1}x ${c.name}`).sort().join(' | ');
const baseCards2 = baseline2.state.cards.map(c => `${c.quantity || 1}x ${c.name}`).sort().join(' | ');
console.log('Deterministic check: baseCards === baseCards2 ?', baseCards === baseCards2);
if (baseCards !== baseCards2) {
  console.log('Diff 1:', baseCards);
  console.log('Diff 2:', baseCards2);
}
const baseVerdict = baseline.supremeJudicialReview?.verdict;
const baseKillTurn = baseline.gameplanContract?.derivedKillTurn;

// Save original compileIdentity function
const originalCompile = StrategicIdentityCompiler.compileIdentity;

try {
  // 2. Mutation A: Poisoned ArchetypeKey
  console.log('[Test 2] Mutation A: archetypeKey = "POISONED_NONSENSE_ARCHETYPE"...');
  StrategicIdentityCompiler.compileIdentity = function(intent) {
    const res = originalCompile.call(StrategicIdentityCompiler, intent);
    return new DeckIdentity({
      ...res,
      archetypeKey: 'POISONED_NONSENSE_ARCHETYPE'
    });
  };
  const resA = CompilerConvergencePipeline.compileDeckFromScratch(inputArgs);
  const cardsA = resA.state.cards.map(c => `${c.quantity || 1}x ${c.name}`).sort().join(' | ');
  if (cardsA !== baseCards || resA.supremeJudicialReview?.verdict !== baseVerdict || resA.gameplanContract?.derivedKillTurn !== baseKillTurn) {
    console.error('DIFFERENCE DETECTED IN MUTATION A:');
    console.error('Cards Base: ', baseCards);
    console.error('Cards A:    ', cardsA);
    throw new Error('Mutation A altered the compiled deck or gameplan! Legacy leak detected!');
  }
  console.log('  ✅ Mutation A: 0 deviation in Gameplan, DeckState, and Judge.');

  // 3. Mutation B: Poisoned Gameplan
  console.log('[Test 3] Mutation B: gameplan = "POISONED_NONSENSE_GAMEPLAN"...');
  StrategicIdentityCompiler.compileIdentity = function(intent) {
    const res = originalCompile.call(StrategicIdentityCompiler, intent);
    return new DeckIdentity({
      ...res,
      gameplan: 'POISONED_NONSENSE_GAMEPLAN'
    });
  };
  const resB = CompilerConvergencePipeline.compileDeckFromScratch(inputArgs);
  const cardsB = resB.state.cards.map(c => `${c.quantity || 1}x ${c.name}`).sort().join(' | ');
  if (cardsB !== baseCards || resB.supremeJudicialReview?.verdict !== baseVerdict || resB.gameplanContract?.derivedKillTurn !== baseKillTurn) {
    throw new Error('Mutation B altered the compiled deck or gameplan! Legacy leak detected!');
  }
  console.log('  ✅ Mutation B: 0 deviation in Gameplan, DeckState, and Judge.');

  // 4. Mutation C: Poisoned MandatoryRoles
  console.log('[Test 4] Mutation C: mandatoryRoles = ["POISON_1", "POISON_2"]...');
  StrategicIdentityCompiler.compileIdentity = function(intent) {
    const res = originalCompile.call(StrategicIdentityCompiler, intent);
    return new DeckIdentity({
      ...res,
      mandatoryRoles: ['POISON_1', 'POISON_2']
    });
  };
  const resC = CompilerConvergencePipeline.compileDeckFromScratch(inputArgs);
  const cardsC = resC.state.cards.map(c => `${c.quantity || 1}x ${c.name}`).sort().join(' | ');
  if (cardsC !== baseCards || resC.supremeJudicialReview?.verdict !== baseVerdict || resC.gameplanContract?.derivedKillTurn !== baseKillTurn) {
    throw new Error('Mutation C altered the compiled deck or gameplan! Legacy leak detected!');
  }
  console.log('  ✅ Mutation C: 0 deviation in Gameplan, DeckState, and Judge.');

  // 5. Mutation D: Empty Object
  console.log('[Test 5] Mutation D: return empty fallback object...');
  StrategicIdentityCompiler.compileIdentity = function(intent) {
    return new DeckIdentity({
      archetypeKey: 'EMPTY',
      gameplan: 'EMPTY',
      mandatoryEngines: [],
      mandatoryRoles: []
    });
  };
  const resD = CompilerConvergencePipeline.compileDeckFromScratch(inputArgs);
  const cardsD = resD.state.cards.map(c => `${c.quantity || 1}x ${c.name}`).sort().join(' | ');
  if (cardsD !== baseCards || resD.supremeJudicialReview?.verdict !== baseVerdict || resD.gameplanContract?.derivedKillTurn !== baseKillTurn) {
    throw new Error('Mutation D altered the compiled deck or gameplan! Legacy leak detected!');
  }
  console.log('  ✅ Mutation D: 0 deviation in Gameplan, DeckState, and Judge.');

} finally {
  StrategicIdentityCompiler.compileIdentity = originalCompile;
}

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  PHASE C PASS: LEGACY AUTHORITY ZERO CERTIFIED (4/4 PASS)');
console.log('══════════════════════════════════════════════════════════════════');
