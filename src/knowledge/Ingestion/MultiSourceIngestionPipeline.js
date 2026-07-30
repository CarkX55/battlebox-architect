/**
 * MultiSourceIngestionPipeline.js
 * Ingestion Pipeline from Scryfall, MTGJSON, MTGTop8, EDHREC and Simulations into SKE.
 */

import { KnowledgeObject } from '../Core/KnowledgeObject.js';
import { KnowledgeValidator } from '../Validation/KnowledgeValidator.js';

export class MultiSourceIngestionPipeline {
  static ingestCardCapabilities(rawCard) {
    const obj = new KnowledgeObject({
      id: `kn_card_${rawCard.name.replace(/\s+/g, '_')}`,
      type: 'CardKnowledge',
      confidence: 0.92,
      sources: ['Scryfall', 'DerivationEngine']
    });

    const val = KnowledgeValidator.validate(obj);
    return val.valid ? obj : null;
  }
}
