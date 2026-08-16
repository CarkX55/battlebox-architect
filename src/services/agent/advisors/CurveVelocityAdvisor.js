/**
 * CURVE VELOCITY ADVISOR — SPECIALIZED DIAGNOSTIC INSTRUMENT
 * 
 * Evaluates double-spelling index, turn action capacity, and curve saturation.
 * Prevents high-CMC overcrowding and ensures low-CMC action density.
 * 
 * Pure Diagnostic Instrument Contract:
 * - Does NOT return aggregate numeric scores.
 * - Returns structured qualitative report: { status: 'OPTIMAL'|'SATURATED'|'OVERCROWDED', doubleSpellIndex, curveFit, evidence }
 * - Does NOT mutate DeckState.
 */

export class CurveVelocityAdvisor {
  /**
   * Evaluates curve velocity for candidate card against deckState
   */
  static evaluate(card, deckState, contract = {}) {
    if (!card || !card.name) {
      return { status: 'SATURATED', evidence: ['Invalid card'] };
    }

    const isLand = (card.type_line || card.typeLine || '').toLowerCase().includes('land');
    if (isLand) {
      return { status: 'OPTIMAL', curveFit: 'LAND', doubleSpellIndex: 1.0, evidence: ['Land supports curve velocity'] };
    }

    const cmc = Math.min(7, Math.max(0, Number(card.cmc || card.mana_value || 0)));
    const curve = deckState.cmcCurve || { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    const nonLands = deckState.nonLandCount || 0;

    const cmc1Count = curve[1] || 0;
    const cmc2Count = curve[2] || 0;
    const cmc3Count = curve[3] || 0;
    const cmc5Plus = (curve[5] || 0) + (curve[6] || 0) + (curve[7] || 0);

    const evidence = [];
    let status = 'OPTIMAL';

    // 1. High-CMC Overcrowding Check (CMC >= 5)
    if (cmc >= 5) {
      const isRamp = (deckState.archetype || '').toLowerCase().includes('ramp');
      const maxAllowed = isRamp ? 8 : 6;
      if (cmc5Plus >= maxAllowed) {
        status = 'OVERCROWDED';
        evidence.push(`High-CMC curve (5+) is OVERCROWDED (${cmc5Plus}/${maxAllowed} slots). Rejection recommended.`);
      } else if (cmc5Plus >= maxAllowed - 1) {
        status = 'SATURATED';
        evidence.push(`High-CMC curve (5+) is SATURATED (${cmc5Plus}/${maxAllowed} slots)`);
      }
    }

    // 2. CMC 3 Saturation Check
    if (cmc === 3 && cmc3Count >= 14) {
      status = 'SATURATED';
      evidence.push(`CMC 3 tier is SATURATED (${cmc3Count} spells). Adding more CMC 3 spells reduces double-spelling capacity.`);
    }

    // 3. Double-Spelling Capacity Assessment
    const doubleSpellIndex = nonLands > 0 ? (cmc1Count + cmc2Count) / nonLands : 0;
    if (cmc <= 2) {
      evidence.push(`Low CMC (${cmc}) increases Turn 3-4 Double-Spelling velocity index (current: ${(doubleSpellIndex * 100).toFixed(1)}%)`);
    }

    return {
      status,
      cmc,
      doubleSpellIndex,
      cmc5PlusCount: cmc5Plus,
      evidence
    };
  }
}
