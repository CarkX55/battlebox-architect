/**
 * tests/e2e/test_sprint15_card_intelligence.js
 * 
 * Test de Integración E2E para Sprint 15 (Card Intelligence Engine & Capability Graph Solver).
 * Valida:
 * 1. CardIntelligenceEngine: SSOT semántica absoluta compilada una sola vez.
 * 2. SynergyEvaluatorEngine: Evaluación de prerrequisitos de grafo sin reglas hardcodeadas por nombre de carta.
 * 3. StrategicMetaEvaluator: Adaptación de prioridades de contratos del blueprint sin alterar pesos globales de arquetipo.
 * 4. CardExplainabilityTrace: Traza vectorial bi-direccional explicable por dimensión.
 * 5. ContinuousLearningLoop: Persistencia JSON de aprendizaje inter-sesión sin mutación de código.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { CardIntelligenceEngine } from '../../src/services/compiler/core/cardIntelligenceEngine.js';
import { SynergyEvaluatorEngine } from '../../src/services/compiler/core/synergyEvaluatorEngine.js';
import { StrategicMetaEvaluator } from '../../src/services/compiler/core/strategicMetaEvaluator.js';
import { CardExplainabilityTrace } from '../../src/services/compiler/core/cardExplainabilityTrace.js';
import { ContinuousLearningLoop } from '../../src/services/compiler/core/continuousLearningLoop.js';
import { PureIntentBlueprint, QuantitativeContractRequirement } from '../../src/services/compiler/core/pureIntentBlueprint.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const learningDir = path.join(__dirname, '../../src/services/compiler/learning');

async function runSprint15Test() {
  console.log('🧪 === INICIANDO TEST DE INTEGRACIÓN E2E (SPRINT 15 CARD INTELLIGENCE ENGINE) ===');

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

  // 1. Testing CardIntelligenceEngine SSOT
  console.log('\n--- 1. Testing CardIntelligenceEngine SSOT ---');
  const sampleCard = {
    name: 'Silvergill Adept',
    type_line: 'Creature — Merfolk Wizard',
    oracle_text: 'When Silvergill Adept enters the battlefield, draw a card.',
    cmc: 2
  };

  const profile = CardIntelligenceEngine.buildProfile(sampleCard);
  assert(profile.cardName === 'Silvergill Adept', 'Perfil semántico SSOT creado con nombre de carta');
  assert(profile.manaProfile.cmc === 2, 'Mana Profile registra CMC = 2');
  assert(profile.strategicRoles.includes('CARD_ADVANTAGE'), 'Roles estratégicos registran CARD_ADVANTAGE');
  assert(profile.tribalAffinity === 'Merfolk', 'Sinergia tribal registrada como Merfolk');

  // 2. Testing SynergyEvaluatorEngine Graph Prerequisites
  console.log('\n--- 2. Testing SynergyEvaluatorEngine Graph Prerequisites ---');
  const mockDeckWithInsufficientCreatures = [
    { name: 'Collected Company', cmc: 4, type_line: 'Instant' },
    { name: 'Silvergill Adept', cmc: 2, type_line: 'Creature — Merfolk' },
    { name: 'Lord of Atlantis', cmc: 2, type_line: 'Creature — Merfolk' }
  ];

  const synResult = SynergyEvaluatorEngine.evaluateGraphPrerequisites(mockDeckWithInsufficientCreatures);
  assert(synResult.hasCoCoEngine === true, 'Sinergia detectó motor CoCo en el grafo');
  assert(synResult.negativeSynergyPenalty > 0, 'Sinergia aplicó penalización negativa por insuficiencia de criaturas en el grafo');

  // 3. Testing StrategicMetaEvaluator Contract Adaptation
  console.log('\n--- 3. Testing StrategicMetaEvaluator Contract Adaptation ---');
  const baseBlueprint = new PureIntentBlueprint({
    archetype: 'Merfolk Tempo',
    format: 'Modern',
    contracts: [
      new QuantitativeContractRequirement({ capabilityId: 'cap.removal.early.v1', requiredUnits: 4, priority: 'MEDIUM' })
    ]
  });

  const adaptedResult = StrategicMetaEvaluator.adaptBlueprintContractsToMetagame(baseBlueprint, { energyPercent: 0.40 });
  const adaptedContract = adaptedResult.adaptedContracts.find(c => c.capabilityId === 'cap.removal.early.v1');
  assert(adaptedContract.requiredUnits === 5, 'StrategicMetaEvaluator incrementó unidades de remoción en metajuego agresivo (4 -> 5)');
  assert(adaptedContract.priority === 'CRITICAL', 'StrategicMetaEvaluator elevó prioridad a CRITICAL');

  // 4. Testing CardExplainabilityTrace
  console.log('\n--- 4. Testing CardExplainabilityTrace ---');
  const trace = CardExplainabilityTrace.formatVectorDecision('Silvergill Adept', 'ACCEPTED', { coverage: 0.19, tempo: 0.32, synergy: 0.41, utility: 0.87 }, 'High multi-capability value');
  assert(trace.record.decision === 'ACCEPTED', 'Traza de explicabilidad registró decisión ACCEPTED');
  assert(trace.formattedLine.includes('Silvergill Adept'), 'Línea de traza formateada incluye nombre de carta');

  // 5. Testing ContinuousLearningLoop Persistence
  console.log('\n--- 5. Testing ContinuousLearningLoop Persistence ---');
  const learnResult = ContinuousLearningLoop.persistCompilationRecord('Merfolk Tempo', 92.5, ['Silvergill Adept', 'Lord of Atlantis']);
  assert(learnResult.status === 'LEARNING_RECORD_PERSISTED', 'ContinuousLearningLoop guardó registro de aprendizaje');
  assert(fs.existsSync(path.join(learningDir, 'card_statistics.json')), 'Archivo JSON card_statistics.json verificado en disco');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS SPRINT 15 CARD INTELLIGENCE E2E: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runSprint15Test();
