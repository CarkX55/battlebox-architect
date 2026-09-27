/**
 * src/services/compiler/core/identityFidelityEvaluator.js
 * 
 * IdentityFidelityEvaluator: Principle #5 Strategic Fidelity Auditor v1.0.
 * Evaluates how closely the assembled DeckState matches the target DeckIdentity.
 * Asserts engine fidelity, curve alignment, and gameplan execution (Target >= 95%).
 */

export class IdentityFidelityEvaluator {
  /**
   * Evaluates the strategic fidelity of a compiled DeckState against its target DeckIdentity.
   * 
   * @param {import('./deckState.js').DeckState} deckState 
   * @param {import('./deckIdentityModel.js').DeckIdentity} targetIdentity 
   * @returns {{ overallFidelityScore: number, engineFidelityPercentage: number, curveFidelityPercentage: number, manaFidelityPercentage: number, isHighFidelity: boolean, auditDetails: Object }}
   */
  static evaluate(deckState, targetIdentity) {
    if (!deckState || !targetIdentity) {
      return {
        overallFidelityScore: 100,
        engineFidelityPercentage: 100,
        curveFidelityPercentage: 100,
        manaFidelityPercentage: 100,
        isHighFidelity: true,
        auditDetails: {}
      };
    }

    const cards = deckState.cards || [];
    const forbiddenEngines = targetIdentity.forbiddenEngines || [];

    // 1. Forbidden Engine Check (100% rejection if any forbidden engine present)
    let forbiddenBreaches = [];
    for (const card of cards) {
      const typeLine = (card.type_line || '').toLowerCase();
      const oracleText = (card.oracle_text || card.oracleText || '').toLowerCase();

      for (const forbidden of forbiddenEngines) {
        const fLower = forbidden.toLowerCase();
        if (typeLine.includes(fLower) || oracleText.includes(fLower)) {
          forbiddenBreaches.push({ cardName: card.name, forbiddenEngine: forbidden });
        }
      }
    }

    const engineFidelityPercentage = forbiddenBreaches.length === 0 ? 100 : Math.max(0, 100 - (forbiddenBreaches.length * 20));

    // 2. Curve Alignment & Strategic Fidelity Check
    const targetMinCurve = targetIdentity.expectedCurveRange?.min || 1;
    const targetMaxCurve = targetIdentity.expectedCurveRange?.max || 5;

    let curveValidCount = 0;
    let nonLandTotal = 0;
    let midLateDropsCount = 0;

    for (const card of cards) {
      const qty = card.quantity || 1;
      const typeLine = (card.type_line || '').toLowerCase();
      if (!typeLine.includes('land')) {
        nonLandTotal += qty;
        const cmc = card.cmc || 2;
        if (cmc >= targetMinCurve - 1 && cmc <= targetMaxCurve + 1) {
          curveValidCount += qty;
        }
        if (cmc >= 3) {
          midLateDropsCount += qty;
        }
      }
    }

    const curveEnvelopeCompliance = nonLandTotal > 0 ? Math.round((curveValidCount / nonLandTotal) * 100) : 100;
    
    // Strategic Curve Fidelity: If target identity expects higher curve (targetMaxCurve >= 4),
    // a deck with zero mid/late drops (CMC 3+) has suffered curve collapse even if envelope compliance is 100%.
    let curveStrategicFidelity = curveEnvelopeCompliance;
    if (targetMaxCurve >= 4 && nonLandTotal >= 20 && midLateDropsCount === 0) {
      curveStrategicFidelity = Math.min(35, curveEnvelopeCompliance);
    } else if (targetMaxCurve >= 4 && nonLateDropsRatio(midLateDropsCount, nonLandTotal) < 0.15) {
      curveStrategicFidelity = Math.round(curveEnvelopeCompliance * 0.7);
    }

    // 3. Mana Ramp Requirement Check
    let manaFidelityPercentage = 100;
    if (targetIdentity.requiresManaRamp) {
      const hasRamp = cards.some(c => {
        const text = (c.oracle_text || c.oracleText || '').toLowerCase();
        return text.includes('add {') || text.includes('search your library for a land');
      });
      manaFidelityPercentage = hasRamp ? 100 : 80;
    }

    // 4. Overall Identity Fidelity Score Computation (100% if zero forbidden engine breaches)
    const overallFidelityScore = forbiddenBreaches.length === 0 ? 100 : Math.max(0, 100 - (forbiddenBreaches.length * 25));

    return {
      overallFidelityScore,
      engineFidelityPercentage,
      curveEnvelopeCompliance,
      curveStrategicFidelity,
      curveFidelityPercentage: curveStrategicFidelity, // Backward compatibility alias
      manaFidelityPercentage,
      isHighFidelity: overallFidelityScore >= 95 && curveStrategicFidelity >= 70,
      auditDetails: Object.freeze({
        archetypeKey: targetIdentity.archetypeKey,
        forbiddenBreaches: Object.freeze(forbiddenBreaches),
        curveValidCount,
        midLateDropsCount,
        nonLandTotal,
        curveEnvelopeCompliance,
        curveStrategicFidelity
      })
    };
  }
}

function nonLateDropsRatio(midLate, total) {
  return total > 0 ? (midLate / total) : 0;
}
