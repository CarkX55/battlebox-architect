import test from 'node:test';
import assert from 'node:assert/strict';
import { MTG_TRIBES, MTG_STRATEGIES } from '../../../src/constants/legacyBattleBox.js';
import { IntentNormalizer } from '../../../src/services/compiler/core/intentNormalizer.js';
import { IntentBuilder } from '../../../src/services/compiler/core/intentBuilder.js';
import { StrategicIdentityCompiler } from '../../../src/services/compiler/core/strategicIdentityCompiler.js';
import { IdentityFirewall } from '../../../src/services/compiler/core/identityFirewall.js';
import { CandidateConstraintEngine } from '../../../src/services/compiler/core/candidateConstraintEngine.js';
import { ReverseIdentityExtractor } from '../../../src/services/compiler/core/reverseIdentityExtractor.js';
import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';

test('🌐 Comprehensive UI Matrix Combinatorial Audit Suite', async (t) => {

  await t.test('1. Normalization & Identity Audit for ALL UI Tribes & Alliances', () => {
    for (const tribeDef of MTG_TRIBES) {
      const rawLabel = tribeDef.label;
      const normalized = IntentNormalizer.normalizeTribe(rawLabel);
      assert.ok(normalized && normalized.length > 0, `Normalization failed for tribe label: "${rawLabel}"`);

      const colors = Array.isArray(tribeDef.colors) ? tribeDef.colors : (Array.isArray(tribeDef.primaryColor) ? tribeDef.primaryColor : [tribeDef.primaryColor || 'G']);
      const archetype = tribeDef.archetypes && tribeDef.archetypes[0] ? tribeDef.archetypes[0] : 'midrange';
      const strategy = tribeDef.strategies && tribeDef.strategies[0] ? tribeDef.strategies[0] : 'general';

      const intent = IntentBuilder.buildFromUI({
        tribe: rawLabel,
        archetype,
        strategy,
        colors,
        format: 'MODERN'
      });

      const identity = StrategicIdentityCompiler.compileIdentity(intent);
      assert.ok(identity.archetypeKey && identity.archetypeKey.length > 0, `Failed to compile archetypeKey for tribe "${rawLabel}"`);
      assert.ok(identity.gameplan && identity.gameplan.length > 20, `Gameplan too short or missing for "${rawLabel}"`);
      assert.ok(Array.isArray(identity.requiredEngines) && identity.requiredEngines.length >= 3, `Required engines missing for "${rawLabel}"`);
      assert.ok(Array.isArray(identity.mandatoryRoles) && identity.mandatoryRoles.length >= 4, `Mandatory roles missing for "${rawLabel}"`);
      assert.ok(identity.expectedCurveRange.min >= 0 && identity.expectedCurveRange.max <= 8, `Invalid curve range for "${rawLabel}"`);
    }
  });

  await t.test('2. Identity Audit for ALL UI Mechanical Strategies', () => {
    for (const stratDef of MTG_STRATEGIES) {
      const colors = Array.isArray(stratDef.colors) ? stratDef.colors : (Array.isArray(stratDef.primaryColor) ? stratDef.primaryColor : [stratDef.primaryColor || 'U']);
      const archetype = stratDef.archetypes && stratDef.archetypes[0] ? stratDef.archetypes[0] : 'combo';

      const intent = IntentBuilder.buildFromUI({
        strategy: stratDef.id,
        archetype,
        colors,
        format: 'MODERN'
      });

      const identity = StrategicIdentityCompiler.compileIdentity(intent);
      assert.ok(identity.archetypeKey && identity.archetypeKey.length > 0, `Failed to compile archetypeKey for strategy "${stratDef.id}"`);
      assert.ok(identity.gameplan && identity.gameplan.length > 20, `Gameplan missing for strategy "${stratDef.id}"`);
    }
  });

  await t.test('3. Dynamic Adaptive Identity Synthesis for Custom Combinations', () => {
    const customCombinations = [
      { colors: ['W', 'B'], archetype: 'control', strategy: 'discard & lifegain', tribe: 'none' },
      { colors: ['U', 'R', 'G'], archetype: 'combo', strategy: 'cascade & tokens', tribe: 'elemental' },
      { colors: ['B', 'G'], archetype: 'ramp', strategy: 'landfall & dredge', tribe: 'ooze' },
      { colors: ['C'], archetype: 'ramp', strategy: 'big mana titans', tribe: 'eldrazi' }
    ];

    for (const custom of customCombinations) {
      const intent = IntentBuilder.buildFromUI({
        colors: custom.colors,
        archetype: custom.archetype,
        strategy: custom.strategy,
        tribe: custom.tribe,
        format: 'MODERN'
      });

      const identity = StrategicIdentityCompiler.compileIdentity(intent);
      assert.ok(identity.archetypeKey && identity.archetypeKey.length > 0, `Adaptive compiler failed for custom combo: ${JSON.stringify(custom)}`);
      assert.ok(identity.gameplan && identity.gameplan.length > 20, `Adaptive gameplan missing for: ${JSON.stringify(custom)}`);
      assert.ok(identity.requiredEngines.length >= 3, `Adaptive requiredEngines missing for: ${JSON.stringify(custom)}`);
    }
  });

  await t.test('4. End-to-End Pipeline Verification for Representative Archetypes', () => {
    const archetypesToVerify = [
      {
        name: 'Simic Sea Monsters Ramp',
        ui: { colors: ['U', 'G'], archetype: 'ramp', tribe: '🌊 terrores marinos (tritones, krakens, leviatanes)', strategy: 'big mana', format: 'MODERN' },
        pool: [
          { name: 'Kiora\'s Follower', type_line: 'Creature — Merfolk Druid', cmc: 2, colors: ['U', 'G'], color_identity: ['U', 'G'], oracle_text: '{T}: Untap another target permanent.', rarity: 'uncommon', legalities: { modern: 'legal' } },
          { name: 'Hullbreaker Horror', type_line: 'Creature — Kraken Horror', cmc: 7, colors: ['U'], color_identity: ['U'], oracle_text: 'Flash. Return target spell to owner\'s hand.', rarity: 'rare', legalities: { modern: 'legal' } },
          { name: 'Aesi, Tyrant of Gyre Strait', type_line: 'Legendary Creature — Serpent Beast', cmc: 6, colors: ['U', 'G'], color_identity: ['U', 'G'], oracle_text: 'You may play an additional land each turn. Landfall — draw a card.', rarity: 'mythic', legalities: { modern: 'legal' } },
          { name: 'Growth Spiral', type_line: 'Instant', cmc: 2, colors: ['U', 'G'], color_identity: ['U', 'G'], oracle_text: 'Draw a card. You may put a land card onto the battlefield.', rarity: 'common', legalities: { modern: 'legal' } },
          { name: 'Counterspell', type_line: 'Instant', cmc: 2, colors: ['U'], color_identity: ['U'], oracle_text: 'Counter target spell.', rarity: 'uncommon', legalities: { modern: 'legal' } },
          { name: 'Beast Within', type_line: 'Instant', cmc: 3, colors: ['G'], color_identity: ['G'], oracle_text: 'Destroy target permanent.', rarity: 'uncommon', legalities: { modern: 'legal' } },
          { name: 'Breeding Pool', type_line: 'Land — Forest Island', cmc: 0, colors: [], color_identity: ['U', 'G'], oracle_text: '{T}: Add {G} or {U}.', rarity: 'rare', legalities: { modern: 'legal' } },
          { name: 'Island', type_line: 'Basic Land — Island', cmc: 0, colors: [], color_identity: ['U'], oracle_text: '{T}: Add {U}.', rarity: 'common', legalities: { modern: 'legal' } },
          { name: 'Forest', type_line: 'Basic Land — Forest', cmc: 0, colors: [], color_identity: ['G'], oracle_text: '{T}: Add {G}.', rarity: 'common', legalities: { modern: 'legal' } }
        ],
        expectedKey: 'SEA_MONSTERS_RAMP'
      },
      {
        name: 'Dimir Ninjas Ninjutsu Tempo',
        ui: { colors: ['U', 'B'], archetype: 'tempo', tribe: 'Ninjas', strategy: 'ninjutsu', format: 'MODERN' },
        pool: [
          { name: 'Ornithopter', type_line: 'Artifact Creature — Thopter', cmc: 0, colors: [], color_identity: [], oracle_text: 'Flying', rarity: 'uncommon', legalities: { modern: 'legal' } },
          { name: 'Faerie Seer', type_line: 'Creature — Faerie Wizard', cmc: 1, colors: ['U'], color_identity: ['U'], oracle_text: 'Flying. Scry 2.', rarity: 'common', legalities: { modern: 'legal' } },
          { name: 'Yuriko, the Tiger\'s Shadow', type_line: 'Legendary Creature — Human Ninja', cmc: 3, colors: ['U', 'B'], color_identity: ['U', 'B'], oracle_text: 'Commander ninjutsu {U}{B}. Whenever a Ninja deals combat damage...', rarity: 'rare', legalities: { modern: 'legal' } },
          { name: 'Moon-Circuit Hacker', type_line: 'Creature — Human Ninja', cmc: 2, colors: ['U'], color_identity: ['U'], oracle_text: 'Ninjutsu {U}. Draw a card.', rarity: 'common', legalities: { modern: 'legal' } },
          { name: 'Fatal Push', type_line: 'Instant', cmc: 1, colors: ['B'], color_identity: ['B'], oracle_text: 'Destroy target creature if converted mana cost 2 or less.', rarity: 'uncommon', legalities: { modern: 'legal' } },
          { name: 'Spell Pierce', type_line: 'Instant', cmc: 1, colors: ['U'], color_identity: ['U'], oracle_text: 'Counter target noncreature spell unless its controller pays {2}.', rarity: 'common', legalities: { modern: 'legal' } },
          { name: 'Watery Grave', type_line: 'Land — Island Swamp', cmc: 0, colors: [], color_identity: ['U', 'B'], oracle_text: '{T}: Add {U} or {B}.', rarity: 'rare', legalities: { modern: 'legal' } },
          { name: 'Island', type_line: 'Basic Land — Island', cmc: 0, colors: [], color_identity: ['U'], oracle_text: '{T}: Add {U}.', rarity: 'common', legalities: { modern: 'legal' } },
          { name: 'Swamp', type_line: 'Basic Land — Swamp', cmc: 0, colors: [], color_identity: ['B'], oracle_text: '{T}: Add {B}.', rarity: 'common', legalities: { modern: 'legal' } }
        ],
        expectedKey: 'NINJA_NINJUTSU_TEMPO'
      },
      {
        name: 'Mono Red Goblins Aggro',
        ui: { colors: ['R'], archetype: 'aggro', tribe: 'Goblins', strategy: 'burn', format: 'MODERN' },
        pool: [
          { name: 'Goblin Guide', type_line: 'Creature — Goblin Scout', cmc: 1, colors: ['R'], color_identity: ['R'], oracle_text: 'Haste.', rarity: 'rare', legalities: { modern: 'legal' } },
          { name: 'Goblin Bushwhacker', type_line: 'Creature — Goblin Rogue', cmc: 1, colors: ['R'], color_identity: ['R'], oracle_text: 'Kicker {R}: Creatures get +1/+0 and haste.', rarity: 'common', legalities: { modern: 'legal' } },
          { name: 'Goblin Chieftain', type_line: 'Creature — Goblin Warrior', cmc: 3, colors: ['R'], color_identity: ['R'], oracle_text: 'Haste. Other Goblin creatures get +1/+1 and haste.', rarity: 'rare', legalities: { modern: 'legal' } },
          { name: 'Lightning Bolt', type_line: 'Instant', cmc: 1, colors: ['R'], color_identity: ['R'], oracle_text: 'Lightning Bolt deals 3 damage to any target.', rarity: 'common', legalities: { modern: 'legal' } },
          { name: 'Mountain', type_line: 'Basic Land — Mountain', cmc: 0, colors: [], color_identity: ['R'], oracle_text: '{T}: Add {R}.', rarity: 'common', legalities: { modern: 'legal' } }
        ],
        expectedKey: 'MONO_RED_GOBLINS'
      },
      {
        name: 'Golgari Zombies Aristocrats',
        ui: { colors: ['B', 'G'], archetype: 'midrange', tribe: 'Zombies', strategy: 'sacrifice', format: 'MODERN' },
        pool: [
          { name: 'Gravecrawler', type_line: 'Creature — Zombie', cmc: 1, colors: ['B'], color_identity: ['B'], oracle_text: 'You may cast Gravecrawler from your graveyard as long as you control a Zombie.', rarity: 'rare', legalities: { modern: 'legal' } },
          { name: 'Carrion Feeder', type_line: 'Creature — Zombie', cmc: 1, colors: ['B'], color_identity: ['B'], oracle_text: 'Sacrifice a creature: Put a +1/+1 counter on Carrion Feeder.', rarity: 'common', legalities: { modern: 'legal' } },
          { name: 'Blood Artist', type_line: 'Creature — Vampire', cmc: 2, colors: ['B'], color_identity: ['B'], oracle_text: 'Whenever a creature dies, target player loses 1 life and you gain 1 life.', rarity: 'uncommon', legalities: { modern: 'legal' } },
          { name: 'Fatal Push', type_line: 'Instant', cmc: 1, colors: ['B'], color_identity: ['B'], oracle_text: 'Destroy target creature if converted mana cost 2 or less.', rarity: 'uncommon', legalities: { modern: 'legal' } },
          { name: 'Overgrown Tomb', type_line: 'Land — Swamp Forest', cmc: 0, colors: [], color_identity: ['B', 'G'], oracle_text: '{T}: Add {B} or {G}.', rarity: 'rare', legalities: { modern: 'legal' } },
          { name: 'Swamp', type_line: 'Basic Land — Swamp', cmc: 0, colors: [], color_identity: ['B'], oracle_text: '{T}: Add {B}.', rarity: 'common', legalities: { modern: 'legal' } },
          { name: 'Forest', type_line: 'Basic Land — Forest', cmc: 0, colors: [], color_identity: ['G'], oracle_text: '{T}: Add {G}.', rarity: 'common', legalities: { modern: 'legal' } }
        ],
        expectedKey: 'ZOMBIE_ARISTOCRATS'
      },
      {
        name: 'Selesnya Elves Ramp',
        ui: { colors: ['G', 'W'], archetype: 'ramp', tribe: 'Elfos', strategy: 'tokens', format: 'MODERN' },
        pool: [
          { name: 'Llanowar Elves', type_line: 'Creature — Elf Druid', cmc: 1, colors: ['G'], color_identity: ['G'], oracle_text: '{T}: Add {G}.', rarity: 'common', legalities: { modern: 'legal' } },
          { name: 'Elvish Mystic', type_line: 'Creature — Elf Druid', cmc: 1, colors: ['G'], color_identity: ['G'], oracle_text: '{T}: Add {G}.', rarity: 'common', legalities: { modern: 'legal' } },
          { name: 'Elvish Archdruid', type_line: 'Creature — Elf Druid', cmc: 3, colors: ['G'], color_identity: ['G'], oracle_text: 'Other Elf creatures you control get +1/+1. {T}: Add {G} for each Elf.', rarity: 'rare', legalities: { modern: 'legal' } },
          { name: 'Craterhoof Behemoth', type_line: 'Creature — Beast', cmc: 8, colors: ['G'], color_identity: ['G'], oracle_text: 'Haste, trample. When Craterhoof Behemoth enters the battlefield...', rarity: 'mythic', legalities: { modern: 'legal' } },
          { name: 'Path to Exile', type_line: 'Instant', cmc: 1, colors: ['W'], color_identity: ['W'], oracle_text: 'Exile target creature.', rarity: 'uncommon', legalities: { modern: 'legal' } },
          { name: 'Temple Garden', type_line: 'Land — Forest Plains', cmc: 0, colors: [], color_identity: ['G', 'W'], oracle_text: '{T}: Add {G} or {W}.', rarity: 'rare', legalities: { modern: 'legal' } },
          { name: 'Forest', type_line: 'Basic Land — Forest', cmc: 0, colors: [], color_identity: ['G'], oracle_text: '{T}: Add {G}.', rarity: 'common', legalities: { modern: 'legal' } },
          { name: 'Plains', type_line: 'Basic Land — Plains', cmc: 0, colors: [], color_identity: ['W'], oracle_text: '{T}: Add {W}.', rarity: 'common', legalities: { modern: 'legal' } }
        ],
        expectedKey: 'SELESNYA_ELVES_RAMP'
      }
    ];

    for (const testCase of archetypesToVerify) {
      const result = CompilerConvergencePipeline.compileDeckFromScratch({
        uiFormState: testCase.ui,
        rawCardPool: testCase.pool,
        format: testCase.ui.format
      });

      assert.equal(result.buildStatus, 'SUCCESS', `Pipeline failed for ${testCase.name}`);
      assert.equal(result.deckIdentity.archetypeKey, testCase.expectedKey, `Unexpected archetypeKey for ${testCase.name}`);
      assert.equal(result.state.totalCardCount, 60, `Expected 60 cards for ${testCase.name}`);
      if (!result.reverseIdentityMatch.isMatch) {
        console.log(`Mismatch in ${testCase.name}:`, result.reverseIdentityMatch);
      }
      assert.equal(result.reverseIdentityMatch.isMatch, true, `Reverse identity mismatch for ${testCase.name}`);
    }
  });

});
