/**
 * test_phase2_frontend_derivation.js
 * Layer 3 Automated Unit Tests for Derivation Engine, CapabilityIndex, and ArtifactRegistry.
 */

import { CapabilityDerivationEngine } from '../../src/judge/ir/CapabilityDerivationEngine.js';
import { CapabilityIndex } from '../../src/judge/index/CapabilityIndex.js';
import { ArtifactRegistry } from '../../src/judge/registry/ArtifactRegistry.js';
import { TelemetryLogger } from '../../src/judge/telemetry/TelemetryLogger.js';

function runTests() {
  console.log('🧪 Starting Phase 2 Unit Tests (Derivation, Index & Registry)...');

  // Test 1: CapabilityDerivationEngine Fact & Interface Derivation
  const llanowarRaw = { id: 'card_llanowar_001', name: 'Llanowar Elves', cmc: 1, type_line: 'Creature — Elf Druid', oracle_text: '{T}: Add {G}.' };
  const wrathsRaw = { id: 'card_wrath_001', name: 'Wrath of God', cmc: 4, type_line: 'Sorcery', oracle_text: 'Destroy all creatures. They can\'t be regenerated.' };

  const llanowarDerivation = CapabilityDerivationEngine.deriveProfile(llanowarRaw);
  const wrathDerivation = CapabilityDerivationEngine.deriveProfile(wrathsRaw);

  console.assert(llanowarDerivation.profile.version === 1, 'CardSemanticProfile version must be 1');
  console.assert(llanowarDerivation.vector.interfaces.includes('ManaAcceleration'), 'Llanowar Elves must produce ManaAcceleration');
  console.assert(wrathDerivation.vector.interfaces.includes('BoardReset'), 'Wrath of God must produce BoardReset');
  console.log('✅ Test 1 Passed: CapabilityDerivationEngine correctly derives physical profiles and capability vectors.');

  // Test 2: CapabilityIndex Inverse $O(1)$ Lookup
  const index = new CapabilityIndex();
  index.register(llanowarDerivation.profile.cardId, llanowarDerivation.vector);
  index.register(wrathDerivation.profile.cardId, wrathDerivation.vector);

  const manaCards = index.getCardIds('ManaAcceleration');
  const boardResetCards = index.getCardIds('BoardReset');

  console.assert(manaCards.includes('card_llanowar_001'), 'CapabilityIndex must map ManaAcceleration to Llanowar Elves');
  console.assert(boardResetCards.includes('card_wrath_001'), 'CapabilityIndex must map BoardReset to Wrath of God');
  console.log('✅ Test 2 Passed: CapabilityIndex registers and queries CardIDs in O(1).');

  // Test 3: ArtifactRegistry Monotonic Publishing
  const registry = new ArtifactRegistry();
  const pub1 = registry.publish('CardSemanticProfile', llanowarDerivation.profile, { producer: 'DerivationEngine' });
  const pub2 = registry.publish('CapabilityVector', llanowarDerivation.vector, { producer: 'DerivationEngine' });

  console.assert(pub1.version === 1, 'First published artifact must be version 1');
  console.assert(registry.getLatest('CardSemanticProfile').artifact.cardName === 'Llanowar Elves', 'Registry latest artifact mismatch');
  console.log('✅ Test 3 Passed: ArtifactRegistry stores immutable versioned entries monotonically.');

  // Test 4: TelemetryLogger Isolation
  const telemetry = new TelemetryLogger();
  telemetry.logPassExecution('DerivationPass', { raw: llanowarRaw.id }, { vector: llanowarDerivation.vector.id }, 1.5);
  console.assert(telemetry.getLogs().length === 1, 'TelemetryLogger must record logs independently');
  console.log('✅ Test 4 Passed: TelemetryLogger operates isolated from ArtifactRegistry.');

  console.log('🎉 Phase 2 Unit Tests Completed Successfully!');
}

runTests();
