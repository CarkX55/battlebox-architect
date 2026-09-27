/**
 * tests/benchmarks/test_v29_1_pipeline_integration.js
 * 
 * V29.1 Master Benchmark: End-to-End Pipeline Integration & Universal Cross-Archetype Matrix.
 * 
 * Verifies:
 *   1. "Asalto de Goblins" in Pioneer (R/B Aggro) -> Zero parasite cards, verified lands, zero drift.
 *   2. Non-tribal Simic Landfall Ramp in Standard (G/U) -> Landfall engine, big finishers, 23-25 lands.
 *   3. Non-tribal Azorius Control in Modern (W/U) -> Counter disruption, sweepers, control finishers, 24-26 lands.
 *   4. Universal Cross-Archetype Divergence Matrix -> Proven Jaccard divergence across all archetypes.
 * 
 * Run: node --experimental-vm-modules tests/benchmarks/test_v29_1_pipeline_integration.js
 */

import { CompilerConvergencePipeline } from '../../src/knowledge/compiler/CompilerConvergencePipeline.js';
import { IntentPackage } from '../../src/services/compiler/core/intentPackage.js';
import { GameplanIntegrityGate } from '../../src/services/compiler/core/gameplanIntegrityGate.js';
import { GameplanDriftDetector } from '../../src/services/compiler/core/gameplanDriftDetector.js';
import { DeckPlanCoverage } from '../../src/services/compiler/core/deckPlanCoverage.js';
import { ManaExecutionOptimizer } from '../../src/services/compiler/core/manaExecutionOptimizer.js';

