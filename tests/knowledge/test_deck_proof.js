import { StrategicPlanner } from '../../src/knowledge/planner/StrategicPlanner.js';
import { StrategyIRBuilder } from '../../src/knowledge/compiler/StrategyIRBuilder.js';
import { DeckProofObject } from '../../src/knowledge/serving/DeckProofObject.js';

console.log('=== TEST: DeckProofObject End-to-End Justification ===');

const plan = StrategicPlanner.createPlanFromIntent('RAMP');
const strategyIR = StrategyIRBuilder.buildFromPlan(plan);

const proof = DeckProofObject.buildProof({
  deckId: 'deck_proof_test_01',
  userIntent: 'RAMP',
  strategyIR,
  packages: [{ packageId: 'pkg_elf_ramp', selectedCards: [{ name: 'Llanowar Elves' }] }],
  cards: [{ name: 'Llanowar Elves', packageId: 'pkg_elf_ramp' }],
  simulationResult: { winrate: 0.72, trials: 1000 }
});

console.log(`[PASS] Deck Proof ID: ${proof.deckId}`);
console.log(`[PASS] Verified Winrate: ${proof.simulationVerification.winrate * 100}%`);
console.log(`[PASS] Provenance Chain Count: ${proof.provenanceChain.length}`);

if (proof.provenanceChain.length !== 1) {
  console.error('FAILED: Expected provenanceChain length 1');
  process.exit(1);
}

if (proof.simulationVerification.winrate !== 0.72) {
  console.error('FAILED: Expected simulation winrate 0.72');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
