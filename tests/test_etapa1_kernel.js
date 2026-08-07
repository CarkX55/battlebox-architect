/**
 * tests/test_etapa1_kernel.js
 * 
 * Test de Verificación de Etapa 1 para BattleBox Strategic Kernel v11.
 * Valida:
 * 1. ExecutionContext (Infraestructura, Config, KnowledgeSnapshot)
 * 2. StrategicState (DeckState SSOT + Ephemeral ReasoningState)
 * 3. CompilationArtifacts (EvidenceLedger Append-only, Facts, Metrics, Timeline)
 * 4. StateQueryService & MetricsService (MTG Domain Queries)
 * 5. DeckService & InvariantEngine (Validate-Before-Apply & Abort de Invariantes Críticas)
 */

import { ExecutionContext } from '../src/services/compiler/executionContext.js';
import { StrategicState } from '../src/services/compiler/strategicStateClass.js';
import { CompilationArtifacts } from '../src/services/compiler/compilationArtifacts.js';
import { StateQueryService } from '../src/services/compiler/stateQueryService.js';
import { MetricsService } from '../src/services/compiler/metricsService.js';
import { InvariantEngine, loadStandardInvariants, INVARIANT_LEVEL } from '../src/services/compiler/invariantEngine.js';
import { DeckService } from '../src/services/compiler/deckService.js';

async function runEtapa1Tests() {
  console.log('🧪 === INICIANDO PRUEBAS DE VERIFICACIÓN ETAPA 1 (KERNEL V11) ===');

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

  // ─── TEST 1: ExecutionContext ──────────────────────────────────────────
  console.log('\n--- 1. Testing ExecutionContext ---');
  const execCtx = new ExecutionContext({ formato: 'Legacy BattleBox', arquetipo: 'Golgari Stompy' });
  assert(execCtx.compilationId.startsWith('CMP_'), 'compilationId generado con formato CMP_');
  assert(execCtx.config.format === 'Legacy BattleBox', 'Configuración de formato correcta');
  assert(execCtx.knowledgeSnapshot.knowledgeVersion === '11.0.0', 'KnowledgeSnapshot mandatory registrado');

  // ─── TEST 2: StrategicState ─────────────────────────────────────────────
  console.log('\n--- 2. Testing StrategicState ---');
  const state = new StrategicState({ formato: 'Legacy BattleBox', arquetipo: 'Golgari Stompy' });
  assert(state.version === 0, 'Versión inicial del estado es 0');
  assert(Array.isArray(state.deckState.slots), 'deckState integra slots de mazo');
  
  state.mutate(st => {
    st.reasoningState.userIntent = 'Stompy agresivo';
  });
  assert(state.version === 1, 'Mutación gobernada incrementa versión a 1');

  // ─── TEST 3: CompilationArtifacts & EvidenceLedger ─────────────────────
  console.log('\n--- 3. Testing CompilationArtifacts & EvidenceLedger ---');
  const artifacts = new CompilationArtifacts();
  const evidence = artifacts.addEvidence('MonteCarloSimulator', { winrate: 0.62 }, [{ statement: 'Mazo rápido' }]);
  assert(artifacts.evidenceLedger.length === 1, 'Evidence Ledger es append-only y almacena registro');
  assert(evidence.claims[0].statement === 'Mazo rápido', 'Claim asociado a la evidencia registrado');

  artifacts.addFact('MANA_SOURCE_COUNT', 12, 14, 0.95);
  assert(artifacts.facts.has('FACT_MANA_SOURCE_COUNT_' + Object.keys(Object.fromEntries(artifacts.facts))[0].split('_').pop()), 'Hecho tipado registrado en Blackboard');

  // ─── TEST 4: StateQueryService & MetricsService ────────────────────────
  console.log('\n--- 4. Testing StateQueryService & MetricsService ---');
  state.deckState.slots = [
    { name: 'Llanowar Elves', cmc: 1, role: 'ramp', quantity: 4, type_line: 'Creature — Elf Druid' },
    { name: 'Lightning Bolt', cmc: 1, role: 'removal', quantity: 4, type_line: 'Instant' },
    { name: 'Leatherback Baloth', cmc: 3, role: 'threat', power: '4', quantity: 4, type_line: 'Creature — Beast' }
  ];

  const query = new StateQueryService(state);
  assert(query.getManaAcceleration() === 4, 'Query detecta 4 aceleradores de maná (Llanowar Elves)');
  assert(query.getEarlyInteraction() === 4, 'Query detecta 4 hechizos de interacción temprana (Lightning Bolt)');
  
  const metrics = new MetricsService(state);
  assert(metrics.getRemovalDensity() === 0.33, 'MetricsService calcula la densidad de remoción (4/12 = 0.33)');

  // ─── TEST 5: DeckService & InvariantEngine (Validate-Before-Apply) ────
  console.log('\n--- 5. Testing DeckService & InvariantEngine (Validate-Before-Apply) ---');
  const eventBus = execCtx.eventBus;
  const invariantEngine = new InvariantEngine();
  loadStandardInvariants(invariantEngine);

  const deckService = new DeckService(state, eventBus, invariantEngine);

  // Intentar agregar una 5ª copia de Lightning Bolt (Debe ABORTAR por regla de max 4 copias)
  let exceptionThrown = false;
  try {
    const invalidCard = { name: 'Lightning Bolt', cmc: 1, quantity: 1, type_line: 'Instant' };
    deckService.bindCard(3, invalidCard, 'DEC_001');
  } catch (err) {
    exceptionThrown = true;
    assert(err.message.includes('PRE-VALIDATION ABORTED'), 'DeckService abortó correctamente por violar regla de 4 copias');
  }
  assert(exceptionThrown, 'Se lanzó excepción ante violaciones críticas de invariantes');

  // Asignar una carta válida que no viole invariantes
  const validCard = { name: 'Elvish Mystic', cmc: 1, quantity: 4, type_line: 'Creature — Elf Druid' };
  const bindSuccess = deckService.bindCard(3, validCard, 'DEC_002');
  assert(bindSuccess === true, 'DeckService asignó carta válida exitosamente');
  assert(state.deckState.slots[3].name === 'Elvish Mystic', 'El estado del mazo se actualizó correctamente');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS FINAL ETAPA 1: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runEtapa1Tests();
