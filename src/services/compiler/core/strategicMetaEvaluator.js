/**
 * src/services/compiler/core/strategicMetaEvaluator.js
 * 
 * StrategicMetaEvaluator: Adaptador de Prioridades de Contratos de Metajuego v15.
 * Modifica las prioridades y unidades requeridas de los CONTRATOS del blueprint según el metajuego.
 * NO modifica los pesos globales (alpha, beta, gamma) para mantener intacta la identidad del arquetipo.
 */

export class StrategicMetaEvaluator {
  /**
   * Adapta la prioridad de contratos cuantitativos según el entorno de metajuego del torneo
   */
  static adaptBlueprintContractsToMetagame(pureBlueprint = {}, metagameVector = {}) {
    const contracts = JSON.parse(JSON.stringify(pureBlueprint.contracts || []));

    // Si el metajuego es altamente agresivo (e.g. Energy / Burn >= 30%)
    if (Number(metagameVector.energyPercent || 0) >= 0.30 || Number(metagameVector.burnPercent || 0) >= 0.20) {
      contracts.forEach(c => {
        if (c.capabilityId === 'cap.removal.early.v1' || c.capabilityId === 'cap.protection.v1') {
          c.requiredUnits = Math.round(c.requiredUnits * 1.25); // +25% unidades de interacción temprana
          c.targetCoverageRate = Math.min(1.0, c.targetCoverageRate + 0.10);
          c.priority = 'CRITICAL';
        }
      });
    }

    return Object.freeze({
      adaptedArchetype: pureBlueprint.archetype,
      adaptedContracts: Object.freeze(contracts),
      metagameVectorApplied: Object.freeze({ ...metagameVector })
    });
  }

  static evaluate(blueprint) {
    return this.adaptBlueprintContractsToMetagame(blueprint, { energyPercent: 0.40 });
  }
}
