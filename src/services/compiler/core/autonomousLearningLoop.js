/**
 * src/services/compiler/core/autonomousLearningLoop.js
 * 
 * Autonomous Closed-Loop Optimization Protocol (Bucle Autónomo de Aprendizaje Continuo v14).
 * Cierra el ciclo completo de auto-optimización sin intervención humana:
 * 
 * 1. Genera Mazo Candidato Inicial
 * 2. Simula 10,000 Partidas Monte Carlo
 * 3. Diagnostica Causas de Fallo P(Fail T4) (Mana screw, removal, no payoff)
 * 4. Aplica Reparación Justificada mediante Contratos de Dominio
 * 5. Re-simula 10,000 Partidas sobre el Mazo Reparado
 * 6. Compara el Delta (Δ Speed, Δ Consistency, Δ Recovery)
 * 7. Acepta/Rechaza la Reparación y Persiste Aprendizaje en el Grafo Bayesiano
 */

import { SimulationDistribution } from './simulationDistribution.js';
import { VersionDeltaComparator } from './versionDeltaComparator.js';
import { WeightedCapabilityGraph } from '../plugins/magic/weightedCapabilityGraph.js';
import { HumanVsAIComparator } from '../plugins/magic/humanVsAIComparator.js';

export class AutonomousLearningLoop {
  static async runOptimizationLoop(archetype = 'Golgari Elves', benchmarkData = {}, maxIterations = 3) {
    console.log(`🚀 [AutonomousLearningLoop] Iniciando Bucle Autónomo de Aprendizaje v14 para: ${archetype}`);

    const capabilityGraph = new WeightedCapabilityGraph();
    let currentIteration = 1;
    let bestDeckSlots = [
      { name: 'Llanowar Elves', quantity: 4, role: 'ramp', capability: 'cap.mana.acceleration.t1.v1' },
      { name: 'Collected Company', quantity: 4, role: 'engine', capability: 'cap.engine.coco.v1' },
      { name: 'Forest', quantity: 20, isBasicLand: true }
    ];

    // 1. Simulación Inicial (Partidas Monte Carlo)
    const initialReport = HumanVsAIComparator.compareDeckToBenchmark(bestDeckSlots, benchmarkData);
    let currentVector = initialReport.vector;
    let currentScore = initialReport.overallDeckScore;

    const iterationsHistory = [];

    while (currentIteration <= maxIterations) {
      console.log(`   🔄 Iteración ${currentIteration}/${maxIterations}: Evaluando resiliencia y causas de fallo...`);

      // 2. Diagnóstico de Causas de Fallo
      const diagnosis = SimulationDistribution.runDistributionAnalysis(bestDeckSlots, 10000);
      const mainCause = diagnosis.failureAttribution.causes[0];

      // 3. Aplicar Reparación Justificada (Añadir carta para solucionar la causa principal)
      const repairedSlots = [...bestDeckSlots];
      if (mainCause.cause.includes('Mana Screw')) {
        repairedSlots.push({ name: 'Elvish Mystic', quantity: 4, role: 'ramp', capability: 'cap.mana.acceleration.t1.v1' });
      } else {
        repairedSlots.push({ name: 'Beast Whisperer', quantity: 2, role: 'recovery', capability: 'cap.engine.recovery.v1' });
      }

      // 4. Re-simular 10,000 partidas sobre el estado reparado
      const candidateReport = HumanVsAIComparator.compareDeckToBenchmark(repairedSlots, benchmarkData);

      // 5. Comparar Delta (Δ)
      const delta = VersionDeltaComparator.compareVersions(
        { compilerVersion: `v14.iter.${currentIteration - 1}`, vector: currentVector },
        { compilerVersion: `v14.iter.${currentIteration}`, vector: candidateReport.vector }
      );

      // 6. Aceptar o Rechazar Reparación
      const accepted = candidateReport.overallDeckScore >= currentScore;

      if (accepted) {
        bestDeckSlots = repairedSlots;
        currentVector = candidateReport.vector;
        currentScore = candidateReport.overallDeckScore;

        // 7. Persistir Aprendizaje Estadístico en el Grafo Bayesiano
        capabilityGraph.recordObservation('cap.mana.acceleration.t1.v1', 'cap.engine.recovery.v1', true);
      }

      iterationsHistory.push({
        iteration: currentIteration,
        mainFailureCause: mainCause.cause,
        scoreBefore: initialReport.overallDeckScore,
        scoreAfter: candidateReport.overallDeckScore,
        deltaDeltas: delta.deltas,
        status: accepted ? 'ACCEPTED' : 'REJECTED'
      });

      currentIteration++;
    }

    return Object.freeze({
      archetype,
      totalIterationsRun: maxIterations,
      convergedScore: currentScore,
      finalDeckSlots: Object.freeze(bestDeckSlots),
      learningGraphStats: capabilityGraph.edges.size,
      iterationsHistory: Object.freeze(iterationsHistory)
    });
  }
}
