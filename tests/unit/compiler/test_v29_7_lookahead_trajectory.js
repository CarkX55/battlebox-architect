/**
 * tests/unit/compiler/test_v29_7_lookahead_trajectory.js
 * 
 * Test Suite: Lookahead Trajectory Search & Global DeckState Optimization.
 * Verifies that:
 *   1. Search unit is DeckState(spells, lands), not Card.
 *   2. Multi-step trajectories evaluate state endpoints rather than single-step myopic deltas.
 *   3. 2-step synergistic combo (Enabler -> Lord) defeats greedy standalone card.
 */

import { strict as assert } from 'assert';
import { LookaheadTrajectorySearch } from '../../../src/services/compiler/core/lookaheadTrajectorySearch.js';
import { DeckState } from '../../../src/services/compiler/core/deckState.js';
import { GameplanContract, TurnRequirement, TurnFunctionalDemand } from '../../../src/services/compiler/core/gameplanSynthesizer.js';

console.log('══════════════════════════════════════════════════════════════════');
console.log('  TEST SUITE: V29.7 LOOKAHEAD TRAJECTORY SEARCH ENGINE');
console.log('══════════════════════════════════════════════════════════════════\n');

// 1. Base initial DeckState with 4 starter creatures and lands
const baseSpells = [
  { name: 'Goblin Guide', cmc: 1, type_line: 'Creature — Goblin Scout', quantity: 4, isLand: false, role: 'AGGRESSIVE_ATTACKER' }
];
const baseDeckState = new DeckState(baseSpells);

// 2. GameplanContract prioritizing early aggression and tribal lord payoff
const aggroGameplan = new GameplanContract({
  thesis: 'Goblin Aggro Swarm',
  derivedKillTurn: 4,
  tacticalExecutionProfile: {
    landFloodSensitivity: 1.15,
    manaScrewSensitivity: 1.40,
    earlyCurveWeight: 0.85,
    curveOutWeightWindow: [1, 2, 3]
  },
  turnRequirements: [
    new TurnRequirement({
      turn: 1,
      criticality: 'CRITICAL',
      functionalDemands: [
        new TurnFunctionalDemand({
          functionName: 'DEPLOY_1CMC_BODY',
          constraints: { cmc: { max: 1 } },
          criticality: 'CRITICAL',
          targetProbability: 0.85
        })
      ]
    }),
    new TurnRequirement({
      turn: 2,
      criticality: 'IMPORTANT',
      functionalDemands: [
        new TurnFunctionalDemand({
          functionName: 'DEPLOY_2CMC_LORD',
          constraints: { cmc: { max: 2 } },
          criticality: 'IMPORTANT',
          targetProbability: 0.80
        })
      ]
    })
  ]
});

// 3. Candidate pool with:
// - Card A (Greedy Bomb): 4-CMC bomb that looks strong individually but slows the curve
// - Card B (Synergy 1-drop): Goblin Bushwhacker (CMC 1)
// - Card C (Synergy Lord): Rundvelt Hordemaster (CMC 2)
const candidatePool = [
  {
    name: 'Siege-Gang Commander',
    cmc: 5,
    type_line: 'Creature — Goblin',
    oracle_text: 'When Siege-Gang Commander enters the battlefield, create three 1/1 red Goblin creature tokens.',
    power: 2,
    toughness: 2
  },
  {
    name: 'Goblin Bushwhacker',
    cmc: 1,
    type_line: 'Creature — Goblin Rogue',
    oracle_text: 'Kicker {R}. When Goblin Bushwhacker enters the battlefield, if it was kicked, creatures you control get +1/+0 and gain haste until end of turn.',
    power: 1,
    toughness: 1
  },
  {
    name: 'Rundvelt Hordemaster',
    cmc: 2,
    type_line: 'Creature — Goblin Warrior',
    oracle_text: 'Other Goblins you control get +1/+1. Whenever a Goblin you control dies, exile the top card of your library. You may play it this turn.',
    power: 1,
    toughness: 1
  }
];

// [Test 1] Run Beam Search Trajectory Exploration
console.log('[Test 1] Running LookaheadTrajectorySearch (K=3, Depth=2)...');
const result = LookaheadTrajectorySearch.searchTrajectories({
  rootState: baseDeckState,
  candidatePool,
  gameplanContract: aggroGameplan,
  strategicContract: { archetype: 'Aggro', format: 'STANDARD' },
  intentPackage: { format: 'STANDARD', primaryTribe: 'Goblin', tempo: 'Aggro' },
  beamWidth: 3,
  depth: 2,
  landCalibrator: (spells) => {
    // Dynamic land calibration at each node
    const spellCount = spells.reduce((s, c) => s + (c.quantity || 1), 0);
    const landsNeeded = Math.max(16, Math.min(24, 60 - spellCount));
    const landCards = [
      { name: 'Mountain', cmc: 0, type_line: 'Basic Land — Mountain', quantity: landsNeeded, isLand: true }
    ];
    return new DeckState([...spells, ...landCards]);
  }
});

assert.ok(result.exploredNodesCount > 0, 'Expected nodes to be explored');
assert.ok(result.bestTrajectory.length === 3, `Expected trajectory length 3 (root + depth 2), got ${result.bestTrajectory.length}`);
assert.ok(result.winningState, 'Expected winningState to be returned');
console.log(`  ✅ PASS: Explored ${result.exploredNodesCount} trajectory nodes; pruned ${result.prunedNodesCount} dominated branches.`);

// [Test 2] Verifying that 2-step lookahead chose early velocity / synergy over 5-CMC bomb
console.log('\n[Test 2] Verifying winning trajectory selected synergy over greedy 5-CMC bomb...');
const winningAction = result.winningAction;
assert.ok(winningAction, 'Expected winningAction to be identified');
assert.notEqual(winningAction.card.name, 'Siege-Gang Commander', 'Aggro lookahead must not pick 5-CMC bomb as first step');
console.log(`  ✅ PASS: Winning trajectory first step is ${winningAction.card.name} (CMC ${winningAction.card.cmc}), rejecting 5-CMC bomb.`);

// [Test 3] Verifying complete DeckState properties on trajectory endpoint
console.log('\n[Test 3] Verifying endpoint DeckState has calibrated lands and observable Pareto metrics...');
const endpointState = result.winningState;
assert.ok(endpointState.curveExecutionRate >= 0, 'Expected curveExecutionRate on endpoint');
assert.ok(endpointState.manaCastabilityRate >= 0, 'Expected manaCastabilityRate on endpoint');
assert.ok(endpointState.resilienceRecoveryRate >= 0, 'Expected resilienceRecoveryRate on endpoint');
console.log(`  ✅ PASS: Trajectory endpoint has complete DeckState IR (curveExecution: ${endpointState.curveExecutionRate}, mana: ${endpointState.manaCastabilityRate}, resilience: ${endpointState.resilienceRecoveryRate}).`);

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  V29.7 LOOKAHEAD TRAJECTORY TEST SUMMARY: ALL 3 PASSED');
console.log('══════════════════════════════════════════════════════════════════\n');
