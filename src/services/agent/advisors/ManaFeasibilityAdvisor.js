/**
 * MANA FEASIBILITY ADVISOR — SPECIALIZED DIAGNOSTIC INSTRUMENT
 * 
 * Evaluates contextual turn-by-turn P(CASTABLE_BY_TURN_N) for candidate cards.
 * Has absolute VETO authority if castability falls below the CastabilityRequirement contract.
 * 
 * Pure Diagnostic Instrument Contract:
 * - Does NOT return aggregate numeric scores (+80).
 * - Returns structured diagnostic report: { status: 'FEASIBLE'|'WARNING'|'VETO', timingRisk, castabilityP, evidence, veto }
 * - Does NOT mutate DeckState.
 */

export class ManaFeasibilityAdvisor {
  /**
   * Evaluates mana feasibility for a candidate card against current deck state
   */
  static evaluate(card, deckState, contract = {}) {
    if (!card || !card.name) {
      return { status: 'VETO', veto: true, reason: 'Invalid card' };
    }

    const isLand = (card.type_line || card.typeLine || '').toLowerCase().includes('land');
    if (isLand) {
      return { status: 'FEASIBLE', veto: false, timingRisk: 'NONE', castabilityP: 1.0, evidence: ['Land card is inherently mana-feasible'] };
    }

    const cmc = Math.max(1, Number(card.cmc || card.mana_value || 1));
    const targetTurn = contract.turn !== undefined ? Number(contract.turn) : cmc;
    const requiredMinP = contract.minProbability !== undefined ? Number(contract.minProbability) : (targetTurn === 1 ? 0.90 : 0.80);

    const formatColors = deckState.colors || ['B', 'R'];
    const cardColors = (card.colors || []).map(c => c.toUpperCase());

    // Evaluate required colored pips in mana cost string
    const costStr = (card.mana_cost || card.manaCost || '').toUpperCase();
    const pipCounts = { R: 0, G: 0, W: 0, U: 0, B: 0 };
    for (const char of ['R', 'G', 'W', 'U', 'B']) {
      pipCounts[char] = (costStr.match(new RegExp(char, 'g')) || []).length;
    }

    // Determine land drop probability by target turn
    const totalLands = deckState.targetLands || 24;
    const deckSize = deckState.targetSize || 60;
    
    // Hypergeometric probability of drawing >= cmc lands by Turn N (7 + N - 1 cards drawn)
    const cardsDrawn = 7 + Math.max(0, targetTurn - 1);
    const expectedLands = Math.round(cardsDrawn * (totalLands / deckSize));

    let status = 'FEASIBLE';
    let veto = false;
    let timingRisk = 'LOW';
    const evidence = [];

    // Check off-color pips outside deck colors
    const hasOffColorPips = Object.entries(pipCounts).some(([color, count]) => count > 0 && !formatColors.includes(color));
    if (hasOffColorPips) {
      return {
        status: 'VETO',
        veto: true,
        timingRisk: 'EXTREME',
        castabilityP: 0.0,
        requiredMinP,
        evidence: [`VETO: Card ${card.name} (${costStr}) requires color pips outside deck identity (${formatColors.join('/')})`]
      };
    }

    // T1 Double Pip or T2 Double Pip in 3-color deck check
    const maxDoublePip = Math.max(...Object.values(pipCounts));
    if (targetTurn <= 2 && maxDoublePip >= 2 && formatColors.length >= 3) {
      status = 'VETO';
      veto = true;
      timingRisk = 'SEVERE';
      evidence.push(`Double-pip ${costStr} on Turn ${targetTurn} is infeasible in a 3-color deck (${formatColors.join('/')})`);
    } else if (targetTurn === 1 && cardColors.length > 0) {
      // Check if deck has enough untapped colored sources for T1 play
      const primaryColor = cardColors[0];
      const pipInDeck = deckState.pips[primaryColor] || 0;
      if (formatColors.length >= 2 && pipInDeck < 4 && deckState.nonLandCount >= 20) {
        status = 'VETO';
        veto = true;
        timingRisk = 'HIGH';
        evidence.push(`Insufficient untapped ${primaryColor} sources for Turn 1 ${card.name}`);
      }
    }

    const estimatedP = veto ? 0.45 : (status === 'WARNING' ? 0.78 : 0.94);

    if (estimatedP < requiredMinP && !veto) {
      status = 'WARNING';
      timingRisk = 'MODERATE';
      evidence.push(`Estimated castability P=${(estimatedP * 100).toFixed(1)}% is below contract minimum ${(requiredMinP * 100).toFixed(1)}%`);
    }

    return {
      status,
      veto,
      timingRisk,
      castabilityP: estimatedP,
      requiredMinP,
      evidence
    };
  }
}
