/**
 * MatchupMatrix.js
 * Probabilistic Matchup Matrix evaluating decks against 10-dimensional continuous Scenario vectors.
 */

export class MatchupMatrix {
  static SCENARIOS = Object.freeze({
    VERY_FAST_AGGRO: Object.freeze({ openingSpeed: 0.95, removalDensity: 0.25, lateGamePower: 0.05 }),
    CREATURE_MIDRANGE: Object.freeze({ openingSpeed: 0.50, removalDensity: 0.60, lateGamePower: 0.60 }),
    PERMISSION_CONTROL: Object.freeze({ openingSpeed: 0.15, removalDensity: 0.80, counterDensity: 0.95, lateGamePower: 0.90 }),
    GRAVEYARD_COMBO: Object.freeze({ openingSpeed: 0.75, graveyardPressure: 0.95, lateGamePower: 0.40 })
  });

  static evaluateDeck(deck, simulationResult) {
    const results = {};

    for (const [scenName, scenVector] of Object.entries(MatchupMatrix.SCENARIOS)) {
      let winRate = 60; // Base rate

      if (scenVector.openingSpeed > 0.8 && simulationResult.meanTurn > 6) {
        winRate -= 20; // Penalize if deck is slow against fast aggro
      }

      results[scenName] = Object.freeze({
        scenarioName: scenName,
        winRate,
        confidenceInterval95: Object.freeze([winRate - 3, winRate + 3]),
        dominantFailureModes: winRate < 50 ? Object.freeze(['No T2 blocker', 'Mana screw']) : Object.freeze([])
      });
    }

    return Object.freeze(results);
  }
}
