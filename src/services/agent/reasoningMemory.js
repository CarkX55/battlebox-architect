/**
 * REASONING MEMORY & CAUSAL DECISION GRAPH (v19.0 Pro)
 * 
 * Records explicit causal rationale, evaluated alternatives, enabled victory plans,
 * and importance rankings for every card decision in the BattleBoxAgent.
 * Enables intelligent backtracking by identifying least critical cards.
 */

export const IMPORTANCE_TIERS = Object.freeze({
  CRITICAL_FOUNDATION: 'CRITICAL_FOUNDATION',
  CORE_ENGINE: 'CORE_ENGINE',
  HIGH_SYNERGY: 'HIGH_SYNERGY',
  FLEXIBLE_FILLER: 'FLEXIBLE_FILLER',
  UTILITY_RESPONSE: 'UTILITY_RESPONSE'
});

export class DecisionNode {
  constructor({ cardName, count, choiceRationale, evaluatedAlternatives = [], enablesPlans = [], synergizesWith = [], importanceRank = IMPORTANCE_TIERS.CORE_ENGINE }) {
    this.cardName = cardName;
    this.count = count;
    this.choiceRationale = choiceRationale;
    this.evaluatedAlternatives = Object.freeze([...evaluatedAlternatives]);
    this.enablesPlans = Object.freeze([...enablesPlans]);
    this.synergizesWith = Object.freeze([...synergizesWith]);
    this.importanceRank = importanceRank;
    this.timestamp = new Date().toISOString();
    Object.freeze(this);
  }
}

export class ReasoningMemory {
  constructor() {
    this.nodes = new Map(); // cardName -> DecisionNode
    this.decisionHistory = [];
  }

  recordDecision({ cardName, count, choiceRationale, evaluatedAlternatives = [], enablesPlans = [], synergizesWith = [], importanceRank = IMPORTANCE_TIERS.CORE_ENGINE }) {
    const node = new DecisionNode({
      cardName,
      count,
      choiceRationale,
      evaluatedAlternatives,
      enablesPlans,
      synergizesWith,
      importanceRank
    });

    this.nodes.set(cardName, node);
    this.decisionHistory.push(node);
    return node;
  }

  getDecision(cardName) {
    return this.nodes.get(cardName) || null;
  }

  getLeastCriticalCards() {
    const sorted = [...this.nodes.values()].sort((a, b) => {
      const rankOrder = {
        [IMPORTANCE_TIERS.FLEXIBLE_FILLER]: 1,
        [IMPORTANCE_TIERS.UTILITY_RESPONSE]: 2,
        [IMPORTANCE_TIERS.HIGH_SYNERGY]: 3,
        [IMPORTANCE_TIERS.CORE_ENGINE]: 4,
        [IMPORTANCE_TIERS.CRITICAL_FOUNDATION]: 5
      };
      return rankOrder[a.importanceRank] - rankOrder[b.importanceRank];
    });
    return sorted;
  }

  exportCausalTrace() {
    return this.decisionHistory.map(n => ({
      cardName: n.cardName,
      count: n.count,
      rationale: n.choiceRationale,
      rank: n.importanceRank,
      alternatives: n.evaluatedAlternatives
    }));
  }
}
