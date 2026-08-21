/**
 * src/services/compiler/core/causalGraphEngine.js
 * 
 * CausalGraphEngine: Directed Causal Graph engine ($G = (V,E)$) for compositional MTG reasoning.
 * Models multi-card interactions, cycles, loops, emergent clusters, and causal snapshots.
 * Part of BattleBox v11.0.
 */

import { CardCausalContract } from './cardCausalContract.js';
import { CausalChainContract } from './causalChainContract.js';

export class CausalGraphEngine {
  constructor({ nodes = new Map(), edges = [], winPathType = 'GENERAL_WIN', primaryPathType = 'ACYCLIC_PATH' } = {}) {
    this.nodes = nodes; // Map of id -> nodeData
    this.edges = edges; // Array of { from, to, type, timing, quantity, reliability }
    this.winPathType = winPathType;
    this.primaryPathType = primaryPathType;
  }

  /**
   * Builds a Directed Causal Graph from an array of card objects.
   * @param {Array<Object>} cards
   * @param {Object} [options={}]
   * @returns {CausalGraphEngine}
   */
  static buildGraphFromCards(cards = [], options = {}) {
    const winPathType = options.winPathType || 'GENERAL_WIN';
    const graph = new CausalGraphEngine({ winPathType });
    const contracts = cards.map(c => CardCausalContract.parse(c));

    // 1. Register Card Nodes
    for (const contract of contracts) {
      const cardName = contract.cardIdentity.name;
      const cardNodeId = `CARD_${cardName.replace(/\s+/g, '_')}`;
      const cmc = contract.cardIdentity.cmc || 1;
      const oracle = (contract.cardIdentity.oracleText || '').toLowerCase();
      const typeLine = (contract.cardIdentity.typeLine || '').toLowerCase();

      graph.nodes.set(cardNodeId, {
        id: cardNodeId,
        type: 'CARD',
        name: cardName,
        contract,
        earliestTurn: cmc
      });

      // 2. Register Supply Nodes & PRODUCES edges
      for (const supply of contract.supplies) {
        const supplyNodeId = `RES_${supply.capability}_${supply.domain || 'UNIVERSAL'}`;
        if (!graph.nodes.has(supplyNodeId)) {
          graph.nodes.set(supplyNodeId, {
            id: supplyNodeId,
            type: 'RESOURCE',
            capability: supply.capability,
            domain: supply.domain,
            timing: supply.timing
          });
        }

        graph.edges.push({
          from: cardNodeId,
          to: supplyNodeId,
          type: 'PRODUCES',
          timing: { earliestTurn: cmc },
          reliability: supply.repeatable ? 0.95 : 0.85
        });
      }

      // 3. Register Demand Nodes & REQUIRES / ENABLES edges
      for (const demand of contract.demands) {
        const demandNodeId = `DEMAND_${demand.resource}`;
        if (!graph.nodes.has(demandNodeId)) {
          graph.nodes.set(demandNodeId, {
            id: demandNodeId,
            type: 'DEMAND',
            resource: demand.resource,
            necessity: demand.necessity
          });
        }

        graph.edges.push({
          from: cardNodeId,
          to: demandNodeId,
          type: 'REQUIRES',
          necessity: demand.necessity
        });
      }
    }

    // 4. Connect Supplies to Demands & Payoffs (ENABLES / CONVERTS)
    for (const contract of contracts) {
      const cardName = contract.cardIdentity.name;
      const cardNodeId = `CARD_${cardName.replace(/\s+/g, '_')}`;
      const oracle = (contract.cardIdentity.oracleText || '').toLowerCase();
      const typeLine = (contract.cardIdentity.typeLine || '').toLowerCase();

      // Check Toughness Combat Enablers
      if (oracle.includes('assigns combat damage equal to its toughness') || oracle.includes('assign combat damage equal to their power') || oracle.includes('assign combat damage equal to their toughness') || oracle.includes('rather than its power') || oracle.includes('rather than their power')) {
        const toughnessEnablerId = 'RES_TOUGHNESS_COMBAT_ENABLER';
        if (!graph.nodes.has(toughnessEnablerId)) {
          graph.nodes.set(toughnessEnablerId, { id: toughnessEnablerId, type: 'RESOURCE', capability: 'TOUGHNESS_COMBAT' });
        }
        graph.edges.push({ from: cardNodeId, to: toughnessEnablerId, type: 'PRODUCES' });

        // Connect all Defender/Wall cards to this enabler
        for (const other of contracts) {
          const otherName = other.cardIdentity.name;
          const otherNodeId = `CARD_${otherName.replace(/\s+/g, '_')}`;
          if ((other.cardIdentity.oracleText || '').toLowerCase().includes('defender') || (other.cardIdentity.typeLine || '').toLowerCase().includes('wall')) {
            graph.edges.push({ from: toughnessEnablerId, to: otherNodeId, type: 'ENABLES' });
            graph.edges.push({ from: otherNodeId, to: 'WINPATH_NODE', type: 'CONVERTS' });
          }
        }
      }

      // Check Sacrifice Outlets & Death Payoffs
      if (oracle.includes('sacrifice a creature') || oracle.includes('sacrifice a goblin') || oracle.includes('sacrifice another')) {
        const sacOutletId = 'RES_SACRIFICE_OUTLET';
        if (!graph.nodes.has(sacOutletId)) {
          graph.nodes.set(sacOutletId, { id: sacOutletId, type: 'RESOURCE', capability: 'SACRIFICE_OUTLET' });
        }
        graph.edges.push({ from: cardNodeId, to: sacOutletId, type: 'PRODUCES' });

        // Connect Fodder producers and Death Payoffs to Outlet
        for (const other of contracts) {
          const otherName = other.cardIdentity.name;
          const otherNodeId = `CARD_${otherName.replace(/\s+/g, '_')}`;
          const otherOracle = (other.cardIdentity.oracleText || '').toLowerCase();
          if (other.supplies.some(s => s.capability === 'TOKEN_GENERATOR') || (otherOracle.includes('when') && otherOracle.includes('enters') && otherOracle.includes('token'))) {
            graph.edges.push({ from: otherNodeId, to: sacOutletId, type: 'FEEDS' });
          }
          if (otherOracle.includes('dies') && (otherOracle.includes('whenever') || otherOracle.includes('when') || otherOracle.includes('deals'))) {
            graph.edges.push({ from: sacOutletId, to: otherNodeId, type: 'TRIGGERS' });
          }
        }
      }

      // Check Death trigger direct damage (e.g. Pashalik Mons)
      if (oracle.includes('dies') && (oracle.includes('deals 1 damage') || oracle.includes('deals damage'))) {
        graph.edges.push({ from: cardNodeId, to: 'WINPATH_NODE', type: 'CONVERTS' });
      }

      // Check Direct Damage Reach
      if (contract.supplies.some(s => s.capability === 'PLAYER_REACH' || (s.capability === 'CHEAP_REMOVAL' && s.canHitPlayer))) {
        graph.edges.push({ from: cardNodeId, to: 'WINPATH_NODE', type: 'CONVERTS' });
      }

      // Check Creature Stompy Payoffs & Mana Acceleration
      if (contract.supplies.some(s => s.capability === 'MANA_ACCELERATION')) {
        const manaSupply = contract.supplies.find(s => s.capability === 'MANA_ACCELERATION');
        const manaDomain = manaSupply.domain || 'UNIVERSAL';

        for (const other of contracts) {
          const otherName = other.cardIdentity.name;
          const otherNodeId = `CARD_${otherName.replace(/\s+/g, '_')}`;
          if (otherName === cardName) continue;

          // Domain compatibility check
          let isCompatible = true;
          if (manaDomain === 'INSTANT_OR_SORCERY_ONLY') {
            const isSpell = (other.cardIdentity.typeLine || '').toLowerCase().includes('instant') || (other.cardIdentity.typeLine || '').toLowerCase().includes('sorcery');
            if (!isSpell) isCompatible = false;
          } else if (manaDomain === 'CREATURE_SPELLS_ONLY') {
            const isCreature = (other.cardIdentity.typeLine || '').toLowerCase().includes('creature');
            if (!isCreature) isCompatible = false;
          }

          if (isCompatible && (other.cardIdentity.cmc || 0) > (contract.cardIdentity.cmc || 0)) {
            graph.edges.push({ from: cardNodeId, to: otherNodeId, type: 'ENABLES' });
            if ((other.cardIdentity.cmc || 0) >= 4 || (other.cardIdentity.typeLine || '').toLowerCase().includes('creature')) {
              graph.edges.push({ from: otherNodeId, to: 'WINPATH_NODE', type: 'CONVERTS' });
            }
          }
        }
      }
    }

    // Determine primary path type
    if (winPathType.includes('SACRIFICE') || winPathType.includes('ARISTOCRATS')) {
      graph.primaryPathType = 'RECURSIVE_LOOP';
    } else if (winPathType.includes('COMBO')) {
      graph.primaryPathType = 'FINITE_LOOP';
    } else if (winPathType.includes('TOUGHNESS') || winPathType.includes('ENGINE')) {
      graph.primaryPathType = 'REPEATABLE_ENGINE';
    } else {
      graph.primaryPathType = 'ACYCLIC_PATH';
    }

    return graph;
  }

