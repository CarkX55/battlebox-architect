/**
 * src/services/compiler/core/closedLoopTournamentEngine.js
 * 
 * Closed-Loop Evolutionary Tournament Engine v29.1.
 * Orchestrates multi-epoch tournament evaluation across DeckCompositionState candidates.
 * Evaluates the Triad Evidence Model (ExecutionFit, OpponentFit, ExperienceFit) through
 * adaptive simulations, Lexicographic Pareto Dominance, and evolutionary mutation memory.
 */

import { DeckCompositionGenome } from './deckCompositionGenome.js';
import { DeckCompositionState } from './deckCompositionState.js';
import { ExecutableWinPath } from './executableWinPath.js';
import { SimulationBudgetPolicy } from './simulationBudgetPolicy.js';
import { CompositionMutationEngine } from './compositionMutationEngine.js';
import { EvolutionaryMemory } from './evolutionaryMemory.js';
import { DeterministicGameState } from './deterministicGameState.js';
import { PRNG } from './prng.js';
import { ExecutionEvidence } from './executionEvidence.js';
import { DeckPlanCoverage } from './deckPlanCoverage.js';
import { StateParetoFrontier } from './stateParetoFrontier.js';

export class ClosedLoopTournamentEngine {
  /**
   * Executes the full closed-loop evolutionary tournament.
   * 
   * @param {Object} params
   * @param {Array<DeckCompositionGenome>} params.seedGenomes
   * @param {Array<Object>} params.candidatePool
   * @param {import('./intentPackage.js').IntentPackage} params.intentPackage
   * @param {Object} params.deckIdentity
   * @param {Object} params.options
   * @returns {{ winningState: DeckCompositionState, tournamentReport: Object, memory: EvolutionaryMemory }}
   */
  static executeTournament({
    seedGenomes = [],
    candidatePool = [],
    intentPackage = {},
    deckIdentity = {},
    options = {}
  } = {}) {
    const maxEpochs = Number(options.maxEpochs || 3);
    const maxBudget = Number(options.maxBudget || 1500);
    const memory = options.memory || new EvolutionaryMemory({ maxEliteSize: 6 });
    const tournamentPrng = new PRNG(472918);
    const winPath = ExecutableWinPath.generateForArchetype(
      intentPackage?.strategicTempo || 'AGGRO',
      deckIdentity,
      intentPackage
    );

    let currentCohort = [...seedGenomes];
    const epochSummaries = [];

    for (let epoch = 1; epoch <= maxEpochs; epoch++) {
      const evaluatedInEpoch = [];

      for (const genome of currentCohort) {
        if (memory.isDominated(genome.compositionHash)) continue;

        const evidence = this.evaluateGenomePlayability(genome, winPath, intentPackage, {
          maxBudget,
          epoch
        });

        const compState = new DeckCompositionState({
          genome,
          intent: intentPackage,
          strategicThesis: deckIdentity,
          executableWinPath: winPath,
          causalGraph: { edges: [] },
          proofObligations: deckIdentity?.mandatoryRoles || [],
          executionEvidence: evidence,
          recoveryProfile: {
            recoveryProbability: evidence.resilience?.recoveryProbability || 0,
            postSweeperRebuildTurn: 2
          },
          adversarialProfile: {
            blockerPenetration: evidence.winPath?.lethalRate || 0,
            directReachKillRate: evidence.winPath?.directReachRate || 0
          },
          experienceProfile: {
            agencyScore: evidence.experience?.agencyScore || 0.8,
            interactionQuality: evidence.experience?.interactionQuality || 0.85,
            nonGameRisk: evidence.experience?.nonGameRisk || 0.05,
            decisionDensity: evidence.experience?.decisionDensity || 3.2
          },
          dominanceVector: {
            status: 'EVALUATED',
            executionFitScore: evidence.execution?.curveExecutionProbability || 0.5,
            opponentFitScore: evidence.resilience?.recoveryProbability || 0.5,
            experienceFitScore: evidence.experience?.agencyScore || 0.8,
            lethalRate: evidence.winPath?.lethalRate || 0.5,
            expectedKillTurn: evidence.winPath?.expectedKillTurn || 4.5,
            deadCardRate: evidence.execution?.deadCardRate || 0.05,
            mulliganRate: evidence.execution?.mulliganRate || 0.1
          }
        });

        memory.addToElite(compState);
        evaluatedInEpoch.push(compState);
      }

      // Sort evaluated cohort by Pareto dominance
      const elite = memory.getEliteStates();
      elite.sort((a, b) => this.compareStates(b, a, intentPackage));

      epochSummaries.push({
        epoch,
        evaluatedCount: evaluatedInEpoch.length,
        eliteLeaderHash: elite[0]?.compositionHash,
        eliteLeaderLethalRate: elite[0]?.dominanceVector?.lethalRate,
        eliteLeaderExpectedKill: elite[0]?.dominanceVector?.expectedKillTurn
      });

      // If not the final epoch, generate mutant cohort from elite leaders
      if (epoch < maxEpochs && elite.length > 0) {
        const topLeader = elite[0].genome;
        const newMutants = CompositionMutationEngine.generateCohort(topLeader, candidatePool, intentPackage, {
          memory,
          cohortSize: 6,
          prng: tournamentPrng.fork(`mutation_epoch_${epoch}`)
        });
        currentCohort = newMutants;
      }
    }

    const finalElite = memory.getEliteStates();
    finalElite.sort((a, b) => this.compareStates(b, a, intentPackage));

    const winningState = finalElite[0] || null;

    const tournamentReport = {
      totalEpochsRun: maxEpochs,
      totalGenomesEvaluated: memory.evaluatedGenomes.size,
      dominatedCount: memory.dominatedCache.size,
      epochSummaries,
      winningSummary: winningState?.toSummary() || null
    };

    return {
      winningState,
      tournamentReport,
      memory
    };
  }

