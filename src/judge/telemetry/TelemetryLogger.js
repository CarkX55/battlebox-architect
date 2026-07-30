/**
 * TelemetryLogger.js
 * Isolated logger for solver passes, performance metrics, and optimization telemetry.
 * Keeps telemetry completely isolated from the immutable ArtifactRegistry.
 */

export class TelemetryLogger {
  constructor() {
    this.logs = [];
  }

  logPassExecution(passName, inputState, outputState, durationMs) {
    this.logs.push(Object.freeze({
      timestamp: Date.now(),
      type: 'PASS_EXECUTION',
      passName,
      inputState,
      outputState,
      durationMs
    }));
  }

  logTelemetry(event, details = {}) {
    this.logs.push(Object.freeze({
      timestamp: Date.now(),
      type: 'EVENT',
      event,
      details
    }));
  }

  getLogs() {
    return Array.from(this.logs);
  }

  clear() {
    this.logs = [];
  }
}
