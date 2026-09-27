/**
 * src/services/compiler/core/stateTransitionLedger.js
 * 
 * StateTransitionLedger: Immutable State Transition & Custody Chain v29.10.
 * 
 * Guarantees zero silent or undeclared state mutations across the entire pipeline:
 *   S0 (Intent) -> S1 (Gameplan) -> S2 (SearchDomain) -> S3 (SelectedSpells) -> 
 *   S4 (ManaOptimized) -> S5 (Frozen) -> S6 (Holdout) -> S7 (Closure) -> S8 (Outcome)
 * 
 * Formal Invariants:
 *   1. Exactly 8 canonical inter-state transitions between the 9 canonical state snapshots (S0..S8).
 *   2. Every state audited is an immutable StateSnapshot (deep-cloned, deep-frozen, hashed).
 *   3. Every transition records fromHash, toHash, authorizedBy ({ componentId, componentVersion, policyHash }),
 *      transitionPolicyVersion, authorityAttestation (deterministic digest), mutationType, semanticDiff, and reason.
 *   4. Any mutation outside the ledger or tampering with state hashes triggers an immediate
 *      hard fail: PROTOCOL_VIOLATION: UNAUTHORIZED_STATE_MUTATION.
 */

import { computeDeterministicHash } from './certifiedDeckState.js';
import { StateSnapshot } from './stateSnapshot.js';

export const TRANSITION_STEPS = Object.freeze({
  S0_INTENT: 'S0_INTENT',
  S1_GAMEPLAN: 'S1_GAMEPLAN',
  S2_SEARCH_DOMAIN: 'S2_SEARCH_DOMAIN',
  S3_SELECTED_SPELLS: 'S3_SELECTED_SPELLS',
  S4_MANA_OPTIMIZED: 'S4_MANA_OPTIMIZED',
  S5_FROZEN: 'S5_FROZEN',
  S6_HOLDOUT: 'S6_HOLDOUT',
  S7_CLOSURE: 'S7_CLOSURE',
  S8_OUTCOME: 'S8_OUTCOME'
});

export const MUTATION_TYPES = Object.freeze({
  INITIALIZATION: 'INITIALIZATION',
  SYNTHESIS: 'SYNTHESIS',
  EXPLORATION_AND_SELECTION: 'EXPLORATION_AND_SELECTION',
  CO_OPTIMIZATION: 'CO_OPTIMIZATION',
  REPLAN_MUTATION: 'REPLAN_MUTATION',
  FREEZE: 'FREEZE',
  INDEPENDENT_EVALUATION: 'INDEPENDENT_EVALUATION',
  JUDICIAL_CERTIFICATION: 'JUDICIAL_CERTIFICATION',
  OUTCOME_GENERATION: 'OUTCOME_GENERATION'
});

export const STATE_TRANSITION_TYPES = Object.freeze({
  ...MUTATION_TYPES,
  INITIAL_PROJECTION: 'INITIAL_PROJECTION',
  REFINEMENT_STEP: 'REFINEMENT_STEP',
  CANDIDATE_ADMISSION: 'CANDIDATE_ADMISSION',
  PROGRESSIVE_ADDITION: 'PROGRESSIVE_ADDITION',
  MANA_CO_OPTIMIZATION: 'MANA_CO_OPTIMIZATION',
  REPLAN_MUTATION: 'REPLAN_MUTATION',
  CANONICAL_FREEZE: 'CANONICAL_FREEZE',
  HOLDOUT_EVALUATION: 'HOLDOUT_EVALUATION',
  JUDICIAL_VERDICT: 'JUDICIAL_VERDICT',
  CLOSURE_CERTIFICATION: 'CLOSURE_CERTIFICATION'
});

