/**
 * tests/e2e/test_sprint18_gameplan_reasoning.js
 * 
 * Test de Integración E2E para Sprint 18 (Game Plan Reasoning Engine & Counterfactual Optimization v18.0).
 * Valida:
 * 1. GamePlanGraph: Rutas del plan de juego alternativas (Plan A, B, C) y Structural Reliability.
 * 2. DeckExecutionSimulator: 500 simulaciones guiadas por decisiones, Execution Reliability %, desglose de fallos.
 * 3. CounterfactualOptimizer: Generación de hipótesis contrafácticas dirigidas y verificación empírica de ganancia.
 * 4. ThreatOntology: Cobertura SSOT integrada en CardIntelligenceEngine.
 */

import { GamePlanGraph } from '../../src/services/compiler/core/gamePlanGraph.js';
import { DeckExecutionSimulator } from '../../src/services/compiler/core/deckExecutionSimulator.js';
import { CounterfactualOptimizer } from '../../src/services/compiler/core/counterfactualOptimizer.js';
import { CardIntelligenceEngine } from '../../src/services/compiler/core/cardIntelligenceEngine.js';

async function runSprint18Test() {
  console.log('🧪 === INICIANDO TEST DE INTEGRACIÓN E2E (SPRINT 18 GAME PLAN REASONING ENGINE) ===');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASÓ: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FALLÓ: ${message}`);
      failed++;
    }
  }

  // 1. Testing GamePlanGraph Alternative Branching
  console.log('\n--- 1. Testing GamePlanGraph Alternative Branching ---');
  const graph = GamePlanGraph.projectGraph('Hydras');
  assert(graph.primaryBranch.length >= 3, 'GamePlanGraph proyectó la rama principal del plan de Hidras');
  assert(graph.alternativeBranches.length >= 1, 'GamePlanGraph proyectó ramas alternativas (Plan B)');

  const mockDeck = [
    { name: 'Llanowar Elves', type_line: 'Creature — Elf Druid', oracle_text: 'Add G', cmc: 1, quantity: 4 },
    { name: 'Hardened Scales', type_line: 'Enchantment', oracle_text: 'Put an additional +1/+1 counter', cmc: 1, quantity: 4 },
    { name: 'Mistcutter Hydra', type_line: 'Creature — Hydra', oracle_text: 'Trample, haste', cmc: 2, quantity: 4 },
    { name: 'Forest', type_line: 'Basic Land — Forest', oracle_text: 'T: Add G', cmc: 0, quantity: 20 }
  ];

  const structuralReport = graph.evaluateStructuralReliability(mockDeck);
  assert(structuralReport.structuralReliabilityScore >= 75, 'Fiabilidad Estructural (Structural Reliability) evaluada en >= 75%');

  // 2. Testing DeckExecutionSimulator Decision-Aware Playouts & Failure Analysis
  console.log('\n--- 2. Testing DeckExecutionSimulator ---');
  const simReport = DeckExecutionSimulator.simulateDeckExecution(mockDeck, graph, 500);
  assert(simReport.totalSimulations === 500, 'DeckExecutionSimulator ejecutó 500 simulaciones estocásticas');
  assert(simReport.executionReliabilityScore > 0, 'Fiabilidad de Ejecución (Execution Reliability) calculada empíricamente');
  assert(simReport.failureReasonBreakdown.manaScrew !== undefined, 'Desglose de causas de fallo (Failure Reason Breakdown) generado');

  // 3. Testing CounterfactualOptimizer Diagnosed Hypotheses Loop
  console.log('\n--- 3. Testing CounterfactualOptimizer ---');
  const optimizerResult = CounterfactualOptimizer.optimizeCounterfactual(mockDeck, graph);
  assert(optimizerResult.converged === true, 'CounterfactualOptimizer convergió tras probar hipótesis contrafácticas');
  assert(optimizerResult.finalExecutionReliability >= optimizerResult.initialExecutionReliability, 'Fiabilidad de ejecución final mayor o igual a la inicial');

  // 4. Testing ThreatOntology SSOT Integration
  console.log('\n--- 4. Testing ThreatOntology SSOT Integration ---');
  const profile = CardIntelligenceEngine.buildProfile({
    name: 'Wrath of God',
    type_line: 'Sorcery',
    oracle_text: 'Destroy all creatures. They cannot be regenerated.',
    cmc: 4
  });
  assert(profile.capabilities.includes('INTERACTION'), 'CardIntelligenceProfile registró rol de INTERACTION');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS SPRINT 18 GAME PLAN REASONING E2E: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runSprint18Test();
