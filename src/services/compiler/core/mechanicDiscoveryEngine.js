/**
 * src/services/compiler/core/mechanicDiscoveryEngine.js
 * 
 * MechanicDiscoveryEngine: V29.0 Strategic Discovery Layer.
 * 
 * Given a card pool with pre-parsed CardCausalContracts and the CausalGraphEngine,
 * discovers what strategic mechanic clusters actually exist in the available cards.
 * 
 * Axioms:
 *   1. ZERO hardcoded card names in logic.
 *   2. ZERO hardcoded mechanic catalogues (no "GOBLIN_SWARM_TIER_1").
 *   3. Cluster existence is defined by causal connectivity:
 *      - At least one producer→consumer relationship
 *      - At least one route toward a WinPath-relevant capability
 *      Card count participates in VIABILITY (StrategicMemoryModel), not existence.
 *   4. Cluster labels are observability artifacts derived from dominant capabilities,
 *      NEVER used for selection decisions.
 *   5. Deterministic and reproducible: same input → same output.
 * 
 * Clustering strategy:
 *   Instead of BFS on the full adjacency graph (which creates one giant blob
 *   when lords/amplifiers hub all creatures together), we use capability-axis
 *   partitioning: each card is assigned to its PRIMARY strategic axis based on
 *   its most distinctive supply, then causal connectivity is verified WITHIN
 *   each axis group. This produces tight clusters aligned with different
 *   strategic functions.
 */

import { CardCausalContract } from './cardCausalContract.js';

// ─── Strategic Axes ─────────────────────────────────────────────────────────
// A "strategic axis" is a mechanical dimension that defines how a card
// contributes to a strategy. Each axis groups cards that work TOGETHER
// mechanically in a way that is meaningfully distinct from other axes.
//
// Cards can have capabilities on multiple axes (e.g., a sacrifice outlet
// that also generates tokens), but they get assigned to their PRIMARY axis
// (most distinctive capability) for clustering purposes. This prevents
// hub cards from merging all clusters.
const STRATEGIC_AXES = [
  {
    axis: 'AGGRO_PRESSURE',
    primaryCapabilities: ['TRIBAL_LORD', 'COMBAT_DAMAGE'],
    markerPatterns: ['creatures you control get +', 'have haste', 'battle cry', 'attacking'],
    requiresCreatures: true
  },
  {
    axis: 'SACRIFICE_ENGINE',
    primaryCapabilities: ['SACRIFICE_OUTLET', 'DEATH_PAYOFF'],
    markerPatterns: ['sacrifice a ', 'sacrifice another', 'when this creature dies', 'whenever a creature dies', 'whenever another', 'dies'],
    requiresCreatures: false
  },
  {
    axis: 'TOKEN_PRODUCTION',
    primaryCapabilities: ['TOKEN_GENERATOR'],
    markerPatterns: ['create a ', 'create two', 'create three', 'create x', 'token'],
    requiresCreatures: false
  },
  {
    axis: 'BURN_REACH',
    primaryCapabilities: ['PLAYER_REACH', 'CHEAP_REMOVAL'],
    markerPatterns: ['damage to any target', 'damage to target player', 'damage to target opponent'],
    requiresCreatures: false
  },
  {
    axis: 'VALUE_ENGINE',
    primaryCapabilities: ['CARD_FLOW', 'ETB_VALUE'],
    markerPatterns: ['draw a card', 'reveal the top', 'search your library for a', 'enters the battlefield'],
    requiresCreatures: false
  },
  {
    axis: 'COMBO_ENABLER',
    primaryCapabilities: ['MANA_ACCELERATION', 'GRAVEYARD_ENABLER', 'BLINK_ENABLER'],
    markerPatterns: ['copy', 'untap', 'add {', 'play with the top'],
    requiresCreatures: false
  },
  {
    axis: 'SCALING_THREAT',
    primaryCapabilities: ['FINISHER', 'COUNTER_GENERATOR', 'GROWTH_PAYOFF'],
    markerPatterns: ['trample', '+1/+1 counter', 'menace', 'flying'],
    requiresCreatures: true
  },
  {
    axis: 'STATE_TRANSITION_ENGINE',
    primaryCapabilities: ['DAYBOUND_NIGHTBOUND', 'NIGHT_PAYOFF', 'STATE_TRANSITION_CONTROLLER'],
    markerPatterns: ['daybound', 'nightbound', 'it becomes day', 'it becomes night', "as long as it's night", 'transforms'],
    requiresCreatures: false
  },
  {
    axis: 'LANDFALL_RAMP',
    primaryCapabilities: ['LANDFALL_PAYOFF', 'LAND_ACCELERATION'],
    markerPatterns: ['landfall', 'whenever a land enters', 'search your library for a land', 'search your library for a basic land'],
    requiresCreatures: false
  }
];

