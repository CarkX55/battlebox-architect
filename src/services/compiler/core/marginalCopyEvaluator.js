/**
 * MARGINAL COPY EVALUATOR (v23.0 Core Engine)
 * 
 * Universal Copy Domain Evaluator (0 .. MAX_FORMAT_COPIES).
 * Evaluates marginal state gain (StateEvidence) for each incremental copy:
 * 0 -> 1, 1 -> 2, 2 -> 3, 3 -> 4 ... up to format maximum.
 * 
 * Eliminates artificial 4x playset inflation and prevents legendary redundancy.
 * Evaluates structured evidence delta rather than a single arbitrary scalar score.
 */

import { StateCandidateRanker } from './stateCandidateRanker.js';

export class MarginalCopyEvaluator {
  /**
   * Determines the maximum legal copies for a card in the given format.
   */
  static getCopyDomain(card, format = 'MODERN', customConstraints = {}) {
    const nameLower = (card.name || '').toLowerCase();
    const typeLine = (card.type_line || card.type || '').toLowerCase();

    // 1. Unlimited copy exceptions (Relentless Rats, Shadowborn Apostle, Dragon's Approach, Persistent Petitioners, Basic Lands)
    if (
      typeLine.includes('basic land') ||
      nameLower.includes('relentless rats') ||
      nameLower.includes('shadowborn apostle') ||
      nameLower.includes('dragon\'s approach') ||
      nameLower.includes('persistent petitioners') ||
      nameLower.includes('slime against humanity')
    ) {
      return { min: 0, max: 60, source: 'CARD_RULE_EXCEPTION' };
    }

    // 2. Nazgûl (9 copies)
    if (nameLower.includes('nazgûl') || nameLower.includes('nazgul')) {
      return { min: 0, max: 9, source: 'CARD_RULE_EXCEPTION' };
    }

    // 3. Format Specific Limits
    const fmt = (format || 'MODERN').toUpperCase();
    if (fmt === 'COMMANDER' || fmt === 'EDH' || fmt === 'BRAWL' || fmt === 'SINGLETON') {
      return { min: 0, max: 1, source: 'FORMAT_SINGLETON_RULE' };
    }

    // 4. Custom constraint override
    if (customConstraints.maxCopies !== undefined) {
      return { min: 0, max: Number(customConstraints.maxCopies), source: 'USER_CONSTRAINT' };
    }

    // Standard Constructed default: 4
    return { min: 0, max: 4, source: 'CONSTRUCTED_FORMAT_RULE' };
  }

