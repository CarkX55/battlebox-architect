/**
 * src/services/compiler/core/strategicMemoryModel.js
 * 
 * StrategicMemoryModel: V29.0 Strategic Knowledge Layer.
 * 
 * Central abstraction of V29.0: a pool-dependent model of relationships:
 *   TRIBE → MECHANICS → STRATEGIC LINES → VIABILITY → WIN CONDITIONS
 * 
 * A strategic line is a connected causal substructure capable of fulfilling
 * a win condition. It can emerge from a single cohesive cluster or from
 * the combination of several.
 * 
 * Viability is measured via multivariate hypergeometric probability,
 * NOT via formulas with invented constants (no `arity × 2 × 1.5`).
 * 
 * Axioms:
 *   1. Pool-dependent: the memory changes with the pool.
 *   2. No hardcoded strategy catalogues.
 *   3. Viability with evidence, not with invented formulas.
 *   4. A tribe is NOT a strategy. Tribe and strategy are separate layers.
 *   5. IDs/labels are observability artifacts, never feed selection decisions.
 *   6. Deterministic and reproducible.
 */

import { MechanicDiscoveryEngine, DiscoveredMechanicSet, MechanicCluster } from './mechanicDiscoveryEngine.js';

// ─── Win Condition Types (derived from capabilities, not from a catalogue) ───
const WIN_CONDITION_PATTERNS = [
  {
    requiredCapabilities: [['DAYBOUND_NIGHTBOUND', 'STATE_TRANSITION_ENGINE', 'TRANSFORM_PAYOFF'], ['NIGHT_PAYOFF', 'COMBAT_DAMAGE', 'STATE_TRANSITION_CONTROLLER']],
    condition: 'STATE_TRANSITION_PRESSURE',
    description: 'Transform board state via Daybound/Nightbound for amplified combat pressure'
  },
  {
    requiredCapabilities: [['COMBAT_DAMAGE'], ['COUNTER_DISRUPTION', 'CHEAP_REMOVAL']],
    condition: 'TEMPO_BEATDOWN',
    description: 'Deploy aggressive threats and protect them with cheap disruption'
  },
  {
    requiredCapabilities: [['PLAYER_REACH'], ['CHEAP_REMOVAL']],
    condition: 'BURN_LETHAL',
    description: 'Reduce opponent life to zero via direct damage spells'
  },
  {
    requiredCapabilities: [['TRIBAL_LORD'], ['COMBAT_DAMAGE']],
    condition: 'AMPLIFIED_COMBAT',
    description: 'Overwhelm via amplified creature combat damage'
  },
  {
    requiredCapabilities: [['TOKEN_GENERATOR'], ['TRIBAL_LORD']],
    condition: 'SWARM_OVERRUN',
    description: 'Generate tokens and amplify for lethal alpha strike'
  },
  {
    requiredCapabilities: [['SACRIFICE_OUTLET'], ['DEATH_PAYOFF']],
    condition: 'DRAIN_ATTRITION',
    description: 'Convert creature deaths into opponent life loss'
  },
  {
    requiredCapabilities: [['MANA_ACCELERATION'], ['FINISHER']],
    condition: 'RAMP_TO_FINISHER',
    description: 'Accelerate mana to deploy overwhelming finisher threats'
  },
  {
    requiredCapabilities: [['REANIMATION_SPELL'], ['FINISHER']],
    condition: 'REANIMATE_THREAT',
    description: 'Cheat large threats from graveyard onto battlefield'
  },
  {
    requiredCapabilities: [['GRAVEYARD_ENABLER'], ['REANIMATION_SPELL']],
    condition: 'GRAVEYARD_ENGINE',
    description: 'Self-mill into reanimation targets for recursive value'
  },
  {
    requiredCapabilities: [['BLINK_ENABLER'], ['ETB_VALUE']],
    condition: 'ETB_VALUE_ENGINE',
    description: 'Repeatedly trigger ETB effects for incremental advantage'
  },
  {
    requiredCapabilities: [['COUNTER_GENERATOR'], ['GROWTH_PAYOFF']],
    condition: 'COUNTER_GROWTH',
    description: 'Accumulate counters for scaling threats'
  },
  {
    requiredCapabilities: [['LAND_ACCELERATION'], ['LANDFALL_PAYOFF']],
    condition: 'LANDFALL_ENGINE',
    description: 'Trigger landfall repeatedly for scaling value'
  },
  {
    requiredCapabilities: [['LIFEGAIN_TRIGGER'], ['GROWTH_PAYOFF']],
    condition: 'LIFEGAIN_PAYOFF',
    description: 'Convert lifegain into board presence or card advantage'
  },
  {
    requiredCapabilities: [['CARD_FLOW'], ['COMBAT_DAMAGE']],
    condition: 'VALUE_ATTRITION',
    description: 'Out-advantage opponent with continuous card flow and creature pressure'
  },
  {
    requiredCapabilities: [['MANA_ACCELERATION'], ['ETB_VALUE']],
    condition: 'COMBO_ENGINE',
    description: 'Assemble infinite or explosive loops through accelerated mana and repeated ETBs'
  },
  {
    // Fallback: any cluster with creatures that can deal combat damage
    requiredCapabilities: [['COMBAT_DAMAGE']],
    condition: 'COMBAT_PRESSURE',
    description: 'Reduce opponent life via sustained creature combat'
  }
];