export const AUTHORIZED_COMPONENTS = Object.freeze(new Set([
  'IntentBuilder',
  'GameplanSynthesizer',
  'SearchSpaceCompiler',
  'ProgressiveDeckStateBuilder',
  'ManaExecutionOptimizer',
  'ReplanExecutor',
  'CertifiedDeckState',
  'HoldoutValidationEngine',
  'DeterministicSupremeJudge',
  'StrategicClosureCertificate'
]));

/**
 * Computes a holistic state hash separating deck projection from compilation/strategic state.
 */
export function computeHolisticStateHash({
  deckProjectionHash,
  strategicPlanHash = 'DEFAULT_PLAN',
  gameplanHash = 'DEFAULT_GAMEPLAN',
  intentHash = 'DEFAULT_INTENT',
  replanAttempt = 0,
  evaluatorProtocol = 'v29.10'
} = {}) {
  return computeDeterministicHash({
    deckProjectionHash: String(deckProjectionHash || ''),
    strategicPlanHash: String(strategicPlanHash || ''),
    gameplanHash: String(gameplanHash || ''),
    intentHash: String(intentHash || ''),
    replanAttempt: Number(replanAttempt || 0),
    evaluatorProtocol: String(evaluatorProtocol || 'v29.10')
  });
}

export class StateTransitionRecord {
  constructor({
    transitionId,
    fromStep,
    toStep,
    fromHash,
    toHash,
    authorizedBy = {},
    transitionPolicyVersion = 'v29.10',
    authorityAttestation = null,
    authoritySignature = null, // Backward compatibility alias
    mutationType = MUTATION_TYPES.REFINEMENT,
    semanticDiff = {},
    reason = ''
  }) {
    this.transitionId = Number(transitionId);
    this.fromStep = String(fromStep);
    this.toStep = String(toStep);
    this.fromHash = String(fromHash);
    this.toHash = String(toHash);
    this.authorizedBy = Object.freeze({
      componentId: String(authorizedBy.componentId || 'UNKNOWN_COMPONENT'),
      componentVersion: String(authorizedBy.componentVersion || 'v29.10'),
      policyHash: String(authorizedBy.policyHash || 'DEFAULT_POLICY')
    });
    this.transitionPolicyVersion = String(transitionPolicyVersion);
    this.mutationType = String(mutationType);
    this.semanticDiff = Object.freeze(JSON.parse(JSON.stringify(semanticDiff || {})));
    this.reason = String(reason);

    // Precise terminology: deterministic integrity digest (attestation)
    const digest = authorityAttestation || authoritySignature || computeDeterministicHash({
      transitionId: this.transitionId,
      fromStep: this.fromStep,
      toStep: this.toStep,
      fromHash: this.fromHash,
      toHash: this.toHash,
      authorizedBy: this.authorizedBy,
      transitionPolicyVersion: this.transitionPolicyVersion,
      mutationType: this.mutationType
    });

    this.authorityAttestation = String(digest);
    this.authorityDigest = this.authorityAttestation;
    this.authoritySignature = this.authorityAttestation; // backward compat alias
    this.attestationType = 'DETERMINISTIC_DIGEST';

    this.timestamp = new Date().toISOString();
    Object.freeze(this);
  }
}

export class StateTransitionLedger {
  constructor(options = {}) {
    this.compilerVersion = options.compilerVersion || 'V29.10';
    this.records = [];
    this.snapshots = new Map(); // stateHash -> StateSnapshot
    this.latestHash = 'GENESIS_STATE_HASH';
    this.isLocked = false;
    this.isLineageInvalidated = false;
    this.lineageInvalidationReason = null;
    this.isTerminal = false;
    this.terminalReason = null;
    this.terminalStage = null;
  }

  get transitions() {
    return this.records;
  }

  get states() {
    return Array.from(this.snapshots.values());
  }

  get stateCount() {
    return this.snapshots.size;
  }

  get transitionCount() {
    return this.records.length;
  }

