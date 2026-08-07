/**
 * tests/e2e/test_e2e_sprint13_1.js
 * 
 * Test de Integración de Extremo a Extremo (E2E) de Sprint 13.1.
 * Valida la tubería funcional completa:
 * Oracle -> Semantic Layer -> Capability -> Search Strategy -> Pure GameState Simulation -> Critics -> Repair -> AST -> Telemetry -> Deck
 */

import { COMPILER_VERSION } from '../../src/services/compiler/core/compilerVersion.js';
import { CapabilityContract, CritiqueResult, SimulationReport, RepairProposal } from '../../src/services/compiler/core/domainContracts.js';
import { createPureGameState, reducePureGameState } from '../../src/services/compiler/core/pureGameState.js';
import { HybridSearchStrategy } from '../../src/services/compiler/core/searchStrategy.js';
import { KernelTelemetry } from '../../src/services/compiler/core/kernelTelemetry.js';
import { ReasoningAST } from '../../src/services/compiler/core/reasoningAST.js';

import { SemanticKnowledgeLayer } from '../../src/services/compiler/plugins/magic/semanticKnowledgeLayer.js';
import { ScenarioContext } from '../../src/services/compiler/plugins/magic/scenarioContext.js';
import { AutoPluginLoader } from '../../src/services/compiler/plugins/magic/autoPluginLoader.js';

async function runE2ESprint131Test() {
  console.log('🧪 === INICIANDO TEST DE INTEGRACIÓN E2E (SPRINT 13.1 PIPELINE) ===');

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

  // 1. Inicializar Telemetría con Hashes Deterministas
  const telemetry = new KernelTelemetry({ seed: 100, searchStrategy: 'HybridSearchStrategy', format: 'Modern' });
  assert(telemetry.header.compilerVersion === COMPILER_VERSION.compiler, 'Telemetría iniciada con versión oficial');

  // 2. Extraer Nodos Semánticos Ricos desde Oracle DB
  const rawOracleCards = [
    { name: 'Llanowar Elves', type_line: 'Creature — Elf Druid', oracle_text: 'Add {G}.', cmc: 1, quantity: 4 },
    { name: 'Collected Company', type_line: 'Instant', oracle_text: 'Look at the top 6 cards...', cmc: 4, quantity: 4 },
    { name: 'Forest', type_line: 'Basic Land — Forest', isBasicLand: true, quantity: 24 }
  ];

  const semanticNodes = rawOracleCards.map(c => SemanticKnowledgeLayer.extractRichSemanticNode(c));
  assert(semanticNodes.length === 3, 'Capa Semántica procesó 3 cartas de prueba');
  assert(semanticNodes[1].dependencies.length > 0, 'Semantic Layer identificó dependencia rica en CoCo');

  // 3. Crear Contrato de Capacidad Tipado
  const capContract = new CapabilityContract({
    capabilityId: 'cap.mana.acceleration.t1.v1',
    targetUnits: 4,
    targetProbability: 0.90
  });
  assert(capContract.targetUnits === 4, 'Contrato de Capacidad tipado validado');

  // 4. Inicializar SearchStrategy y PureGameState
  const searchStrategy = new HybridSearchStrategy();
  const initialState = createPureGameState({ turn: 1 });
  searchStrategy.initialize(initialState, { beamWidth: 5 });

  // Simular acción en PureGameState reductor
  const actionState = reducePureGameState(initialState, { type: 'PLAY_DORK', cardName: 'Llanowar Elves', cardPower: 1 });
  telemetry.recordNodeExplored(1);
  telemetry.recordRollout(10);
  assert(actionState.boardState.creatures.length === 1, 'Transición de PureGameState redujo la acción correctamente');

  // 5. Cargar Plugins Dinámicos e Invocar Críticos bajo ScenarioContext
  const plugins = AutoPluginLoader.loadAllPlugins();
  const scenario = new ScenarioContext({ format: 'Modern', opponentArchetype: 'Mono Red Aggro' });
  const simReport = new SimulationReport({ recoveryRate: 0.65 }); // Provocar fallo en WrathCritic (< 0.70)

  const critiques = plugins.criticRegistry.evaluateAll(rawOracleCards, scenario, simReport);
  assert(critiques.length > 0, 'Crítico WrathCritic evaluó el escenario y detectó vulnerabilidad');

  // 6. Formular Reparación Justificada
  const failedCritique = critiques.find(c => !c.passed);
  const repairProposal = new RepairProposal({
    requiredCapability: new CapabilityContract({ capabilityId: 'cap.engine.recovery.v1', targetUnits: 2 }),
    justification: {
      criticId: failedCritique.criticId,
      metricName: failedCritique.metricName,
      currentValue: failedCritique.currentValue,
      targetValue: failedCritique.targetValue,
      reason: failedCritique.issue
    }
  });
  assert(repairProposal.justification.criticId === 'WrathCritic', 'Reparación formulada con justificación matemática explícita');

  // 7. Construir ReasoningAST y Renderizar a Markdown
  const sessionData = {
    macroGoal: 'Explosive Mana Ramp',
    targetTurn: 4,
    capabilities: [capContract],
    critiques: [failedCritique],
    status: 'REPAIRED_AND_ACCEPTED',
    utilityScore: 91.4
  };

  const ast = ReasoningAST.buildAST(sessionData);
  const markdownTrace = ReasoningAST.renderToMarkdown(ast);
  assert(markdownTrace.includes('[ReasoningRoot]'), 'AST de Razonamiento renderizó traza Markdown transparente');

  // 8. Finalizar Telemetría y Obtener Informe Completo
  const finalTelemetry = telemetry.finish('DECK_HASH_SPRINT13_1_OK');
  assert(finalTelemetry.metrics.deckHash === 'DECK_HASH_SPRINT13_1_OK', 'Informe final de telemetría consolidado');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS TEST E2E SPRINT 13.1: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runE2ESprint131Test();
