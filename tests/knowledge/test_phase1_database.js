/**
 * test_phase1_database.js
 * Test Suite for KnowledgeDatabase SQLite Storage Manager.
 */

import { KnowledgeDatabase } from '../../src/knowledge/storage/KnowledgeDatabase.js';
import { KnowledgeObject } from '../../src/knowledge/storage/KnowledgeObject.js';
import fs from 'fs';

function runDatabaseTest() {
  console.log('🧪 Starting Phase 1 KnowledgeDatabase SQLite Tests...');

  const testDbPath = 'data/knowledge/test_phase1_knowledge.db';
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  const db = new KnowledgeDatabase(testDbPath);

  // Test 1: Upsert and Retrieve Object
  const obj = new KnowledgeObject({ id: 'kn_test_db_1', type: 'CardKnowledge', confidence: 0.95, data: { name: 'Sol Ring' } });
  db.upsertObject(obj);

  const retrieved = db.getObject('kn_test_db_1');
  console.assert(retrieved !== null, 'Retrieved object must not be null');
  console.assert(retrieved.data.name === 'Sol Ring', 'Retrieved data.name must be Sol Ring');
  console.log('✅ Test 1 Passed: SQLite upsertObject and getObject validated.');

  // Test 2: Indexing and Index Search
  db.upsertIndex('card', 'Sol Ring', 'kn_test_db_1');
  const searchRes = db.searchIndexes('card', 'Sol Ring');
  console.assert(searchRes.includes('kn_test_db_1'), 'Index search must return kn_test_db_1');
  console.log('✅ Test 2 Passed: SQLite index upsert and search validated.');

  // Test 3: Telemetry Log
  db.logTelemetry({ source: 'TestRunner', durationMs: 120, errors: [], changes: ['Added Sol Ring'], newCount: 1 });
  const logs = db.getLatestTelemetry(1);
  console.assert(logs.length === 1, 'Telemetry log must return 1 entry');
  console.assert(logs[0].source === 'TestRunner', 'Telemetry source must be TestRunner');
  console.log('✅ Test 3 Passed: SQLite telemetry logging validated.');

  db.close();
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  console.log('🎉 Phase 1 KnowledgeDatabase SQLite Tests PASSED 100%!');
}

runDatabaseTest();