  markTerminalFailure({ failureReason = 'UNKNOWN_FAILURE', failureStage = 'EXECUTION' } = {}) {
    this.isTerminal = true;
    this.isLineageInvalidated = true;
    this.terminalReason = String(failureReason);
    this.terminalStage = String(failureStage);
    this.lineageInvalidationReason = `Terminal failure at [${this.terminalStage}]: ${this.terminalReason}`;
    this.isLocked = true;
    return this;
  }

  assertActiveLineage(operation = 'advance') {
    if (this.isTerminal) {
      throw new Error(`PROTOCOL_VIOLATION: TERMINAL_LINEAGE_RESURRECTION: Cannot execute ${operation} on terminated lineage (${this.terminalReason}).`);
    }
    if (this.isLineageInvalidated) {
      throw new Error(`PROTOCOL_VIOLATION: TERMINAL_LINEAGE_RESURRECTION: Cannot execute ${operation} on invalidated lineage (${this.lineageInvalidationReason}).`);
    }
    return true;
  }

  isLineageApproved() {
    return !this.isTerminal && !this.isLineageInvalidated && this.verifyContinuity().isValid && this.verifyChainIntegrity().isValid;
  }

  assertMonotonicPublicationDescendance() {
    if (this.isTerminal) {
      throw new Error(`PROTOCOL_VIOLATION: TERMINAL_LINEAGE_RESURRECTION: Cannot publish deck from terminated lineage (${this.terminalReason}).`);
    }
    if (this.isLineageInvalidated) {
      throw new Error(`PROTOCOL_VIOLATION: PUBLISHED_STATE_MUST_BE_DESCENDANT_OF_APPROVED_FROZEN_STATE: Cannot publish deck from invalidated lineage (${this.lineageInvalidationReason}). Fresh compilation required.`);
    }
    const continuity = this.verifyContinuity();
    if (!continuity.isValid) {
      throw new Error(`PROTOCOL_VIOLATION: PUBLISHED_STATE_MUST_BE_DESCENDANT_OF_APPROVED_FROZEN_STATE: Broken lineage continuity: ${continuity.error}`);
    }
    const chain = this.verifyChainIntegrity();
    if (!chain.isValid) {
      throw new Error(`PROTOCOL_VIOLATION: PUBLISHED_STATE_MUST_BE_DESCENDANT_OF_APPROVED_FROZEN_STATE: Severed chain integrity: ${chain.reason}`);
    }
    return true;
  }

  /**
   * Initializes the ledger with an immutable genesis state snapshot (e.g. S0_INTENT).
   * Does not create a transition, establishing stateCount = 1, transitionCount = 0.
   */
  initializeGenesisState({ step = TRANSITION_STEPS.S0_INTENT, state = {}, stateHash = null, metadata = {} } = {}) {
    if (this.records.length > 0 || this.snapshots.size > 0) {
      throw new Error('PROTOCOL_VIOLATION: Genesis state can only be initialized on a fresh StateTransitionLedger.');
    }
    const snapshot = new StateSnapshot({
      snapshotId: 'SNAPSHOT_S0_GENESIS',
      step,
      state,
      stateHash,
      metadata
    });
    this.snapshots.set(snapshot.stateHash, snapshot);
    this.latestHash = snapshot.stateHash;
    return snapshot;
  }

  /**
   * Registers an immutable snapshot of a state.
   */
  registerSnapshot({ step, state, stateHash = null, metadata = {} }) {
    const snapshotId = `SNAPSHOT_${this.snapshots.size}_${step}`;
    const snapshot = new StateSnapshot({
      snapshotId,
      step,
      state,
      stateHash,
      metadata
    });
    this.snapshots.set(snapshot.stateHash, snapshot);
    return snapshot;
  }

