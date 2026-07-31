/**
 * MTGAdapter.js
 * Magic: The Gathering Data Adapter.
 * Encapsulates MTG-specific logic (cards, oracle text, mana value, colors) and translates into generic KnowledgeDSL primitives.
 */

import { KnowledgeDSL } from '../compiler/KnowledgeDSL.js';
import { StrategicOntology } from '../ontology/StrategicOntology.js';

export class MTGAdapter {
  static translateCardToDSL(card) {
    if (!card) return null;

    const node = KnowledgeDSL.createCapabilityNode(
      `card_${card.id || card.name.replace(/\s+/g, '_')}`,
      card.name,
      {
        manaValue: card.cmc || card.manaValue || 0,
        typeLine: card.typeLine || card.type_line || '',
        oracleText: card.oracleText || card.oracle_text || '',
        colors: card.colors || []
      }
    );

    const relationships = [];

    // Translate oracle text mechanics into capabilities
    const text = (card.oracleText || card.oracle_text || '').toLowerCase();
    if (text.includes('add ') || text.includes('search your library for a land')) {
      const capId = StrategicOntology.getNamespace('ManaAcceleration');
      relationships.push(KnowledgeDSL.createRelationship(node.id, capId, 'PROVIDES', 0.95));
    }

    if (text.includes('destroy all') || text.includes('exile all')) {
      const capId = StrategicOntology.getNamespace('BoardReset');
      relationships.push(KnowledgeDSL.createRelationship(node.id, capId, 'PROVIDES', 0.92));
    }

    if (text.includes('draw a card') || text.includes('draws a card')) {
      const capId = StrategicOntology.getNamespace('CardDraw');
      relationships.push(KnowledgeDSL.createRelationship(node.id, capId, 'PROVIDES', 0.90));
    }

    return { node, relationships };
  }
}
