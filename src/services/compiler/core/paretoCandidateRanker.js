/**
 * src/services/compiler/core/paretoCandidateRanker.js
 * 
 * ParetoCandidateRanker: Clasificador por Frontera de Pareto de 7 Dimensiones v14.1.
 * Evalúa candidatos sobre un vector de 7 dimensiones:
 * [coverage, tempo, curve, resilience, synergy, colorStress, consistency]
 * NO decide el candidato final; devuelve la Frontera de Pareto (array de soluciones no dominadas).
 */

export class ParetoCandidateRanker {
  /**
   * Determina si el candidato A domina al candidato B en el espacio de 7D
   */
  static dominates(vectorA, vectorB) {
    const dims = ['coverage', 'tempo', 'curve', 'resilience', 'synergy', 'consistency'];
    let betterInAtLeastOne = false;

    for (const dim of dims) {
      const valA = Number(vectorA[dim] || 0);
      const valB = Number(vectorB[dim] || 0);
      if (valA < valB) return false;
      if (valA > valB) betterInAtLeastOne = true;
    }

    // Para colorStress, menor es mejor
    const stressA = Number(vectorA.colorStress || 0);
    const stressB = Number(vectorB.colorStress || 0);
    if (stressA > stressB) return false;
    if (stressA < stressB) betterInAtLeastOne = true;

    return betterInAtLeastOne;
  }

  /**
   * Calcula el conjunto de soluciones no dominadas (Frontera de Pareto)
   */
  static computeParetoFrontier(candidates = []) {
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return Object.freeze([]);
    }

    const nonDominated = [];

    for (let i = 0; i < candidates.length; i++) {
      const candA = candidates[i];
      const vectorA = candA.vector || candA;
      let isDominated = false;

      for (let j = 0; j < candidates.length; j++) {
        if (i === j) continue;
        const candB = candidates[j];
        const vectorB = candB.vector || candB;

        if (this.dominates(vectorB, vectorA)) {
          isDominated = true;
          break;
        }
      }

      if (!isDominated) {
        nonDominated.push(Object.freeze({ ...candA }));
      }
    }

    return Object.freeze(nonDominated);
  }
}
