/**
 * tests/unit/compiler/test_identity_firewall_contracts.js
 * 
 * Architectural Contract Test Suite: Identity-Driven Solver & Zero Identity Leakage Firewall.
 * Asserts:
 *   1. IdentityFirewall vetos non-identity cards (Voice of Victory, Dog Walker, Baylen, Toby, etc.) when compiling Naya Giants Aggro.
 *   2. SearchSpaceCompiler generates a restricted candidate universe strictly matching identity hard constraints.
 *   3. IdentityLeakageAuditor confirms 0% Identity Leakage.
 *   4. CompilerConvergencePipeline generates 0 leaked spell cards.
 */

import { IdentityFirewall } from '../../../src/services/compiler/core/identityFirewall.js';
import { SearchSpaceCompiler } from '../../../src/services/compiler/core/searchSpaceCompiler.js';
import { IdentityLeakageAuditor } from '../../../src/services/compiler/core/identityLeakageAuditor.js';
import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';

function runTest() {
  console.log('🧪 Running Architectural Contract Test Suite: Identity Firewall & Zero Leakage Solver...\n');

  const mockUIState = {
    format: 'Standard',
    colors: ['White', 'Red', 'Green'],
    archetype: 'Aggro',
    primaryTribe: 'Giants',
    mechanics: ['Stomp'],
    prompt: 'Naya Giants Aggro'
  };

  // Run full compiler convergence pipeline
  const result = CompilerConvergencePipeline.compileDeckFromScratch({
    userPrompt: 'Naya Giants Aggro',
    archetype: 'Aggro',
    format: 'Standard',
    uiFormState: mockUIState
  });

  const intentPackage = result.intentPackage;
  const deckIdentity = result.deckIdentity;
  const deckCards = result.state ? result.state.cards : [];

  console.log('✅ PASS 1: Full Compiler Convergence Pipeline Executed');
  console.log(`   - Archetype Key: ${deckIdentity.archetypeKey}`);
  console.log(`   - Required Primary Tribe: ${intentPackage.primaryTribe}`);

  // 1. Verify IdentityFirewall Direct Veto on Leaked Card Candidates
  console.log('\n🔒 Testing IdentityFirewall Direct Veto Rules:');
  const forbiddenCandidates = [
    { name: 'Voice of Victory', type_line: 'Creature — Human Soldier' },
    { name: 'Dog Walker', type_line: 'Creature — Human Disguise' },
    { name: 'Baylen, the Haymaker', type_line: 'Legendary Creature — Rabbit Mercenary', oracle_text: 'Create a 1/1 Offspring token.' },
    { name: 'Toby, Beastie Befriender', type_line: 'Legendary Creature — Human Wizard', oracle_text: 'Create a 4/4 Beast token.' }
  ];

  for (const card of forbiddenCandidates) {
    const veto = IdentityFirewall.validateCard(card, deckIdentity, intentPackage);
    console.log(`   ✔ "${card.name}" [${card.type_line}] -> Vetoed: ${!veto.isAllowed} (Reason: "${veto.vetoReason}")`);
    if (veto.isAllowed) {
      throw new Error(`❌ CONTRACT VIOLATION: IdentityFirewall failed to veto forbidden non-Giant card "${card.name}"`);
    }
  }
  console.log('✅ IdentityFirewall Hard Constraint Veto Verified (100% Non-Identity Cards Vetoed)');

  // 2. Verify SearchSpaceCompiler Pool Restriction
  const rawTestPool = [
    { name: 'Bonecrusher Giant', type_line: 'Creature — Giant Berserker' },
    { name: 'Giant Cindermaw', type_line: 'Creature — Giant Elemental' },
    { name: 'Brambleback Brute', type_line: 'Creature — Giant Berserker' },
    { name: 'Dog Walker', type_line: 'Creature — Human Disguise' },
    { name: 'Voice of Victory', type_line: 'Creature — Human Soldier' }
  ];

  const restricted = SearchSpaceCompiler.compileRestrictedPool(rawTestPool, deckIdentity, intentPackage);
  console.log(`\n🎯 SearchSpaceCompiler Pool Restriction (${rawTestPool.length} raw cards -> ${restricted.restrictedPool.length} restricted cards):`);
  for (const c of restricted.restrictedPool) {
    console.log(`   ✔ Accepted: ${c.name} [${c.type_line}]`);
  }

  if (restricted.restrictedPool.length !== 3 || restricted.restrictedPool.some(c => c.name === 'Dog Walker' || c.name === 'Voice of Victory')) {
    throw new Error('❌ CONTRACT VIOLATION: SearchSpaceCompiler allowed non-Giant cards into restricted pool');
  }
  console.log('✅ SearchSpaceCompiler Restricted Universe Verified');

  // 3. Verify Identity Leakage Auditor (0% Leakage)
  const audit = IdentityLeakageAuditor.audit(deckCards, deckIdentity, intentPackage);
  console.log(`\n🛡️ Permanent Identity Leakage Auditor:`);
  console.log(`   - Total Non-Land Spells: ${audit.totalSpellsCount}`);
  console.log(`   - Leaked Non-Identity Spells: ${audit.leakedSpellsCount}`);
  console.log(`   👉 Identity Leakage Percentage: ${audit.leakagePercentage}%`);

  if (audit.leakagePercentage !== 0 || !audit.isClean) {
    throw new Error(`❌ CONTRACT VIOLATION: Identity Leakage Percentage is ${audit.leakagePercentage}% (Expected 0%)`);
  }
  console.log('✅ 0% Identity Leakage Guaranteed (Zero Identity Leakage Verified)');

  console.log('\n🎉 ALL ARCHITECTURAL IDENTITY FIREWALL CONTRACT TESTS PASSED SUCCESSFULLY!');
}

runTest();
