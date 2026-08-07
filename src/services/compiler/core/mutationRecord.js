/**
 * src/services/compiler/core/mutationRecord.js
 * 
 * MutationRecord: Registro Forense de Mutaciones del Mazo.
 * 
 * Every phase that modifies the deck MUST log a MutationRecord.
 * The CopyAllocationAuditor uses these records to identify
 * exactly WHICH phase introduced a copy allocation violation.
 * 
 * Sprint 23: Observability layer — records mutations without preventing them.
 * Sprint 24: RepairProposal protocol — mutations routed through CopyAllocationManager.
 * Sprint 25: ImmutableDeckModel — mutations become structurally impossible.
 */

/**
 * Individual mutation record — one per deck modification action.
 */
export class MutationRecord {
  constructor({
    phase = 'UNKNOWN',
    action = 'UNKNOWN',
    authority = 'CopyAllocationManager', // 'CopyAllocationManager', 'RepairEngine', 'SlotCandidateRanker', 'ManualOverride'
    cardName = null,
    role = null,
    reason = '',
    quantityBefore = null,
    quantityAfter = null,
    timestamp = null
  }) {
    this.phase = phase;
    this.action = action;           // 'ADD', 'REMOVE', 'REDUCE_COPIES', 'INCREASE_COPIES', 'SPLICE', 'SWAP'
    this.authority = authority;
    this.cardName = cardName;
    this.role = role;
    this.reason = reason;
    this.quantityBefore = quantityBefore;
    this.quantityAfter = quantityAfter;
    this.timestamp = timestamp || new Date().toISOString();

    Object.freeze(this);
  }
}


/**
 * MutationLog: Append-only, immutable journal of all deck mutations
 * within a single compilation run.
 * 
 * Usage:
 *   const log = new MutationLog();
 *   log.record({ phase: 'ManaRepair', action: 'REMOVE', cardName: 'Llanowar Elves', ... });
 *   // Later:
 *   auditor.audit(copyAllocationState, finalDeck, log);
 */
export class MutationLog {
  constructor() {
    this._records = [];
    this._frozen = false;
  }

  /**
   * Record a mutation. Throws if the log has been frozen.
   * @param {Object} data - MutationRecord constructor data
   * @returns {MutationRecord} The recorded mutation
   */
  record(data) {
    if (this._frozen) {
      throw new Error('MutationLog is frozen — compilation is complete. No further mutations allowed.');
    }
    const record = new MutationRecord(data);
    this._records.push(record);
    return record;
  }

  /**
   * Freeze the log — no more mutations can be recorded.
   * Called at the end of compilation before the audit phase.
   */
  freeze() {
    this._frozen = true;
    Object.freeze(this._records);
    return this;
  }

  /**
   * Get all recorded mutations.
   * @returns {MutationRecord[]}
   */
  getRecords() {
    return [...this._records];
  }

  /**
   * Get mutations for a specific card.
   * @param {string} cardName
   * @returns {MutationRecord[]}
   */
  getRecordsForCard(cardName) {
    const normalizedName = (cardName || '').toLowerCase().trim();
    return this._records.filter(r => 
      (r.cardName || '').toLowerCase().trim() === normalizedName
    );
  }

  /**
   * Get mutations introduced by a specific phase.
   * @param {string} phase
   * @returns {MutationRecord[]}
   */
  getRecordsByPhase(phase) {
    return this._records.filter(r => r.phase === phase);
  }

  /**
   * Get total mutation count.
   * @returns {number}
   */
  get count() {
    return this._records.length;
  }

  /**
   * Summary grouped by phase.
   * @returns {Object.<string, number>}
   */
  getSummaryByPhase() {
    const summary = {};
    for (const r of this._records) {
      summary[r.phase] = (summary[r.phase] || 0) + 1;
    }
    return summary;
  }
}
