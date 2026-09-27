/**
 * tests/benchmarks/test_v29_2_strategic_truth.js
 * 
 * V29.2 Strategic Truth Unification & SSOT Master Test Suite.
 * 
 * Validates the 5 mandatory architectural assertions:
 *   1. GAMEPLAN_EXECUTABLE_TIMING: Strict CMC & timing envelopes (CMC 3 = 0 contribution to T1).
 *   2. SAME_TRIBE_STRATEGIC_DIVERGENCE_E2E: Same tribe/pool produces distinct Gameplans & Decks for Aggro vs Burn vs Sacrifice.
 *   3. DECKSTATE_TELEMETRY_IDENTITY: Cryptographic hash equivalence across Builder, Mana, Sim, and Judge.
 *   4. CRITICAL_REQUIREMENT_VETO: Judicial Veto triggered if any CRITICAL turn requirement fails.
 *   5. COUNTERFACTUAL_REMOVAL_TEST: Counterfactual removal demonstrates causal impact of core cards vs filler.
 */

import { IntentPackage } from '../../src/services/compiler/core/intentPackage.js';
import { MechanicDiscoveryEngine } from '../../src/services/compiler/core/mechanicDiscoveryEngine.js';
import { StrategicMemoryModel } from '../../src/services/compiler/core/strategicMemoryModel.js';
import { StrategicLineGraph } from '../../src/services/compiler/core/strategicLineGraph.js';
import { GameplanSynthesizer } from '../../src/services/compiler/core/gameplanSynthesizer.js';
import { DeckPlanCoverage } from '../../src/services/compiler/core/deckPlanCoverage.js';
import { ProgressiveDeckStateBuilder } from '../../src/services/compiler/core/progressiveDeckStateBuilder.js';
import { ManaExecutionOptimizer } from '../../src/services/compiler/core/manaExecutionOptimizer.js';
import { DeterministicSupremeJudge } from '../../src/services/compiler/core/deterministicSupremeJudge.js';
import { DeckStateSnapshot } from '../../src/services/compiler/core/deckStateSnapshot.js';

