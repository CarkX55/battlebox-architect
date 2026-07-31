/**
 * KnowledgeUpdatePipeline.js
 * Master Knowledge Update Pipeline executing: Sync -> Fuse -> Validate -> Store -> Reindex -> Log.
 */

import { KnowledgeDatabase } from '../storage/KnowledgeDatabase.js';
import { FastIndexManager } from '../storage/FastIndexManager.js';
import { KnowledgeFusionEngine } from '../fusion/KnowledgeFusionEngine.js';
import { KnowledgeValidator } from '../validation/KnowledgeValidator.js';
import { TelemetryLogger } from '../scheduler/TelemetryLogger.js';

import { MTGJSONProvider } from '../providers/MTGJSONProvider.js';
import { ScryfallProvider } from '../providers/ScryfallProvider.js';
import { EDHRECProvider } from '../providers/EDHRECProvider.js';
import { MTGTop8Provider } from '../providers/MTGTop8Provider.js';
import { SpiceRackProvider } from '../providers/SpiceRackProvider.js';
import { SimulationProvider } from '../providers/SimulationProvider.js';

export class KnowledgeUpdatePipeline {
  constructor(databasePath = null) {
    this.database = new KnowledgeDatabase(databasePath);
    this.indexManager = new FastIndexManager(this.database);
    this.telemetry = new TelemetryLogger(this.database);

    this.providers = [
      new MTGJSONProvider(),
      new ScryfallProvider(),
      new EDHRECProvider(),
      new MTGTop8Provider(),
      new SpiceRackProvider(),
      new SimulationProvider()
    ];
  }

  async run() {
    const startTime = Date.now();
    const rawObjects = [];
    const errors = [];
    const changes = [];

    // Step 1: Sync all providers
    for (const provider of this.providers) {
      try {
        await provider.initialize();
        const items = await provider.sync();
        rawObjects.push(...items);
        changes.push(`Synced ${items.length} objects from ${provider.name}`);
      } catch (err) {
        errors.push(`Provider ${provider.name} failed: ${err.message}`);
      }
    }

    // Step 2: Knowledge Fusion
    const fusedObjects = KnowledgeFusionEngine.fuse(rawObjects);

    // Step 3 & 4: Validate and Store in SQLite
    let newCount = 0;
    let modifiedCount = 0;

    for (const obj of fusedObjects) {
      const validation = KnowledgeValidator.validate(obj);
      if (validation.valid) {
        const existing = this.database.getObject(obj.id);
        if (existing) {
          modifiedCount++;
        } else {
          newCount++;
        }

        this.database.upsertObject(obj);
        this.indexManager.indexObject(obj);
      } else {
        errors.push(`Object ${obj.id} failed validation: ${validation.reason}`);
      }
    }

    // Step 5: Log Telemetry
    const telemetryEntry = this.telemetry.logSyncExecution({
      source: 'MasterKnowledgeUpdatePipeline',
      startTime,
      durationMs: Date.now() - startTime,
      errors,
      changes,
      newCount,
      modifiedCount
    });

    return {
      success: errors.length === 0,
      durationMs: telemetryEntry.durationMs,
      newCount,
      modifiedCount,
      totalFusedCount: fusedObjects.length,
      errors,
      changes
    };
  }
}
