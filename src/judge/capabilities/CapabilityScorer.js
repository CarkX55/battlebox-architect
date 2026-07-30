/**
 * src/judge/capabilities/CapabilityScorer.js
 * Contextual Capability Scorer for BattleBox Architect v7.
 * Computes a ContextScore (0-100) and breakdown for a candidate card against a slot/contract.
 */

export function scoreCapability(card, slotOrContract = {}) {
  if (!card || !card.name) {
    return Object.freeze({
      valid: false,
      contextScore: 0,
      confidence: 0,
      breakdown: { invalid: 0 },
      satisfiedContracts: [],
      rejectedContracts: []
    });
  }

  const name = (card.name || '').toLowerCase();
  const oracleText = (card.oracle_text || card.text || '').toLowerCase();
  const typeLine = (card.type_line || '').toLowerCase();
  const cmc = card.mana_value ?? card.cmc ?? 0;

  const slotId = (slotOrContract.id || slotOrContract.name || slotOrContract.search_query || '').toLowerCase();

  let contextScore = 0;
  const breakdown = {};
  const satisfiedContracts = [];
  const rejectedContracts = [];

  // 1. Check EarlyDefender / Wall contract
  if (slotId.includes('earlydefender') || slotId.includes('wall') || slotId.includes('defensores')) {
    if (typeLine.includes('wall')) {
      breakdown.wallType = 35;
      contextScore += 35;
    }
    if (typeLine.includes('defender') || oracleText.includes('defender')) {
      breakdown.defenderKeyword = 30;
      contextScore += 30;
    }
    if (cmc <= 2) {
      breakdown.cmcCurve = 20;
      contextScore += 20;
    } else if (cmc === 3) {
      breakdown.cmcCurve = 10;
      contextScore += 10;
    }
    if (oracleText.includes('draw a card') || oracleText.includes('draws a card')) {
      breakdown.cantripBonus = 15;
      contextScore += 15;
      satisfiedContracts.push('CardDraw');
    }

    if (contextScore >= 40) satisfiedContracts.push('EarlyDefender');
    else rejectedContracts.push('EarlyDefender');
  } 
  // 2. Check DefenderPayoff contract
  else if (slotId.includes('defenderpayoff') || slotId.includes('payoff') || slotId.includes('resistencia')) {
    if (oracleText.includes('equal to its toughness') || oracleText.includes("didn't have defender")) {
      breakdown.toughnessCombat = 50;
      contextScore += 50;
    }
    if (name.includes('arcades') || name.includes('high alert') || name.includes('assault formation')) {
      breakdown.apexPayoff = 45;
      contextScore += 45;
    }
    if (cmc <= 3) {
      breakdown.cmcCurve = 5;
      contextScore += 5;
    }

    if (contextScore >= 40) satisfiedContracts.push('DefenderPayoff');
    else rejectedContracts.push('DefenderPayoff');
  } 
  // 3. Check DefenderCardDraw / CardAdvantage contract
  else if (slotId.includes('defendercarddraw') || slotId.includes('draw') || slotId.includes('robo')) {
    if (oracleText.includes('draw a card') || oracleText.includes('draw cards')) {
      breakdown.cardDraw = 40;
      contextScore += 40;
    }
    if (typeLine.includes('wall') || oracleText.includes('defender')) {
      breakdown.defenderSynergy = 35;
      contextScore += 35;
      satisfiedContracts.push('EarlyDefender');
    }
    if (cmc <= 3) {
      breakdown.cmcCurve = 25;
      contextScore += 25;
    }

    if (contextScore >= 40) satisfiedContracts.push('CardDraw');
    else rejectedContracts.push('CardDraw');
  } 
  // 4. Default / Generic capability scoring
  else {
    if (cmc <= 3) {
      breakdown.cmcEfficiency = 40;
      contextScore += 40;
    }
    if (card.score && card.score > 0) {
      breakdown.baseAffinity = Math.min(40, Math.round(card.score / 20));
      contextScore += breakdown.baseAffinity;
    }
  }

  const confidence = Math.min(1.0, parseFloat((contextScore / 100).toFixed(2)));

  return Object.freeze({
    valid: contextScore > 0,
    contextScore,
    confidence,
    breakdown,
    satisfiedContracts,
    rejectedContracts
  });
}
