/**
 * tests/test_etapa4_kernel_convergence.js
 * 
 * Test de Verificación de Etapa 4: Comandos Transaccionales & Política de Convergencia.
 * Valida:
 * 1. CompilerCommands (BindSlotCommand, RejectCandidateCommand con execute() y undo())
 * 2. CompilationHealth (Evaluación del vector de salud de mazo)
 * 3. ConvergencePolicy (Evaluación multicriterio de convergencia por estabilidad)
 */

import { StrategicState } from '../src/services/compiler/strategicStateClass.js';
import { BindSlotCommand, RejectCandidateCommand, RaiseCritiqueCommand } from '../src/services/compiler/compilerCommands.js';
import { evaluateCompilationHealth, ConvergencePolicy } from '../src/services/compiler/convergencePolicy.js';

async function runEtapa4Tests() {
  console.log('🧪 === INICIANDO PRUEBAS DE VERIFICACIÓN ETAPA 4 (COMANDOS & CONVERGENCIA V11) ===');

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

  // ─── TEST 1: CompilerCommands & Reversibilidad ────────────────────────────
  console.log('\n--- 1. Testing CompilerCommands & Undo ---');
  const state = new StrategicState({ formato: 'Legacy BattleBox', arquetipo: 'Golgari Stompy' });

  const cardA = { name: 'Llanowar Elves', cmc: 1, role: 'ramp', quantity: 1 };
  const bindCmd = new BindSlotCommand(0, cardA, 'DEC_001');

  bindCmd.execute(state);
  assert(state.deckState.slots[0].name === 'Llanowar Elves', 'BindSlotCommand aplicó la carta en el slot 0');
  assert(state.version === 1, 'Versión del estado incrementó a 1');

  bindCmd.undo(state);
  assert(state.deckState.slots[0] === null, 'BindSlotCommand undo() revirtió la mutación a null');
  assert(state.version === 2, 'Versión del estado incrementó a 2 tras el undo');

  const rejectCmd = new RejectCandidateCommand('Phyrexian Negator', 'Demasiada vulnerabilidad a daño directo');
  rejectCmd.execute(state);
  assert(state.reasoningState.rejectedCandidates.length === 1, 'RejectCandidateCommand registró el rechazo');
  rejectCmd.undo(state);
  assert(state.reasoningState.rejectedCandidates.length === 0, 'RejectCandidateCommand undo() eliminó el rechazo');

  // ─── TEST 2: CompilationHealth & ConvergencePolicy ────────────────────────
  console.log('\n--- 2. Testing CompilationHealth & ConvergencePolicy ---');
  state.deckState.slots = [
    { name: 'Forest', cmc: 0, isBasicLand: true, quantity: 24, type_line: 'Basic Land — Forest' },
    { name: 'Llanowar Elves', cmc: 1, role: 'ramp', quantity: 4, type_line: 'Creature — Elf Druid' },
    { name: 'Lightning Bolt', cmc: 1, role: 'removal', quantity: 4, type_line: 'Instant' },
    { name: 'Leatherback Baloth', cmc: 3, role: 'threat', power: '4', quantity: 4, type_line: 'Creature — Beast' }
  ];

  const health1 = evaluateCompilationHealth(state);
  assert(typeof health1.strategicEntropy === 'number', 'CompilationHealth calcula entropía de curva');
  assert(health1.brokenDependencies === 0, 'Cero dependencias críticas rotas');

  const policy = new ConvergencePolicy({ maxAllowedPasses: 4 });
  const checkInitial = policy.evaluateConvergence(null, health1, 1);
  assert(checkInitial.converged === false, 'Primera iteración no converge automáticamente');

  // Evaluar segunda iteración con métricas idénticas (debe converger por estabilidad)
  const health2 = evaluateCompilationHealth(state);
  const checkStable = policy.evaluateConvergence(health1, health2, 2);
  assert(checkStable.converged === true, 'Convergencia alcanzada por estabilidad (< 2% variación de métricas)');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS FINAL ETAPA 4: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runEtapa4Tests();
