/**
 * A/B DECISION BENCHMARK & END-TO-END TRACEABILITY SUITE
 * 
 * Verifies the 6 Required Acceptance Benchmark Tests:
 * 1. Ramp without Accelerators -> Detects MANA_ACCELERATION bottleneck
 * 2. Top-heavy Curve -> Refuses high-CMC threats & fills curve gaps
 * 3. Tribal Missing Payoff -> Completes directed causal graph by finding payoff capabilities
 * 4. Impossible Mana ({U}{U} T2 in 3-color deck) -> ManaFeasibilityAdvisor executes VETO
 * 5. Power vs Fit -> Selects Strategic Fit 7/10 resolving active bottleneck (Power != Strategic Fit)
 * 6. All Candidates Unfit -> Returns NO_SELECTION and triggers pool expansion/replanning
 * 
 * Plus End-to-End Decision Traceability Contract:
 * RAMP_END_TO_END_LLANOWAR_INTEGRITY
 */

import { DeckState } from '../../../src/services/agent/deckState.js';
import { DecisionEngine } from '../../../src/services/agent/decisionEngine.js';
import { CardImplementer } from '../../../src/services/agent/cardImplementer.js';
import { ManaFeasibilityAdvisor } from '../../../src/services/agent/advisors/ManaFeasibilityAdvisor.js';
import { CausalSynergyAdvisor } from '../../../src/services/agent/advisors/CausalSynergyAdvisor.js';

// Mock Card Pool
const mockCardPool = [
  { name: 'Llanowar Elves', cmc: 1, type_line: 'Creature — Elf Druid', oracle_text: '{T}: Add {G}.', colors: ['G'] },
  { name: 'Birds of Paradise', cmc: 1, type_line: 'Creature — Bird', oracle_text: '{T}: Add one mana of any color.', colors: ['G'] },
  { name: 'Rampant Growth', cmc: 2, type_line: 'Sorcery', oracle_text: 'Search your library for a basic land card and put it onto the battlefield tapped.', colors: ['G'] },
  { name: 'Colossal Dreadmaw', cmc: 6, type_line: 'Creature — Dinosaur', oracle_text: 'Trample', colors: ['G'] },
  { name: 'Gigantosaurus', cmc: 5, type_line: 'Creature — Dinosaur', oracle_text: '', colors: ['G'] },
  { name: 'Counterspell', cmc: 2, type_line: 'Instant', oracle_text: 'Counter target spell.', mana_cost: '{U}{U}', colors: ['U'] },
  { name: 'Blood Artist', cmc: 2, type_line: 'Creature — Vampire', oracle_text: 'Whenever Blood Artist or another creature dies, target player loses 1 life and you gain 1 life.', colors: ['B'] },
  { name: 'Viscera Seer', cmc: 1, type_line: 'Creature — Vampire Wizard', oracle_text: 'Sacrifice a creature: Scry 1.', colors: ['B'] },
  { name: 'Fatal Push', cmc: 1, type_line: 'Instant', oracle_text: 'Destroy target creature if it has mana value 2 or less.', colors: ['B'] }
];

let testsPassed = 0;
let testsTotal = 0;

