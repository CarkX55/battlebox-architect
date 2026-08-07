/**
 * src/services/compiler/core/packageBasedBuilder.js
 * 
 * PackageBasedBuilder: Macro Strategic Package Constructor v1.0.
 * Assembles the deck by allocating complete macro packages first (e.g. GIANTS_STOMP_PACKAGE, EARLY_RAMP_PACKAGE)
 * before individual slot optimization.
 */

import { FunctionalPackageLibrary } from './functionalPackageLibrary.js';

export class PackageBasedBuilder {
  /**
   * Assembles macro packages based on DeckIdentity.
   * 
   * @param {import('./deckIdentityModel.js').DeckIdentity} deckIdentity 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage 
   * @returns {{ allocatedPackages: Array<Object>, totalPackageDensity: number, assemblyLog: string }}
   */
  static assembleMacroPackages(deckIdentity, intentPackage) {
    const mandatoryPackages = deckIdentity ? (deckIdentity.mandatoryPackages || []) : [];
    const allocatedPackages = [];
    let totalPackageDensity = 0;

    for (const pkgId of mandatoryPackages) {
      const pkg = FunctionalPackageLibrary.getPackage(pkgId);
      if (pkg) {
        allocatedPackages.push(pkg);
        totalPackageDensity += pkg.requiredSlotsCount;
      }
    }

    const assemblyLog = `Ensamblados ${allocatedPackages.length} paquetes funcionales macro (${totalPackageDensity} slots reservados por identidad).`;

    return {
      allocatedPackages: Object.freeze(allocatedPackages),
      totalPackageDensity,
      assemblyLog
    };
  }
}