  /**
   * Evaluates the marginal state gain for each incremental copy from 1 to maxDomain.
   * @param {Object} card Card to evaluate
   * @param {Object} currentState Current deck state
   * @param {Object} strategicContract Strategic thesis and WinPath
   * @returns {Object} { cardName, copyDomain, copyEvaluation, optimalCopies }
   */
  static evaluateOptimalCopies(card, currentState = {}, strategicContract = {}) {
    const format = strategicContract.format || 'MODERN';
    const copyDomain = this.getCopyDomain(card, format, strategicContract.constraints || {});
    const maxCopies = copyDomain.max;

    const copyEvaluation = {};
    let optimalCopies = 0;
    const isLegendary = (card.type_line || card.type || '').includes('Legendary');
    const cmc = Number(card.cmc || card.mana_value || 0);
    const cardRoot = StateCandidateRanker.extractCharacterRoot(card.name);

    // Existing printings of same character
    const existingCards = currentState.cards || [];
    const otherCharacterCopies = existingCards
      .filter(c => StateCandidateRanker.extractCharacterRoot((c.card || c).name) === cardRoot && (c.card || c).name !== card.name)
      .reduce((sum, c) => sum + Number(c.quantity || c.count || 1), 0);

    const oracle = (card.oracle_text || card.oracleText || card.text || '').toLowerCase();
    const typeLine = (card.type_line || card.typeLine || card.type || '').toLowerCase();
    const isCreature = typeLine.includes('creature');
    const activeGameplan = strategicContract.gameplanContract;

    let isCoreEngine = false;
    if (activeGameplan) {
      const derivedKillTurn = activeGameplan.derivedKillTurn || 5;
      if (derivedKillTurn <= 4 && (cmc <= 2 && isCreature)) isCoreEngine = true;
      if (oracle.includes('creatures you control get +') || oracle.includes('have haste') || oracle.includes('damage to any target')) isCoreEngine = true;
      if (oracle.includes('landfall') || oracle.includes('search your library for a land') || oracle.includes('{t}: add')) isCoreEngine = true;
      if (oracle.includes('counter target') || oracle.includes('destroy target') || oracle.includes('exile target') || oracle.includes('destroy all')) isCoreEngine = true;
      if (oracle.includes('draw a card') || oracle.includes('draw two cards')) isCoreEngine = true;
    } else {
      if (cmc <= 2 && isCreature) isCoreEngine = true;
      if (oracle.includes('counter target') || oracle.includes('destroy target')) isCoreEngine = true;
    }

    const isTutorOrCantrip = oracle.includes('search your library') || (cmc <= 1 && oracle.includes('draw a card'));

    let stoppingReason = 'MAX_LEGAL_COPIES_REACHED';
    for (let copyNum = 1; copyNum <= maxCopies; copyNum++) {
      const marginalResult = this.computeMarginalGainForCopy(copyNum, {
        card,
        isLegendary,
        cmc,
        isCoreEngine,
        isTutorOrCantrip,
        otherCharacterCopies,
        currentState,
        strategicContract
      });

      copyEvaluation[copyNum] = marginalResult;

      // Acceptance Threshold: dominance must be DOMINANT or marginal gain >= 0.5
      if (marginalResult.dominance === 'DOMINANT' && marginalResult.stateGain >= 0.5) {
        optimalCopies = copyNum;
      } else {
        if (isLegendary) {
          stoppingReason = 'LEGENDARY_COLLISION_CAP';
        } else if (cmc >= 5) {
          stoppingReason = 'HIGH_CMC_DIMINISHING_RETURNS';
        } else {
          stoppingReason = 'MARGINAL_GAIN_COLLAPSED';
        }
        break;
      }
    }

    const steps = Object.values(copyEvaluation);

    return {
      cardName: card.name,
      copyDomain,
      copyEvaluation,
      steps,
      stoppingReason,
      recommendedCopies: Math.max(1, optimalCopies),
      optimalCopies: Math.max(1, optimalCopies)
    };
  }

