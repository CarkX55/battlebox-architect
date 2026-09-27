/**
 * src/services/compiler/core/functionalRedundancyGraph.js
 * 
 * Functional Redundancy Graph & 4-Tier Taxonomy Engine v28.1.
 * 
 * Maps cards to Capability Nodes and evaluates independent functional pathways.
 * Distinguishes Nominal vs Functional vs Temporal vs Resilience Redundancy.
 * Detects Single Points of Failure (SPOF) across the deck architecture.
 */

import { CardCausalContract } from './cardCausalContract.js';

export const RedundancyTier = Object.freeze({
  NOMINAL_REDUNDANCY: 'NOMINAL_REDUNDANCY',       // Same tag/label, but incompatible speed/timing
  FUNCTIONAL_REDUNDANCY: 'FUNCTIONAL_REDUNDANCY', // Same mechanical capability & comparable power
  TEMPORAL_REDUNDANCY: 'TEMPORAL_REDUNDANCY',     // Same turn window execution (e.g. T1 dorks)
  RESILIENCE_REDUNDANCY: 'RESILIENCE_REDUNDANCY'   // Independent operational vectors resisting common hate
});

export class FunctionalRedundancyGraph {
  /**
   * Builds and evaluates the functional redundancy graph for a deck.
   * 
   * @param {Array<Object>|Object} deckInput 
   * @param {Object} options 
   * @returns {Object} Structured Redundancy Analysis Report
   */
  static analyzeDeckRedundancy(deckInput, options = {}) {
    const rawCards = Array.isArray(deckInput) ? deckInput : (deckInput?.cards || []);
    const nodeMap = {
      T1_MANA_ACCELERATION: [],
      CHEAP_SPOT_REMOVAL: [],
      T1_PRESSURE: [],
      T2_PRESSURE: [],
      BOARD_AMPLIFIER_LORD: [],
      CARD_FLOW_ENGINE: [],
      DIRECT_BURN_REACH: [],
      BOARD_SWEEPER: []
    };

    // 1. Map cards to Capability Nodes via CardCausalContract
    for (const entry of rawCards) {
      const card = entry.card || entry;
      const count = Number(entry.quantity || entry.count || 1);
      const contract = CardCausalContract.parse(card);
      const oracle = (card.oracle_text || card.oracleText || '').toLowerCase();
      const type = (card.type_line || card.type || '').toLowerCase();
      const cmc = Number(card.cmc || 0);

      // Node: T1_MANA_ACCELERATION
      if (cmc === 1 && type.includes('creature') && (oracle.includes('{t}: add') || oracle.includes('adds '))) {
        nodeMap.T1_MANA_ACCELERATION.push({ card, count, contract, redundancyTier: RedundancyTier.TEMPORAL_REDUNDANCY });
      }

      // Node: CHEAP_SPOT_REMOVAL
      if (cmc <= 2 && (type.includes('instant') || type.includes('sorcery')) && 
          (contract.interactionProof.effectScope === 'HARD_REMOVAL' || contract.interactionProof.effectScope === 'DAMAGE_REMOVAL')) {
        const tier = contract.interactionProof.timingWindow === 'INSTANT_SPEED' ? RedundancyTier.RESILIENCE_REDUNDANCY : RedundancyTier.FUNCTIONAL_REDUNDANCY;
        nodeMap.CHEAP_SPOT_REMOVAL.push({ card, count, contract, redundancyTier: tier });
      }

      // Node: T1_PRESSURE
      if (cmc === 1 && type.includes('creature') && (Number(card.power) >= 2 || oracle.includes('haste'))) {
        nodeMap.T1_PRESSURE.push({ card, count, contract, redundancyTier: RedundancyTier.TEMPORAL_REDUNDANCY });
      }

      // Node: T2_PRESSURE
      if (cmc === 2 && type.includes('creature') && Number(card.power) >= 2) {
        nodeMap.T2_PRESSURE.push({ card, count, contract, redundancyTier: RedundancyTier.FUNCTIONAL_REDUNDANCY });
      }

      // Node: BOARD_AMPLIFIER_LORD
      if (oracle.includes('other ') && (oracle.includes('get +1/+1') || oracle.includes('gets +1/+1') || oracle.includes('battle cry'))) {
        nodeMap.BOARD_AMPLIFIER_LORD.push({ card, count, contract, redundancyTier: RedundancyTier.RESILIENCE_REDUNDANCY });
      }

      // Node: CARD_FLOW_ENGINE
      if (contract.resourceAccessChains.hasResourceFlow || oracle.includes('draw') || oracle.includes('exile the top')) {
        nodeMap.CARD_FLOW_ENGINE.push({ card, count, contract, redundancyTier: RedundancyTier.FUNCTIONAL_REDUNDANCY });
      }

      // Node: DIRECT_BURN_REACH
      if (contract.interactionProof.effectScope === 'DAMAGE_REMOVAL' && contract.interactionProof.targetScope === 'ANY_TARGET') {
        nodeMap.DIRECT_BURN_REACH.push({ card, count, contract, redundancyTier: RedundancyTier.RESILIENCE_REDUNDANCY });
      }

      // Node: BOARD_SWEEPER
      if (oracle.includes('destroy all') || oracle.includes('exile all') || oracle.includes('each creature deals')) {
        nodeMap.BOARD_SWEEPER.push({ card, count, contract, redundancyTier: RedundancyTier.FUNCTIONAL_REDUNDANCY });
      }
    }

    // 2. Evaluate Independent Paths & Single Points of Failure
    const nodeAnalysis = {};
    const singlePointsOfFailure = [];
    let totalIndependentPaths = 0;

    for (const [nodeName, providers] of Object.entries(nodeMap)) {
      const distinctCards = providers.length;
      const totalCopies = providers.reduce((sum, p) => sum + p.count, 0);

      // Single Point of Failure detection:
      // If a critical node has totalCopies >= 4 but distinctCards === 1, it has a fragile single point of failure against named hate (e.g. Meddling Mage, Surgical, Pithing Needle)
      const isSPOF = totalCopies > 0 && distinctCards === 1;
      if (isSPOF) {
        singlePointsOfFailure.push({
          node: nodeName,
          soleCard: providers[0].card.name,
          copies: providers[0].count,
          risk: 'NAMED_DISRUPTION_COLLAPSE'
        });
      }

      nodeAnalysis[nodeName] = {
        distinctProvidersCount: distinctCards,
        totalCopiesAvailable: totalCopies,
        isSinglePointOfFailure: isSPOF,
        redundancyTiers: [...new Set(providers.map(p => p.redundancyTier))],
        providers: providers.map(p => ({ name: p.card.name, count: p.count, tier: p.redundancyTier }))
      };

      totalIndependentPaths += distinctCards;
    }

    // Calculate functional redundancy score
    const nodesWithCoverage = Object.values(nodeAnalysis).filter(n => n.totalCopiesAvailable >= 4).length;
    const nodesWithMultiSource = Object.values(nodeAnalysis).filter(n => n.distinctProvidersCount >= 2).length;
    const functionalScore = Number(((nodesWithCoverage * 0.5 + nodesWithMultiSource * 0.5) / Math.max(1, nodesWithCoverage)).toFixed(2));

    return Object.freeze({
      functionalRedundancyScore: Math.min(1.0, functionalScore),
      totalIndependentPaths,
      singlePointsOfFailure: Object.freeze(singlePointsOfFailure),
      spofCount: singlePointsOfFailure.length,
      nodeAnalysis: Object.freeze(nodeAnalysis)
    });
  }
}
