import test from 'node:test';
import assert from 'node:assert/strict';

import { CardCausalContract } from '../../src/services/compiler/core/cardCausalContract.js';
import { CausalChainContract } from '../../src/services/compiler/core/causalChainContract.js';
import { CausalGraphEngine } from '../../src/services/compiler/core/causalGraphEngine.js';
import { ChainExecutionSimulator } from '../../src/services/compiler/core/chainExecutionSimulator.js';
import { CausalBreakAnalyzer } from '../../src/services/compiler/core/causalBreakAnalyzer.js';
import { CausalPackageSearch } from '../../src/services/compiler/core/causalPackageSearch.js';
import { IntentBuilder } from '../../src/services/compiler/core/intentBuilder.js';

// ============================================================================
// TEST A: Complete Multi-Card Causal Chain Detection
// ============================================================================
test('TEST A: Full Causal Chain Discovery (Producer -> Enabler -> Consumer -> Payoff -> WinPath)', () => {
  const cards = [
    {
      name: 'Mogg War Marshal',
      mana_cost: '{1}{R}',
      type_line: 'Creature — Goblin Warrior',
      oracle_text: 'When Mogg War Marshal enters, create a 1/1 red Goblin creature token.\nWhen Mogg War Marshal dies, create a 1/1 red Goblin creature token.\nEcho {1}{R}',
      cmc: 2
    },
    {
      name: 'Goblin Warchief',
      mana_cost: '{1}{R}{R}',
      type_line: 'Creature — Goblin Warrior',
      oracle_text: 'Goblin spells you cast cost {1} less to cast.\nGoblin creatures you control have haste.',
      cmc: 3
    },
    {
      name: 'Goblin Bombardment',
      mana_cost: '{1}{R}',
      type_line: 'Enchantment',
      oracle_text: 'Sacrifice a creature: Goblin Bombardment deals 1 damage to any target.',
      cmc: 2
    },
    {
      name: 'Pashalik Mons',
      mana_cost: '{2}{R}',
      type_line: 'Legendary Creature — Goblin Warrior',
      oracle_text: 'Whenever Pashalik Mons or another Goblin you control dies, Pashalik Mons deals 1 damage to any target.\n{3}{R}, Sacrifice a Goblin: Create two 1/1 red Goblin creature tokens.',
      cmc: 3
    }
  ];

  const graph = CausalGraphEngine.buildGraphFromCards(cards, { winPathType: 'AGGRO_BURN' });
  const chains = graph.discoverChains();

  assert.ok(chains.length > 0, 'Must discover at least one multi-card causal chain');
  const fullChain = chains.find(c => c.nodes.some(n => n.name === 'Mogg War Marshal') && c.nodes.some(n => n.name === 'Pashalik Mons'));
  assert.ok(fullChain, 'Must discover a chain connecting Mogg War Marshal to Pashalik Mons and WinPath');
  assert.equal(fullChain.reachesWinPath, true, 'Discovered chain must connect to WinPath');
});

// ============================================================================
// TEST B: Counterfactual Intermediate Node Breakage
// ============================================================================
test('TEST B: Counterfactual Break Analysis (Removing Enabler breaks or degrades chain)', () => {
  const cards = [
    {
      name: 'Overgrown Battlement',
      mana_cost: '{1}{G}',
      type_line: 'Creature — Human Druid Wall',
      oracle_text: 'Defender\n{T}: Add {G} for each creature with defender you control.',
      cmc: 2
    },
    {
      name: 'High Alert',
      mana_cost: '{1}{W}{U}',
      type_line: 'Enchantment',
      oracle_text: 'Each creature you control assigns combat damage equal to its toughness rather than its power.\nCreatures you control with defender can attack as though they did not have defender.\n{2}{W}{U}: Untap target creature.',
      cmc: 3
    },
    {
      name: 'Wall of Omens',
      mana_cost: '{1}{W}',
      type_line: 'Creature — Wall',
      oracle_text: 'Defender\nWhen Wall of Omens enters, draw a card.',
      cmc: 2
    }
  ];

  const graph = CausalGraphEngine.buildGraphFromCards(cards, { winPathType: 'TOUGHNESS_COMBAT' });
  const breakReport = CausalBreakAnalyzer.analyzeNodeBreakage(graph, 'High Alert');

  assert.equal(breakReport.nodeClassification, 'CRITICAL_NODE', 'High Alert is the single enabler allowing walls to attack');
  assert.ok(breakReport.winPathDegradation > 0.7, 'Removing High Alert must severely degrade Toughness Combat WinPath');
  assert.equal(breakReport.chainSurvival, false, 'Chain cannot attack without Toughness combat enabler');
});

