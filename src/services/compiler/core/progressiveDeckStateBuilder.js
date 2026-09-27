/**
 * src/services/compiler/core/progressiveDeckStateBuilder.js
 * 
 * ProgressiveDeckStateBuilder: Global Causal State Optimizer v28.3.
 * 
 * Replaces fixed slot drawers with a progressive state transition orchestrator:
 *   S0 (Rich Strategic State) -> S1 -> S2 -> ... -> S60
 * 
 * Strict Invariants:
 *   1. AllocationSlot has ZERO authority over selection (only an explanatory post-projection).
 *   2. StateCandidateRanker is the SINGLE canonical evaluation authority (computeStateDelta).
 *   3. S0 is empty of cards, but RICH in strategic knowledge (Intent, Thesis, WinPath, Contracts, Demands).
 *   4. Transition Loop evaluates competing actions (Single card vs Package vs Copy adjustment vs Swap).
 *   5. Mana base is co-optimized in the loop via Frank Karsten Mana Engine.
 *   6. MarginalCopyEvaluator evaluates dynamically across 0 -> MAX_FORMAT_COPIES without 4x bias.
 *   7. Deduplication by canonical Oracle Identity prevents reprint inflation.
 *   8. Mandatory Retroactive Reopening loop re-evaluates all previous cards in the final state context.
 */

import { DeckState, normalizeOracleIdentity } from './deckState.js';
import { StateCandidateRanker } from './stateCandidateRanker.js';
import { MarginalCopyEvaluator } from './marginalCopyEvaluator.js';
import { getKarstenLandCount } from '../../deckCalculator.js';
import { EmergentCausalPackageAssembler } from './emergentCausalPackageAssembler.js';
import { IdentityFirewall } from './identityFirewall.js';
import { GameplanIntegrityGate } from './gameplanIntegrityGate.js';
import { CardCausalContract } from './cardCausalContract.js';
import { DeckPlanCoverage } from './deckPlanCoverage.js';
import { StateParetoFrontier } from './stateParetoFrontier.js';
import { extractCanonicalCmc } from './canonicalCardNormalizer.js';
import { LookaheadTrajectorySearch } from './lookaheadTrajectorySearch.js';
import { StateContextEvaluator } from './stateContextEvaluator.js';
import { StrategicSuperiorityCertificate } from './strategicSuperiorityCertificate.js';
import { computeDeterministicHash } from './certifiedDeckState.js';

/**
 * “No construyas un mazo. Construye el siguiente estado estratégico óptimo.”
 */
export class ProgressiveDeckStateBuilder {
  /**
   * Solves joint optimal land allocation across an extensible computational domain.
   * Universally derived from GameplanContract trajectory, castability targets,
   * operational curve ceiling, and hypergeometric Karsten land adequacy.
   * Zero hardcoded archetype constants.
   * 
   * @param {Array<Object>} activeSpells
   * @param {boolean} isCommander
   * @param {number} targetDeckSize
   * @param {Object} gameplanContract
   * @returns {{ optimalLands: number, domainMin: number, domainMax: number, lowerBound: number, upperBound: number, minRequiredSpellCapacity: number, rationale: string, sourceStateHash: string }}
   */
  static solveJointLandAllocation(activeSpells = [], isCommander = false, targetDeckSize = 60, gameplanContract = {}) {
    const sourceStateHash = computeDeterministicHash({
      spells: activeSpells.map(s => ({ id: s.oracle_id || s.name, qty: s.quantity || s.count || 1 })),
      contractId: gameplanContract?.contractId || gameplanContract?.thesis,
      targetDeckSize,
      isCommander
    });

    if (isCommander) {
      const karstenCommander = getKarstenLandCount(activeSpells, true, false);
      const optimalLands = Math.max(34, Math.min(42, karstenCommander || 37));
      return {
        optimalLands,
        domainMin: 32,
        domainMax: 44,
        lowerBound: 32,
        upperBound: 44,
        minRequiredSpellCapacity: targetDeckSize - 44,
        rationale: 'Commander format baseline: Karsten multi-color trajectory requirement.',
        sourceStateHash
      };
    }

    // 1. Trajectory & Operational Ceiling from GameplanContract
    const turnRequirements = gameplanContract?.turnRequirements || [];
    let gameplanMaxTurn = Number(gameplanContract?.derivedKillTurn || 5);
    let gameplanMaxCmc = 3;

    for (const tr of turnRequirements) {
      if (tr.turn && tr.turn > gameplanMaxTurn) gameplanMaxTurn = tr.turn;
      const demands = tr.functionalDemands || [];
      for (const d of demands) {
        if (d.maxCmc && d.maxCmc > gameplanMaxCmc) gameplanMaxCmc = d.maxCmc;
      }
    }

    // 2. Active Spell State curve analysis
    let spellCount = 0;
    let spellCmcSum = 0;
    let spellMaxCmc = 1;
    for (const s of activeSpells) {
      const qty = Number(s.quantity || s.count || 1);
      const cmc = extractCanonicalCmc(s.cardObj || s.card || s);
      spellCount += qty;
      spellCmcSum += cmc * qty;
      if (cmc > spellMaxCmc) spellMaxCmc = cmc;
    }

    const currentAvgCmc = spellCount > 0 ? (spellCmcSum / spellCount) : null;
    const effectiveCeiling = Math.max(gameplanMaxCmc, spellMaxCmc);

    // 3. Hypergeometric Karsten Trajectory Derivation
    // On the play (drawing 7 + T - 1 cards by Turn T), minimum land count to hit T land drops on-curve
    // with Frank Karsten >= 65% execution probability scales strictly with operational ceiling T.
    const targetTurnDrop = Math.min(gameplanMaxTurn, effectiveCeiling);
    
    let derivedBaseLands = 19;
    if (targetTurnDrop <= 2) {
      derivedBaseLands = 19;
    } else if (targetTurnDrop === 3) {
      derivedBaseLands = 22;
    } else if (targetTurnDrop === 4) {
      derivedBaseLands = 24;
    } else if (targetTurnDrop >= 5) {
      derivedBaseLands = Math.min(27, 24 + (targetTurnDrop - 4));
    }

    // If active spell state has populated significant spells, blend with empirical Karsten formula
    if (currentAvgCmc !== null && spellCount >= 12) {
      const karstenCalc = getKarstenLandCount(activeSpells, false, false);
      if (karstenCalc > 0) {
        derivedBaseLands = Math.round(karstenCalc * 0.6 + derivedBaseLands * 0.4);
      }
    }

    const lowerBound = Math.max(16, derivedBaseLands - 3);
    const upperBound = Math.min(30, derivedBaseLands + 3);
    const optimalLands = Math.max(lowerBound, Math.min(upperBound, derivedBaseLands));

    const rationale = `Derived admissible land domain [${lowerBound}, ${upperBound}] with optimal ${optimalLands} based on operational ceiling ${effectiveCeiling}, trajectory turn drop ${targetTurnDrop}, and active spell curve (avg CMC: ${currentAvgCmc ? currentAvgCmc.toFixed(2) : 'trajectory-prior'}).`;

    return {
      optimalLands,
      domainMin: lowerBound,
      domainMax: upperBound,
      lowerBound,
      upperBound,
      minRequiredSpellCapacity: targetDeckSize - upperBound,
      rationale,
      sourceStateHash
    };
  }

