/**
 * src/services/compiler/core/curveExecutionAnalyzer.js
 * 
 * UNIVERSAL CURVE & EXECUTION CONSTRAINT ANALYZER (v24.0 Core Engine)
 * 
 * Performs causal curve analysis, infrastructure verification, and multi-dimensional
 * marginal state evaluation (MarginalStateGain) without hardcoded quotas or static tribe names.
 * 
 * Principles:
 *   1. Zero Hardcoding: No HEAVY_TRIBES lists or rigid quotas (e.g. max 4-6).
 *   2. Contextual Castability: Distinguishes primary face cost from alternative execution modes (Cycling, Adventure, etc.).
 *   3. Proof Obligation Driven: Balances early survival vs late-game payoff progression.
 *   4. Multi-dimensional State Evaluation:
 *        V_exec = < reliableCastability, planExecutionProbability, survivalProbability, dependencyStatus, winPathContribution, marginalStateGain >
 */

import { CardCausalContract } from './cardCausalContract.js';
import { DemandSupplyLedger } from './demandSupplyLedger.js';

export class CurveExecutionAnalyzer {
  /**
   * Analyzes the current deck state curve metrics and operational capacity.
   * @param {Object} deckState Current deck state { cards: Array<{ card, count }> }
   * @param {Object} intentPackage IntentPackage IR
   * @returns {Object} CurveStateAnalysis
   */
  static analyzeCurveState(deckState = { cards: [] }, intentPackage = {}) {
    const cards = Array.isArray(deckState.cards) ? deckState.cards : [];
    let totalNonLands = 0;
    let landsCount = 0;
    let rampSources = 0;
    let earlyInteractionCount = 0;
    let highCmcCount = 0;
    const curveDistribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, '7+': 0 };

    for (const item of cards) {
      const card = item.card || item;
      const count = Number(item.count || item.quantity || 1);
      const isLand = (card.type_line || card.typeLine || '').toLowerCase().includes('land');

      if (isLand) {
        landsCount += count;
        continue;
      }

      totalNonLands += count;
      const contract = card.cardIdentity ? card : CardCausalContract.parse(card);
      const cmc = Number(card.cmc || card.mana_value || 0);
      const effectiveDemand = contract?.effectiveManaDemand;
      const isXCost = effectiveDemand?.isXCost || false;
      const effectiveCmc = effectiveDemand?.effectiveOperationalCmc || (isXCost ? Math.max(4, cmc + 2) : cmc);
      const earliestTurn = effectiveDemand?.earliestExecutableTurn ?? (isXCost ? Math.max(3, cmc + 2) : Math.max(1, cmc));

      // Track distribution using effective operational CMC for X-spells
      if (effectiveCmc <= 6) curveDistribution[effectiveCmc] = (curveDistribution[effectiveCmc] || 0) + count;
      else curveDistribution['7+'] = (curveDistribution['7+'] || 0) + count;

      // Track high-cost pressure (cards with primary demand >= 5 that lack early alternative mode)
      const isHeavyPrimary = effectiveCmc >= 5;
      const hasEarlyAlt = effectiveDemand?.hasEarlyInteractionAlternative || false;
      if (isHeavyPrimary && !hasEarlyAlt) {
        highCmcCount += count;
      }

      // Track early interaction / velocity (Turn 1-2) - excluding X-cost spells without early alternative modes
      if (earliestTurn <= 2 && (!isXCost || hasEarlyAlt)) {
        earlyInteractionCount += count;
      }

      // Track mana acceleration
      const oracle = (card.oracle_text || card.oracleText || '').toLowerCase();
      if (oracle.includes('{t}: add') || oracle.includes('search your library for a basic land') || oracle.includes('search your library for a land') || oracle.includes('search your library for up to')) {
        rampSources += count;
      }
    }

    const earlyGameDensity = totalNonLands > 0 ? (earlyInteractionCount / totalNonLands) : 0;
    const highCmcPressure = totalNonLands > 0 ? (highCmcCount / totalNonLands) : 0;

