import { StrategicGraph, StrategicNode } from '../../../src/services/compiler/core/strategicGraph.js';
import { DependencyResolver } from '../../../src/services/compiler/core/dependencyResolver.js';
import { LocalSearchOptimizer } from '../../../src/services/compiler/core/localSearchOptimizer.js';
import { CopyAllocationState, CopyAllocationManager } from '../../../src/services/compiler/core/copyAllocationManager.js';
import { CapabilityPackage } from '../../../src/services/compiler/core/capabilityPackage.js';
import { IntentCompiler } from '../../../src/services/compiler/core/intentCompiler.js';

function runTest() {
  console.log('🧪 Running BattleBox v1.2 Mathematical Model & DependencyResolver Verification Suite...\n');

  // Test 0: DependencyResolver Chain Resolution
  const intentPkg = IntentCompiler.compile({ prompt: 'Quiero un Boros Humans Aggro', format: 'Standard' });
  const resolvedReqs = DependencyResolver.resolveDependencies(intentPkg);
  console.log(`✅ TEST 0: DependencyResolver automatically expanded ${resolvedReqs.length} capability requirements with strength tiers:`);
  console.log(`   - Expanded IDs: ${resolvedReqs.map(r => `${r.id} (${r.strength})`).join(', ')}`);

  if (!resolvedReqs.some(r => r.id === 'TRIBAL_DENSITY' && r.strength === 'MANDATORY')) {
    throw new Error('❌ Test Failure: DependencyResolver failed to infer MANDATORY TRIBAL_DENSITY');
  }

  // Test 1: StrategicGraph Synergy Scoring
  const graph = new StrategicGraph();
  graph.registerNode({
    cardName: 'Coppercoat Vanguard',
    produces: ['TURN2_PRESSURE'],
    requires: ['HUMAN_DENSITY'],
    supports: ['Recruitment Officer'],
    conflicts_with: ['Sunfall']
  });

  const eval1 = graph.evaluateSynergyScore('Coppercoat Vanguard', ['Lightning Helix']);
  const eval2 = graph.evaluateSynergyScore('Coppercoat Vanguard', ['Recruitment Officer', 'Hopeful Initiate']);
  const evalConflict = graph.evaluateSynergyScore('Coppercoat Vanguard', ['Sunfall']);

  console.log(`\n✅ TEST 1: StrategicGraph Synergy Scoring:`);
  console.log(`   - Without Human Density: ${eval1.score}`);
  console.log(`   - With Human Density & Supports: ${eval2.score}`);
  console.log(`   - With Conflict (Sunfall): ${evalConflict.score} (Violations: ${evalConflict.violations.length})`);

  if (eval2.score <= eval1.score || evalConflict.score >= eval1.score) {
    throw new Error('❌ Test Failure: Synergy scoring failed relational assertion.');
  }

  // Test 2: LocalSearchOptimizer Perturbations
  const initialPackage = new CapabilityPackage({
    role: 'CHEAP_REMOVAL',
    winnerCard: 'Weak Removal',
    copies: 4,
    alternatives: ['Lightning Helix', 'Torch the Tower']
  });

  const initialState = new CopyAllocationState({ packages: [initialPackage] });

  // Evaluator function giving higher score if winnerCard is 'Lightning Helix'
  const evaluator = (state) => {
    const pkg = state.packages.find(p => p.role === 'CHEAP_REMOVAL');
    if (pkg.winnerCard === 'Lightning Helix') return 100;
    if (pkg.winnerCard === 'Torch the Tower') return 80;
    return 40;
  };

  const { optimizedState, initialScore, finalScore, improvementsMade } = LocalSearchOptimizer.optimize(initialState, evaluator);

  console.log(`\n✅ TEST 2: LocalSearchOptimizer Perturbations:`);
  console.log(`   - Initial Score: ${initialScore}`);
  console.log(`   - Final Score: ${finalScore}`);
  console.log(`   - Improvements Made: ${improvementsMade}`);

  const winnerCard = optimizedState.packages[0].winnerCard;
  if (winnerCard !== 'Lightning Helix') {
    throw new Error(`❌ Test Failure: LocalSearchOptimizer failed to swap winner to Lightning Helix, got ${winnerCard}`);
  }
  if (finalScore <= initialScore) {
    throw new Error('❌ Test Failure: LocalSearchOptimizer did not improve final score.');
  }

  // Test 3: Strategic Quality Benchmarks (Role Coverage & Replacement Robustness)
  console.log(`\n✅ TEST 3: Strategic Quality Benchmark Suite:`);
  const packages = optimizedState.packages;
  const roleCoverage = packages.length > 0 && packages.every(p => p.winnerCard && p.winnerCard.length > 0);
  const replacementRobustness = packages.every(p => p.alternatives.length > 0);

  console.log(`   - Role Coverage Satisfied: ${roleCoverage}`);
  console.log(`   - Replacement Robustness Satisfied: ${replacementRobustness}`);

  if (!roleCoverage || !replacementRobustness) {
    throw new Error('❌ Test Failure: Strategic Quality Benchmarks not satisfied.');
  }

  console.log('\n🎉 ALL BATTLEBOX v1.1 MATHEMATICAL MODEL TESTS PASSED SUCCESSFULLY!');
}

runTest();
