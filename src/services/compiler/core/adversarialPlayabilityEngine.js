/**
 * src/services/compiler/core/adversarialPlayabilityEngine.js
 * 
 * Adversarial Interruption & Board Rebuilding Simulator v28.1.
 * 
 * Injects abstract adversarial interaction scenarios:
 *   1. SPOT_REMOVAL_T2 (Destroys strongest creature / lord on Turn 2)
 *   2. BOARD_SWEEPER_T4 (Wrath of God wiping battlefield on Turn 4)
 *   3. COUNTER_PAYOFF_T3 (Counters primary 3-drop spell)
 * 
 * Evaluates whether the deck can rebuild board presence and achieve lethal victory despite disruption.
 */

import { DeterministicGameState } from './deterministicGameState.js';
import { PRNG } from './prng.js';
import { ExecutionPolicy } from './executionPolicy.js';

export class AdversarialPlayabilityEngine {
  /**
   * Simulates adversarial disruptions against the deck over N seeded trials.
   * 
   * @param {Array<Object>|Object} deckInput 
   * @param {Object} options 
   * @returns {Object} Structured Adversarial Survival Report
   */
  static simulateAdversarialScenarios(deckInput, {
    seed = 472918,
    simulationCount = 1000,
    maxTurns = 6
  } = {}) {
    const rawCards = Array.isArray(deckInput) ? deckInput : (deckInput?.cards || []);
    if (!rawCards || rawCards.length === 0) {
      return {
        survivalRate: 0,
        rebuildRate: 0,
        spotRemovalSurvivalRate: 0,
        winPathPreservationRate: 0,
        criticalFailurePoints: ['EMPTY_DECK']
      };
    }

    const masterPrng = new PRNG(seed);
    let spotRemovalSurvivals = 0;
    let sweeperSurvivals = 0;
    let counterSurvivals = 0;
    let totalWinsUnderDisruption = 0;
    const failurePoints = new Set();

    for (let sim = 0; sim < simulationCount; sim++) {
      const simPrng = masterPrng.fork(`adv_${sim}`);
      const gameState = DeterministicGameState.createInitialState(rawCards, simPrng);

      gameState.draw(7);
      gameState.executeMulligan(simPrng, 7);

      let simWon = false;
      const scenarioType = (sim % 3); // 0: Spot Removal, 1: Sweeper, 2: Counter

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

          // Prioritize creatures first, then burn
          castable.sort((a, b) => {
            const aIsC = a.card.typeLine.includes('creature') ? 1 : 0;
            const bIsC = b.card.typeLine.includes('creature') ? 1 : 0;
            return (bIsC - aIsC) || (b.card.cmc - a.card.cmc);
          });
          const chosen = castable[0];

          // Adversarial Counterspell on Turn 3
          if (t === 3 && scenarioType === 2 && chosen.card.cmc >= 2) {
            gameState.hand.splice(chosen.index, 1);
            gameState.graveyard.push(chosen.card);
            continueCasting = false;
            break;
          }

          const ok = gameState.castSpell(chosen.index);
          if (!ok) {
            continueCasting = false;
          }
        }

        // Adversarial Spot Removal on Turn 2
        if (t === 2 && scenarioType === 0) {
          const targetIndex = gameState.battlefield.findIndex(p => p.isCreature);
          if (targetIndex !== -1) {
            gameState.destroyPermanent(targetIndex);
          }
        }

        // Adversarial Board Sweeper on Turn 4 (before combat)
        if (t === 4 && scenarioType === 1) {
          while (true) {
            const cIdx = gameState.battlefield.findIndex(p => p.isCreature);
            if (cIdx === -1) break;
            gameState.destroyPermanent(cIdx);
          }
        }

        // 3. Combat Phase
        const combat = gameState.executeCombatPhase();

        // Check Victory
        if (gameState.isLethal()) {
          simWon = true;
          totalWinsUnderDisruption += 1;
          if (scenarioType === 0) spotRemovalSurvivals += 1;
          if (scenarioType === 1) sweeperSurvivals += 1;
          if (scenarioType === 2) counterSurvivals += 1;
          break;
        }
      }

      if (!simWon) {
        if (scenarioType === 1) failurePoints.add('SWEEPER_COLLAPSE');
        if (scenarioType === 0) failurePoints.add('SPOT_REMOVAL_STALL');
        if (scenarioType === 2) failurePoints.add('COUNTER_STALL');
      }
    }

    const thirdCount = simulationCount / 3;
    const survivalRate = Number((totalWinsUnderDisruption / simulationCount).toFixed(4));
    const sweeperRate = Number((sweeperSurvivals / thirdCount).toFixed(4));
    const spotRemovalRate = Number((spotRemovalSurvivals / thirdCount).toFixed(4));

    return Object.freeze({
      survivalRate,
      rebuildRate: sweeperRate,
      spotRemovalSurvivalRate: spotRemovalRate,
      winPathPreservationRate: survivalRate,
      criticalFailurePoints: Object.freeze([...failurePoints])
    });
  }
}
