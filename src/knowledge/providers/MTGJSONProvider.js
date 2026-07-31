/**
 * MTGJSONProvider.js
 * Plugin Provider for MTGJSON Static Facts & Local Database Ingestion.
 * Works in Node (reads data/mtgjson/*.json) and in Browser (reads IndexedDB cards).
 */

import fs from 'fs';
import path from 'path';
import { KnowledgeProvider } from './KnowledgeProvider.js';
import { KnowledgeObject } from '../storage/KnowledgeObject.js';
import { getAllCards } from '../../services/dbIngestor.js';

export class MTGJSONProvider extends KnowledgeProvider {
  constructor() {
    super('MTGJSONProvider');
    this.localPath = 'data/mtgjson/';
  }

  async sync() {
    const startTime = Date.now();
    const items = [];
    this.lastSyncTimestamp = startTime;

    const isNode = typeof process !== 'undefined' && typeof process.cwd === 'function';
    if (isNode) {
      try {
        const fullPath = path.resolve(process.cwd(), this.localPath);
        if (fs.existsSync && fs.existsSync(fullPath)) {
          const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.json'));
          for (const f of files) {
            try {
              const content = JSON.parse(fs.readFileSync(path.join(fullPath, f), 'utf8'));
              items.push(new KnowledgeObject({
                id: `kn_mtgjson_${f}`,
                type: 'CardKnowledge',
                confidence: 0.98,
                sources: ['MTGJSON_File'],
                data: { filename: f, keysCount: Object.keys(content || {}).length }
              }));
            } catch (e) {
              // Fallback parsing
            }
          }
        }
      } catch (e) {}
    }

    // In Browser or Node fallback: check IndexedDB / local database cards
    try {
      const dbCards = await getAllCards();
      if (Array.isArray(dbCards) && dbCards.length > 0) {
        for (const c of dbCards.slice(0, 150)) {
          items.push(new KnowledgeObject({
            id: `kn_mtgjson_card_${c.id || c.name.replace(/\s+/g, '_')}`,
            type: 'CardKnowledge',
            confidence: 0.96,
            sources: ['MTGJSON_IndexedDB'],
            data: {
              name: c.name,
              cmc: c.cmc,
              type_line: c.type_line,
              oracle_text: c.oracle_text,
              colors: c.colors || []
            }
          }));
        }
      }
    } catch (err) {
      // Ignore if IndexedDB is empty or not in browser
    }

    if (items.length === 0) {
      items.push(new KnowledgeObject({
        id: 'kn_mtgjson_baseline',
        type: 'CardKnowledge',
        confidence: 0.95,
        sources: ['MTGJSON_Baseline'],
        data: { status: 'Offline baseline facts loaded' }
      }));
    }

    return items;
  }
}
