/**
 * CompilerExperienceMemory.js
 * Persistent Empirical Experience Memory for the Compiler.
 * Stores empirical compilation failure patterns across trial executions before promoting to formal hypotheses.
 */

export class CompilerExperienceMemory {
  constructor() {
    this.failurePatterns = new Map();
  }

  recordFailurePattern({ archetype, condition, failureRate, trialCount }) {
    const patternKey = `${archetype.toLowerCase()}__${condition.toLowerCase()}`;
    
    const record = {
      patternKey,
      archetype,
      condition,
      failureRate,
      trialCount,
      recordedAt: new Date().toISOString()
    };

    this.failurePatterns.set(patternKey, Object.freeze(record));
    return record;
  }

  getFailureRate(archetype, condition) {
    const patternKey = `${archetype.toLowerCase()}__${condition.toLowerCase()}`;
    const record = this.failurePatterns.get(patternKey);
    return record ? record.failureRate : 0.0;
  }

  listHighRiskPatterns(threshold = 0.50) {
    return Array.from(this.failurePatterns.values()).filter(p => p.failureRate >= threshold);
  }
}
