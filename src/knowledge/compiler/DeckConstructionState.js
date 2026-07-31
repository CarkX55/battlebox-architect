/**
 * DeckConstructionState.js
 * Single Canonical Immutable State Object for Deck Construction.
 * Owns 60 fixed slots (or 100 for Commander).
 * Slot States: EMPTY -> RESERVED -> SEARCHING -> BOUND -> VALIDATED -> LOCKED.
 */

export const SLOT_STATES = {
  EMPTY: 'EMPTY',
  RESERVED: 'RESERVED',
  SEARCHING: 'SEARCHING',
  BOUND: 'BOUND',
  VALIDATED: 'VALIDATED',
  LOCKED: 'LOCKED'
};

export class Slot {
  constructor({
    id,
    index,
    state = SLOT_STATES.EMPTY,
    role = 'UNASSIGNED',
    packageId = null,
    irNodeId = null,
    contracts = [],
    candidateHistory = [],
    chosenCard = null,
    confidence = 1.0,
    costVector = null,
    proofPath = []
  }) {
    this.id = id;
    this.index = index;
    this.state = state;
    this.role = role;
    this.packageId = packageId;
    this.irNodeId = irNodeId;
    this.contracts = Object.freeze([...contracts]);
    this.candidateHistory = Object.freeze([...candidateHistory]);
    this.chosenCard = chosenCard ? Object.freeze({ ...chosenCard }) : null;
    this.confidence = confidence;
    this.costVector = costVector ? Object.freeze({ ...costVector }) : null;
    this.proofPath = Object.freeze([...proofPath]);
    Object.freeze(this);
  }
}

export class DeckConstructionState {
  constructor({ totalSlots = 60, contract = null, slots = null } = {}) {
    this.totalSlots = totalSlots;
    this.contract = contract;
    
    if (slots && Array.isArray(slots)) {
      this.slots = Object.freeze([...slots]);
    } else {
      const initialSlots = [];
      for (let i = 0; i < totalSlots; i++) {
        initialSlots.push(new Slot({ id: `slot_${i + 1}`, index: i }));
      }
      this.slots = Object.freeze(initialSlots);
    }
    Object.freeze(this);
  }

  // Reserve N slots for a package
  reserveSlots(packageId, role, quantity, capability, irNodeId) {
    const newSlots = [...this.slots];
    let reserved = 0;

    for (let i = 0; i < newSlots.length && reserved < quantity; i++) {
      if (newSlots[i].state === SLOT_STATES.EMPTY) {
        newSlots[i] = new Slot({
          ...newSlots[i],
          state: SLOT_STATES.RESERVED,
          role,
          packageId,
          irNodeId,
          contracts: [capability]
        });
        reserved++;
      }
    }

    return new DeckConstructionState({
      totalSlots: this.totalSlots,
      contract: this.contract,
      slots: newSlots
    });
  }

  // Bind a card to a slot
  bindCardToSlot(slotId, card, rankingInfo = {}, proofChain = []) {
    const newSlots = [...this.slots];
    const idx = newSlots.findIndex(s => s.id === slotId);
    
    if (idx !== -1) {
      newSlots[idx] = new Slot({
        ...newSlots[idx],
        state: SLOT_STATES.BOUND,
        chosenCard: card,
        confidence: rankingInfo.confidence || 0.95,
        candidateHistory: rankingInfo.candidateHistory || [],
        proofPath: proofChain
      });
    }

    return new DeckConstructionState({
      totalSlots: this.totalSlots,
      contract: this.contract,
      slots: newSlots
    });
  }

  getSlotStats() {
    const counts = { EMPTY: 0, RESERVED: 0, SEARCHING: 0, BOUND: 0, VALIDATED: 0, LOCKED: 0 };
    for (const s of this.slots) {
      counts[s.state] = (counts[s.state] || 0) + 1;
    }
    return {
      total: this.totalSlots,
      boundCount: counts.BOUND + counts.VALIDATED + counts.LOCKED,
      reservedCount: counts.RESERVED,
      emptyCount: counts.EMPTY,
      isFullyBound: (counts.BOUND + counts.VALIDATED + counts.LOCKED) === this.totalSlots
    };
  }
}
