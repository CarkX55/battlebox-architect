/**
 * test_phase1_ir_and_ontology.js
 * Layer 1 & 2 Automated Unit Tests for IRs and Versioned Data-Driven Ontologies.
 */

import { CardSemanticProfile } from '../../src/judge/ir/CardSemanticProfile.js';
import { CapabilityVector } from '../../src/judge/ir/CapabilityVector.js';
import { Effect } from '../../src/judge/ir/Effect.js';
import { CapabilityOntology } from '../../src/judge/ontology/CapabilityOntology.js';
import { StrategyOntology } from '../../src/judge/ontology/StrategyOntology.js';
import { OntologyValidator } from '../../src/judge/ontology/OntologyValidator.js';

function runTests() {
  console.log('🧪 Starting Phase 1 Unit Tests (IRs & Ontologies)...');

  // Test 1: CardSemanticProfile Immutaibility & Versioning
  const profile = CardSemanticProfile.create(
    { name: 'Llanowar Elves', cmc: 1, colors: ['G'], type_line: 'Creature — Elf Druid' },
    { producesMana: true }
  );

  console.assert(profile.version === 1, 'CardSemanticProfile version should be 1');
  console.assert(profile.compatibleUntil === 2, 'CardSemanticProfile compatibleUntil should be 2');
  console.assert(profile.cardName === 'Llanowar Elves', 'CardName mismatch');
  console.assert(profile.physicalFacts.producesMana === true, 'Physical facts mismatch');

  let throwsOnEdit = false;
  try {
    profile.cardName = 'Mutated Elves';
  } catch (e) {
    throwsOnEdit = true;
  }
  console.assert(throwsOnEdit, 'CardSemanticProfile must be deeply frozen');
  console.log('✅ Test 1 Passed: CardSemanticProfile is immutable and versioned v1.');

  // Test 2: Effect Orthogonal Dimensions
  const effect = new Effect({
    lifetime: Effect.LIFETIMES.PERMANENT,
    latency: Effect.LATENCIES.IMMEDIATE,
    repeatability: Effect.REPEATABILITIES.INFINITE,
    scope: Effect.SCOPES.SELF,
    reliability: Effect.RELIABILITIES.CERTAIN
  });

  console.assert(effect.lifetime === 'Permanent', 'Effect lifetime mismatch');
  console.assert(effect.repeatability === 'Infinite', 'Effect repeatability mismatch');
  console.log('✅ Test 2 Passed: Effect dimensions instantiated correctly.');

  // Test 3: CapabilityVector Minimal IR
  const vector = new CapabilityVector({
    id: 'Llanowar_Elves_Vec',
    interfaces: ['ManaAcceleration'],
    effects: [effect],
    traits: ['Creature', 'Elf', 'OneDrop']
  });

  console.assert(vector.version === 1, 'CapabilityVector version should be 1');
  console.assert(vector.interfaces.includes('ManaAcceleration'), 'CapabilityVector interface missing');
  console.log('✅ Test 3 Passed: CapabilityVector minimal IR verified.');

  // Test 4: Pure Data Ontologies & OntologyValidator Startup Test
  const validationResult = OntologyValidator.validate();
  console.assert(validationResult.valid === true, 'Ontology validation failed');
  console.assert(validationResult.capabilityCount > 0, 'Capability count must be > 0');
  console.assert(validationResult.archetypeCount > 0, 'Archetype count must be > 0');
  console.log(`✅ Test 4 Passed: OntologyValidator startup check verified (${validationResult.capabilityCount} capabilities, ${validationResult.archetypeCount} archetypes).`);

  console.log('🎉 Phase 1 Unit Tests Completed Successfully!');
}

runTests();
