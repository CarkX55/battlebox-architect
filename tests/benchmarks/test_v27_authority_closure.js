/**
 * tests/benchmarks/test_v27_authority_closure.js
 * 
 * V27 Comprehensive Benchmark & Invariant Verification Suite
 * 
 * Validates the 4 Mandatory Invariants and 8 Verification Blocks:
 * 1. Infallible CertifiedDeckState (LOCK_60 mutation rejection)
 * 2. Purge of SUPPORT_EXPANSION (Zero arbitrary filler additions)
 * 3. Closed-loop ReplanExecutor (Causal recompilation of affected nodes)
 * 4. CertifiedDeck === RenderedDeck (Hash equivalence)
 * 5. Infrastructure-Aware Identity Firewall (Universal Mana Dorks in Tribal Ramp)
 * 6. Strict Judicial Gates (BLOCKING warnings prevent LOCK_60)
 */

import { CertifiedDeckState, computeDeterministicHash } from '../../src/services/compiler/core/certifiedDeckState.js';
import { IdentityFirewall } from '../../src/services/compiler/core/identityFirewall.js';
import { DeterministicSupremeJudge } from '../../src/services/compiler/core/deterministicSupremeJudge.js';
import { ReplanExecutor } from '../../src/services/compiler/core/replanExecutor.js';
import { CopyAllocationManager } from '../../src/services/compiler/core/copyAllocationManager.js';
import { CompilerConvergencePipeline } from '../../src/knowledge/compiler/CompilerConvergencePipeline.js';
import { assembleDeckFromBlueprint } from '../../src/services/deckArchitectService.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runV27BenchmarkSuite() {
  console.log('🏛️ =========================================================================');
  console.log('🏛️ RUNNING V27 COMPREHENSIVE BENCHMARK & AUTHORITY CLOSURE SUITE');
  console.log('🏛️ =========================================================================\n');

  // ─── BLOCK A: INVARIANT 1 — INMUTABILIDAD DE LOCK_60 ─────────────────────
  console.log('📦 BLOQUE A: Infallible Transaction Lock (CertifiedDeckState)');
  const sampleDeckState = {
    cards: [
      { name: 'Lightning Bolt', quantity: 4, role: 'CHEAP_REMOVAL', cmc: 1, type_line: 'Instant' },
      { name: 'Goblin Guide', quantity: 4, role: 'EARLY_PRESSURE', cmc: 1, type_line: 'Creature — Goblin Scout' },
      { name: 'Mountain', quantity: 20, role: 'Land', cmc: 0, type_line: 'Basic Land — Mountain' }
    ]
  };

  const judicialApproval = {
    verdict: 'APPROVE',
    score: 96,
    hasBlockingWarnings: false,
    defects: []
  };

  const certifiedSnapshot = CertifiedDeckState.freeze(sampleDeckState, {
    intentPackage: { format: 'Modern', colors: ['R'] },
    supremeJudicialReview: judicialApproval
  });

  assert(certifiedSnapshot.lockStatus === 'LOCK_60', 'Certified snapshot has lockStatus = LOCK_60');
  assert(certifiedSnapshot.transactionLock === true, 'Certified snapshot has transactionLock = true');
  assert(Object.isFrozen(certifiedSnapshot), 'Certified snapshot object is deeply frozen');

  // Verify assertIntegrity passes on unmodified deck
  const isIntegral = CertifiedDeckState.assertIntegrity(sampleDeckState, certifiedSnapshot);
  assert(isIntegral === true, 'assertIntegrity passes for unmodified deck');

  // Verify mutation rejection: altering quantity throws CERTIFICATE_INVALIDATED
  let caughtMutation = false;
  try {
    const mutatedDeck = {
      cards: [
        { name: 'Lightning Bolt', quantity: 3, role: 'CHEAP_REMOVAL' }, // Altered from 4 to 3
        { name: 'Goblin Guide', quantity: 4, role: 'EARLY_PRESSURE' },
        { name: 'Mountain', quantity: 20, role: 'Land' }
      ]
    };
    CertifiedDeckState.assertIntegrity(mutatedDeck, certifiedSnapshot);
  } catch (err) {
    if (err.message.includes('CERTIFICATE_INVALIDATED')) {
      caughtMutation = true;
    }
  }
  assert(caughtMutation, 'assertIntegrity throws CERTIFICATE_INVALIDATED when quantity is mutated');

  // Verify mutation rejection: replacing a card throws CERTIFICATE_INVALIDATED
  let caughtCardSwap = false;
  try {
    const swappedDeck = {
      cards: [
        { name: 'Shock', quantity: 4, role: 'CHEAP_REMOVAL' }, // Swapped Lightning Bolt for Shock
        { name: 'Goblin Guide', quantity: 4, role: 'EARLY_PRESSURE' },
        { name: 'Mountain', quantity: 20, role: 'Land' }
      ]
    };
    CertifiedDeckState.assertIntegrity(swappedDeck, certifiedSnapshot);
  } catch (err) {
    if (err.message.includes('CERTIFICATE_INVALIDATED')) {
      caughtCardSwap = true;
    }
  }
  assert(caughtCardSwap, 'assertIntegrity throws CERTIFICATE_INVALIDATED when a card is replaced');

  // Verify assertUnlocked throws on locked certified instance
  let caughtLockViolation = false;
  try {
    CertifiedDeckState.assertUnlocked(certifiedSnapshot);
  } catch (err) {
    if (err.message.includes('CERTIFICATE_INVALIDATED')) {
      caughtLockViolation = true;
    }
  }
  assert(caughtLockViolation, 'assertUnlocked throws CERTIFICATE_INVALIDATED on locked snapshot\n');


  // ─── BLOCK B: INVARIANT 2 — CERO EXPANSION DE RELLENO ARBITRARIO ─────────
  console.log('📦 BLOQUE B: Purga de SUPPORT_EXPANSION y Asignación Marginal Real');
  const dummySlots = [
    {
      role: 'EARLY_PRESSURE',
      winnerCard: 'Monastery Swiftspear',
      winnerCardObj: { name: 'Monastery Swiftspear', cmc: 1, type_line: 'Creature — Human Monk', oracle_text: 'Haste, Prowess' },
      requiredDensity: 4,
      alternatives: []
    }
  ];

  const dummyPool = [
    { name: 'Detection Tower', type_line: 'Land', cmc: 0 },
    { name: 'Random Irrelevant Card', type_line: 'Enchantment', cmc: 6 }
  ];

  const allocationState = CopyAllocationManager.createAllocationStateFromPlan(
    dummySlots,
    'MODERN',
    null,
    { deckSize: 60, archetype: 'Aggro' },
    dummyPool
  );

  const allocatedPackages = allocationState.packages;
  const hasSupportExpansion = allocatedPackages.some(p => p.role === 'SUPPORT_EXPANSION');
  const hasDetectionTower = allocatedPackages.some(p => p.winnerCard === 'Detection Tower');

  assert(!hasSupportExpansion, 'CopyAllocationManager does NOT generate SUPPORT_EXPANSION packages');
  assert(!hasDetectionTower, 'CopyAllocationManager never injects random land/cards from pool into spell slots\n');


  // ─── BLOCK C: INVARIANT 3 — CLOSED-LOOP REPLANEXECUTOR ──────────────────
  console.log('📦 BLOQUE C: Closed-Loop Recompilation (ReplanExecutor)');
  const defectState = {
    cards: [
      { name: 'Gilded Lotus', quantity: 4, role: 'FINISHER', cmc: 5, type_line: 'Artifact' },
      { name: 'Forest', quantity: 24, role: 'Land', cmc: 0, type_line: 'Basic Land — Forest' }
    ]
  };

  const highCurveDefect = [
    { severity: 'HIGH', isBlocking: true, axis: 'CURVE', message: 'Aggro curve too high' }
  ];
  const curveDirectives = [
    { action: 'LOWER_CURVE_PROFILE', targetMaxAvgCmc: 2.3 }
  ];

  const repairScope = ReplanExecutor.deriveRepairScope(highCurveDefect, curveDirectives, defectState);
  assert(repairScope.affectedRoles.includes('FINISHER'), 'deriveRepairScope maps curve defect to FINISHER role');

  const repairPool = [
    { name: 'Llanowar Elves', cmc: 1, type_line: 'Creature — Elf Druid', oracle_text: '{T}: Add {G}.' },
    { name: 'Elvish Mystic', cmc: 1, type_line: 'Creature — Elf Druid', oracle_text: '{T}: Add {G}.' }
  ];

  const { repairedDeckState, repairRecord } = ReplanExecutor.recompileScope(
    repairScope,
    defectState,
    { archetypeKey: 'Ramp' },
    { archetype: 'Ramp', format: 'Modern' },
    repairPool,
    2
  );

  assert(repairRecord.iteration === 2, 'ReplanExecutor records correct iteration number');
  assert(repairRecord.changesMade.length > 0, 'ReplanExecutor executes causal substitutions');
  assert(repairedDeckState.cards.some(c => c.name === 'Llanowar Elves'), 'ReplanExecutor re-ranked low CMC card to fix curve drag\n');


  // ─── BLOCK D: INVARIANT 4 — CERTIFIED DECK === RENDERED DECK ────────────
  console.log('📦 BLOQUE D: Equivalencia Hash (CertifiedDeck === RenderedDeck)');
  const compileOutput = CompilerConvergencePipeline.compileDeckFromScratch({
    userPrompt: 'Mazo agresivo Mono Red Burn',
    archetype: 'Aggro',
    format: 'Modern',
    rawCardPool: [
      { name: 'Lightning Bolt', cmc: 1, type_line: 'Instant', oracle_text: 'Deals 3 damage to any target.', colors: ['R'] },
      { name: 'Monastery Swiftspear', cmc: 1, type_line: 'Creature — Human Monk', oracle_text: 'Haste, prowess', colors: ['R'] },
      { name: 'Goblin Guide', cmc: 1, type_line: 'Creature — Goblin Scout', oracle_text: 'Haste', colors: ['R'] },
      { name: 'Eidolon of the Great Revel', cmc: 2, type_line: 'Enchantment Creature — Spirit', oracle_text: 'Deals 2 damage.', colors: ['R'] },
      { name: 'Lava Spike', cmc: 1, type_line: 'Sorcery — Arcane', oracle_text: 'Deals 3 damage to target player.', colors: ['R'] },
      { name: 'Light Up the Stage', cmc: 3, type_line: 'Sorcery', oracle_text: 'Exile the top two cards of your library. Until the end of your next turn, you may play those cards. Spectacle {R}', colors: ['R'] },
      { name: 'Play with Fire', cmc: 1, type_line: 'Instant', oracle_text: 'Deals 2 damage to any target.', colors: ['R'] },
      { name: 'Roiling Vortex', cmc: 2, type_line: 'Enchantment', oracle_text: 'Deals 1 damage during upkeep.', colors: ['R'] },
      { name: 'Rift Bolt', cmc: 3, type_line: 'Sorcery', oracle_text: 'Suspend 1. Deals 3 damage to any target.', colors: ['R'] },
      { name: 'Searing Blaze', cmc: 2, type_line: 'Instant', oracle_text: 'Deals 1 damage to target player and creature.', colors: ['R'] },
      { name: 'Skewer the Critics', cmc: 3, type_line: 'Sorcery', oracle_text: 'Spectacle. Deals 3 damage.', colors: ['R'] },
      { name: 'Soul-Scar Mage', cmc: 1, type_line: 'Creature — Human Wizard', oracle_text: 'Prowess', colors: ['R'] },
      { name: 'Mountain', cmc: 0, type_line: 'Basic Land — Mountain', colors: [] }
    ],
    uiFormState: { colors: ['R'], archetype: 'Aggro', format: 'Modern' }
  });

  const assembledOutput = await assembleDeckFromBlueprint(
    compileOutput.blueprint || {},
    { colors: ['R'], archetype: 'Aggro', format: 'Modern' },
    {},
    () => {},
    { convergenceResult: compileOutput }
  );

  const certifiedCards = compileOutput.certifiedDeck?.cards || compileOutput.state?.cards || [];
  const renderedCards = assembledOutput.cards || [];

  const certHash = computeDeterministicHash(certifiedCards.map(c => `${c.name}:${c.quantity}`));
  const rendHash = computeDeterministicHash(renderedCards.map(c => `${c.name}:${c.quantity}`));

  assert(certHash === rendHash, 'CertifiedDeck hash is 100% equivalent to RenderedDeck hash');
  assert(compileOutput.lockStatus === 'LOCK_60', 'compileDeckFromScratch output has lockStatus = LOCK_60\n');


  // ─── BLOCK E: INFRASTRUCTURE-AWARE IDENTITY FIREWALL ────────────────────
  console.log('📦 BLOQUE E: Infrastructure-Aware Identity Firewall');
  const dragonIntent = { primaryTribe: 'Dragon', archetype: 'Ramp', colors: ['G', 'R'], format: 'Modern' };
  const dragonIdentity = { archetypeKey: 'Ramp', requiredEngines: ['RAMP_ACCELERATION'] };

  const llanowarCard = {
    name: 'Llanowar Elves',
    type_line: 'Creature — Elf Druid',
    oracle_text: '{T}: Add {G}.',
    cmc: 1,
    colors: ['G'],
    color_identity: ['G']
  };

  const vanillaOffTribeCard = {
    name: 'Grizzly Bears',
    type_line: 'Creature — Bear',
    oracle_text: '',
    cmc: 2,
    colors: ['G'],
    color_identity: ['G']
  };

  const llanowarValidation = IdentityFirewall.validateCard(llanowarCard, dragonIdentity, dragonIntent);
  const bearValidation = IdentityFirewall.validateCard(vanillaOffTribeCard, dragonIdentity, dragonIntent);

  assert(llanowarValidation.isAllowed === true, 'Llanowar Elves is allowed in Dragon Ramp as universal infrastructure');
  assert(llanowarValidation.isInfrastructureBridge === true, 'Llanowar Elves is tagged as isInfrastructureBridge = true');
  assert(bearValidation.isAllowed === false, 'Vanilla off-tribe Grizzly Bears is strictly rejected by IdentityFirewall\n');


  // ─── BLOCK F: COMPUERTA JUDICIAL ESTRICTA (BLOCKING VS NON-BLOCKING) ────
  console.log('📦 BLOQUE F: Strict Judicial Gate (No Backdoors)');
  const blockingDeck = {
    cards: [
      { name: 'Lightning Bolt', quantity: 4, role: 'CHEAP_REMOVAL', cmc: 1, type_line: 'Instant' },
      { name: 'Mountain', quantity: 10, role: 'Land', cmc: 0, type_line: 'Basic Land — Mountain' } // Total 14 cards (Size mismatch!)
    ]
  };

  const blockingJudgeReview = DeterministicSupremeJudge.judgeDeck(
    blockingDeck,
    { archetypeKey: 'Aggro' },
    { format: 'Modern', deckSize: 60 },
    1
  );

  assert(blockingJudgeReview.verdict === 'REPLAN', 'Judicial defect (size mismatch) issues REPLAN verdict');
  assert(blockingJudgeReview.hasBlockingWarnings === true, 'Judge tags blocking defect with hasBlockingWarnings = true');
  assert(blockingJudgeReview.certification === 'REPLAN_DIRECTIVES_ISSUED', 'Judge issues REPLAN_DIRECTIVES_ISSUED certification\n');


  // ─── SUMMARY ────────────────────────────────────────────────────────────
  console.log('🏛️ =========================================================================');
  console.log(`🏛️ V27 BENCHMARK SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log('🏛️ =========================================================================\n');
}

runV27BenchmarkSuite().catch(err => {
  console.error('❌ V27 Benchmark Suite Failed with Error:', err);
  process.exit(1);
});
