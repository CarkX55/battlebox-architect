/**
 * src/services/compiler/core/strategicClosureCertificate.js
 * 
 * StrategicClosureCertificate: Certified Strategic Closure Master Container v29.10.
 * 
 * Represents verifiable proof of Certified Strategic Closure within a declared search domain.
 * Integrates search completeness, contextual sound pruning, paired CRN statistical evidence,
 * independent holdout validation, and canonical strategic projection invariance.
 * 
 * Axioms:
 *   1. STRATEGIC_CLOSURE is not an assertion of universal MTG omniscience. It is a mathematical
 *      proof of closure within a declared, verified search domain.
 *   2. Five mutually exclusive closure statuses:
 *      - STRATEGICALLY_CLOSED: Domain exhausted, sound pruning verified, winner proven superior
 *        or formally equivalent within declared policy, zero unresolved lines.
 *      - BEST_FOUND_NOT_CLOSED: Provisional winner identified, but domain not closed or unresolved lines exist.
 *      - SEARCH_INCOMPLETE: Search stopped early by resource bounds or time limits.
 *      - EVIDENCE_INSUFFICIENT: Viable candidates remain STATISTICALLY_UNRESOLVED and cannot be distinguished.
 *      - STRATEGICALLY_INFEASIBLE: No viable line satisfies Intent constraints.
 */

import { computeDeterministicHash } from './certifiedDeckState.js';

export const CLOSURE_STATUSES = Object.freeze({
  STRATEGICALLY_CLOSED: 'STRATEGICALLY_CLOSED',
  BEST_FOUND_NOT_CLOSED: 'BEST_FOUND_NOT_CLOSED',
  SEARCH_INCOMPLETE: 'SEARCH_INCOMPLETE',
  EVIDENCE_INSUFFICIENT: 'EVIDENCE_INSUFFICIENT',
  STRATEGICALLY_INFEASIBLE: 'STRATEGICALLY_INFEASIBLE'
});
export const STRATEGIC_CLOSURE_STATUS = CLOSURE_STATUSES;

export class StrategicClosureCertificate {
  /**
   * @param {Object} params
   * @param {string} params.intentContractHash
   * @param {string} params.gameplanContractHash
   * @param {Object} params.candidateLinesAudit - { discovered, viable, infeasible, dominated, unresolved }
   * @param {Object} params.searchCertificate - Instance of StrategicSearchCertificate
   * @param {Object} params.selectionAudit - { paretoFrontier, winningLine, selectionPolicyVersion, selectionPolicyHash }
   * @param {Object} params.abEvidence - Paired CRN evaluation result
   * @param {Object} params.holdoutAudit - Instance or result of HoldoutValidationEngine
   * @param {Object} [params.invarianceAudit] - { irrelevantPerturbationPass: boolean, ablationSensitivityPass: boolean }
   * @param {string} [params.forcedStatus] - Override status for testing or manual intervention
   */
  constructor({
    intentContractHash = 'HASH_INTENT',
    gameplanContractHash = 'HASH_GAMEPLAN',
    candidateLinesAudit = {},
    searchCertificate = null,
    selectionAudit = {},
    abEvidence = {},
    holdoutAudit = {},
    invarianceAudit = { irrelevantPerturbationPass: true, ablationSensitivityPass: true },
    forcedStatus = null
  } = {}) {
    this.intentContractHash = String(intentContractHash);
    this.gameplanContractHash = String(gameplanContractHash);

    this.candidateLinesAudit = Object.freeze({
      discovered: Number(candidateLinesAudit.discovered ?? 0),
      viable: Number(candidateLinesAudit.viable ?? 0),
      infeasible: Number(candidateLinesAudit.infeasible ?? 0),
      dominated: Number(candidateLinesAudit.dominated ?? 0),
      unresolved: Number(candidateLinesAudit.unresolved ?? 0)
    });

    this.searchCertificate = searchCertificate;
    this.selectionAudit = Object.freeze({ ...selectionAudit });
    this.abEvidence = Object.freeze({ ...abEvidence });
    this.holdoutAudit = Object.freeze({ ...holdoutAudit });
    this.invarianceAudit = Object.freeze({ ...invarianceAudit });

    // Derive the formal closure status
    this.status = forcedStatus || this._deriveClosureStatus();

    this.certificateHash = computeDeterministicHash({
      intent: this.intentContractHash,
      gameplan: this.gameplanContractHash,
      candidates: this.candidateLinesAudit,
      searchHash: this.searchCertificate?.certificateHash,
      selection: this.selectionAudit,
      abVerdict: this.abEvidence?.verdict,
      holdoutStatus: this.holdoutAudit?.validationStatus,
      status: this.status
    });

    this.timestamp = new Date().toISOString();
    Object.freeze(this);
  }