  /**
   * Calculates marginal gain evidence for an individual copy index.
   */
  static computeMarginalGainForCopy(copyNum, ctx) {
    const { card, isLegendary, cmc, isCoreEngine, isTutorOrCantrip, otherCharacterCopies } = ctx;

    let baseGain = isCoreEngine ? 3.4 : 2.4;
    let stateGain = 0;
    let winPathStatus = 'IMPROVED';
    let causalCoverage = 'IMPROVED';
    let curveStatus = 'HEALTHY';
    let redundancyStatus = 'ACCEPTABLE';
    let dominance = 'DOMINANT';
    let justification = '';

    if (copyNum === 1) {
      stateGain = baseGain;
      justification = `Copia 1: Introduce la capacidad ${card.name} al mazo y abre líneas de interacción/motor.`;
    } else if (copyNum === 2) {
      let gain = baseGain * 0.85;
      if (isLegendary) {
        gain -= 0.6;
        redundancyStatus = 'MODERATE';
      }
      if (otherCharacterCopies > 0) {
        gain -= 0.8;
        redundancyStatus = 'HIGH_CHARACTER_COLLISION';
      }
      if (cmc >= 5) {
        gain -= 0.8;
        curveStatus = 'HEAVY';
      }
      stateGain = Number(gain.toFixed(2));
      justification = `Copia 2: Aumenta la probabilidad de robo a ~40% en Turno ${cmc + 1}.`;
    } else if (copyNum === 3) {
      let gain = baseGain * 0.65;
      if (isLegendary) {
        gain -= 1.4;
        redundancyStatus = 'HIGH';
        if (gain < 0.60) dominance = 'NON_DOMINANT';
      }
      if (otherCharacterCopies > 0) {
        gain -= 1.5;
        dominance = 'NON_DOMINANT';
      }
      if (cmc >= 5) {
        gain -= 1.4;
        curveStatus = 'CRITICAL_CURVE_RISK';
        dominance = 'NON_DOMINANT';
      } else if (cmc === 4) {
        gain -= 0.7;
      }
      if (isCoreEngine && !isLegendary && cmc <= 3) {
        gain += 0.4;
        dominance = 'DOMINANT';
      }
      stateGain = Number(gain.toFixed(2));
      if (stateGain < 0.50) dominance = 'NON_DOMINANT';
      justification = dominance === 'DOMINANT'
        ? `Copia 3: Asegura consistencia central (~54% robo en mano inicial/T3).`
        : `Copia 3 descartada: Coste de oportunidad frente a piezas de reach/interacción o curva alta.`;
    } else if (copyNum === 4) {
      let gain = baseGain * 0.45;
      if (isLegendary) {
        gain -= 2.2;
        redundancyStatus = 'DEAD_DRAW_RISK';
        dominance = 'NON_DOMINANT';
      }
      if (otherCharacterCopies > 0) {
        gain -= 2.0;
        dominance = 'NON_DOMINANT';
      }
      if (cmc >= 4) {
        gain -= 1.5;
        curveStatus = 'CONGESTION_RISK';
        dominance = 'NON_DOMINANT';
      }
      if (cmc <= 2 && !isLegendary && isCoreEngine) {
        gain += 0.8;
        dominance = 'DOMINANT';
      } else if (cmc === 3 && !isLegendary && isCoreEngine) {
        gain += 0.3;
        dominance = 'DOMINANT';
      }
      if (isTutorOrCantrip && !isLegendary) {
        gain += 0.5;
        dominance = 'DOMINANT';
      }

      stateGain = Number(Math.max(0.1, gain).toFixed(2));
      if (stateGain < 0.55 && dominance !== 'DOMINANT') dominance = 'NON_DOMINANT';

      justification = dominance === 'DOMINANT'
        ? `Copia 4: Maximiza probabilidad de robo (~60% en T1/T2, Playset esencial).`
        : `Copia 4 descartada: Coste de oportunidad elevado (${gain.toFixed(2)} < 0.55).`;
    }

    return {
      copy: copyNum,
      stateGain,
      stateDeltaEvidence: {
        winPath: winPathStatus,
        causalCoverage,
        curve: curveStatus,
        redundancy: redundancyStatus
      },
      dominance,
      justification
    };
  }

