import { KnowledgeGraph } from '../../src/knowledge/graph/KnowledgeGraph.js';
import { KnowledgeDSL } from '../../src/knowledge/compiler/KnowledgeDSL.js';

console.log('=== TEST: Unified Multi-Typed KnowledgeGraph ===');

const graph = new KnowledgeGraph();

const elfNode = KnowledgeDSL.createCapabilityNode('card_llanowar_elves', 'Llanowar Elves');
const capNode = KnowledgeDSL.createCapabilityNode('cap.mana.acceleration', 'Mana Acceleration');
const titanNode = KnowledgeDSL.createCapabilityNode('card_primeval_titan', 'Primeval Titan');

graph.addNode(elfNode);
graph.addNode(capNode);
graph.addNode(titanNode);

graph.addRelationship(KnowledgeDSL.createRelationship('card_llanowar_elves', 'cap.mana.acceleration', 'PROVIDES'));
graph.addRelationship(KnowledgeDSL.createRelationship('cap.mana.acceleration', 'card_primeval_titan', 'ENABLES'));

const engineView = graph.getEngineGraphView();
console.log(`[PASS] Engine View Relationships Count: ${engineView.length}`);

if (engineView.length !== 2) {
  console.error('FAILED: Engine View did not return 2 relationships');
  process.exit(1);
}

const targets = graph.queryTargetNodes('card_llanowar_elves', 'PROVIDES');
console.log(`[PASS] Targets from Llanowar Elves: ${targets.map(n => n.name).join(', ')}`);

console.log('=== TEST SUCCESSFUL ===');
