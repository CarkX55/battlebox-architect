/**
 * src/services/compiler/core/objectiveFunction.js
 * 
 * ObjectiveFunction: Función Objetivo Pura, Determinista y "Stateless" v14.1.
 * Firma: ObjectiveFunction.evaluate(metrics, profile) -> UtilityScore.
 * NO realiza lecturas de base de datos ni posee estado interno.
 * Puede reutilizarse limpiamente en el Solver o en el Judge Auditor.
 */

export class ObjectiveFunction {
  /**
   * Evalúa la utilidad matemática global dada un objeto de métricas y un perfil de pesos.
   * @param {Object} metrics - { coverage, synergy, consistency, redundancy, curvePenalty, colorPenalty }
   * @param {Object} profile - { weights: { alpha_coverage, beta_synergy, gamma_consistency, delta_redundancy, epsilon_curvePenalty, zeta_colorPenalty } }
   */
  static evaluate(metrics = {}, profile = {}) {
    const w = profile.weights || {
      alpha_coverage: 0.35,
      beta_synergy: 0.25,
      gamma_consistency: 0.20,
      delta_redundancy: 0.10,
      epsilon_curvePenalty: 0.05,
      zeta_colorPenalty: 0.05
    };

    const coverage = Number(metrics.coverage || 0);
    const synergy = Number(metrics.synergy || 0);
    const consistency = Number(metrics.consistency || 0);
    const redundancy = Number(metrics.redundancy || 0);
    const curvePenalty = Number(metrics.curvePenalty || 0);
    const colorPenalty = Number(metrics.colorPenalty || 0);

    const utility = (
      w.alpha_coverage * coverage +
      w.beta_synergy * synergy +
      w.gamma_consistency * consistency +
      w.delta_redundancy * redundancy -
      w.epsilon_curvePenalty * curvePenalty -
      w.zeta_colorPenalty * colorPenalty
    );

    const roundedUtility = Math.round(utility * 10) / 10;

    return Object.freeze({
      totalUtility: roundedUtility,
      profileUsed: profile.profileName || 'default',
      metricsProcessed: Object.freeze({ ...metrics }),
      weightsApplied: Object.freeze({ ...w })
    });
  }
}