  /**
   * Discovers all multi-card causal chains leading from enablers/producers to the WinPath.
   * @returns {Array<CausalChainContract>}
   */
  discoverChains() {
    const chains = [];
    const cardNodes = Array.from(this.nodes.values()).filter(n => n.type === 'CARD');

    // Look for chains connecting cards
    for (const startNode of cardNodes) {
      const visited = new Set([startNode.id]);
      const currentChainNodes = [startNode];
      const currentChainEdges = [];

      // DFS to find paths to WinPath or downstream consumers
      const traverse = (currentNode) => {
        const outgoing = this.edges.filter(e => e.from === currentNode.id);
        for (const edge of outgoing) {
          if (edge.to === 'WINPATH_NODE') {
            chains.push(new CausalChainContract({
              chainId: `CHAIN_${chains.length + 1}`,
              nodes: [...currentChainNodes],
              edges: [...currentChainEdges, edge],
              pathType: this.primaryPathType,
              reachesWinPath: true,
              executionProbability: 0.82
            }));
            return;
          }

          if (!visited.has(edge.to)) {
            visited.add(edge.to);
            const targetNode = this.nodes.get(edge.to);
            if (targetNode) {
              currentChainNodes.push(targetNode);
              currentChainEdges.push(edge);
              traverse(targetNode);
              currentChainNodes.pop();
              currentChainEdges.pop();
            }
            visited.delete(edge.to);
          }
        }
      };

      traverse(startNode);
    }

    return chains;
  }

