/**
 * COPY COUNT STRATEGIST — CONTEXTUAL ALLOCATION ENGINE (v9.1)
 * 
 * Determines contextual copy count (1x, 2x, 3x, 4x) for non-land cards based on:
 * - Strategic Role & Density Requirement
 * - Legendary Rule Penalty & Dead-Draw Cost
 * - Curve Placement (CMC) & Late-Game Utility
 * - Redundancy & Tutor Availability
 */

export class CopyCountStrategist {
  /**
   * Evaluates optimal copy count for a candidate card given current deck state and contract
   * 
   * @param {Object} card 
   * @param {Object} deckState 
   * @param {Object} contract 
   * @returns {{ quantity: number, why: string, reason: string, deadDrawCost: string }}
   */
  static determineCopyCount(card = {}, deckState = {}, contract = {}) {
    if (!card) return { quantity: 4, why: 'DEFAULT_PLAYSET', reason: 'Default playset', deadDrawCost: 'LOW' };

    // Invariant 1: Singleton / Commander formats MUST always be 1 copy
    const constraints = deckState.intentPackage?.userConstraints || {};
    const isSingleton = Boolean(constraints.singleton || deckState.isSingleton || deckState.intentPackage?.format === 'COMMANDER');
    if (isSingleton) {
      return {
        quantity: 1,
        why: 'SINGLETON_FORMAT_CONSTRAINT',
        reason: 'Format enforces singleton copy limit',
        deadDrawCost: 'N/A'
      };
    }

    const typeLine = (card.type_line || card.typeLine || '').toLowerCase();
    const oracleText = (card.oracle_text || card.oracleText || card.text || '').toLowerCase();
    const cmc = card.cmc || card.mana_value || 0;
    const isLegendary = typeLine.includes('legendary');
    const role = (contract.role || card.role || '').toUpperCase();

    // Check custom max copies constraint from user
    const maxAllowed = Number(constraints.maxCopies || 4);

    // Dynamic Contextual Metrics from DeckState
    const deckCards = deckState.cards ? Array.from(deckState.cards.values()) : [];
    const sameRoleCount = deckCards
      .filter(c => (c.role || '').toUpperCase() === role)
      .reduce((sum, c) => sum + (c.quantity || 1), 0);

    const tutorCount = deckCards.filter(c => {
      const text = (c.oracle_text || c.card?.oracle_text || '').toLowerCase();
      return text.includes('search your library');
    }).reduce((sum, c) => sum + (c.quantity || 1), 0);

    const cantripCount = deckCards.filter(c => {
      const text = (c.oracle_text || c.card?.oracle_text || '').toLowerCase();
      const cardCmc = c.cmc || c.card?.cmc || 0;
      return cardCmc <= 2 && (text.includes('draw a card') || text.includes('draw cards'));
    }).reduce((sum, c) => sum + (c.quantity || 1), 0);

    const virtualDensitySupport = tutorCount * 1.5 + cantripCount * 0.5;

    // 1. High Functional Redundancy Adjustment (If deck already has 8+ cards fulfilling this role)
    if (sameRoleCount >= 8 && !role.includes('RAMP')) {
      const copies = Math.min(2, maxAllowed);
      return {
        quantity: copies,
        why: 'HIGH_FUNCTIONAL_REDUNDANCY',
        reason: `Deck has ${sameRoleCount} cards in role ${role}; allocating ${copies} copies due to existing functional redundancy`,
        deadDrawCost: 'MEDIUM',
        assemblySupport: virtualDensitySupport
      };
    }

    // 2. High-CMC Finishers & Late Game Payoffs (2 Copies)
    if (cmc >= 5 || role.includes('FINISHER') || role.includes('PAYOFF')) {
      const hasHeavyRamp = (deckState.rampCount || 0) >= 6;
      const targetCopies = (!isLegendary && hasHeavyRamp && cmc === 5) ? 3 : 2;

      return {
        quantity: Math.min(targetCopies, maxAllowed),
        why: 'HIGH_CMC_LATE_GAME_PAYOFF',
        reason: `${cmc}-CMC payoff allocated ${targetCopies} copies to minimize early-game dead-draw penalty`,
        deadDrawCost: 'HIGH',
        assemblySupport: virtualDensitySupport
      };
    }

    // 3. Legendary Rule & Diminishing Utility (3 Copies)
    if (isLegendary && cmc <= 4) {
      const copies = Math.min(3, maxAllowed);
      return {
        quantity: copies,
        why: 'LEGENDARY_RULE_CONSTRAINED',
        reason: 'High strategic importance, constrained to 3 copies by Legendary rule dead-draw penalty',
        deadDrawCost: 'MEDIUM',
        assemblySupport: virtualDensitySupport
      };
    }

    // 4. Tutor / Cantrip Supported Primary Roles (3 Copies instead of 4)
    if (virtualDensitySupport >= 4.0 && !isLegendary && cmc <= 3) {
      const copies = Math.min(3, maxAllowed);
      return {
        quantity: copies,
        why: 'VIRTUAL_DENSITY_SUPPORTED',
        reason: `Virtual density support (${virtualDensitySupport.toFixed(1)}) reduces required physical copies from 4x to ${copies}x`,
        deadDrawCost: 'LOW',
        assemblySupport: virtualDensitySupport
      };
    }

    // 5. Core Engine Low-CMC Primary (4 Copies)
    const isLowCmcEngine = cmc <= 2 && (
      role.includes('RAMP') || 
      role.includes('REMOVAL') || 
      role.includes('INTERACTION') || 
      role.includes('CARD_FLOW') ||
      typeLine.includes('creature')
    );

    if (!isLegendary && isLowCmcEngine) {
      return {
        quantity: Math.min(4, maxAllowed),
        why: 'CORE_ENGINE_HIGH_DENSITY',
        reason: 'Cheap core engine spell requiring maximum opening hand density and low dead-draw cost',
        deadDrawCost: 'LOW',
        assemblySupport: virtualDensitySupport
      };
    }

    // 6. Default Non-Legendary Utility (4 or 3 Copies based on CMC)
    const defaultQty = cmc <= 3 ? 4 : 3;
    return {
      quantity: Math.min(defaultQty, maxAllowed),
      why: 'STANDARD_ROLE_ALLOCATION',
      reason: `Standard allocation of ${defaultQty} copies based on CMC ${cmc} and role ${role}`,
      deadDrawCost: cmc <= 3 ? 'LOW' : 'MEDIUM',
      assemblySupport: virtualDensitySupport
    };
  }
}