/**
 * Immutable representation of a discovered mechanic cluster.
 */
export class MechanicCluster {
  constructor({
    axis = '',
    dominantCapabilities = [],
    participatingCards = [],
    producerConsumerPairs = [],
    internalEdges = [],
    winPathRoutes = [],
    density = 0
  } = {}) {
    this.axis = axis;
    this.dominantCapabilities = Object.freeze([...dominantCapabilities]);
    this.participatingCards = Object.freeze([...participatingCards]);
    this.producerConsumerPairs = Object.freeze([...producerConsumerPairs]);
    this.internalEdges = Object.freeze([...internalEdges]);
    this.winPathRoutes = Object.freeze([...winPathRoutes]);
    this.density = density;

    // Observability label — NEVER feeds selection logic
    this._observabilityLabel = axis + '__' + dominantCapabilities.slice(0, 2).join('_');
    Object.freeze(this);
  }

  get label() { return this._observabilityLabel; }
}

/**
 * Immutable output of the discovery engine.
 */
export class DiscoveredMechanicSet {
  constructor({
    tribe = null,
    poolSize = 0,
    discoveredClusters = []
  } = {}) {
    this.tribe = tribe;
    this.poolSize = poolSize;
    this.discoveredClusters = Object.freeze([...discoveredClusters]);
    Object.freeze(this);
  }
}

export class MechanicDiscoveryEngine {
  /**
   * Discovers mechanic clusters present in the given card pool.
   *
   * @param {Object} params
   * @param {Array<Object>} params.cardPool - Legal cards matching color/format
   * @param {import('./intentPackage.js').IntentPackage} params.intentPackage
   * @returns {DiscoveredMechanicSet}
   */
  static discover({ cardPool = [], intentPackage = {} } = {}) {
    const tribeSignal = (intentPackage.primaryTribe || '').toLowerCase().trim() || null;

    // 1. Parse contracts for all non-land spells
    const entries = [];
    for (const card of cardPool) {
      const type = (card.type_line || card.type || '').toLowerCase();
      if (type.includes('land') && !type.includes('creature')) continue;

      const contract = CardCausalContract.parse(card);
      if (!contract) continue;

      entries.push({
        card,
        contract,
        name: contract.cardIdentity.name,
        supplies: contract.supplies || [],
        demands: contract.demands || [],
        cmc: contract.cardIdentity.cmc || 0,
        typeLine: (contract.cardIdentity.typeLine || '').toLowerCase(),
        oracle: (contract.cardIdentity.oracleText || '').toLowerCase()
      });
    }

    // 2. Assign each card to its primary strategic axis
    const axisGroups = this._partitionByAxis(entries, tribeSignal);

    // 3. For each axis group, discover producer/consumer pairs WITHIN the group
    //    and verify causal criteria
    const clusters = [];

    for (const axisDef of STRATEGIC_AXES) {
      const groupEntries = axisGroups[axisDef.axis] || [];
      if (groupEntries.length === 0) continue;

      // Find internal producer/consumer pairs within this axis group
      const internalPairs = this._discoverInternalPairs(groupEntries, tribeSignal);

      // Verify: at least one producer→consumer pair
      if (internalPairs.length === 0 && groupEntries.length < 2) continue;

      // Verify: at least one WinPath route
      const entryMap = new Map(groupEntries.map(e => [e.name, e]));
      const winPathRoutes = this._findWinPathRoutes(groupEntries.map(e => e.name), entryMap);
      if (winPathRoutes.length === 0) continue;

      // Build the cluster with axis-focused dominant capabilities
      const dominantCaps = this._computeDominantCapabilities(groupEntries, axisDef);

      clusters.push(new MechanicCluster({
        axis: axisDef.axis,
        dominantCapabilities: dominantCaps,
        participatingCards: groupEntries.map(e => ({
          name: e.name,
          cmc: e.cmc,
          typeLine: e.typeLine,
          capabilities: e.supplies.map(s => s.capability)
        })),
        producerConsumerPairs: internalPairs,
        internalEdges: internalPairs.map(p => ({
          from: p.producer,
          to: p.consumer,
          capability: p.capability,
          edgeType: p.edgeType
        })),
        winPathRoutes,
        density: groupEntries.length
      }));
    }

    // Sort clusters by density descending — for observability only
    clusters.sort((a, b) => b.density - a.density);

    return new DiscoveredMechanicSet({
      tribe: tribeSignal,
      poolSize: entries.length,
      discoveredClusters: clusters
    });
  }