  /**
   * Runs empirical simulated games on a single genome to capture Triad Evidence.
   * @private
   */
  static evaluateGenomePlayability(genome, winPath, intentPackage, { maxBudget = 1000, epoch = 1 } = {}) {
    const cardList = genome.toCardList();
    const batchSize = SimulationBudgetPolicy.getExploratoryBatchSize(genome.format, intentPackage?.competitiveIntensity);
    const masterPrng = new PRNG(472918 + epoch * 137);

    let lethalWins = 0;
    let reachKills = 0;
    let postSweeperRecoveries = 0;
    let mulligans = 0;
    let keeps = 0;
    let totalManaAvailable = 0;
    let totalManaSpent = 0;
    let winTurns = { T3: 0, T4: 0, T5: 0, T6Plus: 0 };
    let nonGameCount = 0;

    for (let sim = 0; sim < batchSize; sim++) {
      const simPrng = masterPrng.fork(`tourn_${epoch}_${sim}`);
      const gameState = DeterministicGameState.createInitialState(cardList, simPrng);

      // Draw opening hand
      gameState.draw(7);
      const tookMulligan = gameState.executeMulligan(simPrng, 7);
      if (tookMulligan) mulligans++;
      else keeps++;

      const landsInHand = gameState.hand.filter(c => c.isLand).length;
      if (landsInHand === 0 || landsInHand >= 6) nonGameCount++;

      let simWon = false;
      const willEncounterSweeperOnT3 = (sim % 3 === 0); // 33% of games test sweeper recovery

      for (let t = 1; t <= 5; t++) {
        if (t > 1) gameState.startNewTurn();

        // 1. Play Land
        const landIdx = gameState.hand.findIndex(c => c.isLand);
        if (landIdx !== -1) {
          gameState.playLand(landIdx);
        }

        const manaBefore = gameState.getAvailableMana();
        totalManaAvailable += manaBefore.totalAvailable;

        // 2. Cast Spells
        let continueCasting = true;
        while (continueCasting) {
          const castables = [];
          for (let i = 0; i < gameState.hand.length; i++) {
            const card = gameState.hand[i];
            if (!card.isLand && gameState.canCast(card)) {
              castables.push({ idx: i, card });
            }
          }

          if (castables.length === 0) {
            continueCasting = false;
            break;
          }

          // Prioritize: cast creatures on early turns, cast direct burn when opponent is low
          castables.sort((a, b) => {
            const textA = (a.card.card?.oracle_text || '').toLowerCase();
            const textB = (b.card.card?.oracle_text || '').toLowerCase();
            const isBurnA = textA.includes('damage');
            const isBurnB = textB.includes('damage');

            if (gameState.opponentLife <= 6) {
              return (isBurnB ? 1 : 0) - (isBurnA ? 1 : 0);
            }
            return (b.card.cmc - a.card.cmc);
          });

          const chosen = castables[0];
          const castSuccess = gameState.castSpell(chosen.idx);
          if (castSuccess) {
            totalManaSpent += chosen.card.cmc;
          } else {
            continueCasting = false;
          }
        }

        // 3. Inject Adversarial Sweeper on T3 for stress test
        if (t === 3 && willEncounterSweeperOnT3) {
          gameState.executeAdversarialSweeper('WRATH_T3');
        }

        // 4. Combat Phase
        gameState.executeCombatPhase();

        // Check Victory
        if (gameState.isLethal() && !simWon) {
          simWon = true;
          lethalWins++;
          if (willEncounterSweeperOnT3 && t >= 4) {
            postSweeperRecoveries++;
          }
          if (t === 3) winTurns.T3++;
          else if (t === 4) winTurns.T4++;
          else if (t === 5) winTurns.T5++;
          break;
        }
      }

      if (!simWon) {
        winTurns.T6Plus++;
      }
    }

    const lethalRate = lethalWins / batchSize;
    const curveProb = totalManaAvailable > 0 ? (totalManaSpent / totalManaAvailable) : 0;
    const recoveryRate = Math.round((postSweeperRecoveries / Math.max(1, Math.floor(batchSize / 3))) * 100) / 100;
    const t3Rate = winTurns.T3 / batchSize;
    const t4Rate = winTurns.T4 / batchSize;
    const t5Rate = winTurns.T5 / batchSize;
    const t6Rate = winTurns.T6Plus / batchSize;

    const expectedKill = Number(((t3Rate * 3) + (t4Rate * 4) + (t5Rate * 5) + (t6Rate * 6.5)).toFixed(2));

    return new ExecutionEvidence({
      candidateId: genome.compositionHash,
      simulationConfig: { batchSize, engineVersion: 'v29.1' },
      execution: {
        openingHandKeepRate: Number((keeps / batchSize).toFixed(4)),
        mulliganRate: Number((mulligans / batchSize).toFixed(4)),
        earlyManaReliability: Number((1.0 - (nonGameCount / batchSize)).toFixed(4)),
        curveExecutionProbability: Number(curveProb.toFixed(4)),
        colorFailureRate: 0.02,
        strandedCardRate: 0.03,
        deadCardRate: Number((Math.max(0, 1 - curveProb) * 0.15).toFixed(4)),
        avgManaSpentTurn1to4: Number((totalManaSpent / batchSize).toFixed(2))
      },
      winPath: {
        winPathSuccessRate: Number(lethalRate.toFixed(4)),
        expectedKillTurn: expectedKill,
        winTurnDistribution: {
          T3: Number(t3Rate.toFixed(4)),
          T4: Number(t4Rate.toFixed(4)),
          T5: Number(t5Rate.toFixed(4)),
          T6Plus: Number(t6Rate.toFixed(4))
        },
        lethalRate: Number(lethalRate.toFixed(4)),
        directReachRate: Number((reachKills / batchSize).toFixed(4)),
        failedStep: lethalRate < 0.5 ? 'T4_LETHAL_REACH' : null
      },
      resilience: {
        recoveryProbability: Math.min(1.0, recoveryRate),
        adversarialSurvivalRate: Number(lethalRate.toFixed(4)),
        singlePointOfFailure: false,
        resilienceIndex: Math.round(recoveryRate * 100)
      },
      experience: {
        agencyScore: Number((0.75 + curveProb * 0.2).toFixed(2)),
        interactionQuality: 0.88,
        nonGameRisk: Number((nonGameCount / batchSize).toFixed(3)),
        decisionDensity: 3.4
      }
    });
  }

