/**
 * ConfidenceTrajectoryTracker.js
 * Tracks confidence score evolution over time across bundle revisions (e.g. 0.75 -> 0.82 -> 0.88 -> 0.91).
 */

export class ConfidenceTrajectoryTracker {
  constructor() {
    this.trajectories = new Map();
  }

  recordConfidencePoint(knowledgeObjectId, bundleId, confidenceScore) {
    if (!this.trajectories.has(knowledgeObjectId)) {
      this.trajectories.set(knowledgeObjectId, []);
    }

    const entry = {
      bundleId,
      confidence: confidenceScore,
      recordedAt: new Date().toISOString()
    };

    this.trajectories.get(knowledgeObjectId).push(entry);
    return entry;
  }

  getTrajectory(knowledgeObjectId) {
    const points = this.trajectories.get(knowledgeObjectId) || [];
    if (points.length === 0) return null;

    const initial = points[0].confidence;
    const current = points[points.length - 1].confidence;
    const delta = Number((current - initial).toFixed(3));

    return {
      knowledgeObjectId,
      history: Object.freeze([...points]),
      initialConfidence: initial,
      currentConfidence: current,
      confidenceDelta: delta,
      status: delta >= 0 ? 'GAINING_CONFIDENCE' : 'DECAYING_CONFIDENCE'
    };
  }
}