    // Hypergeometric / Karsten approximation of casting on curve
    const effectiveManaPool = landsCount + (rampSources * 0.8);
    const reliableCastability5 = this._calculateCastProbability(5, 5, effectiveManaPool, 60);
    const reliableCastability6 = this._calculateCastProbability(6, 6, effectiveManaPool, 60);

    // Survival Probability: capacity to interact on Turns 1-3
    const survivalProbability = Math.min(1.0, Math.max(0.1, (earlyInteractionCount / 12)));

    // Plan Execution Probability
    const tempo = (intentPackage.tempo || intentPackage.archetype || '').toLowerCase();
    const isControl = tempo.includes('control');
    const isRamp = tempo.includes('ramp') || (intentPackage.userConstraints?.selectedEngineId || '').toLowerCase().includes('ramp');

    let planExecutionProbability = 0.5;
    if (isControl) {
      // Control needs high early survival + reliable mana to reach late-game payoff
      planExecutionProbability = (survivalProbability * 0.6) + (reliableCastability5 * 0.4);
    } else if (isRamp) {
      // Ramp needs rapid mana development into heavy threats
      const rampDensity = Math.min(1.0, rampSources / 8);
      planExecutionProbability = (rampDensity * 0.5) + (reliableCastability6 * 0.5);
    } else {
      // Aggro / Midrange
      planExecutionProbability = (earlyGameDensity * 0.7) + (survivalProbability * 0.3);
    }

