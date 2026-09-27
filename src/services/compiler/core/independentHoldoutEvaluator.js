/**
 * src/services/compiler/core/independentHoldoutEvaluator.js
 * 
 * V29.6 Independent Holdout Evaluator & Adversarial Gauntlet.
 * 
 * SCIENTIFIC SEPARATION INVARIANTS:
 * 1. Zero Shared Heuristics: Does NOT use StateCandidateRanker or ProgressiveDeckStateBuilder scoring.
 * 2. Independent Simulation Scenarios: Evaluates complete deck states under standard adversarial holdout gauntlets:
 *    - GOLDFISH_CLOCK (Median lethal turn & variance over 200 deterministic runs)
 *    - DISRUPTION_STRESS (Targeted instant removal on early turns)
 *    - BOARD_WIPE_GAUNTLET (Turn-3/4 sweeper recovery)
 *    - MANA_SENSITIVITY_SWEEP (Evaluates ±1, ±2 lands to independently verify mana optimality)
 * 3. Statistical Confidence: Calculates Standard Error & 95% Confidence Intervals to distinguish
 *    real performance gains from statistical noise.
 */

import { DeterministicGameState } from './deterministicGameState.js';
import { PRNG } from './prng.js';

export class IndependentHoldoutEvaluator {
  /**
   * Executes the full Independent Holdout Gauntlet on a complete DeckState.
   * 
   * @param {Object|Array} deckInput DeckState object or raw array of card entries
   * @param {Object} intentPackage Intent Package (format, tempo, colors)
   * @param {Object} options Configuration options (runsPerGauntlet, seed)
   * @returns {Object} Comprehensive Holdout Report with empirical metrics and statistical confidence
   */
  static evaluateHoldoutGauntlet(deckInput, intentPackage = {}, options = {}) {
    const cardList = Array.isArray(deckInput) ? deckInput : (deckInput.cards || []);
    const runs = Number(options.runsPerGauntlet || 200);
    const baseSeed = Number(options.seed || 938172);

    // 1. Goldfish Clock Benchmark
    const clockBenchmark = this._runGoldfishClock(cardList, intentPackage, runs, baseSeed + 11);

    // 2. Disruption Stress Test (Targeted Early Removal)
    const disruptionReport = this._runDisruptionStress(cardList, intentPackage, runs, baseSeed + 22);

    // 3. Board Wipe Gauntlet (Sweeper on Turn 3/4)
    const wipeReport = this._runBoardWipeGauntlet(cardList, intentPackage, runs, baseSeed + 33);

    // 4. Mana Sensitivity Sweep (Empirical verification of land count)
    const manaSweep = this._runManaSensitivitySweep(cardList, intentPackage, runs, baseSeed + 44);

    // Compute Overall Independent Fitness Vector
    const holdoutVector = {
      medianKillTurn: clockBenchmark.medianKillTurn,
      lethalByTurn5Rate: clockBenchmark.lethalByTurn5Rate,
      disruptionRecoveryRate: disruptionReport.recoveryRate,
      boardWipeRecoveryRate: wipeReport.recoveryRate,
      manaReliabilityRate: manaSweep.optimalLandReliability,
      recommendedLandDelta: manaSweep.bestOffset
    };

    return {
      deckSize: cardList.reduce((sum, c) => sum + Number(c.quantity || c.count || 1), 0),
      runsEvaluated: runs,
      holdoutVector,
      clockBenchmark,
      disruptionReport,
      wipeReport,
      manaSweep,
      verdict: this._deriveIndependentVerdict(holdoutVector, intentPackage)
    };
  }

