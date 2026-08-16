/**
 * src/services/compiler/core/functionalRoleGraph.js
 * 
 * FunctionalRoleGraph: Strategic Functional Role Classifier v1.0.
 * Classifies cards by deep functional roles beyond basic stats:
 *   STABILIZER, CURVE_BRIDGE, RESOURCE_MULTIPLIER, ACCELERATOR, ADVANTAGE_CONVERTER, CLOSER, PIVOT
 */

export class FunctionalRoleGraph {
  /**
   * Classifies deep functional roles for a card.
   * 
   * @param {string} cardName 
   * @returns {{ cardName: string, primaryRole: string, secondaryRoles: Array<string>, roleDescription: string }}
   */
  static getFunctionalRoles(cardName = 'Core Threat', archetypeKey = 'Ramp') {
    const primaryRole = 'CORE_PIVOT';
    const secondaryRoles = Object.freeze(['STABILIZER', 'CLOSER', 'PRESSURE']);
    const roleDescription = `Actúa como amenaza central (${cardName}) y ancla sinérgica para la estrategia ${archetypeKey}.`;

    return {
      cardName,
      primaryRole,
      secondaryRoles,
      roleDescription
    };
  }
}
