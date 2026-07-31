/**
 * ProactiveJudgeCritic.js
 * Proactive DeckJudge Coaching Critique Engine.
 * Replaces flat PASS verdicts with proactive coaching critiques and matchup vulnerability alerts.
 */

export class ProactiveJudgeCritic {
  static generateCoachingCritique(deckState, simResult = {}) {
    const boundCards = deckState.slots.map(s => s.chosenCard).filter(Boolean);

    const dorksCount = boundCards.filter(c => (c.oracle_text || c.oracleText || c.name || '').toLowerCase().includes('add')).length;
    const interactionCount = boundCards.filter(c => {
      const text = (c.oracle_text || c.oracleText || '').toLowerCase();
      return text.includes('destroy') || text.includes('exile') || text.includes('counter');
    }).length;

    const critiques = [];

    if (dorksCount > 8 && interactionCount < 6) {
      critiques.push({
        severity: 'WARNING',
        matchup: 'vs Mono-Red Aggro / Burn',
        critiqueText: 'PASS, pero este mazo probablemente sea demasiado lento e indefenso contra Mono-Red Aggro en los turnos 1 y 2.'
      });
    }

    if (dorksCount > 10) {
      critiques.push({
        severity: 'NOTICE',
        matchup: 'vs Jeskai / Azorius Control',
        critiqueText: 'PASS, pero contra Control con barridos de mesa (Sunfall), el Plan B (Value Grind) pierde tracción si los dorks son eliminados temprano.'
      });
    }

    if (critiques.length === 0) {
      critiques.push({
        severity: 'OPTIMAL',
        matchup: 'All Metagame Targets',
        critiqueText: 'PASS. Construcción altamente resiliente y bien balanceada para todas las ventanas de interacción.'
      });
    }

    return Object.freeze({
      overallStatus: 'PASS_WITH_CRITIQUE',
      critiques: Object.freeze(critiques)
    });
  }
}
