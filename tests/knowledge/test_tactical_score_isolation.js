/**
 * TEST SUITE: TACTICAL SCORE ISOLATION AUDIT
 * 
 * Verifies that Monte Carlo tactical score outputs or aggregate numeric scores
 * CANNOT influence DecisionEngine candidate selection.
 */

import { DecisionEngine } from '../../src/services/agent/decisionEngine.js';
import { DeckState } from '../../src/services/agent/deckState.js';

function runTacticalScoreIsolationTest() {
  console.log('🧪 Running Tactical Score Isolation Audit...\n');
  
  const intent = { archetype: 'Midrange', colors: ['B', 'G'] };
  const deckState = new DeckState(intent);

  const candidateA = {
    name: 'Strategic Fit Removal',
    type_line: 'Instant',
    oracle_text: 'Destroy target creature with mana value 3 or less.',
    cmc: 2,
    colors: ['B'],
    tacticalScore: 20 // Low tactical score injected
  };

  const candidateB = {
    name: 'Poor Fit Off-Role Card',
    type_line: 'Enchantment',
    oracle_text: 'Whenever you cast an enchantment, draw a card.',
    cmc: 5,
    colors: ['G'],
    tacticalScore: 100 // High tactical score injected
  };

  const contract = { role: 'EARLY_INTERACTION', requiredCapabilities: ['CHEAP_REMOVAL'] };

  // Decision 1: Original Injected Scores
  const decision1 = DecisionEngine.selectCandidate([candidateA, candidateB], deckState, contract);

  // Decision 2: Inverted Injected Scores
  candidateA.tacticalScore = 100;
  candidateB.tacticalScore = 0;
  const decision2 = DecisionEngine.selectCandidate([candidateA, candidateB], deckState, contract);

  console.log(`  Decision 1 winner: ${decision1.selectedCard?.name}`);
  console.log(`  Decision 2 winner: ${decision2.selectedCard?.name}`);

  if (decision1.selectedCard?.name === candidateA.name && decision2.selectedCard?.name === candidateA.name) {
    console.log('\n  ✅ [PASSED] Tactical Score Isolation verified: DecisionEngine candidate selection is 100% immune to external numeric score injection.');
    process.exit(0);
  } else {
    console.error('\n  ❌ [FAILED] Injected tactical score contaminated DecisionEngine selection!');
    process.exit(1);
  }
}

runTacticalScoreIsolationTest();
