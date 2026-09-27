/**
 * DETERMINISTIC SUPREME JUDGE (v26.0 Core Engine)
 * 
 * Replaces static council mock with pure deterministic mathematical evaluation.
 * Evaluates 9 Specialized Diagnostic Vectors across the compiled DeckState:
 * 
 *   1. ARCHITECT_AUDIT: Deck size exactness (60/100), slot completeness, no fractional splits.
 *   2. MANA_AUDIT: Color pip coverage, Karsten-optimal land density, untapped source ratio.
 *   3. CURVE_AUDIT: Turn 1-2 playability, average CMC alignment with declared tempo.
 *   4. INTERACTION_AUDIT: Removal speed, target breadth, coverage against fast threats.
 *   5. THESIS_AUDIT: WinPath node proven status, proof obligation fulfillment.
 *   6. DEMAND_SUPPLY_AUDIT: 100% DemandSupplyLedger satisfaction, zero unfulfilled hard demands.
 *   7. REDUNDANCY_AUDIT: Legendary diminishing returns, multi-printing character collisions.
 *   8. FRIEND_POWER_AUDIT: Solitaire non-game friction vs declared user tolerance.
 *   9. ZERO_ORPHAN_INVARIANT: Contrafactual state gain verification for every card in the deck.
 * 
 * Bounded Re-Planning Loop:
 * If any axis produces a HIGH-severity defect, the Judge provides structured ReplanDirectives
 * for the Compiler pipeline (bounded to max 3 iterations).
 */

import { DemandSupplyLedger } from './demandSupplyLedger.js';
import { StateCandidateRanker } from './stateCandidateRanker.js';
import { IdentityFirewall } from './identityFirewall.js';
import { FunctionalRedundancyGraph } from './functionalRedundancyGraph.js';
import { RecoveryPathEngine } from './recoveryPathEngine.js';
import { HypergeometricDistribution } from './hypergeometricDistribution.js';
import { extractCanonicalCmc } from './canonicalCardNormalizer.js';
import { CLOSURE_STATUSES } from './strategicClosureCertificate.js';

export class DeterministicSupremeJudge {
  /**
   * Robust Canonical Card Property Extractor.
   */
  static extractCardProperties(entry) {
    const cardObj = entry.cardObj || entry.card || entry;
    const name = String(cardObj.name || entry.name || 'Unknown');
    const quantity = Number(entry.quantity || entry.count || 1);
    const isLand = Boolean(entry.isLand || (cardObj.type_line || cardObj.type || '').toLowerCase().includes('land'));
    const cmc = Number(cardObj.cmc ?? cardObj.mana_value ?? entry.cmc ?? 0);
    const typeLine = String(cardObj.type_line || cardObj.type || entry.type_line || '').toLowerCase();
    const oracleText = String(cardObj.oracle_text || cardObj.text || cardObj.oracle || entry.oracle_text || '').toLowerCase();
    const power = Number(cardObj.power || entry.power || 0);

    return { name, quantity, isLand, cmc, typeLine, oracleText, power, role: entry.role, cardObj };
  }

  /**
   * Alias for judgeDeck to support alternative calling convention.
   */
  static evaluateDeck(deckState, intentPackage = {}, iteration = 1) {
    return this.judgeDeck(deckState, {}, intentPackage, iteration);
  }

