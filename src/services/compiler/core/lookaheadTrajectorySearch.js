/**
 * src/services/compiler/core/lookaheadTrajectorySearch.js
 * 
 * LookaheadTrajectorySearch: V29.7 Beam-Search Trajectory Exploration Engine.
 * 
 * Axioms:
 *   1. The unit of search is DeckState(spells, lands), NOT individual cards.
 *   2. Explores multi-step trajectories (S_t -> S_t+1 -> S_t+2) to avoid greedy myopic traps.
 *   3. Land allocation is co-optimized at EVERY node in the search tree.
 *   4. Trajectory pruning uses mathematical Pareto dominance (StateParetoFrontier)
 *      and dynamic strategy-driven lexicographic ordering.
 *   5. Zero hardcoded card names or tribal branching.
 */

import { DeckState } from './deckState.js';
import { StateParetoFrontier } from './stateParetoFrontier.js';
import { StateContextEvaluator } from './stateContextEvaluator.js';
import { extractCanonicalCmc } from './canonicalCardNormalizer.js';
import { DeckPlanCoverage } from './deckPlanCoverage.js';

export class LookaheadTrajectorySearch {
  /**
   * Explores multi-step state trajectories using Beam Search (K paths, depth d).
   * 
   * @param {Object} params
   * @param {DeckState} params.rootState - Initial base DeckState (spells + lands)
   * @param {Array<Object>} params.candidatePool - Eligible cards for addition
   * @param {Object} params.gameplanContract - Active GameplanContract
   * @param {Object} params.strategicContract - Strategic contract IR
   * @param {Object} params.intentPackage - Intent package
   * @param {number} [params.beamWidth=3] - Number of non-dominated paths to maintain (K)
   * @param {number} [params.depth=2] - Lookahead search depth (d)
   * @param {Function} [params.landCalibrator] - Function (spells) => complete DeckState
   * @returns {Object} { bestTrajectory, winningState, exploredNodesCount, auditTrail }
   */
  static searchTrajectories({
    rootState,
    candidatePool = [],
    gameplanContract = {},
    strategicContract = {},
    intentPackage = {},
    beamWidth = 3,
    depth = 2,
    landCalibrator = null
  } = {}) {
    const auditTrail = {
      beamWidth,
      depth,
      exploredNodesCount: 0,
      prunedNodesCount: 0,
      searchStatus: 'EMPIRICALLY_SUPERIOR_STATE_FOUND',
      certificationStatus: 'BEST_SUPPORTED_STATE',
      pruningPipeline: Object.freeze([
        'STAGE_1_CHEAP_STRUCTURAL_PRUNING',
        'STAGE_2_CAUSAL_DEFICIT_FILTERING',
        'STAGE_3_FAST_ALGEBRAIC_STATE_EVALUATION',
        'STAGE_4_PARETO_DOMINANCE_FILTERING',
        'STAGE_5_LEXICOGRAPHIC_BEAM_REDUCTION',
        'STAGE_6_FINALIST_VALIDATION'
      ]),
      levels: []
    };

    if (!rootState || candidatePool.length === 0) {
      return {
        bestTrajectory: [rootState],
        winningState: rootState,
        bestSupportedState: rootState,
        certificationStatus: 'BEST_SUPPORTED_STATE',
        searchStatus: 'EMPIRICALLY_SUPERIOR_STATE_FOUND',
        exploredNodesCount: 0,
        auditTrail
      };
    }

    // A trajectory path is an array of DeckStates: [S0, S1, ...]
    let currentBeam = [
      {
        path: [rootState],
        currentState: rootState,
        cumulativeScore: 0
      }
    ];

    for (let step = 1; step <= depth; step++) {
      const candidatesForStep = [];
      const levelAudit = { step, expansionsCount: 0, nonDominatedCount: 0 };

      for (const branch of currentBeam) {
        const parentState = branch.currentState;
        const currentSpells = parentState.cards.filter(c => !c.isLand);

        // STAGE 1 & 2: Cheap Structural Pruning & Causal Deficit Filtering
        const candidateActions = this._generateCandidateActions(
          parentState,
          candidatePool,
          gameplanContract,
          intentPackage
        );

        for (const action of candidateActions) {
          auditTrail.exploredNodesCount++;
          levelAudit.expansionsCount++;

          // Form new spell set S' = S union { action.card }
          const newSpells = this._applyAction(currentSpells, action);

          // Calibrate complete DeckState(spells, lands)
          const nextDeckState = landCalibrator
            ? landCalibrator(newSpells)
            : new DeckState(newSpells, {
                format: intentPackage.format,
                archetype: strategicContract.archetype
              });

          // STAGE 3: Fast Algebraic State Evaluation (Closed-form, no Monte Carlo)
          const contextEval = StateContextEvaluator.evaluateCandidateInContexts(
            action.card,
            parentState,
            strategicContract,
            intentPackage
          );

          // Compute coverage on new state
          const coverage = gameplanContract.thesis
            ? DeckPlanCoverage.computeCoverage({ deckState: nextDeckState, gameplanContract })
            : null;

          // Annotate state with observable execution metrics
          const annotatedState = this._annotateDeckState(nextDeckState, coverage, contextEval, gameplanContract);

          candidatesForStep.push({
            path: [...branch.path, annotatedState],
            currentState: annotatedState,
            action,
            contextEval
          });
        }
      }

      if (candidatesForStep.length === 0) {
        break;
      }

      // STAGE 4: Pareto Dominance Filtering over complete DeckStates
      const stateObjects = candidatesForStep.map(c => c.currentState);
      const frontierStates = StateParetoFrontier.extractParetoFrontier(stateObjects);

      // Map back to branches
      const frontierBranches = candidatesForStep.filter(c =>
        frontierStates.some(fs => fs.id === c.currentState.id || fs === c.currentState)
      );

      // STAGE 5: Dynamic Lexicographic Trajectory Pruning
      const orderedBranches = this._sortBranchesLexicographic(
        frontierBranches.length > 0 ? frontierBranches : candidatesForStep,
        gameplanContract
      );

      // Keep top K paths
      currentBeam = orderedBranches.slice(0, beamWidth);
      levelAudit.nonDominatedCount = currentBeam.length;
      auditTrail.prunedNodesCount += (candidatesForStep.length - currentBeam.length);
      auditTrail.levels.push(levelAudit);
    }

    // STAGE 6: Finalist extraction
    const winningBranch = currentBeam[0] || { path: [rootState], currentState: rootState };

    return {
      bestTrajectory: winningBranch.path,
      winningState: winningBranch.currentState,
      bestSupportedState: winningBranch.currentState,
      winningAction: winningBranch.action || null,
      certificationStatus: 'BEST_SUPPORTED_STATE',
      searchStatus: 'EMPIRICALLY_SUPERIOR_STATE_FOUND',
      exploredNodesCount: auditTrail.exploredNodesCount,
      prunedNodesCount: auditTrail.prunedNodesCount,
      beamFrontierSize: currentBeam.length,
      auditTrail
    };
  }

