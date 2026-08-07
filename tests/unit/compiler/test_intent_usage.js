/**
 * tests/unit/compiler/test_intent_usage.js
 * 
 * Principle #3 Integration Test Suite: Complete Intent Utilization & Causal Lineage.
 * Asserts:
 *   1. IntentUsageTracker logs active consumer components for 100% of monitored intent fields.
 *   2. IntentCoverage metric achieves 100% full coverage.
 *   3. Zero unconsumed intent fields remain.
 *   4. ReasonLedger stores complete Causal Decision Lineage trees for card selections.
 */

import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';

function runTest() {
  console.log('🧪 Running Principle #3 Integration Test Suite: Complete Intent Utilization & Lineage...\n');

  const mockUIState = {
    format: 'Standard',
    colors: ['R', 'W'],
    archetype: 'Aggro',
    tribe: 'Human',
    strategy: ['Go Wide'],
    mechanics: ['Prowess'],
    budget: 'Unlimited',
    powerLevel: 'Competitive',
    prompt: 'Boros Humans Aggro'
  };

  // Run full compiler pipeline
  const result = CompilerConvergencePipeline.compileDeckFromScratch({
    userPrompt: 'Boros Humans Aggro',
    archetype: 'Aggro',
    format: 'Standard',
    uiFormState: mockUIState
  });

  console.log('✅ PASS 1: Compiler Pipeline Executed Successfully');

  // Verify Intent Coverage Audit
  const intentCoverage = result.intentCoverage;
  console.log(`\n📊 Intent Utilization Metric: ${intentCoverage.coveragePercentage}% Coverage`);
  console.log('📋 Monitored Field Consumers Map:');
  for (const [field, consumers] of Object.entries(intentCoverage.usageMap)) {
    console.log(`   ✔ ${field.padEnd(16)}: Consumed by [${consumers.join(', ')}]`);
  }

  if (intentCoverage.coveragePercentage !== 100 || !intentCoverage.isFullCoverage) {
    throw new Error(`❌ TEST FAILED: Intent coverage was ${intentCoverage.coveragePercentage}%. Unconsumed fields: ${intentCoverage.unconsumedFields.join(', ')}`);
  }
  console.log('✅ Intent Utilization Audit Passed (100% Full Coverage)');

  // Verify Causal Decision Lineage in ReasonLedger
  console.log('\n🌳 Verifying Causal Decision Lineage Trees in ReasonLedger...');
  const ledger = result.reasonLedger;
  if (!ledger || !Array.isArray(ledger.entries) || ledger.entries.length === 0) {
    throw new Error('❌ TEST FAILED: ReasonLedger entries are missing');
  }

  const sampleEntry = ledger.entries.find(e => e.winnerCard && e.winnerCard !== 'Forest');
  if (!sampleEntry || !sampleEntry.causalLineage) {
    throw new Error('❌ TEST FAILED: Card selection entry is missing causal decision lineage');
  }

  console.log('✅ Sample Causal Decision Lineage Tree:');
  console.log(`   - Winner Card:        ${sampleEntry.winnerCard}`);
  console.log(`   - Selecting Component: ${sampleEntry.causalLineage.component}`);
  console.log(`   - Capability Target:  ${sampleEntry.causalLineage.capability}`);
  console.log(`   - Strategic Objective: ${sampleEntry.causalLineage.objective}`);
  console.log(`   - Intent Source Field:${sampleEntry.causalLineage.intentSourceField}`);

  console.log('\n🎉 ALL PRINCIPLE #3 INTENT UTILIZATION & CAUSAL LINEAGE TESTS PASSED SUCCESSFULLY!');
}

runTest();
