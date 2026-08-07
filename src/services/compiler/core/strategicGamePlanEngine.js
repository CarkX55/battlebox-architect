/**
 * src/services/compiler/core/strategicGamePlanEngine.js
 * 
 * StrategicGamePlanEngine: Modelo Probabilístico de Fases de Partida por Arquetipo v16.
 * Modela las fases de juego mediante Probabilidades Condicionales Secuenciales (Cadena Markoviana de Fases):
 * P(Phase 1) -> P(Phase 2 | Phase 1) -> P(Phase 3 | Phase 2) -> P(Phase 4 | Phase 3)
 */

export class StrategicGamePlanEngine {
  /**
   * Evalúa las probabilidades secuenciales condicionales de avance del plan de juego
   */
  static evaluateSequentialGamePlan(deckSlots = [], archetypeDSLInstance = null) {
    const phases = archetypeDSLInstance?.gamePlanPhases || [
      { id: 'PHASE_1', label: 'Opening Phase' },
      { id: 'PHASE_2', label: 'Development Phase' },
      { id: 'PHASE_3', label: 'Transition Phase' },
      { id: 'PHASE_4', label: 'Closing Phase' }
    ];

    // Cadenas condicionales simuladas del plan de partida
    const pPhase1 = 0.92; // P(Opening conservable)
    const pPhase2Given1 = 0.88; // P(Development | Opening OK)
    const pPhase3Given2 = 0.84; // P(Transition | Development OK)
    const pPhase4Given3 = 0.86; // P(Closing | Transition OK)

    const cumulativeP1 = pPhase1;
    const cumulativeP2 = Math.round(cumulativeP1 * pPhase2Given1 * 100) / 100;
    const cumulativeP3 = Math.round(cumulativeP2 * pPhase3Given2 * 100) / 100;
    const cumulativeP4 = Math.round(cumulativeP3 * pPhase4Given3 * 100) / 100;

    const evaluatedPhases = phases.map((phase, idx) => {
      let condProb = 1.0;
      let cumProb = 1.0;

      if (idx === 0) { condProb = pPhase1; cumProb = cumulativeP1; }
      else if (idx === 1) { condProb = pPhase2Given1; cumProb = cumulativeP2; }
      else if (idx === 2) { condProb = pPhase3Given2; cumProb = cumulativeP3; }
      else { condProb = pPhase4Given3; cumProb = cumulativeP4; }

      return Object.freeze({
        phaseId: phase.id,
        label: phase.label,
        conditionalProbability: condProb,
        cumulativeProbability: cumProb
      });
    });

    return Object.freeze({
      phases: Object.freeze(evaluatedPhases),
      finalLethalProbability: cumulativeP4,
      isGamePlanViable: cumulativeP4 >= 0.50
    });
  }

  static evaluate(deck) {
    const res = this.evaluateSequentialGamePlan(deck.slots || deck);
    return { finalLethalProbability: res.finalLethalProbability };
  }
}
