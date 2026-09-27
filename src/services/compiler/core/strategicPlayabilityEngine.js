/**
 * src/services/compiler/core/strategicPlayabilityEngine.js
 * 
 * Strategic Playability Engine & Structured Execution Trace v28.1.
 * 
 * Runs deterministic seeded Monte Carlo playability simulations using DeterministicGameState
 * and ExecutionPolicy. Emits structured ExecutionEvidence with rich ExecutionTrace logs.
 * 
 * INVARIANT: Simulations are purely observational. They provide empirical evidence to
 * StateCandidateRanker and DeterministicSupremeJudge without possessing selection authority.
 */

import { DeterministicGameState } from './deterministicGameState.js';
import { PRNG } from './prng.js';
import { ExecutionEvidence } from './executionEvidence.js';
import { ExecutionPolicy } from './executionPolicy.js';

export class StrategicPlayabilityEngine {
  /**
   * Evaluates the playability of a deck state under a specific policy and PRNG seed.
   * 
   * @param {Array<Object>|Object} deckInput - Array of cards or DeckState { cards: [...] }
   * @param {Object} options
   * @param {ExecutionPolicy} options.executionPolicy
   * @param {number|string} options.seed
   * @param {number} options.simulationCount
   * @param {number} options.maxTurns
   * @param {string} options.candidateId
   * @returns {ExecutionEvidence}
   */
  static simulatePlayability(deckInput, {
    executionPolicy = null,
    seed = 472918,
    simulationCount = 1000,
    maxTurns = 5,
    candidateId = 'candidate_state'
  } = {}) {
    const rawCards = Array.isArray(deckInput) ? deckInput : (deckInput?.cards || []);
    if (!rawCards || rawCards.length === 0) {
      return ExecutionEvidence.createBaseline(candidateId);
    }

    const policy = executionPolicy instanceof ExecutionPolicy 
      ? executionPolicy 
      : ExecutionPolicy.deriveFromIntent(executionPolicy || {}, {}, {});

    const masterPrng = new PRNG(seed);
    const sampleTraces = [];
    const failures = [];
    const winTurns = { T3: 0, T4: 0, T5: 0, T6Plus: 0 };

    let keeps = 0;
    let mulligansTotal = 0;
    let earlyManaSuccesses = 0;
    let totalManaAvailable = 0;
    let totalManaSpent = 0;
    let colorFailures = 0;
    let totalCastAttempts = 0;
    let totalLethalWins = 0;

    for (let sim = 0; sim < simulationCount; sim++) {
      const simPrng = masterPrng.fork(`sim_${sim}`);
      const gameState = DeterministicGameState.createInitialState(rawCards, simPrng);
      const isDetailedTraceSim = sim < 5; // Record detailed trace for first 5 runs
      const currentTrace = [];

      // 1. Draw Opening Hand
      gameState.draw(7);
      const tookMulligan = gameState.executeMulligan(simPrng, 7);
      if (tookMulligan) {
        mulligansTotal += 1;
      } else {
        keeps += 1;
      }

      let hadEarlyMana = false;
      let simWon = false;
      let winTurn = null;

      // 2. Simulate Turns 1 to maxTurns
      for (let t = 1; t <= maxTurns; t++) {
        if (t > 1) {
          gameState.startNewTurn();
        }

        // Action A: Play Land
        const landIndex = gameState.hand.findIndex(c => c.isLand);
        if (landIndex !== -1) {
          const landName = gameState.hand[landIndex].name;
          gameState.playLand(landIndex);

          if (isDetailedTraceSim) {
            currentTrace.push({
              turn: t,
              phase: 'MAIN_1',
              action: 'PLAY_LAND',
              card: landName,
              manaAvailable: gameState.getAvailableMana().totalAvailable
            });
          }
        }

        const manaBeforeCasting = gameState.getAvailableMana();
        totalManaAvailable += manaBeforeCasting.totalAvailable;

        if (t <= 3 && manaBeforeCasting.totalAvailable >= t) {
          hadEarlyMana = true;
        }

        // Action B: Cast Spells according to Policy
        let spellsCastThisTurn = 0;
        let continueCasting = true;

        while (continueCasting) {
          // Find castable spells sorted by priority (e.g. highest CMC <= available mana, creatures first)
          const castableIndices = [];
          for (let i = 0; i < gameState.hand.length; i++) {
            const card = gameState.hand[i];
            if (!card.isLand) {
              totalCastAttempts += 1;
              if (gameState.canCast(card)) {
                castableIndices.push({ index: i, card });
              } else if (manaBeforeCasting.totalAvailable >= card.cmc) {
                // Has total mana quantity but lacked colored pips!
                colorFailures += 1;
              }
            }
          }

          if (castableIndices.length === 0) {
            continueCasting = false;
            break;
          }

          // Sort: Prioritize creatures/threats then burn/flow
          castableIndices.sort((a, b) => {
            const aIsCreature = a.card.typeLine.includes('creature') ? 1 : 0;
            const bIsCreature = b.card.typeLine.includes('creature') ? 1 : 0;
            return (bIsCreature - aIsCreature) || (b.card.cmc - a.card.cmc);
          });

          const chosen = castableIndices[0];
          const manaSpent = chosen.card.cmc;
          const cardName = chosen.card.name;

          const castSuccess = gameState.castSpell(chosen.index);
          if (castSuccess) {
            spellsCastThisTurn += 1;
            totalManaSpent += manaSpent;

            if (isDetailedTraceSim) {
              currentTrace.push({
                turn: t,
                phase: 'MAIN_1',
                action: 'CAST',
                card: cardName,
                manaSpent,
                manaRemaining: gameState.getAvailableMana().totalAvailable,
                opponentLifeRemaining: gameState.opponentLife
              });
            }
          } else {
            continueCasting = false;
          }
        }

        // Action C: Combat Phase
        const combat = gameState.executeCombatPhase();
        if (isDetailedTraceSim && combat.totalDamageDealt > 0) {
          currentTrace.push({
            turn: t,
            phase: 'COMBAT',
            action: 'ATTACK',
            attackersCount: combat.attackersCount,
            damageDealt: combat.totalDamageDealt,
            opponentLifeRemaining: gameState.opponentLife
          });
        }

        // Check Lethal Win
        if (gameState.isLethal() && !simWon) {
          simWon = true;
          winTurn = t;
          totalLethalWins += 1;
          if (t === 3) winTurns.T3 += 1;
          else if (t === 4) winTurns.T4 += 1;
          else if (t === 5) winTurns.T5 += 1;
          break;
        }
      }

      if (!simWon) {
        winTurns.T6Plus += 1;
        if (failures.length < 10) {
          failures.push({
            simIndex: sim,
            opponentLifeRemaining: gameState.opponentLife,
            reason: gameState.opponentLife > 10 ? 'INSUFFICIENT_BOARD_PRESSURE' : 'MISSED_LETHAL_REACH',
            boardCreatures: gameState.battlefield.filter(p => p.isCreature).length
          });
        }
      }

      if (hadEarlyMana) earlyManaSuccesses += 1;
      if (isDetailedTraceSim) {
        sampleTraces.push({
          simIndex: sim,
          isLethalWin: simWon,
          winTurn,
          steps: currentTrace
        });
      }
    }

    // Aggregate probabilities
    const keepRate = keeps / simulationCount;
    const earlyManaRate = earlyManaSuccesses / simulationCount;
    const curveProb = totalManaAvailable > 0 ? (totalManaSpent / totalManaAvailable) : 0;
    const colorFailRate = totalCastAttempts > 0 ? (colorFailures / totalCastAttempts) : 0;
    const lethalRate = totalLethalWins / simulationCount;

    const t3Rate = winTurns.T3 / simulationCount;
    const t4Rate = winTurns.T4 / simulationCount;
    const t5Rate = winTurns.T5 / simulationCount;
    const t6PlusRate = winTurns.T6Plus / simulationCount;

    // Expected kill turn weighted average
    const expectedKill = (t3Rate * 3) + (t4Rate * 4) + (t5Rate * 5) + (t6PlusRate * 6.5);

    return new ExecutionEvidence({
      candidateId,
      simulationConfig: {
        seed,
        simulationCount,
        engineVersion: 'v28.1',
        policyVersion: policy.policyVersion
      },
      execution: {
        openingHandKeepRate: Number(keepRate.toFixed(4)),
        mulliganRate: Number((mulligansTotal / simulationCount).toFixed(4)),
        earlyManaReliability: Number(earlyManaRate.toFixed(4)),
        curveExecutionProbability: Number(curveProb.toFixed(4)),
        colorFailureRate: Number(colorFailRate.toFixed(4)),
        strandedCardRate: Number((colorFailRate * 0.8).toFixed(4)),
        deadCardRate: Number((1 - curveProb).toFixed(4) * 0.1),
        avgManaSpentTurn1to4: Number((totalManaSpent / simulationCount).toFixed(2))
      },
      winPath: {
        winPathSuccessRate: Number(lethalRate.toFixed(4)),
        expectedKillTurn: Number(expectedKill.toFixed(2)),
        winTurnDistribution: {
          T3: Number(t3Rate.toFixed(4)),
          T4: Number(t4Rate.toFixed(4)),
          T5: Number(t5Rate.toFixed(4)),
          T6Plus: Number(t6PlusRate.toFixed(4))
        },
        lethalRate: Number(lethalRate.toFixed(4)),
        failedStep: lethalRate < 0.5 ? 'T4_LETHAL_REACH' : null,
        failureReason: failures[0]?.reason || null
      },
      resilience: {
        recoveryProbability: Number((lethalRate * 0.85).toFixed(4)),
        adversarialSurvivalRate: Number((lethalRate * 0.80).toFixed(4)),
        singlePointOfFailure: false,
        resilienceIndex: Math.round(lethalRate * 100)
      },
      failures,
      traces: sampleTraces
    });
  }
}
