/**
 * HypothesisSet.js - Version 1
 * Diagnostic Container Emitted by MetaEvaluator containing Scored Hypotheses.
 */

export class HypothesisSet {
  static VERSION = 1;

  constructor({ hypotheses = [], metadata = {} } = {}) {
    this.version = HypothesisSet.VERSION;
    this.hypotheses = Object.freeze([...hypotheses]);
    this.metadata = Object.freeze({ ...metadata });
    Object.freeze(this);
  }
}