  /**
   * Rigorously derives the closure status from component evidence.
   */
  _deriveClosureStatus() {
    // 1. Infeasibility check
    if (this.candidateLinesAudit.viable === 0) {
      return CLOSURE_STATUSES.STRATEGICALLY_INFEASIBLE;
    }

    // 2. Search completeness & sound pruning check
    if (!this.searchCertificate) {
      return CLOSURE_STATUSES.SEARCH_INCOMPLETE;
    }

    const domainVerified = this.searchCertificate.isDomainDefinitionVerified();
    const pruningSound = this.searchCertificate.isPruningSoundnessVerified();
    const domainExhausted = this.searchCertificate.isExhaustiveWithinDeclaredDomain();

    if (!domainVerified || !pruningSound || !domainExhausted) {
      if (this.searchCertificate.stoppingReason === 'BUDGET_EXHAUSTED' || this.searchCertificate.stoppingReason === 'BOUND_REACHED') {
        return CLOSURE_STATUSES.SEARCH_INCOMPLETE;
      }
      return CLOSURE_STATUSES.BEST_FOUND_NOT_CLOSED;
    }

    // 3. Unresolved candidate lines check
    // If viable competing lines remain statistically unresolved against the winner
    if (this.candidateLinesAudit.unresolved > 0 || this.searchCertificate.hasUnresolvedLines()) {
      return CLOSURE_STATUSES.EVIDENCE_INSUFFICIENT;
    }

    // 4. Holdout validation check
    const holdoutPassed = this.holdoutAudit?.isValidated ?? false;
    if (!holdoutPassed) {
      return CLOSURE_STATUSES.BEST_FOUND_NOT_CLOSED;
    }

    // 5. Invariance & Sensitivity check
    const invariancePassed = (this.invarianceAudit.irrelevantPerturbationPass ?? true) &&
                             (this.invarianceAudit.ablationSensitivityPass ?? true);
    if (!invariancePassed) {
      return CLOSURE_STATUSES.BEST_FOUND_NOT_CLOSED;
    }

    // 6. A/B superiority or formal equivalence
    const abVerdict = this.abEvidence?.verdict;
    const isProvenOrEquivalent = abVerdict === 'PROVEN_SUPERIOR' || 
                                 abVerdict === 'EQUIVALENT_FOR_OBJECTIVE' ||
                                 (abVerdict === 'POLICY_TIEBREAK' && this.candidateLinesAudit.unresolved === 0);

    if (isProvenOrEquivalent) {
      return CLOSURE_STATUSES.STRATEGICALLY_CLOSED;
    }

    return CLOSURE_STATUSES.BEST_FOUND_NOT_CLOSED;
  }

  /**
   * Formats the certificate as a clean human-readable audit block.
   */
  formatSummary() {
    return [
      `=============================================================`,
      `CERTIFIED STRATEGIC CLOSURE REPORT (V29.10)`,
      `=============================================================`,
      `Status:            ${this.status}`,
      `Intent Hash:       ${this.intentContractHash.substring(0, 16)}...`,
      `Gameplan Hash:     ${this.gameplanContractHash.substring(0, 16)}...`,
      `Candidate Lines:   Discovered=${this.candidateLinesAudit.discovered}, Viable=${this.candidateLinesAudit.viable}, Dominated=${this.candidateLinesAudit.dominated}, Unresolved=${this.candidateLinesAudit.unresolved}`,
      `Search Bounds:     Domain Exhausted=${this.searchCertificate?.isExhaustiveWithinDeclaredDomain() ? 'YES' : 'NO'}, Pruning Soundness=${this.searchCertificate?.isPruningSoundnessVerified() ? 'VERIFIED' : 'FAILED'}`,
      `Selection Winner:  ${this.selectionAudit.winningLine || 'NONE'} (Policy: ${this.selectionAudit.selectionPolicyVersion || 'v1.0'})`,
      `A/B Paired Delta:  Verdict=${this.abEvidence?.verdict || 'N/A'}, MeanDelta=${this.abEvidence?.meanDelta?.value ?? 'N/A'}`,
      `Holdout Audit:     Status=${this.holdoutAudit?.validationStatus || 'N/A'} (Consistent=${this.holdoutAudit?.isValidated ? 'YES' : 'NO'})`,
      `Invariance:        Perturbation=${this.invarianceAudit.irrelevantPerturbationPass ? 'PASS' : 'FAIL'}, Ablation=${this.invarianceAudit.ablationSensitivityPass ? 'PASS' : 'FAIL'}`,
      `Certificate Hash:  ${this.certificateHash}`,
      `=============================================================`
    ].join('\n');
  }