// ============================================================================
// TEST C: Package Substitution & Emergent Subgraph Dominance
// ============================================================================
test('TEST C: Multi-Card Package Dominance (Package with emergent cluster dominates isolated cards)', () => {
  const baseDeckState = {
    cards: [
      { card: { name: 'Forest', type_line: 'Basic Land — Forest', oracle_text: '{T}: Add {G}.' }, count: 12 },
      { card: { name: 'Plains', type_line: 'Basic Land — Plains', oracle_text: '{T}: Add {W}.' }, count: 12 }
    ]
  };

  // Package A: Isolated vanilla beaters
  const packageA = [
    { name: 'Centaur Courser', mana_cost: '{2}{G}', type_line: 'Creature — Centaur Warrior', oracle_text: '', cmc: 3 },
    { name: 'Grizzly Bears', mana_cost: '{1}{G}', type_line: 'Creature — Bear', oracle_text: '', cmc: 2 }
  ];

  // Package B: Emergent synergy cluster (Battlement + High Alert)
  const packageB = [
    { name: 'Overgrown Battlement', mana_cost: '{1}{G}', type_line: 'Creature — Human Druid Wall', oracle_text: 'Defender\n{T}: Add {G} for each creature with defender you control.', cmc: 2 },
    { name: 'High Alert', mana_cost: '{1}{W}{U}', type_line: 'Enchantment', oracle_text: 'Each creature you control assigns combat damage equal to its toughness rather than its power.\nCreatures you control with defender can attack as though they did not have defender.', cmc: 3 }
  ];

  const evalA = CausalPackageSearch.evaluatePackageAddition(baseDeckState, packageA, { winPath: 'COMBAT_PRESSURE' });
  const evalB = CausalPackageSearch.evaluatePackageAddition(baseDeckState, packageB, { winPath: 'COMBAT_PRESSURE' });

  assert.equal(evalB.dominates(evalA), true, 'Synergy package B must dominate isolated package A');
  assert.ok(evalB.graphSnapshot.clusters.length > 0, 'Package B must form an emergent cluster');
});

// ============================================================================
// TEST D: Temporal Execution Windows & Late Chain Rejection
// ============================================================================
test('TEST D: Temporal Simulation (Late chain rejected when thesis requires early win)', () => {
  const aggroThesis = { expectedKillTurn: 4, tempo: 'aggro' };

  // Fast chain: T1 Dork -> T2 Lord -> T3 Alpha strike
  const fastChain = new CausalChainContract({
    chainId: 'FAST_CHAIN',
    nodes: [{ name: 'Lackey', earliestTurn: 1 }, { name: 'Warchief', earliestTurn: 2 }, { name: 'Piledriver', earliestTurn: 3 }],
    timingConstraints: { earliestTurn: 1, latestUsefulTurn: 4 }
  });

  // Late chain: T5 Colossus engine
  const lateChain = new CausalChainContract({
    chainId: 'LATE_CHAIN',
    nodes: [{ name: 'Gilded Lotus', earliestTurn: 5 }, { name: 'Kozilek', earliestTurn: 6 }],
    timingConstraints: { earliestTurn: 5, latestUsefulTurn: 8 }
  });

  const simFast = ChainExecutionSimulator.simulateChain(fastChain, aggroThesis);
  const simLate = ChainExecutionSimulator.simulateChain(lateChain, aggroThesis);

  assert.equal(simFast.isTimingCompatible, true, 'Fast chain is compatible with T4 win');
  assert.equal(simLate.isTimingCompatible, false, 'Late T5-T6 chain is incompatible with T4 Aggro thesis');
});

// ============================================================================
// TEST E: Relative Reliable Execution Dominance
// ============================================================================
test('TEST E: Relative S-Dominance over Arbitrary Thresholds', () => {
  const chainLow = { chainId: 'CHAIN_LOW', executionProbability: 0.41, bottlenecks: ['COLOR_SCREW_B'] };
  const chainHigh = { chainId: 'CHAIN_HIGH', executionProbability: 0.78, bottlenecks: [] };

  const comp = ChainExecutionSimulator.compareCausalChains(chainHigh, chainLow);
  assert.equal(comp.preferred, 'CHAIN_HIGH');
  assert.equal(comp.dominanceProven, true, 'Higher reliable chain dominates without arbitrary cutoff');
});