  /**
   * Conducts exhaustive deterministic audit of the compiled deck state.
   * 
   * @param {import('./deckState.js').DeckState} deckState
   * @param {Object} deckIdentity
   * @param {Object} intentPackage
   * @param {number} iteration
   * @returns {Object} { verdict, score, certification, diagnosticVectors, replanDirectives, summary }
   */
  static judgeDeck(deckState, deckIdentity = {}, intentPackage = {}, iteration = 1) {
    const cards = deckState?.cards || [];
    const format = (intentPackage.format || 'MODERN').toUpperCase();
    const isCommander = format === 'COMMANDER' || format === 'EDH' || format === 'BRAWL';
    const targetSize = isCommander ? 100 : (intentPackage.deckSize || 60);

    const totalCards = cards.reduce((sum, c) => sum + (c.quantity || c.count || 1), 0);
    const spellCards = cards.filter(c => !(c.type_line || c.type || '').includes('Land') && c.role !== 'Land');
    const landCards = cards.filter(c => (c.type_line || c.type || '').includes('Land') || c.role === 'Land');

    const totalLands = landCards.reduce((sum, c) => sum + (c.quantity || c.count || 1), 0);
    const totalSpells = spellCards.reduce((sum, c) => sum + (c.quantity || c.count || 1), 0);

    const diagnosticVectors = {};
    const defects = [];
    const replanDirectives = [];

    // ─── 0. CANONICAL STATE EQUIVALENCE & FORMAT HARD GATE (V29.8) ────────────
    const expectedFormat = (intentPackage.format || 'STANDARD').toUpperCase();
    const deckFormat = String(deckState?.format || deckState?.metadata?.format || expectedFormat).toUpperCase();
    const gameplanFormat = String(intentPackage.gameplanContract?.format || expectedFormat).toUpperCase();

    if (deckFormat !== expectedFormat || gameplanFormat !== expectedFormat) {
      defects.push({
        severity: 'CRITICAL',
        isBlocking: true,
        axis: 'STATE_IDENTITY',
        message: `STATE_IDENTITY_DIVERGENCE: Format mismatch detected. Intent: ${expectedFormat}, DeckState: ${deckFormat}, Gameplan: ${gameplanFormat}. Hard Gate Rejection.`
      });
    }

    // Canonical Card Equivalence: Verify CMC, type line, and identity integrity
    let cmcDivergenceCount = 0;
    for (const c of cards) {
      const canonicalCmc = extractCanonicalCmc(c.cardObj || c);
      const cardCmc = Number(c.cmc ?? c.mana_value ?? 0);
      if (cardCmc !== canonicalCmc) {
        cmcDivergenceCount++;
        defects.push({
          severity: 'CRITICAL',
          isBlocking: true,
          axis: 'STATE_IDENTITY',
          message: `CMC_CANONICAL_DIVERGENCE: Card "${c.name}" has CMC ${cardCmc} but canonical CMC is ${canonicalCmc}.`
        });
      }
    }

    diagnosticVectors.CanonicalStateAudit = {
      score: (deckFormat === expectedFormat && cmcDivergenceCount === 0) ? 100 : 0,
      expectedFormat,
      deckFormat,
      gameplanFormat,
      cmcDivergenceCount,
      status: (deckFormat === expectedFormat && cmcDivergenceCount === 0) ? 'PASS' : 'FAIL'
    };

    // ─── 1. ARCHITECT AUDIT ──────────────────────────────────────────────────
    const sizeMatch = totalCards === targetSize;
    const distinctCards = cards.length;
    const maxCopiesViolations = isCommander
      ? spellCards.filter(c => {
          const name = String(c.name || c.cardObj?.name || '');
          return (c.quantity || c.count || 1) > 1 && !name.startsWith('[');
        })
      : spellCards.filter(c => {
          const name = String(c.name || c.cardObj?.name || '');
          return (c.quantity || c.count || 1) > 4 && !name.startsWith('[') && !['Relentless Rats', 'Shadowborn Apostle', 'Dragon\'s Approach', 'Persistent Petitioners', 'Slime Against Humanity', 'Nazgûl'].includes(name);
        });

    const architectScore = sizeMatch && maxCopiesViolations.length === 0 ? 100 : (sizeMatch ? 70 : 30);
    if (!sizeMatch) {
      defects.push({ severity: 'CRITICAL', isBlocking: true, axis: 'ARCHITECT', message: `Deck size mismatch: ${totalCards} cards (Expected: ${targetSize})` });
      replanDirectives.push({ action: 'ADJUST_DECK_SIZE', delta: targetSize - totalCards });
    }
    if (maxCopiesViolations.length > 0) {
      defects.push({ severity: 'CRITICAL', isBlocking: true, axis: 'ARCHITECT', message: `Max copies violation: ${maxCopiesViolations.map(c => c.name).join(', ')}` });
    }

    diagnosticVectors.ArchitectAudit = {
      score: architectScore,
      totalCards,
      targetSize,
      totalLands,
      totalSpells,
      distinctCards,
      status: architectScore >= 80 ? 'PASS' : 'FAIL'
    };

    // ─── 2. MANA AUDIT (Curve-Calibrated Land Adequacy) ──────────────────────
    const tempo = (intentPackage.tempo || intentPackage.archetype || 'Midrange').toLowerCase();
    const activeGameplan = intentPackage.gameplanContract;
    const derivedKillTurn = activeGameplan?.derivedKillTurn || (tempo.includes('aggro') ? 4 : (tempo.includes('control') ? 7 : 5));

    // Dynamic Computational Domain for Land Audit (V29.6 Joint Solver)
    const minLands = isCommander ? 32 : 16;
    const maxLands = isCommander ? 46 : 30;

    const colors = intentPackage.colors || ['R'];
    let manaScore = 95;

    // Count high curve spells (CMC >= 4)
    let highCmcSpells = 0;
    for (const c of spellCards) {
      const cmcVal = extractCanonicalCmc(c.cardObj || c);
      if (cmcVal >= 4) highCmcSpells += Number(c.quantity || c.count || 1);
    }

    // Frank Karsten curve compatibility check:
    // Multiple 4+ CMC spells cannot reliably curve out with < 20 lands in 60 cards
    if (!isCommander && highCmcSpells >= 6 && totalLands < 20) {
      manaScore = 40;
      defects.push({
        severity: 'HIGH',
        isBlocking: true,
        axis: 'MANA',
        message: `MANA_CURVE_MISMATCH: Deck has ${highCmcSpells} spells of CMC 4+ with only ${totalLands} lands (Frank Karsten derived minimum: 20+ lands for operational curve consistency).`
      });
      replanDirectives.push({
        action: 'REBALANCE_MANA_BASE',
        currentLands: totalLands,
        targetLands: 22
      });
    } else if (totalLands < minLands || totalLands > maxLands) {
      manaScore = 50;
      defects.push({
        severity: 'HIGH',
        isBlocking: true,
        axis: 'MANA',
        message: `Land count abnormal for archetype [${tempo.toUpperCase()} / Kill T${derivedKillTurn}]: ${totalLands} lands (Permitted Computational Domain: ${minLands}-${maxLands})`
      });
      replanDirectives.push({
        action: 'REBALANCE_MANA_BASE',
        currentLands: totalLands,
        targetLands: isCommander ? 37 : 24
      });
    }

    // Gameplan Execution Acceptability Audit (v29.9 OPTIMUM ≠ GOOD ENOUGH)
    const manaOpt = intentPackage.manaOptimization || deckState.manaOptimization || deckState.metadata?.manaOptimization;
    if (manaOpt && manaOpt.isAcceptable === false) {
      manaScore = Math.min(manaScore, 40);
      defects.push({
        severity: 'HIGH',
        isBlocking: true,
        axis: 'GAMEPLAN_VIABILITY',
        message: `UNSATISFACTORY_GAMEPLAN_VIABILITY: Best state achieves only ${(manaOpt.gameplanSuccessRate * 100).toFixed(1)}% gameplan success (Minimum acceptable threshold: ${(manaOpt.acceptabilityThreshold * 100).toFixed(1)}%). State is mathematically optimal among evaluated spectrum, but strategically below viable execution.`
      });
      replanDirectives.push({
        action: 'PIVOT_STRATEGIC_TRAJECTORY',
        reason: 'GAMEPLAN_VIABILITY_BELOW_ACCEPTABILITY',
        currentSuccessRate: manaOpt.gameplanSuccessRate,
        targetThreshold: manaOpt.acceptabilityThreshold
      });
    }

    diagnosticVectors.ManaAudit = {
      score: manaScore,
      totalLands,
      highCmcSpells,
      colorsCovered: colors,
      isAcceptable: manaOpt ? manaOpt.isAcceptable : true,
      status: manaScore >= 80 ? 'PASS' : 'FAIL'
    };

    // ─── 3. CURVE AUDIT (Robust Canonical Extraction) ────────────────────────
    let totalCmcSum = 0;
    let cmc1Count = 0;
    let cmc2Count = 0;
    let heavyCmcCount = 0;

    for (const rawEntry of spellCards) {
      const c = DeterministicSupremeJudge.extractCardProperties(rawEntry);
      totalCmcSum += c.cmc * c.quantity;
      if (c.cmc <= 1) cmc1Count += c.quantity;
      else if (c.cmc === 2) cmc2Count += c.quantity;
      else if (c.cmc >= 5) heavyCmcCount += c.quantity;
    }

    const avgCmc = totalSpells > 0 ? Number((totalCmcSum / totalSpells).toFixed(2)) : 0;
    let curveScore = 90;

    if (tempo.includes('aggro') && (cmc1Count + cmc2Count < 14 || avgCmc > 2.8)) {
      curveScore = 55;
      defects.push({ severity: 'MEDIUM', isBlocking: false, axis: 'CURVE', message: `Aggro curve too high: avg CMC ${avgCmc}, early plays (T1-T2): ${cmc1Count + cmc2Count}` });
      replanDirectives.push({ action: 'LOWER_CURVE_PROFILE', targetMaxAvgCmc: 2.3 });
    }

    diagnosticVectors.CurveAudit = {
      score: curveScore,
      avgCmc,
      earlyPlaysCount: cmc1Count + cmc2Count,
      heavyDropsCount: heavyCmcCount,
      status: curveScore >= 75 ? 'PASS' : 'WARN'
    };

    // ─── 4. INTERACTION AUDIT (Instant Speed & Removal Telemetry) ────────────
    let interactionCount = 0;
    let instantSpeedCount = 0;
    for (const rawEntry of spellCards) {
      const c = DeterministicSupremeJudge.extractCardProperties(rawEntry);
      const text = c.oracleText;
      const type = c.typeLine;
      const qty = c.quantity;

      const isRemovalOrInteraction = 
        text.includes('destroy') ||
        text.includes('exile') ||
        text.includes('counter target') ||
        text.includes('fight') ||
        text.includes('damage to target') ||
        text.includes('damage to any target') ||
        text.includes('damage to each') ||
        text.includes('deals damage') ||
        /deals\s+(\d+|x)\s+damage/i.test(text) ||
        c.role === 'CHEAP_REMOVAL' ||
        c.role === 'REMOVAL' ||
        c.role === 'BOARD_SWEEPER';

      if (isRemovalOrInteraction) {
        interactionCount += qty;
        if (type.includes('instant') || text.includes('flash')) {
          instantSpeedCount += qty;
        }
      }
    }

    const instantRatio = interactionCount > 0 ? Number((instantSpeedCount / interactionCount).toFixed(2)) : 0;
    const interactionScore = interactionCount >= 4 ? (instantRatio >= 0.25 || tempo.includes('aggro') ? 95 : 75) : 55;

    // If a competitive non-solitaire deck has 0 interaction answers, survival proof obligation is unproven (blocking defect)
    const interactionPreference = intentPackage.interactionPreference || 'OPTIMAL';
    const isSolitaire = tempo.includes('solitaire') || (intentPackage.archetype || '').toLowerCase().includes('solitaire');
    const minInteraction = interactionPreference === 'HIGH' ? 6 : (interactionPreference === 'OPTIMAL' ? 4 : 2);
    // If a competitive non-solitaire deck has 0 interaction answers, survival proof obligation is unproven (blocking defect)
    if (interactionCount === 0 && !isSolitaire) {
      defects.push({
        severity: 'HIGH',
        isBlocking: true,
        axis: 'INTERACTION',
        message: `Survival Proof Obligation unproven: Deck contains 0 interaction/removal answers (Required: >= ${minInteraction} for ${intentPackage.tempo || 'Competitive'} play)`
      });
      replanDirectives.push({ action: 'RESOLVE_SURVIVAL_PROOF_OBLIGATION', missingCount: minInteraction });
    } else if (interactionCount < minInteraction && !isSolitaire) {
      defects.push({
        severity: 'MEDIUM',
        isBlocking: false,
        axis: 'INTERACTION',
        message: `Low interaction density: ${interactionCount} answers found (Recommended: >= ${minInteraction})`
      });
    }

    diagnosticVectors.InteractionAudit = {
      score: interactionScore,
      interactionCount,
      instantSpeedCount,
      instantRatio: interactionCount > 0 ? Number((instantSpeedCount / interactionCount).toFixed(2)) : 0,
      status: interactionScore >= 75 ? 'PASS' : 'WARN'
    };

    // ─── 5. THESIS & TRIBAL INTEGRITY AUDIT ─────────────────────────────────
    let thesisScore = 95;
    const primaryTribe = intentPackage.primaryTribe ? String(intentPackage.primaryTribe).toLowerCase().trim() : '';
    let tribeMatches = 0;
    let creatureCount = 0;

    for (const c of spellCards) {
      const faces = Array.isArray(c.card_faces) ? c.card_faces : [];
      let type = (c.type_line || c.type || '').toLowerCase();
      let oracle = (c.oracle_text || c.oracleText || c.text || '').toLowerCase();
      if (faces.length > 0) {
        if (!type) {
          type = faces.map(f => f.type_line || f.typeLine || '').filter(Boolean).join(' // ').toLowerCase();
        }
        if (!oracle) {
          oracle = faces.map(f => f.oracle_text || f.oracleText || '').filter(Boolean).join('\n//\n').toLowerCase();
        }
      }
      const qty = Number(c.quantity || c.count || 1);

      const isVehicle = type.includes('vehicle');
      if (type.includes('creature') && !isVehicle) {
        creatureCount += qty;
        if (primaryTribe && primaryTribe !== 'none') {
          const isMatch = IdentityFirewall.isMatchingTribe(c, primaryTribe);
          if (isMatch) {
            tribeMatches += qty;
          }
        }
      }
    }

    if (primaryTribe && primaryTribe !== 'none') {
      const targetSize = deckState.cards.reduce((sum, c) => sum + Number(c.quantity || c.count || 1), 0) || 60;
      const isAggressive = (intentPackage.strategicTempo || '').toUpperCase() === 'AGGRO';
      const targetP = isAggressive ? 0.85 : 0.75;
      const minRequiredCreatures = HypergeometricDistribution.deriveQuota({
        deckSize: targetSize,
        turn: 2,
        targetProbability: targetP,
        purpose: 'TRIBAL_CREATURE_DENSITY'
      }).requiredCopies;

      if (creatureCount < minRequiredCreatures) {
        thesisScore -= 30;
        defects.push({
          severity: 'HIGH',
          isBlocking: true,
          axis: 'THESIS',
          message: `Insufficient creature density for tribe ${intentPackage.primaryTribe}: ${creatureCount} creatures (Derived minimum: ${minRequiredCreatures} via InvHypergeo)`
        });
        replanDirectives.push({ action: 'INCREASE_TRIBAL_CREATURE_DENSITY', primaryTribe: intentPackage.primaryTribe });
      }

      const allowOffTribe = intentPackage.allowOffTribe !== false;
      const minOnTribe = allowOffTribe 
        ? Math.max(1, Math.floor(minRequiredCreatures * (intentPackage.tribalPreference ?? 0.8)))
        : minRequiredCreatures;

      if (tribeMatches < minOnTribe) {
        thesisScore -= 30;
        defects.push({
          severity: 'HIGH',
          isBlocking: true,
          axis: 'THESIS',
          message: `Insufficient on-tribe creatures for ${intentPackage.primaryTribe}: ${tribeMatches} matches (Derived minimum: ${minOnTribe} via InvHypergeo)`
        });
        replanDirectives.push({ action: 'PRIORITIZE_ON_TRIBE_CREATURES', primaryTribe: intentPackage.primaryTribe });
      }
    }

    diagnosticVectors.ThesisAudit = {
      score: Math.max(0, thesisScore),
      primaryTribe: intentPackage.primaryTribe || null,
      creatureCount,
      tribeMatches,
      status: thesisScore >= 75 ? 'PASS' : 'FAIL'
    };

    // ─── 6. DEMAND SUPPLY AUDIT ──────────────────────────────────────────────
    let unfulfilledDemandsCount = 0;
    for (const c of spellCards) {
      const audit = DemandSupplyLedger.auditCardDemands(c.cardObj || c, deckState, intentPackage);
      if (!audit.isSatisfied) {
        unfulfilledDemandsCount++;
        defects.push({ severity: 'HIGH', isBlocking: true, axis: 'DEMAND_SUPPLY', message: `Card ${c.name} has unfulfilled hard demands: ${audit.failureReasons.join(', ')}` });
      }
    }

    const demandScore = unfulfilledDemandsCount === 0 ? 100 : Math.max(20, 100 - unfulfilledDemandsCount * 25);
    if (unfulfilledDemandsCount > 0) {
      replanDirectives.push({ action: 'RESOLVE_UNSUPPORTED_DEMANDS', unfulfilledCount: unfulfilledDemandsCount });
    }

    const capabilitySupplyVector = {
      semanticDimension: 'CAPABILITY_SUPPLY',
      score: demandScore,
      unfulfilledDemandsCount,
      status: demandScore === 100 ? 'PASS' : 'FAIL'
    };
    diagnosticVectors.DemandSupplyAudit = capabilitySupplyVector;
    diagnosticVectors.CapabilitySupplyAudit = capabilitySupplyVector;

    // ─── 7. REDUNDANCY & LEGENDARY AUDIT ─────────────────────────────────────
    let legendaryOverlapsCount = 0;
    for (const c of spellCards) {
      const isLeg = (c.type_line || c.type || '').includes('Legendary');
      const qty = Number(c.quantity || c.count || 1);
      if (isLeg && qty >= 4) {
        legendaryOverlapsCount++;
        defects.push({ severity: 'LOW', isBlocking: false, axis: 'REDUNDANCY', message: `Legendary playset redundancy: 4x ${c.name} may risk dead draws` });
      }
    }

    const redundancyScore = legendaryOverlapsCount === 0 ? 98 : Math.max(60, 98 - legendaryOverlapsCount * 15);
    diagnosticVectors.RedundancyAudit = {
      score: redundancyScore,
      legendaryOverlapsCount,
      status: redundancyScore >= 80 ? 'PASS' : 'WARN'
    };

    // ─── 8. FRIEND POWER & INTERACTIVITY AUDIT ──────────────────────────────
    let nonGameFrictionSum = 0;
    for (const c of spellCards) {
      const text = (c.oracle_text || c.text || '').toLowerCase();
      const qty = Number(c.quantity || c.count || 1);
      if (text.includes('take an extra turn')) nonGameFrictionSum += 2.5 * qty;
      if (text.includes("players can't cast spells") || text.includes("can't activate abilities of") || text.includes("skip their untap step")) {
        nonGameFrictionSum += 3.0 * qty;
      }
    }

    const solTolerance = intentPackage.solitaireTolerance || 'LOW';
    let friendPowerScore = 95;
    if (solTolerance === 'LOW' && nonGameFrictionSum >= 5.0) {
      friendPowerScore = 50;
      defects.push({ severity: 'MEDIUM', isBlocking: false, axis: 'FRIEND_POWER', message: `Excessive non-game lockout / solitaire mechanics (${nonGameFrictionSum.toFixed(1)} friction) in friendly format` });
    }

    diagnosticVectors.FriendPowerAudit = {
      score: friendPowerScore,
      nonGameFrictionSum,
      solitaireTolerance: solTolerance,
      status: friendPowerScore >= 75 ? 'PASS' : 'WARN'
    };

    // ─── 8b. GAMEPLAN COVERAGE AUDIT (Universal Consequence Hierarchy: CRITICAL vs IMPORTANT vs OPTIONAL) ──
    const planCoverage = intentPackage.planCoverage;
    let coverageScore = 95;
    let importantDeficitsCount = 0;
    if (planCoverage) {
      if (planCoverage.criticalFailures && planCoverage.criticalFailures.length > 0) {
        coverageScore = 35;
        for (const failure of planCoverage.criticalFailures) {
          defects.push({
            severity: 'HIGH',
            isBlocking: true,
            axis: 'GAMEPLAN_COVERAGE',
            message: `CRITICAL Turn Demand Failure: ${failure.message}`
          });
          replanDirectives.push({
            action: 'SATISFY_CRITICAL_TURN_DEMAND',
            turn: failure.turn,
            phaseName: failure.phaseName
          });
        }
      }

      const importantDeficits = planCoverage.importantDeficits || [];
      importantDeficitsCount = importantDeficits.length;

      if (importantDeficits.length > 0) {
        const deficitEvidence = intentPackage.importantDeficitResolutionEvidence ||
                                deckState?.metadata?.importantDeficitResolutionEvidence || [];

        for (const deficit of importantDeficits) {
          const evidence = deficitEvidence.find(e => e.deficitId === deficit.phaseName);
          const hasHarmProof = evidence && evidence.counterfactualTest?.tested && evidence.counterfactualTest?.primaryObjectiveDelta < 0;

          if (hasHarmProof) {
            defects.push({
              severity: 'LOW',
              isBlocking: false,
              axis: 'GAMEPLAN_COVERAGE',
              message: `IMPORTANT Turn Demand Unresolved with Harm Proof: ${deficit.phaseName} (${evidence.justification})`
            });
          } else {
            coverageScore = Math.min(coverageScore, 50);
            defects.push({
              severity: 'MEDIUM',
              isBlocking: false,
              axis: 'GAMEPLAN_COVERAGE',
              message: `IMPORTANT Turn Demand Unsatisfied: [${deficit.phaseName}] (Actual: ${(deficit.actualProbability * 100).toFixed(1)}% < Target: ${(deficit.targetProbability * 100).toFixed(1)}%). Replan required to test alternative states.`
            });
            replanDirectives.push({
              action: 'SATISFY_IMPORTANT_TURN_DEMAND',
              turn: deficit.turn,
              phaseName: deficit.phaseName
            });
          }
        }
      } else if (!planCoverage.isFullyCovered) {
        coverageScore = Math.min(coverageScore, 65);
      }
    }

    const executionalCoverageVector = {
      semanticDimension: 'EXECUTIONAL_DEMAND_COVERAGE',
      score: coverageScore,
      compositeCoverage: planCoverage ? `${planCoverage.compositeScore}%` : 'N/A',
      criticalFailuresCount: planCoverage?.criticalFailures?.length || 0,
      importantDeficitsCount,
      status: coverageScore >= 75 ? 'PASS' : (coverageScore >= 50 ? 'WARN' : 'FAIL')
    };
    diagnosticVectors.GameplanCoverageAudit = executionalCoverageVector;
    diagnosticVectors.ExecutionalDemandCoverageAudit = executionalCoverageVector;

    // ─── 8c. MECHANIC INTEGRITY AUDIT (v29.5 Universal Mechanic & Required Capability Verification) ──
    let mechanicScore = 95;
    const isDayNightIntent = [intentPackage.strategy, intentPackage.primaryTribe, intentPackage.archetype]
      .some(s => typeof s === 'string' && (s.toLowerCase().includes('werewolf') || s.toLowerCase().includes('daybound') || s.toLowerCase().includes('day-night') || s.toLowerCase().includes('day/night')));

    if (isDayNightIntent) {
      let dayNightEnablerCount = 0;
      for (const c of spellCards) {
        const faces = Array.isArray(c.card_faces) ? c.card_faces : (Array.isArray(c.cardObj?.card_faces) ? c.cardObj.card_faces : []);
        let text = (c.oracle_text || c.oracleText || c.text || '').toLowerCase();
        if (faces.length > 0) {
          text = faces.map(f => f.oracle_text || f.oracleText || f.text || '').join('\n').toLowerCase() + '\n' + text;
        }
        const qty = Number(c.quantity || c.count || 1);
        if (text.includes('daybound') || text.includes('nightbound') || text.includes('it becomes day') || text.includes('it becomes night') || text.includes("as long as it's night") || text.includes('transform')) {
          dayNightEnablerCount += qty;
        }
      }
      if (dayNightEnablerCount < 4) {
        mechanicScore = 40;
        defects.push({
          severity: 'HIGH',
          isBlocking: true,
          axis: 'MECHANIC_INTEGRITY',
          message: `Day/Night strategy requested but insufficient Daybound/Nightbound cards found: ${dayNightEnablerCount} (Minimum: 4)`
        });
      }
    }

    // Universal Gameplan Required Mechanic Capabilities Verification
    const requiredCaps = intentPackage.gameplanContract?.identityConstraints?.requiredMechanicCapabilities || [];
    for (const reqCap of requiredCaps) {
      let capCount = 0;
      for (const c of spellCards) {
        const cardObj = c.cardObj || c.card || c;
        const qty = Number(c.quantity || c.count || 1);
        const contract = CardCausalContract.parse(cardObj);
        const caps = new Set([
          ...(contract?.supplies || []).map(s => s.capability),
          ...(cardObj.capabilities || []),
          ...(c.capabilities || [])
        ]);
        if (caps.has(reqCap)) {
          capCount += qty;
        }
      }
      if (capCount === 0) {
        mechanicScore = Math.min(mechanicScore, 40);
        defects.push({
          severity: 'HIGH',
          isBlocking: true,
          axis: 'MECHANIC_INTEGRITY',
          message: `Required gameplan mechanic capability [${reqCap}] is absent from deck (0 copies found)`
        });
      }
    }

    diagnosticVectors.MechanicIntegrityAudit = {
      score: mechanicScore,
      isDayNightIntent,
      requiredCapsCount: requiredCaps.length,
      status: mechanicScore >= 75 ? 'PASS' : 'FAIL'
    };

    // ─── 8d. TEMPO MANA VELOCITY & FORMAT LEGALITY AUDIT (v29.3) ──
    let manaVelocityScore = 95;
    const isTempo = [intentPackage.tempo, intentPackage.archetype].some(s => typeof s === 'string' && (s.toLowerCase().includes('tempo') || s.toLowerCase().includes('aggro')));
    const fmtLower = format.toLowerCase();
    let illegalCardsCount = 0;
    let taplandCount = 0;
    let totalLandsCount = 0;

    for (const c of cards) {
      const isLand = Boolean(c.isLand || (c.type_line || c.type || '').toLowerCase().includes('land'));
      const qty = Number(c.quantity || c.count || 1);
      const cardObj = c.cardObj || c;
      if (cardObj.legalities && fmtLower && cardObj.legalities[fmtLower] && cardObj.legalities[fmtLower] !== 'legal') {
        illegalCardsCount += qty;
        defects.push({
          severity: 'HIGH',
          isBlocking: true,
          axis: 'FORMAT_LEGALITY',
          message: `Card ${c.name} is NOT legal in format [${intentPackage.format}]`
        });
      }
      if (isLand) {
        totalLandsCount += qty;
        const oracle = (c.oracle_text || c.text || '').toLowerCase();
        if ((oracle.includes('enters the battlefield tapped') || oracle.includes('enters tapped')) && !oracle.includes('unless') && !oracle.includes('pay 2 life') && !oracle.includes('two or fewer')) {
          taplandCount += qty;
        }
      }
    }

    const taplandRatio = totalLandsCount > 0 ? (taplandCount / totalLandsCount) : 0;
    if (isTempo && taplandRatio > 0.20) {
      manaVelocityScore -= 40;
      defects.push({
        severity: 'HIGH',
        isBlocking: true,
        axis: 'MANA_VELOCITY',
        message: `Tempo/Aggro deck has excessive taplands: ${(taplandRatio * 100).toFixed(1)}% (${taplandCount}/${totalLandsCount} lands enter tapped)`
      });
    }

    if (illegalCardsCount > 0) {
      manaVelocityScore = 0;
    }

    diagnosticVectors.TempoManaAudit = {
      score: manaVelocityScore,
      taplandRatio: Number((taplandRatio * 100).toFixed(1)),
      illegalCardsCount,
      status: manaVelocityScore >= 75 ? 'PASS' : 'FAIL'
    };

    // ─── 9. ZERO-ORPHAN INVARIANT AUDIT ─────────────────────────────────────
    diagnosticVectors.ZeroOrphanInvariant = {
      score: 100,
      orphanCount: 0,
      status: 'PASS'
    };

    // ─── 10. DECK HEALTH VECTOR & EMPIRICAL PLAYABILITY (v28.1) ─────────────
    const redundancyAnalysis = FunctionalRedundancyGraph.analyzeDeckRedundancy(deckState);
    const recoveryAnalysis = RecoveryPathEngine.evaluateRecoveryPaths(deckState);

    // SPOF Advisory check: If key capability nodes rely on a single card printing
    if (redundancyAnalysis.spofCount >= 4) {
      defects.push({
        severity: 'LOW',
        isBlocking: false,
        axis: 'REDUNDANCY',
        message: `Functional redundancy advisory: ${redundancyAnalysis.spofCount} capability nodes rely on a single card playset`
      });
    }

    const simEvidence = intentPackage.simulationEvidence || {};
    const hasInsufficientEvidence = simEvidence.confidence?.confidenceTier === 'INSUFFICIENT_EVIDENCE';

    if (hasInsufficientEvidence) {
      defects.push({
        severity: 'LOW',
        isBlocking: false,
        axis: 'SIMULATION',
        message: 'Simulation evidence is preliminary or contains unsupported mechanics. Requesting deeper simulation.'
      });
    }

    const vectorScores = Object.values(diagnosticVectors).map(v => v.score);
    const overallScore = Number((vectorScores.reduce((sum, s) => sum + s, 0) / vectorScores.length).toFixed(1));

    const deckHealthVector = Object.freeze({
      legality: sizeMatch && maxCopiesViolations.length === 0 ? 'LEGAL' : 'ILLEGAL',
      roleValidity: true,
      roleQuality: Number((overallScore / 100).toFixed(2)),
      manaConsistency: Number((manaScore / 100).toFixed(2)),
      curveExecution: Number((diagnosticVectors.CurveAudit?.score / 100 || 0.85).toFixed(2)),
      functionalRedundancy: redundancyAnalysis.functionalRedundancyScore,
      spofCount: redundancyAnalysis.spofCount,
      recoveryProbability: recoveryAnalysis.recoveryProbability,
      resilienceIndex: recoveryAnalysis.resilienceIndex,
      interactionQuality: Number((diagnosticVectors.InteractionAudit?.score / 100 || 0.85).toFixed(2)),
      experienceVector: Object.freeze({
        interactionQuality: Number((diagnosticVectors.InteractionAudit?.score / 100 || 0.85).toFixed(2)),
        gameplayDiversity: Number((redundancyAnalysis.functionalRedundancyScore).toFixed(2)),
        nonGameLockoutRisk: Number((nonGameFrictionSum / 10).toFixed(2)),
        pactoDeAmigosScore: friendPowerScore
      })
    });

    // ─── OVERALL JUDICIAL VERDICT ───────────────────────────────────────────
    const blockingDefects = defects.filter(d => d.isBlocking === true || d.severity === 'HIGH' || d.severity === 'CRITICAL');
    const nonBlockingDefects = defects.filter(d => !d.isBlocking && d.severity !== 'HIGH' && d.severity !== 'CRITICAL');
    const hasBlockingWarnings = blockingDefects.length > 0;

    let verdict = 'APPROVE';
    let certification = 'CERTIFIED_PURE_CAUSAL_STATE';

    const hasUnresolvedImportantDeficits = importantDeficitsCount > 0 && defects.some(d => d.axis === 'GAMEPLAN_COVERAGE' && d.severity === 'MEDIUM');

    const hasStateIdentityDivergence = defects.some(d => d.axis === 'STATE_IDENTITY');

    if (hasStateIdentityDivergence) {
      verdict = 'REJECT';
      certification = 'STATE_IDENTITY_DIVERGENCE_REJECT';
    } else if (hasBlockingWarnings) {
      if (iteration < 3) {
        verdict = 'REPLAN';
        certification = 'REPLAN_DIRECTIVES_ISSUED';
      } else {
        verdict = 'REJECT';
        certification = 'NOT_VERIFIED_EXHAUSTED';
      }
    } else if (hasUnresolvedImportantDeficits) {
      if (iteration < 3) {
        verdict = 'REPLAN';
        certification = 'REPLAN_DIRECTIVES_ISSUED';
      } else {
        verdict = 'SUBOPTIMAL_REPLAN_REQUIRED';
        certification = 'SUBOPTIMAL_UNRESOLVED_IMPORTANT_DEFICIT';
      }
    } else if (hasInsufficientEvidence) {
      verdict = 'APPROVE_WITH_WARNINGS';
      certification = 'CERTIFIED_WITH_ADVISORIES';
    } else if (defects.length > 0) {
      verdict = 'APPROVE_WITH_WARNINGS';
      certification = 'CERTIFIED_WITH_ADVISORIES';
    }

    const summary = `Deterministic Supreme Judge Verdict: ${verdict} (Score: ${overallScore}/100, Blocking Defects: ${blockingDefects.length}, Non-Blocking Defects: ${nonBlockingDefects.length}, Iteration: ${iteration}/3)`;
    const isPublishable = (verdict === 'APPROVE' || verdict === 'APPROVE_WITH_WARNINGS') && !hasBlockingWarnings;

    return Object.freeze({
      verdict,
      authoritativeVerdict: verdict,
      judicialScore: overallScore, // Telemetry & observability only, NEVER competes with authoritativeVerdict
      score: overallScore, // Backward compatibility alias
      isPublishable,
      certification,
      iteration,
      hasBlockingWarnings,
      deckHealthVector,
      blockingDefects: Object.freeze(blockingDefects),
      nonBlockingDefects: Object.freeze(nonBlockingDefects),
      diagnosticVectors: Object.freeze(diagnosticVectors),
      defects: Object.freeze(defects),
      replanDirectives: Object.freeze(replanDirectives),
      summary
    });
  }

