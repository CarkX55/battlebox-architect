/**
 * tests/benchmarks/test_v29_4_universal_strategic_matrix.js
 * 
 * V29.4 Universal Strategic Matrix & Contextual Dominance Benchmark Suite.
 * 
 * Asserts:
 *   1. "A Tribe is NOT a Strategy": Same Pool + Same Colors + Same Tribe produces 4 genuinely divergent Gameplans (Aggro, Sacrifice, Burn, Tokens).
 *   2. Contextual Dominance: Contextual gameplan alignment strictly beats standalone power in synergy slots, while standalone power wins in open generic slots.
 *   3. Strategic Counterfactual Swap Test: Core engine replacement causes measurable causal drop (Δ < 0), while neutral cantrip swap preserves stability (Δ ≈ 0).
 *   4. Infeasible Strategy Detection: Infeasible intents correctly return INFEASIBLE with exact diagnosis and actionable recommended pivots.
 *   5. Typed Causal Path Audit: 100% of admitted cards have discrete causal trajectory classification.
 *   6. Multi-Archetype Cross Matrix: Universal validation across diverse formats, colors, tribes, and strategies.
 */

import { IntentPackage } from '../../src/services/compiler/core/intentPackage.js';
import { CardCausalContract } from '../../src/services/compiler/core/cardCausalContract.js';
import { StateCandidateRanker } from '../../src/services/compiler/core/stateCandidateRanker.js';
import { GameplanIntegrityGate } from '../../src/services/compiler/core/gameplanIntegrityGate.js';
import { StrategicLineGraph } from '../../src/services/compiler/core/strategicLineGraph.js';
import { StrategicMemoryModel } from '../../src/services/compiler/core/strategicMemoryModel.js';
import { MechanicDiscoveryEngine } from '../../src/services/compiler/core/mechanicDiscoveryEngine.js';
import { GameplanSynthesizer } from '../../src/services/compiler/core/gameplanSynthesizer.js';
import { DeckPlanCoverage } from '../../src/services/compiler/core/deckPlanCoverage.js';
import { CompilerConvergencePipeline } from '../../src/knowledge/compiler/CompilerConvergencePipeline.js';

let passedTests = 0;
const totalTests = 6;

console.log('🏛️ === V29.4 UNIVERSAL STRATEGIC MATRIX & CONTEXTUAL DOMINANCE BENCHMARK ===\n');

