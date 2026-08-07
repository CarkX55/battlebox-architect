/**
 * tests/unit/compiler/test_constraint_economics.js
 * 
 * Principle #7 Integration Test Suite: Constraint Economics & Strategic Tradeoff Transparency.
 * Asserts:
 *   1. ConstraintCostEvaluator quantifies the mathematical cost tax of each user constraint.
 *   2. TradeoffAnalyzer logs transparent strategic compromises (substitutions, impacts, confidence).
 *   3. ExecutionOptimizer evaluates ExecutionScore under 100% fixed IdentityFidelityScore.
 *   4. CompilerConvergencePipeline PASS 21 executes cleanly returning all reports.
 */

import { ConstraintCostEvaluator } from '../../../src/services/compiler/core/constraintCostEvaluator.js';
import { TradeoffAnalyzer } from '../../../src/services/compiler/core/tradeoffAnalyzer.js';
import { ExecutionOptimizer } from '../../../src/services/compiler/core/executionOptimizer.js';
import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';

function runTest() {
  console.log('🧪 Running Principle #7 Integration Test Suite: Constraint Economics & Tradeoffs...\n');

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

  console.log('✅ PASS 1: Compiler Convergence Pipeline Executed with Constraint Economics Auditor');

  // 1. Verify Constraint Cost Report
  const costReport = result.constraintCostReport;
  console.log(`\n📊 Constraint Economics Tax Ledger:`);
  for (const item of costReport.constraintCosts) {
    console.log(`   ✔ ${item.field.padEnd(16)} [${item.value}] ──► Tax: ${item.costPercentage}% | ${item.explanation}`);
  }
  console.log(`   👉 Total Constraint Tax: ${costReport.totalConstraintTax}%`);
  console.log(`   👉 Most Restrictive Constraint: [${costReport.mostRestrictiveConstraint.field} = ${costReport.mostRestrictiveConstraint.value}] (${costReport.mostRestrictiveConstraint.costPercentage}%)`);

  if (costReport.totalConstraintTax >= 0 || costReport.constraintCosts.length === 0) {
    throw new Error('❌ TEST FAILED: ConstraintCostEvaluator failed to compute mathematical constraint tax');
  }
  console.log('✅ Constraint Cost Evaluator Passed');

  // 2. Verify Tradeoff Report
  const tradeoffReport = result.tradeoffReport;
  console.log(`\n📋 Strategic Tradeoff Report (${tradeoffReport.overallConfidenceScore}% Confidence):`);
  for (const item of tradeoffReport.tradeoffs) {
    console.log(`   ✔ [${item.area}] ──► Compromise: "${item.compromise}" | Impact: ${item.impact}`);
  }

  if (!tradeoffReport || tradeoffReport.tradeoffs.length === 0) {
    throw new Error('❌ TEST FAILED: TradeoffAnalyzer failed to generate transparent tradeoff report');
  }
  console.log('✅ Tradeoff Analyzer Passed (Transparent Compromises Logged)');

  // 3. Verify Execution Report
  const execReport = result.executionReport;
  console.log(`\n🎯 Identity vs Execution Score Breakdown:`);
  console.log(`   - Identity Fidelity: ${execReport.identityFidelityScore}% (Fixed 100%)`);
  console.log(`   - Execution Score:   ${execReport.overallExecutionScore}%`);
  console.log(`   - Engine Completion: ${execReport.engineCompletionScore}%`);
  console.log(`   - Curve Completion:  ${execReport.curveCompletionScore}%`);
  console.log(`   - Interaction Score: ${execReport.interactionScore}%`);

  if (execReport.identityFidelityScore !== 100) {
    throw new Error(`❌ TEST FAILED: Identity Fidelity was modified by execution optimizer: got ${execReport.identityFidelityScore}%`);
  }
  console.log('✅ Execution Optimizer Passed (Identity 100% Fixed, Execution Optimized)');

  console.log('\n🎉 ALL PRINCIPLE #7 CONSTRAINT ECONOMICS & TRADEOFF TESTS PASSED SUCCESSFULLY!');
}

runTest();
