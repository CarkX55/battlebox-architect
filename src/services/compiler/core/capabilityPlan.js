/**
 * src/services/compiler/core/capabilityPlan.js
 * 
 * CapabilityPlan & AllocationSlot: Consolidated Capability Requirements v1.0.
 * Operates purely on abstract AllocationSlots (0 cards known).
 */

export class AllocationSlot {
  constructor({
    slotId,
    role,
    requiredDensity = 4,
    priority = 100,
    timing = 'EARLY',
    mandatory = false,
    winnerCard = null,
    winnerCardObj = null,
    alternatives = [],
    confidenceScore = 1.0,
    allocationReason = '',
    origin = null,
    strength = 'PREFERRED'
  }) {
    if (!slotId) throw new Error('[AllocationSlot Error] slotId is required.');

    this.slotId = slotId;
    this.role = role;
    this.requiredDensity = Number(requiredDensity);
    this.priority = Number(priority);
    this.timing = timing;
    this.mandatory = Boolean(mandatory);
    this.origin = origin ? Object.freeze({ ...origin }) : { field: 'tempo', value: 'Aggro' };
    this.strength = strength;
    
    // Filled during Winner Selection / Copy Allocation
    this.winnerCard = winnerCard;
    this.winnerCardObj = winnerCardObj || null;
    this.alternatives = Object.freeze([...alternatives]);
    this.confidenceScore = Number(confidenceScore);
    this.allocationReason = allocationReason;

    Object.freeze(this);
  }

  withFilledData({ winnerCard, winnerCardObj = null, alternatives = [], confidenceScore = 1.0, allocationReason = '' }) {
    return new AllocationSlot({
      ...this,
      winnerCard,
      winnerCardObj,
      alternatives,
      confidenceScore,
      allocationReason
    });
  }

  toJSON() {
    return {
      slotId: this.slotId,
      role: this.role,
      requiredDensity: this.requiredDensity,
      priority: this.priority,
      timing: this.timing,
      mandatory: this.mandatory,
      winnerCard: this.winnerCard,
      alternatives: this.alternatives,
      confidenceScore: this.confidenceScore,
      allocationReason: this.allocationReason
    };
  }
}

export class CapabilityPlan {
  constructor(slots = [], metadata = {}) {
    this.slots = Object.freeze(slots.map(s => s instanceof AllocationSlot ? s : new AllocationSlot(s)));
    this.metadata = Object.freeze({ ...metadata });
    Object.freeze(this);
  }

  /**
   * Return total required density across all slots.
   */
  get totalDensity() {
    return this.slots.reduce((sum, s) => sum + s.requiredDensity, 0);
  }

  validate() {
    if (!Array.isArray(this.slots)) {
      throw new Error('[CapabilityPlan Validation Error] slots must be an array.');
    }
    for (const slot of this.slots) {
      if (slot.requiredDensity <= 0) {
        throw new Error(`[CapabilityPlan Validation Error] Slot ${slot.slotId} has density <= 0.`);
      }
    }
  }

  toJSON() {
    return {
      totalDensity: this.totalDensity,
      slots: this.slots.map(s => s.toJSON()),
      metadata: this.metadata
    };
  }
}
