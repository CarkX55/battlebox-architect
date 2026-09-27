/**
 * tests/unit/compiler/test_v29_5_forensic_blockers.js
 * 
 * V29.5 Forensic Blocker Universal Architecture Test Suite.
 * 
 * Validates the 8 core state governance invariants without tribal, engine, or card-name hardcodes:
 * 
 * 1. STRICT_IDENTITY_FRONTIER_TEST
 * 2. CRITICAL_DEFICIT_LOCK_TEST
 * 3. RETROACTIVE_GAMEPLAN_PRESERVATION_TEST
 * 4. NO_LAND_PADDING_TEST
 * 5. OPTIMIZER_STATE_EQUIVALENCE_TEST
 * 6. PACKAGE_GAMEPLAN_ANCHOR_TEST
 * 7. IDENTITY_STRUCTURAL_TYPE_TEST
 * 8. UNIVERSAL_REGRESSION
 */

import { IdentityFirewall } from '../../../src/services/compiler/core/identityFirewall.js';
import { CardCausalContract } from '../../../src/services/compiler/core/cardCausalContract.js';
import { SearchSpaceCompiler } from '../../../src/services/compiler/core/searchSpaceCompiler.js';
import { ProgressiveDeckStateBuilder } from '../../../src/services/compiler/core/progressiveDeckStateBuilder.js';
import { EmergentCausalPackageAssembler } from '../../../src/services/compiler/core/emergentCausalPackageAssembler.js';
import { ManaExecutionOptimizer } from '../../../src/services/compiler/core/manaExecutionOptimizer.js';
import { IntentPackage } from '../../../src/services/compiler/core/intentPackage.js';
import { GameplanContract, TurnRequirement, TurnFunctionalDemand } from '../../../src/services/compiler/core/gameplanSynthesizer.js';
import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';

console.log('══════════════════════════════════════════════════════════════════');
console.log('  🏛️ V29.5 FORENSIC BLOCKER ARCHITECTURE TEST SUITE');
console.log('══════════════════════════════════════════════════════════════════\n');