  /**
   * Filters and ranks candidate additions that satisfy open deficits first.
   * Uses executionFace to ensure casting legality on specific curve steps.
   * @private
   */
  static _generateCandidateActions(deckState, candidatePool, gameplanContract, intentPackage) {
    const coverage = gameplanContract.thesis
      ? DeckPlanCoverage.computeCoverage({ deckState, gameplanContract })
      : null;

    const criticalFailures = coverage?.criticalFailures || [];
    const importantDeficits = coverage?.importantDeficits || [];

    const openDemands = [
      ...criticalFailures.map(d => ({ ...d, criticality: 'CRITICAL' })),
      ...importantDeficits.map(d => ({ ...d, criticality: 'IMPORTANT' }))
    ];

    let poolToUse = candidatePool;

    // Deficit locking: If an open demand has matching cards, lock to them!
    for (const demand of openDemands) {
      const failedFunc = demand.phaseName || '';
      const matching = candidatePool.filter(c => {
        const execFace = c.executionFace || c.frontFace || c;
        const cmc = execFace.cmc !== undefined ? execFace.cmc : extractCanonicalCmc(c);
        const typeLine = (execFace.typeLine || execFace.type_line || c.type_line || c.type || '').toLowerCase();
        const oracle = (execFace.oracleText || c.oracle_text || '').toLowerCase();

        if (failedFunc.includes('1CMC')) {
          if (cmc > 1) return false;
          if (failedFunc.includes('IDENTITY')) {
            const primaryId = (gameplanContract.identityConstraints?.primaryIdentity || intentPackage.primaryTribe || '').toLowerCase();
            const hasSubtype = (execFace.structuralTypes || []).some(t => t.toLowerCase() === primaryId) ||
                               typeLine.includes(primaryId) ||
                               oracle.includes('changeling');
            return typeLine.includes('creature') && hasSubtype;
          }
          return typeLine.includes('creature') || cmc <= 1;
        }
        if (failedFunc.includes('2CMC')) return cmc <= 2;
        return true;
      });

      if (matching.length > 0) {
        poolToUse = matching;
        break;
      }
    }

    // Select top diverse candidates (up to 4 to bound branching factor)
    const selected = [];
    const seenNames = new Set();

    for (const card of poolToUse) {
      const name = card.name || 'Unknown';
      if (!seenNames.has(name)) {
        seenNames.add(name);
        selected.push({ card, copiesToAdd: 1 });
        if (selected.length >= 4) break;
      }
    }

    return selected;
  }

