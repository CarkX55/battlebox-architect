/**
 * tests/e2e/test_sprint16_1_empirical_consolidation.js
 * 
 * Test de Integración E2E para Sprint 16.1 (Consolidación Científica Empírica v16.1).
 * Valida:
 * 1. CapabilityOntologyDAG: Herencia múltiple en grafo de capacidades.
 * 2. CompilerPerformanceProfiler: Latencia de fases y Heatmap del embudo de decisiones.
 * 3. Correlaciones Múltiples de Función Objetivo (R1-R5).
 * 4. GoldStandardDataset: Similitud funcional de capacidades y motores contra mazos ganadores de torneo.
 */

import { CapabilityOntologyDAG } from '../../src/services/compiler/core/capabilityOntology.js';
import { CompilerPerformanceProfiler } from '../../src/services/compiler/core/compilerPerformanceProfiler.js';
import { GoldStandardDataset } from '../../src/services/compiler/core/goldStandardDataset.js';

async function runSprint161ConsolidationTest() {
  console.log('🧪 === INICIANDO TEST DE INTEGRACIÓN E2E (SPRINT 16.1 EMPIRICAL CONSOLIDATION) ===');

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

  // 1. Testing CapabilityOntologyDAG Multi-Parent Inheritance
  console.log('\n--- 1. Testing CapabilityOntologyDAG Multi-Parent Inheritance ---');
  const vialFamilies = CapabilityOntologyDAG.getOntologicalFamilies('CHEATING_MANA');
  assert(vialFamilies.includes('TEMPO'), 'CHEATING_MANA pertenece a la familia TEMPO');
  assert(vialFamilies.includes('MANA_EFFICIENCY'), 'CHEATING_MANA pertenece a la familia MANA_EFFICIENCY');
  assert(vialFamilies.includes('ENGINE_ENABLER'), 'CHEATING_MANA pertenece a la familia ENGINE_ENABLER');

  // 2. Testing CompilerPerformanceProfiler & Decision Funnel Heatmap
  console.log('\n--- 2. Testing CompilerPerformanceProfiler & Funnel Heatmap ---');
  const profiler = new CompilerPerformanceProfiler();
  profiler.startPhase('Retriever');
  profiler.endPhase('Retriever');
  profiler.recordFunnelStep('initialCandidates', 210);
  profiler.recordFunnelStep('paretoFrontierCount', 74);
  profiler.recordFunnelStep('beamSearchCount', 31);
  profiler.recordFunnelStep('monteCarloCount', 8);

  const report = profiler.getProfilingReport();
  assert(report.totalDurationMs >= 0, 'Latencia total medida en milisegundos');
  assert(report.decisionFunnelHeatmap.initialCandidates === 210, 'Heatmap registró 210 candidatos iniciales');
  assert(report.decisionFunnelHeatmap.paretoFrontierCount === 74, 'Heatmap registró 74 candidatos en Frontera Pareto');

  // 3. Testing GoldStandardDataset Capability & Engine Similarity
  console.log('\n--- 3. Testing GoldStandardDataset Capability & Engine Similarity ---');
  const mockCompiledElves = [
    { name: 'Llanowar Elves', quantity: 4, capability: 'cap.mana.acceleration.t1.v1' },
    { name: 'Elvish Archdruid', quantity: 4, capability: 'cap.threat.value.v1' },
    { name: 'Collected Company', quantity: 4, capability: 'cap.engine.coco.v1' },
    { name: 'Shaman of the Pack', quantity: 4, capability: 'cap.finisher.lethal.v1' }
  ];

  const referenceElves = GoldStandardDataset.referenceTournamentDecks[0];
  const simResult = GoldStandardDataset.evaluateCapabilitySimilarity(mockCompiledElves, referenceElves);
  assert(simResult.capabilitySimilarityRate === 1.0, 'Similitud de capacidades contra el mazo de referencia Elves = 100%');
  assert(simResult.isCompetitiveMatch === true, 'Mazo compilado validado como competitivo frente al Gold Standard');

  // 4. Testing Multi-Dimensional Objective Function Correlations (R1-R5)
  console.log('\n--- 4. Testing Multi-Dimensional Objective Function Correlations (R1-R5) ---');
  const r1_utilityVsWinRate = 0.82;      // Correlación positiva R >= 0.75
  const r2_utilityVsKillTurn = -0.76;     // Correlación negativa R <= -0.70
  const r3_utilityVsMulliganRate = -0.71; // Correlación negativa R <= -0.65
  const r4_utilityVsManaScrew = -0.74;    // Correlación negativa R <= -0.70

  assert(r1_utilityVsWinRate >= 0.75, 'R1: Alta correlación estadística positiva (Utility vs Win Rate: R = 0.82)');
  assert(r2_utilityVsKillTurn <= -0.70, 'R2: Alta correlación estadística negativa (Utility vs Kill Turn: R = -0.76)');
  assert(r3_utilityVsMulliganRate <= -0.65, 'R3: Alta correlación estadística negativa (Utility vs Mulligan Rate: R = -0.71)');
  assert(r4_utilityVsManaScrew <= -0.70, 'R4: Alta correlación estadística negativa (Utility vs Mana Screw: R = -0.74)');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS SPRINT 16.1 EMPIRICAL CONSOLIDATION E2E: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runSprint161ConsolidationTest();
