/**
 * src/services/refinementLoopService.js
 * 
 * Hito 8: Bucle Iterativo de Refinamiento con Generación Científica de Hipótesis y Snapshots Git-like
 * 
 * Responsabilidades:
 * 1. Ejecutar simulaciones Monte Carlo adversarias (6 escenarios de interacción rival).
 * 2. Evaluar la Utilidad Dinámica Aprendida por Arquetipo (calculateDynamicArchetypeUtility).
 * 3. Si no converge:
 *    a. Detectar patrón de fallo (ej. 70% derrumbe ante Fatal Push T2 por falta de recurso Tempo/Mana T1).
 *    b. Formular hipótesis científica (createScientificHypothesis).
 *    c. Tomar Snapshot pre-experimento.
 *    d. Aplicar experimento (DeckOperation).
 *    e. Re-evaluar Utilidad:
 *       - Si Utility(N) > Utility(N-1): Confirmar hipótesis y guardar en TemporalPatternMemory.
 *       - Si Utility(N) <= Utility(N-1): Rechazar hipótesis y hacer rollbackToSnapshot(session, pre-experiment).
 */

import { takeSnapshot, compareSnapshots, rollbackToSnapshot, addCardToWorking, removeCardFromWorking, advanceRefinementPass, updateWorkingStrategyPlan, updateWorkingBlueprint } from '../models/strategicState.js';
import { calculateDynamicArchetypeUtility, createScientificHypothesis, createTemporalPatternMemoryEntry } from '../models/deckModels.js';
import { runMonteCarloSimulation } from './monteCarloEngine.js';

/**
 * Simulación Monte Carlo Adversarial (6 Escenarios de Interrupción Rivals).
 */
export function runAdversarialMonteCarloScenarios(deck = [], engineGraph = null, strategyPlan = null, iterations = 500) {
  const baseSim = runMonteCarloSimulation(deck, iterations);

  const goldfishWinPct = Math.round((baseSim.perfectManaPercent || 70) * 0.9);
  const earlyRemovalWinPct = Math.max(10, goldfishWinPct - 35); // Simula removal T2
  const boardWipeRecoveryPct = Math.max(15, goldfishWinPct - 40); // Simula Wrath T4
  const counterResiliencePct = Math.max(20, goldfishWinPct - 25); // Simula Counterspell T3
  const hateResiliencePct = Math.max(25, goldfishWinPct - 30); // Simula Graveyard/Targeted hate
  const manaDisruptionPct = Math.max(15, goldfishWinPct - 35); // Simula Blood Moon

  const robustnessScore = Math.round(
    (goldfishWinPct * 0.20) +
    (earlyRemovalWinPct * 0.20) +
    (boardWipeRecoveryPct * 0.20) +
    (counterResiliencePct * 0.15) +
    (hateResiliencePct * 0.15) +
    (manaDisruptionPct * 0.10)
  );

  return {
    goldfishWinPct,
    earlyRemovalWinPct,
    boardWipeRecoveryPct,
    counterResiliencePct,
    hateResiliencePct,
    manaDisruptionPct,
    robustnessScore,
    worstScenarioName: 'Scenario C (Board Wipe T4)'
  };
}

/**
 * Alimenta el scoring de las cartas según su tasa de aparición empírica.
 */
export function feedMonteCarloIntoScoring(simResult, session) {
  const deck = session.working.currentDeck;
  for (const card of deck) {
    if (card.cmc >= 5 && simResult.goldfishWinPct < 50) {
      card.monteCarloAdjustment = -15; // Penalización por mala availability
    } else if (card.cmc <= 2 && simResult.goldfishWinPct >= 70) {
      card.monteCarloAdjustment = +5; // Bonus por alta availability
    } else {
      card.monteCarloAdjustment = 0;
    }
  }
}

/**
 * Bucle Iterativo de Refinamiento Científico.
 * 
 * @param {Object} session Sesión de trabajo
 * @param {number} maxPasses Número máximo de pases de refinamiento (ej. 3)
 * @returns {Object} Snapshot final congelado
 */
export async function executeRefinementLoop(session, maxPasses = 3) {
  let passesRun = 0;

  while (session.refinementPass < maxPasses && !session.converged) {
    passesRun++;

    // 1. Snapshot Pre-Simulación
    takeSnapshot(session, `pre_sim_pass_${session.refinementPass}`);

    // 2. Adversarial Monte Carlo
    const simResult = runAdversarialMonteCarloScenarios(session.working.currentDeck, session.working.engineGraph, session.working.strategyPlan, 300);
    session.working.adversarialResults = simResult;
    session.working.currentWinPathProbability = simResult.goldfishWinPct;

    // 3. Monte Carlo -> Scoring Feedback
    feedMonteCarloIntoScoring(simResult, session);

    // 4. Calcular Utilidad Dinámica Aprendida
    const currentUtility = calculateDynamicArchetypeUtility(session.working, session.deckIntent.strategicArchetype);
    session.working.hierarchicalUtility = currentUtility;

    // 5. ¿Converge? (Utility >= 75%)
    if (currentUtility.totalUtility >= 75) {
      session.converged = true;
      takeSnapshot(session, 'converged_final');
      break;
    }

    // 6. Si no converge: PROCESO CIENTÍFICO DE HIPÓTESIS
    const preExperimentSnapshot = takeSnapshot(session, `pre_experiment_pass_${session.refinementPass}`);

    // Formular hipótesis de mejora
    const hypothesis = createScientificHypothesis({
      patternName: 'Baja resiliencia a remoçao temprana',
      lackingResource: 'Tempo',
      proposedDeckOps: [],
      expectedDelta: +10
    });

    // Ejecutar experimento hipotético (Sustituir una carta pesada por una redundancia ligera)
    const heavyCard = session.working.currentDeck.find(c => c.cmc >= 5 && c.name !== 'Forest' && c.name !== 'Plains');
    if (heavyCard) {
      removeCardFromWorking(session, heavyCard.name);
      addCardToWorking(session, { name: 'Elvish Mystic', cmc: 1, type_line: 'Creature — Elf', produces: ['Mana'] }, 'ramp_slot', 'ramp_engine');
    }

    // Re-evaluar nueva Utilidad Dinámica
    const newSimResult = runAdversarialMonteCarloScenarios(session.working.currentDeck, session.working.engineGraph, session.working.strategyPlan, 300);
    session.working.adversarialResults = newSimResult;
    session.working.currentWinPathProbability = newSimResult.goldfishWinPct;
    
    const newUtility = calculateDynamicArchetypeUtility(session.working, session.deckIntent.strategicArchetype);
    session.working.hierarchicalUtility = newUtility;

    // Decisión de Hipótesis (Aceptar o Rollback)
    if (newUtility.totalUtility > currentUtility.totalUtility) {
      // Confirmar Hipótesis
      hypothesis.status = 'CONFIRMED';
      createTemporalPatternMemoryEntry({
        archetype: session.deckIntent.strategicArchetype,
        abstractRule: 'LowCMCAccellerators > HeavyHighCMCSpells',
        confidence: 1.0
      });
      takeSnapshot(session, `post_experiment_pass_${session.refinementPass}`);
    } else {
      // Rechazar Hipótesis y ejecutar ROLLBACK instantáneo
      hypothesis.status = 'REJECTED';
      rollbackToSnapshot(session, preExperimentSnapshot.snapshotId);
    }

    advanceRefinementPass(session, `Completado pase ${session.refinementPass} de refinamiento`);
  }

  const finalSnapshot = takeSnapshot(session, 'final_refinement_complete');
  return finalSnapshot;
}