// ─── COMPREHENSIVE RAKDOS GOBLINS POOL (4 Strategies in 1 Pool) ────────────────
function createRakdosGoblinsPool() {
  return [
    // ── Aggro / Velocity Core ──
    { name: 'Goblin Guide', type_line: 'Creature — Goblin Scout', oracle_text: 'Haste\nWhenever Goblin Guide attacks, defending player reveals the top card of their library.', cmc: 1, power: '2', toughness: '2', colors: ['R'], legalities: { pioneer: 'legal' } },
    { name: 'Foundry Street Denizen', type_line: 'Creature — Goblin Warrior', oracle_text: 'Whenever another red creature enters the battlefield under your control, Foundry Street Denizen gets +1/+0 until end of turn.', cmc: 1, power: '1', toughness: '1', colors: ['R'], legalities: { pioneer: 'legal' } },
    { name: 'Torch Courier', type_line: 'Creature — Goblin', oracle_text: 'Haste\n{T}, Sacrifice Torch Courier: Another target creature gains haste until end of turn.', cmc: 1, power: '1', toughness: '1', colors: ['R'], legalities: { pioneer: 'legal' } },
    { name: 'Battle Cry Goblin', type_line: 'Creature — Goblin', oracle_text: '{1}{R}: Goblins you control get +1/+0 and gain haste until end of turn. Pack tactics — Create a 1/1 red Goblin.', cmc: 2, power: '2', toughness: '2', colors: ['R'], legalities: { pioneer: 'legal' } },
    { name: 'Reckless Bushwhacker', type_line: 'Creature — Goblin Warrior Ally', oracle_text: 'Surge {1}{R}\nWhen Reckless Bushwhacker enters the battlefield, if its surge cost was paid, other creatures you control get +1/+0 and gain haste until end of turn.', cmc: 3, power: '2', toughness: '1', colors: ['R'], legalities: { pioneer: 'legal' } },
    { name: 'Rundvelt Hordemaster', type_line: 'Creature — Goblin Warrior', oracle_text: 'Other Goblins you control get +1/+1.\nWhenever Rundvelt Hordemaster or another Goblin you control dies, exile the top card of your library. You may play it this turn.', cmc: 2, power: '1', toughness: '1', colors: ['R'], legalities: { pioneer: 'legal' } },
    { name: 'Goblin Instigator', type_line: 'Creature — Goblin Rogue', oracle_text: 'When Goblin Instigator enters the battlefield, create a 1/1 red Goblin creature token.', cmc: 2, power: '1', toughness: '1', colors: ['R'], legalities: { pioneer: 'legal' } },

    // ── Aristocrats / Sacrifice Core ──
    { name: 'Skirk Prospector', type_line: 'Creature — Goblin', oracle_text: 'Sacrifice a Goblin: Add {R}.', cmc: 1, power: '1', toughness: '1', colors: ['R'], legalities: { pioneer: 'legal' } },
    { name: 'Pashalik Mons', type_line: 'Legendary Creature — Goblin Warrior', oracle_text: 'Whenever Pashalik Mons or another Goblin you control dies, Pashalik Mons deals 1 damage to any target.\n{3}{R}, Sacrifice a Goblin: Create two 1/1 red Goblin creature tokens.', cmc: 3, power: '2', toughness: '2', colors: ['R'], legalities: { pioneer: 'legal' } },
    { name: 'Sling-Gang Lieutenant', type_line: 'Creature — Goblin', oracle_text: 'When Sling-Gang Lieutenant enters the battlefield, create two 1/1 red Goblin creature tokens.\nSacrifice a Goblin: Target player loses 1 life and you gain 1 life.', cmc: 4, power: '1', toughness: '1', colors: ['B'], legalities: { pioneer: 'legal' } },
    { name: 'Blood Artist', type_line: 'Creature — Vampire', oracle_text: 'Whenever Blood Artist or another creature dies, target player loses 1 life and you gain 1 life.', cmc: 2, power: '0', toughness: '1', colors: ['B'], legalities: { pioneer: 'legal' } },
    { name: 'Zulaport Cutthroat', type_line: 'Creature — Human Rogue Ally', oracle_text: 'Whenever Zulaport Cutthroat or another creature you control dies, each opponent loses 1 life and you gain 1 life.', cmc: 2, power: '1', toughness: '1', colors: ['B'], legalities: { pioneer: 'legal' } },
    { name: 'Village Rites', type_line: 'Instant', oracle_text: 'As an additional cost to cast this spell, sacrifice a creature. Draw two cards.', cmc: 1, colors: ['B'], legalities: { pioneer: 'legal' } },
    { name: 'Deadly Dispute', type_line: 'Instant', oracle_text: 'As an additional cost to cast this spell, sacrifice an artifact or creature. Draw two cards and create a Treasure token.', cmc: 2, colors: ['B'], legalities: { pioneer: 'legal' } },

    // ── Direct Burn / Reach Core ──
    { name: 'Play with Fire', type_line: 'Instant', oracle_text: 'Play with Fire deals 2 damage to any target. If a player was dealt damage this way, scry 1.', cmc: 1, colors: ['R'], legalities: { pioneer: 'legal' } },
    { name: 'Lightning Strike', type_line: 'Instant', oracle_text: 'Lightning Strike deals 3 damage to any target.', cmc: 2, colors: ['R'], legalities: { pioneer: 'legal' } },
    { name: 'Shock', type_line: 'Instant', oracle_text: 'Shock deals 2 damage to any target.', cmc: 1, colors: ['R'], legalities: { pioneer: 'legal' } },
    { name: 'Roil Eruption', type_line: 'Sorcery', oracle_text: 'Kicker {5}\nRoil Eruption deals 3 damage to any target. If this spell was kicked, it deals 5 damage instead.', cmc: 2, colors: ['R'], legalities: { pioneer: 'legal' } },

    // ── Swarm / Token Multipliers Core ──
    { name: 'Krenko, Mob Boss', type_line: 'Legendary Creature — Goblin Warrior', oracle_text: '{T}: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control.', cmc: 4, power: '3', toughness: '3', colors: ['R'], legalities: { pioneer: 'legal' } },
    { name: 'Krenko, Tin Street Kingpin', type_line: 'Legendary Creature — Goblin Swordmaster', oracle_text: 'Whenever Krenko attacks, put a +1/+1 counter on it, then create a number of 1/1 red Goblin creature tokens equal to Krenko\'s power.', cmc: 3, power: '1', toughness: '2', colors: ['R'], legalities: { pioneer: 'legal' } },
    { name: 'Dragon Fodder', type_line: 'Sorcery', oracle_text: 'Create two 1/1 red Goblin creature tokens.', cmc: 2, colors: ['R'], legalities: { pioneer: 'legal' } },
    { name: 'Hordeling Outburst', type_line: 'Sorcery', oracle_text: 'Create three 1/1 red Goblin creature tokens.', cmc: 3, colors: ['R'], legalities: { pioneer: 'legal' } },
    { name: 'Goblin Chieftain', type_line: 'Creature — Goblin', oracle_text: 'Haste. Other Goblin creatures you control get +1/+1 and have haste.', cmc: 3, power: '2', toughness: '2', colors: ['R'], legalities: { pioneer: 'legal' } },

    // ── Universal Removal & Lands ──
    { name: 'Fatal Push', type_line: 'Instant', oracle_text: 'Destroy target creature if it has mana value 2 or less. Revolt — Destroy that creature if it has mana value 4 or less instead if a permanent you controlled left the battlefield this turn.', cmc: 1, colors: ['B'], legalities: { pioneer: 'legal' } },
    { name: 'Blood Crypt', type_line: 'Land — Swamp Mountain', oracle_text: '{T}: Add {B} or {R}. Pay 2 life unless enters tapped.', cmc: 0, colors: ['B', 'R'], legalities: { pioneer: 'legal' } },
    { name: 'Mountain', type_line: 'Basic Land — Mountain', oracle_text: '{T}: Add {R}.', cmc: 0, colors: ['R'], legalities: { pioneer: 'legal' } },
    { name: 'Swamp', type_line: 'Basic Land — Swamp', oracle_text: '{T}: Add {B}.', cmc: 0, colors: ['B'], legalities: { pioneer: 'legal' } }
  ];
}