    return {
      totalNonLands,
      landsCount,
      rampSources,
      earlyInteractionCount,
      highCmcCount,
      earlyGameDensity,
      highCmcPressure,
      reliableCastability: {
        cmc5OnTurn5: reliableCastability5,
        cmc6OnTurn6: reliableCastability6
      },
      survivalProbability,
      planExecutionProbability,
      curveDistribution
    };
  }

  /**
   * Evaluates the multi-dimensional MarginalStateGain when adding a candidate card to currentState.
   * @param {Object} currentState Current deck state
   * @param {Object} candidate Candidate MTG Card
   * @param {Object} intentPackage IntentPackage IR
   * @param {Object} targetSlot Target slot being filled
   * @returns {Object} ExecutionVector { reliableCastability, planExecutionProbability, survivalProbability, dependencyStatus, winPathContribution, marginalStateGain, isAccepted }
   */
  static evaluateMarginalAddition(currentState, candidate, intentPackage = {}, targetSlot = {}) {
    const contract = candidate.cardIdentity ? candidate : CardCausalContract.parse(candidate);
    const cmc = Number(candidate.cmc || candidate.mana_value || 0);
    const effectiveDemand = contract?.effectiveManaDemand;
    const earliestExecutableTurn = effectiveDemand?.earliestExecutableTurn ?? Math.max(1, cmc);
    const hasEarlyAlt = effectiveDemand?.hasEarlyInteractionAlternative || false;

    // 1. Dependency Status via DemandSupplyLedger
    const demandAudit = DemandSupplyLedger.auditCardDemands(candidate, currentState, intentPackage);
    let dependencyStatus = 'SUPPORTED';
    if (!demandAudit.isSatisfied) {
      const hasHardDemand = demandAudit.demands.some(d => d.necessity === 'HARD');
      dependencyStatus = hasHardDemand ? 'HARD_UNFULFILLED' : 'CONDITIONAL_LOW_RELIABILITY';
    }

    // 2. Current State Analysis
    const curveAnalysisBefore = this.analyzeCurveState(currentState, intentPackage);

    // 3. Simulated Next State
    const simulatedCards = [...(currentState.cards || []), { card: candidate, count: targetSlot.requiredDensity || 4 }];
    const curveAnalysisAfter = this.analyzeCurveState({ cards: simulatedCards }, intentPackage);

    // 4. Payoff Gain (Diminishing returns per additional heavy finisher)
    const role = (targetSlot.role || '').toLowerCase();
    const isFinisherRole = role.includes('finisher') || role.includes('win_condition') || role.includes('apex') || role.includes('top_curve');
    const isStabilizerRole = role.includes('sweeper') || role.includes('board_wipe') || role.includes('stabilization');
    const isEarlyRole = role.includes('removal') || role.includes('turn1') || role.includes('turn2') || role.includes('flow');

    let payoffGain = 0;
    if (isFinisherRole) {
      // First finisher yields substantial winpath progress; each additional decays
      const existingHeavyFinishers = curveAnalysisBefore.highCmcCount;
      const decayFactor = 1 / (1 + (existingHeavyFinishers * 0.5));
      payoffGain = 1.0 * decayFactor;
    } else if (isStabilizerRole) {
      payoffGain = 0.85;
    } else if (isEarlyRole) {
      payoffGain = 0.70;
    } else {
      payoffGain = 0.50;
    }

    // 5. Survival Cost (Penalizes adding heavy uncastable cards when early infrastructure is stressed)
    let survivalCost = 0;
    const tempo = (intentPackage.tempo || intentPackage.archetype || '').toLowerCase();
    const isControl = tempo.includes('control');
    const isRamp = tempo.includes('ramp') || (intentPackage.userConstraints?.selectedEngineId || '').toLowerCase().includes('ramp');

    if (cmc >= 5 && !hasEarlyAlt) {
      if (isControl && !isRamp) {
        // In Control without ramp, each additional heavy spell without early mode increases clunkiness
        const heavyCount = curveAnalysisBefore.highCmcCount;
        const castRisk = 1.0 - curveAnalysisBefore.reliableCastability.cmc5OnTurn5;
        survivalCost = (heavyCount * 0.25) + (castRisk * 0.6);
      } else if (!isRamp) {
        // In Aggro / Tempo / Midrange without ramp
        const heavyCount = curveAnalysisBefore.highCmcCount;
        survivalCost = (heavyCount * 0.35) + 0.4;
      } else {
        // In Ramp: Supported by mana infrastructure
        const rampSupport = curveAnalysisBefore.rampSources;
        if (rampSupport < 4) {
          survivalCost = 0.4; // Mana acceleration needed first
        } else {
          survivalCost = 0.05; // Fully supported by ramp engine
        }
      }
    }

    // Adjust for Dependency Status
    if (dependencyStatus === 'HARD_UNFULFILLED') {
      survivalCost += 5.0; // Overwhelming penalty for unmet hard dependencies
    } else if (dependencyStatus === 'CONDITIONAL_LOW_RELIABILITY') {
      survivalCost += 0.4;
    }

    // 6. Net Marginal State Gain
    const marginalStateGain = Math.round((payoffGain - survivalCost) * 100) / 100;
    const isAccepted = marginalStateGain > 0 && dependencyStatus !== 'HARD_UNFULFILLED';

    return {
      reliableCastability: cmc >= 5 ? curveAnalysisAfter.reliableCastability.cmc5OnTurn5 : 1.0,
      planExecutionProbability: curveAnalysisAfter.planExecutionProbability,
      survivalProbability: curveAnalysisAfter.survivalProbability,
      dependencyStatus,
      winPathContribution: payoffGain,
      marginalStateGain,
      isAccepted,
      earliestExecutableTurn,
      hasEarlyInteractionAlternative: hasEarlyAlt
    };
  }

  /**
   * Internal Karsten/Hypergeometric probability model: P(having >= targetMana on Turn T).
   * @private
   */
  static _calculateCastProbability(targetMana, turnNumber, manaSources, deckSize = 60) {
    const cardsDrawn = 7 + Math.max(0, turnNumber - 1);
    const expectedMana = (manaSources / deckSize) * cardsDrawn;
    // Sigmoid probability distribution around expected mana
    const delta = expectedMana - targetMana;
    const probability = 1 / (1 + Math.exp(-1.8 * delta));
    return Math.min(1.0, Math.max(0.05, Math.round(probability * 100) / 100));
  }
}