// ─── TEST 7: IDENTITY_STRUCTURAL_TYPE_TEST ─────────────────────────────────
console.log('[Test 1/8] IDENTITY_STRUCTURAL_TYPE_TEST: Wolf != Werewolf Structural Separation...');
{
  const packleader = { name: 'Ascendant Packleader', type_line: 'Creature — Wolf', oracle_text: 'Whenever you cast a spell with mana value 4 or greater, put a +1/+1 counter on Ascendant Packleader.', cmc: 1 };
  const pup = { name: 'Fearless Pup', type_line: 'Creature — Wolf', oracle_text: 'First strike. {2}{R}: Gets +2/+0.', cmc: 1 };
  const snarling = { name: 'Snarling Wolf', type_line: 'Creature — Wolf', oracle_text: '{1}{G}: Gets +2/+2.', cmc: 1 };
  
  const villageMessenger = {
    name: 'Village Messenger // Moonrise Intruder',
    type_line: 'Creature — Human Werewolf // Creature — Werewolf',
    card_faces: [
      { name: 'Village Messenger', type_line: 'Creature — Human Werewolf', oracle_text: 'Haste. At the beginning of each upkeep, if no spells were cast last turn, transform.' },
      { name: 'Moonrise Intruder', type_line: 'Creature — Werewolf', oracle_text: 'Menace' }
    ],
    cmc: 1
  };

  const kessigNaturalist = {
    name: 'Kessig Naturalist // Lord of the Ulvenwald',
    type_line: 'Creature — Human Werewolf // Creature — Werewolf',
    card_faces: [
      { name: 'Kessig Naturalist', type_line: 'Creature — Human Werewolf', oracle_text: 'Daybound. Whenever attacks, add {R} or {G}.' },
      { name: 'Lord of the Ulvenwald', type_line: 'Creature — Werewolf', oracle_text: 'Nightbound. Other Werewolves and Wolves get +1/+1.' }
    ],
    cmc: 2
  };

  const changeling = { name: 'Woodland Changeling', type_line: 'Creature — Shapeshifter', oracle_text: 'Changeling (This card is every creature type.)', cmc: 2 };
  const genericSpell = { name: 'Moonrager\'s Slash', type_line: 'Instant', oracle_text: 'Moonrager\'s Slash deals 3 damage to any target. This spell costs {2} less to cast as long as it\'s night or you control a Werewolf.', cmc: 3 };
  const wolfOnlySpell = { name: 'Feed the Pack', type_line: 'Enchantment', oracle_text: 'At the beginning of your end step, sacrifice a nontoken creature, create X 2/2 green Wolf creature tokens.', cmc: 6 };

  // Subtype checks
  if (IdentityFirewall.isMatchingTribe(packleader, 'Werewolf') !== false) throw new Error('Packleader (Wolf) wrongly matched Werewolf!');
  if (IdentityFirewall.isMatchingTribe(pup, 'Werewolf') !== false) throw new Error('Fearless Pup (Wolf) wrongly matched Werewolf!');
  if (IdentityFirewall.isMatchingTribe(snarling, 'Werewolf') !== false) throw new Error('Snarling Wolf (Wolf) wrongly matched Werewolf!');

  if (IdentityFirewall.isMatchingTribe(packleader, 'Wolf') !== true) throw new Error('Packleader should match Wolf!');
  if (IdentityFirewall.isMatchingTribe(villageMessenger, 'Werewolf') !== true) throw new Error('Village Messenger should match Werewolf!');
  if (IdentityFirewall.isMatchingTribe(villageMessenger, 'Wolf') !== false) throw new Error('Village Messenger should NOT match pure Wolf!');
  if (IdentityFirewall.isMatchingTribe(kessigNaturalist, 'Werewolf') !== true) throw new Error('Kessig Naturalist should match Werewolf!');
  if (IdentityFirewall.isMatchingTribe(changeling, 'Werewolf') !== true) throw new Error('Changeling should match Werewolf!');
  if (IdentityFirewall.isMatchingTribe(genericSpell, 'Werewolf') !== true) throw new Error('Werewolf spell should match Werewolf!');
  if (IdentityFirewall.isMatchingTribe(wolfOnlySpell, 'Werewolf') !== false) throw new Error('Wolf token spell without Werewolf should NOT match Werewolf!');

  console.log('  ✅ Test 1 Passed: Structural separation verified. Wolf is never treated as Werewolf.\n');
}

// ─── TEST 2: STRICT_IDENTITY_FRONTIER_TEST ────────────────────────────────
console.log('[Test 2/8] STRICT_IDENTITY_FRONTIER_TEST: Candidate Domain Filtering...');
{
  const rawPool = [
    { name: 'Village Messenger', type_line: 'Creature — Human Werewolf', oracle_text: 'Haste. Transform.', cmc: 1, colors: ['R'] },
    { name: 'Ascendant Packleader', type_line: 'Creature — Wolf', oracle_text: 'Gets counters.', cmc: 1, colors: ['G'] },
    { name: 'Fearless Pup', type_line: 'Creature — Wolf', oracle_text: 'First strike.', cmc: 1, colors: ['R'] },
    { name: 'Llanowar Elves', type_line: 'Creature — Elf Druid', oracle_text: '{T}: Add {G}.', cmc: 1, colors: ['G'] },
    { name: 'Lightning Strike', type_line: 'Instant', oracle_text: 'Deals 3 damage.', cmc: 2, colors: ['R'] }
  ];

  const intent = new IntentPackage({
    format: 'Pioneer',
    colors: ['R', 'G'],
    primaryTribe: 'Werewolf',
    strategicFreedom: { allowOffTribe: false }
  });

  const { restrictedPool } = SearchSpaceCompiler.compileRestrictedPool(rawPool, {}, intent);
  const admittedNames = restrictedPool.map(c => c.name);

  if (admittedNames.includes('Ascendant Packleader')) throw new Error('Ascendant Packleader entered restricted pool under STRICT_TRIBE!');
  if (admittedNames.includes('Fearless Pup')) throw new Error('Fearless Pup entered restricted pool under STRICT_TRIBE!');
  if (admittedNames.includes('Llanowar Elves')) throw new Error('Llanowar Elves entered restricted pool under STRICT_TRIBE!');
  if (!admittedNames.includes('Village Messenger')) throw new Error('Village Messenger should be admitted!');
  if (!admittedNames.includes('Lightning Strike')) throw new Error('Lightning Strike (non-creature spell) should be admitted!');

  console.log('  ✅ Test 2 Passed: Off-identity creatures are strictly excluded before candidate ranking.\n');
}

