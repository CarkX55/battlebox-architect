/**
 * src/judge/capabilities/CapabilityValidator.js
 * Capability Validator for BattleBox Architect v7.
 * Evaluates candidate cards against capability contracts to prevent textual/keyword contamination.
 */

export function validateCapability(card, contract) {
  if (!card || !card.name) {
    return Object.freeze({ valid: false, reason: 'INVALID_CARD' });
  }

  const name = (card.name || '').toLowerCase();
  const oracleText = (card.oracle_text || card.text || '').toLowerCase();
  const typeLine = (card.type_line || '').toLowerCase();
  const cmc = card.mana_value ?? card.cmc ?? 0;
  const contractId = (contract.id || contract.signature || contract.name || '').toLowerCase();

  // 1. EARLY DEFENDER / WALL CONTRACT
  if (contractId.includes('earlydefender') || contractId.includes('wall')) {
    const isDefender = typeLine.includes('wall') || typeLine.includes('defender') || oracleText.includes('defender');
    if (!isDefender) {
      return Object.freeze({ valid: false, reason: 'NOT_DEFENDER_OR_WALL' });
    }
    if (cmc > 3) {
      return Object.freeze({ valid: false, reason: 'DEFENDER_CMC_TOO_HIGH' });
    }
    if (oracleText.includes("can't be blocked by creatures with defender") || oracleText.includes('spiders you control') || name === 'wall crawl') {
      return Object.freeze({ valid: false, reason: 'ANTI_DEFENDER_TEXT' });
    }
    return Object.freeze({ valid: true });
  }

  // 2. DEFENDER PAYOFF CONTRACT (Arcades, High Alert, Assault Formation, etc.)
  if (contractId.includes('defenderpayoff') || contractId.includes('payoff')) {
    const isToughnessCombat = oracleText.includes('equal to its toughness') || 
                              oracleText.includes("didn't have defender") || 
                              oracleText.includes('as though it didn\'t have defender') ||
                              name.includes('arcades') || 
                              name.includes('high alert') || 
                              name.includes('assault formation') ||
                              name.includes('bedrock tortoise') ||
                              name.includes('tower defense');
    if (!isToughnessCombat) {
      return Object.freeze({ valid: false, reason: 'NOT_TOUGHNESS_COMBAT_PAYOFF' });
    }
    return Object.freeze({ valid: true });
  }

  // 3. DEFENDER CARD DRAW CONTRACT
  if (contractId.includes('defenderingcarddraw') || contractId.includes('defendercarddraw') || contractId.includes('draw')) {
    if (oracleText.includes('heroes you control') || oracleText.includes('other heroes') || name === 'avengers assemble!') {
      return Object.freeze({ valid: false, reason: 'HERO_DEPENDENCY_IN_DRAW' });
    }
    if (cmc >= 6 || name === 'the endstone') {
      return Object.freeze({ valid: false, reason: 'SUICIDAL_OR_EXCESSIVE_CMC' });
    }
    const producesDraw = oracleText.includes('draw a card') || oracleText.includes('draw cards') || oracleText.includes('draws a card') || oracleText.includes('investigate');
    if (!producesDraw) {
      return Object.freeze({ valid: false, reason: 'NO_CARD_DRAW' });
    }
    return Object.freeze({ valid: true });
  }

  // 4. INTERACTION CONTRACT
  if (contractId.includes('interaction') || contractId.includes('removal')) {
    const isRemoval = oracleText.includes('destroy') || oracleText.includes('exile') || oracleText.includes('counter target') || oracleText.includes('deal') || oracleText.includes('-x/-x');
    if (!isRemoval) {
      return Object.freeze({ valid: false, reason: 'NO_INTERACTION_TEXT' });
    }
    return Object.freeze({ valid: true });
  }

  // 5. MANA STABILITY / RAMP CONTRACT
  if (contractId.includes('manastability') || contractId.includes('ramp')) {
    const isMana = typeLine.includes('land') || oracleText.includes('add ') || oracleText.includes('search your library for a land');
    if (!isMana) {
      return Object.freeze({ valid: false, reason: 'NO_MANA_PRODUCTION' });
    }
    return Object.freeze({ valid: true });
  }

  // Default fallback
  return Object.freeze({ valid: true });
}
