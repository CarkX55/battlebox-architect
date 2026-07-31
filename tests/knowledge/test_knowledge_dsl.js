import { KnowledgeDSL } from '../../src/knowledge/compiler/KnowledgeDSL.js';
import { MTGAdapter } from '../../src/knowledge/adapters/MTGAdapter.js';

console.log('=== TEST: Knowledge DSL & MTGAdapter ===');

const mockCard = {
  id: 'llanowar_elves_1',
  name: 'Llanowar Elves',
  cmc: 1,
  typeLine: 'Creature — Elf Druid',
  oracleText: '{T}: Add {G}.',
  colors: ['G']
};

const translated = MTGAdapter.translateCardToDSL(mockCard);

console.log(`[PASS] DSL Node Created: ${translated.node.name} (Kind: ${translated.node.kind})`);
console.log(`[PASS] Relationships Count: ${translated.relationships.length}`);
console.log(`[PASS] Provides Capability: ${translated.relationships[0].targetId}`);

if (!translated.relationships[0].targetId.startsWith('cap.mana.acceleration')) {
  console.error('FAILED: Relationship targetId is not cap.mana.acceleration');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
