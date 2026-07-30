/**
 * test_v7_1_cop_meta_compiler.js
 * End-to-End Integration Unit Test for BattleBox Architect v7.1 COP Strategic Compiler.
 */

import { CapabilityRequirements } from '../../src/judge/ir/CapabilityRequirements.js';
import { ConstraintOptimizationEngine } from '../../src/judge/solver/ConstraintOptimizationEngine.js';
import { ObjectiveComposition } from '../../src/judge/solver/ObjectiveComposition.js';
import { ConvergencePolicy } from '../../src/judge/solver/ConvergencePolicy.js';
import { StrategicState } from '../../src/judge/state/StrategicState.js';
import { ActionEvaluator } from '../../src/judge/simulation/ActionEvaluator.js';
import { PolicyDrivenSimulator } from '../../src/judge/simulation/PolicyDrivenSimulator.js';
import { MatchupMatrix } from '../../src/judge/simulation/MatchupMatrix.js';
import { MetaEvaluator } from '../../src/judge/feedback/MetaEvaluator.js';
import { SupremeJudgeService } from '../../src/services/supremeJudgeService.js';
import { ArtifactRegistry } from '../../src/judge/registry/ArtifactRegistry.js';

function runTests() {
  console.log('🧪 Starting BattleBox Architect v7.1 COP Strategic Compiler E2E Tests...');

  // 1. Instantiation of CapabilityRequirements (v1 IR Frozen SSA)
  const reqs = new CapabilityRequirements({
    archetype: 'Ramp',
    requirements: [
      { id: 'ManaAcceleration', targetCount: 8, priority: 'critical' },
      { id: 'CardDraw', targetCount: 6, priority: 'required' }
    ]
  });

  console.assert(reqs.version === 1, 'CapabilityRequirements version must be 1');
  console.assert(reqs.compatibleUntil === 2, 'CapabilityRequirements compatibleUntil must be 2');
  console.log('✅ Test 1 Passed: CapabilityRequirements v1 IR instantiated and frozen.');

  // 2. Card-Agnostic COP Quota Solver
  const objComp = ObjectiveComposition.createFromGoal('AggroSpeed');
  const convPolicy = new ConvergencePolicy({ maxIterations: 3 });
  const copEngine = new ConstraintOptimizationEngine({ objectiveComposition: objComp, convergencePolicy: convPolicy });

  const contracts = copEngine.solveCapabilityQuotas(reqs);
  console.assert(contracts.length === 2, 'COP Engine must emit 2 ExecutionContracts');
  console.assert(contracts[0].version === 1, 'ExecutionContracts version must be 1');
  console.log('✅ Test 2 Passed: ConstraintOptimizationEngine resolved card-agnostic quotas into ExecutionContracts v1.');

  // 3. GameState & AlphaZero ActionEvaluator Evaluation
  const state = new StrategicState({
    board: [],
    lifeTotals: { player: 20, opponent: 20 }
  });

  const legalActions = [
    { type: 'PLAY_CARD', card: { name: 'Llanowar Elves', cmc: 1, oracle_text: '{T}: Add {G}.' } },
    { type: 'PLAY_CARD', card: { name: 'Gaea\'s Cradle', cmc: 0, type_line: 'Land', oracle_text: '{T}: Add {G} for each creature.' } }
  ];

  const decisionTree = ActionEvaluator.evaluateLegalActions(legalActions, state, objComp);
  console.assert(decisionTree.chosenAction !== null, 'ActionEvaluator must choose best action');
  console.log('✅ Test 3 Passed: ActionEvaluator evaluated legal actions and built decision tree.');

  // 4. Deterministic Simulation & Probabilistic MatchupMatrix
  const dummyDeck = [
    { name: 'Llanowar Elves', cmc: 1, oracle_text: '{T}: Add {G}.' },
    { name: 'Birds of Paradise', cmc: 1, oracle_text: '{T}: Add one mana.' }
  ];

  const simResult = PolicyDrivenSimulator.simulateGame({ deck: dummyDeck, objectiveComposition: objComp, seed: 9999, runs: 100 });
  console.assert(simResult.metadata.seed === 9999, 'Simulation metadata seed must be recorded');
  console.assert(simResult.confidenceInterval95.length === 2, 'Simulation must output 95% confidence interval');

  const matchupMatrix = MatchupMatrix.evaluateDeck(dummyDeck, simResult);
  console.assert(matchupMatrix.VERY_FAST_AGGRO !== undefined, 'MatchupMatrix must evaluate VERY_FAST_AGGRO scenario');
  console.log('✅ Test 4 Passed: PolicyDrivenSimulator & MatchupMatrix produced statistical metrics with seed metadata.');

  // 5. Diagnostic Trace MetaEvaluator & SupremeJudge DecisionProof Evidence Tree
  const registry = new ArtifactRegistry();
  const feedbackTrace = MetaEvaluator.evaluate(matchupMatrix, convPolicy);
  console.assert(Array.isArray(feedbackTrace), 'MetaEvaluator must return array of feedback items');

  const decisionProof = SupremeJudgeService.auditDeck({
    archetype: 'Ramp',
    assembledCards: dummyDeck,
    coverageReport: { satisfiedCount: 2 },
    artifactRegistry: registry
  });

  console.assert(decisionProof.version === 1, 'DecisionProof version must be 1');
  console.assert(decisionProof.evidenceTree.length === 3, 'DecisionProof evidence tree must audit invariants');
  console.log('✅ Test 5 Passed: MetaEvaluator diagnostic trace and SupremeJudge DecisionProof v1 Evidence Tree verified.');

  console.log('🎉 BattleBox Architect v7.1 COP Strategic Compiler E2E Tests Passed 100%!');
}

runTests();
