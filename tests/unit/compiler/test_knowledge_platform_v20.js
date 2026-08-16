/**
 * KNOWLEDGE PLATFORM v20.0 INTEGRATION TEST SUITE
 * 
 * Verifies Semantic Capability Extraction (Layer 2), Offline Expert Analysis (Layer 3),
 * Living Meta Co-occurrence (Layer 4), Strategic Knowledge Graph Edges, Expert Deck Corpus,
 * and KnowledgeRetrievalEngine ("Search Knowledge, Not Cards").
 */

import assert from 'node:assert';
import { SemanticCapabilityExtractor } from '../../../src/services/knowledge/semanticCapabilityExtractor.js';
import { offlineKnowledgeDatabase } from '../../../src/services/knowledge/offlineKnowledgeGenerator.js';
import { metaIngestionPipeline } from '../../../src/services/knowledge/metaIngestionPipeline.js';
import { strategicKnowledgeGraph, GRAPH_EDGE_TYPES } from '../../../src/services/knowledge/strategicKnowledgeGraph.js';
import { expertDeckCorpus } from '../../../src/services/knowledge/expertDeckCorpus.js';
import { KnowledgeRetrievalEngine } from '../../../src/services/agent/tools/knowledgeRetrievalEngine.js';
import { IntentLock } from '../../../src/services/agent/intentLock.js';
import { BattleBoxAgent } from '../../../src/services/agent/battleBoxAgent.js';

console.log('🧪 Running BattleBox v20.0 Knowledge-Driven Expert Platform Test Suite...\n');

// ==========================================
// TEST 1: Layer 2 — Semantic Capability Extraction
// ==========================================
console.log('--- TEST 1: Layer 2 — Semantic Capability Extraction ---');
const dummyLlanowar = {
  name: 'Llanowar Elves',
  type_line: 'Creature — Elf Druid',
  oracle_text: '{T}: Add {G}.',
  cmc: 1
};
const caps = SemanticCapabilityExtractor.extractCapabilities(dummyLlanowar);
assert.ok(caps.includes('Creature'));
assert.ok(caps.includes('OneDrop'));
assert.ok(caps.includes('EarlyRamp'));
assert.ok(caps.includes('ManaProducer'));
console.log('✅ TEST 1 PASSED: Layer 2 Semantic Capabilities extracted via code parser.\n');

// ==========================================
// TEST 2: Layer 3 — Offline Expert Analysis
// ==========================================
console.log('--- TEST 2: Layer 3 — Offline Expert Analysis ---');
const expertInfo = offlineKnowledgeDatabase.generateExpertKnowledge(dummyLlanowar);
assert.strictEqual(expertInfo.cardName, 'Llanowar Elves');
assert.ok(expertInfo.optimalCopyCount === 4);
assert.ok(expertInfo.matchupPros.length > 0);
console.log('✅ TEST 2 PASSED: Layer 3 Offline Expert Strategic Knowledge stored in database.\n');

// ==========================================
// TEST 3: Layer 4 — Living Meta Ingestion & Co-occurrence Matrix
// ==========================================
console.log('--- TEST 3: Layer 4 — Living Meta Ingestion & Co-occurrence Matrix ---');
metaIngestionPipeline.ingestDecklist(['Llanowar Elves', 'Bonecrusher Giant', 'Calamity Bearer']);
const coOccurrences = metaIngestionPipeline.getCoOccurrenceStats('Llanowar Elves');
assert.ok(coOccurrences.length > 0);
assert.strictEqual(coOccurrences[0].cardB, 'Bonecrusher Giant');
console.log('✅ TEST 3 PASSED: Layer 4 Living Meta tournament co-occurrence statistics verified.\n');

// ==========================================
// TEST 4: Strategic Knowledge Graph Edges & Synergies
// ==========================================
console.log('--- TEST 4: Strategic Knowledge Graph Edges & Synergies ---');
const graphSynergies = strategicKnowledgeGraph.getSynergiesForCard('Llanowar Elves');
assert.ok(graphSynergies.length > 0);
assert.strictEqual(graphSynergies[0].relation, GRAPH_EDGE_TYPES.ACCELERATES);
console.log('✅ TEST 4 PASSED: Strategic Knowledge Graph relational pathways verified.\n');

// ==========================================
// TEST 5: Expert Deck Corpus Blueprint Matching
// ==========================================
console.log('--- TEST 5: Expert Deck Corpus Blueprint Matching ---');
const corpusBlueprint = expertDeckCorpus.findMatchingCorpus({ format: 'STANDARD', archetype: 'Midrange' });
assert.strictEqual(corpusBlueprint.deckIdentity, 'Naya Giants Midrange');
assert.ok(corpusBlueprint.corePackage.includes('Bonecrusher Giant'));
console.log('✅ TEST 5 PASSED: Expert Deck Corpus blueprint matching verified.\n');

// ==========================================
// TEST 6: KnowledgeRetrievalEngine ("Search Knowledge, Not Cards")
// ==========================================
console.log('--- TEST 6: KnowledgeRetrievalEngine ("Search Knowledge, Not Cards") ---');
const intentLock = new IntentLock({ format: 'STANDARD', colors: ['R', 'W', 'G'] });
const pkg = KnowledgeRetrievalEngine.searchKnowledge({ minCmc: 1, maxCmc: 2, requiredType: 'Creature' }, intentLock);

assert.ok(pkg.candidates.length > 0);
const firstCand = pkg.candidates[0];
assert.ok(firstCand.capabilities.length > 0);
assert.ok(firstCand.expertAnalysis !== null);
assert.ok(pkg.corpusBlueprint !== null);
console.log('✅ TEST 6 PASSED: KnowledgeRetrievalEngine retrieved full structured Knowledge Package.\n');

// ==========================================
// TEST 7: End-to-End Knowledge-Driven BattleBoxAgent Execution
// ==========================================
console.log('--- TEST 7: End-to-End Knowledge-Driven BattleBoxAgent Execution ---');
const mockIntentPackage = {
  format: 'STANDARD',
  colors: ['R', 'W', 'G'],
  tribe: 'Giant',
  archetype: 'Aggro',
  budget: 'UNLIMITED',
  powerLevel: 'COMPETITIVE',
  constraints: { excludedCards: [] }
};

const agent = new BattleBoxAgent(mockIntentPackage);

(async () => {
  const result = await agent.runReActLoop();

  assert.strictEqual(result.metrics.totalCards, 60);
  assert.ok(result.reasoningTrace.length > 0);
  assert.ok(result.cognitiveLogs.length >= 6);

  console.log('✅ TEST 7 PASSED: Knowledge-Driven BattleBoxAgent executed 60/60 deck using Knowledge Packages.\n');
  console.log('🎉 ALL KNOWLEDGE PLATFORM v20.0 TESTS PASSED WITH 100% SUCCESS!');
})();
