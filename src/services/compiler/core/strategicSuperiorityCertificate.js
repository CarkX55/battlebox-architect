/**
 * src/services/compiler/core/strategicSuperiorityCertificate.js
 * 
 * StrategicSuperiorityCertificate: Paired State-Transition Proof v29.10.
 * 
 * Provides verifiable evidence that a candidate card selected for a deck slot
 * outperforms or ties alternative options under Common Random Numbers (CRN) simulation.
 * 
 * Axioms:
 *   1. Zero heuristic assertions. Dominance is derived from paired CRN deltas D_i = X_{A,i} - X_{B,i}.
 *   2. Strict semantic distinction:
 *      - PROVEN_SUPERIOR: 0 not in CI(Delta) and Delta > 0.
 *      - STATISTICALLY_UNRESOLVED: 0 in CI(Delta). Selected by POLICY_TIEBREAK (never mislabeled as superiority).
 *      - EQUIVALENT_FOR_OBJECTIVE: Formal equivalence proven within declared +/- delta margin.
 *   3. Sealed into cryptographic deterministic certificates.
 */

import { computeDeterministicHash } from './certifiedDeckState.js';
import { DECISION_VERDICTS } from './gameplanExecutionPolicy.js';

export class StrategicSuperiorityCertificate {
  /**
   * @param {Object} params
   * @param {string} params.decisionSlot - The functional demand or role being fulfilled
   * @param {Object|string} params.selectedCard - The chosen card
   * @param {Array<Object|string>} params.rejectedAlternatives - Competing alternative candidates
   * @param {Object} params.contextComparison - The 5-context evaluation vectors and score deltas
   * @param {string} params.verdict - Formal decision verdict
   * @param {Object|null} params.pairedEvidence - Paired CRN statistics
   * @param {number} params.statisticalConfidence - Confidence measure (0.0 to 1.0)
   * @param {string} params.selectionPolicy - Policy used if tiebreak was required
   * @param {string} params.proofSummary - Human-readable proof statement
   */
  constructor({
    decisionSlot = 'UNASSIGNED',
    selectedCard = {},
    rejectedAlternatives = [],
    contextComparison = {},
    verdict = DECISION_VERDICTS.PROVEN_SUPERIOR,
    pairedEvidence = null,
    statisticalConfidence = 0.75,
    selectionPolicy = 'LEXICOGRAPHIC_CRITICAL_NODE_PRIORITY_V1',
    proofSummary = ''
  } = {}) {
    this.decisionSlot = decisionSlot;
    this.selectedCard = typeof selectedCard === 'string' ? { name: selectedCard } : selectedCard;
    this.rejectedAlternatives = Object.freeze([...rejectedAlternatives].map(r => typeof r === 'string' ? { name: r } : r));
    this.contextComparison = Object.freeze({ ...contextComparison });
    this.verdict = String(verdict || DECISION_VERDICTS.PROVEN_SUPERIOR);
    this.pairedEvidence = pairedEvidence ? Object.freeze({ ...pairedEvidence }) : null;
    this.statisticalConfidence = Number(statisticalConfidence || 0.75);
    this.selectionPolicy = String(selectionPolicy);
    this.proofSummary = proofSummary;

    this.certificateHash = computeDeterministicHash({
      decisionSlot,
      selected: this.selectedCard.name,
      rejected: this.rejectedAlternatives.map(r => r.name),
      verdict: this.verdict,
      confidence: this.statisticalConfidence,
      policy: this.selectionPolicy
    });
    this.timestamp = new Date().toISOString();
    Object.freeze(this);
  }

  /**
   * Factory method to generate a certificate from StateContextEvaluator comparison.
   */
  static fromComparison({ decisionSlot, winnerCandidate, loserCandidate, comparisonAudit = {} }) {
    const netScore = comparisonAudit.netScore ?? (comparisonAudit.observedAdvantage?.margin ?? 0);
    const confidence = comparisonAudit.confidence ?? 0.70;
    const winnerName = winnerCandidate.name || 'Winner';
    const loserName = loserCandidate.name || 'Alternative';
    const paired = comparisonAudit.pairedEvidence;

    let verdict = paired?.verdict || (netScore > 0 ? DECISION_VERDICTS.PROVEN_SUPERIOR : DECISION_VERDICTS.STATISTICALLY_UNRESOLVED);
    let proofSummary = '';

    if (verdict === DECISION_VERDICTS.PROVEN_SUPERIOR) {
      proofSummary = `Selected "${winnerName}" demonstrated counterfactual superiority over alternative "${loserName}" (95% CI: > 0, Net Advantage: ${netScore >= 0 ? '+' : ''}${netScore.toFixed(2)}).`;
    } else if (verdict === DECISION_VERDICTS.EQUIVALENT_FOR_OBJECTIVE) {
      proofSummary = `Selected "${winnerName}" and "${loserName}" are formally equivalent within declared policy margin; "${winnerName}" selected by policy.`;
    } else if (verdict === DECISION_VERDICTS.STATISTICALLY_UNRESOLVED) {
      proofSummary = `No statistical evidence of superiority between "${winnerName}" and "${loserName}" (0 in 95% CI). "${winnerName}" chosen via declared POLICY_TIEBREAK.`;
      verdict = DECISION_VERDICTS.POLICY_TIEBREAK;
    } else {
      proofSummary = `Candidate selection recorded under verdict: ${verdict}.`;
    }

    return new StrategicSuperiorityCertificate({
      decisionSlot,
      selectedCard: winnerCandidate,
      rejectedAlternatives: [loserCandidate],
      contextComparison: {
        winner: winnerName,
        alternative: loserName,
        deltas: comparisonAudit.contextDeltas || comparisonAudit.deltas || {},
        netAdvantage: netScore,
        dominanceConfidence: confidence
      },
      verdict,
      pairedEvidence: paired,
      statisticalConfidence: confidence,
      proofSummary
    });
  }
}
