/**
 * src/services/compiler/core/dependencyResolver.js
 * 
 * DependencyResolver & DependencyStrength Engine v1.2.
 * Categorizes dependencies by strength:
 *   - MANDATORY: Non-negotiable requirement.
 *   - RECOMMENDED: Strong strategic preference.
 *   - CONDITIONAL: Activated when specific cards exist.
 *   - OPTIONAL: Flexible bonus.
 */

import { StrategicGraph } from './strategicGraph.js';

export const DependencyStrength = Object.freeze({
  MANDATORY: 'MANDATORY',
  RECOMMENDED: 'RECOMMENDED',
  CONDITIONAL: 'CONDITIONAL',
  OPTIONAL: 'OPTIONAL'
});

export class DependencyResolver {
  /**
   * Resolves implicit requirement dependencies with explicit strength tiers.
   * 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage
   * @param {StrategicGraph} strategicGraph
   * @returns {Array<Object>}
   */
  static resolveDependencies(intentPackage, strategicGraph = new StrategicGraph()) {
    const expandedRequirements = [];

    const isAggro = intentPackage.tempo === 'Aggro';
    const primaryTribe = intentPackage.primaryTribe;
    const mechanics = intentPackage.mechanics || [];
    const strategy = intentPackage.strategy || [];
    const powerLevel = intentPackage.powerLevel || 'Competitive';

    // MANDATORY Base Requirements
    expandedRequirements.push({
      id: 'TURN1_PRESSURE',
      target: isAggro ? 12 : 4,
      weight: 10,
      strength: isAggro ? DependencyStrength.MANDATORY : DependencyStrength.RECOMMENDED
    });

    expandedRequirements.push({
      id: 'CHEAP_REMOVAL',
      target: 6,
      weight: 7,
      strength: DependencyStrength.MANDATORY
    });

    expandedRequirements.push({
      id: 'MANA_BASE',
      target: intentPackage.format === 'COMMANDER' ? 36 : 24,
      weight: 10,
      strength: DependencyStrength.MANDATORY
    });

    // Mechanics-based dependency chain expansion
    if (mechanics.length > 0) {
      expandedRequirements.push({
        id: 'BOARD_PRESENCE',
        target: 12,
        weight: 8,
        strength: DependencyStrength.RECOMMENDED,
        rationale: `Mechanics dependency for ${mechanics.join(', ')}`
      });
    }

    // Strategy & Power Level dependency chain expansion
    if (strategy.length > 0 || powerLevel === 'Competitive') {
      expandedRequirements.push({
        id: 'CARD_FLOW',
        target: 8,
        weight: 7,
        strength: DependencyStrength.RECOMMENDED,
        rationale: `Strategic flow for ${strategy.join(', ') || powerLevel}`
      });
    }

    // Implicit Dependency Chains with Strength Tiers
    if (primaryTribe) {
      expandedRequirements.push({
        id: 'TRIBAL_DENSITY',
        target: 18,
        weight: 9,
        strength: DependencyStrength.MANDATORY,
        rationale: `Mandatory Tribal Density requirement for ${primaryTribe}`
      });

      expandedRequirements.push({
        id: 'BOARD_PRESENCE',
        target: 16,
        weight: 8,
        strength: DependencyStrength.RECOMMENDED,
        rationale: `Recommended Board Presence to maximize tribal synergy`
      });

      expandedRequirements.push({
        id: 'CARD_FLOW',
        target: 8,
        weight: 6,
        strength: DependencyStrength.CONDITIONAL,
        rationale: `Conditional Card Flow to sustain gowide pressure`
      });
    }

    return Object.freeze(expandedRequirements);
  }
}
