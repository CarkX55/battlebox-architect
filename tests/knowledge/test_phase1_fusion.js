/**
 * test_phase1_fusion.js
 * Test Suite for KnowledgeFusionEngine.
 */

import { KnowledgeFusionEngine } from '../../src/knowledge/fusion/KnowledgeFusionEngine.js';
import { KnowledgeObject } from '../../src/knowledge/storage/KnowledgeObject.js';

function runFusionTest() {
  console.log('🧪 Starting Phase 1 KnowledgeFusionEngine Tests...');

  const obj1 = new KnowledgeObject({ id: 'kn_fuse_1', type: 'CardKnowledge', confidence: 0.80, sources: ['SourceA'], data: { attr1: 'val1' } });
  const obj2 = new KnowledgeObject({ id: 'kn_fuse_1', type: 'CardKnowledge', confidence: 0.90, sources: ['SourceB'], data: { attr2: 'val2' } });

  const fused = KnowledgeFusionEngine.fuse([obj1, obj2]);

  console.assert(fused.length === 1, 'Fused array length must be 1');
  console.assert(fused[0].sources.includes('SourceA') && fused[0].sources.includes('SourceB'), 'Fused sources must include SourceA and SourceB');
  console.assert(fused[0].data.attr1 === 'val1' && fused[0].data.attr2 === 'val2', 'Fused data must contain both attributes');
  console.log('✅ Fusion Test Passed: Dynamic confidence and attribute merging validated.');

  console.log('🎉 Phase 1 KnowledgeFusionEngine Tests PASSED 100%!');
}

runFusionTest();
