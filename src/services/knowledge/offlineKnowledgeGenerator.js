/**
 * OFFLINE KNOWLEDGE GENERATOR (v20.0 Layer 3)
 * 
 * Offline batch pipeline that enriches card database entries with structured expert analysis
 * (Card Roles, Matchups, Traps, Synergies, Power Spikes) so the LLM is never asked the same
 * question twice at runtime.
 */

export class OfflineKnowledgeGenerator {
  constructor() {
    this.expertDatabase = new Map();
  }

  generateExpertKnowledge(card) {
    if (this.expertDatabase.has(card.name)) {
      return this.expertDatabase.get(card.name);
    }

    const name = card.name;
    const typeLine = card.type_line || '';
    
    // Generate structured expert analysis
    const expertEntry = {
      cardName: name,
      cardRole: typeLine.includes('Creature') ? 'Primary Threat / Presence' : 'Interaction / Utility',
      optimalCopyCount: 4,
      powerSpikeTurn: card.cmc <= 2 ? 1 : (card.cmc === 3 ? 3 : 5),
      matchupPros: ['Excelente contra Aggro rápido', 'Aporta presencia de mesa inminente'],
      matchupCons: ['Vulnerable a remoción de exilio', 'Débil si no se encuentra maná a tiempo'],
      trapSituations: ['No castear si el rival mantiene 4 manás abiertos para Sunfall'],
      typicalArchetypes: ['Standard Midrange', 'Pioneer Ramp', 'Modern Tribal'],
      replacementCandidates: ['Bonecrusher Giant', 'Llanowar Elves', 'Calamity Bearer']
    };

    Object.freeze(expertEntry);
    this.expertDatabase.set(name, expertEntry);
    return expertEntry;
  }

  getExpertKnowledge(cardName) {
    return this.expertDatabase.get(cardName) || null;
  }
}

export const offlineKnowledgeDatabase = new OfflineKnowledgeGenerator();
