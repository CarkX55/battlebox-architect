/**
 * tests/e2e/test_sprint20_deck_dna.js
 * 
 * Test de Integración E2E para Sprint 20 (Emergent Strategy Grammar & Win Condition Reasoning v20.0).
 * Valida:
 * 1. EmergentStrategyGrammarEngine: Derivación emergente de 5 ranuras estructurales y cálculo de DNASimilarity.
 * 2. WinConditionReasoningEngine: Generación dinámica de cadenas causales de victoria sin archivos estáticos.
 */

import { EmergentStrategyGrammarEngine } from '../../src/services/compiler/core/emergentStrategyGrammarEngine.js';
import { WinConditionReasoningEngine } from '../../src/services/compiler/core/winConditionReasoningEngine.js';

async function runSprint20Test() {
  console.log('🧪 === INICIANDO TEST DE INTEGRACIÓN E2E (SPRINT 20 EMERGENT STRATEGY GRAMMAR & DECK DNA) ===');

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

  const mockDeck = [
    { name: 'Llanowar Elves', type_line: 'Creature — Elf Druid', oracle_text: 'Add G', cmc: 1, quantity: 4 },
    { name: 'Hardened Scales', type_line: 'Enchantment', oracle_text: 'Put an additional +1/+1 counter', cmc: 1, quantity: 4 },
    { name: 'Mistcutter Hydra', type_line: 'Creature — Hydra', oracle_text: 'Trample, haste', cmc: 2, quantity: 4 },
    { name: 'Forest', type_line: 'Basic Land — Forest', oracle_text: 'T: Add G', cmc: 0, quantity: 20 }
  ];

  // 1. Testing EmergentStrategyGrammarEngine
  console.log('\n--- 1. Testing EmergentStrategyGrammarEngine ---');
  const grammar = EmergentStrategyGrammarEngine.deriveEmergentGrammar(mockDeck);
  assert(grammar.resourceEngine.length >= 1, 'Gramática emergente clasificó ranura ResourceEngine');
  assert(grammar.threatEngine.length >= 1, 'Gramática emergente clasificó ranura ThreatEngine');
  assert(grammar.emergentDNASignature.includes('RESOURCE_ACCELERATION'), 'Firma Deck DNA emergente registró RESOURCE_ACCELERATION');

  const similarity = EmergentStrategyGrammarEngine.calculateDNASimilarity(
    { name: 'Birds of Paradise', type_line: 'Creature — Bird', oracle_text: 'Add one mana of any color', cmc: 1 },
    grammar.emergentDNASignature
  );
  assert(similarity > 0, 'Cálculo de similitud dinámica de Deck DNA evaluado con éxito');

  // 2. Testing WinConditionReasoningEngine Dynamic Causal Chains
  console.log('\n--- 2. Testing WinConditionReasoningEngine ---');
  const winReasoning = WinConditionReasoningEngine.reasonWinCondition(mockDeck, 'Hydras');
  assert(winReasoning.structuralAdvantage.length > 10, 'WinConditionReasoningEngine generó ventaja estructural dinámica');
  assert(winReasoning.failureModes.length >= 2, 'WinConditionReasoningEngine identificó modos de fallo de la estrategia');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS SPRINT 20 DECK DNA E2E: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runSprint20Test();
