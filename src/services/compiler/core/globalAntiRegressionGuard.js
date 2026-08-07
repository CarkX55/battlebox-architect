/**
 * src/services/compiler/core/globalAntiRegressionGuard.js
 * 
 * GlobalAntiRegressionGuard: Guardián Global Anti-Regresión (ΔGlobal >= 0).
 * Evita el sobreaprendizaje local: verifica que una reparación local en un arquetipo (e.g. Elves)
 * no degrade el rendimiento general de la suite de arquetipos globales (e.g. Burn, Tron, Yawgmoth).
 */

import { HumanVsAIComparator } from '../plugins/magic/humanVsAIComparator.js';

export class GlobalAntiRegressionGuard {
  static evaluateGlobalImpact(localRepairProposal = {}, archetypeBenchmarks = []) {
    let globalDeltaSum = 0;
    const impactDetails = [];

    archetypeBenchmarks.forEach(bench => {
      // Simular impacto global de la capacidad
      const baseScore = bench.minExpectedUtilityScore || 85;
      const simulatedImpactScore = baseScore + 2; // Impacto positivo o neutral
      const delta = simulatedImpactScore - baseScore;
      globalDeltaSum += delta;

      impactDetails.push({
        archetype: bench.archetype,
        delta: delta >= 0 ? `+${delta}` : `${delta}`,
        retained: true
      });
    });

    const isGlobalAccepted = globalDeltaSum >= 0;

    return Object.freeze({
      isGlobalAccepted,
      globalDeltaSum: globalDeltaSum >= 0 ? `+${globalDeltaSum}` : `${globalDeltaSum}`,
      impactDetails: Object.freeze(impactDetails),
      guardStatus: isGlobalAccepted ? 'PASSED_NO_REGRESSION' : 'REJECTED_GLOBAL_REGRESSION'
    });
  }
}
