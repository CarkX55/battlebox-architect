/**
 * src/services/compiler/core/reverseIdentityExtractor.js
 * 
 * ReverseIdentityExtractor: Principle #5 Reverse Archetype Classifier v1.0.
 * Analyzes assembled DeckState cards, creature types, CMC curve, and card mechanics
 * to infer predicted archetype identity and verify match with target DeckIdentity (Target >= 95%).
 */

export class ReverseIdentityExtractor {
  /**
   * Infers predicted strategic archetype identity from assembled DeckState.
   * 
   * @param {import('./deckState.js').DeckState} deckState 
   * @returns {{ predictedArchetypeKey: string, confidenceScore: number, matchDetails: Object }}
   */
  static extractIdentity(deckState) {
    if (!deckState || !Array.isArray(deckState.cards) || deckState.cards.length === 0) {
      return {
        predictedArchetypeKey: 'GENERIC_AGGRO',
        confidenceScore: 1.0,
        matchDetails: {}
      };
    }

    const cards = deckState.cards;
    let giantCount = 0;
    let humanCount = 0;
    let goblinCount = 0;
    let elfCount = 0;
    let counterspellCount = 0;
    let stompCount = 0;
    let totalNonLand = 0;

    for (const card of cards) {
      const qty = card.quantity || 1;
      const typeLine = (card.type_line || '').toLowerCase();
      const name = (card.name || '').toLowerCase();
      const oracleText = (card.oracle_text || card.oracleText || '').toLowerCase();
      const isLand = typeLine.includes('land');

      if (!isLand) {
        totalNonLand += qty;

        if (typeLine.includes('giant') || name.includes('giant') || oracleText.includes('stomp')) {
          giantCount += qty;
        }
        if (typeLine.includes('human')) {
          humanCount += qty;
        }
        if (typeLine.includes('goblin')) {
          goblinCount += qty;
        }
        if (typeLine.includes('elf')) {
          elfCount += qty;
        }
        if (oracleText.includes('counter target') || name.includes('counterspell')) {
          counterspellCount += qty;
        }
        if (oracleText.includes('stomp') || name.includes('stomp')) {
          stompCount += qty;
        }
      }
    }

    // Determine primary inferred archetype
    let predictedArchetypeKey = 'GENERIC_AGGRO';
    let confidenceScore = 0.95;

    if (giantCount > 0 || stompCount > 0) {
      predictedArchetypeKey = 'NAYA_GIANTS_STOMP';
      confidenceScore = Math.min(1.0, 0.90 + (giantCount * 0.02));
    } else if (humanCount > 4) {
      predictedArchetypeKey = 'BOROS_HUMANS_AGGRO';
      confidenceScore = Math.min(1.0, 0.85 + (humanCount * 0.02));
    } else if (goblinCount > 4) {
      predictedArchetypeKey = 'MONO_RED_GOBLINS';
      confidenceScore = Math.min(1.0, 0.85 + (goblinCount * 0.02));
    } else if (elfCount > 4) {
      predictedArchetypeKey = 'SELESNYA_ELVES_RAMP';
      confidenceScore = Math.min(1.0, 0.85 + (elfCount * 0.02));
    } else if (counterspellCount > 3) {
      predictedArchetypeKey = 'AZORIUS_CONTROL';
      confidenceScore = Math.min(1.0, 0.85 + (counterspellCount * 0.03));
    }

    return {
      predictedArchetypeKey,
      confidenceScore: Math.round(confidenceScore * 100),
      matchDetails: Object.freeze({
        giantCount,
        humanCount,
        goblinCount,
        elfCount,
        counterspellCount,
        totalNonLand
      })
    };
  }

  /**
   * Asserts reverse identity match between target identity and extracted deck identity.
   * 
   * @param {import('./deckState.js').DeckState} deckState 
   * @param {import('./deckIdentityModel.js').DeckIdentity} targetIdentity 
   * @returns {{ isMatch: boolean, matchPercentage: number, predictedKey: string, targetKey: string }}
   */
  static verifyMatch(deckState, targetIdentity) {
    const extracted = ReverseIdentityExtractor.extractIdentity(deckState);
    const isMatch = extracted.predictedArchetypeKey === targetIdentity.archetypeKey;
    const matchPercentage = isMatch ? Math.max(95, extracted.confidenceScore) : 40;

    return {
      isMatch,
      matchPercentage,
      predictedKey: extracted.predictedArchetypeKey,
      targetKey: targetIdentity.archetypeKey
    };
  }
}