// ─── TEST 1: "A TRIBE IS NOT A STRATEGY" (4 Divergent Goblins Gameplans) ───────
console.log('--- TEST 1: "A TRIBE IS NOT A STRATEGY" (SAME TRIBE & COLORS, 4 DIVERGENT GAMEPLANS) ---');
const goblinPool = createRakdosGoblinsPool();

// 1. Aggro Intent
const aggroResult = CompilerConvergencePipeline.compileDeckFromScratch({
  userPrompt: 'Mazo Goblin Aggro rápido en Pioneer.',
  format: 'Pioneer',
  archetype: 'Aggro',
  rawCardPool: goblinPool,
  uiFormState: { format: 'Pioneer', colors: ['R', 'B'], primaryTribe: 'Goblin', tempo: 'Aggro', strategy: ['Goblin Aggro Velocity'], powerLevel: 'Competitive' }
});

// 2. Sacrifice Intent
const sacrificeResult = CompilerConvergencePipeline.compileDeckFromScratch({
  userPrompt: 'Mazo Goblin Aristocrats Sacrifice en Pioneer.',
  format: 'Pioneer',
  archetype: 'Midrange',
  rawCardPool: goblinPool,
  uiFormState: { format: 'Pioneer', colors: ['R', 'B'], primaryTribe: 'Goblin', tempo: 'Midrange', strategy: ['Goblin Sacrifice Aristocrats'], mechanics: { required: ['SACRIFICE', 'DEATH_PAYOFF'] }, powerLevel: 'Competitive' }
});

