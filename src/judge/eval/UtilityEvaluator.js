/**
 * UtilityEvaluator.js
 * Pure external service evaluating card and action utility on demand.
 * Exports an explicable UtilityEvaluation breakdown.
 */

export class UtilityEvaluator {
  static evaluate(card, state, scenario, objective) {
    const contributors = {};

    let score = 50; // Base score

    // Mana Efficiency
    const cmc = card.cmc ?? card.mana_value ?? 0;
    if (cmc <= 2) {
      contributors.ManaEfficiency = +20;
      score += 20;
    } else if (cmc >= 5) {
      contributors.ManaEfficiency = -15;
      score -= 15;
    }

    // Interaction & Removal
    const oracle = (card.oracle_text || card.text || '').toLowerCase();
    if (oracle.includes('destroy') || oracle.includes('exile')) {
      contributors.Interaction = +25;
      score += 25;
    }

    // Mana Acceleration
    if (oracle.includes('add ') || (card.type_line || '').toLowerCase().includes('land')) {
      contributors.ResourceGain = +30;
      score += 30;
    }

    // Card Draw
    if (oracle.includes('draw ')) {
      contributors.CardAdvantage = +25;
      score += 25;
    }

    const evaluation = Object.freeze({
      score: Math.max(0, Math.min(100, score)),
      contributors: Object.freeze(contributors)
    });

    return evaluation;
  }
}
