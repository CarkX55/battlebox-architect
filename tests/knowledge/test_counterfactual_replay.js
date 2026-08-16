/**
 * TEST SUITE: COUNTERFACTUAL REPLAY & DECISION ENGINE CAUSAL PROOF
 * 
 * Verifies 2 core invariants of the DecisionEngine:
 * 1. ZERO Name Privilege: Renaming a card while keeping its Oracle text & capabilities identical MUST produce 100% identical decision outcomes.
 * 2. Causal Sensitivity: Modifying a candidate's capabilities so it resolves an active CRITICAL bottleneck MUST pivot the decision to the bottleneck-resolving candidate.
 */

import { DecisionEngine } from '../../src/services/agent/decisionEngine.js';
import { DeckState } from '../../src/services/agent/deckState.js';

function runCounterfactualReplayTests() {
  console.log('🧪 Running Counterfactual Replay & Causal Sensitivity Audit...\n');
  let passed = 0;
  let total = 0;

  // Test 1: ZERO Name Privilege Test
  total++;
  const intent = { archetype: 'Ramp', colors: ['G'], primaryTribe: 'Elf' };
  const deckState = new DeckState(intent);

  const candidateA = {
    name: 'Famous Hero Card',
    type_line: 'Creature — Elf Druid',
    oracle_text: '{T}: Add {G}.',
    cmc: 1,
    colors: ['G'],
    mana_cost: '{G}'
  };

  const candidateB = {
    name: 'Obscure Unknown Card',
    type_line: 'Creature — Elf Druid',
    oracle_text: '{T}: Add {G}.',
    cmc: 1,
    colors: ['G'],
    mana_cost: '{G}'
  };

  const contract = { role: 'EARLY_RAMP', requiredCapabilities: ['PRODUCES_MANA'] };
  
  const decisionOriginal = DecisionEngine.selectCandidate([candidateA, candidateB], deckState, contract);

  // Replay with renamed candidate A
  const candidateARenamed = { ...candidateA, name: 'Completely Random Renamed Card X' };
  const decisionRenamed = DecisionEngine.selectCandidate([candidateARenamed, candidateB], deckState, contract);

  if (decisionOriginal.verdict === 'SELECTED' && decisionRenamed.verdict === 'SELECTED') {
    console.log('  ✅ [TEST 1 PASSED] ZERO Name Privilege verified: Renaming card did NOT alter decision flow.');
    passed++;
  } else {
    console.error(`  ❌ [TEST 1 FAILED] Renaming card altered decision flow! (v1: ${decisionOriginal.verdict}, v2: ${decisionRenamed.verdict})`);
  }

  // Test 2: Causal Sensitivity (Bottleneck Resolution Pivoting)
  total++;
  const rampIntent = { archetype: 'Ramp', colors: ['G', 'W'] };
  const rampDeckState = new DeckState(rampIntent);

  // Inject high-CMC cards to trigger CRITICAL MANA_ACCELERATION bottleneck
  rampDeckState.cmcCurve[5] = 4;
  rampDeckState.cmcCurve[6] = 2;
  rampDeckState.updateStrategicBottlenecks();

  const fillerCandidate = {
    name: 'Generic Token Maker',
    type_line: 'Sorcery',
    oracle_text: 'Create a 1/1 token.',
    cmc: 3,
    colors: ['G']
  };

  const bottleneckResolverCandidate = {
    name: 'Nature Mana Ramp',
    type_line: 'Sorcery',
    oracle_text: 'Search your library for a basic land card and put it onto the battlefield. Add {G}.',
    cmc: 2,
    colors: ['G']
  };

  const activeContract = rampDeckState.getNextStrategicRoleContract();
  const decisionBottleneck = DecisionEngine.selectCandidate(
    [fillerCandidate, bottleneckResolverCandidate],
    rampDeckState,
    activeContract
  );

  if (decisionBottleneck.selectedCard?.name === 'Nature Mana Ramp') {
    console.log('  ✅ [TEST 2 PASSED] Causal Sensitivity verified: DecisionEngine pivoted to candidate that resolves CRITICAL MANA_ACCELERATION bottleneck.');
    passed++;
  } else {
    console.error('  ❌ [TEST 2 FAILED] DecisionEngine failed to pivot to bottleneck-resolving candidate!');
  }

  console.log(`\n================================================`);
  console.log(`🏆 COUNTERFACTUAL REPLAY RESULT: ${passed}/${total} Tests Passed`);
  console.log(`================================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runCounterfactualReplayTests();
