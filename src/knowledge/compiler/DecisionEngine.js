/**
 * DecisionEngine.js
 * Contextual Card Ranking Decision Engine integrated with CardRoleIntelligence.
 * Evaluates why Card A is strategically superior to Card B in a specific deck context.
 * Evaluates: Primary Card Role, Criticality (0.0 to 1.0), Plan Support, Tempo, Synergy, Resilience, and Mana Fixing.
 */

import { StrategicKnowledgeBase } from '../domain/StrategicKnowledgeBase.js';
import { CardRoleIntelligence } from '../domain/CardRoleIntelligence.js';

export class DecisionEngine {
  static scoreCandidateInContext(card, deckContext = {}) {
    if (!card) return { score: 0, breakdown: {} };

    const name = card.name || '';
    const cardRole = CardRoleIntelligence.getCardRole(name);
    const criticality = cardRole ? cardRole.criticality : 0.70;

    let tempoScore = StrategicKnowledgeBase.evaluateTempoScore(name, deckContext.role || '');
    let synergyScore = 0.50;
    let resilienceScore = 0.50;
    let fixingScore = 0.50;

    // 1. Contextual Ramp Evaluation (Delighted Halfling vs Armored Scrapgorger vs Topiary Stomper vs T2 Dork)
    const lowerName = name.toLowerCase();
    if (lowerName.includes('delighted halfling')) {
      tempoScore = 0.98;
      synergyScore = 0.92;
      resilienceScore = 0.65;
      fixingScore = 0.85;
    } else if (lowerName.includes('armored scrapgorger')) {
      tempoScore = 0.80;
      synergyScore = 0.70;
      resilienceScore = 0.85;
      fixingScore = 0.90;
    } else if (lowerName.includes('topiary stomper')) {
      tempoScore = 0.70;
      synergyScore = 0.85;
      resilienceScore = 0.95;
      fixingScore = 0.95;
    } else if (lowerName.includes('llanowar elves') || lowerName.includes('elvish mystic')) {
      tempoScore = 0.95;
      synergyScore = 0.80;
      resilienceScore = 0.50;
      fixingScore = 0.50;
    }

    const totalScore = Number(((criticality * 0.30) + (tempoScore * 0.30) + (synergyScore * 0.20) + (resilienceScore * 0.10) + (fixingScore * 0.10)).toFixed(3));

    return Object.freeze({
      cardName: name,
      primaryRole: cardRole ? cardRole.primaryRole : 'General Filler',
      criticality,
      totalScore,
      breakdown: Object.freeze({
        criticalityScore: criticality,
        tempoScore,
        synergyScore,
        resilienceScore,
        fixingScore
      })
    });
  }

  static rankCandidates(candidates = [], deckContext = {}) {
    return candidates
      .map(c => this.scoreCandidateInContext(c, deckContext))
      .sort((a, b) => b.totalScore - a.totalScore);
  }
}