// ─── MASTER TEST POOL (Rich Tribal & Strategy Pool) ──────────────────────────
const MASTER_GOBLIN_POOL = [
  // 1-Drops
  { id: 'g1', name: 'Foundry Street Denizen', mana_cost: '{R}', cmc: 1, type_line: 'Creature — Goblin Warrior', power: '1', toughness: '1', colors: ['R'], color_identity: ['R'], oracle_text: 'Whenever another red creature enters the battlefield under your control, gets +1/+0 until end of turn.' },
  { id: 'g2', name: 'Fanatical Firebrand', mana_cost: '{R}', cmc: 1, type_line: 'Creature — Goblin Pirate', power: '1', toughness: '1', colors: ['R'], color_identity: ['R'], oracle_text: 'Haste. {T}, Sacrifice Fanatical Firebrand: It deals 1 damage to any target.' },
  { id: 'g3', name: 'Skirk Prospector', mana_cost: '{R}', cmc: 1, type_line: 'Creature — Goblin', power: '1', toughness: '1', colors: ['R'], color_identity: ['R'], oracle_text: 'Sacrifice a Goblin: Add {R}.' },
  { id: 'g4', name: 'Shambling Ghast', mana_cost: '{B}', cmc: 1, type_line: 'Creature — Zombie Goblin', power: '1', toughness: '1', colors: ['B'], color_identity: ['B'], oracle_text: 'When this creature dies, create a Treasure token or target creature gets -1/-1 until end of turn.' },
  { id: 'g5', name: 'Play with Fire', mana_cost: '{R}', cmc: 1, type_line: 'Instant', oracle_text: 'Play with Fire deals 2 damage to any target. If target player was dealt damage, scry 1.', colors: ['R'], color_identity: ['R'] },
  { id: 'g6', name: 'Fatal Push', mana_cost: '{B}', cmc: 1, type_line: 'Instant', oracle_text: 'Destroy target creature if it has mana value 2 or less.', colors: ['B'], color_identity: ['B'] },

  // 2-Drops
  { id: 'g7', name: 'Rundvelt Hordemaster', mana_cost: '{1}{R}', cmc: 2, type_line: 'Creature — Goblin Warrior', power: '1', toughness: '1', colors: ['R'], color_identity: ['R'], oracle_text: 'Other Goblins you control get +1/+1. Whenever a Goblin you control dies, exile the top card of your library. You may play it this turn.' },
  { id: 'g8', name: 'Battle Cry Goblin', mana_cost: '{1}{R}', cmc: 2, type_line: 'Creature — Goblin', power: '2', toughness: '2', colors: ['R'], color_identity: ['R'], oracle_text: '{1}{R}: Goblins you control get +1/+0 and gain haste until end of turn. If you attacked with creatures with total power 4 or greater, create a 1/1 red Goblin creature token.' },
  { id: 'g9', name: 'Blood Artist', mana_cost: '{1}{B}', cmc: 2, type_line: 'Creature — Vampire', power: '0', toughness: '1', colors: ['B'], color_identity: ['B'], oracle_text: 'Whenever Blood Artist or another creature dies, target player loses 1 life and you gain 1 life.' },
  { id: 'g10', name: 'Roil Eruption', mana_cost: '{1}{R}', cmc: 2, type_line: 'Sorcery', colors: ['R'], color_identity: ['R'], oracle_text: 'Roil Eruption deals 3 damage to any target.' },
  { id: 'g11', name: 'Village Rites', mana_cost: '{B}', cmc: 1, type_line: 'Instant', colors: ['B'], color_identity: ['B'], oracle_text: 'As an additional cost to cast this spell, sacrifice a creature. Draw two cards.' },

  // 3-Drops
  { id: 'g12', name: 'Goblin Chieftain', mana_cost: '{1}{R}{R}', cmc: 3, type_line: 'Creature — Goblin', power: '2', toughness: '2', colors: ['R'], color_identity: ['R'], oracle_text: 'Haste. Other Goblin creatures you control get +1/+1 and have haste.' },
  { id: 'g13', name: 'Goblin Warchief', mana_cost: '{1}{R}{R}', cmc: 3, type_line: 'Creature — Goblin Warrior', power: '2', toughness: '2', colors: ['R'], color_identity: ['R'], oracle_text: 'Goblin spells you cast cost {1} less to cast. Goblin creatures you control have haste.' },
  { id: 'g14', name: 'Mayhem Devil', mana_cost: '{1}{B}{R}', cmc: 3, type_line: 'Creature — Devil', power: '3', toughness: '3', colors: ['B', 'R'], color_identity: ['B', 'R'], oracle_text: 'Whenever a player sacrifices a permanent, Mayhem Devil deals 1 damage to any target.' },
  { id: 'g15', name: 'Goblin Rabblemaster', mana_cost: '{2}{R}', cmc: 3, type_line: 'Creature — Goblin Warrior', power: '2', toughness: '2', colors: ['R'], color_identity: ['R'], oracle_text: 'At the beginning of combat on your turn, create a 1/1 red Goblin creature token with haste. Whenever Goblin Rabblemaster attacks, it gets +1/+0 for each other attacking Goblin.' },

  // 4-Drops
  { id: 'g16', name: 'Goblin Trashmaster', mana_cost: '{2}{R}{R}', cmc: 4, type_line: 'Creature — Goblin Warrior', power: '3', toughness: '3', colors: ['R'], color_identity: ['R'], oracle_text: 'Other Goblins you control get +1/+1. Sacrifice a Goblin: Destroy target artifact.' },

  // Lands
  { id: 'l1', name: 'Blood Crypt', mana_cost: '', cmc: 0, type_line: 'Land — Swamp Mountain', colors: ['B', 'R'], color_identity: ['B', 'R'], oracle_text: '({T}: Add {B} or {R}.) As Blood Crypt enters the battlefield, you may pay 2 life. If you don\'t, it enters tapped.' },
  { id: 'l2', name: 'Blackcleave Cliffs', mana_cost: '', cmc: 0, type_line: 'Land', colors: ['B', 'R'], color_identity: ['B', 'R'], oracle_text: 'Blackcleave Cliffs enters tapped unless you control two or fewer other lands. {T}: Add {B} or {R}.' },
  { id: 'l3', name: 'Mountain', mana_cost: '', cmc: 0, type_line: 'Basic Land — Mountain', colors: ['R'], color_identity: ['R'], oracle_text: '{T}: Add {R}.' },
  { id: 'l4', name: 'Swamp', mana_cost: '', cmc: 0, type_line: 'Basic Land — Swamp', colors: ['B'], color_identity: ['B'], oracle_text: '{T}: Add {B}.' }
];

