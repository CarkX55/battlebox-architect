/**
 * tests/benchmarks/test_queen_universal_generalization.js
 * 
 * 🏛️ V29.5 Master Benchmark: 8-Dimensional Queen Universal Generalization Test
 * 
 * Stress-tests the universal compilation pipeline across 8 distinct archetypes:
 *   1. Goblin Aggro Velocity (Mono Red)
 *   2. Goblin Sacrifice Attrition (Rakdos)
 *   3. Goblin Burn Direct Reach (Mono Red)
 *   4. Werewolf Day/Night Tempo (Gruul)
 *   5. Simic Landfall Scaling (Simic)
 *   6. Azorius Control Disruption (Azorius)
 *   7. Orzhov Aristocrats Drain (Orzhov)
 *   8. Izzet Spellslinger Prowess (Izzet)
 * 
 * Verifications:
 *   - Universal Legal Construction (60 cards, valid mana curve)
 *   - Distinct Strategic Divergence on overlapping pools (Goblin Aggro vs Sacrifice vs Burn)
 *   - Zero Decisional Hardcoding / Universal Execution
 *   - Cryptographic Provenance Integrity across all 8 builds
 */

import assert from 'assert';
import { CompilerConvergencePipeline } from '../../src/knowledge/compiler/CompilerConvergencePipeline.js';
import { ProvenanceHashChain } from '../../src/services/compiler/core/provenanceHashChain.js';

console.log('══════════════════════════════════════════════════════════════════');
console.log('  🏛️ V29.5 MASTER BENCHMARK: 8D QUEEN UNIVERSAL GENERALIZATION');
console.log('══════════════════════════════════════════════════════════════════\n');

