/**
 * tests/test_etapa2_kernel_runtime.js
 * 
 * Test de Verificación de Etapa 2: Kernel Runtime Agnóstico & Pipeline por Adaptadores.
 * Valida:
 * 1. KernelPluginRegistry (Permisos ModuleCapabilities y Ordenación Topológica del DAG)
 * 2. ExecutionPlanner & ExecutionGraph
 * 3. KernelRuntime (Ejecución agnóstica de los 5 Bridge Adapters: Planner -> Ranker -> Judge -> Simulator -> Optimizer)
 * 4. Trazabilidad completa de eventos en CompilerEventBus
 */

import { ExecutionContext } from '../src/services/compiler/executionContext.js';
import { StrategicState } from '../src/services/compiler/strategicStateClass.js';
import { CompilationArtifacts } from '../src/services/compiler/compilationArtifacts.js';
import { KernelPluginRegistry } from '../src/services/compiler/kernelPluginRegistry.js';
import { KernelRuntime } from '../src/services/compiler/kernelRuntime.js';

import { PlannerBridgeAdapter } from '../src/services/compiler/adapters/plannerBridgeAdapter.js';
import { RankerBridgeAdapter } from '../src/services/compiler/adapters/rankerBridgeAdapter.js';
import { JudgeBridgeAdapter } from '../src/services/compiler/adapters/judgeBridgeAdapter.js';
import { SimulatorBridgeAdapter } from '../src/services/compiler/adapters/simulatorBridgeAdapter.js';
import { OptimizerBridgeAdapter } from '../src/services/compiler/adapters/optimizerBridgeAdapter.js';

async function runEtapa2Tests() {
  console.log('🧪 === INICIANDO PRUEBAS DE VERIFICACIÓN ETAPA 2 (KERNEL RUNTIME V11) ===');

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

  // ─── TEST 1: KernelPluginRegistry & Ordenación Topológica ────────────────
  console.log('\n--- 1. Testing KernelPluginRegistry & Topological DAG ---');
  const registry = new KernelPluginRegistry();

  const mockPoolSupplier = async () => [
    { name: 'Llanowar Elves', cmc: 1, role: 'ramp', quantity: 4, type_line: 'Creature — Elf Druid' },
    { name: 'Lightning Bolt', cmc: 1, role: 'removal', quantity: 4, type_line: 'Instant' },
    { name: 'Leatherback Baloth', cmc: 3, role: 'threat', power: '4', quantity: 4, type_line: 'Creature — Beast' },
    { name: 'Forest', cmc: 0, isBasicLand: true, quantity: 24, type_line: 'Basic Land — Forest' }
  ];

  // Registrar los 5 Bridge Adapters
  registry.registerModule(new PlannerBridgeAdapter());
  registry.registerModule(new RankerBridgeAdapter(mockPoolSupplier));
  registry.registerModule(new JudgeBridgeAdapter());
  registry.registerModule(new SimulatorBridgeAdapter(100));
  registry.registerModule(new OptimizerBridgeAdapter());

  const topologicalOrder = registry.getTopologicalExecutionOrder();
  assert(topologicalOrder.length === 5, 'Los 5 Bridge Adapters fueron registrados');
  assert(topologicalOrder[0].id === 'PlannerBridgeAdapter', 'Fase 1 resuelta topológicamente: Planner');
  assert(topologicalOrder[1].id === 'RankerBridgeAdapter', 'Fase 2 resuelta topológicamente: Ranker');
  assert(topologicalOrder[2].id === 'JudgeBridgeAdapter', 'Fase 3 resuelta topológicamente: Judge');
  assert(topologicalOrder[3].id === 'SimulatorBridgeAdapter', 'Fase 4 resuelta topológicamente: Simulator');
  assert(topologicalOrder[4].id === 'OptimizerBridgeAdapter', 'Fase 5 resuelta topológicamente: Optimizer');

  // ─── TEST 2: KernelRuntime Execution ────────────────────────────────────
  console.log('\n--- 2. Testing KernelRuntime Pipeline Execution ---');
  const execCtx = new ExecutionContext({ formato: 'Legacy BattleBox', arquetipo: 'Golgari Stompy', deckSize: 60 });
  const state = new StrategicState({ formato: 'Legacy BattleBox', arquetipo: 'Golgari Stompy', deckSize: 60 });
  const artifacts = new CompilationArtifacts();

  const runtime = new KernelRuntime(registry);
  const result = await runtime.runCompilationPipeline(execCtx, state, artifacts);

  assert(result.status === 'SUCCESS', 'Pipeline transaccional completado con éxito');
  assert(result.executedModules.length === 5, 'Se ejecutaron exactamente los 5 módulos en el DAG');
  assert(state.deckState.slots.length === 60, 'Mazo final balanceado exactamente a 60 slots');

  // ─── TEST 3: EventBus Traceability ──────────────────────────────────────
  console.log('\n--- 3. Testing EventBus Traceability & Events ---');
  const history = execCtx.eventBus.getHistory();
  assert(history.length >= 10, 'Historial de eventos registró la traza completa');
  
  const passStartedEvents = history.filter(e => e.type === 'PassStarted');
  assert(passStartedEvents.length >= 5, 'Eventos PassStarted emitidos por cada módulo');

  const compFinishedEvent = history.find(e => e.type === 'CompilationFinished');
  assert(compFinishedEvent !== undefined, 'Evento CompilationFinished emitido al finalizar');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS FINAL ETAPA 2: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runEtapa2Tests();