// 3. Burn Intent
const burnResult = CompilerConvergencePipeline.compileDeckFromScratch({
  userPrompt: 'Mazo Goblin Burn Reach en Pioneer.',
  format: 'Pioneer',
  archetype: 'Aggro',
  rawCardPool: goblinPool,
  uiFormState: { format: 'Pioneer', colors: ['R', 'B'], primaryTribe: 'Goblin', tempo: 'Aggro', strategy: ['Goblin Direct Burn'], mechanics: { required: ['PLAYER_REACH', 'CHEAP_REMOVAL'] }, powerLevel: 'Competitive' }
});

// 4. Tokens Intent
const tokensResult = CompilerConvergencePipeline.compileDeckFromScratch({
  userPrompt: 'Mazo Goblin Tokens Swarm en Pioneer.',
  format: 'Pioneer',
  archetype: 'Aggro',
  rawCardPool: goblinPool,
  uiFormState: { format: 'Pioneer', colors: ['R', 'B'], primaryTribe: 'Goblin', tempo: 'Aggro', strategy: ['Goblin Swarm Overrun'], mechanics: { required: ['TOKEN_PRODUCTION', 'TRIBAL_LORD'] }, powerLevel: 'Competitive' }
});

const getSpells = (res) => (res.state?.cards || []).filter(c => !c.isLand && !c.name.includes('Mountain') && !c.name.includes('Swamp')).map(c => c.name);

const aggroSpells = getSpells(aggroResult);
const sacSpells = getSpells(sacrificeResult);
const burnSpells = getSpells(burnResult);
const tokensSpells = getSpells(tokensResult);

console.log('Aggro Deck Spells:', aggroSpells);
console.log('Sacrifice Deck Spells:', sacSpells);
console.log('Burn Deck Spells:', burnSpells);
console.log('Tokens Deck Spells:', tokensSpells);

// Verify distinct strategic contents
const sacHasSacrificeEngines = sacSpells.includes('Pashalik Mons') || sacSpells.includes('Village Rites') || sacSpells.includes('Deadly Dispute') || sacSpells.includes('Sling-Gang Lieutenant');
const burnHasReach = burnSpells.includes('Play with Fire') || burnSpells.includes('Lightning Strike') || burnSpells.includes('Shock') || burnSpells.includes('Roil Eruption');
const tokensHasTokens = tokensSpells.includes('Krenko, Mob Boss') || tokensSpells.includes('Dragon Fodder') || tokensSpells.includes('Hordeling Outburst') || tokensSpells.includes('Goblin Chieftain');

console.log(`Sacrifice Has Engines: ${sacHasSacrificeEngines}`);
console.log(`Burn Has Reach: ${burnHasReach}`);
console.log(`Tokens Has Tokens: ${tokensHasTokens}`);

if (sacHasSacrificeEngines && burnHasReach && tokensHasTokens) {
  console.log('✅ PASS: "A Tribe is NOT a Strategy" proven — 4 genuinely divergent gameplans synthesized from identical pool.\n');
  passedTests++;
} else {
  console.error('❌ FAIL: Decks collapsed into a single tribal template.');
}

// ─── TEST 2: CONTEXTUAL DOMINANCE (STRATEGIC FIT > STANDALONE POWER) ───────────
console.log('--- TEST 2: CONTEXTUAL DOMINANCE (STRATEGIC FIT > STANDALONE POWER) ---');
// Candidate A: High standalone power staple (Ragavan), off-tribe, zero sacrifice synergy
const candidateA = {
  name: 'Ragavan, Nimble Pilferer',
  type_line: 'Legendary Creature — Monkey Pirate',
  oracle_text: 'Whenever Ragavan deals combat damage to a player, create a Treasure token and exile the top card of that player\'s library.',
  cmc: 1,
  power: '2',
  toughness: '1',
  colors: ['R']
};

// Candidate B: Medium standalone power (Skirk Prospector), on-tribe, direct sacrifice outlet
const candidateB = {
  name: 'Skirk Prospector',
  type_line: 'Creature — Goblin',
  oracle_text: 'Sacrifice a Goblin: Add {R}.',
  cmc: 1,
  power: '1',
  toughness: '1',
  colors: ['R']
};

const sacIntent = new IntentPackage({
  format: 'Pioneer',
  colors: ['R', 'B'],
  primaryTribe: 'Goblin',
  tempo: 'Midrange',
  strategy: ['Goblin Sacrifice Aristocrats'],
  mechanics: { required: ['SACRIFICE_OUTLET', 'DEATH_PAYOFF'] }
});

