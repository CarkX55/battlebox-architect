/**
 * tests/benchmarks/test_v29_5_baseline.js
 * 
 * V29.5 Phase A: Runtime Baseline & Authority Map Audit.
 * Captures an immutable snapshot of current compilation behavior across 8 core archetypes.
 */

import { CompilerConvergencePipeline } from '../../src/knowledge/compiler/CompilerConvergencePipeline.js';
import { CardCausalContract } from '../../src/services/compiler/core/cardCausalContract.js';

function createUniversalPool() {
  return [
    // === GOBLINS (AGGRO / BURN / SACRIFICE / SWARM) ===
    { name: 'Goblin Guide', type_line: 'Creature — Goblin Scout', oracle_text: 'Haste. Whenever attacks, opponent reveals top card.', cmc: 1, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Foundry Street Denizen', type_line: 'Creature — Goblin Warrior', oracle_text: 'Whenever another red creature enters, gets +1/+0.', cmc: 1, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
    { name: 'Skirk Prospector', type_line: 'Creature — Goblin', oracle_text: 'Sacrifice a Goblin: Add {R}.', cmc: 1, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
    { name: 'Torch Courier', type_line: 'Creature — Goblin', oracle_text: 'Haste. {T}, Sacrifice: Target gains haste.', cmc: 1, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
    { name: 'Battle Cry Goblin', type_line: 'Creature — Goblin Shaman', oracle_text: 'Whenever attacks, each other attacking Goblin gets +1/+0. {1}{R}: Target gains haste.', cmc: 2, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Rundvelt Hordemaster', type_line: 'Creature — Goblin Warrior', oracle_text: 'Other Goblins get +1/+1. When a Goblin dies, exile top card, may play it.', cmc: 2, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
    { name: 'Goblin Instigator', type_line: 'Creature — Goblin Rogue', oracle_text: 'When enters, create a 1/1 red Goblin creature token.', cmc: 2, power: '1', toughness: '1', colors: ['R'], color_identity: ['R'] },
    { name: 'Goblin Chieftain', type_line: 'Creature — Goblin Warrior', oracle_text: 'Haste. Other Goblins get +1/+1 and have haste.', cmc: 3, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Goblin Warchief', type_line: 'Creature — Goblin Warrior', oracle_text: 'Goblin spells cost {1} less. Goblins have haste.', cmc: 3, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Reckless Bushwhacker', type_line: 'Creature — Goblin Warrior', oracle_text: 'Surge {1}{R}. When enters with surge, other creatures get +1/+0 and gain haste.', cmc: 3, power: '2', toughness: '1', colors: ['R'], color_identity: ['R'] },
    { name: 'Pashalik Mons', type_line: 'Legendary Creature — Goblin Warrior', oracle_text: 'Whenever Pashalik Mons or another Goblin dies, deals 1 damage to any target. {3}{R}, Sacrifice a Goblin: Create two 1/1 red Goblin tokens.', cmc: 3, power: '2', toughness: '2', colors: ['R'], color_identity: ['R'] },
    { name: 'Sling-Gang Lieutenant', type_line: 'Creature — Goblin', oracle_text: 'When enters, create two 1/1 red Goblin tokens. Sacrifice a Goblin: Target opponent loses 1 life and you gain 1 life.', cmc: 4, power: '1', toughness: '1', colors: ['B'], color_identity: ['B'] },
    { name: 'Krenko, Mob Boss', type_line: 'Legendary Creature — Goblin Warrior', oracle_text: '{T}: Create X 1/1 red Goblin tokens, where X is the number of Goblins you control.', cmc: 4, power: '3', toughness: '3', colors: ['R'], color_identity: ['R'] },
    { name: 'Blood Artist', type_line: 'Creature — Vampire', oracle_text: 'Whenever Blood Artist or another creature dies, target player loses 1 life and you gain 1 life.', cmc: 2, power: '0', toughness: '1', colors: ['B'], color_identity: ['B'] },
    { name: 'Play with Fire', type_line: 'Instant', oracle_text: 'Deals 2 damage to any target. If player dealt damage, scry 1.', cmc: 1, colors: ['R'], color_identity: ['R'] },
    { name: 'Shock', type_line: 'Instant', oracle_text: 'Deals 2 damage to any target.', cmc: 1, colors: ['R'], color_identity: ['R'] },
    { name: 'Lightning Strike', type_line: 'Instant', oracle_text: 'Deals 3 damage to any target.', cmc: 2, colors: ['R'], color_identity: ['R'] },
    { name: 'Roil Eruption', type_line: 'Sorcery', oracle_text: 'Deals 3 damage to any target.', cmc: 2, colors: ['R'], color_identity: ['R'] },
    { name: 'Fatal Push', type_line: 'Instant', oracle_text: 'Destroy target creature with mana value 2 or less.', cmc: 1, colors: ['B'], color_identity: ['B'] },
    { name: 'Thoughtseize', type_line: 'Sorcery', oracle_text: 'Target player reveals hand, choose nonland card, they discard it. You lose 2 life.', cmc: 1, colors: ['B'], color_identity: ['B'] },
    { name: 'Dreadbore', type_line: 'Sorcery', oracle_text: 'Destroy target creature or planeswalker.', cmc: 2, colors: ['B', 'R'], color_identity: ['B', 'R'] },
    { name: 'Kroxa, Titan of Death\'s Hunger', type_line: 'Legendary Creature — Elder Giant', oracle_text: 'When enters, sacrifices unless escaped. Opponents discard.', cmc: 2, power: '6', toughness: '6', colors: ['B', 'R'], color_identity: ['B', 'R'] },

    // === WEREWOLVES / GRUUL TEMPO ===
    { name: 'Snarling Wolf', type_line: 'Creature — Wolf', oracle_text: '{1}{G}: Gets +2/+2.', cmc: 1, power: '1', toughness: '1', colors: ['G'], color_identity: ['G'] },
    { name: 'Kessig Naturalist', type_line: 'Creature — Human Werewolf // Werewolf', card_faces: [{ name: 'Kessig Naturalist', type_line: 'Creature — Human Werewolf', oracle_text: 'Daybound' }, { name: 'Lord of the Ulvenwald', type_line: 'Creature — Werewolf', oracle_text: 'Nightbound' }], cmc: 2, power: '2', toughness: '2', colors: ['R', 'G'], color_identity: ['R', 'G'] },
    { name: 'Outland Liberator', type_line: 'Creature — Human Werewolf // Werewolf', card_faces: [{ name: 'Outland Liberator', type_line: 'Creature — Human Werewolf', oracle_text: 'Daybound' }, { name: 'Frenzied Trapbreaker', type_line: 'Creature — Werewolf', oracle_text: 'Nightbound' }], cmc: 2, power: '1', toughness: '3', colors: ['G'], color_identity: ['G'] },
    { name: 'Reckless Stormseeker', type_line: 'Creature — Human Werewolf // Werewolf', card_faces: [{ name: 'Reckless Stormseeker', type_line: 'Creature — Human Werewolf', oracle_text: 'Daybound' }, { name: 'Storm-Charged Slasher', type_line: 'Creature — Werewolf', oracle_text: 'Nightbound' }], cmc: 3, power: '2', toughness: '3', colors: ['R'], color_identity: ['R'] },
    { name: 'Tovolar, Dire Overlord // Tovolar, the Midnight Scourge', type_line: 'Legendary Creature — Human Werewolf // Werewolf', card_faces: [{ name: 'Tovolar, Dire Overlord', type_line: 'Legendary Creature — Human Werewolf', oracle_text: 'Daybound. Whenever a Wolf or Werewolf deals damage, draw a card.' }, { name: 'Tovolar, the Midnight Scourge', type_line: 'Legendary Creature — Werewolf', oracle_text: 'Nightbound.' }], cmc: 3, power: '3', toughness: '3', colors: ['R', 'G'], color_identity: ['R', 'G'] },

    // === SIMIC LANDFALL RAMP ===
    { name: 'Llanowar Elves', type_line: 'Creature — Elf Druid', oracle_text: '{T}: Add {G}.', cmc: 1, power: '1', toughness: '1', colors: ['G'], color_identity: ['G'] },
    { name: 'Lotus Cobra', type_line: 'Creature — Snake', oracle_text: 'Landfall — Add one mana of any color.', cmc: 2, power: '2', toughness: '1', colors: ['G'], color_identity: ['G'] },
    { name: 'Growth Spiral', type_line: 'Instant', oracle_text: 'Draw a card. Put land from hand onto battlefield.', cmc: 2, colors: ['G', 'U'], color_identity: ['G', 'U'] },
    { name: 'Explore', type_line: 'Sorcery', oracle_text: 'Play additional land. Draw a card.', cmc: 2, colors: ['G'], color_identity: ['G'] },
    { name: 'Risen Reef', type_line: 'Creature — Elemental', oracle_text: 'Whenever an Elemental enters, look at top card. If land, put onto battlefield.', cmc: 3, power: '1', toughness: '1', colors: ['G', 'U'], color_identity: ['G', 'U'] },
    { name: 'Scute Swarm', type_line: 'Creature — Insect', oracle_text: 'Landfall — Create 1/1 Insect token.', cmc: 3, power: '1', toughness: '1', colors: ['G'], color_identity: ['G'] },
    { name: 'Beast Within', type_line: 'Instant', oracle_text: 'Destroy target permanent. Controller creates 3/3 Beast.', cmc: 3, colors: ['G'], color_identity: ['G'] },
    { name: 'Rapid Hybridization', type_line: 'Instant', oracle_text: 'Destroy target creature. Controller creates 3/3 Frog Lizard.', cmc: 1, colors: ['U'], color_identity: ['U'] },

    // === AZORIUS CONTROL ===
    { name: 'Consider', type_line: 'Instant', oracle_text: 'Look at top card. Graveyard or top. Draw card.', cmc: 1, colors: ['U'], color_identity: ['U'] },
    { name: 'Opt', type_line: 'Instant', oracle_text: 'Scry 1. Draw a card.', cmc: 1, colors: ['U'], color_identity: ['U'] },
    { name: 'Counterspell', type_line: 'Instant', oracle_text: 'Counter target spell.', cmc: 2, colors: ['U'], color_identity: ['U'] },
    { name: 'Dovin\'s Veto', type_line: 'Instant', oracle_text: 'Cannot be countered. Counter target noncreature spell.', cmc: 2, colors: ['W', 'U'], color_identity: ['W', 'U'] },
    { name: 'No More Lies', type_line: 'Instant', oracle_text: 'Counter target spell unless controller pays {3}.', cmc: 2, colors: ['W', 'U'], color_identity: ['W', 'U'] },
    { name: 'Supreme Verdict', type_line: 'Sorcery', oracle_text: 'Cannot be countered. Destroy all creatures.', cmc: 4, colors: ['W', 'U'], color_identity: ['W', 'U'] },
    { name: 'Memory Deluge', type_line: 'Instant', oracle_text: 'Look at top X cards, put two into hand. Flashback.', cmc: 4, colors: ['U'], color_identity: ['U'] },
    { name: 'The Wandering Emperor', type_line: 'Legendary Planeswalker — The Wandering Emperor', oracle_text: 'Flash. Activate abilities as instant.', cmc: 4, colors: ['W'], color_identity: ['W'] },
    { name: 'Teferi, Hero of Dominaria', type_line: 'Legendary Planeswalker — Teferi', oracle_text: '+1: Draw a card, untap two lands. -3: Tuck nonland.', cmc: 5, colors: ['W', 'U'], color_identity: ['W', 'U'] },

    // === LANDS ===
    { name: 'Mountain', type_line: 'Basic Land — Mountain', oracle_text: '{T}: Add {R}.', cmc: 0, colors: [], color_identity: ['R'] },
    { name: 'Swamp', type_line: 'Basic Land — Swamp', oracle_text: '{T}: Add {B}.', cmc: 0, colors: [], color_identity: ['B'] },
    { name: 'Forest', type_line: 'Basic Land — Forest', oracle_text: '{T}: Add {G}.', cmc: 0, colors: [], color_identity: ['G'] },
    { name: 'Island', type_line: 'Basic Land — Island', oracle_text: '{T}: Add {U}.', cmc: 0, colors: [], color_identity: ['U'] },
    { name: 'Plains', type_line: 'Basic Land — Plains', oracle_text: '{T}: Add {W}.', cmc: 0, colors: [], color_identity: ['W'] },
    { name: 'Blood Crypt', type_line: 'Land — Swamp Mountain', oracle_text: '{T}: Add {B} or {R}. Pay 2 life or enters tapped.', cmc: 0, colors: [], color_identity: ['B', 'R'] },
    { name: 'Stomping Ground', type_line: 'Land — Mountain Forest', oracle_text: '{T}: Add {R} or {G}. Pay 2 life or enters tapped.', cmc: 0, colors: [], color_identity: ['R', 'G'] },
    { name: 'Breeding Pool', type_line: 'Land — Forest Island', oracle_text: '{T}: Add {G} or {U}. Pay 2 life or enters tapped.', cmc: 0, colors: [], color_identity: ['G', 'U'] },
    { name: 'Hallowed Fountain', type_line: 'Land — Plains Island', oracle_text: '{T}: Add {W} or {U}. Pay 2 life or enters tapped.', cmc: 0, colors: [], color_identity: ['W', 'U'] }
  ];
}

const baselineArchetypes = [
  { id: '1', name: 'Goblin Aggro', format: 'Pioneer', colors: ['R', 'B'], tribe: 'Goblin', tempo: 'Aggro', strat: ['Goblin Aggro Velocity'], mechs: [] },
  { id: '2', name: 'Goblin Burn', format: 'Pioneer', colors: ['R', 'B'], tribe: 'Goblin', tempo: 'Aggro', strat: ['Goblin Direct Burn'], mechs: { required: ['PLAYER_REACH', 'CHEAP_REMOVAL'] } },
  { id: '3', name: 'Goblin Sacrifice', format: 'Pioneer', colors: ['R', 'B'], tribe: 'Goblin', tempo: 'Midrange', strat: ['Goblin Aristocrats Sacrifice'], mechs: { required: ['SACRIFICE', 'DEATH_PAYOFF'] } },
  { id: '4', name: 'Goblin Swarm', format: 'Pioneer', colors: ['R', 'B'], tribe: 'Goblin', tempo: 'Aggro', strat: ['Goblin Swarm Overrun'], mechs: { required: ['TOKEN_PRODUCTION', 'TRIBAL_LORD'] } },
  { id: '5', name: 'Werewolf Tempo', format: 'Pioneer', colors: ['R', 'G'], tribe: 'Werewolf', tempo: 'Tempo', strat: ['Werewolf Day/Night Tempo'], mechs: ['DAY_NIGHT', 'TRANSFORM'] },
  { id: '6', name: 'Simic Landfall', format: 'Standard', colors: ['G', 'U'], tribe: 'None', tempo: 'Ramp', strat: ['Simic Landfall Ramp'], mechs: ['LANDFALL'] },
  { id: '7', name: 'Azorius Control', format: 'Modern', colors: ['W', 'U'], tribe: 'None', tempo: 'Control', strat: ['Azorius Control'], mechs: [] },
  { id: '8', name: 'Rakdos Midrange', format: 'Pioneer', colors: ['R', 'B'], tribe: 'None', tempo: 'Midrange', strat: ['Rakdos Midrange Value'], mechs: [] }
];

console.log('══════════════════════════════════════════════════════════════════');
console.log('  🏛️ V29.5 BASELINE CAPTURE: 8 CORE ARCHETYPES SNAPSHOT');
console.log('══════════════════════════════════════════════════════════════════\n');

const pool = createUniversalPool();
const baselineRecords = [];

for (const arch of baselineArchetypes) {
  const uiFormState = {
    format: arch.format,
    colors: arch.colors,
    primaryTribe: arch.tribe,
    tempo: arch.tempo,
    strategy: arch.strat,
    mechanics: arch.mechs
  };

  const res = CompilerConvergencePipeline.compileDeckFromScratch({
    userPrompt: `Quiero un mazo de ${arch.name} competitivo en ${arch.format}.`,
    format: arch.format,
    archetype: arch.tempo,
    rawCardPool: pool,
    uiFormState
  });

  const cards = res.state.cards;
  const nonLands = cards.filter(c => !c.isLand);
  const lands = cards.filter(c => c.isLand);
  const spellCount = nonLands.reduce((s, c) => s + (c.quantity || 1), 0);
  const landCount = lands.reduce((s, c) => s + (c.quantity || 1), 0);
  const totalCmc = nonLands.reduce((s, c) => s + (Number(c.cmc || c.mana_value || 0) * (c.quantity || 1)), 0);
  const averageCMC = spellCount > 0 ? (totalCmc / spellCount).toFixed(2) : '0';

  const tribalCount = arch.tribe !== 'None'
    ? nonLands.filter(c => {
        const type = (c.type_line || c.typeLine || '').toLowerCase();
        return type.includes(arch.tribe.toLowerCase());
      }).reduce((s, c) => s + (c.quantity || 1), 0)
    : 0;

  const offTribeCount = (arch.tribe !== 'None')
    ? nonLands.filter(c => {
        const type = (c.type_line || c.typeLine || '').toLowerCase();
        return type.includes('creature') && !type.includes(arch.tribe.toLowerCase());
      }).reduce((s, c) => s + (c.quantity || 1), 0)
    : 0;

  const copyDistribution = {};
  for (const c of nonLands) {
    const qty = c.quantity || 1;
    copyDistribution[`${qty}x`] = (copyDistribution[`${qty}x`] || 0) + 1;
  }

  const record = {
    id: arch.id,
    name: arch.name,
    deckSnapshotHash: res.deckStateSnapshot?.deckHash || 'N/A',
    spellCount,
    landCount,
    averageCMC,
    tribalCount,
    offTribeCount,
    copyDistribution,
    judgeVerdict: res.supremeJudicialReview?.verdict || 'UNKNOWN',
    blockingDefectsCount: res.supremeJudicialReview?.blockingDefects?.length || 0,
    topCards: nonLands.slice(0, 5).map(c => `${c.quantity || 1}x ${c.name}`).join(', ')
  };

  baselineRecords.push(record);
  console.log(`[${arch.id}/8] ${arch.name.padEnd(20)} | Hash: ${record.deckSnapshotHash.padEnd(16)} | Cards: ${spellCount}S + ${landCount}L | Verdict: ${record.judgeVerdict}`);
}

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  BASELINE SUMMARY TABLE');
console.log('══════════════════════════════════════════════════════════════════');
console.table(baselineRecords.map(r => ({
  ID: r.id,
  Name: r.name,
  Hash: r.deckSnapshotHash,
  Spells: r.spellCount,
  Lands: r.landCount,
  AvgCMC: r.averageCMC,
  TribeCount: r.tribalCount,
  OffTribe: r.offTribeCount,
  Verdict: r.judgeVerdict
})));

console.log('\n✅ PHASE A: BASELINE SUCCESSFULLY CAPTURED (8/8 ARCHETYPES).');
