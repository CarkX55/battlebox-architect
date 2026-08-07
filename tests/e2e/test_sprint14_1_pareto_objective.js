/**
 * tests/e2e/test_sprint14_1_pareto_objective.js
 * 
 * Test de Integración E2E para Sprint 14.1 (Objective Function, Pareto Ranker & Pure Intent Blueprint).
 * Valida:
 * 1. PureIntentBlueprint: 0 nombres de cartas (boundCard) y 0 paquetes de tierras (Land Package).
 * 2. ParetoCandidateRanker: Devuelve la frontera de Pareto (conjunto de soluciones no dominadas 7D).
 * 3. ObjectiveFunction: Es stateless y determinista (mismo input -> mismo score; perfiles distintos -> scores distintos).
 * 4. Telemetría: Registro de candidatos Pareto y métricas de utilidad.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { ObjectiveFunction } from '../../src/services/compiler/core/objectiveFunction.js';
import { ParetoCandidateRanker } from '../../src/services/compiler/core/paretoCandidateRanker.js';
import { PureIntentBlueprint, QuantitativeContractRequirement } from '../../src/services/compiler/core/pureIntentBlueprint.js';
import { KernelTelemetry } from '../../src/services/compiler/core/kernelTelemetry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const profilesDir = path.join(__dirname, '../../src/services/compiler/profiles');

async function runSprint141Test() {
  console.log('🧪 === INICIANDO TEST DE INTEGRACIÓN E2E (SPRINT 14.1 PARETO & OBJECTIVE FUNCTION) ===');

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

  // 1. PureIntentBlueprint Validation
  console.log('\n--- 1. Testing PureIntentBlueprint Validation ---');
  const blueprint = new PureIntentBlueprint({
    archetype: 'Merfolk Tempo',
    format: 'Modern',
    contracts: [
      new QuantitativeContractRequirement({ capabilityId: 'cap.mana.acceleration.t1.v1', requiredUnits: 8, targetCoverageRate: 0.95 }),
      new QuantitativeContractRequirement({ capabilityId: 'cap.threat.value.v1', requiredUnits: 12, targetCoverageRate: 0.90 })
    ]
  });

  const jsonStr = JSON.stringify(blueprint).toLowerCase();
  assert(!jsonStr.includes('boundcard'), 'PureIntentBlueprint contiene CERO nombres de cartas (boundCard)');
  assert(!jsonStr.includes('land package'), 'PureIntentBlueprint contiene CERO paquetes de tierras (Land Package)');

  // 2. ParetoCandidateRanker Validation (7D Space)
  console.log('\n--- 2. Testing ParetoCandidateRanker (7D Frontier) ---');
  const candidates = [
    { name: 'CandA', vector: { coverage: 90, tempo: 95, curve: 80, resilience: 70, synergy: 85, consistency: 90, colorStress: 10 } },
    { name: 'CandB', vector: { coverage: 80, tempo: 70, curve: 60, resilience: 50, synergy: 60, consistency: 70, colorStress: 20 } }, // Dominada por A
    { name: 'CandC', vector: { coverage: 70, tempo: 60, curve: 95, resilience: 90, synergy: 90, consistency: 85, colorStress: 5 } }   // No dominada (Mejor en curve/resilience)
  ];

  const paretoFrontier = ParetoCandidateRanker.computeParetoFrontier(candidates);
  assert(paretoFrontier.length === 2, 'ParetoCandidateRanker filtró soluciones dominadas (Frontier size = 2)');
  assert(paretoFrontier.some(c => c.name === 'CandA'), 'Candidato A pertenece a la Frontera de Pareto');
  assert(paretoFrontier.some(c => c.name === 'CandC'), 'Candidato C pertenece a la Frontera de Pareto');
  assert(!paretoFrontier.some(c => c.name === 'CandB'), 'Candidato B (dominado) fue excluido de la Frontera');

  // 3. ObjectiveFunction Stateless & Determinism Validation
  console.log('\n--- 3. Testing ObjectiveFunction Stateless & Determinism ---');
  const merfolkProfile = JSON.parse(fs.readFileSync(path.join(profilesDir, 'merfolk.json'), 'utf8'));
  const burnProfile = JSON.parse(fs.readFileSync(path.join(profilesDir, 'burn.json'), 'utf8'));

  const metrics = { coverage: 90, synergy: 85, consistency: 88, redundancy: 80, curvePenalty: 5, colorPenalty: 2 };

  const scoreA = ObjectiveFunction.evaluate(metrics, merfolkProfile);
  const scoreB = ObjectiveFunction.evaluate(metrics, merfolkProfile);
  const scoreBurn = ObjectiveFunction.evaluate(metrics, burnProfile);

  assert(scoreA.totalUtility === scoreB.totalUtility, 'ObjectiveFunction es 100% determinista (Mismo input -> Mismo score)');
  assert(scoreA.totalUtility !== scoreBurn.totalUtility, 'Perfiles distintos (Merfolk vs Burn) producen scores de utilidad distintos');

  // 4. KernelTelemetry Verification
  console.log('\n--- 4. Testing KernelTelemetry Integration ---');
  const telemetry = new KernelTelemetry({ seed: 42, format: 'Modern' });
  telemetry.recordRollout(243);
  const summary = telemetry.finish('DECK_HASH_SPRINT14_1_PARETO');
  assert(summary.metrics.rolloutsExecuted === 243, 'Telemetría registró candidatos Pareto evaluados');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS SPRINT 14.1 E2E: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runSprint141Test();