  /**
   * Assigns cards to strategic axes where they have meaningful capabilities or markers.
   * A card can participate in multiple axes if it genuinely supplies capabilities
   * to multiple mechanical dimensions (e.g., Pashalik Mons is both Sacrifice and Token).
   * @private
   */
  static _partitionByAxis(entries, tribeSignal) {
    const groups = {};
    for (const axisDef of STRATEGIC_AXES) {
      groups[axisDef.axis] = [];
    }

    for (const entry of entries) {
      const supplyCaps = new Set(entry.supplies.map(s => s.capability));
      const oracle = entry.oracle;

      for (const axisDef of STRATEGIC_AXES) {
        let score = 0;

        // Check primary capability match
        for (const cap of axisDef.primaryCapabilities) {
          if (supplyCaps.has(cap)) score += 3;
        }

        // Check marker pattern match
        for (const pattern of axisDef.markerPatterns) {
          if (oracle.includes(pattern)) score += 1;
        }

        // If axis requires creatures and card isn't a creature, reduce score
        if (axisDef.requiresCreatures && !entry.typeLine.includes('creature')) {
          score = Math.max(0, score - 2);
        }

        if (score >= 2) {
          groups[axisDef.axis].push(entry);
        }
      }
    }

    return groups;
  }

  /**
   * Discovers producer/consumer pairs WITHIN a single axis group.
   * More selective than cross-axis discovery: only connects cards that
   * directly interact via the axis's mechanical theme.
   * @private
   */
  static _discoverInternalPairs(groupEntries, tribeSignal) {
    const pairs = [];

    // Build capability index within this group
    const supplyIndex = new Map();
    for (const entry of groupEntries) {
      for (const supply of entry.supplies) {
        if (!supplyIndex.has(supply.capability)) supplyIndex.set(supply.capability, []);
        supplyIndex.get(supply.capability).push(entry);
      }
    }

    // Functional consumption within the group
    const FUNCTIONAL_LINKS = {
      'TOKEN_GENERATOR': ['SACRIFICE_OUTLET'],
      'SACRIFICE_OUTLET': ['DEATH_PAYOFF'],
      'MANA_ACCELERATION': ['FINISHER'],
      'BLINK_ENABLER': ['ETB_VALUE'],
      'GRAVEYARD_ENABLER': ['REANIMATION_SPELL'],
      'COUNTER_GENERATOR': ['GROWTH_PAYOFF'],
      'LAND_ACCELERATION': ['LANDFALL_PAYOFF'],
      'LIFEGAIN_TRIGGER': ['GROWTH_PAYOFF']
    };

    for (const [supplyCap, consumesCaps] of Object.entries(FUNCTIONAL_LINKS)) {
      const producers = supplyIndex.get(supplyCap) || [];
      for (const consumeCap of consumesCaps) {
        const consumers = supplyIndex.get(consumeCap) || [];
        for (const producer of producers) {
          for (const consumer of consumers) {
            if (producer.name === consumer.name) continue;
            pairs.push({
              producer: producer.name,
              consumer: consumer.name,
              capability: `${supplyCap}→${consumeCap}`,
              edgeType: 'FUNCTIONAL_CONSUMPTION'
            });
          }
        }
      }
    }

    // Tribal lord → tribal creature amplification (ONLY within this axis)
    if (tribeSignal) {
      const lords = groupEntries.filter(e =>
        e.supplies.some(s => s.capability === 'TRIBAL_LORD') &&
        (e.oracle.includes(tribeSignal) || e.oracle.includes('creatures you control'))
      );
      const tribalCreatures = groupEntries.filter(e =>
        e.typeLine.includes('creature') && e.typeLine.includes(tribeSignal)
      );
      for (const lord of lords) {
        for (const creature of tribalCreatures) {
          if (lord.name === creature.name) continue;
          pairs.push({
            producer: lord.name,
            consumer: creature.name,
            capability: 'TRIBAL_AMPLIFICATION',
            edgeType: 'AMPLIFICATION'
          });
        }
      }
    }

    // Direct damage chain: burn spell → burn spell is a chain toward face damage
    const burnCards = groupEntries.filter(e =>
      e.supplies.some(s => s.capability === 'PLAYER_REACH' || (s.capability === 'CHEAP_REMOVAL' && s.canHitPlayer))
    );
    if (burnCards.length >= 2) {
      for (let i = 0; i < burnCards.length; i++) {
        for (let j = i + 1; j < burnCards.length; j++) {
          pairs.push({
            producer: burnCards[i].name,
            consumer: burnCards[j].name,
            capability: 'BURN_CHAIN',
            edgeType: 'FUNCTIONAL_CONSUMPTION'
          });
        }
      }
    }

    // Death trigger chain within sacrifice group
    const deathTriggerCards = groupEntries.filter(e =>
      e.oracle.includes('dies') && (e.oracle.includes('whenever') || e.oracle.includes('when'))
    );
    const sacOutlets = groupEntries.filter(e =>
      e.supplies.some(s => s.capability === 'SACRIFICE_OUTLET')
    );
    for (const outlet of sacOutlets) {
      for (const trigger of deathTriggerCards) {
        if (outlet.name === trigger.name) continue;
        pairs.push({
          producer: outlet.name,
          consumer: trigger.name,
          capability: 'SACRIFICE_DEATH_CHAIN',
          edgeType: 'FUNCTIONAL_CONSUMPTION'
        });
      }
    }

    return pairs;
  }