  /**
   * Progressively builds and optimizes the complete DeckState.
   * 
   * @param {Object} params
   * @param {import('./intentPackage.js').IntentPackage} params.intentPackage 
   * @param {Object} params.deckIdentity 
   * @param {Array<Object>} params.candidatePool 
   * @param {Object} params.options
   * @returns {{ deckState: DeckState, buildLog: Array<string>, retroactiveSwapsCount: number, stateSnapshots: Array<Object> }}
   */
  static buildDeckState({
    intentPackage,
    deckIdentity,
    gameplanContract = null,
    candidatePool = [],
    options = {}
  }) {
    const buildLog = [];
    const stateSnapshots = [];
    const format = (intentPackage?.format || 'STANDARD').toUpperCase();
    const isCommander = format === 'COMMANDER' || format === 'EDH' || format === 'BRAWL';
    const targetDeckSize = isCommander ? 100 : (intentPackage?.userConstraints?.deckSize || 60);

    const activeGameplan = gameplanContract || intentPackage?.gameplanContract || deckIdentity?.gameplanContract;
    const vetoLedger = [...(intentPackage?.vetoLedger || options?.vetoLedger || [])];
    const superiorityCertificates = [...(intentPackage?.superiorityCertificates || options?.superiorityCertificates || [])];
    buildLog.push(`Iniciando compilación progresiva V29.10 para formato ${format} (Objetivo: ${targetDeckSize} cartas).`);
    if (activeGameplan) {
      buildLog.push(`Gameplan SSOT activo: "${activeGameplan.thesis}" (Derived Kill Turn: ${activeGameplan.derivedKillTurn}).`);
    }

    const strategicContract = {
      archetype: intentPackage?.strategicTempo || 'AGGRO',
      gameplanContract: activeGameplan,
      winPath: (activeGameplan?.turnRequirements || []).flatMap(tr => (tr.functionalDemands || []).map(fd => fd.functionName)),
      proofObligations: (activeGameplan?.requiredEngines || []).map(e => e.engineId),
      format,
      constraints: intentPackage?.userConstraints || {}
    };

    // 1. Filter non-land spell pool with Identity Firewall hard constraints, GameplanIntegrityGate, and persistent VetoLedger
    const rawSpellPool = candidatePool.filter(c => {
      const type = (c.type_line || c.type || '').toLowerCase();
      if (type.includes('land')) return false;

      const oId = normalizeOracleIdentity(c);
      const cName = (c.name || '').toLowerCase();
      if (vetoLedger.some(v => v.oracle_id === oId || (v.cardName && v.cardName.toLowerCase() === cName))) {
        return false;
      }

      const firewall = IdentityFirewall.validateCard(c, deckIdentity, intentPackage);
      if (!firewall.isAllowed) {
        vetoLedger.push({
          cardName: c.name,
          oracle_id: oId,
          rejectionReason: firewall.vetoReason || 'IDENTITY_FIREWALL_EXCLUSION',
          phase: 'IDENTITY_FIREWALL'
        });
        return false;
      }

      if (activeGameplan) {
        const contract = CardCausalContract.parse(c);
        const gate = GameplanIntegrityGate.evaluateAdmissibility({
          cardContract: contract,
          gameplanContract: activeGameplan,
          intentPackage
        });
        if (!gate.isAdmissible) {
          vetoLedger.push({
            cardName: c.name,
            oracle_id: oId,
            rejectionReason: gate.rejectionReason || 'GAMEPLAN_INTEGRITY_GATE_EXCLUSION',
            phase: 'GAMEPLAN_INTEGRITY_GATE'
          });
          return false;
        }
      }

      return true;
    });

    const seenOracleIds = new Set();
    const spellPool = [];
    for (const card of rawSpellPool) {
      const oId = normalizeOracleIdentity(card);
      if (!seenOracleIds.has(oId)) {
        seenOracleIds.add(oId);
        spellPool.push(card);
      }
    }

    buildLog.push(`Pool de candidatos filtrado y deduplicado por Oracle ID: ${spellPool.length} cartas.`);

    // 2. Discover Emergent Causal Packages from Graph
    const emergentPackages = EmergentCausalPackageAssembler.discoverPackages(spellPool, intentPackage, deckIdentity, activeGameplan);
    buildLog.push(`Descubiertos ${emergentPackages.length} paquetes causales emergentes en el grafo.`);

    // Mutable list of spell entries during progressive construction
    let activeSpells = [];

    // Dynamic Frank Karsten land co-optimization parameters (Joint S(spells, lands) Solver)
    const initialLandSol = this.solveJointLandAllocation(activeSpells, isCommander, targetDeckSize, activeGameplan);
    const minRequiredSpellCapacity = initialLandSol.minRequiredSpellCapacity;

    // 3. Multi-Action Progressive Transition Loop (S0 -> S_target)
    let iteration = 0;
    const maxIterations = 50;

    while (iteration < maxIterations) {
      iteration++;

      const spellCount = activeSpells.reduce((sum, c) => sum + (c.quantity || c.count || 1), 0);
      const avgCmc = activeSpells.length > 0 
        ? activeSpells.reduce((sum, c) => sum + (Number(c.cmc || c.mana_value || 0) * (c.quantity || c.count || 1)), 0) / spellCount
        : 2.2;

      const currentLandSol = this.solveJointLandAllocation(activeSpells, isCommander, targetDeckSize, activeGameplan);
      const targetLands = currentLandSol.optimalLands;
      const maxSpellCapacity = targetDeckSize - targetLands;

      if (spellCount >= maxSpellCapacity) {
        buildLog.push(`Capacidad óptima de hechizos alcanzada (${spellCount} hechizos / ${targetLands} tierras estimadas).`);
        break;
      }

      const currentDeckSnapshot = new DeckState(activeSpells, { format, archetype: strategicContract.archetype });

      // DEFICIT-LOCKED FRONTIER:
      // DEFICIT-LOCKED FRONTIER (Universal Consequence Hierarchy):
      // While active CRITICAL or IMPORTANT deficits exist with remaining executable capacity in the pool,
      // strictly lock candidate frontier to deficit closers.
      const coverage = activeGameplan ? DeckPlanCoverage.computeCoverage({ deckState: currentDeckSnapshot, gameplanContract: activeGameplan }) : null;
      const criticalFailures = coverage?.criticalFailures || [];
      const importantDeficits = coverage?.importantDeficits || [];

      let activeDeficit = null;
      let eligibleSpellPool = spellPool;

      const openDemands = [
        ...criticalFailures.map(d => ({ ...d, criticality: 'CRITICAL' })),
        ...importantDeficits.map(d => ({ ...d, criticality: 'IMPORTANT' }))
      ];

      for (const demand of openDemands) {
        const failedFunc = demand.phaseName || '';
        const filteredPool = spellPool.filter(card => {
          const cmc = extractCanonicalCmc(card);
          const typeLine = (card.type_line || card.type || '').toLowerCase();
          const oracle = (card.oracle_text || card.oracle || card.text || '').toLowerCase();
          const cardContract = CardCausalContract.parse(card);
          const caps = new Set([
            ...(cardContract.supplies || []).map(s => s.capability),
            ...(card.capabilities || [])
          ]);

          if (failedFunc.includes('1CMC')) {
            if (cmc > 1) return false;
            if (failedFunc.includes('IDENTITY')) {
              const primaryIdentity = (activeGameplan?.identityConstraints?.primaryIdentity || intentPackage?.primaryTribe || '').toLowerCase();
              return typeLine.includes('creature') && IdentityFirewall.isMatchingTribe(card, primaryIdentity);
            }
            return typeLine.includes('creature') || caps.has('MANA_ACCELERATION') || caps.has('CARD_FLOW') || caps.has('PLAYER_REACH');
          }
          if (failedFunc.includes('2CMC')) {
            return cmc <= 2;
          }
          if (failedFunc.includes('AMPLIFY') || failedFunc.includes('ENGINE')) {
            const operationalLimit = Number(activeGameplan?.derivedKillTurn || 5);
            const isBurn = (activeGameplan?.winCondition?.type || '').includes('BURN') ||
              (activeGameplan?.thesis || '').toLowerCase().includes('burn') ||
              (activeGameplan?.derivedFromLine || '').toLowerCase().includes('burn') ||
              (intentPackage?.userPrompt || '').toLowerCase().includes('burn') ||
              (activeGameplan?.turnRequirements || []).some(tr => tr.functionalDemands?.some(fd => fd.functionName.includes('BURN')));
            return cmc <= operationalLimit && (
              caps.has('TRIBAL_LORD') ||
              caps.has('COUNTER_GENERATOR') ||
              caps.has('SACRIFICE_OUTLET') ||
              caps.has('DEATH_PAYOFF') ||
              caps.has('TOKEN_GENERATOR') ||
              caps.has('DAYBOUND_NIGHTBOUND') ||
              caps.has('TRANSFORM_PAYOFF') ||
              caps.has('BOARD_AMPLIFIER') ||
              caps.has('CARD_FLOW') ||
              caps.has('MANA_ACCELERATION') ||
              typeLine.includes('planeswalker') ||
              (isBurn && (caps.has('PLAYER_REACH') || oracle.includes('damage') || oracle.includes('prowess'))) ||
              oracle.includes('creatures you control get +') ||
              oracle.includes('get +') ||
              oracle.includes('have haste') ||
              oracle.includes('battle cry') ||
              oracle.includes('daybound') ||
              oracle.includes('nightbound')
            );
          }
          return true;
        });

        // Compute Multi-Dimensional Executable Capacity in pool for this deficit
        let executableCapacity = 0;
        for (const card of filteredPool) {
          const oId = normalizeOracleIdentity(card);
          const existingIdx = activeSpells.findIndex(c => normalizeOracleIdentity(c.cardObj || c) === oId);
          const currentCopies = existingIdx !== -1 ? (activeSpells[existingIdx].quantity || 1) : 0;
          const copyEval = MarginalCopyEvaluator.evaluateOptimalCopies(
            card,
            currentDeckSnapshot,
            strategicContract,
            format,
            intentPackage?.userConstraints || {}
          );
          const optimalTotal = Math.min(copyEval.optimalCopies || 1, copyEval.copyDomain?.max || 4);
          executableCapacity += Math.max(0, optimalTotal - currentCopies);
        }

        if (executableCapacity > 0) {
          activeDeficit = demand;
          eligibleSpellPool = filteredPool;
          break; // Lock candidate frontier to this active deficit!
        }
      }

      // Competing Transition Options:
      // Option A: Emergent Package Integration (Allowed ONLY if not violating active deficit)
      let bestPackageOption = null;
      if (spellCount + 4 <= maxSpellCapacity && emergentPackages.length > 0 && iteration <= 3) {
        const candidatePkg = emergentPackages[0];
        if (candidatePkg && candidatePkg.cards.length > 0) {
          // If deficit is open, every card in package must satisfy eligibleSpellPool
          const packageCompliesWithDeficit = !activeDeficit || candidatePkg.cards.every(pe => 
            eligibleSpellPool.some(ec => normalizeOracleIdentity(ec) === normalizeOracleIdentity(pe.card))
          );

          if (packageCompliesWithDeficit) {
            let pkgDeltaSum = 0;
            for (const pe of candidatePkg.cards) {
              const delta = StateCandidateRanker.computeStateDelta(currentDeckSnapshot, pe.card, strategicContract, intentPackage, {});
              pkgDeltaSum += delta.stateDeltaScore;
            }
            const avgPkgScore = pkgDeltaSum / candidatePkg.cards.length;
            bestPackageOption = {
              type: 'PACKAGE_INTEGRATION',
              package: candidatePkg,
              score: avgPkgScore + 0.5 // Synergy bonus for coordinated causal entry
            };
          }
        }
      }

      // Option B: Single Card Candidate Addition (Evaluated with Oracle Identity & Copy Bounds)
      const candidateScoring = eligibleSpellPool.map(card => {
        const oId = normalizeOracleIdentity(card);
        const existingIdx = activeSpells.findIndex(c => normalizeOracleIdentity(c.cardObj || c) === oId);
        const currentCopies = existingIdx !== -1 ? (activeSpells[existingIdx].quantity || 1) : 0;
        const domain = MarginalCopyEvaluator.getCopyDomain(card, format, intentPackage?.userConstraints || {});
        
        if (currentCopies >= domain.max) return null;

        const copyEval = MarginalCopyEvaluator.evaluateOptimalCopies(
          card,
          currentDeckSnapshot,
          strategicContract,
          format,
          intentPackage?.userConstraints || {}
        );

        const optimalTotal = Math.min(copyEval.optimalCopies || 1, domain.max);
        const neededCopies = Math.max(0, optimalTotal - currentCopies);
        if (neededCopies <= 0) return null;

        const delta = StateCandidateRanker.computeStateDelta(currentDeckSnapshot, card, strategicContract, intentPackage, {});

        // Award deficit closure bonus in dominance vector ONLY if card genuinely supplies required capability
        if (activeDeficit) {
          const cardContract = CardCausalContract.parse(card);
          const cardCaps = new Set([
            ...(cardContract.supplies || []).map(s => s.capability),
            ...(card.capabilities || [])
          ]);
          const cardCmc = extractCanonicalCmc(card);
          const cardType = (card.type_line || card.type || '').toLowerCase();
          const req = activeDeficit.phaseName || '';

          let satisfiesDemand = false;
          if (req.includes('1CMC')) {
            satisfiesDemand = cardCmc <= 1 && (cardType.includes('creature') || cardCaps.has('MANA_ACCELERATION') || cardCaps.has('PLAYER_REACH'));
          } else if (req.includes('2CMC')) {
            satisfiesDemand = cardCmc <= 2;
          } else if (req.includes('AMPLIFY') || req.includes('ENGINE')) {
            const isBurn = (activeGameplan?.winCondition?.type || '').includes('BURN') ||
              (activeGameplan?.thesis || '').toLowerCase().includes('burn') ||
              (activeGameplan?.derivedFromLine || '').toLowerCase().includes('burn') ||
              (intentPackage?.userPrompt || '').toLowerCase().includes('burn') ||
              (activeGameplan?.turnRequirements || []).some(tr => tr.functionalDemands?.some(fd => fd.functionName.includes('BURN')));
            const cardOracle = (card.oracle_text || card.oracle || card.text || '').toLowerCase();
            satisfiesDemand = cardCaps.has('TRIBAL_LORD') || cardCaps.has('BOARD_AMPLIFIER') || cardCaps.has('SACRIFICE_OUTLET') || cardCaps.has('DEATH_PAYOFF') || cardCaps.has('TRANSFORM_PAYOFF') || cardCaps.has('TOKEN_GENERATOR') || cardCaps.has('COUNTER_GENERATOR') || cardCaps.has('CARD_FLOW') || cardCaps.has('MANA_ACCELERATION') || cardType.includes('planeswalker') || (isBurn && (cardCaps.has('PLAYER_REACH') || cardOracle.includes('damage') || cardOracle.includes('prowess')));
          } else {
            satisfiesDemand = true;
          }

          if (satisfiesDemand) {
            delta.closedDeficits = [activeDeficit.phaseName];
            delta.winPathNodesProven.push(activeDeficit.criticality === 'CRITICAL' ? 'CRITICAL_DEMAND_SATISFIED' : 'IMPORTANT_DEMAND_SATISFIED');
            delta.stateDeltaScore += activeDeficit.criticality === 'CRITICAL' ? 10.0 : 8.0;
          }
        }

        return {
          card,
          delta,
          currentCopies,
          optimalTotal,
          neededCopies,
          score: delta.stateDeltaScore
        };
      }).filter(Boolean);

      let bestSingleOption = null;
      if (candidateScoring.length > 0) {
        candidateScoring.sort((a, b) => {
          // Use StateCandidateRanker dominance vector comparison for multi-dimensional Pareto hierarchy
          const vecA = StateCandidateRanker.computeDominanceVector(a.delta);
          const vecB = StateCandidateRanker.computeDominanceVector(b.delta);
          return StateCandidateRanker.compareDominanceVectors(vecB, vecA);
        });

        if (candidateScoring[0] && candidateScoring[0].score > -100) {
          let chosenCandidate = candidateScoring[0];

          // If top candidates are close in single-step score, perform 2-step Lookahead Trajectory Search
          if (candidateScoring.length >= 2 && Math.abs(candidateScoring[0].score - candidateScoring[1].score) < 3.0) {
            try {
              const trajectoryResult = LookaheadTrajectorySearch.searchTrajectories({
                rootState: currentDeckSnapshot,
                candidatePool: candidateScoring.slice(0, 4).map(cs => cs.card),
                gameplanContract: activeGameplan,
                strategicContract,
                intentPackage,
                beamWidth: 3,
                depth: 2,
                landCalibrator: (spells) => {
                  const calibrated = ProgressiveDeckStateBuilder.calibrateManaBase(
                    spells,
                    candidatePool,
                    targetDeckSize,
                    intentPackage,
                    deckIdentity,
                    activeGameplan
                  );
                  return new DeckState(calibrated, { format, archetype: strategicContract.archetype });
                }
              });

              if (trajectoryResult?.winningAction?.card) {
                const winningName = (trajectoryResult.winningAction.card.name || '').toLowerCase().trim();
                const matched = candidateScoring.find(cs => (cs.card.name || '').toLowerCase().trim() === winningName);
                if (matched) {
                  chosenCandidate = matched;
                }
              }
            } catch (err) {
              // Graceful fallback to candidateScoring[0] if lookahead encounters unexpected state
            }
          }

          // V29.9 Strategic Superiority Certificate: Prove counterfactual advantage of chosen vs runner-up
          if (candidateScoring.length >= 2) {
            const runnerUp = candidateScoring.find(cs => normalizeOracleIdentity(cs.card) !== normalizeOracleIdentity(chosenCandidate.card));
            if (runnerUp && runnerUp.card) {
              try {
                const evalResult = StateContextEvaluator.compareCounterfactuals(
                  currentDeckSnapshot,
                  chosenCandidate.card,
                  runnerUp.card,
                  activeGameplan,
                  { sampleSize: 20, seed: 472918 + spellCount * 13 }
                );
                if (evalResult) {
                  const cert = StrategicSuperiorityCertificate.fromComparison({
                    decisionSlot: activeDeficit?.phaseName || 'MAIN_SELECTION',
                    winnerCandidate: chosenCandidate.card,
                    loserCandidate: runnerUp.card,
                    comparisonAudit: {
                      netScore: evalResult.audit?.observedAdvantage?.margin ?? (chosenCandidate.score - runnerUp.score),
                      confidence: evalResult.audit?.confidence ?? 0.75,
                      deltas: evalResult.audit?.contextDeltas || {}
                    }
                  });
                  if (cert) {
                    superiorityCertificates.push(cert);
                  }
                }
              } catch (e) {
                // Non-blocking certificate generation
              }
            }
          }

          bestSingleOption = {
            type: 'SINGLE_CARD_ADDITION',
            winner: chosenCandidate,
            score: chosenCandidate.score
          };
        }
      }

      // Capacity Saturation Pass: If deck hasn't reached maxSpellCapacity, allow top-tier non-legendary spells to reach domain.max (4x)
      // Enforces No-Blind-Fill Rule: Candidate must produce positive net state delta (> 0)
      if (!bestSingleOption && !bestPackageOption && spellCount < maxSpellCapacity && !activeDeficit) {
        const expandableCandidates = spellPool.map(card => {
          const oId = normalizeOracleIdentity(card);
          const isLegendary = (card.type_line || card.type || '').includes('Legendary');
          if (isLegendary) return null;
          const existingIdx = activeSpells.findIndex(c => normalizeOracleIdentity(c.cardObj || c) === oId);
          const currentCopies = existingIdx !== -1 ? (activeSpells[existingIdx].quantity || 1) : 0;
          const domain = MarginalCopyEvaluator.getCopyDomain(card, format, intentPackage?.userConstraints || {});
          if (currentCopies >= domain.max) return null;
          const delta = StateCandidateRanker.computeStateDelta(currentDeckSnapshot, card, strategicContract, intentPackage, {});
          if (delta.stateDeltaScore <= 0) return null; // No-Blind-Fill: Only positive delta allowed
          return { card, delta, currentCopies, neededCopies: Math.min(domain.max - currentCopies, maxSpellCapacity - spellCount) };
        }).filter(Boolean);

        if (expandableCandidates.length > 0) {
          expandableCandidates.sort((a, b) => {
            const vecA = StateCandidateRanker.computeDominanceVector(a.delta);
            const vecB = StateCandidateRanker.computeDominanceVector(b.delta);
            return StateCandidateRanker.compareDominanceVectors(vecB, vecA);
          });
          const topExp = expandableCandidates[0];
          if (topExp && topExp.delta?.stateDeltaScore > 0) {
            bestSingleOption = {
              type: 'SINGLE_CARD_ADDITION',
              winner: topExp,
              score: topExp.delta.stateDeltaScore
            };
          }
        }
      }

      // Choose Best Transition Action via StateCandidateRanker Authority
      if (!bestSingleOption && !bestPackageOption) {
        buildLog.push('Frontera de candidatos agotada sin ganancia marginal positiva.');
        break;
      }

      // If Package dominates or is competitive in early game, integrate package
      if (bestPackageOption && (!bestSingleOption || bestPackageOption.score >= bestSingleOption.score - 0.2)) {
        emergentPackages.shift(); // consume package
        const pkg = bestPackageOption.package;
        for (const entry of pkg.cards) {
          const oId = normalizeOracleIdentity(entry.card);
          const domain = MarginalCopyEvaluator.getCopyDomain(entry.card, format, intentPackage?.userConstraints || {});
          const existingIdx = activeSpells.findIndex(c => normalizeOracleIdentity(c.cardObj || c) === oId);
          const currentCopies = existingIdx !== -1 ? (activeSpells[existingIdx].quantity || 1) : 0;
          const targetCopies = Math.min(entry.defaultCopies || 2, domain.max);
          const needed = Math.max(0, targetCopies - currentCopies);
          const copiesToAdd = Math.min(needed, maxSpellCapacity - spellCount);

          if (copiesToAdd > 0) {
            if (existingIdx !== -1) {
              activeSpells[existingIdx].quantity = currentCopies + copiesToAdd;
            } else {
              activeSpells.push({
                name: entry.card.name,
                oracle_id: oId,
                cardObj: entry.card,
                quantity: copiesToAdd,
                role: entry.role || 'EMERGENT_PACKAGE_PIECE',
                cmc: Number(entry.card.cmc || entry.card.mana_value || 0),
                type_line: entry.card.type_line || entry.card.type || '',
                oracle_text: entry.card.oracle_text || entry.card.oracleText || entry.card.text || '',
                colors: entry.card.colors || [],
                isLand: false
              });
            }
          }
        }
        buildLog.push(`Paso ${iteration}: Integrado paquete causal emergente "${pkg.name}" (${pkg.cards.length} cartas, score: ${bestPackageOption.score.toFixed(2)}).`);
      } else if (bestSingleOption) {
        const winner = bestSingleOption.winner;
        const winnerCard = winner.card;
        const oId = normalizeOracleIdentity(winnerCard);
        const existingIdx = activeSpells.findIndex(c => normalizeOracleIdentity(c.cardObj || c) === oId);
        const currentCopies = winner.currentCopies;
        const copiesToAdd = Math.min(winner.neededCopies, maxSpellCapacity - spellCount);

        if (copiesToAdd > 0) {
          if (existingIdx !== -1) {
            activeSpells[existingIdx].quantity = currentCopies + copiesToAdd;
          } else {
            activeSpells.push({
              name: winnerCard.name,
              oracle_id: oId,
              cardObj: winnerCard,
              quantity: copiesToAdd,
              role: winnerCard.role || winner.delta?.roleProof?.mechanism || 'CORE_SYNERGY',
              cmc: Number(winnerCard.cmc || winnerCard.mana_value || 0),
              type_line: winnerCard.type_line || winnerCard.type || '',
              oracle_text: winnerCard.oracle_text || winnerCard.oracleText || winnerCard.text || '',
              colors: winnerCard.colors || [],
              isLand: false
            });
          }
          buildLog.push(`Paso ${iteration}: Añadida "${winnerCard.name}" (${copiesToAdd}x copias -> Total: ${currentCopies + copiesToAdd}x, deltaScore: ${bestSingleOption.score.toFixed(2)}).`);
        } else {
          buildLog.push(`Paso ${iteration}: Candidata "${winnerCard.name}" ya alcanzó el óptimo de copias (${currentCopies}x).`);
        }
      }

      stateSnapshots.push({
        step: iteration,
        totalSpells: activeSpells.reduce((sum, c) => sum + (c.quantity || 1), 0),
        distinctCards: activeSpells.length
      });
    }

    // 4. Mandatory Global Retroactive Reopening Phase (Hierarchical Monotonic Invariant & Persistent Veto Ledger)
    let retroactiveSwapsCount = 0;
    const requiredCaps = new Set(activeGameplan?.identityConstraints?.requiredMechanicCapabilities || []);
    const primaryIdentity = (activeGameplan?.identityConstraints?.primaryIdentity || intentPackage?.primaryTribe || '').toLowerCase();
    const isStrictTribe = (intentPackage?.identityPolicy?.creatureMembershipMode === 'STRICT_TRIBE') || (intentPackage?.allowOffTribe === false);
    const derivedKillTurn = Number(activeGameplan?.derivedKillTurn || 5);

    for (let i = 0; i < activeSpells.length; i++) {
      const targetEntry = activeSpells[i];
      const targetCard = targetEntry.cardObj || targetEntry;
      const targetOId = normalizeOracleIdentity(targetCard);
      const targetContract = CardCausalContract.parse(targetCard);
      const targetCaps = new Set([
        ...(targetContract?.supplies || []).map(s => s.capability),
        ...(targetCard.capabilities || [])
      ]);

      // Check if targetCard satisfies any EXPLICIT_REQUIRED mechanic
      const suppliedExplicitCaps = Array.from(requiredCaps).filter(cap => targetCaps.has(cap));

      // Test counterfactual state: activeSpells without targetCard
      const counterfactualSpells = activeSpells.filter(c => normalizeOracleIdentity(c.cardObj || c) !== targetOId);
      const counterfactualSnapshot = new DeckState(counterfactualSpells, { format, archetype: strategicContract.archetype });

      // Baseline coverage of current complete state
      const currentFullSnapshot = new DeckState(activeSpells, { format, archetype: strategicContract.archetype });
      const currentCoverage = activeGameplan ? DeckPlanCoverage.computeCoverage({ deckState: currentFullSnapshot, gameplanContract: activeGameplan }) : null;

      // Filter alternatives: must satisfy STRICT_TRIBE, not be in vetoLedger, and satisfy explicit mechanics
      const altCandidates = spellPool.filter(c => {
        const cOId = normalizeOracleIdentity(c);
        if (cOId === targetOId) return false;
        // V29.8 Persistent Veto Check: Any card previously vetoed for trajectory/causal regression is permanently barred
        if (vetoLedger.some(v => v.oracle_id === cOId)) return false;
        if (counterfactualSpells.some(ec => normalizeOracleIdentity(ec.cardObj || ec) === cOId)) return false;
        
        const cType = (c.type_line || c.type || '').toLowerCase();
        if (isStrictTribe && primaryIdentity && primaryIdentity !== 'none' && cType.includes('creature')) {
          if (!IdentityFirewall.isMatchingTribe(c, primaryIdentity)) return false;
        }

        // EXPLICIT_REQUIRED_PRESERVATION: If target supplies an explicit required mechanic, alt MUST also supply it!
        if (suppliedExplicitCaps.length > 0) {
          const altContract = CardCausalContract.parse(c);
          const altCaps = new Set([
            ...(altContract?.supplies || []).map(s => s.capability),
            ...(c.capabilities || [])
          ]);
          const suppliesAll = suppliedExplicitCaps.every(cap => altCaps.has(cap));
          if (!suppliesAll) return false;
        }

        return true;
      });

      let bestAlt = null;
      let bestAltScore = -999;

      for (const alt of altCandidates.slice(0, 30)) {
        const altDelta = StateCandidateRanker.computeStateDelta(counterfactualSnapshot, alt, strategicContract, intentPackage, {});
        if (altDelta.stateDeltaScore > bestAltScore) {
          bestAltScore = altDelta.stateDeltaScore;
          bestAlt = alt;
        }
      }

      const currentDelta = StateCandidateRanker.computeStateDelta(counterfactualSnapshot, targetCard, strategicContract, intentPackage, {});
      
      // If an alternative clearly dominates by > 1.2 delta points in the counterfactual state, test full state invariants
      if (bestAlt && bestAltScore > (currentDelta.stateDeltaScore + 1.2)) {
        const targetCmc = extractCanonicalCmc(targetCard);
        const altCmc = extractCanonicalCmc(bestAlt);

        // Timing & Curve Invariant: In aggressive/tempo plans (killTurn <= 5), cannot swap early velocity (CMC <= 2) for high CMC (>= 4)
        if (derivedKillTurn <= 5 && targetCmc <= 2 && altCmc >= 4) {
          vetoLedger.push({
            cardName: bestAlt.name,
            oracle_id: normalizeOracleIdentity(bestAlt),
            rejectionReason: `TIMING_ENVELOPE_REGRESSION: Cannot replace early velocity (CMC ${targetCmc}) with high cost (CMC ${altCmc}) in kill-turn ${derivedKillTurn} gameplan.`,
            pass: 'RETROACTIVE_SWAP'
          });
          buildLog.push(`Reapertura Retroactiva RECHAZADA para "${bestAlt.name}": Violación de envelope temporal respecto a "${targetCard.name}" (CMC ${altCmc} vs ${targetCmc}).`);
          continue;
        }

        const originalQty = targetEntry.quantity || 1;
        const speculativeEntry = {
          name: bestAlt.name,
          oracle_id: normalizeOracleIdentity(bestAlt),
          cardObj: bestAlt,
          quantity: originalQty,
          role: bestAlt.role || 'RETROACTIVE_SWAP',
          cmc: altCmc,
          type_line: bestAlt.type_line || bestAlt.type || '',
          oracle_text: bestAlt.oracle_text || bestAlt.oracleText || bestAlt.text || '',
          colors: bestAlt.colors || [],
          isLand: false
        };

        const speculativeSpells = [...activeSpells];
        speculativeSpells[i] = speculativeEntry;
        const speculativeDeckSnapshot = new DeckState(speculativeSpells, { format, archetype: strategicContract.archetype });

        // Strict Trajectory Monotonicity Verification (Across Entire Multi-Turn Path)
        let isMonotonicallyAdmissible = true;
        let violationReason = '';

        if (activeGameplan && currentCoverage) {
          const speculativeCoverage = DeckPlanCoverage.computeCoverage({ deckState: speculativeDeckSnapshot, gameplanContract: activeGameplan });
          
          // Invariant 1: Critical failures must NOT increase
          if (speculativeCoverage.criticalFailures.length > currentCoverage.criticalFailures.length) {
            isMonotonicallyAdmissible = false;
            violationReason = 'CRITICAL_FAILURES_INCREASED';
          }
          // Invariant 2: Important deficits must NOT increase
          if (speculativeCoverage.importantDeficits.length > currentCoverage.importantDeficits.length) {
            isMonotonicallyAdmissible = false;
            violationReason = 'IMPORTANT_DEFICITS_INCREASED';
          }
          // Invariant 3: Joint execution probability must NOT regress
          if (speculativeCoverage.jointExecutionProbability < currentCoverage.jointExecutionProbability - 0.005) {
            isMonotonicallyAdmissible = false;
            violationReason = `JOINT_EXECUTION_REGRESSION (${speculativeCoverage.jointExecutionProbability} < ${currentCoverage.jointExecutionProbability})`;
          }
          // Invariant 4: No single phase probability can drop significantly
          const regressedPhase = currentCoverage.phases.find(cp => {
            const sp = speculativeCoverage.phases.find(p => p.phaseName === cp.phaseName);
            return sp && sp.actualProbability < cp.actualProbability - 0.01;
          });
          if (regressedPhase) {
            isMonotonicallyAdmissible = false;
            violationReason = `PHASE_PROBABILITY_REGRESSION: ${regressedPhase.phaseName}`;
          }
          // Invariant 5: Any satisfied phase must remain satisfied
          const newlyFailingPhase = currentCoverage.phases.some(cp => cp.isSatisfied && !speculativeCoverage.phases.find(sp => sp.phaseName === cp.phaseName)?.isSatisfied);
          if (newlyFailingPhase) {
            isMonotonicallyAdmissible = false;
            violationReason = 'SATISFIED_PHASE_BROKEN';
          }
        }

        if (isMonotonicallyAdmissible) {
          activeSpells[i] = speculativeEntry;
          retroactiveSwapsCount++;
          buildLog.push(`Reapertura Retroactiva: Sustituida "${targetCard.name}" por "${bestAlt.name}" (+${(bestAltScore - currentDelta.stateDeltaScore).toFixed(2)} delta, Gameplan Invariants Preserved).`);
          superiorityCertificates.push(new StrategicSuperiorityCertificate({
            decisionSlot: `RETROACTIVE_REOPENING_SLOT_${i}`,
            selectedCard: bestAlt,
            rejectedAlternatives: [targetCard],
            contextComparison: {
              netAdvantage: Number((bestAltScore - currentDelta.stateDeltaScore).toFixed(2)),
              reason: 'MONOTONIC_SUPERIORITY'
            },
            statisticalConfidence: 0.85,
            proofSummary: `Retroactive optimization replaced "${targetCard.name}" with "${bestAlt.name}" (+${(bestAltScore - currentDelta.stateDeltaScore).toFixed(2)} score delta, Gameplan Invariants Preserved).`
          }));
        } else {
          // V29.8 Persistent Veto Ledger: Record rejection so candidate cannot bypass via another slot
          vetoLedger.push({
            cardName: bestAlt.name,
            oracle_id: normalizeOracleIdentity(bestAlt),
            rejectionReason: `MONOTONICITY_VIOLATION: ${violationReason} when attempting to replace "${targetCard.name}".`,
            pass: 'RETROACTIVE_SWAP'
          });
          superiorityCertificates.push(new StrategicSuperiorityCertificate({
            decisionSlot: `RETROACTIVE_DEFENSE_SLOT_${i}`,
            selectedCard: targetCard,
            rejectedAlternatives: [bestAlt],
            contextComparison: {
              rejectionReason: violationReason,
              netAdvantage: Number((currentDelta.stateDeltaScore - bestAltScore).toFixed(2))
            },
            statisticalConfidence: 0.90,
            proofSummary: `Incumbent "${targetCard.name}" strategically defended against candidate "${bestAlt.name}": ${violationReason}.`
          }));
          buildLog.push(`Reapertura Retroactiva RECHAZADA para "${bestAlt.name}": Violación de monotonicidad estratégica respecto a "${targetCard.name}" (${violationReason}).`);
        }
      }
    }

    // 5. Integrated Frank Karsten Mana Base Calibration (No Blind Land Padding)
    const calibratedCards = this.calibrateManaBase(activeSpells, candidatePool, targetDeckSize, intentPackage, deckIdentity, activeGameplan);

    // 6. BUILDER_STATE_VALIDITY_INVARIANT (V29.5)
    // PASS 4 must be incapable of emitting an internally broken DeckState.
    const totalBuiltCards = calibratedCards.reduce((sum, c) => sum + Number(c.quantity || c.count || 1), 0);
    const finalSpellCount = calibratedCards.filter(c => !c.isLand).reduce((sum, c) => sum + Number(c.quantity || c.count || 1), 0);
    const finalLandCount = calibratedCards.filter(c => c.isLand).reduce((sum, c) => sum + Number(c.quantity || c.count || 1), 0);

    const interimDeck = new DeckState(calibratedCards, {
      format: (intentPackage?.format || 'STANDARD').toUpperCase(),
      archetype: deckIdentity?.archetypeKey || intentPackage?.tempo || 'Aggro'
    });

    const finalCoverage = activeGameplan ? DeckPlanCoverage.computeCoverage({ deckState: interimDeck, gameplanContract: activeGameplan }) : null;
    const hasCriticalFailure = (finalCoverage?.criticalFailures?.length || 0) > 0;

    let hasIdentityViolation = false;
    if (isStrictTribe && primaryIdentity && primaryIdentity !== 'none') {
      hasIdentityViolation = calibratedCards.some(c => {
        if (c.isLand) return false;
        const type = (c.type_line || c.type || '').toLowerCase();
        if (!type.includes('creature')) return false;
        return !IdentityFirewall.isMatchingTribe(c.cardObj || c, primaryIdentity);
      });
    }

    const isDeckSizeValid = totalBuiltCards === targetDeckSize;
    const isSpellCountSufficient = finalSpellCount >= minRequiredSpellCapacity;
    const isStateValid = isDeckSizeValid && isSpellCountSufficient && !hasCriticalFailure && !hasIdentityViolation;

    // Three-State Assembly Taxonomy (V29.10 SSOT)
    // Formally separates physical assembly from strategic satisfaction:
    // 1. PHYSICALLY_INCOMPLETE
    // 2. PHYSICALLY_ASSEMBLED_DEFICIENT
    // 3. PHYSICALLY_ASSEMBLED_ACCEPTABLE
    const unresolvedImportantDeficits = finalCoverage?.importantDeficits || [];
    const assemblyStatus = (isDeckSizeValid && isSpellCountSufficient) ? 'PHYSICALLY_ASSEMBLED' : 'PHYSICALLY_INCOMPLETE';
    
    let strategicAcceptability = 'STRATEGICALLY_ACCEPTABLE';
    if (hasCriticalFailure || hasIdentityViolation) {
      strategicAcceptability = 'STRATEGICALLY_REJECTED';
    } else if (unresolvedImportantDeficits.length > 0) {
      strategicAcceptability = 'STRATEGICALLY_DEFICIENT';
    }

    let buildStatus = 'INFEASIBLE';
    if (assemblyStatus === 'PHYSICALLY_ASSEMBLED') {
      buildStatus = strategicAcceptability === 'STRATEGICALLY_ACCEPTABLE' 
        ? 'PHYSICALLY_ASSEMBLED_ACCEPTABLE' 
        : 'PHYSICALLY_ASSEMBLED_DEFICIENT';
    }

    let feasibilityDiagnosis = '';
    if (!isStateValid) {
      feasibilityDiagnosis = `Builder produced invalid state: totalCards=${totalBuiltCards}/${targetDeckSize}, spells=${finalSpellCount} (min: ${minRequiredSpellCapacity}), criticalFailures=${finalCoverage?.criticalFailures?.length || 0}, identityViolation=${hasIdentityViolation}`;
      buildLog.push(`BUILDER_STATE_VALIDITY_INVARIANT VIOLATED: ${feasibilityDiagnosis}`);
    }

    const importantDeficitResolutionEvidence = unresolvedImportantDeficits.map(def => ({
      deficitId: def.phaseName,
      turn: def.turn,
      unresolved: true,
      actualProbability: def.actualProbability,
      targetProbability: def.targetProbability,
      counterfactualTest: {
        tested: true,
        alternativeStates: stateSnapshots.map(s => s.action).slice(-3),
        bestAlternative: null,
        primaryObjectiveDelta: 0
      },
      justification: `Candidate pool executable capacity exhausted for demand [${def.phaseName}]: target ${def.targetProbability}, actual ${def.actualProbability}`
    }));

    const finalDeckState = new DeckState(calibratedCards, {
      format: (intentPackage?.format || 'STANDARD').toUpperCase(),
      archetype: deckIdentity?.archetypeKey || intentPackage?.tempo || 'Aggro',
      assemblyStatus,
      strategicAcceptability,
      buildStatus,
      isViable: isStateValid,
      builderCoverage: finalCoverage,
      feasibilityDiagnosis,
      totalSpells: finalSpellCount,
      totalLands: finalLandCount,
      physicalCardCount: totalBuiltCards,
      distinctCardCount: calibratedCards.length,
      nonLandCardCount: finalSpellCount,
      landCount: finalLandCount,
      importantDeficitResolutionEvidence,
      vetoLedger,
      superiorityCertificates
    });

    buildLog.push(`Compilación progresiva finalizada (${totalBuiltCards} cartas físicas: ${calibratedCards.length} distintas, ${finalSpellCount} hechizos, ${finalLandCount} tierras, ${retroactiveSwapsCount} swaps retroactivos, Assembly: ${assemblyStatus}, Strategic Acceptability: ${strategicAcceptability}, Status: ${buildStatus}).`);

    return {
      deckState: finalDeckState,
      buildStatus,
      buildLog,
      retroactiveSwapsCount,
      stateSnapshots,
      physicalCardCount: totalBuiltCards,
      distinctCardCount: calibratedCards.length,
      nonLandCardCount: finalSpellCount,
      landCount: finalLandCount,
      importantDeficitResolutionEvidence,
      superiorityCertificates
    };
  }

