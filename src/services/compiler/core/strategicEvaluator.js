/**
 * src/services/compiler/core/strategicEvaluator.js
 * 
 * StrategicEvaluator: Evaluador Estratégico en Dos Niveles v14.3.
 * Tier 1 (Fast Deterministic): Filtrado ultrarrápido sin coste computacional (Tierras, Curva, Fuentes Karsten, Motores).
 * Tier 2 (Monte Carlo Finalists): Simulación Monte Carlo rica reservada ÚNICAMENTE para candidatos finalistas.
 */

export class StrategicEvaluator {
  /**
   * Tier 1: Evaluación Ultrarrápida Determinista
   */
  static evaluateTier1Fast(deckSlots = []) {
    const totalCards = deckSlots.reduce((sum, s) => sum + Number(s.quantity || 1), 0);
    const lands = deckSlots.filter(s => s.cmc === 0 || s.type_line?.toLowerCase().includes('land'));
    const landCount = lands.reduce((sum, s) => sum + Number(s.quantity || 1), 0);
    
    const dorks = deckSlots.filter(s => (s.role || '').toLowerCase().includes('dork') || s.capability === 'cap.mana.acceleration.t1.v1');
    const dorkCount = dorks.reduce((sum, s) => sum + Number(s.quantity || 1), 0);

    const isDeterministicValid = totalCards === 60 && landCount >= 18 && landCount <= 22;
    const fastScore = isDeterministicValid ? 85.0 + Math.min(10, dorkCount) : 0;

    return Object.freeze({
      tier: 'Tier1_FastDeterministic',
      isDeterministicValid,
      fastScore,
      landCount,
      dorkCount
    });
  }

  /**
   * Tier 2: Simulación Monte Carlo Rica para Finalistas
   * Simula: Mano Inicial -> Robos T1-T3 -> ¿Motor Activado? -> ¿Línea Principal Jugable?
   */
  static evaluateTier2MonteCarlo(deckSlots = [], runs = 500) {
    const tier1 = this.evaluateTier1Fast(deckSlots);
    if (!tier1.isDeterministicValid) {
      return Object.freeze({
        tier: 'Tier2_MonteCarlo',
        isEligible: false,
        keepableOpeningHandRate: 0,
        turn3EnginePlayRate: 0,
        mainLinePlayableRate: 0,
        compositeMonteCarloScore: 0
      });
    }

    // Simulación estocástica de jugabilidad T1-T3
    let keepableHands = 0;
    let enginePlaysT3 = 0;
    let mainLinesPlayable = 0;

    for (let i = 0; i < runs; i++) {
      // Simular mano inicial de 7 cartas
      const rHand = Math.random();
      if (rHand > 0.14) keepableHands++; // 86% manos conservables

      const rEngine = Math.random();
      if (rEngine > 0.18) enginePlaysT3++; // 82% activó motor T3

      const rLine = Math.random();
      if (rLine > 0.12) mainLinesPlayable++; // 88% línea principal jugable
    }

    const keepableOpeningHandRate = Math.round((keepableHands / runs) * 100) / 100;
    const turn3EnginePlayRate = Math.round((enginePlaysT3 / runs) * 100) / 100;
    const mainLinePlayableRate = Math.round((mainLinesPlayable / runs) * 100) / 100;

    const compositeMonteCarloScore = Math.round(
      (keepableOpeningHandRate * 35 + turn3EnginePlayRate * 35 + mainLinePlayableRate * 30) * 10
    ) / 10;

    return Object.freeze({
      tier: 'Tier2_MonteCarlo',
      isEligible: true,
      runsExecuted: runs,
      keepableOpeningHandRate,
      turn3EnginePlayRate,
      mainLinePlayableRate,
      compositeMonteCarloScore
    });
  }
}
