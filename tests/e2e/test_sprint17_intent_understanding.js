/**
 * tests/e2e/test_sprint17_intent_understanding.js
 * 
 * Test de Integración E2E para Sprint 17 (Intent Understanding Engine v17.2).
 * Valida:
 * 1. IntentUnderstandingEngine: Procesamiento neutro de preferencias humanas.
 * 2. IntentConfidenceScorer: Evaluación de riqueza y completitud del intent.
 * 3. ClarificationEngine: Generación de una sola pregunta guiada por reducción de incertidumbre.
 * 4. IntentToBlueprintBridge: Único traductor de preferencias humanas a parámetros v16.1.
 */

import { CanonicalUserIntentSpectrum } from '../../src/models/userIntentSpectrum.js';
import { IntentUnderstandingEngine } from '../../src/services/compiler/core/intentUnderstandingEngine.js';
import { IntentConfidenceScorer } from '../../src/services/compiler/core/intentConfidenceScorer.js';
import { ClarificationEngine } from '../../src/services/compiler/core/clarificationEngine.js';
import { IntentToBlueprintBridge } from '../../src/services/compiler/core/intentToBlueprintBridge.js';


async function runSprint17Test() {
  console.log('🧪 === INICIANDO TEST DE INTEGRACIÓN E2E (SPRINT 17 INTENT UNDERSTANDING ENGINE) ===');

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

  // 1. Testing IntentUnderstandingEngine Neutral Parsing
  console.log('\n--- 1. Testing IntentUnderstandingEngine Neutral Parsing ---');
  const rawInput = {
    primaryIdea: 'Jeskai Dragons',
    format: 'Modern',
    colors: ['U', 'R', 'W'],
    identityLock: 'STRICT',
    winMemory: 'HUGE_CREATURES',
    signatureCards: ['Dragonlord Ojutai'],
    hatedCards: ['Teferi, Time Raveler'],
    excludedMechanics: ['INFINITE_COMBO']
  };

  const intentSpectrum = IntentUnderstandingEngine.parseUserPreferences(rawInput);
  assert(intentSpectrum.primaryIdea === 'Jeskai Dragons', 'Intent Spectrum capturó la idea primaria "Jeskai Dragons"');
  assert(intentSpectrum.identityLock === 'STRICT', 'IdentityLock capturado como STRICT');
  assert(intentSpectrum.signatureCards.includes('Dragonlord Ojutai'), 'Signature Card "Dragonlord Ojutai" registrada');
  assert(intentSpectrum.hatedCards.includes('Teferi, Time Raveler'), 'Hated Card "Teferi, Time Raveler" registrada');

  // 2. Testing IntentConfidenceScorer
  console.log('\n--- 2. Testing IntentConfidenceScorer ---');
  const confidenceReport = IntentConfidenceScorer.calculateConfidence(intentSpectrum);
  assert(confidenceReport.confidenceScore >= 0.75, 'Intent Confidence Scorer calculó puntuación de alta confianza (>= 75%)');
  assert(confidenceReport.rating === 'HIGH_INTENT', 'Rating evaluado como HIGH_INTENT');

  // 3. Testing ClarificationEngine Uncertainty Reduction
  console.log('\n--- 3. Testing ClarificationEngine Uncertainty Reduction ---');
  const lowIntent = new CanonicalUserIntentSpectrum({ primaryIdea: 'weird graveyard deck', identityLock: 'SOFT', format: '' });
  const lowConfidenceReport = IntentConfidenceScorer.calculateConfidence(lowIntent);
  const questionResult = ClarificationEngine.generateUncertaintyReductionQuestion(lowIntent, lowConfidenceReport);
  assert(questionResult.needsQuestion === true, 'ClarificationEngine detectó necesidad de aclaración ante baja confianza');
  assert(questionResult.questionId === 'Q_IDENTITY_VS_POWER', 'ClarificationEngine generó UNA sola pregunta de máximo impacto para reducir incertidumbre');



  // 4. Testing IntentToBlueprintBridge Pure Neutral Mapping
  console.log('\n--- 4. Testing IntentToBlueprintBridge ---');
  const pureBlueprint = IntentToBlueprintBridge.mapIntentToPureBlueprint(intentSpectrum);
  assert(pureBlueprint.themeFidelityWeight === 1.0, 'Bridge mapeó IdentityLock STRICT a themeFidelityWeight = 1.0');
  assert(pureBlueprint.signatureCards.includes('Dragonlord Ojutai'), 'Bridge pasó Signature Cards al PureIntentBlueprint');

  // 5. Testing DesignIntentSatisfaction (DIS Metric)
  console.log('\n--- 5. Testing DesignIntentSatisfaction (DIS Metric) ---');
  const { DesignIntentSatisfaction } = await import('../../src/services/compiler/core/designIntentSatisfaction.js');
  const mockDeck = [
    { name: 'Dragonlord Ojutai', type_line: 'Creature — Dragon', quantity: 4 },
    { name: 'Thunderbreak Regent', type_line: 'Creature — Dragon', quantity: 4 }
  ];
  const disReport = DesignIntentSatisfaction.evaluateDIS(mockDeck, intentSpectrum);
  assert(disReport.disScore >= 80, 'DesignIntentSatisfaction (DIS) calculó coincidencia alta (>= 80%)');
  assert(disReport.rating === 'HIGH_MATCH' || disReport.rating === 'PERFECT_MATCH', 'Clasificación DIS de satisfacción verificada');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS SPRINT 17 INTENT UNDERSTANDING E2E: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runSprint17Test();

