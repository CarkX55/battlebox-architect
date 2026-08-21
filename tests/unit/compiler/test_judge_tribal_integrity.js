import test from 'node:test';
import assert from 'node:assert/strict';
import { getPillarCandidatesFromDB } from '../../../src/services/auditService.js';

test('Judge Audit: getPillarCandidatesFromDB respects tribal constraints', () => {
  const mockCards = [
    { name: 'Hired Claw', type_line: 'Creature — Lizard Mercenary', cmc: 1, rarity: 'rare', color_identity: ['R'], legalities: { standard: 'legal' } },
    { name: 'Forsaken Miner', type_line: 'Creature — Skeleton Warlock', cmc: 1, rarity: 'uncommon', color_identity: ['B'], legalities: { standard: 'legal' } },
    { name: 'Fanatical Firebrand', type_line: 'Creature — Goblin Pirate', cmc: 1, rarity: 'uncommon', color_identity: ['R'], legalities: { standard: 'legal' } },
    { name: 'Goblin Tomb Raider', type_line: 'Creature — Goblin Pirate', cmc: 1, rarity: 'common', color_identity: ['R'], legalities: { standard: 'legal' } },
    { name: 'Krenko, Baron of Tin Street', type_line: 'Legendary Creature — Goblin', cmc: 3, rarity: 'rare', color_identity: ['R'], legalities: { standard: 'legal' } }
  ];

  // When primaryTribe is 'Goblin'
  const goblinCandidates = getPillarCandidatesFromDB(
    'threats',
    mockCards,
    ['B', 'R'],
    'standard',
    'high-power',
    [],
    [],
    'Aggro',
    'Goblin'
  );

  assert.ok(goblinCandidates.length > 0, 'Should find Goblin candidates');
  assert.ok(goblinCandidates.includes('Fanatical Firebrand'), 'Should include Fanatical Firebrand');
  assert.ok(goblinCandidates.includes('Goblin Tomb Raider'), 'Should include Goblin Tomb Raider');
  assert.ok(!goblinCandidates.includes('Hired Claw'), 'Must NOT include Hired Claw (Lizard) in Goblin deck');
  assert.ok(!goblinCandidates.includes('Forsaken Miner'), 'Must NOT include Forsaken Miner (Skeleton) in Goblin deck');
});
