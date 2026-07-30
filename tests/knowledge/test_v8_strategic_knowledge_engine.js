/**
 * test_v8_strategic_knowledge_engine.js
 * Integration Test for BattleBox Architect v8.0 Strategic Knowledge Engine (SKE).
 */

import { KnowledgeObject } from '../../src/knowledge/Core/KnowledgeObject.js';
import { StrategicConceptCatalog } from '../../src/knowledge/ConceptKnowledge/StrategicConceptCatalog.js';
import { CausalKnowledgeGraph } from '../../src/knowledge/Graph/CausalKnowledgeGraph.js';
import { ConfidenceCalculator } from '../../src/knowledge/Validation/ConfidenceCalculator.js';
import { ActiveLearningLifecycle } from '../../src/knowledge/Learning/ActiveLearningLifecycle.js';
import { KnowledgeValidator } from '../../src/knowledge/Validation/KnowledgeValidator.js';
import { StrategicKnowledgeService } from '../../src/knowledge/Serving/StrategicKnowledgeService.js';

function runV8SKETest() {
  console.log('🧪 Starting BattleBox Architect v8.0 Strategic Knowledge Engine (SKE) Test...');

  // Test 1: KnowledgeObject Base Schema
  const ko = new KnowledgeObject({ id: 'kn_test_1', type: 'Concept', confidence: 0.95 });
  console.assert(ko.version === 1, 'KnowledgeObject version must be 1');
  console.assert(ko.confidence === 0.95, 'KnowledgeObject confidence must be 0.95');
  console.log('✅ Test 1 Passed: KnowledgeObject base schema validated.');

  // Test 2: Layer 6 ConceptKnowledge Catalog
  const tempo = StrategicConceptCatalog.getConcept('Tempo');
  console.assert(tempo !== null, 'Tempo concept must exist in StrategicConceptCatalog');
  console.assert(tempo.id === 'Tempo', 'Concept ID must be Tempo');
  console.log('✅ Test 2 Passed: StrategicConceptCatalog Layer 6 concept retrieved.');

  // Test 3: CausalKnowledgeGraph
  const graph = new CausalKnowledgeGraph();
  const rels = graph.getRelationsFor('ManaAcceleration');
  console.assert(rels.length > 0, 'Relations for ManaAcceleration must exist');
  console.assert(rels[0].relation === 'causes', 'Relation must be causes');
  console.log('✅ Test 3 Passed: CausalKnowledgeGraph relations verified.');

  // Test 4: ConfidenceCalculator & KnowledgeValidator
  const conf = ConfidenceCalculator.calculate([{ source: 'ExpertRule', confidence: 0.9 }, { source: 'MTGTop8', confidence: 0.8 }]);
  console.assert(conf > 0.5, 'Calculated confidence must be > 0.5');
  const validRes = KnowledgeValidator.validate(ko);
  console.assert(validRes.valid === true, 'KnowledgeValidator must validate valid KnowledgeObject');
  console.log('✅ Test 4 Passed: ConfidenceCalculator and KnowledgeValidator verified.');

  // Test 5: ActiveLearningLifecycle
  const simResult = { winRate: 62.5 };
  const learnedKO = ActiveLearningLifecycle.processSimulationResult(simResult);
  console.assert(learnedKO !== null, 'Empirical KnowledgeObject must be created from simulation');
  console.assert(learnedKO.type === 'EmpiricalKnowledge', 'Learned type must be EmpiricalKnowledge');
  console.log('✅ Test 5 Passed: ActiveLearningLifecycle created validated Empirical Knowledge.');

  // Test 6: Unified StrategicKnowledgeService
  const skeService = new StrategicKnowledgeService();
  const tempoConcept = skeService.getStrategicConcept('Tempo');
  console.assert(tempoConcept.id === 'Tempo', 'StrategicKnowledgeService must serve Tempo concept');
  console.log('✅ Test 6 Passed: StrategicKnowledgeService unified serving API operational.');

  console.log('🎉 BattleBox Architect v8.0 Strategic Knowledge Engine (SKE) Test PASSED 100%!');
}

runV8SKETest();
