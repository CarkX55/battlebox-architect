import { KnowledgeGraph } from '../../src/knowledge/graph/KnowledgeGraph.js';
import { KnowledgeDSL } from '../../src/knowledge/compiler/KnowledgeDSL.js';
import { StrategicQueryLanguage } from '../../src/knowledge/serving/StrategicQueryLanguage.js';

console.log('=== TEST: StrategicQueryLanguage Query Engine ===');

const graph = new KnowledgeGraph();
graph.addNode(KnowledgeDSL.createCapabilityNode('card_llanowar_elves', 'Llanowar Elves', { tempo: 0.85 }));
graph.addNode(KnowledgeDSL.createCapabilityNode('card_colossal_dreadmaw', 'Colossal Dreadmaw', { tempo: 0.35 }));

const result = StrategicQueryLanguage.executeQuery('FIND Capability WHERE TempoScore > 0.50', graph);

console.log(`[PASS] Query Executed: ${result.query}`);
console.log(`[PASS] Results Count: ${result.resultsCount}`);
console.log(`[PASS] Matched Node: ${result.results[0].name}`);

if (result.resultsCount !== 1) {
  console.error('FAILED: Results count expected 1');
  process.exit(1);
}

if (result.results[0].name !== 'Llanowar Elves') {
  console.error('FAILED: Expected Llanowar Elves matched');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