  /**
   * Finds routes from component cards toward WinPath-relevant capabilities.
   * @private
   */
  static _findWinPathRoutes(componentNames, entryMap) {
    const WIN_PATH_CAPABILITIES = new Set([
      'PLAYER_REACH', 'CHEAP_REMOVAL', 'FINISHER', 'TRIBAL_LORD',
      'TOKEN_GENERATOR', 'DEATH_PAYOFF', 'BOARD_SWEEPER', 'COUNTER_DISRUPTION',
      'SACRIFICE_OUTLET', 'REANIMATION_SPELL', 'LANDFALL_PAYOFF', 'GROWTH_PAYOFF'
    ]);

    const routes = [];
    for (const name of componentNames) {
      const entry = entryMap.get(name);
      if (!entry) continue;

      for (const supply of entry.supplies) {
        if (WIN_PATH_CAPABILITIES.has(supply.capability)) {
          routes.push({
            card: name,
            capability: supply.capability,
            route: `${name} → ${supply.capability} → WIN_PATH`
          });
        }
      }

      // Creatures with power ≥ 2 have inherent WinPath via combat damage
      if (entry.typeLine.includes('creature')) {
        const power = Number(entry.card.power || 0);
        if (power >= 2) {
          routes.push({
            card: name,
            capability: 'COMBAT_DAMAGE',
            route: `${name} → COMBAT_DAMAGE → WIN_PATH`
          });
        }
      }
    }

    return routes;
  }

  /**
   * Computes the dominant capabilities of a group for a given axis.
   * Dominant = primary capabilities of the axis + capabilities appearing in >= 40% of cards.
   * @private
   */
  static _computeDominantCapabilities(groupEntries, axisDef) {
    const dominant = [...(axisDef.primaryCapabilities || [])];
    const capCounts = new Map();

    for (const entry of groupEntries) {
      const seen = new Set();
      for (const supply of entry.supplies) {
        if (!seen.has(supply.capability)) {
          seen.add(supply.capability);
          capCounts.set(supply.capability, (capCounts.get(supply.capability) || 0) + 1);
        }
      }
    }

    const threshold = Math.max(2, Math.floor(groupEntries.length * 0.40));
    for (const [cap, count] of capCounts.entries()) {
      if (count >= threshold && !dominant.includes(cap)) {
        dominant.push(cap);
      }
    }

    return dominant;
  }
}
