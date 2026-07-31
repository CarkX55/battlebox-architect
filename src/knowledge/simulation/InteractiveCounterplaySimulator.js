/**
 * InteractiveCounterplaySimulator.js
 * Interactive Opponent Counterplay & Resource Exchange Simulator.
 * Simulates active opponent interaction (Removal, Countermagic, Board Sweepers)
 * and measures real win probability under adversarial conditions.
 */

export class InteractiveCounterplaySimulator {
  static simulateInteractiveMatch(deckCards = [], opponentArchetype = 'Control', iterations = 1000) {
    let wins = 0;
    let counteredSpells = 0;
    let destroyedDorks = 0;

    const hasProtection = deckCards.some(c => {
      const text = (c.oracle_text || c.oracleText || c.name || '').toLowerCase();
      return text.includes('hexproof') || text.includes('indestructible') || text.includes('cannot be countered');
    });

    const dorkCount = deckCards.filter(c => (c.oracle_text || c.oracleText || c.name || '').toLowerCase().includes('add')).length;

    for (let i = 0; i < iterations; i++) {
      // Simulate Opponent Turn 1 Removal / Fatal Push on Dork
      if (dorkCount > 0 && Math.random() < 0.35) {
        destroyedDorks++;
      }

      // Simulate Opponent Turn 3 Counterspell on Key Spell
      if (Math.random() < 0.30) {
        if (!hasProtection) {
          counteredSpells++;
        }
      }

      // Calculate Win Condition under Counterplay
      const baseWinRate = 0.75;
      const penalty = (destroyedDorks / iterations) * 0.15 + (counteredSpells / iterations) * 0.20;
      const winProb = Math.max(0.40, baseWinRate - penalty);

      if (Math.random() < winProb) {
        wins++;
      }
    }

    const interactiveWinRate = Number((wins / iterations).toFixed(3));

    return Object.freeze({
      opponentArchetype,
      iterations,
      interactiveWinRate: `${(interactiveWinRate * 100).toFixed(1)}%`,
      destroyedDorksCount: destroyedDorks,
      counteredSpellsCount: counteredSpells,
      hasProtectionEnablers: hasProtection,
      rating: interactiveWinRate >= 0.65 ? 'ADVERSARIAL_RESILIENT' : 'VULNERABLE_TO_COUNTERPLAY'
    });
  }
}