/**
 * Immutable representation of a discovered strategic line.
 */
export class StrategicLine {
  constructor({
    sourceClusters = [],
    winCondition = {},
    dominantCapabilities = [],
    criticalRoles = [],
    executionProbability = 0,
    viability = 'NOT_VIABLE',
    evidence = {},
    participatingCardNames = []
  } = {}) {
    this.sourceClusters = Object.freeze([...sourceClusters]);
    this.winCondition = Object.freeze({ ...winCondition });
    this.dominantCapabilities = Object.freeze([...dominantCapabilities]);
    this.criticalRoles = Object.freeze([...criticalRoles]);
    this.executionProbability = executionProbability;
    this.viability = viability; // 'VIABLE' | 'SUPPORTED' | 'NOT_VIABLE'
    this.evidence = Object.freeze({ ...evidence });
    this.participatingCardNames = Object.freeze([...participatingCardNames]);

    // Observability label — NEVER used for selection
    this._observabilityLabel = dominantCapabilities.slice(0, 3).join('_') + '__' + (winCondition.condition || 'UNKNOWN');
    Object.freeze(this);
  }

  get label() { return this._observabilityLabel; }
}

/**
 * Immutable strategic memory for a tribe/pool combination.
 */
export class StrategicMemory {
  constructor({
    identity = null,
    pool = {},
    observedMechanics = [],
    viableLines = [],
    failedLines = [],
    confidence = 0,
    poolDependent = true
  } = {}) {
    this.identity = identity;
    this.pool = Object.freeze({ ...pool });
    this.observedMechanics = Object.freeze([...observedMechanics]);
    this.viableLines = Object.freeze([...viableLines]);
    this.failedLines = Object.freeze([...failedLines]);
    this.confidence = confidence;
    this.poolDependent = poolDependent;
    Object.freeze(this);
  }
}