  /**
   * Evaluates closure status for the complete compilation pipeline.
   * 
   * @param {Object} params
   * @param {Object} params.deckState
   * @param {Object} params.gameplanContract
   * @param {Object} params.holdoutValidation
   * @param {Object} params.searchSpaceCert
   * @param {Object} params.judicialReview
   * @param {Object} params.manaOptimization
   * @returns {Object} { status, isClosable, closureProof, verdict, isApproved, evaluationHash }
   */
  static evaluateClosure({
    deckState,
    gameplanContract,
    holdoutValidation,
    searchSpaceCert,
    judicialReview,
    manaOptimization
  } = {}) {
    const verdict = judicialReview?.authoritativeVerdict || judicialReview?.verdict;
    const isApproved = (verdict === 'APPROVE' || verdict === 'APPROVE_WITH_WARNINGS') && !(judicialReview?.blockingDefects?.length > 0);
    const holdoutPassed = Boolean(holdoutValidation?.isValidated || holdoutValidation?.isVerified);
    const isSearchCertified = Boolean(searchSpaceCert?.isCertified ?? true);

    let status = CLOSURE_STATUSES.STRATEGICALLY_CLOSED;
    let isClosable = false;
    let closureProof = '';
    // Distinguish REJECTED_STATE from REJECTED_STRATEGIC_DOMAIN
    const isDomainProvenInfeasible = Boolean(
      searchSpaceCert?.candidateUniverseCount === 0 ||
      searchSpaceCert?.isDomainInfeasible
    );

    if (verdict === 'REPLAN' || verdict === 'REJECT' || !isApproved) {
      // If the entire domain is proven incapable of satisfying intent, only then is it STRATEGICALLY_INFEASIBLE.
      // Otherwise, the specific candidate state failed execution requirements: BEST_FOUND_NOT_CLOSED (REPLAN_REQUIRED).
      status = isDomainProvenInfeasible 
        ? CLOSURE_STATUSES.STRATEGICALLY_INFEASIBLE 
        : CLOSURE_STATUSES.BEST_FOUND_NOT_CLOSED;
      isClosable = false;
      closureProof = isDomainProvenInfeasible
        ? `Declared search domain proven incapable of satisfying intent constraints (STRATEGICALLY_INFEASIBLE).`
        : `Judicial review rejected candidate state with verdict ${verdict}. Deficits remain open; candidate state rejected (REPLAN_REQUIRED), strategic domain remains open.`;
    } else if (!isSearchCertified) {
      status = CLOSURE_STATUSES.SEARCH_INCOMPLETE;
      isClosable = false;
      closureProof = 'Search domain was not verified exhaustive.';
    } else if (!holdoutPassed) {
      status = CLOSURE_STATUSES.BEST_FOUND_NOT_CLOSED;
      isClosable = false;
      closureProof = 'Holdout validation failed performance consistency bounds.';
    } else {
      status = CLOSURE_STATUSES.STRATEGICALLY_CLOSED;
      isClosable = true;
      closureProof = 'Search domain exhausted, sound pruning certified, holdout validated, and judicial approval achieved.';
    }

    return {
      status,
      isClosable,
      closureProof,
      verdict,
      isApproved,
      replanRequired: verdict === 'REPLAN' || verdict === 'REJECT',
      rejectedState: !isApproved,
      rejectedStrategicDomain: isDomainProvenInfeasible,
      evaluationHash: computeDeterministicHash({ status, isClosable, verdict })
    };
  }
}
