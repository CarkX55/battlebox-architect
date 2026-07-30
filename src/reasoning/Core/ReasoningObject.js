/**
 * ReasoningObject.js - Version 1
 * Base Model for Situational Strategic Inferences in BattleBox Architect v9.0 SRE.
 */

export class ReasoningObject {
  static VERSION = 1;

  constructor({
    inferenceId,
    context = {},
    premises = [],
    tradeOffs = [],
    conclusion = '',
    confidence = 0.85
  } = {}) {
    this.version = ReasoningObject.VERSION;
    this.inferenceId = inferenceId || `inf_${Date.now()}`;
    this.context = Object.freeze({ ...context });
    this.premises = Object.freeze([...premises]);
    this.tradeOffs = Object.freeze([...tradeOffs]);
    this.conclusion = conclusion;
    this.confidence = confidence;

    Object.freeze(this);
  }
}
