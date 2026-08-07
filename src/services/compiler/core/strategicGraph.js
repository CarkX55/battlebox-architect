/**
 * src/services/compiler/core/strategicGraph.js
 * 
 * Strategic Knowledge Graph v1.2.
 * Extended Relational Link Types:
 *   - produces: CapabilityAxisIDs produced by the card
 *   - requires / depends_on: Prerequisites required to unlock card potential
 *   - enables / supports: Strategic engines unlocked or supported by the card
 *   - conflicts_with: Cards or mechanics that anti-synergize
 *   - replaces: Functional equivalents or alternatives
 *   - amplifies: Multiplies effectiveness of an entire capability axis
 *   - suppresses: Reduces drawbacks or counters opposing mechanics
 *   - competes_for_curve: Curve slot conflicts
 *   - shares_engine: Groups cards into shared tribal or mechanical engines
 */

export const RelationType = Object.freeze({
  PRODUCES: 'PRODUCES',
  REQUIRES: 'REQUIRES',
  DEPENDS_ON: 'DEPENDS_ON',
  ENABLES: 'ENABLES',
  SUPPORTS: 'SUPPORTS',
  CONFLICTS_WITH: 'CONFLICTS_WITH',
  REPLACES: 'REPLACES',
  AMPLIFIES: 'AMPLIFIES',
  SUPPRESSES: 'SUPPRESSES',
  COMPETES_FOR_CURVE: 'COMPETES_FOR_CURVE',
  SHARES_ENGINE: 'SHARES_ENGINE'
});

export class StrategicNode {
  constructor({
    cardName,
    produces = [],
    requires = [],
    depends_on = [],
    enables = [],
    supports = [],
    conflicts_with = [],
    replaces = [],
    amplifies = [],
    suppresses = [],
    competes_for_curve = [],
    shares_engine = []
  }) {
    this.cardName = cardName;
    this.produces = Object.freeze([...produces]);
    this.requires = Object.freeze([...requires, ...depends_on]);
    this.depends_on = this.requires;
    this.enables = Object.freeze([...enables, ...supports]);
    this.supports = this.enables;
    this.conflicts_with = Object.freeze([...conflicts_with]);
    this.replaces = Object.freeze([...replaces]);
    this.amplifies = Object.freeze([...amplifies]);
    this.suppresses = Object.freeze([...suppresses]);
    this.competes_for_curve = Object.freeze([...competes_for_curve]);
    this.shares_engine = Object.freeze([...shares_engine]);

    Object.freeze(this);
  }
}

export class StrategicGraph {
  constructor() {
    this._nodes = new Map();
  }

  registerNode(nodeData) {
    const node = nodeData instanceof StrategicNode ? nodeData : new StrategicNode(nodeData);
    this._nodes.set(node.cardName.toLowerCase().trim(), node);
    return node;
  }

  getNode(cardName) {
    if (!cardName) return null;
    return this._nodes.get(cardName.toLowerCase().trim()) || null;
  }

  /**
   * Evaluates synergy score and relational satisfaction between a candidate card and an existing deck state.
   * 
   * @param {string} cardName
   * @param {Array<string>} existingCardNames
   * @returns {{ score: number, isSatisfied: boolean, violations: Array<string> }}
   */
  evaluateSynergyScore(cardName, existingCardNames = []) {
    const node = this.getNode(cardName);
    if (!node) return { score: 0, isSatisfied: true, violations: [] };

    let score = 0;
    const violations = [];
    const existingSet = new Set(existingCardNames.map(n => n.toLowerCase()));

    // Check depends_on / requires satisfaction
    for (const req of node.requires) {
      if (req === 'CREATURE_DENSITY' && existingSet.size >= 4) score += 5;
      else if (req === 'HUMAN_DENSITY' && Array.from(existingSet).some(n => n.includes('officer') || n.includes('initiate') || n.includes('vanguard'))) score += 10;
      else if (req.startsWith('CARD:')) {
        const requiredCard = req.replace('CARD:', '').toLowerCase();
        if (existingSet.has(requiredCard)) score += 15;
        else violations.push(`Prerequisite card "${requiredCard}" missing for "${cardName}"`);
      }
    }

    // Check conflicts_with
    for (const conflict of node.conflicts_with) {
      if (existingSet.has(conflict.toLowerCase())) {
        score -= 20;
        violations.push(`Conflict detected: "${cardName}" anti-synergizes with "${conflict}"`);
      }
    }

    // Check supports / enables
    for (const sup of node.supports) {
      if (existingSet.has(sup.toLowerCase())) score += 10;
    }

    const isSatisfied = violations.length === 0;

    return { score, isSatisfied, violations: Object.freeze(violations) };
  }
}
