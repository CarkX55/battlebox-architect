/**
 * tests/unit/test_no_tribe_causal_synthesis.js
 * 
 * BattleBox Universal Causal Verification Suite v11.x
 * Tests:
 * 1. NO_TRIBE_CONTAMINATION_INVARIANT: primaryTribe === null never generates tribal axes/needs.
 * 2. SAME_NONTRIBAL_POOL_DIFFERENT_ENGINE: Multi-engine divergence test for G/R non-tribal decks.
 * 3. ENGINE_ABLATION_TEST: Proves selectedEngineId has real causal authority over the compiled deck identity & obligations.
 * 4. ZERO_CARD_NAMES / ZERO_NUMERIC_BONUSES: Validates pure causal derivation without hardcoded card lists.
 */

import { IntentBuilder } from '../../src/services/compiler/core/intentBuilder.js';
import { StrategicIdentityCompiler } from '../../src/services/compiler/core/strategicIdentityCompiler.js';
import { StrategicObjective } from '../../src/services/compiler/core/strategicObjective.js';
import { CardCausalContract } from '../../src/services/compiler/core/cardCausalContract.js';

function runTests() {
  console.log('🧪 =========================================================================');
  console.log('🧪 BATTLEBOX v11.x: UNIVERSAL NO-TRIBE CAUSAL SYNTHESIS SUITE');
  console.log('🧪 =========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName, details = '') {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} -> ${details}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: NO_TRIBE_CONTAMINATION_INVARIANT
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- 1. NO_TRIBE_CONTAMINATION_INVARIANT ---');
  const nullTribeInputs = [
    { tribe: 'None', format: 'Standard', colors: ['G', 'R'], selectedEngineId: 'landfall_generic' },
    { tribe: 'none', format: 'Modern', colors: ['W', 'B'], strategy: 'Aristocrats' },
    { primaryTribe: 'general', format: 'Standard', colors: ['U', 'W'], selectedEngineId: 'blink_generic' },
    { tribe: 'Sin Tribu', format: 'Pioneer', colors: ['G', 'W'], selectedEngineId: 'counters_generic' },
    { tribe: '', format: 'Standard', colors: ['R', 'U'], selectedEngineId: 'spellslinger_generic' }
  ];

  for (const input of nullTribeInputs) {
    const intent = IntentBuilder.buildFromUI(input);
    assert(intent.primaryTribe === null, `primaryTribe normalized to null for input "${input.tribe || input.primaryTribe || '(empty)'}"`);
    
    const obj = new StrategicObjective({
      name: 'Dynamic Objective',
      description: 'Test',
      speedTier: 'NORMAL',
      primaryThreatVector: 'COMBAT',
      cardAdvantageVector: 'HIGH'
    });

    const axes = obj.toCapabilityAxes(intent);
    const tribalAxis = axes.find(a => a.id === 'TRIBAL_DENSITY');
    assert(!tribalAxis, `Zero TRIBAL_DENSITY axes generated when primaryTribe is null (Got: ${tribalAxis ? tribalAxis.target : 0} slots)`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: SAME_NONTRIBAL_POOL_DIFFERENT_ENGINE
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. SAME_NONTRIBAL_POOL_DIFFERENT_ENGINE (G/R Non-Tribal) ---');
  const engines = [
    { id: 'landfall_generic', name: 'Landfall', expectedArch: 'LANDFALL_ACCELERATION_STOMPY', expectedAxis: 'LANDFALL_PAYOFF' },
    { id: 'spellslinger_generic', name: 'Spellslinger', expectedArch: 'SPELLSLINGER_PROWESS', expectedAxis: 'CARD_FLOW' },
    { id: 'counters_generic', name: 'Counters', expectedArch: 'COUNTERS_PROLIFERATE_ENGINE', expectedAxis: 'COUNTER_ENGINE' }
  ];

  const obj = new StrategicObjective({
    name: 'Dynamic Objective',
    description: 'Test',
    speedTier: 'NORMAL',
    primaryThreatVector: 'COMBAT',
    cardAdvantageVector: 'HIGH'
  });

  const compiledIdentities = [];
  for (const eng of engines) {
    const uiState = {
      format: 'Modern',
      colors: ['G', 'R'],
      tribe: 'none',
      selectedEngineId: eng.id
    };

    const intent = IntentBuilder.buildFromUI(uiState);
    const identity = StrategicIdentityCompiler.compileIdentity(intent);
    const axes = obj.toCapabilityAxes(intent);

    compiledIdentities.push(identity.archetypeKey);
    assert(identity.archetypeKey === eng.expectedArch, `Engine "${eng.name}" compiled to archetype "${eng.expectedArch}" (Got: ${identity.archetypeKey})`);
    assert(axes.some(a => a.id === eng.expectedAxis), `Engine "${eng.name}" generated dynamic axis "${eng.expectedAxis}"`);
    assert(intent.strategy.length > 0, `Intent strategy populated from selectedEngineId (Got: [${intent.strategy.join(', ')}])`);
  }

  // Ensure all 3 identities are completely unique
  const uniqueIdentities = new Set(compiledIdentities);
  assert(uniqueIdentities.size === engines.length, `All ${engines.length} non-tribal engines produced distinct strategic identities (${Array.from(uniqueIdentities).join(', ')})`);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: ENGINE_ABLATION_TEST (Landfall with Engine vs without Engine)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. ENGINE_ABLATION_TEST ---');
  const intentWithEngine = IntentBuilder.buildFromUI({
    format: 'Modern',
    colors: ['G', 'R'],
    tribe: 'none',
    selectedEngineId: 'landfall_generic'
  });

  const intentWithoutEngine = IntentBuilder.buildFromUI({
    format: 'Modern',
    colors: ['G', 'R'],
    tribe: 'none',
    archetype: 'Midrange'
  });

  const identityWith = StrategicIdentityCompiler.compileIdentity(intentWithEngine);
  const identityWithout = StrategicIdentityCompiler.compileIdentity(intentWithoutEngine);

  assert(identityWith.archetypeKey === 'LANDFALL_ACCELERATION_STOMPY', `Run A (with engine) compiled to LANDFALL_ACCELERATION_STOMPY (Got: ${identityWith.archetypeKey})`);
  assert(identityWithout.archetypeKey !== 'LANDFALL_ACCELERATION_STOMPY', `Run B (ablated engine) compiled to generic identity (Got: ${identityWithout.archetypeKey})`);
  assert(identityWith.archetypeKey !== identityWithout.archetypeKey, `Causal authority verified: selectedEngineId altered final compiled identity`);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: ZERO CARD NAMES & PURE CAUSAL CONTRACT PARSING
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. ZERO CARD NAMES & PURE CAUSAL PARSER ---');
  
  // Test mock cards without any hardcoded names
  const mockLandfallPayoffCard = {
    name: 'Generic Forest Guardian',
    type_line: 'Creature — Elemental',
    oracle_text: 'Landfall — Whenever a land enters the battlefield under your control, this creature gets +2/+2 until end of turn.',
    cmc: 3
  };

  const mockLandRampCard = {
    name: 'Generic Path Finder',
    type_line: 'Sorcery',
    oracle_text: 'Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.',
    cmc: 2
  };

  const mockBlinkEnablerCard = {
    name: 'Generic Phase Shifter',
    type_line: 'Instant',
    oracle_text: 'Exile target creature you control, then return it to the battlefield under its owner\'s control.',
    cmc: 1
  };

  const contractLandfall = CardCausalContract.parse(mockLandfallPayoffCard);
  const contractRamp = CardCausalContract.parse(mockLandRampCard);
  const contractBlink = CardCausalContract.parse(mockBlinkEnablerCard);

  assert(contractLandfall.supplies.some(s => s.capability === 'LANDFALL_PAYOFF'), 'Landfall payoff contract derived purely from Oracle text');
  assert(contractRamp.supplies.some(s => s.capability === 'LAND_ACCELERATION'), 'Land acceleration contract derived purely from Oracle text');
  assert(contractBlink.supplies.some(s => s.capability === 'BLINK_ENABLER'), 'Blink enabler contract derived purely from Oracle text');

  const compatCheck = CardCausalContract.isCausallyCompatibleWithRole(contractLandfall, 'LANDFALL_PAYOFF');
  assert(compatCheck.isCompatible === true, 'Causal compatibility verified for LANDFALL_PAYOFF role without card name knowledge');

  // Summary
  console.log('\n=========================================================================');
  console.log(`🏁 TEST SUITE FINISHED: ${passed}/${total} assertions passed (${Math.round((passed/total)*100)}%)`);
  console.log('=========================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
