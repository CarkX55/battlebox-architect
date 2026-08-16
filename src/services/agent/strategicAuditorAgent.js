/**
 * STRATEGIC AUDITOR AGENT — THE CRITIC (Sprint 7 Tournament Intelligence)
 * 
 * Inspects 60-card deck state & Monte Carlo TacticalReport.
 * Diagnoses tactical bottlenecks (mana screw, high CMC curve, lack of early interaction)
 * and proposes targeted 1-2 card swaps.
 */

export class StrategicAuditorAgent {
  /**
   * Audit deck state against tactical report and generate swap proposals
   * 
   * @param {Object} deckState - Instance of DeckState
   * @param {Object} tacticalReport - Output from TacticalSimulator
   * @param {Object} intentPackage - SSOT IntentPackage
   * @returns {Object} AuditResult
   */
  static auditDeck(deckState, tacticalReport = {}, intentPackage = {}) {
    const score = tacticalReport.tacticalFidelityScore || 100;
    
    // Benchmark 1: High Tactical Stability (>= 85/100) -> No refinement needed
    if (score >= 85) {
      return {
        needsRefinement: false,
        auditReason: `Deck satisfies high tournament tactical score (${score}/100 >= 85).`,
        proposedSwaps: []
      };
    }

    const proposedSwaps = [];
    let auditReason = '';

    // Find heaviest CMC cards in deck to target for reduction
    let heaviestCard = null;
    let maxCMC = 0;
    for (const entry of deckState.cards.values()) {
      if (entry.cmc > maxCMC && entry.quantity >= 2 && entry.role !== 'MUST_INCLUDE') {
        maxCMC = entry.cmc;
        heaviestCard = entry;
      }
    }

    // Diagnosis 1: High Mana Screw Risk or Low On-Curve Playability
    if (tacticalReport.manaScrewRisk > 15 || tacticalReport.onCurvePlayability < 70) {
      auditReason = `High Mana Screw Risk (${tacticalReport.manaScrewRisk}%) / Low On-Curve Playability (${tacticalReport.onCurvePlayability}%). High CMC curve detected.`;
      
      if (heaviestCard) {
        proposedSwaps.push({
          removeCardName: heaviestCard.name,
          removeQuantity: Math.min(2, heaviestCard.quantity),
          needRole: 'CHEAP_REMOVAL',
          cmcMax: 2,
          justification: `Replace 2x heavy ${heaviestCard.name} (CMC ${heaviestCard.cmc}) with cheap CMC <= 2 removal to lower curve and stabilize early turns.`
        });
      }
    } 
    // Diagnosis 2: High Mulligan Rate or Color Screw Risk
    else if (tacticalReport.mulliganRate > 20 || tacticalReport.colorScrewRisk > 15) {
      auditReason = `High Mulligan Rate (${tacticalReport.mulliganRate}%) / Color Screw Risk (${tacticalReport.colorScrewRisk}%). Needs early card flow/draw.`;
      
      if (heaviestCard) {
        proposedSwaps.push({
          removeCardName: heaviestCard.name,
          removeQuantity: Math.min(2, heaviestCard.quantity),
          needRole: 'CARD_FLOW',
          cmcMax: 2,
          justification: `Replace 2x ${heaviestCard.name} with early card flow / cantrip to smooth initial draws.`
        });
      }
    } 
    // Fallback Diagnosis
    else {
      auditReason = `Tactical Score (${score}/100) below threshold. Tuning curve structure.`;
      if (heaviestCard) {
        proposedSwaps.push({
          removeCardName: heaviestCard.name,
          removeQuantity: 1,
          needRole: 'CHEAP_REMOVAL',
          cmcMax: 2,
          justification: `Trim 1x ${heaviestCard.name} for lower-CMC interaction.`
        });
      }
    }

    return {
      needsRefinement: proposedSwaps.length > 0,
      auditReason,
      proposedSwaps
    };
  }
}