export class StrategicMemoryModel {
  /**
   * Builds a StrategicMemory from a DiscoveredMechanicSet.
   * 
   * @param {Object} params
   * @param {DiscoveredMechanicSet} params.discoveredMechanics
   * @param {import('./intentPackage.js').IntentPackage} params.intentPackage
   * @param {number} [params.deckSize=60]
   * @param {number} [params.handSize=7]
   * @returns {StrategicMemory}
   */
  static buildMemory({ discoveredMechanics, intentPackage = {}, deckSize = 60, handSize = 7 } = {}) {
    const format = (intentPackage.format || 'STANDARD').toUpperCase();
    const isCommander = format === 'COMMANDER' || format === 'EDH' || format === 'BRAWL';
    const effectiveDeckSize = isCommander ? 99 : deckSize;
    const effectiveHandSize = isCommander ? 7 : handSize;

    const clusters = discoveredMechanics.discoveredClusters || [];

    // 1. Derive strategic lines from clusters
    const candidateLines = this._deriveStrategicLines(clusters);

    // 2. Evaluate viability of each line
    const evaluatedLines = candidateLines.map(line =>
      this._evaluateLineViability(line, effectiveDeckSize, effectiveHandSize)
    );

    // 3. Separate viable from failed
    const viableLines = evaluatedLines
      .filter(l => l.viability === 'VIABLE' || l.viability === 'SUPPORTED')
      .sort((a, b) => b.executionProbability - a.executionProbability);

    const failedLines = evaluatedLines
      .filter(l => l.viability === 'NOT_VIABLE')
      .sort((a, b) => b.executionProbability - a.executionProbability);

    // 4. Compute confidence as ratio of viable lines to candidate lines
    const confidence = candidateLines.length > 0
      ? viableLines.length / candidateLines.length
      : 0;

    return new StrategicMemory({
      identity: discoveredMechanics.tribe,
      pool: {
        format,
        size: discoveredMechanics.poolSize,
        colors: intentPackage.colors || []
      },
      observedMechanics: clusters.map(c => ({
        label: c.label,
        dominantCapabilities: c.dominantCapabilities,
        density: c.density,
        cardCount: c.participatingCards.length
      })),
      viableLines,
      failedLines,
      confidence,
      poolDependent: true
    });
  }

