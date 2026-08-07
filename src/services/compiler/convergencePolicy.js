/**
 * src/services/compiler/convergencePolicy.js
 * 
 * CompilationHealth & ConvergencePolicy: Motor de Parada y Convergencia Multicriterio.
 * Mide la estabilidad técnica del mazo a través de un vector de salud estratégico:
 * - strategicEntropy
 * - brokenDependencies
 * - simulationVariance
 * - judgeRegression
 * - paretoInstability
 * - claimConfidence
 */

import { MetricsService } from './metricsService.js';
import { StateQueryService } from './stateQueryService.js';
import { InvariantEngine, loadStandardInvariants } from './invariantEngine.js';

export function evaluateCompilationHealth(strategicState) {
  const query = new StateQueryService(strategicState);
  const metrics = new MetricsService(strategicState);

  const invariantEngine = new InvariantEngine();
  loadStandardInvariants(invariantEngine);
  const violations = invariantEngine.validateSlots(strategicState?.deckState?.slots || [], strategicState);

  const brokenDependencies = violations.filter(v => v.level === 'RULE' || v.level === 'ARCHETYPE').length;
  const curveEntropy = metrics.getCurveEntropy();

  return Object.freeze({
    strategicEntropy: curveEntropy,
    brokenDependencies,
    removalDensity: metrics.getRemovalDensity(),
    threatDensity: metrics.getThreatDensity(),
    resilienceScore: metrics.getResilienceScore(),
    timestamp: Date.now()
  });
}

export class ConvergencePolicy {
  constructor(options = {}) {
    this.maxEntropyThreshold = options.maxEntropyThreshold || 0.05;
    this.maxAllowedPasses = options.maxAllowedPasses || 4;
  }

  /**
   * Determina si la compilación ha alcanzado la convergencia multicriterio
   */
  evaluateConvergence(previousHealth, currentHealth, passNumber) {
    if (passNumber >= this.maxAllowedPasses) {
      return {
        converged: true,
        reason: `Límite máximo de pases alcanzado (${this.maxAllowedPasses}).`
      };
    }

    if (!previousHealth || !currentHealth) {
      return { converged: false, reason: 'Primera iteración de compilación.' };
    }

    // Invariantes rotas prohíben la convergencia
    if (currentHealth.brokenDependencies > 0) {
      return {
        converged: false,
        reason: `Existen ${currentHealth.brokenDependencies} invariantes críticas rotas.`
      };
    }

    const deltaRemoval = Math.abs(currentHealth.removalDensity - previousHealth.removalDensity);
    const deltaThreat = Math.abs(currentHealth.threatDensity - previousHealth.threatDensity);
    const deltaResilience = Math.abs(currentHealth.resilienceScore - previousHealth.resilienceScore);

    const isStable = deltaRemoval < 0.02 && deltaThreat < 0.02 && deltaResilience < 2;

    if (isStable) {
      return {
        converged: true,
        reason: `Estabilidad alcanzada. Variación de métricas < 2%.`
      };
    }

    return {
      converged: false,
      reason: `Variación detectada (Removal Delta: ${deltaRemoval.toFixed(2)}, Threat Delta: ${deltaThreat.toFixed(2)})`
    };
  }
}