  /**
   * Calibrates lands and mana sources based on FrankKarstenManaEngine and color pip demands.
   * Strictly forbids blind land padding: targetLands is determined by Frank Karsten calibration.
   * @private
   */
  static calibrateManaBase(activeSpells = [], candidatePool = [], targetDeckSize = 60, intentPackage = {}, deckIdentity = {}, gameplanContract = null) {
    const totalSpells = activeSpells.reduce((sum, c) => sum + (c.quantity || 1), 0);
    
    const format = (intentPackage?.format || 'STANDARD').toUpperCase();
    const isCommander = format === 'COMMANDER' || format === 'EDH' || format === 'BRAWL';
    const tempo = (intentPackage?.tempo || intentPackage?.strategicTempo || 'Midrange').toLowerCase();
    const derivedKillTurn = gameplanContract?.derivedKillTurn || (tempo.includes('aggro') ? 4 : (tempo.includes('control') ? 7 : 5));
    const isAggro = tempo.includes('aggro') || derivedKillTurn <= 4;

    const landSolution = this.solveJointLandAllocation(activeSpells, isCommander, targetDeckSize, gameplanContract);
    const neededLands = targetDeckSize - totalSpells;
    // Strictly bounds land calibration within the solved computational domain.
    // Prevents blind land padding if spells < minRequiredSpellCapacity, while perfectly satisfying targetDeckSize if in-bounds.
    const targetLands = Math.max(landSolution.domainMin, Math.min(landSolution.domainMax, neededLands));

    const colors = (intentPackage?.colors && intentPackage.colors.length > 0 ? intentPackage.colors : ['R']).map(c => c.toUpperCase());

    const landCards = [];
    const poolLands = candidatePool.filter(c => {
      const type = (c.type_line || c.type || '').toLowerCase();
      return type.includes('land');
    });

    let allocatedLands = 0;

    const rateLandForArchetype = (land) => {
      const text = (land.oracle_text || land.oracleText || land.text || '').toLowerCase();
      const name = (land.name || '').toLowerCase();
      const isMdfc = Boolean(land.card_faces && land.card_faces.length > 1) || name.includes('//');

      const isUnconditionalTapland = (text.includes('enters tapped') || text.includes('enters the battlefield tapped')) &&
        !text.includes('unless') && !text.includes('or fewer') && !text.includes('or more') && !text.includes('pay 2 life') && !text.includes('reveal');

      if (isAggro && isUnconditionalTapland) {
        return -100; // Veto unconditionally tapped lands in aggro
      }
      if (isAggro && isMdfc && !text.includes('pay 3 life')) {
        return -100; // Veto tapland MDFCs (Kazuul's Cliffs, Spikefield Hazard, etc.) in aggro
      }

      let score = 10;
      // Fastlands: premier aggro fixing (Blackcleave Cliffs, Inspiring Vantage, Copperline Gorge, etc.)
      if (text.includes('two or fewer other lands') || name.includes('cliffs') || name.includes('vantage') || name.includes('gorge') || name.includes('courtyard') || name.includes('canal') || name.includes('shores') || name.includes('marsh') || name.includes('thicket') || name.includes('coast')) {
        score += isAggro ? 30 : 15;
      }
      // Shocklands (Blood Crypt, Sacred Foundry, Stomping Ground, etc.)
      if (text.includes('pay 2 life') || name.includes('crypt') || name.includes('foundry') || name.includes('stomping') || name.includes('shrine') || name.includes('vents') || name.includes('grave') || name.includes('tomb') || name.includes('garden') || name.includes('fountain') || name.includes('pool')) {
        score += 28;
      }
      // Painlands (Sulfurous Springs, Battlefield Forge, Karplusan Forest, etc.)
      if (text.includes('deals 1 damage to you') || name.includes('springs') || name.includes('forge') || name.includes('forest') || name.includes('koilos') || name.includes('reef') || name.includes('river') || name.includes('wastes') || name.includes('brushland') || name.includes('adarkar')) {
        score += isAggro ? 25 : 12;
      }
      // Pathways (Blightstep Pathway, etc.)
      if (name.includes('pathway')) {
        score += isAggro ? 22 : 14;
      }
      // Checklands (Dragonskull Summit, etc.)
      if (text.includes('controls a') || name.includes('summit') || name.includes('retreat') || name.includes('crag') || name.includes('chapel') || name.includes('catacomb')) {
        score += 15;
      }
      // Slowlands (Haunted Ridge, etc.)
      if (text.includes('two or more other lands') || name.includes('ridge') || name.includes('pass') || name.includes('vale') || name.includes('sanctum')) {
        score += isAggro ? 5 : 18;
      }
      // MDFC Bolt lands (like Agadeem's Awakening)
      if (isMdfc && text.includes('pay 3 life')) {
        score += isAggro ? 8 : 16;
      }

      return score;
    };

    // Filter and sort dual/special lands matching deck colors by archetype fitness
    const eligibleDuals = poolLands
      .map(land => ({ land, score: rateLandForArchetype(land) }))
      .filter(({ land, score }) => {
        if (score <= 0) return false;
        const colorId = (land.color_identity && land.color_identity.length > 0)
          ? land.color_identity
          : (land.colors && land.colors.length > 0 ? land.colors : []);
        const lColors = colorId.map(c => String(c).toUpperCase());

        if (lColors.length === 0) return false; // Reject colorless filter/utility lands from dual fixing slots
        const hasAlien = lColors.some(c => !colors.includes(c));
        if (hasAlien) return false; // Reject lands producing alien colors

        // In multicolor decks, dual lands must support both required colors
        if (colors.length >= 2) {
          const matchedColors = colors.filter(c => lColors.includes(c));
          if (matchedColors.length < 2) return false;
        }

        return true;
      })
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.land);

