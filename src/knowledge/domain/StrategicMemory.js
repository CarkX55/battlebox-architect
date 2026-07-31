/**
 * StrategicMemory.js
 * Persistent Strategic Compilation Memory Engine.
 * Remembers past compilation failures, unsuccessful engine experiments, and historical performance
 * to prevent repeating invalid deck construction patterns.
 */

export class StrategicMemoryEngine {
  constructor() {
    this.pastFailures = new Map(); // engineId -> failureRecord
    this.successfulPatterns = new Map(); // archetype -> patternRecord
  }

  recordEngineFailure(engineId, archetype, reason) {
    this.pastFailures.set(`${archetype}_${engineId}`, Object.freeze({
      engineId,
      archetype,
      reason,
      timestamp: new Date().toISOString()
    }));
  }

  isEngineBlacklisted(engineId, archetype) {
    return this.pastFailures.has(`${archetype}_${engineId}`);
  }

  getFailureReason(engineId, archetype) {
    const record = this.pastFailures.get(`${archetype}_${engineId}`);
    return record ? record.reason : null;
  }
}

export const StrategicMemory = new StrategicMemoryEngine();