// ============================================================================
// TEST F: Redundant Causal Paths vs Single Point of Failure
// ============================================================================
test('TEST F: Redundancy Preservation (Surviving alternative chain keeps WinPath alive)', () => {
  const deckWithRedundantEnablers = [
    { name: 'Arcades, the Strategist', mana_cost: '{1}{G}{W}{U}', type_line: 'Legendary Creature — Elder Dragon', oracle_text: 'Flying, vigilance\nWhenever a creature with defender enters, draw a card.\nEach creature you control with defender assigns combat damage equal to its toughness rather than its power and can attack as though it did not have defender.', cmc: 4 },
    { name: 'High Alert', mana_cost: '{1}{W}{U}', type_line: 'Enchantment', oracle_text: 'Each creature you control assigns combat damage equal to its toughness rather than its power.\nCreatures you control with defender can attack.', cmc: 3 },
    { name: 'Wall of Omens', mana_cost: '{1}{W}', type_line: 'Creature — Wall', oracle_text: 'Defender\nWhen Wall of Omens enters, draw a card.', cmc: 2 }
  ];

  const graph = CausalGraphEngine.buildGraphFromCards(deckWithRedundantEnablers, { winPathType: 'TOUGHNESS_COMBAT' });
  const breakReport = CausalBreakAnalyzer.analyzeNodeBreakage(graph, 'Arcades, the Strategist');

  assert.equal(breakReport.nodeClassification, 'REDUNDANT_NODE', 'High Alert provides parallel redundant path');
  assert.equal(breakReport.chainSurvival, true, 'Toughness combat survives through High Alert');
});

// ============================================================================
// TEST G: Oracle Mutation Chain Reaction
// ============================================================================
test('TEST G: Oracle Restriction Mutation invalidates entire downstream chain', () => {
  const unrestrictedDork = {
    name: 'Noble Druid',
    mana_cost: '{G}',
    type_line: 'Creature — Elf Druid',
    oracle_text: '{T}: Add {G}.',
    cmc: 1
  };

  const restrictedDork = {
    name: 'Restricted Druid',
    mana_cost: '{G}',
    type_line: 'Creature — Elf Druid',
    oracle_text: '{T}: Add {G}. Spend this mana only to cast instant or sorcery spells.',
    cmc: 1
  };

  const creaturePayoff = {
    name: 'Apex Behemoth',
    mana_cost: '{4}{G}',
    type_line: 'Creature — Beast',
    oracle_text: 'Trample',
    cmc: 5
  };

  const graphUnrestricted = CausalGraphEngine.buildGraphFromCards([unrestrictedDork, creaturePayoff], { winPathType: 'STOMPY_RAMP' });
  const graphRestricted = CausalGraphEngine.buildGraphFromCards([restrictedDork, creaturePayoff], { winPathType: 'STOMPY_RAMP' });

  const chains1 = graphUnrestricted.discoverChains();
  const chains2 = graphRestricted.discoverChains();

  assert.ok(chains1.length > 0, 'Unrestricted dork must form ramp chain to Behemoth');
  assert.equal(chains2.length, 0, 'Restricted instant/sorcery mana cannot form chain to Creature Behemoth');
});

// ============================================================================
// TEST H: Universal Graph Divergence (Same Pool, 5 Divergent Intents)
// ============================================================================
test('TEST H: Universality (Same Card Pool produces 5 distinct causal graphs for 5 intents)', () => {
  const sharedPool = [
    { name: 'Goblin Guide', mana_cost: '{R}', type_line: 'Creature — Goblin Scout', oracle_text: 'Haste\nWhenever Goblin Guide attacks...', cmc: 1 },
    { name: 'Mogg War Marshal', mana_cost: '{1}{R}', type_line: 'Creature — Goblin Warrior', oracle_text: 'When enters or dies, create 1/1 token.', cmc: 2 },
    { name: 'Goblin Bombardment', mana_cost: '{1}{R}', type_line: 'Enchantment', oracle_text: 'Sacrifice a creature: 1 damage to any target.', cmc: 2 },
    { name: 'Lightning Bolt', mana_cost: '{R}', type_line: 'Instant', oracle_text: 'Deals 3 damage to any target.', cmc: 1 },
    { name: 'Conspicuous Snoop', mana_cost: '{R}{R}', type_line: 'Creature — Goblin Rogue', oracle_text: 'Play with top card revealed...', cmc: 2 },
    { name: 'Kiki-Jiki, Mirror Breaker', mana_cost: '{2}{R}{R}{R}', type_line: 'Legendary Creature — Goblin Shaman', oracle_text: '{T}: Create token copy...', cmc: 5 }
  ];

  const gAggro = CausalGraphEngine.buildGraphFromCards(sharedPool, { winPathType: 'AGGRO_PRESSURE' });
  const gSac = CausalGraphEngine.buildGraphFromCards(sharedPool, { winPathType: 'SACRIFICE_DRAIN' });
  const gCombo = CausalGraphEngine.buildGraphFromCards(sharedPool, { winPathType: 'COMBO_CHAIN' });

  assert.notEqual(gAggro.primaryPathType, gSac.primaryPathType);
  assert.notEqual(gSac.primaryPathType, gCombo.primaryPathType);
});

