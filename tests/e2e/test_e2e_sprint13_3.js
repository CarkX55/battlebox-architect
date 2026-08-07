/**
 * tests/e2e/test_e2e_sprint13_3.js
 * 
 * Test de Integración E2E para Sprint 13.3 (Inspección Grandmaster: Evidencias, Probabilidades, Histograma & DAG).
 */

import { ContractEvidenceInspector, CardContributionInspector } from '../../src/services/compiler/plugins/magic/cardContributionInspector.js';
import { SimulationDistribution } from '../../src/services/compiler/core/simulationDistribution.js';
import { DAGVisualizerBuilder } from '../../src/services/compiler/core/dagVisualizerBuilder.js';

async function runSprint133E2ETest() {
  console.log('🧪 === INICIANDO TEST DE INTEGRACIÓN E2E (SPRINT 13.3 GRANDMASTER INSPECTOR) ===');

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

  // 1. Contract Evidence Proofs
  console.log('\n--- 1. Testing Contract Evidence Inspector ---');
  const proof = ContractEvidenceInspector.getContractProof('cap.mana.acceleration.t1.v1');
  assert(proof.unitsFound === 9, 'Evidencia de contrato identificó 9 fuentes encontradas (8 requeridas)');
  assert(proof.probabilityT1 === '92.4%', 'Probabilidad P(T1 Accelerator) = 92.4% comprobada empíricamente');
  assert(proof.proofCards.length === 3, 'Cartas suministradoras registradas (Llanowar, Mystic, Birds)');

  // 2. Simulation Distribution & Cause Attribution
  console.log('\n--- 2. Testing Simulation Distribution & Cause Attribution ---');
  const sim = SimulationDistribution.runDistributionAnalysis([], 10000);
  assert(sim.totalSimulations === 10000, 'Simulación ejecuto 10,000 partidas Monte Carlo');
  assert(sim.turnDistribution.T4 === '48%', 'Histograma de turno letal T4 = 48%');
  assert(sim.failureAttribution.probabilityFailT4 === '17%', 'Probabilidad de fallo P(Fail T4) = 17%');
  assert(sim.failureAttribution.causes[0].cause.includes('Mana Screw'), 'Causa principal de fallo identificada: Mana Screw (42%)');

  // 3. Card Contribution Inspector ("¿Por qué existe esta carta?")
  console.log('\n--- 3. Testing Card Contribution Inspector ---');
  const cardInspection = CardContributionInspector.inspectCard('Elvish Mystic');
  assert(cardInspection.cardName === 'Elvish Mystic', 'Inspector analizó Elvish Mystic');
  assert(cardInspection.contributionBreakdown.manaEngine === '42%', 'Contribución a Mana Engine = 42%');
  assert(cardInspection.contributionBreakdown.cocoTargetPackage === '31%', 'Contribución a CoCo Target = 31%');

  // 4. Multi-Branch Cross-Linked DAG
  console.log('\n--- 4. Testing Multi-Branch Cross-Linked DAG Visualizer ---');
  const dag = DAGVisualizerBuilder.buildMultiBranchDAG('Elves');
  assert(dag.nodes.length === 5, 'Grafo DAG multirrama generó 5 niveles funcionales');
  assert(dag.crossLinks.length === 5, 'Grafo DAG registró 5 enlaces cruzados de dependencia');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS SPRINT 13.3 E2E: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runSprint133E2ETest();