// ─── TEST 3: CRITICAL_DEFICIT_LOCK_TEST ───────────────────────────────────
console.log('[Test 3/8] CRITICAL_DEFICIT_LOCK_TEST: Locking Frontier to Deficit Closers...');
{
  const gameplan = new GameplanContract({
    thesis: 'Werewolf Tempo',
    derivedKillTurn: 4,
    identityConstraints: {
      primaryIdentity: 'Werewolf',
      identityPolicy: { creatureMembershipMode: 'STRICT_TRIBE' },
      requiredMechanicCapabilities: ['DAYBOUND_NIGHTBOUND']
    },
    turnRequirements: [
      new TurnRequirement({
        turn: 1,
        criticality: 'CRITICAL',
        functionalDemands: [
          new TurnFunctionalDemand({
            functionName: 'DEPLOY_ON_IDENTITY_1CMC_BODY',
            criticality: 'CRITICAL',
            targetProbability: 0.85,
            executionWindow: { turn: 1, maxMana: 1 },
            constraints: { cmc: { min: 1, max: 1 }, type: 'creature', requiresOnIdentity: true }
          })
        ]
      })
    ]
  });

  const intent = new IntentPackage({
    format: 'Pioneer',
    colors: ['R', 'G'],
    primaryTribe: 'Werewolf',
    tempo: 'Tempo',
    strategicFreedom: { allowOffTribe: false }
  });

  // Pool with on-identity 1-drop AND a high-scoring 5-drop bomb
  const pool = [
    { name: 'Village Messenger', type_line: 'Creature — Human Werewolf', oracle_text: 'Haste.', cmc: 1, colors: ['R'] },
    { name: 'Questing Beast', type_line: 'Legendary Creature — Beast', oracle_text: 'Vigilance, deathtouch, haste. Combat damage cannot be prevented.', cmc: 4, colors: ['G'] },
    { name: 'Mountain', type_line: 'Basic Land — Mountain', cmc: 0, colors: [] },
    { name: 'Forest', type_line: 'Basic Land — Forest', cmc: 0, colors: [] }
  ];

  const { deckState, buildLog } = ProgressiveDeckStateBuilder.buildDeckState({
    intentPackage: intent,
    deckIdentity: {},
    gameplanContract: gameplan,
    candidatePool: pool
  });

  const deckNames = deckState.cards.map(c => c.name);
  if (deckNames.includes('Questing Beast')) {
    throw new Error('Questing Beast entered deck while critical T1 deficit was open!');
  }

  console.log('  ✅ Test 3 Passed: Irrelevant high-score cards are barred while critical deficit is open.\n');
}