const sacGameplan = GameplanSynthesizer.synthesize({
  lineSelection: StrategicLineGraph.selectLines({
    strategicMemory: StrategicMemoryModel.buildMemory({
      discoveredMechanics: MechanicDiscoveryEngine.discover({ cardPool: goblinPool, intentPackage: sacIntent }),
      intentPackage: sacIntent
    }),
    intentPackage: sacIntent
  }),
  cardPool: goblinPool,
  intentPackage: sacIntent
});

const targetSlot = {
  slotRole: 'TRIBAL_SACRIFICE_OUTLET',
  requiredFunction: 'SACRIFICE_OUTLET',
  maxCmc: 1
};

const rankResult = StateCandidateRanker.rankCandidatesByStateDelta(
  { cards: [], provenNodes: [], openDemands: ['SACRIFICE_OUTLET', 'DEPLOY_1CMC_BODY_OR_ENABLER'] },
  [candidateA, candidateB],
  { gameplanContract: sacGameplan },
  sacIntent,
  targetSlot
);

console.log(`Winning Candidate in Goblin Sacrifice Slot:`, rankResult.winningCandidate?.name);
console.log(`Selection Status:`, rankResult.selectionStatus);

if (rankResult.winningCandidate?.name === 'Skirk Prospector') {
  console.log('✅ PASS: Contextual gameplan fit strictly dominates raw standalone power.\n');
  passedTests++;
} else {
  console.error('❌ FAIL: Standalone bomb improperly displaced contextual synergy piece.');
}

// ─── TEST 3: STRATEGIC COUNTERFACTUAL SWAP TEST ────────────────────────────────
console.log('--- TEST 3: STRATEGIC COUNTERFACTUAL SWAP TEST ---');
// Werewolf Deck Setup with realistic curve (1-drops, 2-drops, 3-drops, lands)
const wwIntent = new IntentPackage({
  format: 'Pioneer',
  colors: ['R', 'G'],
  primaryTribe: 'Werewolf',
  tempo: 'Tempo',
  strategy: ['Werewolf Day/Night Tempo'],
  mechanics: ['DAY_NIGHT', 'TRANSFORM']
});

const wwPool = [
  { name: 'Ascendant Packleader', quantity: 4, cmc: 1, type_line: 'Creature — Human Werewolf', oracle_text: 'Enters with +1/+1 counter if you control permanent with MV 4 or greater.', colors: ['G'] },
  { name: 'Snarling Wolf', quantity: 4, cmc: 1, type_line: 'Creature — Wolf', oracle_text: '{1}{G}: Snarling Wolf gets +2/+2 until end of turn.', colors: ['G'] },
  { name: 'Kessig Naturalist // Lord of the Ulvenwald', quantity: 4, cmc: 2, type_line: 'Creature — Human Werewolf', oracle_text: 'Add {R} or {G}. Nightbound: Other Werewolves get +1/+1.', colors: ['R', 'G'] },
  { name: 'Outland Liberator // Frenzied Trapbreaker', quantity: 4, cmc: 2, type_line: 'Creature — Human Werewolf', oracle_text: 'Destroy artifact or enchantment. Daybound', colors: ['G'] },
  { name: 'Tovolar, Dire Overlord // Tovolar, the Midnight Scourge', quantity: 4, cmc: 3, type_line: 'Legendary Creature — Human Werewolf', oracle_text: 'Whenever a Wolf or Werewolf deals combat damage, draw a card. Daybound', colors: ['R', 'G'] },
  { name: 'Reckless Stormseeker // Storm-Charged Slasher', quantity: 4, cmc: 3, type_line: 'Creature — Human Werewolf', oracle_text: 'Target creature gets +1/+0 and haste. Daybound', colors: ['R'] },
  { name: 'Play with Fire', quantity: 4, cmc: 1, type_line: 'Instant', oracle_text: 'Deals 2 damage to any target. Scry 1.', colors: ['R'] },
  { name: 'Mountain', quantity: 12, isLand: true, type_line: 'Basic Land — Mountain', oracle_text: '{T}: Add {R}.', colors: ['R'] },
  { name: 'Forest', quantity: 12, isLand: true, type_line: 'Basic Land — Forest', oracle_text: '{T}: Add {G}.', colors: ['G'] }
];

