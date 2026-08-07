/**
 * tests/unit/compiler/test_beam_search.js
 * 
 * Test de Verificación Unitaria para BeamSearchStrategy (Inicialización, Expansión, Poda Beam y Selección).
 */

import { BeamSearchStrategy } from '../../../src/services/compiler/core/beamSearchStrategy.js';
import { createPureGameState } from '../../../src/services/compiler/core/pureGameState.js';

async function runBeamSearchTests() {
  console.log('🧪 === INICIANDO PRUEBAS UNITARIAS: BeamSearchStrategy ===');

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

  const strategy = new BeamSearchStrategy({ beamWidth: 3, maxDepth: 4 });
  const initialState = createPureGameState({ turn: 1 });

  const initRes = strategy.initialize(initialState, { beamWidth: 3 });
  assert(initRes.initialized === true, 'BeamSearchStrategy inicializado');
  assert(initRes.beamWidth === 3, 'beamWidth acotado a 3');

  // Expansión de 5 acciones
  const actions = [
    { type: 'PLAY_DORK', heuristicValue: 15 },
    { type: 'PLAY_LAND', heuristicValue: 5 },
    { type: 'PASS_TURN', heuristicValue: 0 },
    { type: 'CAST_SPELL', heuristicValue: 25 },
    { type: 'DISCARD', heuristicValue: -10 }
  ];

  const rootNode = strategy.beam[0];
  const expanded = strategy.expand(rootNode, actions);
  assert(expanded.length === 5, 'Expand devolvió 5 nodos descendientes');

  // Selección en Beam (Poda a Top 3)
  const selected = strategy.select(expanded);
  assert(selected.length === 3, 'Select acotó la frontera exactamente a los Top 3 candidatos por score');
  assert(selected[0].path[0].type === 'CAST_SPELL', 'Candidato Top 1 es CAST_SPELL (Score 25)');
  assert(selected[1].path[0].type === 'PLAY_DORK', 'Candidato Top 2 es PLAY_DORK (Score 15)');


  // Finalización de la búsqueda
  const result = strategy.finish();
  assert(result.status === 'SUCCESS', 'Búsqueda finalizada con éxito');
  assert(result.bestCandidate !== null, 'Mejor candidato conservado');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS BeamSearchStrategy: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runBeamSearchTests();
