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

    const isCoreEngine = (strategicContract.winPath || []).some(node => {
      const nodeKey = typeof node === 'string' ? node : (node.id || node.name || '');
      return (card.oracle_text || '').toLowerCase().includes(nodeKey.toLowerCase());
    });

    const isTutorOrCantrip = (card.oracle_text || '').toLowerCase().includes('search your library') || (cmc <= 1 && (card.oracle_text || '').toLowerCase().includes('draw a card'));

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
        // Marginal gain no longer justifies adding additional copies
        break;
      }
    }

    return {
      cardName: card.name,
      copyDomain,
      copyEvaluation,
      optimalCopies: Math.max(1, optimalCopies)
    };
  }

  /**
   * Calculates marginal gain evidence for an individual copy index.
   */
  static computeMarginalGainForCopy(copyNum, ctx) {
    const { card, isLegendary, cmc, isCoreEngine, isTutorOrCantrip, otherCharacterCopies } = ctx;

    let baseGain = isCoreEngine ? 3.2 : 2.2;
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
        gain -= 0.4;
        redundancyStatus = 'MODERATE';
      }
      if (otherCharacterCopies > 0) {
        gain -= 0.8; // Collision with existing character printing
        redundancyStatus = 'HIGH_CHARACTER_COLLISION';
      }
      if (cmc >= 5) {
        gain -= 0.6;
        curveStatus = 'HEAVY';
      }
      stateGain = Number(gain.toFixed(2));
      justification = `Copia 2: Aumenta la probabilidad de robo a ~40% en Turno ${cmc + 1}.`;
    } else if (copyNum === 3) {
      let gain = baseGain * 0.60;
      if (isLegendary) {
        gain -= 1.0;
        redundancyStatus = 'HIGH';
      }
      if (otherCharacterCopies > 0) {
        gain -= 1.5;
        dominance = 'NON_DOMINANT';
      }
      if (cmc >= 4) {
        gain -= 0.8;
        curveStatus = 'HIGH_CURVE_RISK';
      }
      if (isCoreEngine && !isLegendary) gain += 0.4;
      stateGain = Number(gain.toFixed(2));
      if (stateGain < 0.5) dominance = 'NON_DOMINANT';
      justification = dominance === 'DOMINANT'
        ? `Copia 3: Asegura consistencia central (~54% robo en mano inicial/T3).`
        : `Copia 3 descartada: Riesgo de atasco por leyenda redundante o curva pesada.`;
    } else if (copyNum === 4) {
      let gain = baseGain * 0.40;
      if (isLegendary) {
        gain -= 1.6; // Severe legendary dead-in-hand penalty
        redundancyStatus = 'DEAD_DRAW_RISK';
        dominance = 'NON_DOMINANT';
      }
      if (otherCharacterCopies > 0) {
        gain -= 2.0;
        dominance = 'NON_DOMINANT';
      }
      if (cmc >= 4) {
        gain -= 1.2;
        curveStatus = 'DEGRADED';
        dominance = 'NON_DOMINANT';
      }
      if (isCoreEngine && !isLegendary) {
        gain += 0.5;
        dominance = 'DOMINANT';
      }
      if (isTutorOrCantrip) gain += 0.3;

      stateGain = Number(Math.max(0.1, gain).toFixed(2));
      if (stateGain < 0.5) dominance = 'NON_DOMINANT';

      justification = dominance === 'DOMINANT'
        ? `Copia 4: Maximiza probabilidad absoluta en Turno 1-2 (Playset no-legendario esencial).`
        : `Copia 4 descartada: Riesgo de carta muerta por ser Legendaria o curva alta (Ganancia marginal ${gain.toFixed(2)} < 0.5).`;
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
}
