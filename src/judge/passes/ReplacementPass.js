/**
 * ReplacementPass.js - Pass 3
 * Reads: ExecutionContracts, CandidatePool
 * Writes: Deck
 * Contract: CompilerState -> ReplacementPass -> CompilerState'
 */

import { ReplacementEngine } from '../candidates/ReplacementEngine.js';

export class ReplacementPass {
  static READS = Object.freeze(['executionContracts', 'metadata']);
  static WRITES = Object.freeze(['deck']);

  static execute(state, cleanPool = [], derivedProfiles = []) {
    const assembledDeck = [];
    let totalSpellsCount = 0;

    for (const contract of state.executionContracts) {
      const candidates = derivedProfiles.map(d => {
        const found = cleanPool.find(c => (c.id && c.id === d.profile.cardId) || (c.name && c.name === d.profile.cardName));
        const rawCard = found ? { ...found } : { name: d.profile.cardName || 'SpellCard', cmc: d.profile.manaValue || 2, type_line: 'Sorcery' };
        return { cardId: d.profile.cardId, profile: d.profile, vector: d.vector, rawCard };
      });

      const ranked = ReplacementEngine.rankCandidates(candidates, contract);
      const targetQuota = contract.idealCount || 4;
      let filledForContract = 0;

      for (const item of ranked) {
        if (filledForContract >= targetQuota || totalSpellsCount >= 36) break;
        const card = item.rawCard;
        const existingInDeck = assembledDeck.filter(c => c.name.toLowerCase() === card.name.toLowerCase()).reduce((s, c) => s + (c.quantity || 1), 0);
        const allowed = Math.min(targetQuota - filledForContract, 4 - existingInDeck, 36 - totalSpellsCount);

        if (allowed > 0) {
          assembledDeck.push({
            ...card,
            quantity: allowed,
            contractId: contract.id,
            evaluation: { contextScore: item.contextScore, confidence: item.confidence, breakdown: item.breakdown }
          });
          filledForContract += allowed;
          totalSpellsCount += allowed;
        }
      }
    }

    const landQuota = 60 - totalSpellsCount;
    assembledDeck.push({ name: 'Forest', type_line: 'Basic Land — Forest', cmc: 0, quantity: Math.ceil(landQuota / 2) });
    assembledDeck.push({ name: 'Plains', type_line: 'Basic Land — Plains', cmc: 0, quantity: Math.floor(landQuota / 2) });

    return state.transition({ deck: assembledDeck });
  }
}
