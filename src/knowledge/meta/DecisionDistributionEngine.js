/**
 * DecisionDistributionEngine.js
 * Professional Decision Distribution & Role-vs-Role Equivalency Engine.
 * Models professional consensus not as a flat single choice, but as a probability distribution
 * across top tournament decklists (e.g. 72% Llanowar, 18% Mystic, 8% Halfling, 2% Other).
 * Evaluates role equivalency to prevent penalizing valid card substitutes.
 */

export const PRO_DECISION_DISTRIBUTIONS = Object.freeze({
  'Ramp_Dorks_T1': {
    role: 'Primary Tempo Enabler',
    distribution: [
      { cardName: 'Llanowar Elves', percentage: 72.0 },
      { cardName: 'Elvish Mystic', percentage: 18.0 },
      { cardName: 'Delighted Halfling', percentage: 8.0 },
      { cardName: 'Other Dorks', percentage: 2.0 }
    ]
  },
  'Sweepers_CMC4': {
    role: 'Board Wipe / Sweeper',
    distribution: [
      { cardName: 'Sunfall', percentage: 68.0 },
      { cardName: 'Supreme Verdict', percentage: 22.0 },
      { cardName: 'Depopulate', percentage: 10.0 }
    ]
  }
});

export class DecisionDistributionEngine {
  static evaluateCardRoleDistribution(cardName, role = 'Ramp_Dorks_T1') {
    const distData = PRO_DECISION_DISTRIBUTIONS[role] || PRO_DECISION_DISTRIBUTIONS.Ramp_Dorks_T1;
    const matched = distData.distribution.find(d => d.cardName.toLowerCase().includes((cardName || '').toLowerCase()));
    const distributionPercentage = matched ? matched.percentage : 5.0;

    return Object.freeze({
      cardName,
      role: distData.role,
      distributionPercentage: `${distributionPercentage}%`,
      isWithinProDistribution: distributionPercentage >= 5.0,
      distributionDetails: Object.freeze(distData.distribution)
    });
  }

  static evaluateRoleEquivalency(cardA, cardB) {
    if (!cardA || !cardB) return { isEquivalent: false, score: 0 };
    const typeA = (cardA.type_line || cardA.type || '').toLowerCase();
    const typeB = (cardB.type_line || cardB.type || '').toLowerCase();
    const cmcA = cardA.cmc || 0;
    const cmcB = cardB.cmc || 0;

    const isSameType = typeA === typeB || (typeA.includes('creature') && typeB.includes('creature'));
    const isSameCmc = cmcA === cmcB;

    const isEquivalent = isSameType && isSameCmc;
    return Object.freeze({
      cardA: cardA.name,
      cardB: cardB.name,
      isEquivalent,
      equivalencyScore: isEquivalent ? 0.95 : 0.60,
      rationale: isEquivalent ? 'Both cards share identical functional role and CMC constraints.' : 'Functional role or CMC mismatch.'
    });
  }
}
