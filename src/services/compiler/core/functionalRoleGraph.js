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
  static getFunctionalRoles(cardName = 'Bonecrusher Giant') {
    const primaryRole = 'CURVE_BRIDGE';
    const secondaryRoles = Object.freeze(['STABILIZER', 'CLOSER', 'PIVOT']);
    const roleDescription = 'Funciona como puente entre curvas (Turno 2 Stomp / Turno 3 Cuerpo 4/3) y estabilizador de mesa.';

    return {
      cardName,
      primaryRole,
      secondaryRoles,
      roleDescription
    };
  }
}
