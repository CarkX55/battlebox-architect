/**
 * tests/e2e/test_sprint19_strategic_memory.js
 * 
 * Test de Integración E2E para Sprint 19 (Strategic Decision Memory & Evidence Validator v19.0).
 * Valida:
 * 1. StrategicKnowledgeValidator: Promoción científica basada en deltaGain >= 10% y muestra suficiente.
 * 2. StrategicMemoryEngine: Registro y consulta de evidencias causales reutilizables (no recetas de cartas).
 * 3. StrategicDecisionLog: Registro de explicabilidad evolutiva en CounterfactualOptimizer.
 * 4. Execution Distribution Curve: Curva de distribución de turnos en DeckExecutionSimulator.
 */

import { StrategicKnowledgeValidator } from '../../src/services/compiler/core/strategicKnowledgeValidator.js';
import { StrategicMemoryEngine } from '../../src/services/compiler/core/strategicMemoryEngine.js';
import { CounterfactualOptimizer } from '../../src/services/compiler/core/counterfactualOptimizer.js';
import { DeckExecutionSimulator } from '../../src/services/compiler/core/deckExecutionSimulator.js';
import { GamePlanGraph } from '../../src/services/compiler/core/gamePlanGraph.js';
import { CanonicalUserIntentSpectrum } from '../../src/models/userIntentSpectrum.js';

async function runSprint19Test() {
  console.log('🧪 === INICIANDO TEST DE INTEGRACIÓN E2E (SPRINT 19 STRATEGIC MEMORY ENGINE) ===');

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

  // 1. Testing StrategicKnowledgeValidator
  console.log('\n--- 1. Testing StrategicKnowledgeValidator ---');
  const validReport = StrategicKnowledgeValidator.validatePatternForPromotion({
    deltaGain: 17,
    validationCount: 3,
    confidence: 0.85
  });
  assert(validReport.promoted === true, 'StrategicKnowledgeValidator promovió patrón con deltaGain = +17% y muestra = 3');

  const invalidReport = StrategicKnowledgeValidator.validatePatternForPromotion({
    deltaGain: 3,
    validationCount: 1,
    confidence: 0.50
  });
  assert(invalidReport.promoted === false, 'StrategicKnowledgeValidator rechazó patrón anécdota con deltaGain bajo (+3%)');

  // 2. Testing StrategicMemoryEngine Evidentiary Persistence
  console.log('\n--- 2. Testing StrategicMemoryEngine Evidentiary Persistence ---');
  const recReport = StrategicMemoryEngine.recordEvidence({
    deckFamily: 'Hydra',
    format: 'Modern',
    problem: 'ADD_MANA_DORKS',
    causalCapabilityAction: 'INCREASE_MANA_ACCELERATION_DENSITY',
    deltaGain: 17,
    confidence: 0.85,
    validationCount: 3
  });
  assert(recReport.promoted === true, 'StrategicMemoryEngine registró y promovió evidencia de capacidad aceleradora');

  const patterns = StrategicMemoryEngine.queryLearnedCapabilityActions('Hydra', 'Modern');
  assert(patterns.length >= 1, 'StrategicMemoryEngine devolvió patrones causales aprendidos para la familia Hydra');

  // 3. Testing DeckExecutionSimulator Execution Distribution Curve
  console.log('\n--- 3. Testing Execution Distribution Curve ---');
  const mockDeck = [
    { name: 'Llanowar Elves', type_line: 'Creature — Elf Druid', oracle_text: 'Add G', cmc: 1, quantity: 4 },
    { name: 'Forest', type_line: 'Basic Land — Forest', oracle_text: 'T: Add G', cmc: 0, quantity: 20 }
  ];
  const graph = GamePlanGraph.projectGraph('Hydras');
  const simResult = DeckExecutionSimulator.simulateDeckExecution(mockDeck, graph, 300);
  assert(simResult.executionDistributionCurve.idealTurnT1T4Percentage !== undefined, 'DeckExecutionSimulator emitió curva de distribución de turnos');

  // 4. Testing CounterfactualOptimizer StrategicDecisionLog
  console.log('\n--- 4. Testing CounterfactualOptimizer StrategicDecisionLog ---');
  const bottleneckDeck = [
    { name: 'Llanowar Elves', type_line: 'Creature — Elf Druid', oracle_text: 'Add G', cmc: 1, quantity: 4 },
    { name: 'Forest', type_line: 'Basic Land — Forest', oracle_text: 'T: Add G', cmc: 0, quantity: 20 }
  ];

  const intentSpectrum = new CanonicalUserIntentSpectrum({ primaryIdea: 'Hydras', identityLock: 'STRICT' });
  const optResult = CounterfactualOptimizer.optimizeCounterfactual(bottleneckDeck, graph, intentSpectrum);
  assert(optResult.converged === true, 'CounterfactualOptimizer convergió exitosamente');
  assert(optResult.strategicDecisionLog.length >= 1, 'CounterfactualOptimizer registró el StrategicDecisionLog con justificación estratégica');


  console.log(`\n==================================================`);
  console.log(`RESULTADOS SPRINT 19 STRATEGIC MEMORY E2E: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runSprint19Test();
