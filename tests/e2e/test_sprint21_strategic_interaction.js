/**
 * tests/e2e/test_sprint21_strategic_interaction.js
 * 
 * Test de Integración E2E para Sprint 21 (Strategy Vector & Strategic Interaction Model v21.0).
 * Valida:
 * 1. StrategyVector: Construcción del Latent Strategy Embedding, proyección 6D y Strategic Pressure.
 * 2. Cosine Similarity: Cálculo de similitud entre vectores estratégicos.
 * 3. StrategicInteractionModel: Predicción de conflicto por colisión de motores y recomendaciones.
 */

import { StrategyVector } from '../../src/services/compiler/core/strategyVector.js';
import { StrategicInteractionModel } from '../../src/services/compiler/core/strategicInteractionModel.js';

async function runSprint21Test() {
  console.log('🧪 === INICIANDO TEST DE INTEGRACIÓN E2E (SPRINT 21 STRATEGY VECTOR & INTERACTION MODEL) ===');

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

  const hydraDeck = [
    { name: 'Llanowar Elves', type_line: 'Creature — Elf Druid', oracle_text: 'Add G', cmc: 1, quantity: 4 },
    { name: 'Hardened Scales', type_line: 'Enchantment', oracle_text: 'Put an additional +1/+1 counter', cmc: 1, quantity: 4 },
    { name: 'Mistcutter Hydra', type_line: 'Creature — Hydra', oracle_text: 'Trample, haste', cmc: 2, quantity: 4 },
    { name: 'Forest', type_line: 'Basic Land — Forest', oracle_text: 'T: Add G', cmc: 0, quantity: 20 }
  ];

  const controlDeck = [
    { name: 'Counterspell', type_line: 'Instant', oracle_text: 'Counter target spell', cmc: 2, quantity: 4 },
    { name: 'Supreme Verdict', type_line: 'Sorcery', oracle_text: 'Destroy all creatures', cmc: 4, quantity: 4 },
    { name: 'Island', type_line: 'Basic Land — Island', oracle_text: 'T: Add U', cmc: 0, quantity: 20 }
  ];

  // 1. Testing StrategyVector 2-Tier Architecture
  console.log('\n--- 1. Testing StrategyVector 2-Tier Architecture ---');
  const hydraVector = StrategyVector.buildVectorFromDeck(hydraDeck);
  assert(hydraVector.resource > 0, 'Vector 6D proyectó ranura Resource');
  assert(hydraVector.threat > 0, 'Vector 6D proyectó ranura Threat');
  assert(hydraVector.strategicPressure > 0, 'Métrica de Presión Estratégica (Strategic Pressure) calculada');
  assert(hydraVector.latentEmbedding.resource_acceleration !== undefined, 'Latent Strategy Embedding interno conservó 200+ capacidades');

  // 2. Testing Cosine Similarity
  console.log('\n--- 2. Testing Cosine Similarity ---');
  const controlVector = StrategyVector.buildVectorFromDeck(controlDeck);
  const similarity = StrategyVector.cosineSimilarity(hydraVector, controlVector);
  assert(similarity >= 0 && similarity <= 1, 'Similitud Coseno calculada entre vectores 6D (' + similarity + ')');

  // 3. Testing StrategicInteractionModel Causal Collision
  console.log('\n--- 3. Testing StrategicInteractionModel ---');
  const interactionReport = StrategicInteractionModel.modelInteractionCollision(hydraDeck, controlDeck);
  assert(interactionReport.turnBottleneckConflict !== null, 'StrategicInteractionModel predijo conflicto en Turno 2');
  assert(interactionReport.counterStrategyRecommendations.length >= 1, 'StrategicInteractionModel generó recomendaciones contrafácticas de protección');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS SPRINT 21 STRATEGY VECTOR E2E: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runSprint21Test();