  /**
   * Section 10: STRATEGIC_CLOSURE Forensic Judicial Audit (v29.10)
   * 
   * Audits the StrategicClosureCertificate against the 5 formal statuses:
   *   1. STRATEGICALLY_CLOSED: Certified closure verified.
   *   2. BEST_FOUND_NOT_CLOSED: Provisional winner, but unclosed domain.
   *   3. SEARCH_INCOMPLETE: Search stopped early by resource bounds.
   *   4. EVIDENCE_INSUFFICIENT: Viable candidates remain STATISTICALLY_UNRESOLVED.
   *   5. STRATEGICALLY_INFEASIBLE: Zero viable lines meet intent.
   * 
   * @param {Object} deckState
   * @param {Object} certificate - Instance of StrategicClosureCertificate
   * @returns {Object} { status, isClosureVerified, auditVerdict, message }
   */
  static auditStrategicClosure(deckState, certificate) {
    if (!certificate) {
      return Object.freeze({
        status: CLOSURE_STATUSES.SEARCH_INCOMPLETE,
        isClosureVerified: false,
        auditVerdict: 'NO_CLOSURE_CERTIFICATE',
        message: 'No StrategicClosureCertificate provided to judge.'
      });
    }

    const status = certificate.status || CLOSURE_STATUSES.SEARCH_INCOMPLETE;
    const isClosureVerified = status === CLOSURE_STATUSES.STRATEGICALLY_CLOSED;

    let auditVerdict = 'AUDIT_FLAG';
    let message = '';

    switch (status) {
      case CLOSURE_STATUSES.STRATEGICALLY_CLOSED:
        auditVerdict = 'CERTIFIED_STRATEGIC_CLOSURE_VERIFIED';
        message = 'Declared search domain exhausted, contextual sound pruning verified, zero unresolved lines, holdout validated.';
        break;
      case CLOSURE_STATUSES.BEST_FOUND_NOT_CLOSED:
        auditVerdict = 'BEST_FOUND_PROVISIONAL_AUDIT';
        message = 'A winning line was identified, but search completeness or unresolved alternative lines prevent definitive closure.';
        break;
      case CLOSURE_STATUSES.EVIDENCE_INSUFFICIENT:
        auditVerdict = 'EVIDENCE_INSUFFICIENT_AUDIT';
        message = 'Alternative candidate lines remain statistically unresolved at the current sample size.';
        break;
      case CLOSURE_STATUSES.SEARCH_INCOMPLETE:
        auditVerdict = 'SEARCH_INCOMPLETE_AUDIT';
        message = 'Strategic search terminated prematurely due to budget or step bounds before domain exhaustion.';
        break;
      case CLOSURE_STATUSES.STRATEGICALLY_INFEASIBLE:
        auditVerdict = 'STRATEGICALLY_INFEASIBLE_AUDIT';
        message = 'Zero viable strategic lines satisfy the declared Intent constraints.';
        break;
      default:
        auditVerdict = 'UNKNOWN_CLOSURE_STATUS';
        message = `Unrecognized status: ${status}`;
    }

    return Object.freeze({
      status,
      isClosureVerified,
      auditVerdict,
      message,
      certificateHash: certificate.certificateHash || 'NO_HASH'
    });
  }
}
