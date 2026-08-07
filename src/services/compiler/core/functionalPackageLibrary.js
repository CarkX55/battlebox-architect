/**
 * src/services/compiler/core/functionalPackageLibrary.js
 * 
 * FunctionalPackageLibrary: Reusable Macro Strategic Package System v1.0.
 * Allows the solver to operate on macro strategic packages rather than single isolated cards.
 */

export class FunctionalPackageLibrary {
  /**
   * Retrieves a reusable functional package by key.
   * 
   * @param {string} packageId 
   * @returns {{ packageId: string, name: string, roles: Array<string>, requiredSlotsCount: number, synergyBonus: number }}
   */
  static getPackage(packageId = 'GIANTS_STOMP_PACKAGE') {
    const packages = {
      GIANTS_STOMP_PACKAGE: {
        packageId: 'GIANTS_STOMP_PACKAGE',
        name: 'Giants Tribal Stomp Package',
        roles: Object.freeze(['Cost Reduction', 'Early Ramp', 'Stomp Engine', 'Large Threats', 'Reach']),
        requiredSlotsCount: 16,
        synergyBonus: 25
      },
      EARLY_RAMP_PACKAGE: {
        packageId: 'EARLY_RAMP_PACKAGE',
        name: 'Early Mana Acceleration Package',
        roles: Object.freeze(['Mana Dork', 'Ramp Spell', 'Dual Lands', 'Payoff']),
        requiredSlotsCount: 12,
        synergyBonus: 20
      },
      HUMANS_GO_WIDE_PACKAGE: {
        packageId: 'HUMANS_GO_WIDE_PACKAGE',
        name: 'Humans Go-Wide Swarm Package',
        roles: Object.freeze(['Cheap Humans', 'Anthem Buff', 'Recruitment Engine', 'Protection']),
        requiredSlotsCount: 16,
        synergyBonus: 22
      }
    };

    return packages[packageId] || packages.GIANTS_STOMP_PACKAGE;
  }
}