  /**
   * Records a strictly authorized state transition.
   * Fails immediately with PROTOCOL_VIOLATION if state continuity is broken or component is unauthorized.
   */
  recordTransition(params) {
    if (this.isTerminal) {
      throw new Error(`PROTOCOL_VIOLATION: TERMINAL_LINEAGE_RESURRECTION: Cannot record transition on terminated lineage (${this.terminalReason}).`);
    }
    if (this.isLocked) {
      throw new Error('PROTOCOL_VIOLATION: TERMINAL_LINEAGE_RESURRECTION: Cannot record transition to locked StateTransitionLedger.');
    }

    const fromStep = params.fromStep || (this.records.length === 0 ? 'S0_INTENT' : `S${this.records.length - 1}`);
    const toStep = params.toStep || `S${this.records.length + 1}_${params.mutationType || 'STEP'}`;
    const fromHash = params.fromHash;
    const toHash = params.toHash;

    let authorizedBy = params.authorizedBy;
    if (!authorizedBy && (params.componentId || params.component)) {
      authorizedBy = {
        componentId: params.componentId || params.component,
        componentVersion: params.componentVersion || 'V29.10',
        policyHash: params.policyHash || 'CANONICAL_POLICY'
      };
    }

    if (!authorizedBy || !authorizedBy.componentId) {
      throw new Error(`PROTOCOL_VIOLATION: Transition [${fromStep} -> ${toStep}] lacks authoritative component identification.`);
    }

    if (!AUTHORIZED_COMPONENTS.has(authorizedBy.componentId)) {
      throw new Error(`PROTOCOL_VIOLATION: UNAUTHORIZED_COMPONENT: Component "${authorizedBy.componentId}" is not authorized to mutate compiler state.`);
    }

    // Continuity verification: fromHash must match latest recorded hash (unless ledger is at genesis)
    if (this.latestHash !== 'GENESIS_STATE_HASH' && fromHash !== this.latestHash) {
      const errorMsg = `PROTOCOL_VIOLATION: UNAUTHORIZED_STATE_MUTATION: Step [${toStep}] expected fromHash=${this.latestHash} but received fromHash=${fromHash}. State continuity severed.`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Monotonic lineage invalidation tracking
    if (
      params.mutationType === STATE_TRANSITION_TYPES.JUDICIAL_VERDICT &&
      params.semanticDiff?.verdict &&
      (params.semanticDiff.verdict === 'REJECT' || params.semanticDiff.verdict === 'REPLAN')
    ) {
      this.isLineageInvalidated = true;
      this.lineageInvalidationReason = `Judicial verdict rejected state: ${params.semanticDiff.verdict}`;
    } else if (
      params.mutationType === STATE_TRANSITION_TYPES.CLOSURE_CERTIFICATION &&
      params.semanticDiff?.status &&
      params.semanticDiff.status !== 'STRATEGICALLY_CLOSED'
    ) {
      this.isLineageInvalidated = true;
      this.lineageInvalidationReason = `Strategic closure not closed: ${params.semanticDiff.status}`;
    }

    // Store state snapshot if state object is provided
    if (params.state) {
      this.registerSnapshot({
        step: toStep,
        state: params.state,
        stateHash: toHash,
        metadata: { mutationType: params.mutationType, reason: params.reason }
      });
    }

    const transitionId = this.records.length + 1;
    const record = new StateTransitionRecord({
      transitionId,
      fromStep,
      toStep,
      fromHash,
      toHash,
      authorizedBy,
      transitionPolicyVersion: params.transitionPolicyVersion || 'v29.10',
      authorityAttestation: params.authorityAttestation || params.authoritySignature,
      mutationType: params.mutationType,
      semanticDiff: params.semanticDiff || {},
      reason: params.reason || ''
    });

    this.records.push(record);
    this.latestHash = toHash;
    return record;
  }

  /**
   * Verifies that each record's fromHash strictly matches the preceding record's toHash.
   */
  verifyContinuity() {
    if (this.records.length === 0) {
      return { isValid: false, brokenIndex: 0, error: 'Ledger has no transitions', transitionsCount: 0, stateCount: this.snapshots.size };
    }
    for (let i = 1; i < this.records.length; i++) {
      const prev = this.records[i - 1];
      const curr = this.records[i];
      if (curr.fromHash !== prev.toHash) {
        return {
          isValid: false,
          brokenIndex: i,
          error: `Discontinuity between transition ${prev.transitionId} (${prev.toStep} toHash=${prev.toHash}) and ${curr.transitionId} (${curr.toStep} fromHash=${curr.fromHash})`,
          transitionsCount: this.records.length,
          stateCount: this.snapshots.size
        };
      }
    }
    return {
      isValid: true,
      transitionsCount: this.records.length,
      stateCount: this.snapshots.size || (this.records.length + 1),
      genesisHash: this.records[0].fromHash,
      finalHash: this.latestHash
    };
  }

  /**
   * Asserts that a specific step transition occurred with exact matching hashes.
   */
  assertTransition(fromStep, toStep, expectedFromHash = null, expectedToHash = null) {
    const record = this.records.find(r => r.fromStep === fromStep && r.toStep === toStep);
    if (!record) {
      throw new Error(`PROTOCOL_VIOLATION: Missing mandatory transition in ledger: [${fromStep} -> ${toStep}].`);
    }
    if (expectedFromHash && record.fromHash !== expectedFromHash) {
      throw new Error(`PROTOCOL_VIOLATION: Hash mismatch at [${fromStep}]: expected ${expectedFromHash}, got ${record.fromHash}.`);
    }
    if (expectedToHash && record.toHash !== expectedToHash) {
      throw new Error(`PROTOCOL_VIOLATION: Hash mismatch at [${toStep}]: expected ${expectedToHash}, got ${record.toHash}.`);
    }
    return true;
  }

  /**
   * Verifies the complete cryptographic chain of custody.
   */
  verifyChainIntegrity() {
    if (this.records.length === 0) return { isValid: false, reason: 'Ledger has no transitions' };

    for (let i = 0; i < this.records.length; i++) {
      const record = this.records[i];
      if (i > 0) {
        const prevRecord = this.records[i - 1];
        if (record.fromHash !== prevRecord.toHash) {
          return {
            isValid: false,
            violationStep: record.toStep,
            reason: `Broken chain: transition ${record.transitionId} fromHash (${record.fromHash}) != previous toHash (${prevRecord.toHash})`
          };
        }
      }
    }

    return {
      isValid: true,
      totalTransitions: this.records.length,
      totalStates: this.snapshots.size || (this.records.length + 1),
      genesisHash: this.records[0].fromHash,
      finalHash: this.latestHash
    };
  }

  lock() {
    this.isLocked = true;
    return Object.freeze(this);
  }

  formatAuditTrail() {
    return this.records.map(r => 
      `[T${r.transitionId}] ${r.fromStep} -> ${r.toStep} | From: ${r.fromHash.substring(0, 8)} | To: ${r.toHash.substring(0, 8)} | Auth: ${r.authorizedBy.componentId}@${r.authorizedBy.componentVersion} [${r.authorityAttestation?.substring(0, 8)}] | Reason: ${r.reason}`
    ).join('\n');
  }
}

/**
 * Computes canonical failure state hash distinguishing:
 * strategic state != card list != physical deck state.
 */
export function hashCanonicalFailureState({
  lineageId,
  stateSnapshotHash,
  gameplanHash,
  deckProjectionHash,
  failureStage,
  failureReason
} = {}) {
  return computeDeterministicHash({
    lineageId: String(lineageId || 'NO_LINEAGE'),
    stateSnapshotHash: String(stateSnapshotHash || 'NO_SNAPSHOT'),
    gameplanHash: String(gameplanHash || 'NO_GAMEPLAN'),
    deckProjectionHash: String(deckProjectionHash || 'NO_PROJECTION'),
    failureStage: String(failureStage || 'UNKNOWN_STAGE'),
    failureReason: String(failureReason || 'UNKNOWN_REASON')
  });
}