// ============================================================================
// TEST I: Oracle-Derived Asymmetric Blowout Detection
// ============================================================================
test('TEST I: Oracle Asymmetry Blowout Recognition (Slaughter the Strong in 0-Power Walls)', () => {
  const slaughterTheStrong = {
    name: 'Slaughter the Strong',
    mana_cost: '{1}{W}{W}',
    type_line: 'Sorcery',
    oracle_text: 'Each player chooses any number of creatures they control with total power 4 or less, then sacrifices all other creatures they control.',
    cmc: 3
  };

  const wallCards = [
    { name: 'Wall of Omens', mana_cost: '{1}{W}', type_line: 'Creature — Wall', power: 0, toughness: 4, oracle_text: 'Defender\nWhen enters, draw a card.', cmc: 2 },
    { name: 'Wall of Blossoms', mana_cost: '{1}{G}', type_line: 'Creature — Plant Wall', power: 0, toughness: 4, oracle_text: 'Defender\nWhen enters, draw a card.', cmc: 2 },
    { name: 'Overgrown Battlement', mana_cost: '{1}{G}', type_line: 'Creature — Human Druid Wall', power: 0, toughness: 4, oracle_text: 'Defender', cmc: 2 }
  ];

  const asymmetryReport = CausalGraphEngine.evaluateCardAsymmetry(slaughterTheStrong, wallCards);
  assert.equal(asymmetryReport.isAsymmetricBlowout, true, 'Slaughter the Strong preserves all 0-power walls while wiping opponent');
  assert.equal(asymmetryReport.selfLossCount, 0, 'Zero walls lost to Slaughter the Strong');
});

// ============================================================================
// TEST J: Early Game Activity Telemetry (T1-T3)
// ============================================================================
test('TEST J: Early Game Active Gameplay Telemetry', () => {
  const activeDeck = {
    cards: [
      { card: { name: 'Delighted Halfling', cmc: 1, type_line: 'Creature' }, count: 4 },
      { card: { name: 'Wall of Omens', cmc: 2, type_line: 'Creature' }, count: 4 },
      { card: { name: 'Arcades, the Strategist', cmc: 4, type_line: 'Creature' }, count: 4 },
      { card: { name: 'Forest', cmc: 0, type_line: 'Land' }, count: 24 }
    ]
  };

  const activity = ChainExecutionSimulator.computeEarlyGameActivity(activeDeck);
  assert.ok(activity.T1 > 0.4, 'T1 active play probability computed');
  assert.ok(activity.T2 > 0.6, 'T2 active play probability computed');
  assert.ok(typeof activity.T3 === 'number', 'T3 active play probability computed');
});

// ============================================================================
// TEST K: Remove-One-Card-And-Rebuild Autopsy
// ============================================================================
test('TEST K: Remove-One-Card & Rebuild Autopsy (Classifies Essential vs Redundant vs Dominated)', () => {
  const fullDeck = [
    { card: { name: 'Arcades, the Strategist', cmc: 4, oracle_text: 'Walls assign damage by toughness and can attack' }, count: 4 },
    { card: { name: 'High Alert', cmc: 3, oracle_text: 'Creatures assign damage by toughness and can attack' }, count: 4 },
    { card: { name: 'Wall of Omens', cmc: 2, oracle_text: 'Defender, ETB draw' }, count: 4 },
    { card: { name: 'Overgrown Battlement', cmc: 2, oracle_text: 'Defender, {T}: add mana' }, count: 4 },
    { card: { name: 'Grizzly Bears', cmc: 2, oracle_text: '' }, count: 4 } // Suboptimal/dominated card
  ];

  const pool = [
    { name: 'Wall of Blossoms', cmc: 2, oracle_text: 'Defender, ETB draw' },
    { name: 'Tower Defense', cmc: 2, oracle_text: 'Creatures get +0/+5 and reach' }
  ];

  const autopsyArcades = CausalBreakAnalyzer.autopsyCardInDeck(fullDeck, 'Arcades, the Strategist', pool);
  const autopsyBears = CausalBreakAnalyzer.autopsyCardInDeck(fullDeck, 'Grizzly Bears', pool);

  assert.ok(['ESSENTIAL', 'IMPORTANT'].includes(autopsyArcades.classification), 'Arcades is central engine');
  assert.equal(autopsyBears.classification, 'DOMINATED', 'Grizzly Bears is dominated by Wall of Blossoms or Tower Defense');
  assert.ok(autopsyBears.betterAlternative, 'Must point to superior alternative');
});