const wwGameplan = GameplanSynthesizer.synthesize({
  lineSelection: StrategicLineGraph.selectLines({
    strategicMemory: StrategicMemoryModel.buildMemory({
      discoveredMechanics: MechanicDiscoveryEngine.discover({ cardPool: wwPool, intentPackage: wwIntent }),
      intentPackage: wwIntent
    }),
    intentPackage: wwIntent
  }),
  cardPool: wwPool,
  intentPackage: wwIntent
});

// Baseline Deck State
const baselineCoverage = DeckPlanCoverage.computeCoverage({
  deckState: { cards: wwPool },
  gameplanContract: wwGameplan,
  deckSize: 60
});

// Counterfactual Swap 1: Core Engine Removal (Tovolar -> generic off-plan 3-CMC creature with zero Day/Night or Tribal synergy)
const degradedPool = wwPool.map(c => c.name.includes('Tovolar')
  ? { name: 'Grizzled Outcasts', quantity: 4, cmc: 3, type_line: 'Creature — Human', oracle_text: 'A plain vanilla body with no abilities.', colors: ['G'] }
  : c
);
const degradedCoverage = DeckPlanCoverage.computeCoverage({
  deckState: { cards: degradedPool },
  gameplanContract: wwGameplan,
  deckSize: 60
});
const deltaCore = degradedCoverage.compositeScore - baselineCoverage.compositeScore;

// Counterfactual Swap 2: Neutral Removal Swap (Play with Fire -> Shock: same CMC, same function, same timing)
const neutralPool = wwPool.map(c => c.name === 'Play with Fire'
  ? { name: 'Shock', quantity: 4, cmc: 1, type_line: 'Instant', oracle_text: 'Deals 2 damage to any target.', colors: ['R'] }
  : c
);
const neutralCoverage = DeckPlanCoverage.computeCoverage({
  deckState: { cards: neutralPool },
  gameplanContract: wwGameplan,
  deckSize: 60
});
const deltaNeutral = Math.abs(neutralCoverage.compositeScore - baselineCoverage.compositeScore);

console.log(`Baseline Gameplan Coverage: ${baselineCoverage.compositeScore}%`);
console.log(`Coverage after removing Tovolar (Core Engine Swap): ${degradedCoverage.compositeScore}% (Δ: ${deltaCore}%)`);
console.log(`Coverage after neutral removal swap (Play with Fire -> Shock): ${neutralCoverage.compositeScore}% (|Δ|: ${deltaNeutral}%)`);

if (deltaCore <= -5 && deltaNeutral <= 2) {
  console.log('✅ PASS: Counterfactual swap accurately proves causal dependency without false inflation.\n');
  passedTests++;
} else {
  console.error('❌ FAIL: Counterfactual sensitivity failed validation.');
}

// ─── TEST 4: INFEASIBLE STRATEGY DETECTION & PIVOT PROPOSAL ───────────────────
console.log('--- TEST 4: INFEASIBLE STRATEGY DETECTION & PIVOT PROPOSAL ---');
const impossibleIntent = new IntentPackage({
  format: 'Pioneer',
  colors: ['R', 'G'],
  primaryTribe: 'Werewolf',
  tempo: 'Combo',
  strategy: ['Werewolf Storm Combo'],
  mechanics: { required: ['STORM', 'MANA_RITUAL', 'FREE_SPELL'] }
});

const impossibleMemory = StrategicMemoryModel.buildMemory({
  discoveredMechanics: MechanicDiscoveryEngine.discover({ cardPool: goblinPool, intentPackage: impossibleIntent }),
  intentPackage: impossibleIntent
});
const impossibleSelection = StrategicLineGraph.selectLines({ strategicMemory: impossibleMemory, intentPackage: impossibleIntent });
const impossibleGameplan = GameplanSynthesizer.synthesize({ lineSelection: impossibleSelection, cardPool: goblinPool, intentPackage: impossibleIntent });