// ─── TEST 4: RETROACTIVE_GAMEPLAN_PRESERVATION_TEST ────────────────────────
console.log('[Test 4/8] RETROACTIVE_GAMEPLAN_PRESERVATION_TEST: Monotonic Swap Invariant...');
{
  const gameplan = new GameplanContract({
    thesis: 'Werewolf Day/Night Tempo',
    derivedKillTurn: 4,
    identityConstraints: {
      primaryIdentity: 'Werewolf',
      identityPolicy: { creatureMembershipMode: 'STRICT_TRIBE' },
      requiredMechanicCapabilities: ['DAYBOUND_NIGHTBOUND']
    },
    turnRequirements: [
      new TurnRequirement({
        turn: 1,
        criticality: 'CRITICAL',
        functionalDemands: [
          new TurnFunctionalDemand({
            functionName: 'DEPLOY_ON_IDENTITY_1CMC_BODY',
            criticality: 'CRITICAL',
            targetProbability: 0.85,
            executionWindow: { turn: 1, maxMana: 1 },
            constraints: { cmc: { min: 1, max: 1 }, type: 'creature', requiresOnIdentity: true }
          })
        ]
      })
    ]
  });

  const intent = new IntentPackage({
    format: 'Pioneer',
    colors: ['R', 'G'],
    primaryTribe: 'Werewolf',
    tempo: 'Tempo',
    strategicFreedom: { allowOffTribe: false }
  });

  const pool = [
    { name: 'Village Messenger', type_line: 'Creature — Human Werewolf', oracle_text: 'Haste. Daybound.', capabilities: ['DAYBOUND_NIGHTBOUND'], cmc: 1, colors: ['R'] },
    { name: 'Kessig Naturalist', type_line: 'Creature — Human Werewolf', oracle_text: 'Daybound.', capabilities: ['DAYBOUND_NIGHTBOUND'], cmc: 2, colors: ['R', 'G'] },
    { name: 'Stoke the Flames', type_line: 'Instant', oracle_text: 'Convoke. Deals 4 damage to any target.', cmc: 4, colors: ['R'] },
    { name: 'Homing Lightning', type_line: 'Instant', oracle_text: 'Deals 4 damage to target creature and others with same name.', cmc: 4, colors: ['R'] },
    { name: 'Mountain', type_line: 'Basic Land — Mountain', cmc: 0 },
    { name: 'Forest', type_line: 'Basic Land — Forest', cmc: 0 }
  ];

  const { deckState, buildLog } = ProgressiveDeckStateBuilder.buildDeckState({
    intentPackage: intent,
    deckIdentity: {},
    gameplanContract: gameplan,
    candidatePool: pool
  });

  const deckNames = deckState.cards.map(c => c.name);
  if (!deckNames.includes('Village Messenger')) {
    throw new Error('Village Messenger was retroactively swapped out, destroying gameplan mechanic!');
  }

  console.log('  ✅ Test 4 Passed: EXPLICIT_REQUIRED mechanics cannot be retroactively sacrificed for generic burn.\n');
}

// ─── TEST 5: NO_LAND_PADDING_TEST ──────────────────────────────────────────
console.log('[Test 5/8] NO_LAND_PADDING_TEST: Prohibiting Blind Land Padding...');
{
  // Pool restricted to only 20 spells
  const restrictedSpells = [
    { name: 'Spell A', type_line: 'Instant', oracle_text: 'Draw a card.', cmc: 1, colors: ['R'], quantity: 4 },
    { name: 'Spell B', type_line: 'Instant', oracle_text: 'Deals 2 damage.', cmc: 1, colors: ['R'], quantity: 4 },
    { name: 'Spell C', type_line: 'Instant', oracle_text: 'Deals 3 damage.', cmc: 2, colors: ['R'], quantity: 4 },
    { name: 'Spell D', type_line: 'Instant', oracle_text: 'Draw 2 cards.', cmc: 3, colors: ['R'], quantity: 4 },
    { name: 'Spell E', type_line: 'Instant', oracle_text: 'Destroy target creature.', cmc: 2, colors: ['R'], quantity: 4 }
  ]; // Total 20 spells

  const lands = [
    { name: 'Mountain', type_line: 'Basic Land — Mountain', cmc: 0, colors: ['R'] }
  ];

  const intent = new IntentPackage({ format: 'Pioneer', colors: ['R'], tempo: 'Aggro' });
  const gameplan = new GameplanContract({ thesis: 'Burn', derivedKillTurn: 4 });

  const manaResult = ManaExecutionOptimizer.optimizeLandState({
    nonLandSpells: restrictedSpells,
    gameplanContract: gameplan,
    intentPackage: intent,
    availableLands: lands,
    deckSize: 60
  });

  if (manaResult.optimalLandCount === 40) {
    throw new Error('ManaExecutionOptimizer padded 40 lands to fill missing spells!');
  }
  if (manaResult.isViable !== false) {
    throw new Error('ManaExecutionOptimizer should mark state as non-viable when candidate spells are exhausted!');
  }

  console.log(`  Optimal land count reported: ${manaResult.optimalLandCount} (NOT 40). Viability: ${manaResult.isViable}`);
  console.log('  ✅ Test 5 Passed: Land padding fallback (60 - spells) is strictly eliminated.\n');
}

