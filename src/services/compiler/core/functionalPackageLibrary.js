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
  static getPackage(packageId = 'GENERIC_CORE_PACKAGE') {
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
      },
      GOBLIN_CORE_PACKAGE: {
        packageId: 'GOBLIN_CORE_PACKAGE',
        name: 'Goblin Aggro & Burn Swarm Package',
        roles: Object.freeze(['Turn 1 Attackers', 'Goblin Lords', 'Haste Enablers', 'Burn Reach', 'Removal']),
        requiredSlotsCount: 16,
        synergyBonus: 26
      },
      ZOMBIE_CORE_PACKAGE: {
        packageId: 'ZOMBIE_CORE_PACKAGE',
        name: 'Zombie Graveyard & Aristocrats Package',
        roles: Object.freeze(['Recursive Fodder', 'Sacrifice Outlets', 'Death Payoffs', 'Zombie Lords']),
        requiredSlotsCount: 16,
        synergyBonus: 24
      }
    };

    if (packages[packageId]) return packages[packageId];

    // Dynamic builder for any custom archetype or tribe
    const cleanName = packageId.replace(/_/g, ' ').toLowerCase();
    const isAggro = cleanName.includes('aggro') || cleanName.includes('goblin') || cleanName.includes('burn');
    const isRamp = cleanName.includes('ramp') || cleanName.includes('hydra') || cleanName.includes('dragon');
    const isControl = cleanName.includes('control');

    let dynamicRoles = ['Core Engine', 'Synergy Payoff', 'Board Presence', 'Interaction'];
    if (isAggro) {
      dynamicRoles = ['Turn 1 Pressure', 'Turn 2 Pressure', 'Tribal Synergies', 'Burn Reach', 'Cheap Removal'];
    } else if (isRamp) {
      dynamicRoles = ['Mana Acceleration', 'Ramp Fixing', 'Mid-Curve Threat', 'Colossal Finisher'];
    } else if (isControl) {
      dynamicRoles = ['Cheap Interaction', 'Counterspells', 'Card Advantage Engine', 'Sweeper Finisher'];
    }

    return {
      packageId,
      name: `${packageId.replace(/_/g, ' ')} Package`,
      roles: Object.freeze(dynamicRoles),
      requiredSlotsCount: 16,
      synergyBonus: 24
    };
  }
}