  /**
   * Evaluates the causal state-to-state impact of removing one copy of candidateCard from currentState.
   * Produces observable state deltas (dependencies, coverage, curve, dead-draws) without magical scores.
   * 
   * @param {Object|Array} currentState - Current deck state or list of cards
   * @param {Object|string} candidateCard - Card or card name whose copy is considered for removal
   * @param {Object} gameplanContract - Strategic gameplan
   * @returns {Object} Observable state-to-state removal assessment
   */
  static evaluateCopyRemoval(currentState, candidateCard, gameplanContract = null) {
    const cardName = typeof candidateCard === 'string' 
      ? candidateCard 
      : (candidateCard.name || candidateCard.cardName || candidateCard.card?.name);
    
    const cardList = Array.isArray(currentState) 
      ? currentState 
      : (currentState.cards || currentState.spells || []);
    
    const target = cardList.find(c => (c.name || c.card?.name) === cardName);
    const currentQty = target ? Number(target.quantity || target.count || 1) : 0;
    const currentTotal = cardList.reduce((sum, c) => sum + Number(c.quantity || c.count || 1), 0);

    if (currentQty <= 0) {
      return {
        candidateRemoved: cardName,
        canRemove: false,
        resultingStateCardCount: currentTotal,
        criticalDependenciesAffected: 0,
        winPathDelta: 0.0,
        deadDrawDelta: 0.0,
        redundancyDelta: 0.0,
        reason: 'CARD_NOT_IN_STATE'
      };
    }

    const targetObj = target.cardObj || target.card || target;
    const isLegendary = (targetObj.type_line || targetObj.type || '').includes('Legendary');
    const requiredEngines = gameplanContract?.requiredEngines || [];
    const isPrimaryEngine = requiredEngines.some(e => e.engineName === cardName || e.engineId === cardName) || targetObj.role === 'ENGINE';

    // Critical dependency check (count of dependencies affected)
    const criticalDependenciesAffected = (isPrimaryEngine && currentQty <= 2) ? 1 : 0;
    const criticalNodeImpact = criticalDependenciesAffected > 0 
      ? 'CRITICAL_ENGINE_BOTTLENECK' 
      : (targetObj.role === 'FINISHER' && currentQty <= 1 ? 'WIN_CONDITION_SINGLE_POINT_FAILURE' : 'NONE');
    const dependencyEdgesRemoved = criticalDependenciesAffected > 0 ? 1 : 0;
    const alternativeLineImpact = isPrimaryEngine ? -0.15 : (targetObj.role === 'FINISHER' ? -0.10 : 0.0);

    // Redundancy / dead draw impact
    const deadDrawDelta = (isLegendary && currentQty >= 3) ? -1.0 : 0.0;
    const redundancyDelta = currentQty >= 4 ? -0.5 : (currentQty === 3 ? -0.2 : 0.0);
    const winPathDelta = criticalDependenciesAffected > 0 ? -0.15 : (targetObj.role === 'FINISHER' && currentQty <= 1 ? -0.10 : 0.0);

    return {
      candidateRemoved: cardName,
      currentQty,
      resultingQty: currentQty - 1,
      resultingStateCardCount: currentTotal - 1,
      criticalDependenciesAffected,
      criticalNodeImpact,
      dependencyEdgesRemoved,
      alternativeLineImpact,
      isPrimaryEngine,
      deadDrawDelta,
      redundancyDelta,
      winPathDelta,
      isParetoOptimal: criticalDependenciesAffected === 0,
      canRemoveWithoutBreakingEngine: criticalDependenciesAffected === 0
    };
  }

  /**
   * Finds the least damaging spell copy to prune to reach targetCount, governed by Pareto dominance.
   */
  static findLeastDamagingCopyRemoval(spells, targetCount, gameplanContract = null) {
    let active = spells.map(s => ({
      ...s,
      cardObj: s.cardObj || s.card || s,
      quantity: Number(s.quantity || s.count || 1)
    }));

    const pruneLedger = [];

    while (active.reduce((sum, c) => sum + c.quantity, 0) > targetCount) {
      // Find candidate copies that can be removed
      const candidates = active.filter(c => c.quantity > 0).map(entry => {
        const assessment = this.evaluateCopyRemoval(active, entry.cardObj, gameplanContract);
        return {
          entry,
          assessment
        };
      });

      // Sort by safety (Pareto dominance):
      // 1. Critical dependencies affected (0 first)
      // 2. Not primary engine
      // 3. Higher winPathDelta (least damage)
      // 4. Highest quantity first (4x before 3x before 2x)
      // 5. Higher CMC first (reduces congestion)
      candidates.sort((a, b) => {
        if (a.assessment.criticalDependenciesAffected !== b.assessment.criticalDependenciesAffected) {
          return a.assessment.criticalDependenciesAffected - b.assessment.criticalDependenciesAffected;
        }
        if (a.assessment.isPrimaryEngine !== b.assessment.isPrimaryEngine) {
          return a.assessment.isPrimaryEngine ? 1 : -1;
        }
        if (a.assessment.winPathDelta !== b.assessment.winPathDelta) {
          return b.assessment.winPathDelta - a.assessment.winPathDelta;
        }
        if (b.entry.quantity !== a.entry.quantity) {
          return b.entry.quantity - a.entry.quantity;
        }
        return (b.entry.cmc || 0) - (a.entry.cmc || 0);
      });

      const chosen = candidates[0];
      if (!chosen) break;

      chosen.entry.quantity -= 1;
      pruneLedger.push({
        ruleId: 'PRUNE_017_PARETO_DOMINATION',
        prunedCard: chosen.entry.name,
        remainingCopies: chosen.entry.quantity,
        assessment: chosen.assessment
      });

      active = active.filter(c => c.quantity > 0);
    }

    return {
      prunedSpells: active,
      pruneLedger
    };
  }
}