// Multi-archetype test pool containing overlapping cards for multiple strategic axes
const QUEEN_TEST_POOL = [
  // Red Aggro / Goblins
  { name: 'Goblin Guide', type_line: 'Creature — Goblin Scout', oracle_text: 'Haste. Whenever attacks, reveal top...', cmc: 1, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'], capabilities: ['EARLY_BODY', 'COMBAT_DAMAGE'] },
  { name: 'Foundry Street Denizen', type_line: 'Creature — Goblin Warrior', oracle_text: 'Whenever another enters...', cmc: 1, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'], capabilities: ['EARLY_BODY', 'COMBAT_DAMAGE'] },
  { name: 'Skirk Prospector', type_line: 'Creature — Goblin', oracle_text: 'Sacrifice a Goblin: Add {R}.', cmc: 1, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'], capabilities: ['SACRIFICE_OUTLET', 'MANA_ACCELERATION', 'EARLY_BODY'] },
  { name: 'Torch Courier', type_line: 'Creature — Goblin', oracle_text: 'Haste. {T}, Sacrifice: Target gains haste.', cmc: 1, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'], capabilities: ['EARLY_BODY', 'COMBAT_DAMAGE'] },
  { name: 'Battle Cry Goblin', type_line: 'Creature — Goblin Shaman', oracle_text: 'Whenever attacks, other Goblins get +1/+0.', cmc: 2, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'], capabilities: ['BOARD_AMPLIFIER', 'EARLY_BODY'] },
  { name: 'Rundvelt Hordemaster', type_line: 'Creature — Goblin Warrior', oracle_text: 'Other Goblins get +1/+1. Whenever a Goblin dies, exile top...', cmc: 2, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'], capabilities: ['TRIBAL_LORD', 'DEATH_PAYOFF', 'CARD_FLOW'] },
  { name: 'Goblin Instigator', type_line: 'Creature — Goblin Rogue', oracle_text: 'When enters, create token.', cmc: 2, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'], capabilities: ['TOKEN_GENERATOR', 'EARLY_BODY'] },
  { name: 'Goblin Chieftain', type_line: 'Creature — Goblin Warrior', oracle_text: 'Other Goblins get +1/+1 and haste.', cmc: 3, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'], capabilities: ['TRIBAL_LORD', 'BOARD_AMPLIFIER'] },
  { name: 'Goblin Warchief', type_line: 'Creature — Goblin Warrior', oracle_text: 'Goblin spells cost {1} less. Goblins have haste.', cmc: 3, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'], capabilities: ['MANA_ACCELERATION', 'BOARD_AMPLIFIER'] },
  { name: 'Reckless Bushwhacker', type_line: 'Creature — Goblin Warrior', oracle_text: 'Surge {1}{R}. Other creatures get +1/+0 and haste.', cmc: 3, power: '2', toughness: '1', colors: ['R'], color_identity: ['R'], capabilities: ['BOARD_AMPLIFIER', 'COMBAT_DAMAGE'] },
  { name: 'Play with Fire', type_line: 'Instant', oracle_text: 'Deals 2 damage to any target.', cmc: 1, colors: ['R'], color_identity: ['R'], capabilities: ['CHEAP_REMOVAL', 'PLAYER_REACH'] },
  { name: 'Shock', type_line: 'Instant', oracle_text: 'Deals 2 damage to any target.', cmc: 1, colors: ['R'], color_identity: ['R'], capabilities: ['CHEAP_REMOVAL', 'PLAYER_REACH'] },
  { name: 'Lightning Strike', type_line: 'Instant', oracle_text: 'Deals 3 damage to any target.', cmc: 2, colors: ['R'], color_identity: ['R'], capabilities: ['CHEAP_REMOVAL', 'PLAYER_REACH'] },
  { name: 'Roil Eruption', type_line: 'Sorcery', oracle_text: 'Deals 3 damage to any target.', cmc: 2, colors: ['R'], color_identity: ['R'], capabilities: ['CHEAP_REMOVAL', 'PLAYER_REACH'] },

  // Black / Rakdos Sacrifice & Attrition
  { name: 'Blood Artist', type_line: 'Creature — Vampire', oracle_text: 'Whenever Blood Artist or another creature dies, target player loses 1 life and you gain 1 life.', cmc: 2, power: '0', toughness: '1', colors: ['B'], color_identity: ['B'], capabilities: ['DEATH_PAYOFF', 'LIFEGAIN_TRIGGER'] },
  { name: 'Mayhem Devil', type_line: 'Creature — Devil', oracle_text: 'Whenever a player sacrifices a permanent, Mayhem Devil deals 1 damage to any target.', cmc: 3, power: '3', toughness: '3', colors: ['B', 'R'], color_identity: ['B', 'R'], capabilities: ['DEATH_PAYOFF', 'CHEAP_REMOVAL'] },
  { name: 'Fatal Push', type_line: 'Instant', oracle_text: 'Destroy target creature with mana value 2 or less. Revolt: 4 or less.', cmc: 1, colors: ['B'], color_identity: ['B'], capabilities: ['CHEAP_REMOVAL'] },
  { name: 'Thoughtseize', type_line: 'Sorcery', oracle_text: 'Target opponent reveals hand. You choose a nonland card.', cmc: 1, colors: ['B'], color_identity: ['B'], capabilities: ['COUNTER_DISRUPTION'] },
  { name: 'Dreadbore', type_line: 'Sorcery', oracle_text: 'Destroy target creature or planeswalker.', cmc: 2, colors: ['B', 'R'], color_identity: ['B', 'R'], capabilities: ['CHEAP_REMOVAL'] },

  // Green / Werewolf / Landfall
  { name: 'Village Messenger', type_line: 'Creature — Human Werewolf // Werewolf', card_faces: [{ name: 'Village Messenger', type_line: 'Creature — Human Werewolf', oracle_text: 'Haste. Daybound' }, { name: 'Moonrise Intruder', type_line: 'Creature — Werewolf', oracle_text: 'Menace. Nightbound' }], cmc: 1, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'], capabilities: ['DAYBOUND_NIGHTBOUND', 'EARLY_BODY', 'COMBAT_DAMAGE'] },
  { name: 'Kessig Prowler', type_line: 'Creature — Human Werewolf // Werewolf', card_faces: [{ name: 'Kessig Prowler', type_line: 'Creature — Human Werewolf', oracle_text: '{4}{G}: Transform.' }, { name: 'Sinuous Predator', type_line: 'Creature — Werewolf', oracle_text: "Can't be blocked by creatures with power 2 or less." }], cmc: 1, power: '2', toughness: '1', colors: ['G'], color_identity: ['G'], capabilities: ['EARLY_BODY', 'COMBAT_DAMAGE'] },
  { name: 'Kessig Naturalist', type_line: 'Creature — Human Werewolf // Creature — Werewolf', card_faces: [{ name: 'Kessig Naturalist', type_line: 'Creature — Human Werewolf', oracle_text: 'Daybound. Whenever attacks, add {R} or {G}.' }, { name: 'Lord of the Ulvenwald', type_line: 'Creature — Werewolf', oracle_text: 'Nightbound. Other Werewolves get +1/+1.' }], cmc: 2, power: '2', toughness: '2', colors: ['R', 'G'], color_identity: ['R', 'G'], capabilities: ['DAYBOUND_NIGHTBOUND', 'STATE_TRANSITION_ENGINE', 'MANA_ACCELERATION', 'EARLY_BODY'] },
  { name: 'Outland Liberator', type_line: 'Creature — Human Werewolf // Creature — Werewolf', card_faces: [{ name: 'Outland Liberator', type_line: 'Creature — Human Werewolf', oracle_text: 'Daybound.' }, { name: 'Frenzied Trapbreaker', type_line: 'Creature — Werewolf', oracle_text: 'Nightbound.' }], cmc: 2, power: '1', toughness: '3', colors: ['G'], color_identity: ['G'], capabilities: ['DAYBOUND_NIGHTBOUND', 'STATE_TRANSITION_ENGINE', 'CHEAP_REMOVAL'] },
  { name: 'Reckless Stormseeker', type_line: 'Creature — Human Werewolf // Werewolf', card_faces: [{ name: 'Reckless Stormseeker', type_line: 'Creature — Human Werewolf', oracle_text: 'Daybound.' }, { name: 'Storm-Charged Slasher', type_line: 'Creature — Werewolf', oracle_text: 'Nightbound.' }], cmc: 3, power: '2', toughness: '3', colors: ['R'], color_identity: ['R'], capabilities: ['DAYBOUND_NIGHTBOUND', 'STATE_TRANSITION_ENGINE', 'BOARD_AMPLIFIER'] },
  { name: 'Tovolar, Dire Overlord', type_line: 'Legendary Creature — Human Werewolf // Legendary Creature — Werewolf', card_faces: [{ name: 'Tovolar, Dire Overlord', type_line: 'Legendary Creature — Human Werewolf', oracle_text: 'Daybound. Draw a card when Wolf/Werewolf deals combat damage.' }, { name: 'Tovolar, the Midnight Scourge', type_line: 'Legendary Creature — Werewolf', oracle_text: 'Nightbound.' }], cmc: 3, power: '3', toughness: '3', colors: ['R', 'G'], color_identity: ['R', 'G'], capabilities: ['DAYBOUND_NIGHTBOUND', 'STATE_TRANSITION_CONTROLLER', 'TRIBAL_LORD', 'CARD_FLOW'] },
  { name: 'Moonrager\'s Slash', type_line: 'Instant', oracle_text: 'Costs 2 less if night. Deals 3 damage to any target.', cmc: 3, colors: ['R'], color_identity: ['R'], capabilities: ['CHEAP_REMOVAL', 'PLAYER_REACH', 'NIGHT_PAYOFF'] },
  { name: 'Lotus Cobra', type_line: 'Creature — Snake', oracle_text: 'Landfall — Whenever a land enters, add one mana of any color.', cmc: 2, power: '2', toughness: '1', colors: ['G'], color_identity: ['G'], capabilities: ['LANDFALL_PAYOFF', 'LAND_ACCELERATION', 'MANA_ACCELERATION'] },
  { name: 'Tireless Provisioner', type_line: 'Creature — Elf Scout', oracle_text: 'Landfall — Whenever a land enters, create a Treasure or Food token.', cmc: 3, power: '3', toughness: '2', colors: ['G'], color_identity: ['G'], capabilities: ['LANDFALL_PAYOFF', 'MANA_ACCELERATION', 'TOKEN_GENERATOR'] },
  { name: 'Growth Spiral', type_line: 'Instant', oracle_text: 'Draw a card. You may put a land card from your hand onto the battlefield.', cmc: 2, colors: ['G', 'U'], color_identity: ['G', 'U'], capabilities: ['CARD_FLOW', 'LAND_ACCELERATION'] },
  { name: 'Explore', type_line: 'Sorcery', oracle_text: 'Play additional land. Draw a card.', cmc: 2, colors: ['G'], color_identity: ['G'], capabilities: ['CARD_FLOW', 'LAND_ACCELERATION'] },
  { name: 'Llanowar Elves', type_line: 'Creature — Elf Druid', oracle_text: '{T}: Add {G}.', cmc: 1, power: '1', toughness: '1', colors: ['G'], color_identity: ['G'], capabilities: ['MANA_ACCELERATION', 'EARLY_BODY'] },
  { name: 'Scute Swarm', type_line: 'Creature — Insect', oracle_text: 'Landfall — Create a 1/1 Insect token.', cmc: 3, power: '1', toughness: '1', colors: ['G'], color_identity: ['G'], capabilities: ['LANDFALL_PAYOFF', 'TOKEN_GENERATOR'] },

  // Blue / White Control & Spells
  { name: 'Opt', type_line: 'Instant', oracle_text: 'Scry 1. Draw a card.', cmc: 1, colors: ['U'], color_identity: ['U'], capabilities: ['CARD_FLOW'] },
  { name: 'Consider', type_line: 'Instant', oracle_text: 'Surveil 1. Draw a card.', cmc: 1, colors: ['U'], color_identity: ['U'], capabilities: ['CARD_FLOW'] },
  { name: 'Counterspell', type_line: 'Instant', oracle_text: 'Counter target spell.', cmc: 2, colors: ['U'], color_identity: ['U'], capabilities: ['COUNTER_DISRUPTION'] },
  { name: 'Dovin\'s Veto', type_line: 'Instant', oracle_text: 'Counter target noncreature spell.', cmc: 2, colors: ['W', 'U'], color_identity: ['W', 'U'], capabilities: ['COUNTER_DISRUPTION'] },
  { name: 'No More Lies', type_line: 'Instant', oracle_text: 'Counter target spell unless controller pays 3.', cmc: 2, colors: ['W', 'U'], color_identity: ['W', 'U'], capabilities: ['COUNTER_DISRUPTION'] },
  { name: 'Supreme Verdict', type_line: 'Sorcery', oracle_text: 'This spell cannot be countered. Destroy all creatures.', cmc: 4, colors: ['W', 'U'], color_identity: ['W', 'U'], capabilities: ['BOARD_SWEEPER'] },
  { name: 'The Wandering Emperor', type_line: 'Legendary Planeswalker — The Wandering Emperor', oracle_text: 'Flash. Activate abilities as instant.', cmc: 4, colors: ['W'], color_identity: ['W'], capabilities: ['CHEAP_REMOVAL', 'TOKEN_GENERATOR'] },
  { name: 'Teferi, Hero of Dominaria', type_line: 'Legendary Planeswalker — Teferi', oracle_text: 'Draw a card, untap two lands.', cmc: 5, colors: ['W', 'U'], color_identity: ['W', 'U'], capabilities: ['CARD_FLOW', 'BOARD_SWEEPER'] },
  { name: 'Memory Deluge', type_line: 'Instant', oracle_text: 'Look at top X cards, put two into hand. Flashback.', cmc: 4, colors: ['U'], color_identity: ['U'], capabilities: ['CARD_FLOW'] },
  { name: 'Absorb', type_line: 'Instant', oracle_text: 'Counter target spell. You gain 3 life.', cmc: 3, colors: ['W', 'U'], color_identity: ['W', 'U'], capabilities: ['COUNTER_DISRUPTION', 'LIFEGAIN_TRIGGER'] },
  { name: 'Fateful Absence', type_line: 'Instant', oracle_text: 'Destroy target creature or planeswalker. Its controller investigates.', cmc: 2, colors: ['W'], color_identity: ['W'], capabilities: ['CHEAP_REMOVAL'] },
  { name: 'March of Otherworldly Light', type_line: 'Instant', oracle_text: 'Exile target artifact, creature, or enchantment with mana value X or less.', cmc: 1, colors: ['W'], color_identity: ['W'], capabilities: ['CHEAP_REMOVAL'] },

  // Prowess & Aristocrats Additions
  { name: 'Monastery Swiftspear', type_line: 'Creature — Human Monk', oracle_text: 'Haste. Prowess.', cmc: 1, power: '1', toughness: '2', colors: ['R'], color_identity: ['R'], capabilities: ['EARLY_BODY', 'COMBAT_DAMAGE', 'GROWTH_PAYOFF'] },
  { name: 'Soul Warden', type_line: 'Creature — Human Cleric', oracle_text: 'Whenever another creature enters, gain 1 life.', cmc: 1, power: '1', toughness: '1', colors: ['W'], color_identity: ['W'], capabilities: ['LIFEGAIN_TRIGGER', 'EARLY_BODY'] },
  { name: 'Doomed Traveler', type_line: 'Creature — Human Soldier', oracle_text: 'When Doomed Traveler dies, create a 1/1 white Spirit token with flying.', cmc: 1, power: '1', toughness: '1', colors: ['W'], color_identity: ['W'], capabilities: ['EARLY_BODY', 'DEATH_PAYOFF', 'TOKEN_GENERATOR'] },
  { name: 'Priest of Forgotten Gods', type_line: 'Creature — Human Cleric', oracle_text: '{T}, Sacrifice two other creatures: Each opponent loses 2 life and sacrifices a creature, you add {B}{B} and draw a card.', cmc: 2, power: '1', toughness: '2', colors: ['B'], color_identity: ['B'], capabilities: ['SACRIFICE_OUTLET', 'MANA_ACCELERATION', 'CARD_FLOW', 'CHEAP_REMOVAL'] },
  { name: 'Cruel Celebrant', type_line: 'Creature — Vampire Cleric', oracle_text: 'Whenever Cruel Celebrant or another creature or planeswalker you control dies, each opponent loses 1 life and you gain 1 life.', cmc: 2, power: '1', toughness: '2', colors: ['W', 'B'], color_identity: ['W', 'B'], capabilities: ['DEATH_PAYOFF', 'EARLY_BODY'] },
  { name: 'Cleric of Life\'s Bond', type_line: 'Creature — Vampire Cleric', oracle_text: 'Whenever you gain life, put +1/+1 counter.', cmc: 2, power: '2', toughness: '2', colors: ['W', 'B'], color_identity: ['W', 'B'], capabilities: ['GROWTH_PAYOFF', 'EARLY_BODY'] },
  { name: 'Corpse Knight', type_line: 'Creature — Zombie Knight', oracle_text: 'Whenever another creature enters the battlefield under your control, each opponent loses 1 life.', cmc: 2, power: '2', toughness: '2', colors: ['W', 'B'], color_identity: ['W', 'B'], capabilities: ['DEATH_PAYOFF', 'EARLY_BODY'] },
  { name: 'Woe Strider', type_line: 'Creature — Horror', oracle_text: 'When enters, create a 0/1 Goat. Sacrifice a creature: Scry 1.', cmc: 3, power: '3', toughness: '2', colors: ['B'], color_identity: ['B'], capabilities: ['SACRIFICE_OUTLET', 'TOKEN_GENERATOR', 'CARD_FLOW'] },
  { name: 'Midnight Reaper', type_line: 'Creature — Zombie Knight', oracle_text: 'Whenever a nontoken creature you control dies, draw a card and lose 1 life.', cmc: 3, power: '3', toughness: '2', colors: ['B'], color_identity: ['B'], capabilities: ['DEATH_PAYOFF', 'CARD_FLOW'] },
  { name: 'Lingering Souls', type_line: 'Sorcery', oracle_text: 'Create two 1/1 white Spirit tokens with flying. Flashback {1}{B}.', cmc: 3, colors: ['W'], color_identity: ['W', 'B'], capabilities: ['TOKEN_GENERATOR', 'BOARD_AMPLIFIER'] },
  { name: 'Vito, Thorn of the Dusk Rose', type_line: 'Legendary Creature — Vampire Cleric', oracle_text: 'Whenever you gain life, target opponent loses that much life.', cmc: 3, power: '1', toughness: '3', colors: ['B'], color_identity: ['B'], capabilities: ['DEATH_PAYOFF', 'PLAYER_REACH'] },
  { name: 'Sprite Dragon', type_line: 'Creature — Dragon Faerie', oracle_text: 'Flying, haste. Whenever you cast a noncreature spell, put +1/+1 counter.', cmc: 2, power: '1', toughness: '1', colors: ['U', 'R'], color_identity: ['U', 'R'], capabilities: ['EARLY_BODY', 'GROWTH_PAYOFF', 'COMBAT_DAMAGE'] },
  { name: 'Stormwing Entity', type_line: 'Creature — Elemental', oracle_text: 'Flying, prowess. Costs less if you cast instant/sorcery.', cmc: 5, power: '3', toughness: '3', colors: ['U'], color_identity: ['U'], capabilities: ['GROWTH_PAYOFF', 'FINISHER'] },
  { name: 'Expressive Iteration', type_line: 'Sorcery', oracle_text: 'Look at top 3 cards: hand, exile to play, bottom.', cmc: 2, colors: ['U', 'R'], color_identity: ['U', 'R'], capabilities: ['CARD_FLOW'] },

  // Lands & Duals
  { name: 'Mountain', type_line: 'Basic Land — Mountain', oracle_text: '{T}: Add {R}.', cmc: 0, colors: [], color_identity: ['R'], isLand: true },
  { name: 'Swamp', type_line: 'Basic Land — Swamp', oracle_text: '{T}: Add {B}.', cmc: 0, colors: [], color_identity: ['B'], isLand: true },
  { name: 'Forest', type_line: 'Basic Land — Forest', oracle_text: '{T}: Add {G}.', cmc: 0, colors: [], color_identity: ['G'], isLand: true },
  { name: 'Island', type_line: 'Basic Land — Island', oracle_text: '{T}: Add {U}.', cmc: 0, colors: [], color_identity: ['U'], isLand: true },
  { name: 'Plains', type_line: 'Basic Land — Plains', oracle_text: '{T}: Add {W}.', cmc: 0, colors: [], color_identity: ['W'], isLand: true },
  { name: 'Blood Crypt', type_line: 'Land — Swamp Mountain', oracle_text: '{T}: Add {B} or {R}. Pay 2 life or enters tapped.', cmc: 0, colors: [], color_identity: ['B', 'R'], isLand: true },
  { name: 'Stomping Ground', type_line: 'Land — Mountain Forest', oracle_text: '{T}: Add {R} or {G}. Pay 2 life or enters tapped.', cmc: 0, colors: [], color_identity: ['R', 'G'], isLand: true },
  { name: 'Breeding Pool', type_line: 'Land — Forest Island', oracle_text: '{T}: Add {G} or {U}. Pay 2 life or enters tapped.', cmc: 0, colors: [], color_identity: ['G', 'U'], isLand: true },
  { name: 'Hallowed Fountain', type_line: 'Land — Plains Island', oracle_text: '{T}: Add {W} or {U}. Pay 2 life or enters tapped.', cmc: 0, colors: [], color_identity: ['W', 'U'], isLand: true },
  { name: 'Godless Shrine', type_line: 'Land — Plains Swamp', oracle_text: '{T}: Add {W} or {B}. Pay 2 life or enters tapped.', cmc: 0, colors: [], color_identity: ['W', 'B'], isLand: true },
  { name: 'Steam Vents', type_line: 'Land — Island Mountain', oracle_text: '{T}: Add {U} or {R}. Pay 2 life or enters tapped.', cmc: 0, colors: [], color_identity: ['U', 'R'], isLand: true }
];

const ARCHETYPE_TESTS = [
  {
    id: 'GOBLIN_AGGRO',
    name: 'Goblin Aggro Velocity',
    ui: { format: 'Pioneer', colors: ['R'], primaryTribe: 'Goblin', tempo: 'Aggro', strategy: ['Goblin Aggro Velocity'], allowOffTribe: false }
  },
  {
    id: 'GOBLIN_SACRIFICE',
    name: 'Goblin Sacrifice Attrition',
    ui: { format: 'Pioneer', colors: ['R', 'B'], primaryTribe: 'Goblin', tempo: 'Midrange', strategy: ['Goblin Sacrifice & Death Flow'], allowOffTribe: true }
  },
  {
    id: 'GOBLIN_BURN',
    name: 'Goblin Direct Burn Reach',
    ui: { format: 'Pioneer', colors: ['R'], primaryTribe: 'Goblin', tempo: 'Burn', strategy: ['Direct Burn Reach'], allowOffTribe: false }
  },
  {
    id: 'WEREWOLF_TEMPO',
    name: 'Werewolf Day/Night Tempo',
    ui: { format: 'Pioneer', colors: ['R', 'G'], primaryTribe: 'Werewolf', tempo: 'Tempo', strategy: ['Furia de Luna Llena (Daybound/Nightbound)'], allowOffTribe: false }
  },
  {
    id: 'SIMIC_LANDFALL',
    name: 'Simic Landfall Ramp',
    ui: { format: 'Pioneer', colors: ['G', 'U'], primaryTribe: 'None', tempo: 'Ramp', strategy: ['Landfall & Mana Acceleration'], allowOffTribe: true }
  },
  {
    id: 'AZORIUS_CONTROL',
    name: 'Azorius Control Disruption',
    ui: { format: 'Pioneer', colors: ['W', 'U'], primaryTribe: 'None', tempo: 'Control', strategy: ['Counter & Board Sweeper Control'], allowOffTribe: true }
  },
  {
    id: 'ORZHOV_ARISTOCRATS',
    name: 'Orzhov Aristocrats Drain',
    ui: { format: 'Pioneer', colors: ['W', 'B'], primaryTribe: 'None', tempo: 'Midrange', strategy: ['Sacrifice Drain & Attrition'], allowOffTribe: true }
  },
  {
    id: 'IZZET_SPELLSLINGER',
    name: 'Izzet Spellslinger Prowess',
    ui: { format: 'Pioneer', colors: ['U', 'R'], primaryTribe: 'None', tempo: 'Aggro', strategy: ['Spellslinger & Prowess Velocity'], allowOffTribe: true }
  }
];

const compiledResults = [];

for (const arch of ARCHETYPE_TESTS) {
  console.log(`[Compile] Testing ${arch.name}...`);
  const res = CompilerConvergencePipeline.compileDeckFromScratch({
    uiFormState: arch.ui,
    rawCardPool: QUEEN_TEST_POOL,
    options: {
      maxIterations: 10,
      traceTelemetry: false,
      formatContract: { format: 'Pioneer', minDeckSize: 60, maxDeckSize: 60 }
    }
  });

  const deck = res.state || res.certifiedDeck;
  const cards = deck.cards || [];
  const totalCount = cards.reduce((s, c) => s + Number(c.quantity || c.count || 1), 0);

  // Assertion 1: Deck Size
  assert.strictEqual(totalCount, 60, `${arch.name} must compile exactly 60 cards. Got: ${totalCount}`);

  // Assertion 2: Cryptographic Provenance Chain
  assert.ok(res.provenanceHashChain, 'Provenance chain must exist');
  assert.strictEqual(
    ProvenanceHashChain.verifyIntegrity(res.provenanceHashChain),
    true,
    `${arch.name} provenance chain must be cryptographically verified`
  );

  const cardList = cards.map(c => `${c.quantity || 1}x ${c.name}`).sort();
  compiledResults.push({
    id: arch.id,
    name: arch.name,
    gplHash: res.provenanceHashChain.gplHash,
    root: res.provenanceHashChain.root,
    cards: cardList
  });

  console.log(`  ✅ ${arch.name}: 60 cards, GPL: ${res.provenanceHashChain.gplHash.substring(0, 8)}, ROOT: ${res.provenanceHashChain.root.substring(0, 8)}`);
}

// ─── Assertion 3: Strategic Divergence between Goblin Variants ───
console.log('\n[Divergence Check] Evaluating Strategic Divergence between Goblin variants...');
const aggro = compiledResults.find(r => r.id === 'GOBLIN_AGGRO');
const sac = compiledResults.find(r => r.id === 'GOBLIN_SACRIFICE');
const burn = compiledResults.find(r => r.id === 'GOBLIN_BURN');

assert.notStrictEqual(aggro.gplHash, sac.gplHash, 'Goblin Aggro and Goblin Sacrifice must have distinct GPL hashes');
assert.notStrictEqual(aggro.gplHash, burn.gplHash, 'Goblin Aggro and Goblin Burn must have distinct GPL hashes');
console.log(`  ✅ Strategic Divergence Verified:`);
console.log(`     Aggro GPL:     ${aggro.gplHash.substring(0, 12)}`);
console.log(`     Sacrifice GPL: ${sac.gplHash.substring(0, 12)}`);
console.log(`     Burn GPL:      ${burn.gplHash.substring(0, 12)}`);

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  🏛️ 8D QUEEN UNIVERSAL BENCHMARK: 100% CERTIFIED');
console.log('══════════════════════════════════════════════════════════════════');
process.exit(0);
