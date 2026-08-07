/**
 * tests/unit/compiler/test_pure_gamestate.js
 * 
 * Test de Verificación Unitaria para PureGameState (Immutabilidad y Transiciones Puras).
 */

import { createPureGameState, reducePureGameState } from '../../../src/services/compiler/core/pureGameState.js';

async function runPureGameStateTests() {
  console.log('🧪 === INICIANDO PRUEBAS UNITARIAS: PureGameState ===');

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

  // 1. Verificar inmutabilidad de createPureGameState
  const state1 = createPureGameState({ turn: 1 });
  assert(Object.isFrozen(state1), 'state1 es un objeto inmutable congelado (Object.isFrozen)');
  assert(Object.isFrozen(state1.resources), 'state1.resources es inmutable');
  assert(Object.isFrozen(state1.boardState), 'state1.boardState es inmutable');

  let mutationAttemptFailed = false;
  try {
    state1.turn = 99;
  } catch (err) {
    mutationAttemptFailed = true;
  }
  assert(state1.turn === 1, 'Intento de mutación directa en state1 fue bloqueado');

  // 2. Verificar transición pura reducePureGameState
  const actionPlayDork = { type: 'PLAY_DORK', cardName: 'Llanowar Elves', cardPower: 1 };
  const state2 = reducePureGameState(state1, actionPlayDork);

  assert(state1.boardState.creatures.length === 0, 'state1 original no fue modificado tras el reducer');
  assert(state2.boardState.creatures.length === 1, 'state2 nuevo contiene el dork jugado');
  assert(state2.resources.dorksActive === 1, 'state2 incrementó dorksActive a 1');

  // 3. Verificar acción PASS_TURN
  const state3 = reducePureGameState(state2, { type: 'PASS_TURN' });
  assert(state3.turn === 2, 'state3 incrementó turno a 2');
  assert(state3.resources.manaAvailable === 3, 'state3 calcula maná disponible = turno (2) + dorks (1) = 3');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS PureGameState: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runPureGameStateTests();