function assert(condition, message) {
  testsTotal++;
  if (condition) {
    testsPassed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('=== RUNNING A/B DECISION BENCHMARK & TRACEABILITY SUITE ===\n');

// TEST 1: Ramp without Accelerators -> Detects MANA_ACCELERATION bottleneck
console.log('Test 1: Ramp without Accelerators Bottleneck Detection');
{
  const deckState = new DeckState({ archetype: 'Ramp', colors: ['G'], format: 'MODERN' });
  // Add 5 high-CMC threats
  deckState.addCard(mockCardPool[3], 4, 'Threat', 'FINISHER');
  deckState.addCard(mockCardPool[4], 1, 'Threat', 'FINISHER');

  const contract = deckState.getNextStrategicRoleContract();
  assert(contract.role === 'MANA_ACCELERATION', 'Detects MANA_ACCELERATION bottleneck as CRITICAL');
  assert(contract.priority === 'CRITICAL', 'Bottleneck priority is CRITICAL');
}

// TEST 2: Top-heavy Curve -> Refuses high-CMC threats
console.log('\nTest 2: Top-Heavy Curve Refusal');
{
  const deckState = new DeckState({ archetype: 'Midrange', colors: ['G'], format: 'MODERN' });
  // Fill 6 slots with CMC >= 5
  deckState.addCard(mockCardPool[3], 4, 'High CMC', 'FINISHER');
  deckState.addCard(mockCardPool[4], 2, 'High CMC', 'FINISHER');

  const candidates = [mockCardPool[3], mockCardPool[0]]; // Dreadmaw vs Llanowar
  const contract = { role: 'FLEX_THREAT', priority: 'HIGH' };
  const decision = DecisionEngine.selectCandidate(candidates, deckState, contract);

  assert(decision.verdict === 'SELECTED', 'DecisionEngine returned SELECTED');
  assert(decision.selectedCard.name === 'Llanowar Elves', 'Selects low-CMC Llanowar Elves over overcrowded Dreadmaw');
}

// TEST 3: Tribal Missing Payoff -> Directed Causal Graph Completion
console.log('\nTest 3: Tribal / Aristocrats Missing Payoff Detection');
{
  const deckState = new DeckState({ archetype: 'Aristocrats', colors: ['B'], format: 'MODERN' });
  // Add 16 non-lands including Sac Outlet
  for (let i = 0; i < 12; i++) {
    deckState.addCard(mockCardPool[8], 1, 'Removal', 'EARLY_INTERACTION');
  }
  deckState.addCard(mockCardPool[7], 4, 'Sac Outlet', 'SAC_OUTLET'); // Viscera Seer

  const contract = deckState.getNextStrategicRoleContract();
  assert(contract.role === 'CAUSAL_PAYOFF_MISSING', 'Detects CAUSAL_PAYOFF_MISSING bottleneck when Sac Outlet has 0 Payoffs');
}

// TEST 4: Impossible Mana ({U}{U} T2 in 3-color deck) -> VETO
console.log('\nTest 4: Impossible Mana VETO ({U}{U} T2 in 3-color deck)');
{
  const deckState = new DeckState({ archetype: 'Midrange', colors: ['R', 'G', 'B'], format: 'MODERN' });
  const report = ManaFeasibilityAdvisor.evaluate(mockCardPool[5], deckState, { turn: 2, minProbability: 0.90 });

  assert(report.veto === true, 'ManaFeasibilityAdvisor executes VETO for {U}{U} T2 spell in RGB deck');
  assert(report.status === 'VETO', 'Status is VETO');
}

// TEST 5: Power vs Fit -> Selects Strategic Fit resolving bottleneck
console.log('\nTest 5: Power vs Strategic Fit (Strategic Fit Resolves Bottleneck)');
{
  const deckState = new DeckState({ archetype: 'Ramp', colors: ['G'], format: 'MODERN' });
  deckState.addCard(mockCardPool[3], 4, 'High CMC', 'FINISHER');

  const candidates = [mockCardPool[3], mockCardPool[0]]; // Dreadmaw (Power 9/10) vs Llanowar (Fit 7/10)
  const contract = { role: 'MANA_ACCELERATION', priority: 'CRITICAL' };
  const decision = DecisionEngine.selectCandidate(candidates, deckState, contract);

  assert(decision.selectedCard.name === 'Llanowar Elves', 'Selects Strategic Fit (Llanowar Elves) over Raw Power (Dreadmaw)');
}

// TEST 6: All Candidates Unfit -> Returns NO_SELECTION
console.log('\nTest 6: All Candidates Unfit -> Returns NO_SELECTION');
{
  const deckState = new DeckState({ archetype: 'Midrange', colors: ['R', 'G', 'B'], format: 'MODERN' });
  const unfitCandidates = [mockCardPool[5]]; // Only {U}{U} Counterspell available for RGB deck
  const contract = { role: 'MANA_ACCELERATION', priority: 'CRITICAL' };
  const decision = DecisionEngine.selectCandidate(unfitCandidates, deckState, contract);

  assert(decision.verdict === 'NO_SELECTION', 'Returns NO_SELECTION when all candidates fail contracts');
  assert(decision.action === 'EXPAND_CANDIDATE_POOL_AND_REPLAN', 'Triggers candidate pool expansion and replanning');
}

// TEST 7: END-TO-END RAMP LLANOWAR INTEGRITY TRACE
console.log('\nTest 7: RAMP_END_TO_END_LLANOWAR_INTEGRITY Trace');
{
  const intentPackage = { archetype: 'Ramp', colors: ['G'], format: 'MODERN' };
  const deckState = new DeckState(intentPackage);
  deckState.addCard(mockCardPool[3], 4, 'High CMC', 'FINISHER'); // Add high CMC threats

  // 1. Bottleneck check
  const contract = deckState.getNextStrategicRoleContract();
  assert(contract.role === 'MANA_ACCELERATION', 'Trace 1: Bottleneck MANA_ACCELERATION detected');

  // 2. Candidate retrieval
  const searchRes = CardImplementer.findCandidates({ need: 'RAMP' }, mockCardPool, intentPackage);
  assert(searchRes.candidates.length > 0, 'Trace 2: Candidates retrieved into pool');
  assert(searchRes.provenanceMap.some(p => p.name === 'Llanowar Elves'), 'Trace 3: Llanowar Elves retrieved with provenance');

  // 3. DecisionEngine selection
  const decision = DecisionEngine.selectCandidate(searchRes.candidates, deckState, contract);
  assert(decision.verdict === 'SELECTED', 'Trace 4: DecisionEngine selected candidate');
  assert(decision.selectedCard.name === 'Llanowar Elves', 'Trace 5: DecisionEngine selected Llanowar Elves');

  // 4. DeckState mutation & Final Deck verification
  const addRes = deckState.addCard(decision.selectedCard, 4, decision.whySelected.join(' | '), contract.role);
  assert(addRes.success === true, 'Trace 6: DeckState added Llanowar Elves');
  assert(deckState.cards.has('Llanowar Elves'), 'Trace 7: FINAL DECK CONTAINS LLANOWAR ELVES!');
}

console.log(`\n🎉 ALL BENCHMARK TESTS PASSED (${testsPassed}/${testsTotal})`);
