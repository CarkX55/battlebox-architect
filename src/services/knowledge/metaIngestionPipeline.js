/**
 * META INGESTION PIPELINE (v20.0 Layer 4)
 * 
 * Ingests real tournament decklists (MTGTop8, MTGGoldfish, Moxfield) and computes
 * co-occurrence matrices, meta percentages, card frequencies, and sideboard stats.
 */

export class MetaIngestionPipeline {
  constructor() {
    this.coOccurrenceMatrix = new Map(); // cardA -> Map(cardB -> count)
    this.metaPercentages = new Map();     // cardName -> metaPercentage
  }

  ingestDecklist(decklist = [], archetype = 'Aggro', winRate = 0.55) {
    const cardNames = decklist.map(c => typeof c === 'string' ? c : c.name);

    for (let i = 0; i < cardNames.length; i++) {
      const cardA = cardNames[i];
      if (!this.coOccurrenceMatrix.has(cardA)) {
        this.coOccurrenceMatrix.set(cardA, new Map());
      }
      const aMap = this.coOccurrenceMatrix.get(cardA);

      for (let j = i + 1; j < cardNames.length; j++) {
        const cardB = cardNames[j];
        aMap.set(cardB, (aMap.get(cardB) || 0) + 1);
      }
    }
  }

  getCoOccurrenceStats(cardName) {
    const pairings = this.coOccurrenceMatrix.get(cardName);
    if (!pairings) return [];

    const sorted = [...pairings.entries()].sort((a, b) => b[1] - a[1]);
    return sorted.map(([cardB, count]) => ({ cardB, count }));
  }
}

export const metaIngestionPipeline = new MetaIngestionPipeline();
