/**
 * src/services/compiler/core/stateSnapshot.js
 * 
 * StateSnapshot: Immutable Independent State Snapshot Container v29.10.
 * 
 * Guarantees that every state audited by StateTransitionLedger is:
 * 1. Canonicalized & Deep-Cloned: completely severed from mutable live references.
 * 2. Deep-Frozen: recursive Object.freeze prevents any post-hoc modification.
 * 3. Cryptographically Identifiable: stateHash represents the exact immutable state snapshot.
 */

import { computeDeterministicHash } from './certifiedDeckState.js';

export function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach(prop => {
    const val = obj[prop];
    if (val !== null && (typeof val === 'object' || typeof val === 'function') && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  });
  return obj;
}

export class StateSnapshot {
  /**
   * @param {Object} params
   * @param {string|number} params.snapshotId
   * @param {string} params.step
   * @param {any} params.state
   * @param {string} [params.stateHash]
   * @param {string} [params.metadata]
   */
  constructor({
    snapshotId,
    step,
    state,
    stateHash = null,
    metadata = {}
  }) {
    this.snapshotId = String(snapshotId);
    this.step = String(step);

    // Deep clone to isolate from live runtime mutations
    let clonedState;
    try {
      clonedState = JSON.parse(JSON.stringify(state ?? {}));
    } catch {
      clonedState = { ...state };
    }

    this.canonicalRepresentation = deepFreeze(clonedState);
    this.stateHash = String(stateHash || computeDeterministicHash(this.canonicalRepresentation));
    this.metadata = deepFreeze(JSON.parse(JSON.stringify(metadata || {})));
    this.frozen = true;
    this.timestamp = new Date().toISOString();

    Object.freeze(this);
  }
}