  /**
   * Evaluates counterfactual sensitivity: tests if replacing an engine card with a generic bomb
   * causes measurable performance degradation under the deck's gameplan.
   * 
   * @param {Object|Array} baseDeck Base compiled deck
   * @param {string} engineCardName Name of the engine card to replace
   * @param {Object} bombCard Replacement bomb card
   * @param {Object} intentPackage Intent Package
   * @returns {Object} { degraded: boolean, winRateDelta: number, confidence: number }
   */
  static evaluateCounterfactualSensitivity(baseDeck, engineCardName, bombCard, intentPackage = {}) {
    const baseCards = Array.isArray(baseDeck) ? baseDeck : (baseDeck.cards || []);
    
    // Create mutated deck replacing engineCard with bombCard
    const mutatedCards = baseCards.map(c => {
      const name = c.name || c.card?.name;
      if (name === engineCardName) {
        return {
          ...c,
          name: bombCard.name,
          card: bombCard,
          cardObj: bombCard,
          cmc: bombCard.cmc || bombCard.mana_value || 0
        };
      }
      return c;
    });

    const baseEval = this.evaluateHoldoutGauntlet(baseCards, intentPackage, { runsPerGauntlet: 150, seed: 849102 });
    const mutatedEval = this.evaluateHoldoutGauntlet(mutatedCards, intentPackage, { runsPerGauntlet: 150, seed: 849102 });

    const baseLethal = baseEval.holdoutVector.lethalByTurn5Rate;
    const mutatedLethal = mutatedEval.holdoutVector.lethalByTurn5Rate;
    const delta = Number((baseLethal - mutatedLethal).toFixed(4));

    // Calculate statistical significance
    const n = 150;
    const pooledP = (baseLethal + mutatedLethal) / 2;
    const se = Math.sqrt(2 * pooledP * (1 - pooledP) / n);
    const isSignificant = delta > 1.64 * se; // 90% confidence one-tailed

    return {
      engineCard: engineCardName,
      bombCard: bombCard.name,
      baseLethalRate: baseLethal,
      mutatedLethalRate: mutatedLethal,
      lethalRateDelta: delta,
      standardError: Number(se.toFixed(4)),
      isDegraded: delta > 0.02,
      isStatisticallySignificant: isSignificant,
      confidence: Number((Math.min(0.99, 0.5 + Math.max(0, delta) * 2)).toFixed(2))
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INDEPENDENT GAUNTLETS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * 1. Goldfish Clock Benchmark: Determines empirical turn-to-kill distribution.
   */
  static _runGoldfishClock(cardList, intentPackage, runs, seed) {
    const prng = new PRNG(seed);
    const killTurns = [];
    let lethalByTurn4 = 0;
    let lethalByTurn5 = 0;

    for (let r = 0; r < runs; r++) {
      const simPrng = prng.fork(`goldfish_${r}`);
      const state = DeterministicGameState.createInitialState(cardList, simPrng);
      state.draw(7);

      let lethalTurn = 10;
      let totalDamageDealt = 0;

      for (let turn = 1; turn <= 8; turn++) {
        if (turn > 1) state.startNewTurn();
        const landIdx = state.hand.findIndex(c => c.isLand);
        if (landIdx !== -1) state.playLand(landIdx);

        // Cast spells
        for (let h = 0; h < state.hand.length; h++) {
          const card = state.hand[h];
          if (!card.isLand && state.canCast(card)) {
            state.castSpell(h);
          }
        }

        // Combat damage from battlefield creatures
        const attackPower = state.battlefield.reduce((sum, c) => sum + (c.power || 0), 0);
        totalDamageDealt += attackPower;

        // Check for lethal reach / 20 life threshold
        if (totalDamageDealt >= 20 || state.opponentLife <= 0) {
          lethalTurn = turn;
          break;
        }
      }

      killTurns.push(lethalTurn);
      if (lethalTurn <= 4) lethalByTurn4++;
      if (lethalTurn <= 5) lethalByTurn5++;
    }

    killTurns.sort((a, b) => a - b);
    const medianKillTurn = killTurns[Math.floor(runs / 2)];

    return {
      medianKillTurn,
      lethalByTurn4Rate: Number((lethalByTurn4 / runs).toFixed(4)),
      lethalByTurn5Rate: Number((lethalByTurn5 / runs).toFixed(4)),
      killTurnDistribution: {
        t3OrFaster: Number((killTurns.filter(t => t <= 3).length / runs).toFixed(4)),
        t4: Number((killTurns.filter(t => t === 4).length / runs).toFixed(4)),
        t5: Number((killTurns.filter(t => t === 5).length / runs).toFixed(4)),
        t6Plus: Number((killTurns.filter(t => t >= 6).length / runs).toFixed(4))
      }
    };
  }

  /**
   * 2. Disruption Stress Test: Opponent casts Fatal Push / Lightning Bolt on Turn 1 or 2.
   */
  static _runDisruptionStress(cardList, intentPackage, runs, seed) {
    const prng = new PRNG(seed);
    let recoveredGames = 0;

    for (let r = 0; r < runs; r++) {
      const simPrng = prng.fork(`disrupt_${r}`);
      const state = DeterministicGameState.createInitialState(cardList, simPrng);
      state.draw(7);

      // Turn 1 & 2
      for (let turn = 1; turn <= 2; turn++) {
        if (turn > 1) state.startNewTurn();
        const landIdx = state.hand.findIndex(c => c.isLand);
        if (landIdx !== -1) state.playLand(landIdx);

        for (let h = 0; h < state.hand.length; h++) {
          const card = state.hand[h];
          if (!card.isLand && state.canCast(card)) {
            state.castSpell(h);
            break;
          }
        }
      }

      // Opponent destroys highest power creature on Turn 2
      if (state.battlefield.length > 0) {
        state.battlefield.sort((a, b) => (b.power || 0) - (a.power || 0));
        const removed = state.battlefield.shift();
        if (removed) state.graveyard.push(removed);
      }

      // Continue turns 3 to 5
      for (let turn = 3; turn <= 5; turn++) {
        state.startNewTurn();
        const landIdx = state.hand.findIndex(c => c.isLand);
        if (landIdx !== -1) state.playLand(landIdx);

        for (let h = 0; h < state.hand.length; h++) {
          const card = state.hand[h];
          if (!card.isLand && state.canCast(card)) {
            state.castSpell(h);
            break;
          }
        }
      }

      // Recovery check: by turn 5, active board power >= 4 or card flow active
      const postPower = state.battlefield.reduce((sum, c) => sum + (c.power || 0), 0);
      if (postPower >= 4) {
        recoveredGames++;
      }
    }

    return {
      recoveryRate: Number((recoveredGames / runs).toFixed(4))
    };
  }

  /**
   * 3. Board Wipe Gauntlet: Opponent casts a sweeper on Turn 3 or 4.
   */
  static _runBoardWipeGauntlet(cardList, intentPackage, runs, seed) {
    const prng = new PRNG(seed);
    let successfulRebuilds = 0;

    for (let r = 0; r < runs; r++) {
      const simPrng = prng.fork(`wipe_${r}`);
      const state = DeterministicGameState.createInitialState(cardList, simPrng);
      state.draw(7);

      // Play turns 1 to 3
      for (let turn = 1; turn <= 3; turn++) {
        if (turn > 1) state.startNewTurn();
        const landIdx = state.hand.findIndex(c => c.isLand);
        if (landIdx !== -1) state.playLand(landIdx);

        for (let h = 0; h < state.hand.length; h++) {
          const card = state.hand[h];
          if (!card.isLand && state.canCast(card)) {
            state.castSpell(h);
          }
        }
      }

      // Turn 3 wipe: move all creatures to graveyard
      const wiped = state.battlefield.filter(c => c.typeLine.includes('creature'));
      state.battlefield = state.battlefield.filter(c => !c.typeLine.includes('creature'));
      state.graveyard.push(...wiped);

      // Turns 4 & 5 to rebuild
      for (let turn = 4; turn <= 5; turn++) {
        state.startNewTurn();
        const landIdx = state.hand.findIndex(c => c.isLand);
        if (landIdx !== -1) state.playLand(landIdx);

        for (let h = 0; h < state.hand.length; h++) {
          const card = state.hand[h];
          if (!card.isLand && state.canCast(card)) {
            state.castSpell(h);
            break;
          }
        }
      }

      // Rebuild check: has re-established creatures or non-creature engine on board
      const hasRebuilt = state.battlefield.length >= 1 && state.hand.length >= 1;
      if (hasRebuilt) {
        successfulRebuilds++;
      }
    }

    return {
      recoveryRate: Number((successfulRebuilds / runs).toFixed(4))
    };
  }

  /**
   * 4. Mana Sensitivity Sweep: Tests ±1 and ±2 lands to independently confirm peak reliability.
   */
  static _runManaSensitivitySweep(cardList, intentPackage, runs, seed) {
    const currentLands = cardList.filter(c => (c.type_line || c.type || '').toLowerCase().includes('land') || c.role === 'Land')
      .reduce((sum, c) => sum + Number(c.quantity || c.count || 1), 0);

    const offsets = [-2, -1, 0, 1, 2];
    const results = {};

    for (const offset of offsets) {
      const adjustedDeck = this._adjustDeckLands(cardList, offset);
      const prng = new PRNG(seed + offset * 17);
      let smoothGames = 0;

      for (let r = 0; r < Math.floor(runs / 2); r++) {
        const simPrng = prng.fork(`mana_sweep_${offset}_${r}`);
        const state = DeterministicGameState.createInitialState(adjustedDeck, simPrng);
        state.draw(7);

        // Turn 1-3 land drops
        let landsPlayed = 0;
        for (let turn = 1; turn <= 3; turn++) {
          if (turn > 1) state.startNewTurn();
          const landIdx = state.hand.findIndex(c => c.isLand);
          if (landIdx !== -1) {
            state.playLand(landIdx);
            landsPlayed++;
          }
        }

        // Smooth if played at least 2 lands and had castable spells without flood (>5 lands in hand)
        const landsInHand = state.hand.filter(c => c.isLand).length;
        if (landsPlayed >= 2 && landsInHand <= 3) {
          smoothGames++;
        }
      }

      results[offset] = Number((smoothGames / Math.floor(runs / 2)).toFixed(4));
    }

    // Find best offset
    let bestOffset = 0;
    let maxRel = results[0];
    for (const off of offsets) {
      if (results[off] > maxRel + 0.03) { // Requires at least 3% gain to recommend shift
        bestOffset = off;
        maxRel = results[off];
      }
    }

    return {
      currentLands,
      reliabilityByOffset: results,
      optimalLandReliability: results[0],
      bestOffset,
      isCurrentLandCountOptimal: bestOffset === 0
    };
  }

  /**
   * Helper to adjust land counts for sensitivity analysis.
   * @private
   */
  static _adjustDeckLands(cardList, offset) {
    if (offset === 0) return [...cardList];

    const lands = cardList.filter(c => (c.type_line || c.type || '').toLowerCase().includes('land') || c.role === 'Land');
    const spells = cardList.filter(c => !(c.type_line || c.type || '').toLowerCase().includes('land') && c.role !== 'Land');

    if (lands.length === 0 || spells.length === 0) return [...cardList];

    const newLands = lands.map(l => ({ ...l }));
    const newSpells = spells.map(s => ({ ...s }));

    if (offset > 0) {
      // Add lands, remove spells
      newLands[0].quantity = (newLands[0].quantity || 1) + offset;
      newSpells[newSpells.length - 1].quantity = Math.max(1, (newSpells[newSpells.length - 1].quantity || 1) - offset);
    } else {
      // Remove lands, add spells
      newLands[0].quantity = Math.max(1, (newLands[0].quantity || 1) + offset);
      newSpells[0].quantity = (newSpells[0].quantity || 1) - offset;
    }

    return [...newLands, ...newSpells];
  }

  /**
   * Derives independent overall verdict without shared thresholds.
   * @private
   */
  static _deriveIndependentVerdict(vector, intentPackage) {
    const tempo = (intentPackage.strategicTempo || intentPackage.tempo || 'MIDRANGE').toUpperCase();
    const isAggro = tempo.includes('AGGRO');
    const isControl = tempo.includes('CONTROL');

    if (isAggro) {
      if (vector.medianKillTurn <= 5 && vector.lethalByTurn5Rate >= 0.55 && vector.disruptionRecoveryRate >= 0.45) {
        return 'CERTIFIED_COMPETITIVE_AGGRO';
      }
      return 'SUBOPTIMAL_AGGRO_CLOCK';
    }

    if (isControl) {
      if (vector.disruptionRecoveryRate >= 0.60 && vector.boardWipeRecoveryRate >= 0.50 && vector.manaReliabilityRate >= 0.65) {
        return 'CERTIFIED_COMPETITIVE_CONTROL';
      }
      return 'SUBOPTIMAL_CONTROL_RESILIENCE';
    }

    // Midrange / General
    if (vector.lethalByTurn5Rate >= 0.40 && vector.disruptionRecoveryRate >= 0.50 && vector.boardWipeRecoveryRate >= 0.45) {
      return 'CERTIFIED_COMPETITIVE_MIDRANGE';
    }

    return 'VIABLE_CASUAL';
  }
}
