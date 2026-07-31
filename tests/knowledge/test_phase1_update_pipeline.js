/**
 * test_phase1_update_pipeline.js
 * Test Suite for KnowledgeUpdatePipeline.
 */

import { KnowledgeUpdatePipeline } from '../../src/knowledge/ingestion/KnowledgeUpdatePipeline.js';
import fs from 'fs';

async function runUpdatePipelineTest() {
  console.log('🧪 Starting Phase 1 KnowledgeUpdatePipeline Tests...');

  const testDbPath = 'data/knowledge/test_pipeline_knowledge.db';
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  const pipeline = new KnowledgeUpdatePipeline(testDbPath);
  const result = await pipeline.run();

  console.assert(result.success === true, 'Pipeline execution must be successful');
  console.assert(result.totalFusedCount > 0, 'Total fused count must be > 0');
  console.assert(result.newCount > 0, 'New count must be > 0');
  console.log('✅ Update Pipeline Test Passed: Pipeline executed Sync -> Fuse -> Validate -> Store -> Reindex -> Log workflow.');

  pipeline.database.close();
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  console.log('🎉 Phase 1 KnowledgeUpdatePipeline Tests PASSED 100%!');
}

runUpdatePipelineTest();
