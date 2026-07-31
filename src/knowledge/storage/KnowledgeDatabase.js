/**
 * KnowledgeDatabase.js
 * SQLite Storage Manager utilizing Node.js native node:sqlite.
 * Centralized knowledge storage in data/knowledge/knowledge.db.
 */

import fs from 'fs';
import path from 'path';
import { ConfigManager } from '../../../config/ConfigManager.js';

let DatabaseSyncClass = null;

export class KnowledgeDatabase {
  constructor(dbPath = null) {
    const config = ConfigManager.getInstance();
    this.dbPath = dbPath || config.databasePath;
    this.memoryObjects = new Map();
    this.memoryIndexes = new Map();
    this.telemetryLogs = [];

    // Node.js environment check
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const cwd = typeof process.cwd === 'function' ? process.cwd() : '.';
        // Ensure directory exists
        const dir = path.dirname(path.resolve(cwd, this.dbPath));
        if (fs.existsSync && !fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Dynamically require node:sqlite
        const { createRequire } = require('module');
        const req = createRequire(import.meta.url);
        const sqlite = req('node:sqlite');
        DatabaseSyncClass = sqlite.DatabaseSync;
      } catch (e) {
        // Fallback to memory storage in browser or when node:sqlite is not loaded
      }
    }

    if (DatabaseSyncClass) {
      const cwd = (typeof process !== 'undefined' && typeof process.cwd === 'function') ? process.cwd() : '.';
      this.db = new DatabaseSyncClass(path.resolve(cwd, this.dbPath));
      this.initTables();
    }
  }

  initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_objects (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        version INTEGER NOT NULL,
        revision INTEGER NOT NULL,
        confidence REAL NOT NULL,
        evidence TEXT,
        sources TEXT,
        relationships TEXT,
        data TEXT,
        created INTEGER,
        last_validated INTEGER,
        deprecated INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS knowledge_indexes (
        key_type TEXT NOT NULL,
        key_value TEXT NOT NULL,
        object_id TEXT NOT NULL,
        PRIMARY KEY (key_type, key_value, object_id)
      );

      CREATE TABLE IF NOT EXISTS telemetry_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        source TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        errors TEXT,
        changes TEXT,
        new_count INTEGER DEFAULT 0,
        modified_count INTEGER DEFAULT 0
      );
    `);
  }

  upsertObject(obj) {
    this.memoryObjects.set(obj.id, obj);
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO knowledge_objects (
        id, type, version, revision, confidence, evidence, sources, relationships, data, created, last_validated, deprecated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        revision = excluded.revision,
        confidence = excluded.confidence,
        evidence = excluded.evidence,
        sources = excluded.sources,
        relationships = excluded.relationships,
        data = excluded.data,
        last_validated = excluded.last_validated,
        deprecated = excluded.deprecated
    `);

    stmt.run(
      obj.id,
      obj.type || 'GenericKnowledge',
      obj.version || 1,
      obj.revision || 1,
      obj.confidence !== undefined ? obj.confidence : 0.85,
      JSON.stringify(obj.evidence || []),
      JSON.stringify(obj.sources || []),
      JSON.stringify(obj.relationships || []),
      JSON.stringify(obj.data || {}),
      obj.created || Date.now(),
      obj.lastValidated || Date.now(),
      obj.deprecated ? 1 : 0
    );
  }

  getObject(id) {
    if (!this.db) return this.memoryObjects.get(id) || null;

    const stmt = this.db.prepare('SELECT * FROM knowledge_objects WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return null;

    return {
      id: row.id,
      type: row.type,
      version: row.version,
      revision: row.revision,
      confidence: row.confidence,
      evidence: JSON.parse(row.evidence || '[]'),
      sources: JSON.parse(row.sources || '[]'),
      relationships: JSON.parse(row.relationships || '[]'),
      data: JSON.parse(row.data || '{}'),
      created: row.created,
      lastValidated: row.last_validated,
      deprecated: Boolean(row.deprecated)
    };
  }

  queryObjectsByType(type) {
    if (!this.db) {
      return Array.from(this.memoryObjects.values()).filter(o => o.type === type && !o.deprecated);
    }
    const stmt = this.db.prepare('SELECT * FROM knowledge_objects WHERE type = ? AND deprecated = 0');
    const rows = stmt.all(type);
    return rows.map(row => ({
      id: row.id,
      type: row.type,
      version: row.version,
      revision: row.revision,
      confidence: row.confidence,
      evidence: JSON.parse(row.evidence || '[]'),
      sources: JSON.parse(row.sources || '[]'),
      relationships: JSON.parse(row.relationships || '[]'),
      data: JSON.parse(row.data || '{}'),
      created: row.created,
      lastValidated: row.last_validated,
      deprecated: Boolean(row.deprecated)
    }));
  }

  upsertIndex(keyType, keyValue, objectId) {
    const k = `${keyType}:${keyValue}`.toLowerCase();
    if (!this.memoryIndexes.has(k)) this.memoryIndexes.set(k, new Set());
    this.memoryIndexes.get(k).add(objectId);

    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO knowledge_indexes (key_type, key_value, object_id)
      VALUES (?, ?, ?)
    `);
    stmt.run(keyType.toLowerCase(), keyValue.toLowerCase(), objectId);
  }

  searchIndexes(keyType, keyValue) {
    const k = `${keyType}:${keyValue}`.toLowerCase();
    if (!this.db) {
      return Array.from(this.memoryIndexes.get(k) || []);
    }

    const stmt = this.db.prepare(`
      SELECT object_id FROM knowledge_indexes 
      WHERE key_type = ? AND key_value = ?
    `);
    const rows = stmt.all(keyType.toLowerCase(), keyValue.toLowerCase());
    return rows.map(r => r.object_id);
  }

  logTelemetry(entry) {
    this.telemetryLogs.unshift(entry);
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO telemetry_logs (
        id, timestamp, source, duration_ms, errors, changes, new_count, modified_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      entry.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      entry.timestamp || new Date().toISOString(),
      entry.source || 'UnknownProvider',
      entry.durationMs || 0,
      JSON.stringify(entry.errors || []),
      JSON.stringify(entry.changes || []),
      entry.newCount || 0,
      entry.modifiedCount || 0
    );
  }

  getLatestTelemetry(limit = 10) {
    if (!this.db) return this.telemetryLogs.slice(0, limit);

    const stmt = this.db.prepare('SELECT * FROM telemetry_logs ORDER BY timestamp DESC LIMIT ?');
    const rows = stmt.all(limit);
    return rows.map(r => ({
      ...r,
      errors: JSON.parse(r.errors || '[]'),
      changes: JSON.parse(r.changes || '[]')
    }));
  }

  close() {
    if (!this.db) return;
    try {
      this.db.close();
    } catch (e) {
      // Ignored if already closed
    }
  }
}
