/**
 * StrategicConceptGraph.js
 * High-Level Strategic Concept Graph.
 * Maps deep MTG strategic concepts:
 * Tempo, Mana, Board Presence, Removal Density, Card Advantage, Threat Compression,
 * Inevitability, Resource Denial, Virtual Card Advantage, Pivot Plan, Clock, Interaction Window, Sweeper Recovery.
 */

export const STRATEGIC_CONCEPTS = Object.freeze({
  TEMPO: 'cap.concept.tempo',
  MANA: 'cap.concept.mana',
  BOARD_PRESENCE: 'cap.concept.board_presence',
  REMOVAL_DENSITY: 'cap.concept.removal_density',
  CARD_ADVANTAGE: 'cap.concept.card_advantage',
  THREAT_COMPRESSION: 'cap.concept.threat_compression',
  INEVITABILITY: 'cap.concept.inevitability',
  RESOURCE_DENIAL: 'cap.concept.resource_denial',
  VIRTUAL_CARD_ADVANTAGE: 'cap.concept.virtual_card_advantage',
  PIVOT_PLAN: 'cap.concept.pivot_plan',
  CLOCK: 'cap.concept.clock',
  INTERACTION_WINDOW: 'cap.concept.interaction_window',
  SWEEPER_RECOVERY: 'cap.concept.sweeper_recovery'
});

export class StrategicConceptGraph {
  static getCardConceptVector(cardName) {
    const name = cardName ? cardName.toLowerCase() : '';

    if (name.includes('llanowar elves') || name.includes('halfling')) {
      return Object.freeze([STRATEGIC_CONCEPTS.TEMPO, STRATEGIC_CONCEPTS.MANA, STRATEGIC_CONCEPTS.BOARD_PRESENCE]);
    }

    if (name.includes('collected company')) {
      return Object.freeze([STRATEGIC_CONCEPTS.CARD_ADVANTAGE, STRATEGIC_CONCEPTS.SWEEPER_RECOVERY, STRATEGIC_CONCEPTS.VIRTUAL_CARD_ADVANTAGE]);
    }

    if (name.includes('sheoldred')) {
      return Object.freeze([STRATEGIC_CONCEPTS.THREAT_COMPRESSION, STRATEGIC_CONCEPTS.INEVITABILITY, STRATEGIC_CONCEPTS.CLOCK]);
    }

    return Object.freeze([STRATEGIC_CONCEPTS.BOARD_PRESENCE]);
  }
}