  /**
   * Derives strategic lines from clusters.
   * A line exists when a connected causal substructure can fulfill a win condition.
   * Can emerge from 1 cluster or from combining multiple.
   * @private
   */
  static _deriveStrategicLines(clusters) {
    const lines = [];

    // 1. Single-cluster lines: does any individual cluster reach a win condition?
    for (const cluster of clusters) {
      const clusterCaps = this._gatherAllCapabilities(cluster);
      const matchingConditions = this._findMatchingWinConditions(clusterCaps);

      for (const wc of matchingConditions) {
        const criticalRoles = this._deriveCriticalRoles(cluster, wc);
        lines.push({
          sourceClusters: [cluster],
          winCondition: wc,
          dominantCapabilities: cluster.dominantCapabilities,
          criticalRoles,
          participatingCardNames: cluster.participatingCards.map(c => c.name)
        });
      }
    }

    // 2. Multi-cluster lines: does combining 2 clusters reach an emergent win condition
    //    that NEITHER cluster reaches alone?
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const combinedCaps = new Set([
          ...this._gatherAllCapabilities(clusters[i]),
          ...this._gatherAllCapabilities(clusters[j])
        ]);
        const matchingConditions = this._findMatchingWinConditions(combinedCaps);

        const capsI = this._gatherAllCapabilities(clusters[i]);
        const capsJ = this._gatherAllCapabilities(clusters[j]);

        for (const wc of matchingConditions) {
          const iAlone = this._findMatchingWinConditions(capsI).some(w => w.condition === wc.condition);
          const jAlone = this._findMatchingWinConditions(capsJ).some(w => w.condition === wc.condition);

          if (!iAlone && !jAlone) {
            // Emergent multi-cluster line!
            const combinedCards = [
              ...clusters[i].participatingCards.map(c => c.name),
              ...clusters[j].participatingCards.map(c => c.name)
            ];
            const uniqueCards = [...new Set(combinedCards)];
            const combinedDominant = [...new Set([
              ...clusters[i].dominantCapabilities,
              ...clusters[j].dominantCapabilities
            ])];

            const criticalRoles = this._deriveCriticalRolesFromClusters([clusters[i], clusters[j]], wc);

            lines.push({
              sourceClusters: [clusters[i], clusters[j]],
              winCondition: wc,
              dominantCapabilities: combinedDominant,
              criticalRoles,
              participatingCardNames: uniqueCards
            });
          }
        }
      }
    }

    // Deduplicate lines with identical win conditions and >80% card overlap
    return this._deduplicateLines(lines);
  }

  /**
   * Evaluates the viability of a strategic line using hypergeometric probability.
   * 
   * For each critical role, computes:
   *   P(≥1 card of this role in opening hand | N cards of this role in deck)
   * 
   * The line's execution probability is the product of all critical role probabilities.
   * 
   * Viability thresholds:
   *   VIABLE:      P(execution) ≥ 0.50
   *   SUPPORTED:   0.25 ≤ P(execution) < 0.50
   *   NOT_VIABLE:  P(execution) < 0.25
   * 
   * @private
   */
  static _evaluateLineViability(lineCandidate, deckSize, handSize) {
    const criticalRoles = lineCandidate.criticalRoles;

    if (criticalRoles.length === 0) {
      return new StrategicLine({
        ...lineCandidate,
        executionProbability: 0,
        viability: 'NOT_VIABLE',
        evidence: { reason: 'No critical roles identified for this line' }
      });
    }

    // Execution window: by turn 4, player has seen handSize + 3 cards (10 cards in 60-card deck)
    const drawWindow = Math.min(deckSize, handSize + 3);

    // For each critical role, compute P(≥1 across execution window)
    const roleEvaluations = criticalRoles.map(role => {
      const available = role.availableCards;
      const included = Math.min(available, Math.floor(deckSize * 0.4)); // can't exceed 40% of deck

      const prob = this._hypergeometricAtLeastOne(deckSize, included, drawWindow);

      // Inverse: minimum cards needed for P ≥ 0.88 across execution window
      const minimumForTarget = this._inverseHypergeometric(deckSize, drawWindow, 0.88);

      return {
        role: role.role,
        availableCards: available,
        includedEstimate: included,
        probability: prob,
        minimumForTarget,
        isSufficient: available >= minimumForTarget
      };
    });

    // Execution probability = product of all role probabilities
    const executionProbability = roleEvaluations.reduce((acc, r) => acc * r.probability, 1.0);

    let viability = 'NOT_VIABLE';
    if (executionProbability >= 0.40) {
      viability = 'VIABLE';
    } else if (executionProbability >= 0.20) {
      viability = 'SUPPORTED';
    }

    // Check for critical insufficiency: any role with 0 available cards
    const hasCriticalGap = roleEvaluations.some(r => r.availableCards === 0);
    if (hasCriticalGap) {
      viability = 'NOT_VIABLE';
    }

    return new StrategicLine({
      ...lineCandidate,
      executionProbability: Number(executionProbability.toFixed(4)),
      viability,
      evidence: {
        roleEvaluations,
        hasCriticalGap,
        deckSize,
        handSize
      }
    });
  }

  /**
   * Gathers ALL capabilities (supply + WinPath routes) from a cluster.
   * @private
   */
  static _gatherAllCapabilities(cluster) {
    const caps = new Set(cluster.dominantCapabilities);
    for (const card of cluster.participatingCards) {
      if (card.capabilities) {
        card.capabilities.forEach(c => caps.add(c));
      }
    }
    for (const route of cluster.winPathRoutes) {
      caps.add(route.capability);
    }
    return caps;
  }

  /**
   * Finds which WIN_CONDITION_PATTERNS are satisfiable by the given capabilities.
   * @private
   */
  static _findMatchingWinConditions(capabilitySet) {
    return WIN_CONDITION_PATTERNS.filter(pattern => {
      return pattern.requiredCapabilities.every(group =>
        group.some(cap => capabilitySet.has(cap))
      );
    });
  }

  /**
   * Derives critical functional roles from a cluster for a given win condition.
   * A critical role is a functional requirement that must be present in sufficient density.
   * @private
   */
  static _deriveCriticalRoles(cluster, winCondition) {
    const roles = [];
    const capCountMap = new Map();

    for (const card of cluster.participatingCards) {
      for (const cap of (card.capabilities || [])) {
        capCountMap.set(cap, (capCountMap.get(cap) || 0) + 1);
      }
    }

    // Each required capability group in the win condition is a critical role
    for (const group of winCondition.requiredCapabilities) {
      for (const cap of group) {
        const count = capCountMap.get(cap) || 0;
        if (count > 0) {
          roles.push({
            role: cap,
            availableCards: count,
            source: 'SINGLE_CLUSTER'
          });
          break; // only need one from the group
        }
      }
    }

    return roles;
  }

  /**
   * Derives critical roles from multiple clusters combined.
   * @private
   */
  static _deriveCriticalRolesFromClusters(clusters, winCondition) {
    const capCountMap = new Map();
    for (const cluster of clusters) {
      for (const card of cluster.participatingCards) {
        for (const cap of (card.capabilities || [])) {
          capCountMap.set(cap, (capCountMap.get(cap) || 0) + 1);
        }
      }
    }

    const roles = [];
    for (const group of winCondition.requiredCapabilities) {
      for (const cap of group) {
        const count = capCountMap.get(cap) || 0;
        if (count > 0) {
          roles.push({
            role: cap,
            availableCards: count,
            source: 'MULTI_CLUSTER'
          });
          break;
        }
      }
    }

    return roles;
  }

  /**
   * Deduplicates lines with identical win conditions and >80% card overlap.
   * Keeps the one with more participating cards.
   * @private
   */
  static _deduplicateLines(lines) {
    const kept = [];
    for (const line of lines) {
      const isDuplicate = kept.some(existing => {
        if (existing.winCondition.condition !== line.winCondition.condition) return false;
        const overlap = line.participatingCardNames.filter(n =>
          existing.participatingCardNames.includes(n)
        ).length;
        const maxSize = Math.max(existing.participatingCardNames.length, line.participatingCardNames.length);
        return maxSize > 0 && (overlap / maxSize) > 0.80;
      });

      if (!isDuplicate) {
        kept.push(line);
      } else {
        // Replace if this one has more cards
        const existingIdx = kept.findIndex(existing => {
          if (existing.winCondition.condition !== line.winCondition.condition) return false;
          const overlap = line.participatingCardNames.filter(n =>
            existing.participatingCardNames.includes(n)
          ).length;
          const maxSize = Math.max(existing.participatingCardNames.length, line.participatingCardNames.length);
          return maxSize > 0 && (overlap / maxSize) > 0.80;
        });
        if (existingIdx >= 0 && line.participatingCardNames.length > kept[existingIdx].participatingCardNames.length) {
          kept[existingIdx] = line;
        }
      }
    }
    return kept;
  }

  // ─── Hypergeometric Probability Functions ───

  /**
   * P(X ≥ 1) when drawing `draw` cards from a population of `N` containing `K` successes.
   * P(X ≥ 1) = 1 - P(X = 0) = 1 - C(K,0)*C(N-K,draw) / C(N,draw)
   * @private
   */
  static _hypergeometricAtLeastOne(N, K, draw) {
    if (K <= 0 || N <= 0 || draw <= 0) return 0;
    if (K >= N) return 1;
    if (draw >= N) return K > 0 ? 1 : 0;

    // P(X=0) = C(N-K, draw) / C(N, draw)
    // Use log-space to avoid overflow
    const logP0 = this._logCombination(N - K, draw) - this._logCombination(N, draw);
    const p0 = Math.exp(logP0);
    return Math.max(0, Math.min(1, 1 - p0));
  }

  /**
   * Inverse hypergeometric: find minimum K such that P(≥1 in draw from N) ≥ targetP.
   * @private
   */
  static _inverseHypergeometric(N, draw, targetP) {
    for (let K = 1; K <= N; K++) {
      if (this._hypergeometricAtLeastOne(N, K, draw) >= targetP) {
        return K;
      }
    }
    return N;
  }

  /**
   * Log of C(n, k) using Stirling-compatible log-gamma.
   * @private
   */
  static _logCombination(n, k) {
    if (k < 0 || k > n) return -Infinity;
    if (k === 0 || k === n) return 0;
    return this._logFactorial(n) - this._logFactorial(k) - this._logFactorial(n - k);
  }

  /**
   * Log factorial via Lanczos approximation for large n, exact for small n.
   * @private
   */
  static _logFactorial(n) {
    if (n <= 1) return 0;
    if (n <= 20) {
      let result = 0;
      for (let i = 2; i <= n; i++) result += Math.log(i);
      return result;
    }
    // Stirling approximation for large n
    return n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n) + 1 / (12 * n);
  }
}
