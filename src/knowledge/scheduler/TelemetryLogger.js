/**
 * TelemetryLogger.js
 * Comprehensive Telemetry & Execution Logging System.
 */

export class TelemetryLogger {
  constructor(database) {
    this.database = database;
  }

  logSyncExecution({ source, startTime, durationMs, errors = [], changes = [], newCount = 0, modifiedCount = 0 }) {
    const entry = {
      id: `log_${source}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      source,
      durationMs: durationMs || (Date.now() - startTime),
      errors,
      changes,
      newCount,
      modifiedCount
    };

    console.log(`[TelemetryLogger] [${source}] Sync completed in ${entry.durationMs}ms. New: ${newCount}, Modified: ${modifiedCount}, Errors: ${errors.length}`);

    if (this.database) {
      this.database.logTelemetry(entry);
    }

    return entry;
  }
}