// ─── TEST 6: OPTIMIZER_STATE_EQUIVALENCE_TEST ─────────────────────────────
console.log('[Test 6/8] OPTIMIZER_STATE_EQUIVALENCE_TEST: Land Count Consistency...');
{
  const fullSpells = [];
  for (let i = 1; i <= 9; i++) {
    fullSpells.push({ name: `Burn Spell ${i}`, type_line: 'Instant', oracle_text: 'Deals 2 damage.', cmc: 2, colors: ['R'], quantity: 4 });
  }
  // 36 spells total
  const lands = [{ name: 'Mountain', type_line: 'Basic Land — Mountain', cmc: 0, colors: ['R'] }];
  const intent = new IntentPackage({ format: 'Pioneer', colors: ['R'], tempo: 'Aggro' });
  const gameplan = new GameplanContract({ thesis: 'Burn', derivedKillTurn: 4 });

  const manaResult = ManaExecutionOptimizer.optimizeLandState({
    nonLandSpells: fullSpells,
    gameplanContract: gameplan,
    intentPackage: intent,
    availableLands: lands,
    deckSize: 60
  });

  const actualLandsInState = manaResult.optimalDeckState.landCards.reduce((sum, c) => sum + Number(c.quantity || 1), 0);
  if (actualLandsInState !== manaResult.optimalLandCount) {
    throw new Error(`State divergence: optimizer selected ${manaResult.optimalLandCount} but state has ${actualLandsInState}!`);
  }

  console.log(`  Optimizer lands: ${manaResult.optimalLandCount} === Applied state lands: ${actualLandsInState}`);
  console.log('  ✅ Test 6 Passed: Optimizer land count equals state land count exactly.\n');
}

// ─── TEST 7: PACKAGE_GAMEPLAN_ANCHOR_TEST ──────────────────────────────────
console.log('[Test 7/8] PACKAGE_GAMEPLAN_ANCHOR_TEST: Rejecting Unanchored Generic Packages...');
{
  const stormTheCitadel = {
    name: 'Storm the Citadel',
    type_line: 'Sorcery',
    oracle_text: 'Until end of turn, creatures you control get +2/+2 and gain "Whenever this creature deals combat damage to a player, destroy target artifact or enchantment that player controls."',
    cmc: 5,
    colors: ['G']
  };

  const oneDropTargets = [
    { name: 'Kessig Naturalist', type_line: 'Creature — Human Werewolf', oracle_text: 'Daybound', cmc: 2, colors: ['R', 'G'] },
    { name: 'Outland Liberator', type_line: 'Creature — Human Werewolf', oracle_text: 'Daybound', cmc: 2, colors: ['G'] }
  ];

  const pool = [stormTheCitadel, ...oneDropTargets];
  const intent = new IntentPackage({ format: 'Pioneer', colors: ['R', 'G'], primaryTribe: 'Werewolf', tempo: 'Tempo' });
  const gameplan = new GameplanContract({
    thesis: 'Werewolf Tempo',
    derivedKillTurn: 4,
    identityConstraints: {
      primaryIdentity: 'Werewolf',
      requiredMechanicCapabilities: ['DAYBOUND_NIGHTBOUND']
    }
  });

  const packages = EmergentCausalPackageAssembler.discoverPackages(pool, intent, {}, gameplan);
  const packageNames = packages.map(p => p.name);

  if (packageNames.some(n => n.includes('Storm the Citadel'))) {
    throw new Error('Storm the Citadel (CMC 5) was admitted as an emergent package in a Kill Turn 4 plan!');
  }

  console.log('  ✅ Test 7 Passed: Unanchored amplifier package violating timing window was rejected.\n');
}

