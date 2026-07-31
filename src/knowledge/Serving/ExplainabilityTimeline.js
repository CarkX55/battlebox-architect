/**
 * ExplainabilityTimeline.js
 * Chronological Compilation Explainability Timeline (T0 -> T9).
 * Records exact decision timeline:
 * T0: User Request
 * T1: Strategy Consideration (12 Strategies)
 * T2: Strategic Elimination (Discard 9)
 * T3: Strategy Selection (Devotion Wins)
 * T4: Slot Budget Reservation (60 Slots)
 * T5: Candidate 12-D Ranking
 * T6: IR Repair Loop Verification
 * T7: Modular DeckJudge Evaluation
 * T8: Level 3 Monte Carlo Simulation
 * T9: Strategic Calibration & Final Deck Certification
 */

export class TimelineStep {
  constructor({ stepId, stepName, timestamp, description, metrics }) {
    this.stepId = stepId;
    this.stepName = stepName;
    this.timestamp = timestamp || new Date().toISOString();
    this.description = description;
    this.metrics = Object.freeze({ ...metrics });
    Object.freeze(this);
  }
}

export class ExplainabilityTimelineEngine {
  constructor() {
    this.steps = [];
  }

  reset() {
    this.steps = [];
  }

  addStep(stepId, stepName, description, metrics = {}) {
    const step = new TimelineStep({
      stepId,
      stepName,
      description,
      metrics
    });
    this.steps.push(step);
    return step;
  }

  getTimelineSummary() {
    return Object.freeze({
      totalSteps: this.steps.length,
      steps: Object.freeze([...this.steps])
    });
  }
}

export const ExplainabilityTimeline = new ExplainabilityTimelineEngine();
