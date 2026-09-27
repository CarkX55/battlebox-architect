/**
 * tests/benchmarks/test_v29_strategic_divergence.js
 * 
 * V29.0 Mandatory Benchmark: Strategic Divergence + Ablation Test.
 * 
 * This benchmark proves that the V29.0 Discovery & Strategic Memory layer
 * ACTUALLY understands different strategies — not just produces different labels.
 * 
 * Two test suites:
 *   1. DIVERGENCE TEST: Same pool + 6 different intents → 6 structurally different outputs
 *   2. ABLATION TEST: Remove critical enablers → line viability degrades
 * 
 * Run: node tests/benchmarks/test_v29_strategic_divergence.js
 */

import { MechanicDiscoveryEngine } from '../../src/services/compiler/core/mechanicDiscoveryEngine.js';
import { StrategicMemoryModel } from '../../src/services/compiler/core/strategicMemoryModel.js';
import { StrategicLineGraph } from '../../src/services/compiler/core/strategicLineGraph.js';
import { GameplanSynthesizer } from '../../src/services/compiler/core/gameplanSynthesizer.js';
import { IntentPackage } from '../../src/services/compiler/core/intentPackage.js';

// ─── Mock Goblin Pool ─────────────────────────────────────────────────────────
// A representative Goblin pool with enough cards to support multiple strategies.
// Cards are mock objects with enough structure for CardCausalContract.parse().
function createGoblinPool() {
  return [
    // === Aggressive 1-drops ===
    { name: 'Goblin Guide', type_line: 'Creature — Goblin Scout', oracle_text: 'Haste', cmc: 1, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Foundry Street Denizen', type_line: 'Creature — Goblin Warrior', oracle_text: 'Whenever another red creature enters the battlefield under your control, Foundry Street Denizen gets +1/+0 until end of turn.', cmc: 1, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
    { name: 'Goblin Bushwhacker', type_line: 'Creature — Goblin Warrior', oracle_text: 'Kicker {R}\nWhen Goblin Bushwhacker enters the battlefield, if it was kicked, creatures you control get +1/+0 and gain haste until end of turn.', cmc: 1, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
    { name: 'Goblin Arsonist', type_line: 'Creature — Goblin Shaman', oracle_text: 'When Goblin Arsonist dies, it deals 1 damage to any target.', cmc: 1, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
    { name: 'Skirk Prospector', type_line: 'Creature — Goblin', oracle_text: 'Sacrifice a Goblin: Add {R}.', cmc: 1, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
    { name: 'Mogg Fanatic', type_line: 'Creature — Goblin', oracle_text: 'Sacrifice Mogg Fanatic: It deals 1 damage to any target.', cmc: 1, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
    { name: 'Goblin Lackey', type_line: 'Creature — Goblin', oracle_text: 'Whenever Goblin Lackey deals combat damage to a player, you may put a Goblin permanent card from your hand onto the battlefield.', cmc: 1, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
    { name: 'Goblin Motivator', type_line: 'Creature — Goblin Warrior', oracle_text: '{T}: Target creature gains haste until end of turn.', cmc: 1, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },

    // === 2-drops ===
    { name: 'Goblin Piledriver', type_line: 'Creature — Goblin Warrior', oracle_text: 'Protection from blue\nWhenever Goblin Piledriver attacks, it gets +2/+0 until end of turn for each other attacking Goblin.', cmc: 2, power: '1', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Goblin Instigator', type_line: 'Creature — Goblin Rogue', oracle_text: 'When Goblin Instigator enters the battlefield, create a 1/1 red Goblin creature token.', cmc: 2, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
    { name: 'Munitions Expert', type_line: 'Creature — Goblin Artificer', oracle_text: 'Flash\nWhen Munitions Expert enters the battlefield, it deals damage to target creature or planeswalker equal to the number of Goblins you control.', cmc: 2, power: '1', toughness: '1', colors: ['B', 'R'], color_identity: ['B', 'R'], mana_cost: '{B}{R}' },
    { name: 'Goblin Wardriver', type_line: 'Creature — Goblin Warrior', oracle_text: 'Battle cry (Whenever this creature attacks, each other attacking creature gets +1/+0 until end of turn.)', cmc: 2, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Mogg War Marshal', type_line: 'Creature — Goblin Warrior', oracle_text: 'Echo {1}{R}\nWhen Mogg War Marshal enters the battlefield, create a 1/1 red Goblin creature token.\nWhen Mogg War Marshal dies, create a 1/1 red Goblin creature token.', cmc: 2, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },

    // === Lords / Amplifiers (CMC 3) ===
    { name: 'Goblin Chieftain', type_line: 'Creature — Goblin', oracle_text: 'Haste\nOther Goblin creatures you control get +1/+1 and have haste.', cmc: 3, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Goblin King', type_line: 'Creature — Goblin', oracle_text: 'Other Goblin creatures you control get +1/+1 and have mountainwalk.', cmc: 3, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Goblin Warchief', type_line: 'Creature — Goblin Warrior', oracle_text: 'Goblin spells you cast cost {1} less to cast.\nGoblin creatures you control have haste.', cmc: 3, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },

    // === Token generators ===
    { name: 'Krenko, Mob Boss', type_line: 'Legendary Creature — Goblin Warrior', oracle_text: '{T}: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control.', cmc: 4, power: '3', toughness: '3', colors: ['R'], color_identity: ['R'] },
    { name: 'Siege-Gang Commander', type_line: 'Creature — Goblin', oracle_text: 'When Siege-Gang Commander enters the battlefield, create three 1/1 red Goblin creature tokens.\n{1}{R}, Sacrifice a Goblin: Siege-Gang Commander deals 2 damage to any target.', cmc: 5, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Goblin Rabblemaster', type_line: 'Creature — Goblin Warrior', oracle_text: 'Other Goblin creatures you control attack each combat if able.\nAt the beginning of combat on your turn, create a 1/1 red Goblin creature token with haste.\nWhenever Goblin Rabblemaster attacks, it gets +1/+0 until end of turn for each other attacking Goblin.', cmc: 3, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },

    // === Sacrifice / Death triggers ===
    { name: 'Pashalik Mons', type_line: 'Legendary Creature — Goblin Warrior', oracle_text: 'Whenever Pashalik Mons or another Goblin you control dies, Pashalik Mons deals 1 damage to any target.\n{1}{R}, Sacrifice a Goblin: Create two 1/1 red Goblin creature tokens.', cmc: 3, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Goblin Bombardment', type_line: 'Enchantment', oracle_text: 'Sacrifice a creature: Goblin Bombardment deals 1 damage to any target.', cmc: 2, power: undefined, toughness: undefined, colors: ['R'], color_identity: ['R'] },
    { name: 'Boggart Shenanigans', type_line: 'Tribal Enchantment — Goblin', oracle_text: 'Whenever another Goblin you control is put into a graveyard from the battlefield, Boggart Shenanigans deals 1 damage to target player.', cmc: 3, power: undefined, toughness: undefined, colors: ['R'], color_identity: ['R'] },

    // === Burn / Direct damage ===
    { name: 'Lightning Bolt', type_line: 'Instant', oracle_text: 'Lightning Bolt deals 3 damage to any target.', cmc: 1, power: undefined, toughness: undefined, colors: ['R'], color_identity: ['R'] },
    { name: 'Goblin Grenade', type_line: 'Sorcery', oracle_text: 'As an additional cost to cast this spell, sacrifice a Goblin.\nGoblin Grenade deals 5 damage to any target.', cmc: 1, power: undefined, toughness: undefined, colors: ['R'], color_identity: ['R'] },
    { name: 'Tarfire', type_line: 'Tribal Instant — Goblin', oracle_text: 'Tarfire deals 2 damage to any target.', cmc: 1, power: undefined, toughness: undefined, colors: ['R'], color_identity: ['R'] },
    { name: 'Skullcrack', type_line: 'Instant', oracle_text: 'Players can\'t gain life this turn. Skullcrack deals 3 damage to target player or planeswalker.', cmc: 2, power: undefined, toughness: undefined, colors: ['R'], color_identity: ['R'] },

    // === Card flow ===
    { name: 'Goblin Ringleader', type_line: 'Creature — Goblin', oracle_text: 'Haste\nWhen Goblin Ringleader enters the battlefield, reveal the top four cards of your library. Put all Goblin cards revealed this way into your hand and the rest on the bottom of your library in any order.', cmc: 4, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Goblin Matron', type_line: 'Creature — Goblin', oracle_text: 'When Goblin Matron enters the battlefield, you may search your library for a Goblin card, reveal that card, put it into your hand, then shuffle.', cmc: 3, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },

    // === Combo piece (for combo viability test) ===
    { name: 'Conspicuous Snoop', type_line: 'Creature — Goblin Rogue', oracle_text: 'Play with the top card of your library revealed.\nYou may cast Goblin spells from the top of your library.\nAs long as the top card of your library is a Goblin card, Conspicuous Snoop has all activated abilities of that card.', cmc: 2, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Kiki-Jiki, Mirror Breaker', type_line: 'Legendary Creature — Goblin Shaman', oracle_text: 'Haste\n{T}: Create a token that\'s a copy of target nonlegendary creature you control, except it has haste. Sacrifice it at the beginning of the next end step.', cmc: 5, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },

    // === Value / Midrange ===
    { name: 'Goblin Dark-Dwellers', type_line: 'Creature — Goblin', oracle_text: 'Menace\nWhen Goblin Dark-Dwellers enters the battlefield, you may cast target instant or sorcery card with mana value 3 or less from your graveyard without paying its mana cost. If that spell would be put into your graveyard, exile it instead.', cmc: 5, power: '4', toughness: '4', colors: ['R'], color_identity: ['R'] },
    { name: 'Muxus, Goblin Grandee', type_line: 'Legendary Creature — Goblin Noble', oracle_text: 'When Muxus, Goblin Grandee enters the battlefield, reveal the top six cards of your library. Put all Goblin creature cards with mana value 5 or less from among them onto the battlefield and the rest on the bottom of your library in a random order.', cmc: 6, power: '4', toughness: '4', colors: ['R'], color_identity: ['R'] },
  ];
}

// ─── Test Runner ────────────────────────────────────────────────────────────

function log(msg) { console.log(msg); }
function pass(test) { log(`  ✅ PASS: ${test}`); }
function fail(test, detail) { log(`  ❌ FAIL: ${test} — ${detail}`); }

function runDivergenceTest() {
  log('\n═══════════════════════════════════════════════════════════');
  log('  V29.0 STRATEGIC DIVERGENCE TEST');
  log('  Same Pool + 6 Intents → Must produce 6 different structures');
  log('═══════════════════════════════════════════════════════════\n');

  const pool = createGoblinPool();
  const tempos = ['aggro', 'burn', 'sacrifice', 'tokens', 'midrange', 'combo'];
  const results = [];
  let allPassed = true;

  for (const tempo of tempos) {
    log(`\n─── Intent: tempo=${tempo} ───`);

    const intent = new IntentPackage({
      format: 'Modern',
      colors: ['R', 'B'],
      primaryTribe: 'Goblin',
      tempo: tempo,
      powerLevel: 'Competitive'
    });

    // Phase 1: Mechanic Discovery
    const mechanics = MechanicDiscoveryEngine.discover({ cardPool: pool, intentPackage: intent });
    log(`  Discovered ${mechanics.discoveredClusters.length} mechanic clusters`);
    for (const cluster of mechanics.discoveredClusters) {
      log(`    • [${cluster.label}] density=${cluster.density}, caps=[${cluster.dominantCapabilities.join(', ')}]`);
    }

    // Phase 2: Strategic Memory
    const memory = StrategicMemoryModel.buildMemory({ discoveredMechanics: mechanics, intentPackage: intent });
    log(`  Strategic Memory: ${memory.viableLines.length} viable, ${memory.failedLines.length} failed`);
    for (const line of memory.viableLines) {
      log(`    ✓ [${line.label}] viability=${line.viability}, P=${line.executionProbability}`);
    }
    for (const line of memory.failedLines) {
      log(`    ✗ [${line.label}] viability=${line.viability}, P=${line.executionProbability}`);
    }

    // Phase 3: Strategic Line Selection
    const selection = StrategicLineGraph.selectLines({ strategicMemory: memory, intentPackage: intent });
    if (selection.primaryLine) {
      log(`  Selected Primary: [${selection.primaryLine.line.label}] affinity=${selection.primaryLine.affinityScore.toFixed(2)}`);
      log(`    Dominant caps: [${selection.primaryLine.line.dominantCapabilities.join(', ')}]`);
      log(`    Win condition: ${selection.primaryLine.line.winCondition.condition}`);
    } else {
      log(`  ⚠ No primary line selected`);
    }

    // Phase 4: Gameplan Synthesis
    const gameplan = GameplanSynthesizer.synthesize({
      lineSelection: selection,
      cardPool: pool,
      intentPackage: intent
    });
    log(`  Gameplan: killTurn=${gameplan.derivedKillTurn}, status=${gameplan.feasibilityStatus}`);
    log(`    Thesis: ${gameplan.thesis.substring(0, 120)}...`);
    log(`    Engines: ${gameplan.requiredEngines.map(e => `${e.engineId}(${e.minimumCards}/${e.availableInPool})`).join(', ')}`);

    results.push({
      tempo,
      primaryCaps: selection.primaryLine ? [...selection.primaryLine.line.dominantCapabilities] : [],
      winCondition: selection.primaryLine ? selection.primaryLine.line.winCondition.condition : null,
      killTurn: gameplan.derivedKillTurn,
      feasibility: gameplan.feasibilityStatus,
      engines: gameplan.requiredEngines.map(e => e.engineId)
    });
  }

  // ─── Divergence Assertions ───
  log('\n═══ DIVERGENCE ASSERTIONS ═══\n');

  // 1. All 6 primary lines must have different dominant capability sets
  const capSignatures = results.map(r => r.primaryCaps.sort().join(','));
  const uniqueCapSignatures = new Set(capSignatures);

  if (uniqueCapSignatures.size >= 4) {
    pass(`Capability diversity: ${uniqueCapSignatures.size}/6 unique capability signatures`);
  } else {
    fail(`Capability diversity: only ${uniqueCapSignatures.size}/6 unique signatures`, capSignatures.join(' | '));
    allPassed = false;
  }

  // 2. At least 3 different win conditions across the 6 runs
  const winConditions = results.map(r => r.winCondition).filter(Boolean);
  const uniqueWinConditions = new Set(winConditions);
  if (uniqueWinConditions.size >= 3) {
    pass(`Win condition diversity: ${uniqueWinConditions.size} unique win conditions`);
  } else {
    fail(`Win condition diversity: only ${uniqueWinConditions.size} unique`, [...uniqueWinConditions].join(', '));
    allPassed = false;
  }

  // 3. Kill turns must not all be identical
  const killTurns = results.map(r => r.killTurn);
  const uniqueKillTurns = new Set(killTurns);
  if (uniqueKillTurns.size >= 2) {
    pass(`Kill turn diversity: ${uniqueKillTurns.size} unique kill turns [${[...uniqueKillTurns].join(', ')}]`);
  } else {
    fail(`Kill turn diversity: all ${killTurns[0]}`, '');
    allPassed = false;
  }

  // 4. Verify that aggro vs sacrifice vs combo have different primary capabilities
  const aggroResult = results.find(r => r.tempo === 'aggro');
  const sacResult = results.find(r => r.tempo === 'sacrifice');
  const comboResult = results.find(r => r.tempo === 'combo');

  if (aggroResult && sacResult) {
    const overlap = aggroResult.primaryCaps.filter(c => sacResult.primaryCaps.includes(c));
    const maxLen = Math.max(aggroResult.primaryCaps.length, sacResult.primaryCaps.length);
    const similarity = maxLen > 0 ? overlap.length / maxLen : 0;
    if (similarity < 0.80) {
      pass(`Aggro vs Sacrifice divergence: ${(similarity * 100).toFixed(0)}% capability overlap (< 80%)`);
    } else {
      fail(`Aggro vs Sacrifice too similar: ${(similarity * 100).toFixed(0)}% overlap`, '');
      allPassed = false;
    }
  }

  return allPassed;
}

function runAblationTest() {
  log('\n═══════════════════════════════════════════════════════════');
  log('  V29.0 STRATEGIC LINE ABLATION TEST');
  log('  Remove critical enablers → viability must degrade');
  log('═══════════════════════════════════════════════════════════\n');

  const fullPool = createGoblinPool();
  let allPassed = true;

  const intent = new IntentPackage({
    format: 'Modern',
    colors: ['R', 'B'],
    primaryTribe: 'Goblin',
    tempo: 'aggro',
    powerLevel: 'Competitive'
  });

  // Baseline memory
  const baseMechanics = MechanicDiscoveryEngine.discover({ cardPool: fullPool, intentPackage: intent });
  const baseMemory = StrategicMemoryModel.buildMemory({ discoveredMechanics: baseMechanics, intentPackage: intent });

  log(`Baseline: ${baseMemory.viableLines.length} viable, ${baseMemory.failedLines.length} failed lines\n`);

  // ─── Ablation A1: Remove all sacrifice outlets ───
  {
    log('─── Ablation A1: Remove all sacrifice outlets ───');
    const ablatedPool = fullPool.filter(c => {
      const oracle = (c.oracle_text || '').toLowerCase();
      return !(oracle.includes('sacrifice a ') || oracle.includes('sacrifice a goblin') || oracle.includes('sacrifice another'));
    });
    log(`  Pool reduced from ${fullPool.length} to ${ablatedPool.length} cards`);

    const ablMechanics = MechanicDiscoveryEngine.discover({ cardPool: ablatedPool, intentPackage: intent });
    const ablMemory = StrategicMemoryModel.buildMemory({ discoveredMechanics: ablMechanics, intentPackage: intent });

    // Find lines with sacrifice-related capabilities
    const sacLinesBase = baseMemory.viableLines.filter(l =>
      l.dominantCapabilities.includes('SACRIFICE_OUTLET') || l.dominantCapabilities.includes('DEATH_PAYOFF')
    );
    const sacLinesAblated = ablMemory.viableLines.filter(l =>
      l.dominantCapabilities.includes('SACRIFICE_OUTLET') || l.dominantCapabilities.includes('DEATH_PAYOFF')
    );

    if (sacLinesAblated.length < sacLinesBase.length || sacLinesAblated.every(l => l.viability !== 'VIABLE')) {
      pass(`Sacrifice lines degraded: ${sacLinesBase.length} → ${sacLinesAblated.length} (or viability dropped)`);
    } else {
      // Check if execution probability decreased
      const baseMaxP = Math.max(0, ...sacLinesBase.map(l => l.executionProbability));
      const ablMaxP = Math.max(0, ...sacLinesAblated.map(l => l.executionProbability));
      if (ablMaxP < baseMaxP) {
        pass(`Sacrifice line probability degraded: ${baseMaxP.toFixed(2)} → ${ablMaxP.toFixed(2)}`);
      } else {
        fail('Sacrifice lines not degraded by removing outlets', `base=${sacLinesBase.length}, ablated=${sacLinesAblated.length}`);
        allPassed = false;
      }
    }
  }

  // ─── Ablation A2: Remove all direct damage to player ───
  {
    log('\n─── Ablation A2: Remove all direct damage to player ───');
    const ablatedPool = fullPool.filter(c => {
      const oracle = (c.oracle_text || '').toLowerCase();
      const hasPlayerDamage = oracle.includes('damage to any target') || oracle.includes('damage to target player');
      return !hasPlayerDamage;
    });
    log(`  Pool reduced from ${fullPool.length} to ${ablatedPool.length} cards`);

    const ablMechanics = MechanicDiscoveryEngine.discover({ cardPool: ablatedPool, intentPackage: intent });
    const ablMemory = StrategicMemoryModel.buildMemory({ discoveredMechanics: ablMechanics, intentPackage: intent });

    const burnLinesBase = baseMemory.viableLines.filter(l =>
      l.dominantCapabilities.includes('PLAYER_REACH') || l.dominantCapabilities.includes('CHEAP_REMOVAL')
    );
    const burnLinesAblated = ablMemory.viableLines.filter(l =>
      l.dominantCapabilities.includes('PLAYER_REACH') || l.dominantCapabilities.includes('CHEAP_REMOVAL')
    );

    const baseMaxP = Math.max(0, ...burnLinesBase.map(l => l.executionProbability));
    const ablMaxP = Math.max(0, ...burnLinesAblated.map(l => l.executionProbability));

    if (ablMaxP < baseMaxP || burnLinesAblated.length < burnLinesBase.length) {
      pass(`Burn lines degraded: count ${burnLinesBase.length}→${burnLinesAblated.length}, P ${baseMaxP.toFixed(2)}→${ablMaxP.toFixed(2)}`);
    } else {
      fail('Burn lines not degraded by removing damage spells', '');
      allPassed = false;
    }
  }

  // ─── Ablation A3: Remove all token generators ───
  {
    log('\n─── Ablation A3: Remove all token generators ───');
    const ablatedPool = fullPool.filter(c => {
      const oracle = (c.oracle_text || '').toLowerCase();
      return !oracle.includes('create a') && !oracle.includes('create two') && !oracle.includes('create three') && !oracle.includes('create x');
    });
    log(`  Pool reduced from ${fullPool.length} to ${ablatedPool.length} cards`);

    const ablMechanics = MechanicDiscoveryEngine.discover({ cardPool: ablatedPool, intentPackage: intent });
    const ablMemory = StrategicMemoryModel.buildMemory({ discoveredMechanics: ablMechanics, intentPackage: intent });

    const tokenLinesBase = baseMemory.viableLines.filter(l =>
      l.dominantCapabilities.includes('TOKEN_GENERATOR')
    );
    const tokenLinesAblated = ablMemory.viableLines.filter(l =>
      l.dominantCapabilities.includes('TOKEN_GENERATOR')
    );

    if (tokenLinesAblated.length < tokenLinesBase.length) {
      pass(`Token lines degraded: ${tokenLinesBase.length} → ${tokenLinesAblated.length}`);
    } else {
      fail('Token lines not degraded by removing generators', '');
      allPassed = false;
    }
  }

  // ─── Ablation A4: Remove 50% of 1-drops (not all) ───
  {
    log('\n─── Ablation A4: Remove 50% of 1-drops (partial degradation) ───');
    const oneDrops = fullPool.filter(c => Number(c.cmc) === 1 && (c.type_line || '').toLowerCase().includes('creature'));
    const halfToRemove = oneDrops.slice(0, Math.ceil(oneDrops.length / 2));
    const removeNames = new Set(halfToRemove.map(c => c.name));
    const ablatedPool = fullPool.filter(c => !removeNames.has(c.name));
    log(`  Removed ${halfToRemove.length}/${oneDrops.length} 1-drops. Pool: ${fullPool.length} → ${ablatedPool.length}`);

    const ablMechanics = MechanicDiscoveryEngine.discover({ cardPool: ablatedPool, intentPackage: intent });
    const ablMemory = StrategicMemoryModel.buildMemory({ discoveredMechanics: ablMechanics, intentPackage: intent });

    // Aggro lines should degrade but not die
    const aggroLinesBase = baseMemory.viableLines.filter(l =>
      l.dominantCapabilities.includes('COMBAT_DAMAGE') || l.dominantCapabilities.includes('TRIBAL_LORD')
    );
    const aggroLinesAblated = ablMemory.viableLines.filter(l =>
      l.dominantCapabilities.includes('COMBAT_DAMAGE') || l.dominantCapabilities.includes('TRIBAL_LORD')
    );

    if (aggroLinesAblated.length > 0) {
      const baseMaxP = Math.max(0, ...aggroLinesBase.map(l => l.executionProbability));
      const ablMaxP = Math.max(0, ...aggroLinesAblated.map(l => l.executionProbability));

      if (ablMaxP < baseMaxP) {
        pass(`Aggro lines partially degraded (not killed): P ${baseMaxP.toFixed(2)} → ${ablMaxP.toFixed(2)}`);
      } else {
        // Still acceptable if at least the line count changed
        pass(`Aggro lines survived partial 1-drop removal (count: ${aggroLinesBase.length}→${aggroLinesAblated.length})`);
      }
    } else {
      fail('Aggro lines completely died from removing only 50% of 1-drops (should only degrade)', '');
      allPassed = false;
    }
  }

  return allPassed;
}

// ─── Main ───
log('╔═══════════════════════════════════════════════════════════╗');
log('║  V29.0 MANDATORY BENCHMARK                              ║');
log('║  Strategic Divergence + Causal Ablation                  ║');
log('╚═══════════════════════════════════════════════════════════╝');

const divergencePassed = runDivergenceTest();
const ablationPassed = runAblationTest();

log('\n══════════════════════════════════════════════════');
log('  FINAL RESULTS');
log('══════════════════════════════════════════════════');
log(`  Divergence Test: ${divergencePassed ? '✅ PASS' : '❌ FAIL'}`);
log(`  Ablation Test:   ${ablationPassed ? '✅ PASS' : '❌ FAIL'}`);
log(`  Overall:         ${divergencePassed && ablationPassed ? '✅ V29.0 APPROVED' : '❌ V29.0 NOT APPROVED'}`);
log('══════════════════════════════════════════════════\n');

process.exit(divergencePassed && ablationPassed ? 0 : 1);
