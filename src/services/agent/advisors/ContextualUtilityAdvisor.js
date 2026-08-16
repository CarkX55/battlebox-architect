/**
 * CONTEXTUAL UTILITY ADVISOR — SPECIALIZED DIAGNOSTIC INSTRUMENT
 * 
 * Evaluates matchup versatility, modal flexibility, dead-card risk, and opportunity cost.
 * Prefers modal/flexible/adventure cards over narrow niche cards that sit useless in hand.
 * 
 * Pure Diagnostic Instrument Contract:
 * - Does NOT return aggregate numeric scores.
 * - Returns structured qualitative report: { status: 'HIGH_UTILITY'|'MODERATE'|'DEAD_RISK', flexibility, deadCardRisk, evidence }
 * - Does NOT mutate DeckState.
 */

export class ContextualUtilityAdvisor {
  /**
   * Evaluates contextual utility for candidate card against deckState
   */
  static evaluate(card, deckState, contract = {}) {
    if (!card || !card.name) {
      return { status: 'DEAD_RISK', deadCardRisk: 'HIGH', evidence: ['Invalid card'] };
    }

    const oracleText = (card.oracle_text || card.oracleText || card.text || '').toLowerCase();
    const typeLine = (card.type_line || card.typeLine || '').toLowerCase();

    const evidence = [];
    let flexibility = 'STANDARD';
    let deadCardRisk = 'LOW';
    let status = 'MODERATE';

    // 1. Check Modal / Adventure / Versatile Text
    const isModal = oracleText.includes('choose one —') || oracleText.includes('choose two —') || oracleText.includes('choose one or both —');
    const isAdventure = typeLine.includes('adventure') || !!card.keywords?.includes('Adventure');
    const isKicker = oracleText.includes('kicker') || oracleText.includes('multikicker');
    const isChannel = oracleText.includes('channel —');

    if (isModal || isAdventure || isKicker || isChannel) {
      flexibility = 'HIGH_MODAL';
      status = 'HIGH_UTILITY';
      evidence.push('Modal / Flexible spell reduces dead-card risk across varied matchups');
    }

    // 2. Check Narrow / Dead Card Risk (e.g. destroy artifact when meta has no artifacts)
    if (oracleText.includes('destroy target artifact') && !oracleText.includes('or creature') && !oracleText.includes('or enchantment')) {
      deadCardRisk = 'HIGH';
      status = 'DEAD_RISK';
      evidence.push('Narrow artifact-only removal carries high dead-card risk in maindeck');
    }

    // 3. Matchup Versatility (e.g. Instant-speed interaction vs creature spells)
    if (typeLine.includes('instant') || oracleText.includes('flash')) {
      if (status !== 'DEAD_RISK') status = 'HIGH_UTILITY';
      evidence.push('Instant-speed capability provides matchup versatility vs Aggro & Combo');
    }

    return {
      status,
      flexibility,
      deadCardRisk,
      evidence
    };
  }
}