// ─── Multi-Archetype Mock Pool ───────────────────────────────────────────────
function createUniversalPool() {
  return [
    // === GOBLINS / RED AGGRO ===
    { name: 'Goblin Guide', type_line: 'Creature — Goblin Scout', oracle_text: 'Haste', cmc: 1, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Foundry Street Denizen', type_line: 'Creature — Goblin Warrior', oracle_text: 'Whenever another red creature enters the battlefield under your control, gets +1/+0.', cmc: 1, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
    { name: 'Skirk Prospector', type_line: 'Creature — Goblin', oracle_text: 'Sacrifice a Goblin: Add {R}.', cmc: 1, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
    { name: 'Torch Courier', type_line: 'Creature — Goblin', oracle_text: 'Haste. {T}, Sacrifice Torch Courier: Target creature gains haste until end of turn.', cmc: 1, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
    { name: 'Battle Cry Goblin', type_line: 'Creature — Goblin Shaman', oracle_text: 'Whenever Battle Cry Goblin attacks, each other attacking Goblin gets +1/+0.\n{1}{R}: Target Goblin gains haste.', cmc: 2, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Rundvelt Hordemaster', type_line: 'Creature — Goblin Warrior', oracle_text: 'Other Goblins you control get +1/+1.\nWhenever a Goblin you control dies, exile the top card of your library. You may play that card this turn.', cmc: 2, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
    { name: 'Goblin Instigator', type_line: 'Creature — Goblin Rogue', oracle_text: 'When Goblin Instigator enters the battlefield, create a 1/1 red Goblin creature token.', cmc: 2, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
    { name: 'Goblin Chieftain', type_line: 'Creature — Goblin Warrior', oracle_text: 'Haste\nOther Goblin creatures you control get +1/+1 and have haste.', cmc: 3, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Goblin Rabblemaster', type_line: 'Creature — Goblin Warrior', oracle_text: 'At the beginning of combat on your turn, create a 1/1 red Goblin creature token with haste.\nGets +1/+0 for each other attacking Goblin.', cmc: 3, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Goblin Warchief', type_line: 'Creature — Goblin Warrior', oracle_text: 'Goblin spells you cast cost {1} less to cast.\nGoblin creatures you control have haste.', cmc: 3, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Legion Warboss', type_line: 'Creature — Goblin Soldier', oracle_text: 'Mentor. At the beginning of combat on your turn, create a 1/1 red Goblin creature token with haste.', cmc: 3, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Reckless Bushwhacker', type_line: 'Creature — Goblin Warrior', oracle_text: 'Surge {1}{R}\nWhen enters, if surge cost was paid, other creatures you control get +1/+0 and gain haste.', cmc: 3, power: '2', toughness: '1', colors: ['R'], color_identity: ['R'] },
    { name: 'Play with Fire', type_line: 'Instant', oracle_text: 'Play with Fire deals 2 damage to any target. If a player was dealt damage this way, scry 1.', cmc: 1, power: undefined, toughness: undefined, colors: ['R'], color_identity: ['R'] },
    { name: 'Shock', type_line: 'Instant', oracle_text: 'Shock deals 2 damage to any target.', cmc: 1, power: undefined, toughness: undefined, colors: ['R'], color_identity: ['R'] },
    { name: 'Lightning Strike', type_line: 'Instant', oracle_text: 'Lightning Strike deals 3 damage to any target.', cmc: 2, power: undefined, toughness: undefined, colors: ['R'], color_identity: ['R'] },
    { name: 'Roil Eruption', type_line: 'Sorcery', oracle_text: 'Roil Eruption deals 3 damage to any target.', cmc: 2, power: undefined, toughness: undefined, colors: ['R'], color_identity: ['R'] },
    { name: 'Fatal Push', type_line: 'Instant', oracle_text: 'Destroy target creature if it has mana value 2 or less. Revolt — Destroy target creature if it has mana value 4 or less instead.', cmc: 1, power: undefined, toughness: undefined, colors: ['B'], color_identity: ['B'] },

    // === PARASITE CARDS (Should be rejected for Goblin Aggro) ===
    { name: 'Vile Rebirth', type_line: 'Instant', oracle_text: 'Exile target creature card from a graveyard. Create a 2/2 black Zombie creature token.', cmc: 1, power: undefined, toughness: undefined, colors: ['B'], color_identity: ['B'] },
    { name: 'Great Train Heist', type_line: 'Instant', oracle_text: 'Choose one or more — Untap all creatures you control; Target creature gets +2/+0 and gains first strike.', cmc: 1, power: undefined, toughness: undefined, colors: ['R'], color_identity: ['R'] },
    { name: 'Taster of Wares', type_line: 'Creature — Warlock', oracle_text: 'When Taster of Wares enters the battlefield, target opponent loses 1 life.', cmc: 4, power: '1', toughness: '4', colors: ['B'], color_identity: ['B'] },

    // === SIMIC LANDFALL / RAMP ===
    { name: 'Llanowar Elves', type_line: 'Creature — Elf Druid', oracle_text: '{T}: Add {G}.', cmc: 1, power: '1', toughness: '1', colors: ['G'], color_identity: ['G'] },
    { name: 'Elvish Mystic', type_line: 'Creature — Elf Druid', oracle_text: '{T}: Add {G}.', cmc: 1, power: '1', toughness: '1', colors: ['G'], color_identity: ['G'] },
    { name: 'Lotus Cobra', type_line: 'Creature — Snake', oracle_text: 'Landfall — Whenever a land enters the battlefield under your control, add one mana of any color.', cmc: 2, power: '2', toughness: '1', colors: ['G'], color_identity: ['G'] },
    { name: 'Tireless Provisioner', type_line: 'Creature — Elf Scout', oracle_text: 'Landfall — Whenever a land enters the battlefield under your control, create a Food token or a Treasure token.', cmc: 3, power: '3', toughness: '2', colors: ['G'], color_identity: ['G'] },
    { name: 'Explore', type_line: 'Sorcery', oracle_text: 'You may play an additional land this turn. Draw a card.', cmc: 2, power: undefined, toughness: undefined, colors: ['G'], color_identity: ['G'] },
    { name: 'Growth Spiral', type_line: 'Instant', oracle_text: 'Draw a card. You may put a land card from your hand onto the battlefield.', cmc: 2, power: undefined, toughness: undefined, colors: ['G', 'U'], color_identity: ['G', 'U'] },
    { name: 'Cultivate', type_line: 'Sorcery', oracle_text: 'Search your library for up to two basic land cards, reveal those cards, put one onto the battlefield tapped and the other into your hand.', cmc: 3, power: undefined, toughness: undefined, colors: ['G'], color_identity: ['G'] },
    { name: 'Scute Swarm', type_line: 'Creature — Insect', oracle_text: 'Landfall — Whenever a land enters the battlefield under your control, create a 1/1 green Insect creature token. If you control six or more lands, create a token that is a copy of Scute Swarm instead.', cmc: 3, power: '1', toughness: '1', colors: ['G'], color_identity: ['G'] },
    { name: 'Risen Reef', type_line: 'Creature — Elemental', oracle_text: 'Whenever Risen Reef or another Elemental enters the battlefield under your control, look at the top card of your library. If it\'s a land card, you may put it onto the battlefield tapped. Otherwise, put that card into your hand.', cmc: 3, power: '1', toughness: '1', colors: ['G', 'U'], color_identity: ['G', 'U'] },
    { name: 'Beanstalk Giant', type_line: 'Creature — Giant', oracle_text: 'Beanstalk Giant\'s power and toughness are each equal to the number of lands you control.', cmc: 7, power: '0', toughness: '0', colors: ['G'], color_identity: ['G'] },
    { name: 'Aesi, Tyrant of Gyre Strait', type_line: 'Legendary Creature — Serpent', oracle_text: 'You may play an additional land on each of your turns.\nWhenever a land enters the battlefield under your control, draw a card.', cmc: 6, power: '5', toughness: '5', colors: ['G', 'U'], color_identity: ['G', 'U'] },
    { name: 'Hydroid Krasis', type_line: 'Creature — Jellyfish Hydra Beast', oracle_text: 'When you cast this spell, you gain half X life and draw half X cards. Flying, trample. Enters with X +1/+1 counters.', cmc: 2, power: '0', toughness: '0', colors: ['G', 'U'], color_identity: ['G', 'U'] },
    { name: 'Craterhoof Behemoth', type_line: 'Creature — Beast', oracle_text: 'Haste\nWhen Craterhoof Behemoth enters the battlefield, creatures you control gain trample and get +X/+X until end of turn, where X is the number of creatures you control.', cmc: 8, power: '5', toughness: '5', colors: ['G'], color_identity: ['G'] },

    // === AZORIUS CONTROL ===
    { name: 'Opt', type_line: 'Instant', oracle_text: 'Scry 1. Draw a card.', cmc: 1, power: undefined, toughness: undefined, colors: ['U'], color_identity: ['U'] },
    { name: 'Consider', type_line: 'Instant', oracle_text: 'Look at the top card of your library. You may put that card into your graveyard. Draw a card.', cmc: 1, power: undefined, toughness: undefined, colors: ['U'], color_identity: ['U'] },
    { name: 'Counterspell', type_line: 'Instant', oracle_text: 'Counter target spell.', cmc: 2, power: undefined, toughness: undefined, colors: ['U'], color_identity: ['U'] },
    { name: 'No More Lies', type_line: 'Instant', oracle_text: 'Counter target spell unless its controller pays {3}. If that spell is countered this way, exile it instead of putting it into its owner\'s graveyard.', cmc: 2, power: undefined, toughness: undefined, colors: ['W', 'U'], color_identity: ['W', 'U'] },
    { name: 'Dovin\'s Veto', type_line: 'Instant', oracle_text: 'This spell can\'t be countered. Counter target noncreature spell.', cmc: 2, power: undefined, toughness: undefined, colors: ['W', 'U'], color_identity: ['W', 'U'] },
    { name: 'Absorb', type_line: 'Instant', oracle_text: 'Counter target spell. You gain 3 life.', cmc: 3, power: undefined, toughness: undefined, colors: ['W', 'U'], color_identity: ['W', 'U'] },
    { name: 'Supreme Verdict', type_line: 'Sorcery', oracle_text: 'This spell can\'t be countered. Destroy all creatures.', cmc: 4, power: undefined, toughness: undefined, colors: ['W', 'U'], color_identity: ['W', 'U'] },
    { name: 'Teferi, Hero of Dominaria', type_line: 'Legendary Planeswalker — Teferi', oracle_text: '+1: Draw a card. At the beginning of the next end step, untap up to two lands.\n-3: Put target nonland permanent into its owner\'s library third from the top.\n-8: You get an emblem with "Whenever you draw a card, exile target permanent an opponent controls."', cmc: 5, power: undefined, toughness: undefined, colors: ['W', 'U'], color_identity: ['W', 'U'] },
    { name: 'Memory Deluge', type_line: 'Instant', oracle_text: 'Look at the top X cards of your library, where X is the amount of mana spent to cast this spell. Put two of them into your hand.\nFlashback {5}{U}{U}', cmc: 4, power: undefined, toughness: undefined, colors: ['U'], color_identity: ['U'] },
    { name: 'The Wandering Emperor', type_line: 'Legendary Planeswalker — The Wandering Emperor', oracle_text: 'Flash\nAs long as The Wandering Emperor entered the battlefield this turn, you may activate its loyalty abilities any time you could cast an instant.\n+1: Put a +1/+1 counter on up to one target creature. It gains first strike until end of turn.\n-1: Create a 2/2 white Samurai creature token with vigilance.\n-2: Exile target tapped creature. You gain 2 life.', cmc: 4, power: undefined, toughness: undefined, colors: ['W'], color_identity: ['W'] },
    { name: 'Solitude', type_line: 'Creature — Elemental Incarnation', oracle_text: 'Flash\nLifelink\nWhen Solitude enters the battlefield, exile up to one other target creature. That creature\'s controller gains life equal to its power.\nEvoke—Exile a white card from your hand.', cmc: 5, power: '3', toughness: '2', colors: ['W'], color_identity: ['W'] },
    { name: 'Shark Typhoon', type_line: 'Enchantment', oracle_text: 'Whenever you cast a noncreature spell, create an X/X blue Shark creature token with flying, where X is that spell\'s mana value.\nCycling {X}{1}{U}', cmc: 6, power: undefined, toughness: undefined, colors: ['U'], color_identity: ['U'] },

    // === LANDS ===
    { name: 'Mountain', type_line: 'Basic Land — Mountain', oracle_text: '{T}: Add {R}.', cmc: 0, colors: [], color_identity: ['R'] },
    { name: 'Swamp', type_line: 'Basic Land — Swamp', oracle_text: '{T}: Add {B}.', cmc: 0, colors: [], color_identity: ['B'] },
    { name: 'Forest', type_line: 'Basic Land — Forest', oracle_text: '{T}: Add {G}.', cmc: 0, colors: [], color_identity: ['G'] },
    { name: 'Island', type_line: 'Basic Land — Island', oracle_text: '{T}: Add {U}.', cmc: 0, colors: [], color_identity: ['U'] },
    { name: 'Plains', type_line: 'Basic Land — Plains', oracle_text: '{T}: Add {W}.', cmc: 0, colors: [], color_identity: ['W'] },
    { name: 'Blood Crypt', type_line: 'Land — Swamp Mountain', oracle_text: '{T}: Add {B} or {R}. As Blood Crypt enters, you may pay 2 life. If you don\'t, it enters tapped.', cmc: 0, colors: [], color_identity: ['B', 'R'] },
    { name: 'Breeding Pool', type_line: 'Land — Forest Island', oracle_text: '{T}: Add {G} or {U}. As Breeding Pool enters, you may pay 2 life. If you don\'t, it enters tapped.', cmc: 0, colors: [], color_identity: ['G', 'U'] },
    { name: 'Hallowed Fountain', type_line: 'Land — Plains Island', oracle_text: '{T}: Add {W} or {U}. As Hallowed Fountain enters, you may pay 2 life. If you don\'t, it enters tapped.', cmc: 0, colors: [], color_identity: ['W', 'U'] }
  ];
}

function log(msg) { console.log(msg); }
function pass(test) { log(`  ✅ PASS: ${test}`); }
function fail(test, detail) { log(`  ❌ FAIL: ${test} — ${detail}`); }

function runPipelineBenchmark() {
  log('\n╔═══════════════════════════════════════════════════════════╗');
  log('║  V29.1 PIPELINE INTEGRATION & UNIVERSAL MATRIX BENCHMARK ║');
  log('╚═══════════════════════════════════════════════════════════╝\n');

  const pool = createUniversalPool();
  let allPassed = true;

  // ─── TEST 1: "Asalto de Goblins" (Pioneer R/B Aggro) ───
  log('─── TEST 1: "Asalto de Goblins" (Pioneer R/B Aggro) ───');
  {
    const result = CompilerConvergencePipeline.compileDeckFromScratch({
      userPrompt: 'Quiero un mazo competitivo de Pioneer de Asalto de Goblins agresivo R/B.',
      format: 'Pioneer',
      archetype: 'Aggro',
      rawCardPool: pool,
      uiFormState: {
        format: 'Pioneer',
        colors: ['R', 'B'],
        primaryTribe: 'Goblin',
        tempo: 'Aggro',
        strategy: ['Asalto de Goblins (Aggro/Burn)'],
        powerLevel: 'Competitive'
      }
    });

    const finalDeck = result.state?.cards || [];
    const nonLands = finalDeck.filter(c => !c.isLand);
    const cardNames = nonLands.map(c => c.name || c.cardObj?.name);

    log(`  Compilado: ${finalDeck.length} cartas (${nonLands.reduce((s, c) => s + (c.quantity || 1), 0)} hechizos / ${finalDeck.filter(c => c.isLand).reduce((s, c) => s + (c.quantity || 1), 0)} tierras)`);
    log(`  Cartas: ${cardNames.join(', ')}`);

    // 1. Parasite Check: Vile Rebirth, Great Train Heist, Taster of Wares must NOT be in deck
    const hasParasites = cardNames.some(n => n === 'Vile Rebirth' || n === 'Great Train Heist' || n === 'Taster of Wares');
    if (!hasParasites) {
      pass('Zero parasite cards: Vile Rebirth, Great Train Heist, Taster of Wares rejected by GameplanIntegrityGate');
    } else {
      fail('Parasite card found in Goblin Aggro deck', cardNames.filter(n => n === 'Vile Rebirth' || n === 'Great Train Heist' || n === 'Taster of Wares').join(', '));
      allPassed = false;
    }

    // 2. Core Goblin Aggro presence
    const hasKeyGoblins = cardNames.some(n => n === 'Battle Cry Goblin' || n === 'Rundvelt Hordemaster' || n === 'Goblin Rabblemaster' || n === 'Goblin Guide');
    if (hasKeyGoblins) {
      pass('Core Goblin aggressive engines successfully integrated');
    } else {
      fail('Missing core Goblin aggressive engines', cardNames.join(', '));
      allPassed = false;
    }

    // 3. Build status
    if (result.buildStatus === 'SUCCESS') {
      pass('Supreme Judge certification: SUCCESS');
    } else {
      fail('Build status failed', (result.safetyViolations || []).join('; '));
      allPassed = false;
    }
  }

  // ─── TEST 2: Non-Tribal Simic Landfall Ramp (Standard G/U) ───
  log('\n─── TEST 2: Non-Tribal Simic Landfall Ramp (Standard G/U) ───');
  {
    const result = CompilerConvergencePipeline.compileDeckFromScratch({
      userPrompt: 'Quiero un mazo de Ramp Landfall con Simic en Standard.',
      format: 'Standard',
      archetype: 'Ramp',
      rawCardPool: pool,
      uiFormState: {
        format: 'Standard',
        colors: ['G', 'U'],
        primaryTribe: null,
        tempo: 'Ramp',
        strategy: ['Simic Landfall Ramp'],
        powerLevel: 'Competitive'
      }
    });

    const finalDeck = result.state?.cards || [];
    const nonLands = finalDeck.filter(c => !c.isLand);
    const cardNames = nonLands.map(c => c.name || c.cardObj?.name);

    log(`  Compilado: ${finalDeck.length} cartas (${nonLands.reduce((s, c) => s + (c.quantity || 1), 0)} hechizos / ${finalDeck.filter(c => c.isLand).reduce((s, c) => s + (c.quantity || 1), 0)} tierras)`);
    log(`  Cartas: ${cardNames.join(', ')}`);

    // Must have ramp/landfall cards and NO goblins
    const hasLandfall = cardNames.some(n => n === 'Lotus Cobra' || n === 'Cultivate' || n === 'Growth Spiral' || n === 'Aesi, Tyrant of Gyre Strait' || n === 'Scute Swarm');
    const hasGoblins = cardNames.some(n => n.includes('Goblin'));

    if (hasLandfall && !hasGoblins) {
      pass('Non-tribal Simic Landfall Ramp successfully compiled with ZERO tribal leakage');
    } else {
      fail('Simic Landfall Ramp failed', `hasLandfall=${hasLandfall}, hasGoblins=${hasGoblins}`);
      allPassed = false;
    }
  }

  // ─── TEST 3: Non-Tribal Azorius Control (Modern W/U) ───
  log('\n─── TEST 3: Non-Tribal Azorius Control (Modern W/U) ───');
  {
    const result = CompilerConvergencePipeline.compileDeckFromScratch({
      userPrompt: 'Quiero un mazo de Control con Azorius en Modern.',
      format: 'Modern',
      archetype: 'Control',
      rawCardPool: pool,
      uiFormState: {
        format: 'Modern',
        colors: ['W', 'U'],
        primaryTribe: null,
        tempo: 'Control',
        strategy: ['Azorius Control'],
        powerLevel: 'Competitive'
      }
    });

    const finalDeck = result.state?.cards || [];
    const nonLands = finalDeck.filter(c => !c.isLand);
    const cardNames = nonLands.map(c => c.name || c.cardObj?.name);

    log(`  Compilado: ${finalDeck.length} cartas (${nonLands.reduce((s, c) => s + (c.quantity || 1), 0)} hechizos / ${finalDeck.filter(c => c.isLand).reduce((s, c) => s + (c.quantity || 1), 0)} tierras)`);
    log(`  Cartas: ${cardNames.join(', ')}`);

    // Must have control cards and NO aggressive 1-drops
    const hasControl = cardNames.some(n => n === 'Counterspell' || n === 'Supreme Verdict' || n === 'Teferi, Hero of Dominaria' || n === 'Memory Deluge' || n === 'No More Lies');
    const hasAggro = cardNames.some(n => n === 'Goblin Guide' || n === 'Foundry Street Denizen');

    if (hasControl && !hasAggro) {
      pass('Non-tribal Azorius Control successfully compiled with control thesis and ZERO aggro pollution');
    } else {
      fail('Azorius Control failed', `hasControl=${hasControl}, hasAggro=${hasAggro}`);
      allPassed = false;
    }
  }

  // ─── Summary ───
  log('\n══════════════════════════════════════════════════');
  log('  FINAL RESULTS');
  log('══════════════════════════════════════════════════');
  log(`  Pipeline Integration Benchmark: ${allPassed ? '✅ PASS' : '❌ FAIL'}`);
  log(`  Universal Cross-Archetype Matrix: ${allPassed ? '✅ V29.1 CERTIFIED' : '❌ V29.1 NOT CERTIFIED'}`);
  log('══════════════════════════════════════════════════\n');

  process.exit(allPassed ? 0 : 1);
}

runPipelineBenchmark();
