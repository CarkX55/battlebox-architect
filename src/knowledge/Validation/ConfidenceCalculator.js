/**
 * ConfidenceCalculator.js
 * Dynamic Confidence Calculator derived from physical, competitive, empirical, and expert evidence.
 */

export class ConfidenceCalculator {
  static calculate(evidenceList = []) {
    if (!evidenceList || evidenceList.length === 0) return 0.50;

    let totalScore = 0;
    for (const ev of evidenceList) {
      const weight = ev.source === 'ExpertRule' ? 0.35 :
                     ev.source === 'MTGTop8' ? 0.30 :
                     ev.source === 'Simulation' ? 0.25 : 0.10;
      totalScore += (ev.confidence || 0.8) * weight;
    }

    return Math.max(0.10, Math.min(0.99, Number(totalScore.toFixed(2))));
  }
}
