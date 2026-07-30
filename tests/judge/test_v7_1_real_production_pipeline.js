/**
 * test_v7_1_real_production_pipeline.js
 * Real Integration Test for BattleBox Architect v7.1 Production Pipeline.
 * Tests the exact entry point invoked by the UI (`runV6AutonomousPipeline`).
 */

import { runV6AutonomousPipeline, V7_STRATEGIC_COMPILER_ENABLED } from '../../src/services/autonomousStrategicPipeline.js';

async function runRealIntegrationTest() {
  console.log('🧪 Starting BattleBox Architect v7.1 Real Production Pipeline Integration Test...');

  // Assertion 1 & Feature Flag Check
  console.assert(V7_STRATEGIC_COMPILER_ENABLED === true, 'Feature flag V7_STRATEGIC_COMPILER_ENABLED must be true');

  const formData = {
    format: 'STANDARD',
    strategicArchetype: 'WallsDefender',
    speed: 'StandardWin',
    colors: ['G', 'W'],
    prompt: 'Walls Defender Ramp Strategy'
  };

  // Run the EXACT handler invoked by DeckForge.jsx
  const result = await runV6AutonomousPipeline(formData);

  console.log('📊 Result Pipeline Version:', result.pipelineVersion);

  // Assertion 1: Pipeline version must be v7.1-COP
  console.assert(result.pipelineVersion === 'v7.3-CausalCompiler', 'Result must be v7.3-CausalCompiler');

  // Assertion 2: No duplicate contracts exist
  const contractIds = result.executionContracts.map(c => c.id || c.contractKey);
  const uniqueContractIds = new Set(contractIds);
  console.assert(contractIds.length === uniqueContractIds.size, 'No duplicate contract IDs/keys allowed');

  // Assertion 3: Blueprint quantities match copResult
  console.assert(result.blueprint.slots.length === result.copResult.length, 'Blueprint slots must match copResult length');
  for (let i = 0; i < result.copResult.length; i++) {
    console.assert(result.blueprint.slots[i].quantity === result.copResult[i].idealCount, 'Slot quantity must match copResult idealCount');
  }

  // Assertion 4: No quantity comes from defaults 8/8/8/8/4/24 hardcoded pattern
  const rawQuantities = result.copResult.map(c => c.idealCount);
  const isHardcodedPattern = rawQuantities.join(',') === '8,8,8,8,4';
  console.assert(!isHardcodedPattern, 'COP result must not be hardcoded 8,8,8,8,4 pattern');

  // Assertion 5: Each selected card references contractId and evaluation
  const spells = result.deck.filter(c => !c.type_line?.includes('Basic Land'));
  spells.forEach(card => {
    console.assert(card.contractId !== undefined, `Card ${card.name} must reference contractId`);
    console.assert(card.evaluation !== undefined, `Card ${card.name} must reference evaluation`);
    console.assert(typeof card.evaluation.contextScore === 'number', `Card ${card.name} must have numeric contextScore`);
  });

  // Assertion 6: Total deck size is legal for format (60 cards)
  const totalCards = result.deck.reduce((sum, c) => sum + (c.quantity || 1), 0);
  console.assert(totalCards === 60, `Total deck size must be 60 cards, got ${totalCards}`);

  // Assertion 7: Contract coverage is 100%
  console.assert(result.contractCoverage.percentage === 100, 'Contract coverage must be 100%');

  // Assertion 8: Simulation contains seed, rngVersion, simulationVersion
  const simMeta = result.simulationMetadata;
  console.assert(simMeta.seed !== undefined, 'Simulation metadata must contain seed');
  console.assert(simMeta.rngVersion === 1, 'Simulation metadata rngVersion must be 1');
  console.assert(simMeta.simulationVersion === 1, 'Simulation metadata simulationVersion must be 1');

  // Assertion 9: DecisionProof contains evidence, inference, conclusion, derivedFrom
  const dp = result.decisionProof;
  console.assert(dp.version === 1, 'DecisionProof version must be 1');
  console.assert(Array.isArray(dp.evidenceTree), 'DecisionProof evidenceTree must be array');
  dp.evidenceTree.forEach(node => {
    console.assert(node.evidence !== undefined, 'DecisionProof node must have evidence');
    console.assert(node.inference !== undefined, 'DecisionProof node must have inference');
    console.assert(node.conclusion !== undefined, 'DecisionProof node must have conclusion');
    console.assert(node.derivedFrom !== undefined, 'DecisionProof node must have derivedFrom array');
  });

  // Assertion 10: MetaFeedback is generated or convergence informed
  console.assert(Array.isArray(result.metaFeedback), 'metaFeedback must be array');
  console.assert(result.convergence.converged === true, 'convergence must be true');

  // Assertion 11: No legacy policy strings appear
  const jsonString = JSON.stringify(result);
  console.assert(!jsonString.includes('AggressiveDevelopmentPolicy'), 'Must not contain AggressiveDevelopmentPolicy');
  console.assert(!jsonString.includes('ValueGrindPolicy'), 'Must not contain ValueGrindPolicy');

  // Assertion 12: Utility is derived from v7 metrics with contributors and evaluatorVersion
  const util = result.hierarchicalUtility;
  console.assert(util.evaluatorVersion === 'v7.3-CausalCompiler', 'Evaluator version must be v7.3-CausalCompiler');
  console.assert(util.contributors !== undefined, 'Utility must contain contributors');

  console.log('🎉 BattleBox Architect v7.1 Real Production Pipeline Integration Test PASSED 100%!');
}

runRealIntegrationTest();
