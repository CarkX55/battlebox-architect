/**
 * ScryfallProvider.js
 * Plugin Provider for Scryfall Primary Capabilities & Oracle text.
 * Performs live HTTP fetch to Scryfall API in browser or Node environment.
 */

import { KnowledgeProvider } from './KnowledgeProvider.js';
import { KnowledgeObject } from '../storage/KnowledgeObject.js';
import { ConfigManager } from '../../../config/ConfigManager.js';

export class ScryfallProvider extends KnowledgeProvider {
  constructor() {
    super('ScryfallProvider');
    const config = ConfigManager.getInstance();
    this.baseUrl = config.scryfallBase || 'https://api.scryfall.com';
  }

  async sync() {
    this.lastSyncTimestamp = Date.now();
    const items = [];

    try {
      // Fetch live Standard card data from Scryfall HTTP API
      const res = await fetch(`${this.baseUrl}/cards/search?q=format%3Astandard+order%3Areleased`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          for (const card of json.data.slice(0, 100)) {
            items.push(new KnowledgeObject({
              id: `kn_scryfall_${card.id || card.name.replace(/\s+/g, '_')}`,
              type: 'CardKnowledge',
              confidence: 0.96,
              sources: ['Scryfall_API'],
              data: {
                name: card.name,
                manaCost: card.mana_cost,
                cmc: card.cmc,
                typeLine: card.type_line,
                oracleText: card.oracle_text,
                colors: card.colors || [],
                keywords: card.keywords || [],
                scryfallUri: card.scryfall_uri
              }
            }));
          }
        }
      }
    } catch (err) {
      console.warn('[ScryfallProvider] Live HTTP fetch failed, using capability fallback:', err.message);
    }

    if (items.length === 0) {
      items.push(
        new KnowledgeObject({
          id: 'kn_scryfall_mana_acceleration',
          type: 'CapabilityKnowledge',
          confidence: 0.95,
          sources: ['Scryfall'],
          data: { capability: 'ManaAcceleration', oracleTags: ['ramp', 'mana-vault'] }
        }),
        new KnowledgeObject({
          id: 'kn_scryfall_board_reset',
          type: 'CapabilityKnowledge',
          confidence: 0.92,
          sources: ['Scryfall'],
          data: { capability: 'BoardReset', oracleTags: ['sweeper', 'board-wipe'] }
        })
      );
    }

    return items;
  }
}
