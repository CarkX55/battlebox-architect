import test from 'node:test';
import assert from 'node:assert/strict';
import { IntentBuilder } from '../../../src/services/compiler/core/intentBuilder.js';
import { IntentNormalizer } from '../../../src/services/compiler/core/intentNormalizer.js';
import { StrategicIdentityCompiler } from '../../../src/services/compiler/core/strategicIdentityCompiler.js';
import { IdentityFirewall } from '../../../src/services/compiler/core/identityFirewall.js';
import { CandidateConstraintEngine } from '../../../src/services/compiler/core/candidateConstraintEngine.js';
import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';

test('🌊 Sea Monsters Alliance + Ramp Strategy Compilation Test', async () => {
  const rawUIState = {
    format: 'MODERN',
    colors: ['U', 'G'],
    archetype: 'ramp',
    tribe: '🌊 terrores marinos (tritones, krakens, leviatanes)',
    strategy: 'big mana / ramp (tron & titans)',
    selectedEngineId: 'tron_generic',
    powerLevel: 'Competitive',
    budget: 'unlimited',
    deckSize: 60,
    prioritizePlaysets: true
  };

  // 1. Intent Normalizer Test
  const normalizedTribe = IntentNormalizer.normalizeTribe(rawUIState.tribe);
  assert.equal(normalizedTribe, 'Sea_monsters', `Expected 'Sea_monsters' but got '${normalizedTribe}'`);

  // 2. Intent Builder Test
  const intentPackage = IntentBuilder.buildFromUI(rawUIState);
  assert.equal(intentPackage.primaryTribe, 'Sea_monsters');
  assert.equal(intentPackage.tempo, 'ramp');

  // 3. Strategic Identity Compiler Test
  const identity = StrategicIdentityCompiler.compileIdentity(intentPackage);
  assert.equal(identity.archetypeKey, 'SEA_MONSTERS_RAMP');
  assert.equal(identity.requiresManaRamp, true);

  // 4. Identity Firewall Test
  const seaMonsterCards = [
    { name: 'Kiora\'s Follower', type_line: 'Creature — Merfolk Druid', cmc: 2, colors: ['U', 'G'], color_identity: ['U', 'G'], oracle_text: '{T}: Untap another target permanent.' },
    { name: 'Hullbreaker Horror', type_line: 'Creature — Kraken Horror', cmc: 7, colors: ['U'], color_identity: ['U'], oracle_text: 'Flash. This spell can\'t be countered. Whenever you cast a spell...' },
    { name: 'Aesi, Tyrant of Gyre Strait', type_line: 'Legendary Creature — Serpent Beast', cmc: 6, colors: ['U', 'G'], color_identity: ['U', 'G'], oracle_text: 'You may play an additional land on each of your turns. Landfall — draw a card.' },
    { name: 'Koma, Cosmos Serpent', type_line: 'Legendary Creature — Serpent', cmc: 7, colors: ['U', 'G'], color_identity: ['U', 'G'], oracle_text: 'At the beginning of each upkeep, create a 3/3 blue Serpent creature token named Koma\'s Coil.' },
    { name: 'Growth Spiral', type_line: 'Instant', cmc: 2, colors: ['U', 'G'], color_identity: ['U', 'G'], oracle_text: 'Draw a card. You may put a land card from your hand onto the battlefield.' }
  ];

  for (const card of seaMonsterCards) {
    const check = IdentityFirewall.validateCard(card, identity, intentPackage);
    assert.equal(check.isAllowed, true, `Card "${card.name}" was wrongly vetoed: ${check.vetoReason}`);
  }

  // 5. Candidate Constraint Engine Tribal Alliance Scoring Test
  const engine = new CandidateConstraintEngine();
  const mockSlot = { role: 'TRIBAL_DENSITY', slotId: 'slot_1', withFilledData: (d) => d };
  const ranked = engine.rankCandidatesForSlot(mockSlot, seaMonsterCards, intentPackage);
  
  // All sea monster creatures should score high positive (> 0) without off-tribe penalties
  for (const item of ranked) {
    const card = item.card;
    if (card.type_line.includes('Creature')) {
      assert.ok(item.score > 0, `Expected positive score for Sea Monster ${card.name}, got ${item.score}`);
    }
  }

  // 6. Full Pipeline Convergence Test
  const mockCardPool = [
    { name: 'Kiora\'s Follower', type_line: 'Creature — Merfolk Druid', cmc: 2, colors: ['U', 'G'], color_identity: ['U', 'G'], oracle_text: '{T}: Untap another target permanent.', rarity: 'uncommon', legalities: { modern: 'legal' } },
    { name: 'Hullbreaker Horror', type_line: 'Creature — Kraken Horror', cmc: 7, colors: ['U'], color_identity: ['U'], oracle_text: 'Flash. This spell can\'t be countered. Return target spell or permanent to owner\'s hand.', rarity: 'rare', legalities: { modern: 'legal' } },
    { name: 'Aesi, Tyrant of Gyre Strait', type_line: 'Legendary Creature — Serpent Beast', cmc: 6, colors: ['U', 'G'], color_identity: ['U', 'G'], oracle_text: 'You may play an additional land on each of your turns. Landfall — draw a card.', rarity: 'mythic', legalities: { modern: 'legal' } },
    { name: 'Koma, Cosmos Serpent', type_line: 'Legendary Creature — Serpent', cmc: 7, colors: ['U', 'G'], color_identity: ['U', 'G'], oracle_text: 'At the beginning of each upkeep, create a 3/3 blue Serpent creature token named Koma\'s Coil.', rarity: 'mythic', legalities: { modern: 'legal' } },
    { name: 'Growth Spiral', type_line: 'Instant', cmc: 2, colors: ['U', 'G'], color_identity: ['U', 'G'], oracle_text: 'Draw a card. You may put a land card from your hand onto the battlefield.', rarity: 'common', legalities: { modern: 'legal' } },
    { name: 'Explore', type_line: 'Sorcery', cmc: 2, colors: ['G'], color_identity: ['G'], oracle_text: 'You may play an additional land this turn. Draw a card.', rarity: 'common', legalities: { modern: 'legal' } },
    { name: 'Counterspell', type_line: 'Instant', cmc: 2, colors: ['U'], color_identity: ['U'], oracle_text: 'Counter target spell.', rarity: 'uncommon', legalities: { modern: 'legal' } },
    { name: 'Beast Within', type_line: 'Instant', cmc: 3, colors: ['G'], color_identity: ['G'], oracle_text: 'Destroy target permanent. Its controller creates a 3/3 green Beast creature token.', rarity: 'uncommon', legalities: { modern: 'legal' } },
    { name: 'Whelming Wave', type_line: 'Sorcery', cmc: 4, colors: ['U'], color_identity: ['U'], oracle_text: 'Return all creatures to their owners\' hands except for Krakens, Leviathans, Octopuses, and Serpents.', rarity: 'rare', legalities: { modern: 'legal' } },
    { name: 'Breeding Pool', type_line: 'Land — Forest Island', cmc: 0, colors: [], color_identity: ['U', 'G'], oracle_text: '{T}: Add {G} or {U}.', rarity: 'rare', legalities: { modern: 'legal' } },
    { name: 'Island', type_line: 'Basic Land — Island', cmc: 0, colors: [], color_identity: ['U'], oracle_text: '{T}: Add {U}.', rarity: 'common', legalities: { modern: 'legal' } },
    { name: 'Forest', type_line: 'Basic Land — Forest', cmc: 0, colors: [], color_identity: ['G'], oracle_text: '{T}: Add {G}.', rarity: 'common', legalities: { modern: 'legal' } }
  ];

  const result = CompilerConvergencePipeline.compileDeckFromScratch({
    uiFormState: rawUIState,
    rawCardPool: mockCardPool,
    format: 'MODERN'
  });
  if (result.buildStatus !== 'SUCCESS') {
    console.log('Build result:', result);
  }
  assert.equal(result.buildStatus, 'SUCCESS');
  assert.equal(result.deckIdentity.archetypeKey, 'SEA_MONSTERS_RAMP');
  assert.equal(result.state.totalCardCount, 60);
});
