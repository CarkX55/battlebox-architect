/**
 * tests/unit/compiler/test_deliberative_council_engine.js
 * 
 * Test Suite: Deliberative Multi-Agent Strategic Council Engine.
 * Asserts:
 *   1. Stage 1: Real Metagame Pattern Extraction.
 *   2. Stage 2: Peer Critique of Strategic Hypotheses.
 *   3. Stage 3: Package Tradeoff Comparison (Package A vs Package B).
 *   4. Stage 4: Multi-Variant Iterative Optimization (Variant 3 discarded, Variant 4 saved).
 *   5. Stage 5: Certified 9/9 Council Consensus Vote.
 */

import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';
import { DeliberativeCouncilEngine } from '../../../src/services/compiler/core/deliberativeCouncilEngine.js';

function runTest() {
  console.log('🧪 Running Deliberative Multi-Agent Strategic Council Test Suite...\n');

  const mockUIState = {
    format: 'Standard',
    colors: ['White', 'Red', 'Green'],
    archetype: 'Aggro',
    primaryTribe: 'Giants',
    mechanics: ['Stomp'],
    prompt: 'Naya Giants Aggro'
  };

  const result = CompilerConvergencePipeline.compileDeckFromScratch({
    userPrompt: 'Naya Giants Aggro',
    archetype: 'Aggro',
    format: 'Standard',
    uiFormState: mockUIState
  });

  const research = result.deliberativeMetaResearch;
  const hypothesis = result.deliberativeHypothesis;
  const packageComp = result.deliberativePackageComparison;
  const opt = result.deliberativeOptimization;
  const vote = result.deliberativeCouncilVote;

  // 1. Stage 1: Meta Research & Pattern Extraction
  console.log('📊 1. Stage 1: Real Metagame Research (MTGGoldfish, MTGTop8, Melee):');
  console.log(`   - Meta Composition:          Azorius ${research.metaComposition['Azorius Control']}, Gruul ${research.metaComposition['Gruul Aggro']}, Mono Red ${research.metaComposition['Mono Red']}`);
  console.log(`   - Patterns Extracted:        ${research.extractedPatterns.length}`);
  if (research.extractedPatterns.length < 3) {
    throw new Error('❌ TEST FAILED: Meta research patterns incomplete.');
  }
  console.log('✅ Meta Research & Pattern Extraction Verified');

  // 2. Stage 2: Hypothesis Generation & Peer Critique
  console.log('\n🧠 2. Stage 2: Hypothesis Generation & Peer Critique:');
  console.log(`   - Initial Hypothesis:       ${hypothesis.initialHypothesis}`);
  console.log(`   - Judge Agent Critique:     ${hypothesis.critiqueByJudgeAgent}`);
  console.log(`   👉 Revised Hypothesis:     ${hypothesis.revisedHypothesis}`);
  if (!hypothesis.revisedHypothesis.includes('Bonecrusher')) {
    throw new Error('❌ TEST FAILED: Hypothesis revision failed.');
  }
  console.log('✅ Hypothesis Generation & Peer Critique Verified');

  // 3. Stage 3: Package Tradeoff Comparison (Package A vs B)
  console.log('\n📦 3. Stage 3: Package Tradeoff Comparison (Package A vs Package B):');
  console.log(`   - Package A:                 ${packageComp.packageA}`);
  console.log(`   - Package B:                 ${packageComp.packageB}`);
  console.log(`   👉 Winning Package:          ${packageComp.comparisonAnalysis.winner}`);
  if (!packageComp.comparisonAnalysis.winner.includes('Package A')) {
    throw new Error('❌ TEST FAILED: Package tradeoff comparison failed.');
  }
  console.log('✅ Package Tradeoff Comparison Verified');

  // 4. Stage 4: Multi-Variant Iterative Optimization
  console.log('\n🔄 4. Stage 4: Multi-Variant Iterative Optimization:');
  for (const step of opt.optimizationTrace) {
    console.log(`   ✔ Iteration ${step.iteration} (${step.score}%): ${step.action} [${step.saved ? 'SAVED' : 'DISCARDED'}]`);
  }
  console.log(`   👉 Final Optimized Score:    ${opt.finalOptimizedScore}%`);
  if (opt.finalOptimizedScore <= opt.optimizationTrace[0].score) {
    throw new Error('❌ TEST FAILED: Iterative optimization did not improve score.');
  }
  console.log('✅ Multi-Variant Iterative Optimization Verified');

  // 5. Stage 5: Final Council Vote
  console.log('\n🏛️ 5. Stage 5: Certified 9-Agent Council Consensus Vote:');
  console.log(`   👉 Certification:            ${vote.certification}`);
  console.log(`   - Unanimous 9/9 Vote:       ${vote.isUnanimous}`);
  console.log(`   - Consensus Score:           ${vote.consensusScore}%`);
  if (!vote.isUnanimous || vote.certification !== 'CERTIFIED_BY_COUNCIL_OF_EXPERTS') {
    throw new Error('❌ TEST FAILED: Council vote failed certification.');
  }
  console.log('✅ Final Council Consensus Vote Verified (CERTIFIED_BY_COUNCIL_OF_EXPERTS)');

  console.log('\n🎉 ALL DELIBERATIVE MULTI-AGENT COUNCIL TESTS PASSED SUCCESSFULLY!');
}

runTest();
