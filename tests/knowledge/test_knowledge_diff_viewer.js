import { KnowledgeGraph } from '../../src/knowledge/graph/KnowledgeGraph.js';
import { KnowledgeDSL } from '../../src/knowledge/compiler/KnowledgeDSL.js';
import { KnowledgeDiffViewer } from '../../src/knowledge/compiler/KnowledgeDiffViewer.js';

console.log('=== TEST: KnowledgeDiffViewer Bundle Diff Engine ===');

const graphOld = new KnowledgeGraph();
graphOld.addNode(KnowledgeDSL.createCapabilityNode('card_llanowar_elves', 'Llanowar Elves'));

const graphNew = new KnowledgeGraph();
graphNew.addNode(KnowledgeDSL.createCapabilityNode('card_llanowar_elves', 'Llanowar Elves'));
graphNew.addNode(KnowledgeDSL.createCapabilityNode('card_elvish_mystic', 'Elvish Mystic'));

const bundleOld = { bundleId: 'bundle_v1', graph: graphOld };
const bundleNew = { bundleId: 'bundle_v2', graph: graphNew };

const diff = KnowledgeDiffViewer.computeBundleDiff(bundleOld, bundleNew);

console.log(`[PASS] Added Nodes Count: ${diff.addedCount}`);
console.log(`[PASS] Deprecated Nodes Count: ${diff.deprecatedCount}`);
console.log(`[PASS] Added Node Name: ${diff.addedNodes[0].name}`);

if (diff.addedCount !== 1) {
  console.error('FAILED: Added nodes count expected 1');
  process.exit(1);
}

if (diff.addedNodes[0].name !== 'Elvish Mystic') {
  console.error('FAILED: Expected Elvish Mystic added');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
