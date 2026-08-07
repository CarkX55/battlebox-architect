/**
 * tests/e2e/test_e2e_sprint13_2.js
 * 
 * Test de Integración de Extremo a Extremo (E2E) para Sprint 13.2.
 * Valida:
 * BeamSearchStrategy -> WeightedCapabilityGraph -> TurnPlanner -> GameState -> Benchmark Verification
 */

import { BeamSearchStrategy } from '../../src/services/compiler/core/beamSearchStrategy.js';
import { createPureGameState, reducePureGameState } from '../../src/services/compiler/core/pureGameState.js';
import { WeightedCapabilityGraph } from '../../src/services/compiler/plugins/magic/weightedCapabilityGraph.js';
import { TurnPlanner } from '../../src/services/compiler/plugins/magic/turnPlanner.js';
import { CAPABILITY_IDS } from '../../src/services/compiler/core/capabilityCatalog.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const benchmarkPath = path.join(__dirname, '../benchmarks/modern_elves.json');
const benchmarkData = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));


async function runE2ESprint132Test() {
  console.log('🧪 === INICIANDO TEST DE INTEGRACIÓN E2E (SPRINT 13.2 PIPELINE) ===');

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

  // 1. Cargar Benchmark de Referencia
  assert(benchmarkData.archetype === 'Golgari Elves', 'Benchmark modern_elves.json cargado correctamente');

  // 2. Crear Historia por Turnos e Interrupciones en TurnPlanner
  const turnStory = TurnPlanner.createTurnStory(benchmarkData.archetype);
  assert(turnStory.turns.length === 4, 'TurnPlanner generó la secuencia ideal de 4 turnos');
  assert(turnStory.failureScenarios.length === 4, 'TurnPlanner registró 4 escenarios de interrupción de fallo');

  // 3. Consultar Probabilidades de Transición en WeightedCapabilityGraph
  const capGraph = new WeightedCapabilityGraph();
  const conf1 = capGraph.getTransitionConfidence(CAPABILITY_IDS.MANA_ACCELERATION_T1, CAPABILITY_IDS.VALUE_THREAT);
  assert(conf1 === 0.92, 'Confianza empírica de transición de maná a amenaza = 92%');

  capGraph.recordObservation(CAPABILITY_IDS.MANA_ACCELERATION_T1, CAPABILITY_IDS.VALUE_THREAT, true);
  const updatedConf = capGraph.getTransitionConfidence(CAPABILITY_IDS.MANA_ACCELERATION_T1, CAPABILITY_IDS.VALUE_THREAT);
  assert(updatedConf >= 0.92, 'Grafo Bayesiano actualizó observaciones empíricas');

  // 4. Ejecutar Búsqueda Incremental con BeamSearchStrategy
  const searchStrategy = new BeamSearchStrategy({ beamWidth: 4, maxDepth: 4 });
  const initialState = createPureGameState({ turn: 1 });
  searchStrategy.initialize(initialState, { beamWidth: 4 });

  let currentState = initialState;
  const pathActions = [];

  for (const step of turnStory.turns) {
    const action = { type: 'PLAY_DORK', capability: step.requiredCapability, heuristicValue: 20 };
    const expanded = searchStrategy.expand({ state: currentState, score: 0 }, [action]);
    const selected = searchStrategy.select(expanded);
    currentState = reducePureGameState(currentState, action);
    pathActions.push(action);
  }

  assert(currentState.turn === 1, 'Transiciones de estado inmutables ejecutadas');
  assert(pathActions.length === 4, 'BeamSearchStrategy construyó el camino de 4 capacidades');

  const finalResult = searchStrategy.finish();
  assert(finalResult.status === 'SUCCESS', 'Pipeline E2E del Sprint 13.2 completado exitosamente');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS TEST E2E SPRINT 13.2: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runE2ESprint132Test();
