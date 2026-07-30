/**
 * CardSemanticProfile.js - Version 1
 * Immutable Physical IR containing strictly observable physical facts of a card.
 */

export class CardSemanticProfile {
  static VERSION = 1;
  static COMPATIBLE_UNTIL = 2;

  constructor({ cardId, cardName, manaValue, colorIdentity, typeLine, keywords = [], physicalFacts = {} }) {
    this.version = CardSemanticProfile.VERSION;
    this.compatibleUntil = CardSemanticProfile.COMPATIBLE_UNTIL;
    this.cardId = cardId;
    this.cardName = cardName;
    this.manaValue = manaValue;
    this.colorIdentity = Array.from(colorIdentity || []);
    this.typeLine = typeLine;
    this.keywords = Array.from(keywords || []);
    this.physicalFacts = Object.freeze({ ...physicalFacts });

    Object.freeze(this);
  }

  static create(rawCard, extractedFacts = {}) {
    return new CardSemanticProfile({
      cardId: rawCard.id || rawCard.name,
      cardName: rawCard.name,
      manaValue: rawCard.cmc ?? rawCard.mana_value ?? 0,
      colorIdentity: rawCard.color_identity || rawCard.colors || [],
      typeLine: rawCard.type_line || '',
      keywords: rawCard.keywords || [],
      physicalFacts: extractedFacts
    });
  }
}
