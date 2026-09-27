/**
 * src/services/compiler/core/winPathExecutionSimulator.js
 * 
 * WinPath Reality Simulator & Dynamic Lethal Diagnostics v28.1.
 * 
 * Simulates turn-by-turn combat, board pressure, damage milestones, and node fulfillment.
 * Detects WINPATH_FALSE_POSITIVE when decks possess theoretical tags but fail empirical execution.
 */

import { DeterministicGameState } from './deterministicGameState.js';
import { PRNG } from './prng.js';
import { ExecutionPolicy } from './executionPolicy.js';

export class WinPathExecutionSimulator {
  /**
   * Simulates empirical WinPath execution over N seeded trials.
   * 
   * @param {Array<Object>|Object} deckInput 
   * @param {Object} options 
   * @returns {Object} Structured WinPath Execution Report
   */
  static simulateWinPath(deckInput, {
    winPathNodes = ['TURN1_PRESSURE', 'TURN2_DEVELOPMENT', 'AMPLIFY_BOARD_PRESSURE', 'LETHAL_REACH'],
    executionPolicy = null,
    seed = 472918,
    simulationCount = 1000,
    maxTurns = 5
  } = {}) {
    const rawCards = Array.isArray(deckInput) ? deckInput : (deckInput?.cards || []);
    if (!rawCards || rawCards.length === 0) {
      return {
        pathSuccessRate: 0,
        isFalsePositive: true,
        winTurnDistribution: { T3: 0, T4: 0, T5: 0, T6Plus: 1.0 },
        failedStep: 'EMPTY_DECK',
        failureReason: 'NO_CARDS_IN_DECK',
        damageByTurn: { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0 }
      };
    }

    const policy = executionPolicy instanceof ExecutionPolicy 
      ? executionPolicy 
      : ExecutionPolicy.deriveFromIntent(executionPolicy || {}, {}, {});

    const masterPrng = new PRNG(seed);
    const nodeSuccessCounts = {};
    for (const node of winPathNodes) {
      nodeSuccessCounts[node] = 0;
    }

    const damageAccumulator = { T1: 0, T2: 0, T3: 0, T4: 0, T5: 0 };
    const winTurns = { T3: 0, T4: 0, T5: 0, T6Plus: 0 };
    let totalPathSuccesses = 0;
    const failureCauses = {};

    for (let sim = 0; sim < simulationCount; sim++) {
      const simPrng = masterPrng.fork(`winpath_${sim}`);
      const gameState = DeterministicGameState.createInitialState(rawCards, simPrng);

      gameState.draw(7);
      gameState.executeMulligan(simPrng, 7);

      const fulfilledThisSim = new Set();
      let cumulativeDamage = 0;
      let wonOnTurn = null;

      for (let t = 1; t <= maxTurns; t++) {
        if (t > 1) {
          gameState.startNewTurn();
        }

        // 1. Play Land
        const landIdx = gameState.hand.findIndex(c => c.isLand);
        if (landIdx !== -1) {
          gameState.playLand(landIdx);
        }

        // 2. Cast Available Spells
        let castCount = 0;
        let continueCasting = true;
        while (continueCasting) {
          const castable = [];
          for (let i = 0; i < gameState.hand.length; i++) {
            const card = gameState.hand[i];
            if (!card.isLand && gameState.canCast(card)) {
              castable.push({ index: i, card });
            }
          }
          if (castable.length === 0) {
            continueCasting = false;
            break;
          }

          // Prioritize creatures and amps
          castable.sort((a, b) => (b.card.cmc - a.card.cmc));
          const chosen = castable[0];
          const ok = gameState.castSpell(chosen.index);
          if (ok) {
            castCount += 1;
          } else {
            continueCasting = false;
          }
        }

        // Check Turn-specific Node Fulfillment
        const creaturesOnBoard = gameState.battlefield.filter(p => p.isCreature).length;
        if (t === 1 && (creaturesOnBoard >= 1 || gameState.opponentLife < 20)) {
          fulfilledThisSim.add('TURN1_PRESSURE');
        }
        if (t === 2 && creaturesOnBoard >= 2) {
          fulfilledThisSim.add('TURN2_DEVELOPMENT');
        }
        if (t === 3 && (creaturesOnBoard >= 3 || gameState.battlefield.some(p => p.card?.oracle_text?.includes('+1/+1')))) {
          fulfilledThisSim.add('AMPLIFY_BOARD_PRESSURE');
        }

        // 3. Combat Phase
        const combat = gameState.executeCombatPhase();
        const turnDamage = (20 - gameState.opponentLife) - cumulativeDamage;
        cumulativeDamage = 20 - gameState.opponentLife;

        if (t === 1) damageAccumulator.T1 += turnDamage;
        if (t === 2) damageAccumulator.T2 += turnDamage;
        if (t === 3) damageAccumulator.T3 += turnDamage;
        if (t === 4) damageAccumulator.T4 += turnDamage;
        if (t === 5) damageAccumulator.T5 += turnDamage;

        // Check Lethal
        if (gameState.isLethal() && wonOnTurn === null) {
          wonOnTurn = t;
          fulfilledThisSim.add('LETHAL_REACH');
          if (t === 3) winTurns.T3 += 1;
          else if (t === 4) winTurns.T4 += 1;
          else if (t === 5) winTurns.T5 += 1;
          break;
        }
      }

      if (wonOnTurn === null) {
        winTurns.T6Plus += 1;
        const cause = gameState.opponentLife > 12 ? 'INSUFFICIENT_ATTACKERS' : 'LACK_OF_DIRECT_REACH';
        failureCauses[cause] = (failureCauses[cause] || 0) + 1;
      }

      // Record nodes fulfilled
      for (const node of winPathNodes) {
        if (fulfilledThisSim.has(node)) {
          nodeSuccessCounts[node] += 1;
        }
      }

      if (winPathNodes.every(n => fulfilledThisSim.has(n))) {
        totalPathSuccesses += 1;
      }
    }

    const nodeRates = {};
    let minRate = 1.0;
    let bottleneckNode = null;

    for (const [node, count] of Object.entries(nodeSuccessCounts)) {
      const rate = Number((count / simulationCount).toFixed(4));
      nodeRates[node] = rate;
      if (rate < minRate) {
        minRate = rate;
        bottleneckNode = node;
      }
    }

    const pathSuccessRate = Number((totalPathSuccesses / simulationCount).toFixed(4));
    const isFalsePositive = pathSuccessRate < 0.35 && Object.values(nodeRates).some(r => r > 0.80);

    // Primary failure cause
    const topFailureReason = Object.entries(failureCauses).sort((a, b) => b[1] - a[1])[0]?.[0] || 'STABILIZED_BY_CURVE';

    return Object.freeze({
      pathSuccessRate,
      isFalsePositive,
      nodeCompletionRates: Object.freeze(nodeRates),
      failedStep: bottleneckNode,
      failureReason: topFailureReason,
      damageByTurn: Object.freeze({
        T1: Number((damageAccumulator.T1 / simulationCount).toFixed(2)),
        T2: Number((damageAccumulator.T2 / simulationCount).toFixed(2)),
        T3: Number((damageAccumulator.T3 / simulationCount).toFixed(2)),
        T4: Number((damageAccumulator.T4 / simulationCount).toFixed(2)),
        T5: Number((damageAccumulator.T5 / simulationCount).toFixed(2))
      }),
      winTurnDistribution: Object.freeze({
        T3: Number((winTurns.T3 / simulationCount).toFixed(4)),
        T4: Number((winTurns.T4 / simulationCount).toFixed(4)),
        T5: Number((winTurns.T5 / simulationCount).toFixed(4)),
        T6Plus: Number((winTurns.T6Plus / simulationCount).toFixed(4))
      })
    });
  }
}
