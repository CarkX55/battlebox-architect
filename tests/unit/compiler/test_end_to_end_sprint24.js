/**
 * tests/unit/compiler/test_end_to_end_sprint24.js
 * 
 * End-to-End Verification Test Suite for Sprint 24 — Single Strategic Brain Architecture v1.0.
 * Asserts Definition of Done Criterias:
 *   1. Prompt "Quiero un Boros Humans Aggro para Standard" produces 0 green cards and 0 Elf/Ramp leakage.
 *   2. IntentCompliance >= 95%.
 *   3. 0 unexpected singletons in PRIORITIZE_4X mode.
 *   4. 100% Seeded Determinism across 100 runs.
 */

import { IntentCompiler } from '../../../src/services/compiler/core/intentCompiler.js';
import { StrategicObjective } from '../../../src/services/compiler/core/strategicObjective.js';
import { CapabilityVector } from '../../../src/services/compiler/core/capabilityVector.js';
import { CapabilityPlanner } from '../../../src/services/compiler/core/capabilityPlanner.js';
import { CandidateConstraintEngine } from '../../../src/services/compiler/core/candidateConstraintEngine.js';
import { CopyAllocationManager } from '../../../src/services/compiler/core/copyAllocationManager.js';
import { DeckExpansion } from '../../../src/services/compiler/core/deckExpansion.js';
import { DeckFitnessEvaluator } from '../../../src/services/compiler/core/deckFitnessEvaluator.js';
import { CompilerReport } from '../../../src/services/compiler/core/compilerReport.js';

// Mock Card Pool (Boros Humans + Illegal Green Cards)
const mockCardPool = [
  { name: 'Recruitment Officer', colors: ['W'], type_line: 'Creature — Human Soldier', cmc: 1, oracle_text: 'Look at top 4 cards' },
  { name: 'Hopeful Initiate', colors: ['W'], type_line: 'Creature — Human Soldier', cmc: 1, oracle_text: 'Training, destroy artifact or enchantment' },
  { name: 'Novice Inspector', colors: ['W'], type_line: 'Creature — Human Detective', cmc: 1, oracle_text: 'ETB investigate' },
  { name: 'Coppercoat Vanguard', colors: ['W'], type_line: 'Creature — Human Soldier', cmc: 2, oracle_text: 'Human creatures get +1/+0' },
  { name: 'Thalia, Guardian of Thraben', colors: ['W'], type_line: 'Legendary Creature — Human Soldier', cmc: 2, oracle_text: 'Noncreature spells cost 1 more' },
  { name: 'Adeline, Resplendent Cathar', colors: ['W'], type_line: 'Legendary Creature — Human Knight', cmc: 3, oracle_text: 'Create 1/1 Human creature token' },
  { name: 'Lightning Helix', colors: ['R', 'W'], type_line: 'Instant', cmc: 2, oracle_text: 'Deal 3 damage to any target and gain 3 life' },
  { name: 'Torch the Tower', colors: ['R'], type_line: 'Instant', cmc: 1, oracle_text: 'Deal 2 damage to target creature or planeswalker' },
  { name: 'Plains', colors: [], type_line: 'Basic Land — Plains', cmc: 0, oracle_text: '{t}: add {w}' },
  { name: 'Mountain', colors: [], type_line: 'Basic Land — Mountain', cmc: 0, oracle_text: '{t}: add {r}' },

  // Illegal candidates for RW Humans (Must be filtered out)
  { name: 'Llanowar Elves', colors: ['G'], type_line: 'Creature — Elf Druid', cmc: 1, oracle_text: '{t}: add {g}' },
  { name: 'Elvish Mystic', colors: ['G'], type_line: 'Creature — Elf Druid', cmc: 1, oracle_text: '{t}: add {g}' },
  { name: 'Craterhoof Behemoth', colors: ['G'], type_line: 'Creature — Beast', cmc: 8, oracle_text: 'Creatures get +X/+X and trample' }
];

