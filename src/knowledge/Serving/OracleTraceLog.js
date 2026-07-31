/**
 * OracleTraceLog.js
 * Bitácora del Oráculo - Complete Compiler Audit & Traceability Log Engine.
 * Records step-by-step end-to-end execution of deck compilation from scratch:
 * Intent -> Capability -> Strategy IR -> DeckContract -> Slot Reservation -> Candidate Admission -> 12-D Ranking -> Binding -> DeckJudge -> Monte Carlo -> CompilationProof.
 */

export class OracleTraceStep {
  constructor({ stepIndex, timestamp, category, component, action, details = {}, payload = null }) {
    this.stepIndex = stepIndex;
    this.timestamp = timestamp || new Date().toISOString();
    this.category = category; // INTENT | CAPABILITY | IR_BUILDER | SLOT_RESERVATION | CANDIDATE_ADMISSION | RANKING_BINDING | JUDGE_VERIFICATION | MONTE_CARLO | PROOF
    this.component = component;
    this.action = action;
    this.details = Object.freeze({ ...details });
    this.payload = payload ? Object.freeze({ ...payload }) : null;
    Object.freeze(this);
  }
}

export class OracleTraceLogEngine {
  constructor() {
    this.steps = [];
    this.deckName = '';
    this.startTime = new Date().toISOString();
  }

  reset(deckName = 'Mazo Forjado') {
    this.steps = [];
    this.deckName = deckName;
    this.startTime = new Date().toISOString();
  }

  logStep({ category, component, action, details = {}, payload = null }) {
    const step = new OracleTraceStep({
      stepIndex: this.steps.length + 1,
      timestamp: new Date().toISOString(),
      category,
      component,
      action,
      details,
      payload
    });
    this.steps.push(step);
    return step;
  }

  getTraceSummary() {
    const categoriesCount = {};
    for (const s of this.steps) {
      categoriesCount[s.category] = (categoriesCount[s.category] || 0) + 1;
    }
    return {
      deckName: this.deckName,
      totalSteps: this.steps.length,
      startTime: this.startTime,
      categoriesCount
    };
  }

  exportTraceJSON() {
    return JSON.stringify({
      summary: this.getTraceSummary(),
      steps: this.steps
    }, null, 2);
  }
}

// Global Singleton Instance
export const OracleTraceLog = new OracleTraceLogEngine();