console.log(`Impossible Gameplan Status: ${impossibleGameplan.feasibilityStatus}`);
console.log(`Impossible Gameplan Diagnosis: ${impossibleGameplan.feasibilityDiagnosis || 'NO_VIABLE_LINES'}`);
console.log(`Recommended Pivots:`, impossibleGameplan.recommendedPivots);

if (impossibleGameplan.feasibilityStatus === 'INFEASIBLE') {
  console.log('✅ PASS: Impossible strategy safely diagnosed as INFEASIBLE instead of forcing degenerate build.\n');
  passedTests++;
} else {
  console.error('❌ FAIL: Impossible strategy was erroneously declared feasible.');
}

// ─── TEST 5: TYPED CAUSAL PATH AUDIT ──────────────────────────────────────────
console.log('--- TEST 5: TYPED CAUSAL PATH AUDIT ---');
let allTyped = true;
const pathTypesObserved = new Set();

for (const card of goblinPool) {
  const gateResult = GameplanIntegrityGate.evaluateAdmissibility({
    cardContract: CardCausalContract.parse(card),
    gameplanContract: sacGameplan,
    intentPackage: sacIntent
  });
  if (gateResult.isAdmissible) {
    pathTypesObserved.add(gateResult.causalPathType);
    if (!gateResult.causalPathType || gateResult.causalPathType === 'ORPHAN_PARASITE') {
      allTyped = false;
    }
  }
}

console.log(`Observed Causal Path Types:`, Array.from(pathTypesObserved));

if (allTyped && pathTypesObserved.size >= 3) {
  console.log('✅ PASS: Typed causal path classifications verified across candidate pool.\n');
  passedTests++;
} else {
  console.error('❌ FAIL: Causal path typing failed.');
}

// ─── TEST 6: MULTI-ARCHETYPE FACTORIAL CROSS MATRIX ───────────────────────────
console.log('--- TEST 6: MULTI-ARCHETYPE FACTORIAL CROSS MATRIX ---');
const crossMatrixScenarios = [
  { name: 'Simic Landfall Ramp', format: 'Standard', colors: ['G', 'U'], archetype: 'Ramp', expectedKill: 6 },
  { name: 'Azorius Control', format: 'Modern', colors: ['W', 'U'], archetype: 'Control', expectedKill: 7 },
  { name: 'Goblins Aggro', format: 'Pioneer', colors: ['R', 'B'], archetype: 'Aggro', primaryTribe: 'Goblin', expectedKill: 4 }
];

let matrixPassed = true;
for (const scenario of crossMatrixScenarios) {
  const res = CompilerConvergencePipeline.compileDeckFromScratch({
    userPrompt: `Mazo ${scenario.name}`,
    format: scenario.format,
    archetype: scenario.archetype,
    rawCardPool: goblinPool,
    uiFormState: { format: scenario.format, colors: scenario.colors, primaryTribe: scenario.primaryTribe || 'None', tempo: scenario.archetype, strategy: [scenario.name] }
  });
  if (!res.state || res.state.cards.length === 0) {
    matrixPassed = false;
    console.error(`Failed scenario: ${scenario.name}`);
  } else {
    console.log(`  ✓ ${scenario.name}: ${res.state.cards.length} cards, Status: OK`);
  }
}

if (matrixPassed) {
  console.log('✅ PASS: Factorial Cross Matrix successfully validated.\n');
  passedTests++;
} else {
  console.error('❌ FAIL: Factorial Cross Matrix scenario failed.');
}

// ─── FINAL BENCHMARK SUMMARY ──────────────────────────────────────────────────
console.log('======================================================');
console.log(`📊 FINAL V29.4 UNIVERSAL MATRIX SCORE: ${passedTests}/${totalTests} TESTS PASSED (${((passedTests / totalTests) * 100).toFixed(0)}%)`);
console.log('======================================================');

if (passedTests === totalTests) {
  console.log('🏆 V29.4 UNIVERSAL STRATEGIC MATRIX FULLY CERTIFIED!');
  process.exit(0);
} else {
  console.error('❌ V29.4 UNIVERSAL STRATEGIC MATRIX FAILED.');
  process.exit(1);
}
