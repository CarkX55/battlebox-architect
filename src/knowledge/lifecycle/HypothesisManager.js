/**
 * HypothesisManager.js
 * Strict Async Hypothesis Isolation & Validation Gate.
 * Prevents simulation noise pollution by requiring confidence >= 0.95 before publishing into Knowledge Bundles.
 */

export class Hypothesis {
  constructor({ id, observation, source, confidence, evidence = [] }) {
    this.id = id || `hyp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.observation = observation;
    this.source = source;
    this.confidence = confidence;
    this.evidence = Object.freeze([...evidence]);
    this.status = 'PENDING'; // PENDING | VALIDATED | REJECTED
    Object.freeze(this);
  }
}

export class HypothesisManager {
  constructor() {
    this.pendingHypotheses = new Map();
    this.validatedKnowledge = new Map();
  }

  submitObservation(observation, source, initialConfidence, evidence = []) {
    const hypothesis = new Hypothesis({
      observation,
      source,
      confidence: initialConfidence,
      evidence
    });

    this.pendingHypotheses.set(hypothesis.id, hypothesis);
    return hypothesis;
  }

  evaluateValidationGate(hypothesisId, evidenceWeight) {
    const hyp = this.pendingHypotheses.get(hypothesisId);
    if (!hyp) return null;

    const adjustedConfidence = Math.min(1.0, hyp.confidence * (1 + evidenceWeight * 0.05));

    if (adjustedConfidence >= 0.95) {
      const validated = {
        ...hyp,
        confidence: Number(adjustedConfidence.toFixed(3)),
        status: 'VALIDATED',
        validatedAt: new Date().toISOString()
      };
      this.pendingHypotheses.delete(hypothesisId);
      this.validatedKnowledge.set(hypothesisId, Object.freeze(validated));
      return validated;
    }

    return { ...hyp, confidence: adjustedConfidence, status: 'REJECTED' };
  }
}
