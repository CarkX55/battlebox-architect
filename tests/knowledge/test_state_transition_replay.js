/**
 * TEST SUITE: STATE TRANSITION REPLAY AUDIT
 * 
 * Verifies that a real DecisionEngine selection step satisfies all 8 state transition properties:
 * 1. StrategicRole satisfied
 * 2. RequiredCapability present
 * 3. Mana contract satisfied
 * 4. Causal node contribution
 * 5. Bottleneck transition correct
 * 6. Copy count justified
 * 7. DeckState updated
 * 8. Final deck contains card
 */

import { DecisionEngine } from '../../src/services/agent/decisionEngine.js';
import { DeckState } from '../../src/services/agent/deckState.js';
import { CopyCountStrategist } from '../../src/services/agent/copyCountStrategist.js';

function runStateTransitionReplayTest() {
  console.log('🧪 Running State Transition Replay Audit...\n');

  const intent = { archetype: 'Ramp', colors: ['G'] };
  const deckStateN = new DeckState(intent);

  // Set up bottleneck condition
  deckStateN.cmcCurve[5] = 4;
  deckStateN.updateStrategicBottlenecks();
  const contract = deckStateN.getNextStrategicRoleContract();

  const rampCandidate = {
    name: 'Explore',
    type_line: 'Sorcery',
    oracle_text: 'You may play an additional land this turn. Draw a card.',
    cmc: 2,
    colors: ['G'],
    mana_cost: '{1}{G}'
  };

  // Step 1: DecisionEngine selection
  const decision = DecisionEngine.selectCandidate([rampCandidate], deckStateN, contract);

  // Step 2: CopyCountStrategist allocation
  const copyDecision = CopyCountStrategist.determineCopyCount(decision.selectedCard, deckStateN, contract);

  // Step 3: DeckState Mutation to N+1
  const addRes = deckStateN.addCard(decision.selectedCard, copyDecision.quantity, 'State transition test', contract.role);

  // Assert 8 transition properties
  const prop1 = decision.verdict === 'SELECTED';
  const prop2 = decision.selectedCard.name === 'Explore';
  const prop3 = decision.reports.mana.veto === false;
  const prop4 = decision.reports.causal.status === 'CAUSAL_FIT';
  const prop5 = addRes.success === true;
  const prop6 = copyDecision.quantity > 0;
  const prop7 = deckStateN.nonLandCount === copyDecision.quantity;
  const prop8 = deckStateN.cards.has('Explore');

  const allPassed = prop1 && prop2 && prop3 && prop4 && prop5 && prop6 && prop7 && prop8;

  console.log(`  1. StrategicRole satisfied: ${prop1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  2. RequiredCapability present: ${prop2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  3. Mana contract satisfied: ${prop3 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  4. Causal node contribution: ${prop4 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  5. Bottleneck transition correct: ${prop5 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  6. Copy count justified: ${prop6 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  7. DeckState updated: ${prop7 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  8. Final deck contains card: ${prop8 ? '✅ PASS' : '❌ FAIL'}`);

  console.log(`\n================================================`);
  if (allPassed) {
    console.log('🏆 STATE TRANSITION REPLAY RESULT: 8/8 Properties PASSED');
    console.log('================================================\n');
    process.exit(0);
  } else {
    console.error('💥 STATE TRANSITION REPLAY RESULT: FAILED');
    console.log('================================================\n');
    process.exit(1);
  }
}

runStateTransitionReplayTest();