  /**
   * Discovers emergent dense subgraphs (clusters where synergy creates joint emergent value).
   * @returns {Array<Object>}
   */
  discoverClusters() {
    const clusters = [];
    const cardNodes = Array.from(this.nodes.values()).filter(n => n.type === 'CARD');

    // Find groups of 2-4 cards with mutual ENABLES/PRODUCES/FEEDS edges
    if (cardNodes.length >= 2) {
      const connectedCards = cardNodes.filter(c => 
        this.edges.some(e => (e.from === c.id || e.to === c.id) && (e.type === 'ENABLES' || e.type === 'FEEDS' || e.type === 'CONVERTS'))
      );

      if (connectedCards.length >= 2) {
        clusters.push({
          clusterId: `CLUSTER_EMERGENT_1`,
          nodes: connectedCards.map(c => c.name),
          jointExecutionProbability: 0.85,
          telemetryLabel: this.primaryPathType === 'REPEATABLE_ENGINE' ? 'REPEATABLE_ENGINE' : 'SYNERGY_CLUSTER'
        });
      }
    }

    return clusters;
  }

  /**
   * Evaluates if a card provides an asymmetric blowout given the current deck's composition.
   * @param {Object} card 
   * @param {Array<Object>} deckCards 
   * @returns {Object} { isAsymmetricBlowout, selfLossCount, reason }
   */
  static evaluateCardAsymmetry(card, deckCards = []) {
    const oracle = (card.oracle_text || '').toLowerCase();
    let isAsymmetricBlowout = false;
    let selfLossCount = 0;
    let reason = '';

    // Case 1: Slaughter the Strong / Fell the Mighty (Power-based sweepers)
    if (oracle.includes('power 4 or less') && (oracle.includes('sacrifices all other') || oracle.includes('destroy all creatures with power'))) {
      // Check our creatures power
      const creaturesKilled = deckCards.filter(c => {
        const power = Number(c.power != null ? c.power : (c.card?.power != null ? c.card.power : 0));
        return power > 4;
      });

      selfLossCount = creaturesKilled.length;
      if (selfLossCount === 0) {
        isAsymmetricBlowout = true;
        reason = 'Preserves 100% of friendly low-power/high-toughness creatures while wiping opponent threats.';
      }
    }

    // Case 2: Whelming Wave (Sea Monsters bounce)
    if (oracle.includes('kraken') && oracle.includes('leviathan') && oracle.includes('octopus') && oracle.includes('serpent') && oracle.includes('return all creatures')) {
      const seaSubtypes = ['kraken', 'leviathan', 'octopus', 'serpent', 'merfolk'];
      const nonSeaCreatures = deckCards.filter(c => {
        const typeLine = ((c.type_line || c.card?.type_line || '')).toLowerCase();
        return !seaSubtypes.some(sub => typeLine.includes(sub));
      });

      selfLossCount = nonSeaCreatures.length;
      if (selfLossCount === 0) {
        isAsymmetricBlowout = true;
        reason = 'Asymmetric board bounce: all friendly oceanic monsters stay on board.';
      }
    }

    return {
      isAsymmetricBlowout,
      selfLossCount,
      reason
    };
  }

  /**
   * Emits an immutable CausalGraphSnapshot.
   * @param {string} [stateId='S_CURRENT']
   * @returns {Object}
   */
  createSnapshot(stateId = 'S_CURRENT') {
    return {
      stateId,
      nodes: Array.from(this.nodes.values()),
      edges: [...this.edges],
      chains: this.discoverChains(),
      clusters: this.discoverClusters(),
      primaryPathType: this.primaryPathType,
      winPathType: this.winPathType
    };
  }
}
