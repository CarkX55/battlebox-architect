/**
 * src/services/compiler/core/evidencePyramid.js
 * 
 * EvidencePyramid: 5-Tier Evidence Source Classifier v1.0.
 * Classifies every output metric into an explicit scientific evidence tier.
 */

export const EvidenceTier = Object.freeze({
  TIER_1: Object.freeze({ level: 1, name: 'TOURNAMENT_RESULTS', stars: '★★★★★', confidence: 'Highest' }),
  TIER_2: Object.freeze({ level: 2, name: 'REAL_MATCH_LOGS', stars: '★★★★☆', confidence: 'High' }),
  TIER_3: Object.freeze({ level: 3, name: 'MONTE_CARLO_SIMULATION', stars: '★★★☆☆', confidence: 'Medium' }),
  TIER_4: Object.freeze({ level: 4, name: 'COMPILER_HEURISTIC', stars: '★★☆☆☆', confidence: 'Moderate' }),
  TIER_5: Object.freeze({ level: 5, name: 'EXPERT_RULE', stars: '★☆☆☆☆', confidence: 'Low' })
});

export class EvidencePyramid {
  /**
   * Classifies metric source into an explicit EvidencePyramid tier.
   * 
   * @param {string} category 
   * @returns {Object}
   */
  static classifyCategory(category = 'SIMULATION') {
    const cUpper = category.toUpperCase();

    if (cUpper.includes('TOURNAMENT') || cUpper.includes('GROUND_TRUTH')) {
      return EvidenceTier.TIER_1;
    }
    if (cUpper.includes('MATCH_LOG') || cUpper.includes('LOGS')) {
      return EvidenceTier.TIER_2;
    }
    if (cUpper.includes('SIMULATION') || cUpper.includes('MONTE_CARLO')) {
      return EvidenceTier.TIER_3;
    }
    if (cUpper.includes('HEURISTIC') || cUpper.includes('SOLVER')) {
      return EvidenceTier.TIER_4;
    }

    return EvidenceTier.TIER_5;
  }
}