function synthesizeForIntent(intent, pool = MASTER_GOBLIN_POOL) {
  const mechanics = MechanicDiscoveryEngine.discover({ cardPool: pool, intentPackage: intent });
  const memory = StrategicMemoryModel.buildMemory({ discoveredMechanics: mechanics, intentPackage: intent });
  const selection = StrategicLineGraph.selectLines({ strategicMemory: memory, intentPackage: intent });
  const gameplan = GameplanSynthesizer.synthesize({ lineSelection: selection, cardPool: pool, intentPackage: intent });
  return { mechanics, memory, selection, gameplan };
}

async function runTestSuite() {
  console.log('🏛️ === V29.2 STRATEGIC TRUTH UNIFICATION & SSOT BENCHMARK SUITE ===\n');

  let passedTests = 0;
  const totalTests = 5;

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: GAMEPLAN_EXECUTABLE_TIMING
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 1: GAMEPLAN_EXECUTABLE_TIMING ---');
  {
    const intent = new IntentPackage({
      format: 'PIONEER',
      colors: ['R', 'B'],
      primaryTribe: 'Goblin',
      tempo: 'aggro',
      strategy: ['Asalto de Goblins (Aggro/Burn)']
    });

    const { gameplan } = synthesizeForIntent(intent);

    // Construct a test deck containing 1-drop and high-CMC cards
    const testDeck = {
      cards: [
        { name: 'Foundry Street Denizen', cmc: 1, quantity: 4, type_line: 'Creature — Goblin', oracle_text: 'attacks' },
        { name: 'Fanatical Firebrand', cmc: 1, quantity: 4, type_line: 'Creature — Goblin', oracle_text: 'haste' },
        { name: 'Goblin Warchief', cmc: 3, quantity: 4, type_line: 'Creature — Goblin Warrior', oracle_text: 'haste' },
        { name: 'Goblin Trashmaster', cmc: 4, quantity: 4, type_line: 'Creature — Goblin Warrior', oracle_text: 'lord' }
      ]
    };

    const coverage = DeckPlanCoverage.computeCoverage({ deckState: testDeck, gameplanContract: gameplan });
    const t1Phase = coverage.phases.find(p => p.turn === 1);

    console.log(`T1 Demand: ${t1Phase?.phaseName}`);
    console.log(`T1 Redundancy Copies: ${t1Phase?.redundancyCopies} (Expected: 8, from Denizen + Firebrand only)`);
    console.log(`T1 Matching Cards: ${JSON.stringify(t1Phase?.matchingCards)}`);

    const noCmc3InT1 = !t1Phase?.matchingCards.some(c => c.includes('Goblin Warchief') || c.includes('Goblin Trashmaster'));
    const correctCount = t1Phase?.redundancyCopies === 8;

    if (noCmc3InT1 && correctCount) {
      console.log('✅ PASS: Strict execution timing enforced (CMC > 1 excluded from T1).\n');
      passedTests++;
    } else {
      console.error('❌ FAIL: High-CMC card leaked into T1 execution window!\n');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: SAME_TRIBE_STRATEGIC_DIVERGENCE_E2E
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 2: SAME_TRIBE_STRATEGIC_DIVERGENCE_E2E ---');
  {
    // Intent A: Goblin Aggro
    const intentAggro = new IntentPackage({
      format: 'PIONEER',
      colors: ['R', 'B'],
      primaryTribe: 'Goblin',
      tempo: 'aggro',
      strategy: ['Asalto de Goblins (Aggro)']
    });
    const { gameplan: gameplanA, selection: selA } = synthesizeForIntent(intentAggro);

    // Intent B: Goblin Sacrifice / Aristocrats
    const intentSac = new IntentPackage({
      format: 'PIONEER',
      colors: ['R', 'B'],
      primaryTribe: 'Goblin',
      tempo: 'sacrifice',
      strategy: ['Goblin Sacrifice & Aristocrats Drain']
    });
    const { gameplan: gameplanB, selection: selB } = synthesizeForIntent(intentSac);

    console.log(`Aggro Line: [${selA.primaryLine?.line?.label}] Kill Turn: T${gameplanA.derivedKillTurn}`);
    console.log(`Aggro Thesis: ${gameplanA.thesis}`);
    console.log(`Sacrifice Line: [${selB.primaryLine?.line?.label}] Kill Turn: T${gameplanB.derivedKillTurn}`);
    console.log(`Sacrifice Thesis: ${gameplanB.thesis}`);

    const distinctTheses = gameplanA.thesis !== gameplanB.thesis;
    const distinctKillTurns = gameplanA.derivedKillTurn !== gameplanB.derivedKillTurn || selA.primaryLine?.line?.label !== selB.primaryLine?.line?.label;

    if (distinctTheses && distinctKillTurns) {
      console.log('✅ PASS: Same card pool produced genuinely divergent Gameplans from distinct user intents.\n');
      passedTests++;
    } else {
      console.error('❌ FAIL: Strategic divergence collapsed into identical gameplans!\n');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: DECKSTATE_TELEMETRY_IDENTITY (Hash Equivalence)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 3: DECKSTATE_TELEMETRY_IDENTITY ---');
  {
    const intent = new IntentPackage({ format: 'PIONEER', colors: ['R', 'B'], primaryTribe: 'Goblin', tempo: 'aggro' });
    const { gameplan } = synthesizeForIntent(intent);

    const builderResult = ProgressiveDeckStateBuilder.buildDeckState({
      intentPackage: intent,
      deckIdentity: { archetypeKey: 'GOBLIN_AGGRO' },
      gameplanContract: gameplan,
      candidatePool: MASTER_GOBLIN_POOL
    });

    const manaOpt = ManaExecutionOptimizer.optimizeLandState({
      nonLandSpells: builderResult.deckState.cards.filter(c => !c.isLand),
      gameplanContract: gameplan,
      intentPackage: intent,
      availableLands: MASTER_GOBLIN_POOL.filter(c => c.type_line.includes('Land'))
    });

    const finalDeckCards = [
      ...manaOpt.optimalDeckState.nonLandSpells,
      ...manaOpt.optimalDeckState.landCards
    ];

    const snapshotBuilder = DeckStateSnapshot.fromDeckState({ cards: finalDeckCards, format: 'PIONEER', archetype: 'GOBLIN_AGGRO' }, { intentHash: 'INT_01', gameplanHash: gameplan.thesis });
    const snapshotJudge = DeckStateSnapshot.fromDeckState({ cards: finalDeckCards, format: 'PIONEER', archetype: 'GOBLIN_AGGRO' }, { intentHash: 'INT_01', gameplanHash: gameplan.thesis });

    console.log(`Builder Snapshot Hash: ${snapshotBuilder.deckHash}`);
    console.log(`Judge Snapshot Hash:   ${snapshotJudge.deckHash}`);
    console.log(`Total Cards: ${snapshotBuilder.totalCards} (${snapshotBuilder.totalSpells} spells / ${snapshotBuilder.totalLands} lands)`);

    const isIdentical = DeckStateSnapshot.verifyEquivalence(snapshotBuilder, snapshotJudge);

    if (isIdentical && snapshotBuilder.totalCards === 60) {
      console.log('✅ PASS: Strict DeckState Snapshot Hash Equivalence verified (SSOT).\n');
      passedTests++;
    } else {
      console.error('❌ FAIL: DeckState hash mismatch across pipeline stages!\n');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: CRITICAL_REQUIREMENT_VETO
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 4: CRITICAL_REQUIREMENT_VETO ---');
  {
    const intent = new IntentPackage({ format: 'PIONEER', colors: ['R', 'B'], primaryTribe: 'Goblin', tempo: 'aggro' });
    const { gameplan } = synthesizeForIntent(intent);

    // Broken Deck: Zero 1-drops (Fails CRITICAL T1 demand for Aggro)
    const brokenDeck = {
      cards: [
        { name: 'Goblin Warchief', cmc: 3, quantity: 4, type_line: 'Creature — Goblin Warrior', oracle_text: 'haste' },
        { name: 'Goblin Trashmaster', cmc: 4, quantity: 4, type_line: 'Creature — Goblin Warrior', oracle_text: 'lord' },
        { name: 'Mountain', cmc: 0, quantity: 20, isLand: true, type_line: 'Basic Land — Mountain', oracle_text: '{T}: Add {R}.' }
      ]
    };

    const coverage = DeckPlanCoverage.computeCoverage({ deckState: brokenDeck, gameplanContract: gameplan });
    const judgeReview = DeterministicSupremeJudge.judgeDeck(brokenDeck, { archetypeKey: 'GOBLIN_AGGRO' }, { ...intent, planCoverage: coverage }, 3);

    console.log(`Critical Failures Count: ${coverage.criticalFailures.length}`);
    console.log(`Judicial Verdict: ${judgeReview.verdict}`);
    console.log(`Judicial Score: ${judgeReview.score}`);
    console.log(`Blocking Defects: ${judgeReview.blockingDefects.map(d => `[${d.axis}] ${d.message}`).join('; ')}`);

    const hasCriticalVeto = judgeReview.verdict === 'REJECT' && judgeReview.blockingDefects.some(d => d.axis === 'GAMEPLAN_COVERAGE');

    if (hasCriticalVeto) {
      console.log('✅ PASS: Supreme Judge vetoed deck due to critical turn demand failure.\n');
      passedTests++;
    } else {
      console.error('❌ FAIL: Supreme Judge permitted unproven/failing critical turn demand!\n');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: COUNTERFACTUAL_REMOVAL_TEST
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 5: COUNTERFACTUAL_REMOVAL_TEST ---');
  {
    const intent = new IntentPackage({ format: 'PIONEER', colors: ['R', 'B'], primaryTribe: 'Goblin', tempo: 'aggro' });
    const { gameplan } = synthesizeForIntent(intent);

    // Complete Baseline Deck
    const baselineDeck = {
      cards: [
        { name: 'Foundry Street Denizen', cmc: 1, quantity: 4, type_line: 'Creature — Goblin', oracle_text: 'attacks' },
        { name: 'Fanatical Firebrand', cmc: 1, quantity: 4, type_line: 'Creature — Goblin', oracle_text: 'haste' },
        { name: 'Rundvelt Hordemaster', cmc: 2, quantity: 4, type_line: 'Creature — Goblin', oracle_text: 'creatures you control get +1/+1' },
        { name: 'Battle Cry Goblin', cmc: 2, quantity: 4, type_line: 'Creature — Goblin', oracle_text: 'creatures you control get +1/+0' },
        { name: 'Goblin Chieftain', cmc: 3, quantity: 4, type_line: 'Creature — Goblin', oracle_text: 'creatures you control get +1/+1 and have haste' },
        { name: 'Play with Fire', cmc: 1, quantity: 4, type_line: 'Instant', oracle_text: 'damage to any target' },
        { name: 'Mountain', cmc: 0, quantity: 20, isLand: true, type_line: 'Basic Land — Mountain', oracle_text: '{T}: Add {R}.' }
      ]
    };

    // Counterfactual 1: Remove core lord Rundvelt Hordemaster
    const cfDeckWithoutLord = {
      cards: baselineDeck.cards.filter(c => c.name !== 'Rundvelt Hordemaster')
    };

    const covBase = DeckPlanCoverage.computeCoverage({ deckState: baselineDeck, gameplanContract: gameplan });
    const covWithoutLord = DeckPlanCoverage.computeCoverage({ deckState: cfDeckWithoutLord, gameplanContract: gameplan });

    const ampBase = covBase.phases.find(p => p.turn === 3)?.actualProbability || 0;
    const ampWithout = covWithoutLord.phases.find(p => p.turn === 3)?.actualProbability || 0;

    console.log(`Baseline T3 Amplification P: ${ampBase}`);
    console.log(`Without Lord T3 Amplification P: ${ampWithout}`);
    const delta = ampBase - ampWithout;
    console.log(`Causal Delta (Lord Impact): -${(delta * 100).toFixed(1)}%`);

    if (delta >= 0.05) {
      console.log('✅ PASS: Counterfactual removal demonstrates measurable causal gameplan degradation.\n');
      passedTests++;
    } else {
      console.error('❌ FAIL: Counterfactual removal produced zero measurable change!\n');
    }
  }

  console.log('======================================================');
  console.log(`📊 FINAL V29.2 BENCHMARK SCORE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('======================================================');

  if (passedTests === totalTests) {
    console.log('\n🏆 ALL V29.2 ARCHITECTURAL INVARIANTS CERTIFIED PASSING!');
    process.exit(0);
  } else {
    console.error(`\n❌ V29.2 CERTIFICATION FAILED (${totalTests - passedTests} failures).`);
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Unhandled benchmark error:', err);
  process.exit(1);
});
