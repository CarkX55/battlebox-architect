/**
 * ReplacementEngine.js
 * Multi-Objective Candidate Ranking and Competitive Slot Replacement.
 */

export class ReplacementEngine {
  static rankCandidates(candidates, executionContract, contextualCostModel = {}) {
    // candidates: Array<{ cardId, profile, vector, contextScore }>
    const ranked = [...candidates].map(c => {
      let score = c.contextScore || 50;

      // Weight bonuses
      if (c.vector.interfaces.includes(executionContract.capability)) {
        score += 30;
      }

      // Check required traits
      const matchesRequired = executionContract.requiredTraits.every(t => c.vector.traits.includes(t));
      if (!matchesRequired && executionContract.requiredTraits.length > 0) {
        score -= 40;
      }

      // Check forbidden traits
      const hasForbidden = executionContract.forbiddenTraits.some(t => c.vector.traits.includes(t));
      if (hasForbidden) {
        score -= 100;
      }

      return {
        cardId: c.cardId,
        cardName: c.profile.cardName,
        score,
        profile: c.profile,
        vector: c.vector,
        rawCard: c.rawCard || { name: c.profile.cardName || 'Spell', cmc: c.profile.manaValue || 2, type_line: 'Sorcery' },
        contextScore: score,
        confidence: 0.95,
        breakdown: { baseScore: score }
      };
    });

    // Sort descending by score
    ranked.sort((a, b) => b.score - a.score);
    return ranked;
  }

  static selectBestCandidate(candidates, currentCard, executionContract) {
    const ranked = ReplacementEngine.rankCandidates(candidates, executionContract);
    if (ranked.length === 0) return null;

    const best = ranked[0];
    if (!currentCard) return best;

    // Replacement condition: best candidate must score higher than current card
    return best.score > (currentCard.score || 0) ? best : currentCard;
  }
}
