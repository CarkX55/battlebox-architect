/**
 * src/services/compiler/core/constructionState.js
 * 
 * ConstructionState: Partial Assembly State Tracker v1.0.
 * Maintains real-time remaining capability deficits and slot completion metrics during compilation.
 */

export class ConstructionState {
  constructor({
    targetSlotsCount = 60,
    filledSlotsCount = 0,
    remainingDeficits = new Map()
  } = {}) {
    this.targetSlotsCount = targetSlotsCount;
    this.filledSlotsCount = filledSlotsCount;
    this.remainingDeficits = new Map(remainingDeficits);
  }

  get remainingSlotsCount() {
    return Math.max(0, this.targetSlotsCount - this.filledSlotsCount);
  }

  get isComplete() {
    return this.remainingSlotsCount === 0;
  }

  getDeficit(axisId) {
    return this.remainingDeficits.get(axisId) || 0;
  }

  updateDeficit(axisId, deltaAmount) {
    const current = this.getDeficit(axisId);
    const updated = Math.max(0, current - deltaAmount);
    this.remainingDeficits.set(axisId, updated);
  }

  incrementFilledSlots(count = 1) {
    this.filledSlotsCount += count;
  }

  toJSON() {
    const deficitsObj = {};
    for (const [id, val] of this.remainingDeficits.entries()) {
      deficitsObj[id] = val;
    }
    return {
      targetSlotsCount: this.targetSlotsCount,
      filledSlotsCount: this.filledSlotsCount,
      remainingSlotsCount: this.remainingSlotsCount,
      isComplete: this.isComplete,
      remainingDeficits: deficitsObj
    };
  }
}
