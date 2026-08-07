/**
 * src/services/compiler/core/reasonLedger.js
 * 
 * ReasonLedger: Structured Causal Decision Journal v1.0.
 * Records explicit structured audit trails for every solver decision, candidate admission, and rejection.
 */

export class LedgerEntry {
  constructor({
    step = 'WINNER_SELECTION',
    slotId,
    role,
    winnerCard = null,
    winnerScore = 0,
    alternatives = [],
    rejectedCandidates = [],
    reason = '',
    causalLineage = null
  }) {
    this.timestamp = new Date().toISOString();
    this.step = step;
    this.slotId = slotId;
    this.role = role;
    this.winnerCard = winnerCard;
    this.winnerScore = Number(winnerScore);
    this.alternatives = Object.freeze([...alternatives]);
    this.rejectedCandidates = Object.freeze([...rejectedCandidates]);
    this.reason = reason;
    this.causalLineage = causalLineage ? Object.freeze({ ...causalLineage }) : Object.freeze({
      card: winnerCard,
      component: 'CandidateConstraintEngine',
      capability: role,
      objective: `${role} Synergy Allocation`,
      intentSourceField: role === 'Land' ? 'format' : 'tempo'
    });

    Object.freeze(this);
  }
}

export class ReasonLedger {
  constructor() {
    this._entries = [];
    this._isFrozen = false;
  }

  recordEntry(entryData) {
    if (this._isFrozen) {
      throw new Error('[ReasonLedger Error] Cannot record entry on frozen ledger.');
    }
    const entry = entryData instanceof LedgerEntry ? entryData : new LedgerEntry(entryData);
    this._entries.push(entry);
    return entry;
  }

  freeze() {
    this._isFrozen = true;
    Object.freeze(this._entries);
    Object.freeze(this);
    return this;
  }

  get entries() {
    return [...this._entries];
  }

  toJSON() {
    return this._entries.map(e => ({
      timestamp: e.timestamp,
      step: e.step,
      slotId: e.slotId,
      role: e.role,
      winnerCard: e.winnerCard,
      winnerScore: e.winnerScore,
      alternatives: e.alternatives,
      rejectedCandidatesCount: e.rejectedCandidates.length,
      reason: e.reason
    }));
  }
}
