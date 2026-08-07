/**
 * src/services/compiler/core/strategicBeliefEngine.js
 * 
 * StrategicBeliefEngine: Capa de Razonamiento sobre Incertidumbre y Evidencia v21.3.
 * Modela explícitamente el grado de creencia, confianza y muestra empírica para cada nodo y relación
 * en el Unified Knowledge Graph (UKG).
 */

export class BeliefState {
  constructor(data = {}) {
    this.beliefScore = Math.min(1.0, Math.max(0.0, Number(data.beliefScore || 0.50)));
    this.confidence = Math.min(1.0, Math.max(0.0, Number(data.confidence || 0.50)));
    this.evidenceCount = Number(data.evidenceCount || 1);
    this.lastValidation = data.lastValidation || Date.now();
    this.source = data.source || 'EmpiricalMonteCarlo';
    Object.freeze(this);
  }
}

export class StrategicBeliefEngine {
  /**
   * Evalúa la función de peso dinámico contextual f(context) para una arista causal
   */
  static evaluateDynamicWeight(baseWeight = 1.0, context = {}) {
    const oppColor = (context.opponentColor || '').toLowerCase();
    const oppArchetype = (context.opponentArchetype || '').toLowerCase();

    let dynamicWeight = baseWeight;

    if (context.edgeType === 'COUNTERACTS_BLUE_COUNTERSPELL') {
      if (oppColor.includes('u') || oppArchetype.includes('control')) {
        dynamicWeight = 0.95;
      } else if (oppArchetype.includes('burn')) {
        dynamicWeight = 0.02;
      } else if (oppArchetype.includes('tron')) {
        dynamicWeight = 0.10;
      }
    }

    return Math.round(dynamicWeight * 100) / 100;
  }

  /**
   * Actualiza el grado de creencia (BeliefState) basado en nueva evidencia empírica
   */
  static updateBelief(currentBelief = new BeliefState(), observedGain = 0, expectedGain = 0) {
    const delta = observedGain - expectedGain;
    const isConfirmed = delta >= 0;

    const newEvidenceCount = currentBelief.evidenceCount + 1;
    const confidenceGain = Math.min(0.99, currentBelief.confidence + 0.05);

    const newBeliefScore = isConfirmed
      ? Math.min(0.99, currentBelief.beliefScore + 0.08)
      : Math.max(0.01, currentBelief.beliefScore - 0.10);

    return new BeliefState({
      beliefScore: Math.round(newBeliefScore * 100) / 100,
      confidence: Math.round(confidenceGain * 100) / 100,
      evidenceCount: newEvidenceCount,
      lastValidation: Date.now(),
      source: 'EmpiricalMonteCarlo'
    });
  }
}
