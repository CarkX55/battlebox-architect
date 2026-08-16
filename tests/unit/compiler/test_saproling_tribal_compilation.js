import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';

describe('Saproling & Fungus Tribal Compilation Suite', () => {
  it('compiles an Abzan / Golgari Saproling & Fungus swarm deck end-to-end without hard gate failure', () => {
    const mockCardPool = [
      // Fungus Creatures (The Core Tribal Engine)
      { id: '1', name: 'Slimefoot, the Stowaway', mana_cost: '{1}{B}{G}', type_line: 'Legendary Creature — Fungus Shaman', oracle_text: 'Whenever a Saproling you control dies, Slimefoot deals 1 damage to each opponent and you gain 1 life. {4}: Create a 1/1 green Saproling creature token.', colors: ['B', 'G'], mana_value: 3, rarity: 'uncommon', legalities: { standard: 'legal', modern: 'legal', pioneer: 'legal' } },
      { id: '2', name: 'Tendershoot Thallid', mana_cost: '{4}{G}', type_line: 'Creature — Fungus', oracle_text: 'Ascend. At the beginning of each upkeep, create a 1/1 green Saproling creature token. Saprolings you control get +2/+2 as long as you have the city\'s blessing.', colors: ['G'], mana_value: 5, rarity: 'rare', legalities: { standard: 'legal', modern: 'legal', pioneer: 'legal' } },
      { id: '3', name: 'Utopia Mycon', mana_cost: '{G}', type_line: 'Creature — Fungus', oracle_text: 'At the beginning of your upkeep, put a spore counter on Utopia Mycon. Remove three spore counters: Create a 1/1 green Saproling creature token. Sacrifice a Saproling: Add one mana of any color.', colors: ['G'], mana_value: 1, rarity: 'uncommon', legalities: { standard: 'legal', modern: 'legal', pioneer: 'legal' } },
      { id: '4', name: 'Thallid Soothsayer', mana_cost: '{3}{B}', type_line: 'Creature — Fungus', oracle_text: '{1}{B}, {T}, Sacrifice a creature: Draw a card.', colors: ['B'], mana_value: 4, rarity: 'uncommon', legalities: { standard: 'legal', modern: 'legal', pioneer: 'legal' } },
      { id: '5', name: 'Yavimaya Sapherd', mana_cost: '{2}{G}', type_line: 'Creature — Fungus', oracle_text: 'When Yavimaya Sapherd enters the battlefield, create a 1/1 green Saproling creature token.', colors: ['G'], mana_value: 3, rarity: 'common', legalities: { standard: 'legal', modern: 'legal', pioneer: 'legal' } },
      { id: '6', name: 'Sporecrown Thallid', mana_cost: '{1}{G}', type_line: 'Creature — Fungus', oracle_text: 'Each other Fungus and Saproling creature you control gets +1/+1.', colors: ['G'], mana_value: 2, rarity: 'uncommon', legalities: { standard: 'legal', modern: 'legal', pioneer: 'legal' } },

      // Saproling Spells & Permanents
      { id: '7', name: 'Saproling Migration', mana_cost: '{1}{G}', type_line: 'Sorcery', oracle_text: 'Kicker {4}. Create two 1/1 green Saproling creature tokens. If this spell was kicked, create four of those tokens instead.', colors: ['G'], mana_value: 2, rarity: 'common', legalities: { standard: 'legal', modern: 'legal', pioneer: 'legal' } },
      { id: '8', name: 'Spore Swarm', mana_cost: '{3}{G}', type_line: 'Instant', oracle_text: 'Create three 1/1 green Saproling creature tokens.', colors: ['G'], mana_value: 4, rarity: 'uncommon', legalities: { standard: 'legal', modern: 'legal', pioneer: 'legal' } },
      { id: '9', name: 'Fungal Plots', mana_cost: '{1}{G}', type_line: 'Enchantment', oracle_text: '{1}{G}, Exile a creature card from your graveyard: Create a 1/1 green Saproling creature token. Sacrifice two Saprolings: You gain 2 life and draw a card.', colors: ['G'], mana_value: 2, rarity: 'uncommon', legalities: { standard: 'legal', modern: 'legal', pioneer: 'legal' } },
      { id: '10', name: 'The Skullspore Nexus', mana_cost: '{6}{G}{G}', type_line: 'Legendary Artifact', oracle_text: 'This spell costs {X} less to cast. Whenever a nontoken creature dies, create a Fungus Dinosaur token.', colors: ['G'], mana_value: 8, rarity: 'mythic', legalities: { standard: 'legal', modern: 'legal', pioneer: 'legal' } },

      // Interaction & Removal
      { id: '11', name: 'Bitter Triumph', mana_cost: '{1}{B}', type_line: 'Instant', oracle_text: 'As an additional cost, discard a card or pay 3 life. Destroy target creature or planeswalker.', colors: ['B'], mana_value: 2, rarity: 'uncommon', legalities: { standard: 'legal', modern: 'legal', pioneer: 'legal' } },
      { id: '12', name: 'Cut Down', mana_cost: '{B}', type_line: 'Instant', oracle_text: 'Destroy target creature with total power and toughness 5 or less.', colors: ['B'], mana_value: 1, rarity: 'uncommon', legalities: { standard: 'legal', modern: 'legal', pioneer: 'legal' } },
      { id: '13', name: 'Get Lost', mana_cost: '{1}{W}', type_line: 'Instant', oracle_text: 'Destroy target creature, enchantment, or planeswalker. Its controller creates two Map tokens.', colors: ['W'], mana_value: 2, rarity: 'rare', legalities: { standard: 'legal', modern: 'legal', pioneer: 'legal' } },

      // Anthem / Token Buffs
      { id: '14', name: 'Intangible Virtue', mana_cost: '{1}{W}', type_line: 'Enchantment', oracle_text: 'Creature tokens you control get +1/+1 and have vigilance.', colors: ['W'], mana_value: 2, rarity: 'uncommon', legalities: { standard: 'legal', modern: 'legal', pioneer: 'legal' } },

      // Lands
      { id: '15', name: 'Overgrown Tomb', mana_cost: '', type_line: 'Land — Swamp Forest', oracle_text: '{T}: Add {B} or {G}. As this enters, you may pay 2 life. If you don\'t, it enters tapped.', colors: [], mana_value: 0, rarity: 'rare', legalities: { standard: 'legal', modern: 'legal', pioneer: 'legal' } },
      { id: '16', name: 'Temple Garden', mana_cost: '', type_line: 'Land — Forest Plains', oracle_text: '{T}: Add {G} or {W}. As this enters, you may pay 2 life.', colors: [], mana_value: 0, rarity: 'rare', legalities: { standard: 'legal', modern: 'legal', pioneer: 'legal' } },
      { id: '17', name: 'Godless Shrine', mana_cost: '', type_line: 'Land — Plains Swamp', oracle_text: '{T}: Add {W} or {B}. As this enters, you may pay 2 life.', colors: [], mana_value: 0, rarity: 'rare', legalities: { standard: 'legal', modern: 'legal', pioneer: 'legal' } },
      { id: '18', name: 'Forest', mana_cost: '', type_line: 'Basic Land — Forest', oracle_text: '{T}: Add {G}.', colors: [], mana_value: 0, rarity: 'common', legalities: { standard: 'legal', modern: 'legal', pioneer: 'legal' } },
      { id: '19', name: 'Swamp', mana_cost: '', type_line: 'Basic Land — Swamp', oracle_text: '{T}: Add {B}.', colors: [], mana_value: 0, rarity: 'common', legalities: { standard: 'legal', modern: 'legal', pioneer: 'legal' } },
      { id: '20', name: 'Plains', mana_cost: '', type_line: 'Basic Land — Plains', oracle_text: '{T}: Add {W}.', colors: [], mana_value: 0, rarity: 'common', legalities: { standard: 'legal', modern: 'legal', pioneer: 'legal' } }
    ];

    const uiFormState = {
      formato: 'STANDARD',
      format: 'STANDARD',
      archetype: 'midrange',
      colores: ['B', 'G', 'W'],
      colors: ['B', 'G', 'W'],
      tribe: 'saprolines & hongos',
      tribu: 'saprolines & hongos',
      strategy: 'enjambre de saprolines (tokens)',
      estrategia: 'enjambre de saprolines (tokens)',
      selectedEngineId: 'saproling_tokens',
      engineFlavor: 'Enjambre de Saprolines (Tokens)',
      rarityMode: 'high-power',
      allowedRarities: ['common', 'uncommon', 'rare', 'mythic'],
      powerLevel: 'Competitive',
      deckSize: 60
    };

    const result = CompilerConvergencePipeline.compileDeckFromScratch({
      userPrompt: 'Mazo competitivo midrange B/G/W saprolines & hongos',
      archetype: 'midrange',
      format: 'STANDARD',
      rawCardPool: mockCardPool,
      uiFormState
    });

    assert.strictEqual(result.buildStatus, 'SUCCESS', `Expected SUCCESS but got: ${result.safetyViolations?.join(', ')}`);
    assert.strictEqual(result.safetyViolations.length, 0);
    assert.ok(result.tribeMatchCount >= 8, `Expected at least 8 tribal matches, got: ${result.tribeMatchCount}`);
    console.log(`✅ TEST PASSED: Compiled Saproling/Fungus deck with ${result.tribeMatchCount} tribal density and status: ${result.buildStatus}`);
  });
});
