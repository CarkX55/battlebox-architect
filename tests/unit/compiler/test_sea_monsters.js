import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';

const sampleCards = [
  { name: 'Botanical Sanctum', type_line: 'Land', colors: ['G', 'U'], cmc: 0 },
  { name: 'Yavimaya Coast', type_line: 'Land', colors: ['G', 'U'], cmc: 0 },
  { name: 'Hedge Maze', type_line: 'Land — Island Forest', colors: ['G', 'U'], cmc: 0 },
  { name: 'Forest', type_line: 'Basic Land — Forest', colors: ['G'], cmc: 0 },
  { name: 'Island', type_line: 'Basic Land — Island', colors: ['U'], cmc: 0 },
  
  // Sea Monsters / Krakens / Serpents / Leviathans / Merfolk Dorks
  { name: 'Glacier Godmaw', type_line: 'Creature — Leviathan', oracle_text: 'Trample\nWhen this creature enters, create a Lander token.', colors: ['G'], cmc: 7, power: '6', toughness: '6' },
  { name: 'Summon: Leviathan', type_line: 'Enchantment Creature — Saga Leviathan', oracle_text: 'Return each creature that isn\'t a Kraken, Leviathan, Merfolk, Octopus, or Serpent to its owner\'s hand.', colors: ['U'], cmc: 6, power: '6', toughness: '6' },
  { name: 'Koma, Cosmos Serpent', type_line: 'Legendary Creature — Serpent', oracle_text: 'At the beginning of each upkeep, create a 3/3 blue Serpent creature token named Koma\'s Coil.\nSacrifice a Serpent: Tap target permanent or Koma gains indestructible.', colors: ['G', 'U'], cmc: 7, power: '6', toughness: '6' },
  { name: 'Hullbreaker Horror', type_line: 'Creature — Kraken Horror', oracle_text: 'Flash\nThis spell can\'t be countered.\nWhenever you cast a spell, return target spell you don\'t control to its owner\'s hand, or return target nonland permanent to its owner\'s hand.', colors: ['U'], cmc: 7, power: '7', toughness: '8' },
  { name: 'Arixmethes, Slumbering Isle', type_line: 'Legendary Creature — Kraken', oracle_text: 'Arixmethes enters the battlefield tapped with five slumber counters on it. As long as it has a slumber counter, it\'s a land. {T}: Add {G}{U}. Whenever you cast a spell, you may remove a slumber counter from Arixmethes.', colors: ['G', 'U'], cmc: 4, power: '12', toughness: '12' },
  { name: 'Spawning Kraken', type_line: 'Creature — Kraken', oracle_text: 'Whenever a Kraken, Leviathan, Octopus, or Serpent you control deals combat damage to a player, create a 9/9 blue Kraken creature token.', colors: ['U'], cmc: 6, power: '6', toughness: '6' },
  { name: 'Serpent of Yawning Depths', type_line: 'Enchantment Creature — Serpent', oracle_text: 'Krakens, Leviathans, Octopuses, and Serpents you control can\'t be blocked except by Krakens, Leviathans, Octopuses, and Serpents.', colors: ['U'], cmc: 6, power: '6', toughness: '6' },
  { name: 'Kiora\'s Follower', type_line: 'Creature — Merfolk', oracle_text: '{T}: Untap another target permanent.', colors: ['G', 'U'], cmc: 2, power: '2', toughness: '2' },
  { name: 'Maraleaf Pixie', type_line: 'Creature — Faerie Druid', oracle_text: 'Flying\n{T}: Add {G} or {U}.', colors: ['G', 'U'], cmc: 2, power: '2', toughness: '2' },
  
  // Non-creatures
  { name: 'Bushwhack', type_line: 'Sorcery', oracle_text: 'Search your library for a basic land card / fight target creature', colors: ['G'], cmc: 1 },
  { name: 'Growth Spiral', type_line: 'Instant', oracle_text: 'Draw a card. You may put a land card from your hand onto the battlefield.', colors: ['G', 'U'], cmc: 2 },
  { name: 'Prizefight', type_line: 'Instant', oracle_text: 'Target creature you control fights target creature you don\'t control. Create a Treasure token.', colors: ['G'], cmc: 2 },
  { name: 'Hunter\'s Talent', type_line: 'Enchantment — Class', oracle_text: 'When this Class enters, target creature you control deals damage equal to its power to target creature you don\'t control.', colors: ['G'], cmc: 2 },
  { name: 'Whelming Wave', type_line: 'Sorcery', oracle_text: 'Return all creatures to their owners\' hands except for Krakens, Leviathans, Octopuses, and Serpents.', colors: ['U'], cmc: 4 }
];

const uiFormState = {
  formato: 'PIONEER',
  format: 'PIONEER',
  archetype: 'ramp',
  arquetipo: 'ramp',
  colores: ['G', 'U'],
  colors: ['G', 'U'],
  tribe: '🌊 terrores marinos (tritones, krakens, leviatanes)',
  tribu: '🌊 terrores marinos (tritones, krakens, leviatanes)',
  strategy: 'big sea ramp (krakens & leviatanes)',
  estrategia: 'big sea ramp (krakens & leviatanes)',
  selectedEngineId: 'sea_monsters_ramp',
  engineFlavor: 'Big Sea Ramp (Krakens & Leviatanes)',
  customPrompt: 'Mazo competitivo ramp G/U',
  userConstraints: {
    selectedEngineId: 'sea_monsters_ramp',
    boostKeywords: ['kraken', 'leviathan', 'octopus', 'serpent', 'ramp', 'search for a land', 'kiora']
  }
};

const res = CompilerConvergencePipeline.compileDeckFromScratch({
  userPrompt: 'Mazo competitivo ramp G/U',
  archetype: 'ramp',
  format: 'PIONEER',
  rawCardPool: sampleCards,
  uiFormState
});

console.log('Build status:', res.buildStatus);
console.log('Supreme verdict:', res.supremeJudicialReview?.verdict, 'Score:', res.supremeJudicialReview?.score);
console.log('Defects:', res.supremeJudicialReview?.defects);
console.log('Thesis audit:', res.supremeJudicialReview?.diagnosticVectors?.ThesisAudit);
console.log('Selected Cards:');
if (res.state?.cards) {
  for (const c of res.state.cards) {
    console.log(`- ${c.count || c.quantity || 4}x ${c.name} (${c.role}) [${c.type_line || c.typeLine}]`);
  }
}
