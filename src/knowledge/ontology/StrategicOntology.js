/**
 * StrategicOntology.js
 * Centralized System Dictionary defining standard vocabulary, taxonomy, and category inheritance.
 */

export const STRATEGIC_TAXONOMY = {
  CAPABILITIES: {
    MANA_ACCELERATION: 'cap.mana.acceleration',
    BOARD_RESET: 'cap.board.reset',
    CARD_DRAW: 'cap.card.draw',
    SINGLE_TARGET_REMOVAL: 'cap.removal.single_target',
    GRAVEYARD_RECURSION: 'cap.graveyard.recursion',
    PROTECTION: 'cap.protection',
    SYNERGY_LANDFALL: 'cap.synergy.landfall',
    SYNERGY_TOKEN: 'cap.synergy.token',
    SYNERGY_SACRIFICE: 'cap.synergy.sacrifice'
  },
  RELATIONSHIPS: {
    SATISFIES: 'SATISFIES',
    REQUIRES: 'REQUIRES',
    COUNTERS: 'COUNTERS',
    ENABLES: 'ENABLES',
    REPLACES: 'REPLACES',
    CAUSES: 'CAUSES',
    SUPPORTS: 'SUPPORTS',
    PROVIDES: 'PROVIDES',
    USES: 'USES'
  },
  ADVANTAGES: {
    TEMPO: 'TEMPO_ADVANTAGE',
    MANA: 'MANA_ADVANTAGE',
    CARD: 'CARD_ADVANTAGE',
    BOARD: 'BOARD_ADVANTAGE',
    VIRTUAL_CARD: 'VIRTUAL_CARD_ADVANTAGE'
  }
};

export class StrategicOntology {
  static isSubtypeOf(category, parentCategory) {
    if (category === parentCategory) return true;
    if (category === STRATEGIC_TAXONOMY.ADVANTAGES.MANA && parentCategory === 'RESOURCE_ADVANTAGE') return true;
    if (category === STRATEGIC_TAXONOMY.ADVANTAGES.TEMPO && parentCategory === 'STRATEGIC_ADVANTAGE') return true;
    return false;
  }

  static getNamespace(capName) {
    const formatted = capName.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
    return STRATEGIC_TAXONOMY.CAPABILITIES[formatted] || `cap.custom.${capName.toLowerCase()}`;
  }
}
