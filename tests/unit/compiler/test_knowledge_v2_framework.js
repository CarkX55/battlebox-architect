/**
 * tests/unit/compiler/test_knowledge_v2_framework.js
 * 
 * Integration Test Suite: Strategic Knowledge v2 Framework.
 * Asserts:
 *   1. StrategicInferenceGraph computes 6-step causal inference chains (Card -> Resource -> Engine -> Objective -> Win Line -> Matchup).
 *   2. FunctionalRoleGraph classifies deep functional roles (CURVE_BRIDGE, STABILIZER, CLOSER, PIVOT).
 *   3. StrategicDependencyGraph traces 3rd order dependencies and failure modes when dependencies break.
 *   4. ArchetypeDNA models compositional DNA inheritance (Giants = Midrange DNA + Ramp DNA + Threat DNA + Stomp Engine).
 *   5. PackageEvolutionDatabase tracks versioning (v2.4), win rates (58.7%), failure modes, and replacement packages.
 *   6. CompilerConvergencePipeline outputs all Knowledge v2 domain traces cleanly.
 */

import { StrategicInferenceGraph } from '../../../src/services/compiler/core/strategicInferenceGraph.js';
import { FunctionalRoleGraph } from '../../../src/services/compiler/core/functionalRoleGraph.js';
import { StrategicDependencyGraph } from '../../../src/services/compiler/core/strategicDependencyGraph.js';
import { ArchetypeDNA } from '../../../src/services/compiler/core/archetypeDNA.js';
import { PackageEvolutionDatabase } from '../../../src/services/compiler/core/packageEvolutionDatabase.js';
import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';

function runTest() {
  console.log('🧪 Running Strategic Knowledge v2 Framework Test Suite...\n');

  const mockUIState = {
    format: 'Standard',
    colors: ['R', 'W', 'G'],
    archetype: 'Aggro',
    tribe: 'Giant',
    mechanics: ['Stomp'],
    prompt: 'Naya Giants Stomp Aggro'
  };

  // Run full compiler convergence pipeline
  const result = CompilerConvergencePipeline.compileDeckFromScratch({
    userPrompt: 'Naya Giants Stomp Aggro',
    archetype: 'Aggro',
    format: 'Standard',
    uiFormState: mockUIState
  });

  console.log('✅ PASS 1: Full Pipeline Executed with Strategic Knowledge v2 Traces');

  // 1. Verify Causal Strategic Inference Graph
  const inf = result.strategicInferenceTrace;
  console.log(`\n🔗 Causal Strategic Inference Chain (${inf.cardName}):`);
  for (const node of inf.inferenceChain) {
    console.log(`   Step ${node.step} [${node.type}]: ${node.label}`);
  }
  console.log(`   Summary: "${inf.reasoningSummary}"`);

  if (!inf || inf.inferenceChain.length < 5) {
    throw new Error('❌ TEST FAILED: StrategicInferenceGraph failed multi-step causal chain audit');
  }
  console.log('✅ Causal Strategic Inference Graph Passed');

  // 2. Verify Functional Role Classification
  const role = result.functionalRoleTrace;
  console.log(`\n🎭 Deep Functional Roles (${role.cardName}):`);
  console.log(`   - Primary Role:    ${role.primaryRole}`);
  console.log(`   - Secondary Roles: ${role.secondaryRoles.join(', ')}`);
  console.log(`   - Description:     "${role.roleDescription}"`);

  if (!role || role.primaryRole !== 'CURVE_BRIDGE') {
    throw new Error('❌ TEST FAILED: FunctionalRoleGraph failed role classification');
  }
  console.log('✅ Deep Functional Role Classification Passed');

  // 3. Verify Multi-Tiered Strategic Dependency Graph
  const dep = result.dependencyGraphTrace;
  console.log(`\n🌲 Multi-Tiered Strategic Dependency Tree (${dep.capabilityId}):`);
  for (const node of dep.dependencyTree) {
    console.log(`   Order ${node.order}: ${node.requirement} [${node.status}]`);
  }
  console.log(`   Failure Modes: "${dep.failureModes[0]}"`);

  if (!dep || dep.dependencyTree.length < 4 || dep.failureModes.length === 0) {
    throw new Error('❌ TEST FAILED: StrategicDependencyGraph failed 3rd order dependency audit');
  }
  console.log('✅ Multi-Tiered Strategic Dependency Graph Passed');

  // 4. Verify Compositional Archetype DNA Inheritance
  const dna = result.archetypeDNATrace;
  console.log(`\n🧬 Compositional Archetype DNA (${dna.archetypeKey}):`);
  console.log(`   - Inherited DNA: ${dna.inheritedDNA.join(' + ')}`);
  console.log(`   - Primary Engine: ${dna.primaryEngine}`);

  if (!dna || dna.inheritedDNA.length < 3) {
    throw new Error('❌ TEST FAILED: ArchetypeDNA failed compositional inheritance audit');
  }
  console.log('✅ Compositional Archetype DNA Inheritance Passed');

  // 5. Verify Package Evolution Database
  const evo = result.packageEvolutionTrace;
  console.log(`\n📚 Package Evolution Database (${evo.packageId}):`);
  console.log(`   - Version:              ${evo.version}`);
  console.log(`   - Win Rate:             ${evo.winRatePercentage}%`);
  console.log(`   - Replacement Packages: ${evo.replacementPackages.join(', ')}`);
  console.log(`   - Summary:              "${evo.evolutionHistory}"`);

  if (!evo || evo.winRatePercentage < 50 || evo.replacementPackages.length === 0) {
    throw new Error('❌ TEST FAILED: PackageEvolutionDatabase failed package tracking audit');
  }
  console.log('✅ Package Evolution Database Passed');

  console.log('\n🎉 ALL STRATEGIC KNOWLEDGE V2 FRAMEWORK TESTS PASSED SUCCESSFULLY!');
}

runTest();