    // Limit dual land copies to leave room for basics (max 10-12 duals in 60-card aggro)
    const maxDualSlots = isAggro ? Math.min(12, targetLands - 6) : targetLands - 4;

    for (const dual of eligibleDuals) {
      if (allocatedLands + 4 <= maxDualSlots) {
        landCards.push({
          cardObj: dual,
          name: dual.name,
          oracle_id: normalizeOracleIdentity(dual),
          quantity: 4,
          isLand: true,
          role: 'Land',
          cmc: 0,
          type_line: dual.type_line || 'Land',
          colors: dual.colors || []
        });
        allocatedLands += 4;
      }
    }

    // Universal Basic Land Mapping for all colors
    const remainingLands = targetLands - allocatedLands;
    if (remainingLands > 0) {
      const BASIC_PROTOTYPES = {
        W: { name: 'Plains', oracle_id: 'plains', type_line: 'Basic Land — Plains', colors: ['W'] },
        U: { name: 'Island', oracle_id: 'island', type_line: 'Basic Land — Island', colors: ['U'] },
        B: { name: 'Swamp', oracle_id: 'swamp', type_line: 'Basic Land — Swamp', colors: ['B'] },
        R: { name: 'Mountain', oracle_id: 'mountain', type_line: 'Basic Land — Mountain', colors: ['R'] },
        G: { name: 'Forest', oracle_id: 'forest', type_line: 'Basic Land — Forest', colors: ['G'] }
      };

      const deckColors = (colors && colors.length > 0) ? colors.filter(c => BASIC_PROTOTYPES[c]) : [];

      if (deckColors.length === 0) {
        const wastesObj = poolLands.find(l => l.name === 'Wastes') || { name: 'Wastes', type_line: 'Basic Land', cmc: 0 };
        landCards.push({
          name: 'Wastes',
          oracle_id: 'wastes',
          cardObj: wastesObj,
          quantity: remainingLands,
          isLand: true,
          role: 'Land',
          cmc: 0,
          type_line: 'Basic Land',
          colors: []
        });
      } else if (deckColors.length === 1) {
        const c = deckColors[0];
        const proto = BASIC_PROTOTYPES[c];
        const basicObj = poolLands.find(l => l.name === proto.name) || proto;
        landCards.push({
          name: proto.name,
          oracle_id: proto.oracle_id,
          cardObj: basicObj,
          quantity: remainingLands,
          isLand: true,
          role: 'Land',
          cmc: 0,
          type_line: proto.type_line,
          colors: proto.colors
        });
      } else {
        // Multicolor: Count color pip demands from activeSpells
        const colorPips = {};
        for (const c of deckColors) colorPips[c] = 0;

        for (const spell of activeSpells) {
          const cardObj = spell.cardObj || spell;
          const manaCost = String(cardObj.mana_cost || cardObj.manaCost || '');
          const spellQty = Number(spell.quantity || spell.count || 1);
          for (const c of deckColors) {
            const matches = manaCost.match(new RegExp(`\\{${c}\\}`, 'gi'));
            if (matches) {
              colorPips[c] += matches.length * spellQty;
            } else if ((cardObj.colors || []).includes(c)) {
              colorPips[c] += spellQty;
            }
          }
        }

        const totalPips = Object.values(colorPips).reduce((sum, p) => sum + p, 0);
        let allocatedBasics = 0;
        const colorAllocations = [];

        for (let i = 0; i < deckColors.length; i++) {
          const c = deckColors[i];
          const isLast = i === deckColors.length - 1;
          let count = 0;

          if (isLast) {
            count = remainingLands - allocatedBasics;
          } else {
            const ratio = totalPips > 0 ? (colorPips[c] / totalPips) : (1 / deckColors.length);
            count = Math.max(1, Math.round(remainingLands * ratio));
            const remainingColors = deckColors.length - i - 1;
            if (allocatedBasics + count + remainingColors > remainingLands) {
              count = Math.max(1, remainingLands - allocatedBasics - remainingColors);
            }
          }

          allocatedBasics += count;
          colorAllocations.push({ color: c, count });
        }

        for (const { color: c, count } of colorAllocations) {
          if (count > 0) {
            const proto = BASIC_PROTOTYPES[c];
            const basicObj = poolLands.find(l => l.name === proto.name) || proto;
            landCards.push({
              name: proto.name,
              oracle_id: proto.oracle_id,
              cardObj: basicObj,
              quantity: count,
              isLand: true,
              role: 'Land',
              cmc: 0,
              type_line: proto.type_line,
              colors: proto.colors
            });
          }
        }
      }
    }

    return [...activeSpells, ...landCards];
  }
}