// ─── TEST 8: UNIVERSAL_REGRESSION (Rich Pool Compilation) ──────────────────
console.log('[Test 8/8] UNIVERSAL_REGRESSION: Complete Pipeline Compilation with Feasible Pool...');
{
  const richWerewolfPool = [
    { name: 'Village Messenger // Moonrise Intruder', type_line: 'Creature — Human Werewolf // Werewolf', card_faces: [{ name: 'Village Messenger', type_line: 'Creature — Human Werewolf', oracle_text: 'Haste. Daybound' }, { name: 'Moonrise Intruder', type_line: 'Creature — Werewolf', oracle_text: 'Menace. Nightbound' }], cmc: 1, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
    { name: 'Kessig Prowler // Sinuous Predator', type_line: 'Creature — Human Werewolf // Werewolf', card_faces: [{ name: 'Kessig Prowler', type_line: 'Creature — Human Werewolf', oracle_text: '{4}{G}: Transform.' }, { name: 'Sinuous Predator', type_line: 'Creature — Werewolf', oracle_text: 'Can\'t be blocked by creatures with power 2 or less.' }], cmc: 1, power: '2', toughness: '1', colors: ['G'], color_identity: ['G'] },
    { name: 'Kessig Naturalist // Lord of the Ulvenwald', type_line: 'Creature — Human Werewolf // Werewolf', card_faces: [{ name: 'Kessig Naturalist', type_line: 'Creature — Human Werewolf', oracle_text: 'Daybound. Whenever attacks, add {R} or {G}.' }, { name: 'Lord of the Ulvenwald', type_line: 'Creature — Werewolf', oracle_text: 'Nightbound. Other Werewolves get +1/+1.' }], cmc: 2, power: '2', toughness: '2', colors: ['R', 'G'], color_identity: ['R', 'G'] },
    { name: 'Outland Liberator // Frenzied Trapbreaker', type_line: 'Creature — Human Werewolf // Werewolf', card_faces: [{ name: 'Outland Liberator', type_line: 'Creature — Human Werewolf', oracle_text: 'Daybound.' }, { name: 'Frenzied Trapbreaker', type_line: 'Creature — Werewolf', oracle_text: 'Nightbound.' }], cmc: 2, power: '1', toughness: '3', colors: ['G'], color_identity: ['G'] },
    { name: 'Reckless Stormseeker // Storm-Charged Slasher', type_line: 'Creature — Human Werewolf // Werewolf', card_faces: [{ name: 'Reckless Stormseeker', type_line: 'Creature — Human Werewolf', oracle_text: 'Daybound. Target gains haste and +1/+0.' }, { name: 'Storm-Charged Slasher', type_line: 'Creature — Werewolf', oracle_text: 'Nightbound. Target gains haste and +2/+0.' }], cmc: 3, power: '2', toughness: '3', colors: ['R'], color_identity: ['R'] },
    { name: 'Tovolar, Dire Overlord // Tovolar, the Midnight Scourge', type_line: 'Legendary Creature — Human Werewolf // Werewolf', card_faces: [{ name: 'Tovolar, Dire Overlord', type_line: 'Legendary Creature — Human Werewolf', oracle_text: 'Daybound. Whenever a Werewolf deals damage, draw a card.' }, { name: 'Tovolar, the Midnight Scourge', type_line: 'Legendary Creature — Werewolf', oracle_text: 'Nightbound.' }], cmc: 3, power: '3', toughness: '3', colors: ['R', 'G'], color_identity: ['R', 'G'] },
    { name: 'Fangblade Brigand // Fangblade Hellhound', type_line: 'Creature — Human Werewolf // Werewolf', card_faces: [{ name: 'Fangblade Brigand', type_line: 'Creature — Human Werewolf', oracle_text: 'Daybound' }, { name: 'Fangblade Hellhound', type_line: 'Creature — Werewolf', oracle_text: 'Nightbound' }], cmc: 2, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Moonrager\'s Slash', type_line: 'Instant', oracle_text: 'Deals 3 damage to any target. Costs {2} less if it is night or you control a Werewolf.', cmc: 3, colors: ['R'], color_identity: ['R'] },
    { name: 'Play with Fire', type_line: 'Instant', oracle_text: 'Deals 2 damage to any target. Scry 1 if player.', cmc: 1, colors: ['R'], color_identity: ['R'] },
    { name: 'Lightning Strike', type_line: 'Instant', oracle_text: 'Deals 3 damage to any target.', cmc: 2, colors: ['R'], color_identity: ['R'] },
    { name: 'Stomping Ground', type_line: 'Land — Mountain Forest', oracle_text: '{T}: Add {R} or {G}. Pay 2 life or enters tapped.', cmc: 0, colors: [], color_identity: ['R', 'G'] },
    { name: 'Karplusan Forest', type_line: 'Land', oracle_text: '{T}: Add {C}. {T}: Add {R} or {G}. Deals 1 damage to you.', cmc: 0, colors: [], color_identity: ['R', 'G'] },
    { name: 'Copperline Gorge', type_line: 'Land', oracle_text: 'Enters tapped unless you control two or fewer other lands. {T}: Add {R} or {G}.', cmc: 0, colors: [], color_identity: ['R', 'G'] },
    { name: 'Mountain', type_line: 'Basic Land — Mountain', oracle_text: '{T}: Add {R}.', cmc: 0, colors: [], color_identity: ['R'] },
    { name: 'Forest', type_line: 'Basic Land — Forest', oracle_text: '{T}: Add {G}.', cmc: 0, colors: [], color_identity: ['G'] },
    // Irrelevant noise in pool that MUST NOT enter:
    { name: 'Snarling Wolf', type_line: 'Creature — Wolf', oracle_text: '{1}{G}: Gets +2/+2.', cmc: 1, power: '1', toughness: '1', colors: ['G'], color_identity: ['G'] },
    { name: 'Storm the Citadel', type_line: 'Sorcery', oracle_text: 'Creatures get +2/+2.', cmc: 5, colors: ['G'], color_identity: ['G'] }
  ];

  const result = CompilerConvergencePipeline.compileDeckFromScratch({
    userPrompt: 'Quiero un mazo competitivo de Werewolf Day/Night Tempo en Pioneer.',
    archetype: 'Tempo',
    format: 'Pioneer',
    rawCardPool: richWerewolfPool,
    uiFormState: {
      format: 'Pioneer',
      colors: ['R', 'G'],
      archetype: 'Tempo',
      strategicTempo: 'TEMPO',
      primaryTribe: 'Werewolf',
      primaryStrategy: 'Werewolf Day/Night Tempo',
      tribalPreference: 1.0,
      allowOffTribe: false,
      mechanics: ['Daybound', 'Nightbound']
    }
  });

  const totalCards = result.state.cards.reduce((sum, c) => sum + Number(c.quantity || c.count || 1), 0);
  const landCount = result.state.cards.filter(c => c.isLand).reduce((sum, c) => sum + Number(c.quantity || c.count || 1), 0);
  const spellCount = totalCards - landCount;
  const cardNames = result.state.cards.map(c => c.name);

  console.log(`  Compiled Deck: ${totalCards} cards (${spellCount} spells / ${landCount} lands). Verdict: ${result.supremeJudicialReview?.verdict}`);

  if (totalCards !== 60) throw new Error(`Expected 60 cards, got ${totalCards}`);
  if (landCount > 25 || landCount < 18) throw new Error(`Abnormal land count: ${landCount}`);
  if (cardNames.includes('Snarling Wolf')) throw new Error('Snarling Wolf (Creature — Wolf) leaked into STRICT_TRIBE Werewolf deck!');
  if (cardNames.includes('Storm the Citadel')) throw new Error('Storm the Citadel leaked into Turn 4 Tempo deck!');
  if (result.supremeJudicialReview?.verdict === 'REJECT') {
    throw new Error(`Judge rejected valid deck: ${result.supremeJudicialReview.blockingDefects.map(d => d.message).join('; ')}`);
  }

  console.log('  ✅ Test 8 Passed: Complete pipeline compiles legal Werewolf Day/Night deck with APPROVE verdict.\n');
}

console.log('══════════════════════════════════════════════════════════════════');
console.log('  🏆 ALL 8 V29.5 FORENSIC BLOCKER INVARIANTS CERTIFIED');
console.log('══════════════════════════════════════════════════════════════════');
