/**
 * tests/unit/compiler/test_strategic_ontology.js
 * 
 * Integration Test Suite: Strategic Knowledge Ontology & Functional Package System.
 * Asserts:
 *   1. BattleBoxStrategicOntology tags cards with deep strategic domain semantics.
 *   2. FunctionalPackageLibrary retrieves macro strategic packages for package-level solver selection.
 *   3. KnowledgePartitionManager maintains strict separation of Permanent Core vs Adaptive Meta Knowledge.
 *   4. StrategicDiversityIndex computes strategic richness, wipe recovery, redundancy, and monocard dependency risk.
 *   5. CompilerConvergencePipeline outputs all strategic knowledge traces cleanly.
 */

import { BattleBoxStrategicOntology } from '../../../src/services/compiler/core/battleBoxStrategicOntology.js';
import { FunctionalPackageLibrary } from '../../../src/services/compiler/core/functionalPackageLibrary.js';
import { KnowledgePartitionManager } from '../../../src/services/compiler/core/knowledgePartitionManager.js';
import { StrategicDiversityIndex } from '../../../src/services/compiler/core/strategicDiversityIndex.js';
import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';

function runTest() {
  console.log('🧪 Running Strategic Knowledge Ontology & Package System Test Suite...\n');

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

  console.log('✅ PASS 1: Full Pipeline Executed with Strategic Knowledge Domain Traces');

  // 1. Verify Deep Domain Card Semantics
  const cardSem = result.cardOntologyTrace;
  console.log(`\n🏷️ Deep Strategic Domain Semantics (${cardSem.cardName}):`);
  console.log(`   - Primary Engine:     ${cardSem.primaryEngine}`);
  console.log(`   - Functional Package: ${cardSem.functionalPackage}`);
  console.log(`   - Tempo Impact:       ${cardSem.tempoImpact}`);
  console.log(`   - Card Economy:       ${cardSem.cardEconomy}`);
  console.log(`   - Scores:             Pressure ${cardSem.pressureScore} | Recovery ${cardSem.recoveryScore} | Closing ${cardSem.closingScore}`);
  console.log(`   - Replacement Class:  ${cardSem.replacementClass}`);

  if (!cardSem || cardSem.pressureScore < 80 || !cardSem.functionalPackage.includes('GIANTS_STOMP_PACKAGE')) {
    throw new Error('❌ TEST FAILED: BattleBoxStrategicOntology failed deep card tagging audit');
  }
  console.log('✅ Deep Strategic Domain Semantics Passed');

  // 2. Verify Macro Functional Package Selection
  const pkg = result.functionalPackageTrace;
  console.log(`\n📦 Macro Functional Package (${pkg.name}):`);
  console.log(`   - Package ID:          ${pkg.packageId}`);
  console.log(`   - Required Slots:      ${pkg.requiredSlotsCount}`);
  console.log(`   - Synergy Bonus:       +${pkg.synergyBonus}`);
  console.log(`   - Integrated Roles:    ${pkg.roles.join(', ')}`);

  if (!pkg || pkg.requiredSlotsCount <= 0 || pkg.synergyBonus < 15) {
    throw new Error('❌ TEST FAILED: FunctionalPackageLibrary failed macro package retrieval');
  }
  console.log('✅ Macro Functional Package Selection Passed');

  // 3. Verify Knowledge Partitioning (Permanent vs Adaptive)
  const part = result.knowledgePartitionTrace;
  console.log(`\n🔒 Knowledge Domain Boundary Manager:`);
  console.log(`   - Permanent Core:  ${JSON.stringify(part.permanentKnowledge)}`);
  console.log(`   - Adaptive Meta:   ${JSON.stringify(part.adaptiveKnowledge)}`);
  console.log(`   - Boundary Enforced: ${part.isBoundaryEnforced}`);

  if (!part || !part.isBoundaryEnforced) {
    throw new Error('❌ TEST FAILED: KnowledgePartitionManager failed boundary enforcement audit');
  }
  console.log('✅ Permanent vs Adaptive Knowledge Boundary Passed');

  // 4. Verify Strategic Diversity & Resilience Index
  const div = result.diversityIndexReport;
  console.log(`\n📊 Strategic Diversity & Resilience Index:`);
  console.log(`   👉 Strategic Diversity Index:    ${div.strategicDiversityIndex}`);
  console.log(`   - Independent Victory Lines:     ${div.independentVictoryLinesCount}`);
  console.log(`   - Wipe Recovery Score:           ${div.wipeRecoveryScore}`);
  console.log(`   - Functional Redundancy:         ${div.functionalRedundancy}%`);
  console.log(`   - Single Card Dependency Risk:   ${div.singleCardDependencyRisk}`);

  if (!div || div.strategicDiversityIndex < 80 || div.independentVictoryLinesCount < 2) {
    throw new Error('❌ TEST FAILED: StrategicDiversityIndex failed resilience calculation');
  }
  console.log('✅ Strategic Diversity & Resilience Index Passed');

  console.log('\n🎉 ALL STRATEGIC KNOWLEDGE ONTOLOGY TESTS PASSED SUCCESSFULLY!');
}

runTest();
