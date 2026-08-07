/**
 * src/services/compiler/core/intentUsageTracker.js
 * 
 * IntentUsageTracker: Principle #3 Intent Utilization Auditor v1.0.
 * Tracks access to IntentPackage properties during compilation and calculates
 * IntentCoverage percentage and Usage Ledger.
 */

export class IntentUsageTracker {
  constructor() {
    this.usageLedger = new Map();
    this.monitoredFields = new Set([
      'format',
      'colors',
      'tempo',
      'primaryTribe',
      'strategy',
      'mechanics',
      'budget',
      'powerLevel',
      'userConstraints'
    ]);
  }

  /**
   * Records a consumer component reading a specific IntentPackage field.
   * 
   * @param {string} field 
   * @param {string} consumerComponent 
   */
  recordUsage(field, consumerComponent) {
    if (!field || !consumerComponent) return;
    
    if (!this.usageLedger.has(field)) {
      this.usageLedger.set(field, new Set());
    }
    this.usageLedger.get(field).add(consumerComponent);
  }

  /**
   * Wraps an IntentPackage in a Proxy to automatically track property reads.
   * 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage 
   * @param {string} activeConsumerComponent 
   * @returns {Proxy}
   */
  wrap(intentPackage, activeConsumerComponent = 'CompilerPass') {
    const tracker = this;
    return new Proxy(intentPackage, {
      get(target, prop, receiver) {
        if (typeof prop === 'string' && tracker.monitoredFields.has(prop)) {
          tracker.recordUsage(prop, activeConsumerComponent);
        }
        const val = Reflect.get(target, prop, receiver);
        if (typeof val === 'function') {
          return val.bind(target);
        }
        return val;
      }
    });
  }

  /**
   * Computes Intent Coverage metrics across all monitored fields.
   * 
   * @returns {{ coveragePercentage: number, usageMap: Object, unconsumedFields: string[], isFullCoverage: boolean }}
   */
  calculateCoverage() {
    const usageMap = {};
    const unconsumedFields = [];
    let consumedCount = 0;

    for (const field of this.monitoredFields) {
      const consumersSet = this.usageLedger.get(field);
      if (consumersSet && consumersSet.size > 0) {
        consumedCount += 1;
        usageMap[field] = Array.from(consumersSet);
      } else {
        usageMap[field] = [];
        unconsumedFields.push(field);
      }
    }

    const coveragePercentage = Math.round((consumedCount / this.monitoredFields.size) * 100);

    return {
      coveragePercentage,
      usageMap: Object.freeze(usageMap),
      unconsumedFields: Object.freeze(unconsumedFields),
      isFullCoverage: coveragePercentage === 100
    };
  }
}
