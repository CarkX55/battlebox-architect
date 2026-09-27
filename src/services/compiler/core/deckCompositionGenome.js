/**
 * src/services/compiler/core/deckCompositionGenome.js
 * 
 * DeckCompositionGenome: Canonical Holistic Deck Architecture Model v29.1.
 * Indexed strictly by OracleId (eliminating card name, reprint, or localization collisions).
 * 
 * Represents a complete, candidate 60-card design containing precise copy counts,
 * package groupings, and functional role maps.
 */

export class DeckCompositionGenome {
  constructor({
    compositionHash = null,
    cardIdentityMap = new Map(),
    copiesByOracleId = new Map(),
    rolesByOracleId = new Map(),
    packageAssignments = new Map(),
    landState = { totalLands: 24, landCards: [] },
    format = 'STANDARD',
    intentHash = 'unlocked'
  } = {}) {
    this.cardIdentityMap = new Map(cardIdentityMap);
    this.copiesByOracleId = new Map(copiesByOracleId);
    this.rolesByOracleId = new Map(rolesByOracleId);
    this.packageAssignments = new Map(packageAssignments);
    this.landState = {
      totalLands: Number(landState?.totalLands || 24),
      landCards: Array.isArray(landState?.landCards) ? [...landState.landCards] : []
    };
    this.format = (format || 'STANDARD').toUpperCase();
    this.intentHash = intentHash;

    this.compositionHash = compositionHash || this.computeGenomeHash();
    Object.freeze(this);
  }

  /**
   * Computes a canonical deterministic alphanumeric hash of this deck genome.
   * @returns {string}
   */
  computeGenomeHash() {
    const entries = [];
    const sortedOracleIds = Array.from(this.copiesByOracleId.keys()).sort();
    
    for (const id of sortedOracleIds) {
      const count = this.copiesByOracleId.get(id) || 0;
      if (count > 0) {
        entries.push(`${id}:${count}`);
      }
    }

    const landSummary = (this.landState.landCards || [])
      .map(l => `${l.name || 'Land'}:${l.quantity || 1}`)
      .sort()
      .join('|');

    const rawStr = `FMT:${this.format}|INT:${this.intentHash}|LANDS:${this.landState.totalLands}[${landSummary}]|SPELLS:${entries.join(',')}`;
    
    let hash = 0;
    for (let i = 0; i < rawStr.length; i++) {
      const char = rawStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }

    return `GEN_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Generates a stable unique Oracle ID for a card object if missing.
   * @param {Object} card 
   * @returns {string}
   */
  static getOracleId(card) {
    if (card?.oracle_id) return String(card.oracle_id);
    if (card?.oracleId) return String(card.oracleId);
    const name = (card?.name || 'unknown').toLowerCase().trim();
    return name;
  }

  /**
   * Returns total non-land spell cards count in genome.
   */
  getTotalSpellCount() {
    let total = 0;
    for (const count of this.copiesByOracleId.values()) {
      total += Number(count || 0);
    }
    return total;
  }

  /**
   * Returns total cards in genome including lands.
   */
  getTotalCardCount() {
    return this.getTotalSpellCount() + Number(this.landState.totalLands || 0);
  }

  /**
   * Emits the complete card list of 60 cards formatted for simulation and export.
   */
  toCardList() {
    const list = [];
    
    // Spells
    for (const [oracleId, count] of this.copiesByOracleId.entries()) {
      if (count > 0) {
        const cardObj = this.cardIdentityMap.get(oracleId) || { name: oracleId, oracle_id: oracleId };
        const role = this.rolesByOracleId.get(oracleId) || 'SPELL';
        const packageId = this.packageAssignments.get(oracleId) || 'CORE';

        list.push({
          card: cardObj,
          cardObj: cardObj,
          name: cardObj.name,
          oracle_id: oracleId,
          oracleId,
          quantity: count,
          count,
          role,
          packageId,
          cmc: Number(cardObj.cmc || cardObj.mana_value || 0),
          type_line: cardObj.type_line || cardObj.type || '',
          typeLine: cardObj.type_line || cardObj.type || '',
          oracle_text: cardObj.oracle_text || cardObj.oracleText || cardObj.text || '',
          oracleText: cardObj.oracle_text || cardObj.oracleText || cardObj.text || '',
          colors: cardObj.colors || [],
          isLand: false
        });
      }
    }

    // Lands
    for (const landEntry of this.landState.landCards || []) {
      list.push({
        card: landEntry,
        name: landEntry.name || 'Basic Land',
        oracleId: DeckCompositionGenome.getOracleId(landEntry),
        quantity: landEntry.quantity || landEntry.count || 1,
        count: landEntry.quantity || landEntry.count || 1,
        role: 'Land',
        packageId: 'MANA_BASE',
        cmc: 0,
        type_line: landEntry.type_line || 'Land',
        typeLine: landEntry.type_line || 'Land',
        colors: landEntry.colors || [],
        isLand: true
      });
    }

    return list;
  }

  /**
   * Creates a deep cloned instance of the genome.
   */
  clone() {
    return new DeckCompositionGenome({
      compositionHash: null,
      cardIdentityMap: new Map(this.cardIdentityMap),
      copiesByOracleId: new Map(this.copiesByOracleId),
      rolesByOracleId: new Map(this.rolesByOracleId),
      packageAssignments: new Map(this.packageAssignments),
      landState: {
        totalLands: this.landState.totalLands,
        landCards: this.landState.landCards.map(l => ({ ...l }))
      },
      format: this.format,
      intentHash: this.intentHash
    });
  }
}
