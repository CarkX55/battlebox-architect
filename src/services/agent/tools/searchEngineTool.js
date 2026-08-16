/**
 * SEARCH ENGINE TOOL (v18.0)
 * 
 * Software tool executing DB candidate queries strictly bound by IntentLock.
 * Supports iterative requerying, candidate filtering, and Oracle text formatting.
 */

import { cardIndexDatabase } from '../../compiler/core/cardIndex.js';

export class SearchEngineTool {
  static executeSearch(directedQuery = {}, intentLock) {
    if (!intentLock) {
      throw new Error('SearchEngineToolError: IntentLock is required for search execution');
    }

    const {
      minCmc = 0,
      maxCmc = 16,
      requiredType = null,
      requiredFunction = null,
      excludeTypes = []
    } = directedQuery;

    // Filter card index database strictly bound by IntentLock
    const allCards = cardIndexDatabase.getCards();
    const candidatePool = allCards.filter(card => {
      // 1. Format check (if specified)
      if (intentLock.format && card.legalities && card.legalities[intentLock.format.toLowerCase()] === 'not_legal') {
        return false;
      }

      // 2. Excluded cards check
      if (intentLock.excludedCards.includes(card.name)) {
        return false;
      }

      // 3. CMC bounds check
      const cmc = card.cmc || 0;
      if (cmc < minCmc || cmc > maxCmc) {
        return false;
      }

      // 4. Type line filter
      if (requiredType && !card.type_line.toLowerCase().includes(requiredType.toLowerCase())) {
        return false;
      }

      // 5. Exclude types filter
      for (const exType of excludeTypes) {
        if (card.type_line.toLowerCase().includes(exType.toLowerCase())) {
          return false;
        }
      }

      return true;
    });

    // Return a focused pool of 3 to 5 candidate cards
    return candidatePool.slice(0, 5).map(c => ({
      id: c.id || c.name,
      name: c.name,
      mana_cost: c.mana_cost,
      cmc: c.cmc,
      type_line: c.type_line,
      oracle_text: c.oracle_text || '',
      colors: c.colors || []
    }));
  }
}
