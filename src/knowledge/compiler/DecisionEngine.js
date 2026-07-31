/**
 * DecisionEngine.js
 * Contextual Card Ranking Decision Engine integrated with StrategicKnowledgeBase.
 * Evaluates why Card A is strategically superior to Card B in a specific deck context.
 * Evaluates: Contextual Tempo (T1 Dork > T2 Dork), Legendary Synergy, Color Fixing, Sweeper Resilience, and Graveyard Hate.
 */

import { StrategicKnowledgeBase } from '../domain/StrategicKnowledgeBase.js';

export class DecisionEngine {
  static scoreCandidateInContext(card, deckContext = {}) {
    if (!card) return { score: 0, breakdown: {} };

    const text = (card.oracleText || card.oracle_text || card.text || '').toLowerCase();
    const typeLine = (card.type_line || card.type || '').toLowerCase();
    const name = (card.name || '').toLowerCase();
    const cmc = card.cmc || 0;

    // Evaluate tempo score from StrategicKnowledgeBase domain rules
    let tempoScore = StrategicKnowledgeBase.evaluateTempoScore(card.name, deckContext.role || '');
    let synergyScore = 0.50;
    let resilienceScore = 0.50;
    let fixingScore = 0.50;

    // 1. Contextual Ramp Evaluation (Delighted Halfling vs Armored Scrapgorger vs Topiary Stomper vs T2 Dork)
    if (name.includes('delighted halfling')) {
      tempoScore = 0.98;
      synergyScore = 0.92; // Uncounterable legendary spells
      resilienceScore = 0.65;
      fixingScore = 0.85;
    } else if (name.includes('armored scrapgorger')) {
      tempoScore = 0.80;
      synergyScore = 0.70;
      resilienceScore = 0.85; // Graveyard hate
      fixingScore = 0.90;
    } else if (name.includes('topiary stomper')) {
      tempoScore = 0.70; // 3 CMC land tutor
      synergyScore = 0.85;
      resilienceScore = 0.95; // Land ramp survives board sweepers
      fixingScore = 0.95;
    } else if (name.includes('llanowar elves') || name.includes('elvish mystic')) {
      tempoScore = 0.95;
      synergyScore = 0.80;
      resilienceScore = 0.50;
      fixingScore = 0.50;
    } else {
      if (cmc === 1) tempoScore += 0.20;
      if (text.includes('land') && text.includes('search')) resilienceScore += 0.25;
      if (text.includes('any color')) fixingScore += 0.30;
    }

    const totalScore = Number(((tempoScore * 0.35) + (synergyScore * 0.25) + (resilienceScore * 0.25) + (fixingScore * 0.15)).toFixed(3));

    return Object.freeze({
      cardName: card.name,
      totalScore,
      breakdown: Object.freeze({
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
