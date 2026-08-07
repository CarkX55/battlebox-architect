/**
 * tests/test_etapa3_kernel_domain.js
 * 
 * Test de Verificación de Etapa 3: Razonamiento Estratégico & Conocimiento de Dominio.
 * Valida:
 * 1. StrategicKnowledgeLayer (7 Domain Providers + KnowledgeSnapshot mandatory)
 * 2. EvaluationService (Motor de Evaluación Multidimensional Enchufable)
 * 3. CompareStates (Deltas multidimensionales entre iteraciones de mazo)
 * 4. Claims-First Evidence Ledger & StrategicBlackboard desglosado
 */

import { StrategicState } from '../src/services/compiler/strategicStateClass.js';
import { CompilationArtifacts } from '../src/services/compiler/compilationArtifacts.js';
import { StrategicKnowledgeLayer } from '../src/services/compiler/knowledgeLayer.js';
import { EvaluationService } from '../src/services/compiler/evaluationService.js';

async function runEtapa3Tests() {
  console.log('🧪 === INICIANDO PRUEBAS DE VERIFICACIÓN ETAPA 3 (DOMINIO & EVALUACIÓN V11) ===');

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

  // ─── TEST 1: StrategicKnowledgeLayer ──────────────────────────────────────
  console.log('\n--- 1. Testing StrategicKnowledgeLayer ---');
  const skl = new StrategicKnowledgeLayer();
  assert(skl.snapshot.version === '11.0.0', 'KnowledgeSnapshot registrado');
  assert(skl.snapshot.providersCount === 7, '7 Proveedores de conocimiento especializados activos');

  const archetypeProvider = skl.getProvider('archetype');
  const aggroTaxonomy = archetypeProvider.getArchetypeTaxonomy('aggro');
  assert(aggroTaxonomy.speed === 'fast' && aggroTaxonomy.targetLethalTurn === 3.5, 'ArchetypeKnowledgeProvider entrega taxonomía correcta');

  const rulesProvider = skl.getProvider('rules');
  const banlist = rulesProvider.getFormatBanlist();
  assert(banlist.includes('Black Lotus'), 'RulesKnowledgeProvider entrega banlist oficial');

  // ─── TEST 2: EvaluationService & Evaluadores Enchufados ────────────────
  console.log('\n--- 2. Testing EvaluationService & Multidimensional Evaluators ---');
  const evalService = new EvaluationService();

  const stateA = new StrategicState({ formato: 'Legacy BattleBox', arquetipo: 'Golgari Stompy' });
  stateA.deckState.slots = [
    { name: 'Forest', cmc: 0, isBasicLand: true, quantity: 24, type_line: 'Basic Land — Forest' },
    { name: 'Leatherback Baloth', cmc: 3, role: 'threat', power: '4', quantity: 4, type_line: 'Creature — Beast' }
  ];

  const evalA = evalService.evaluateState(stateA);
  assert(typeof evalA.aggregateScore === 'number', 'EvaluationService calcula puntuación agregada');
  assert(evalA.evaluations.InteractionEvaluator !== undefined, 'Evaluador de Interacción ejecutado');
  assert(evalA.evaluations.TempoEvaluator !== undefined, 'Evaluador de Tempo ejecutado');

  // Crear estado B con mejor interacción y aceleración
  const stateB = new StrategicState({ formato: 'Legacy BattleBox', arquetipo: 'Golgari Stompy' });
  stateB.deckState.slots = [
    { name: 'Forest', cmc: 0, isBasicLand: true, quantity: 20, type_line: 'Basic Land — Forest' },
    { name: 'Llanowar Elves', cmc: 1, role: 'ramp', quantity: 4, type_line: 'Creature — Elf Druid' },
    { name: 'Lightning Bolt', cmc: 1, role: 'removal', quantity: 4, type_line: 'Instant' },
    { name: 'Leatherback Baloth', cmc: 3, role: 'threat', power: '4', quantity: 4, type_line: 'Creature — Beast' }
  ];

  const comparison = evalService.compareStates(stateA, stateB);
  assert(comparison.improved === true, 'CompareStates detecta correctamente que el Estado B superó al Estado A');
  assert(comparison.deltaScore > 0, `DeltaScore positivo detectado: +${comparison.deltaScore}`);

  // ─── TEST 3: EvidenceLedger & Claims ─────────────────────────────────────
  console.log('\n--- 3. Testing EvidenceLedger & Claims ---');
  const artifacts = new CompilationArtifacts();
  const evidence = artifacts.addEvidence('MonteCarloSimulator', { winrate: 0.68 }, [
    { id: 'CLM_001', statement: 'Curva de maná óptima en mano de 7', confidence: 0.92 },
    { id: 'CLM_002', statement: 'Interacción suficiente contra turn 1 threats', confidence: 0.88 }
  ]);

  assert(artifacts.evidenceLedger.length === 1, 'Evidence Ledger almacena registro de evidencia primaria');
  assert(evidence.claims.length === 2, '2 Claims generados a partir de la evidencia primaria');
  assert(evidence.claims[0].statement === 'Curva de maná óptima en mano de 7', 'Claim 1 verificado');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS FINAL ETAPA 3: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runEtapa3Tests();
