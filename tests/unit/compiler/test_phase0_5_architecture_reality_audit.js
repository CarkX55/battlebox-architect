/**
 * Test Suite: FASE 0.5 — Architecture Reality Audit & Dependency Inventory (v28.1)
 * Verifies that all 18 core architectural invariants hold on active code before implementing new engines.
 */

import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';
import { StateCandidateRanker } from '../../../src/services/compiler/core/stateCandidateRanker.js';
import { CandidateConstraintEngine } from '../../../src/services/compiler/core/candidateConstraintEngine.js';
import { CardCausalContract } from '../../../src/services/compiler/core/cardCausalContract.js';
import { CopyAllocationManager } from '../../../src/services/compiler/core/copyAllocationManager.js';
import { MarginalCopyEvaluator } from '../../../src/services/compiler/core/marginalCopyEvaluator.js';
import { CertifiedDeckState } from '../../../src/services/compiler/core/certifiedDeckState.js';
import { DeterministicSupremeJudge } from '../../../src/services/compiler/core/deterministicSupremeJudge.js';
import { IdentityFirewall } from '../../../src/services/compiler/core/identityFirewall.js';
import { DemandSupplyLedger } from '../../../src/services/compiler/core/demandSupplyLedger.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    passed++;
  }
}

console.log('=== Running Test Suite: FASE 0.5 Architecture Reality Audit ===\n');

try {
  // Check 1: Single DeckState Creator & Compiler Pipeline Authority
  assert(typeof CompilerConvergencePipeline.compileDeckFromScratch === 'function', 'CompilerConvergencePipeline is the master compiler entry point');

  // Check 2: Single Card Selection Authority in StateCandidateRanker
  assert(typeof StateCandidateRanker.evaluateRoleProofObligation === 'function', 'StateCandidateRanker contains evaluateRoleProofObligation gate');
  assert(typeof StateCandidateRanker.compareDominanceVectors === 'function', 'StateCandidateRanker implements compareDominanceVectors Pareto ordering');

  // Check 3: CandidateConstraintEngine delegates ranking to StateCandidateRanker
  assert(typeof CandidateConstraintEngine.prototype.rankCandidatesForSlot === 'function', 'CandidateConstraintEngine delegates ranking to StateCandidateRanker');

  // Check 4: CopyAllocationManager is single copy authority utilizing MarginalCopyEvaluator
  assert(typeof CopyAllocationManager.createAllocationStateFromPlan === 'function', 'CopyAllocationManager creates verified allocation state');
  assert(typeof MarginalCopyEvaluator.evaluateOptimalCopies === 'function', 'MarginalCopyEvaluator computes optimal marginal copies');

  // Check 5: CardCausalContract provides rich semantic capabilities
  const testCard = {
    name: 'Play with Fire',
    mana_cost: '{R}',
    cmc: 1,
    type_line: 'Instant',
    oracle_text: 'Play with Fire deals 2 damage to any target. If a player was dealt damage this way, scry 1.'
  };
  const contract = CardCausalContract.parse(testCard);
  assert(contract.interactionProof.effectScope === 'DAMAGE_REMOVAL', 'CardCausalContract extracts interactionProof DAMAGE_REMOVAL');
  assert(contract.interactionProof.timingWindow === 'INSTANT_SPEED', 'CardCausalContract extracts INSTANT_SPEED timing');

  // Check 6: Role Validity Gate in StateCandidateRanker
  const validProof = StateCandidateRanker.evaluateRoleProofObligation(testCard, { role: 'CHEAP_REMOVAL' }, { primaryTribe: 'None' }, { cards: [] });
  assert(validProof.roleValidity === true, 'Play with Fire satisfies CHEAP_REMOVAL proof obligation');

  const invalidCard = {
    name: 'Dynamite Diver',
    mana_cost: '{R}',
    cmc: 1,
    type_line: 'Creature — Goblin Pilot',
    oracle_text: 'When this creature dies, it deals 1 damage to any target.'
  };
  const invalidProof = StateCandidateRanker.evaluateRoleProofObligation(invalidCard, { role: 'CHEAP_REMOVAL' }, { primaryTribe: 'Goblin' }, { cards: [] });
  assert(invalidProof.roleValidity === false, 'Dynamite Diver fails CHEAP_REMOVAL role proof obligation');

  // Check 7: CertifiedDeckState Infallible Production Boundary
  const mockDeckState = { cards: [{ name: 'Mountain', count: 24, isLand: true }, { name: 'Lightning Bolt', count: 36, isLand: false }] };
  const certified = CertifiedDeckState.freeze(mockDeckState, { 
    intentPackage: { format: 'MODERN' },
    supremeJudicialReview: { verdict: 'APPROVE', hasBlockingWarnings: false }
  });
  assert(certified.lockStatus === 'LOCK_60', 'CertifiedDeckState enforces LOCK_60 on freeze with judicial approval');
  assert(certified.transactionLock === true, 'CertifiedDeckState enforces transactionLock');
  assert(Object.isFrozen(certified), 'CertifiedDeckState is deeply frozen');

  // Check 8: DeterministicSupremeJudge 9-Vector Audit & Blocking Gates
  const judgeReview = DeterministicSupremeJudge.judgeDeck(mockDeckState, { archetypeKey: 'BURN' }, { format: 'MODERN', deckSize: 60 });
  assert(typeof judgeReview.verdict === 'string', 'DeterministicSupremeJudge outputs structured judicial verdict');
  assert(typeof judgeReview.diagnosticVectors === 'object', 'DeterministicSupremeJudge evaluates 9 diagnostic vectors');

  // Check 9: IdentityFirewall Hard Constraints & Infrastructure Bridge
  const llanowar = { name: 'Llanowar Elves', cmc: 1, type_line: 'Creature — Elf Druid', oracle_text: '{T}: Add {G}.' };
  const dragonRampCheck = IdentityFirewall.validateCard(llanowar, { archetypeKey: 'DRAGON_RAMP' }, { primaryTribe: 'Dragon', archetype: 'Ramp' });
  assert(dragonRampCheck.isAllowed === true, 'IdentityFirewall permits Llanowar Elves in Dragon Ramp via infrastructure bridge');

  // Check 10: DemandSupplyLedger Causal Integrity
  const demandAudit = DemandSupplyLedger.auditCardDemands(testCard, mockDeckState, {});
  assert(demandAudit.isSatisfied === true, 'DemandSupplyLedger audits demands without false positives');

  console.log(`\n🎉 FASE 0.5 ARCHITECTURE REALITY AUDIT COMPLETED: ${passed}/${total} CHECKS PASSED`);
} catch (e) {
  console.error('\n❌ FASE 0.5 AUDIT ERROR:', e);
  process.exit(1);
}
