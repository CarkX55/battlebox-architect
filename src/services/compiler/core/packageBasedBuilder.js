import { FunctionalPackageLibrary } from './functionalPackageLibrary.js';
import { EmergentCausalPackageAssembler } from './emergentCausalPackageAssembler.js';

export class PackageBasedBuilder {
  /**
   * Assembles macro packages based on DeckIdentity and Emergent Causal Graph discovery.
   * 
   * @param {import('./deckIdentityModel.js').DeckIdentity} deckIdentity 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage 
   * @param {Array<Object>} candidatePool
   * @returns {{ allocatedPackages: Array<Object>, totalPackageDensity: number, assemblyLog: string }}
   */
  static assembleMacroPackages(deckIdentity, intentPackage, candidatePool = []) {
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

    // If no static packages were declared, discover emergent packages dynamically from the pool
    if (allocatedPackages.length === 0 && candidatePool.length > 0) {
      const emergent = EmergentCausalPackageAssembler.discoverPackages(candidatePool, intentPackage, deckIdentity);
      for (const ep of emergent.slice(0, 2)) {
        allocatedPackages.push(ep);
        totalPackageDensity += ep.requiredSlotsCount;
      }
    }

    const assemblyLog = `Ensamblados ${allocatedPackages.length} paquetes funcionales causales emergentes (${totalPackageDensity} cartas reservadas por grafo).`;

    return {
      allocatedPackages: Object.freeze(allocatedPackages),
      totalPackageDensity,
      assemblyLog
    };
  }
}