  /**
   * Lexicographic Pareto Dominance Comparator (V29.6).
   * Compares state A vs state B across the Triad Evidence Model through StateParetoFrontier.
   * @private
   */
  static compareStates(stateA, stateB, intentPackage = {}) {
    // 0. Hard SSOT Gate: Critical Gameplan Turn Requirement Coverage
    const activeGameplan = intentPackage?.gameplanContract;
    if (activeGameplan && activeGameplan.turnRequirements) {
      const deckA = stateA.genome ? stateA.genome.toDeckState() : (stateA.cards ? stateA : { cards: [] });
      const deckB = stateB.genome ? stateB.genome.toDeckState() : (stateB.cards ? stateB : { cards: [] });
      const covA = DeckPlanCoverage.computeCoverage({ deckState: deckA, gameplanContract: activeGameplan });
      const covB = DeckPlanCoverage.computeCoverage({ deckState: deckB, gameplanContract: activeGameplan });
      const critFailA = covA.criticalFailures?.length || 0;
      const critFailB = covB.criticalFailures?.length || 0;
      if (critFailA !== critFailB) {
        return critFailB - critFailA; // Fewer critical failures strictly dominates
      }
    }

    const vecA = stateA.dominanceVector || {};
    const vecB = stateB.dominanceVector || {};

    const metricsA = {
      curveExecutionRate: vecA.executionFitScore || 0,
      winPathCompletionRate: vecA.lethalRate || 0,
      resilienceRecoveryRate: vecA.opponentFitScore || 0,
      manaCastabilityRate: 1.0 - (vecA.mulliganRate || 0.1),
      tangibleResourceVelocity: (vecA.executionFitScore || 0.5) * 4,
      nonGameRisk: vecA.deadCardRate || 0.05
    };
    const metricsB = {
      curveExecutionRate: vecB.executionFitScore || 0,
      winPathCompletionRate: vecB.lethalRate || 0,
      resilienceRecoveryRate: vecB.opponentFitScore || 0,
      manaCastabilityRate: 1.0 - (vecB.mulliganRate || 0.1),
      tangibleResourceVelocity: (vecB.executionFitScore || 0.5) * 4,
      nonGameRisk: vecB.deadCardRate || 0.05
    };

    return StateParetoFrontier.compareLexicographic(
      { ...stateA, metrics: metricsA },
      { ...stateB, metrics: metricsB },
      intentPackage
    );
  }
}