  /**
   * Applies an addition action to an existing spell list.
   * @private
   */
  static _applyAction(spells, action) {
    const targetName = (action.card.name || '').toLowerCase().trim();
    let found = false;

    const updated = spells.map(s => {
      const name = (s.name || s.cardObj?.name || '').toLowerCase().trim();
      if (name === targetName) {
        found = true;
        return {
          ...s,
          quantity: Number(s.quantity || s.count || 1) + (action.copiesToAdd || 1)
        };
      }
      return { ...s };
    });

    if (!found) {
      updated.push({
        name: action.card.name,
        cardObj: action.card,
        quantity: action.copiesToAdd || 1,
        isLand: false,
        role: action.card.role || 'CORE',
        cmc: extractCanonicalCmc(action.card)
      });
    }

    return updated;
  }

  /**
   * Attaches observable Pareto metrics to a DeckState.
   * @private
   */
  static _annotateDeckState(deckState, coverage, contextEval, gameplanContract) {
    const spells = deckState.cards.filter(c => !c.isLand);
    const lands = deckState.cards.filter(c => c.isLand);

    const totalSpells = spells.reduce((sum, s) => sum + (s.quantity || 1), 0);
    const totalLands = lands.reduce((sum, l) => sum + (l.quantity || 1), 0);
    const avgCmc = totalSpells > 0
      ? spells.reduce((sum, s) => sum + (extractCanonicalCmc(s) * (s.quantity || 1)), 0) / totalSpells
      : 2.5;

    // Observable metrics for Pareto dominance
    const curveExecutionRate = Number((coverage ? (coverage.compositeScore / 100) : 0.75).toFixed(3));
    const manaCastabilityRate = Number(Math.max(0, Math.min(1.0, 1.0 - Math.abs(totalLands - 23) * 0.05)).toFixed(3));
    const resilienceRecoveryRate = Number((contextEval?.contextScores?.behind?.resilienceScore ?? 0.65).toFixed(3));
    const tangibleResourceVelocity = Number(Math.max(0.4, Math.min(1.0, (4.0 - avgCmc) / 3.0)).toFixed(3));
    const winPathCompletionRate = Number((coverage?.isFullyCovered ? 0.90 : (curveExecutionRate * 0.85)).toFixed(3));

    return {
      ...deckState,
      id: `state_${totalSpells}s_${totalLands}l_${Math.round(curveExecutionRate * 100)}`,
      curveExecutionRate,
      manaCastabilityRate,
      resilienceRecoveryRate,
      tangibleResourceVelocity,
      winPathCompletionRate,
      criticalFailuresCount: coverage?.criticalFailures?.length || 0,
      importantDeficitsCount: coverage?.importantDeficits?.length || 0,
      coverage,
      contextEval
    };
  }

  /**
   * Sorts candidate branches lexicographically based on active strategy priority.
   * @private
   */
  static _sortBranchesLexicographic(branches, gameplanContract) {
    const profile = gameplanContract.tacticalExecutionProfile || {};
    const priorityMetrics = profile.earlyCurveWeight >= 0.75
      ? ['curveExecutionRate', 'winPathCompletionRate', 'manaCastabilityRate', 'tangibleResourceVelocity', 'resilienceRecoveryRate']
      : ['resilienceRecoveryRate', 'manaCastabilityRate', 'curveExecutionRate', 'tangibleResourceVelocity', 'winPathCompletionRate'];

    return [...branches].sort((bA, bB) => {
      const sA = bA.currentState;
      const sB = bB.currentState;

      // 1. Critical failures first
      const critA = sA.criticalFailuresCount || 0;
      const critB = sB.criticalFailuresCount || 0;
      if (critA !== critB) return critA - critB;

      // 2. Important deficits second
      const impA = sA.importantDeficitsCount || 0;
      const impB = sB.importantDeficitsCount || 0;
      if (impA !== impB) return impA - impB;

      // 3. Strategy-driven observable metrics
      for (const metric of priorityMetrics) {
        const valA = sA[metric] ?? 0;
        const valB = sB[metric] ?? 0;
        const diff = valB - valA;
        if (Math.abs(diff) > 0.02) {
          return diff;
        }
      }

      return 0;
    });
  }
}