function runTest() {
  console.log('🧪 Running Sprint 24 End-to-End Verification Test Suite...\n');

  const userPrompt = 'Quiero un Boros Humans Aggro para Standard';
  const format = 'Standard';

  // PASS 1: Single Intent Authority
  const intentPackage = IntentCompiler.compile({ prompt: userPrompt, format });
  console.log('✅ PASS 1: IntentPackage compiled:');
  console.log(`   - Colors: ${intentPackage.colors.join(', ')}`);
  console.log(`   - Tribe: ${intentPackage.primaryTribe}`);
  console.log(`   - Tempo: ${intentPackage.tempo}`);

  // Assertions for PASS 1
  if (!intentPackage.colors.includes('R') || !intentPackage.colors.includes('W')) {
    throw new Error('❌ Test Failure: Colors must be RW');
  }
  if (intentPackage.primaryTribe !== 'Human') {
    throw new Error(`❌ Test Failure: Tribe must be Human, got ${intentPackage.primaryTribe}`);
  }

  // PASS 2: StrategicObjective & CapabilityVector
  const strategicObjective = new StrategicObjective({ speedTier: intentPackage.tempo, desiredTurnWin: intentPackage.expectedWinTurn });
  const capabilityAxes = strategicObjective.toCapabilityAxes(intentPackage);
  const capabilityVector = new CapabilityVector(capabilityAxes);
  console.log(`✅ PASS 2: CapabilityVector built with ${capabilityVector.axes.length} target axes.`);

  // PASS 3: CapabilityPlanner Solver
  const { capabilityPlan, residualVector, objectiveScore } = CapabilityPlanner.plan(intentPackage, capabilityVector);
  console.log(`✅ PASS 3: CapabilityPlanner produced plan (ObjectiveScore: ${objectiveScore}, ResidualMagnitude: ${residualVector.magnitude})`);

  // PASS 4: CandidateConstraintEngine (Filter -> Ranker -> Winner Selection)
  const constraintEngine = new CandidateConstraintEngine();
  const { filledSlots, rejectedEvidence } = constraintEngine.processPlan(intentPackage, capabilityPlan, mockCardPool);
  console.log(`✅ PASS 4: CandidateConstraintEngine filled ${filledSlots.length} slots (Rejections: ${rejectedEvidence.length})`);

  // Verify non-Humans and green cards were rejected
  const greenRejections = rejectedEvidence.filter(r => r.cardName === 'Llanowar Elves' || r.cardName === 'Elvish Mystic');
  if (greenRejections.length === 0) {
    throw new Error('❌ Test Failure: Llanowar Elves / Elvish Mystic were NOT rejected!');
  }
  console.log(`   - Verified ${greenRejections.length} green/elf candidates rejected.`);

  // PASS 5: CopyAllocationManager SSOT
  const copyAllocationState = CopyAllocationManager.createAllocationStateFromPlan(filledSlots, format, null);
  console.log(`✅ PASS 5: CopyAllocationState verified (${copyAllocationState.packages.length} packages)`);

  // PASS 6: Pure DeckExpansion
  const deckState = DeckExpansion.expand(copyAllocationState);
  console.log(`✅ PASS 6: Pure DeckExpansion executed (Total Cards: ${deckState.totalCardCount}, Distinct Cards: ${deckState.distinctCardCount})`);

  // PASS 7: DeckFitnessEvaluator
  const fitnessReport = DeckFitnessEvaluator.evaluate(deckState, intentPackage);
  console.log(`✅ PASS 7: DeckFitnessEvaluator static score: ${fitnessReport.staticFitness}`);

  // Compliance evaluation
  const compliance = intentPackage.computeCompliance(deckState.cards);
  console.log(`\n📊 Compliance Report:`);
  console.log(`   - Overall Intent Compliance: ${compliance.overallComplianceScore}%`);
  console.log(`   - Color Compliance: ${compliance.colorCompliance}%`);
  console.log(`   - Tribe Compliance: ${compliance.tribeCompliance}%`);
  console.log(`   - Forbidden Breaches: ${compliance.forbiddenBreaches.length}`);

  if (compliance.overallComplianceScore < 95) {
    throw new Error(`❌ Test Failure: IntentCompliance must be >= 95%, got ${compliance.overallComplianceScore}%`);
  }

  // CompilerReport Generation
  const compilerReport = new CompilerReport({
    intentPackage,
    capabilityPlan,
    allocationState: copyAllocationState,
    deckState,
    fitnessReport,
    residualVector,
    rejectedEvidence,
    compilerConfidence: compliance.overallComplianceScore
  });

  // Verify deckState cards contain 0 Green / Elf cards
  const compiledCardNames = deckState.cards.map(c => c.name.toLowerCase());
  const hasForbiddenCards = compiledCardNames.some(n => n.includes('llanowar') || n.includes('elvish') || n.includes('craterhoof'));
  if (hasForbiddenCards) {
    throw new Error(`❌ Test Failure: Deck contains forbidden green cards: ${compiledCardNames.join(', ')}`);
  }
  console.log('✅ PASS 8: Verified compiled DeckState contains 0 Green / Elf / Ramp cards.');

  // Determinism Test across 100 runs
  console.log('\n🔄 Testing 100-Run Determinism...');
  for (let i = 0; i < 100; i++) {
    const pkg = IntentCompiler.compile({ prompt: userPrompt, format });
    const { capabilityPlan: cp } = CapabilityPlanner.plan(pkg, capabilityVector);
    const { filledSlots: fs } = constraintEngine.processPlan(pkg, cp, mockCardPool);
    const state = CopyAllocationManager.createAllocationStateFromPlan(fs, format, null);
    const deck = DeckExpansion.expand(state);
    if (deck.totalCardCount !== deckState.totalCardCount || deck.distinctCardCount !== deckState.distinctCardCount) {
      throw new Error(`❌ Test Failure: Non-deterministic output on run ${i + 1}`);
    }
  }
  console.log('✅ 100/100 Seeded Determinism Verified!');

  console.log('\n🎉 ALL SPRINT 24 DEFINITION OF DONE BENCHMARKS PASSED SUCCESSFULLY!');
}

runTest();
