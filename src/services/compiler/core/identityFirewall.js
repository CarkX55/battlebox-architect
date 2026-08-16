/**
 * src/services/compiler/core/identityFirewall.js
 * 
 * IdentityFirewall: Hard Constraint Identity Veto Engine v1.0.
 * Vets cards against Hard Constraints: primaryTribe, requiredCreatureClasses, forbiddenPackages, forbiddenEngines.
 * Enforces ZERO IDENTITY LEAKAGE (0%).
 */

export class IdentityFirewall {
  /**
   * Vets a single card against Hard Constraints.
   * 
   * @param {Object} card 
   * @param {import('./deckIdentityModel.js').DeckIdentity} deckIdentity 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage 
   * @returns {{ isAllowed: boolean, vetoReason: string|null }}
   */
  static validateCard(card, deckIdentity, intentPackage) {
    if (!card) return { isAllowed: false, vetoReason: 'Null card object' };

    const typeLine = (card.type_line || card.typeLine || '').toLowerCase();
    const oracleText = (card.oracle_text || card.oracleText || '').toLowerCase();
    const cardName = card.name || 'Unknown';
    const isLand = typeLine.includes('land');

    // Lands pass color/utility validation
    if (isLand) {
      return { isAllowed: true, vetoReason: null };
    }

    // HARD CONSTRAINT 0: Format Legality Enforcement
    if (intentPackage && intentPackage.format) {
      const formatKey = intentPackage.format.toLowerCase();
      if (card.legalities && card.legalities[formatKey] && card.legalities[formatKey] !== 'legal') {
        return {
          isAllowed: false,
          vetoReason: `Hard Constraint Veto: Card "${cardName}" is NOT legal in format "${intentPackage.format}" (status: ${card.legalities[formatKey]})`
        };
      }
    }

    // HARD CONSTRAINT 0b: Color Identity Enforcement
    if (intentPackage && Array.isArray(intentPackage.colors) && intentPackage.colors.length > 0) {
      const allowedColors = new Set(intentPackage.colors.map(c => String(c).toUpperCase()));
      const cardColors = (card.colors || []).map(c => String(c).toUpperCase());
      const colorIdentity = (card.color_identity || []).map(c => String(c).toUpperCase());
      const isColorAllowed = cardColors.every(c => allowedColors.has(c)) &&
                             colorIdentity.every(c => allowedColors.has(c));
      if (!isColorAllowed) {
        return {
          isAllowed: false,
          vetoReason: `Hard Constraint Veto: Card "${cardName}" colors [${cardColors.join(',')}] / identity [${colorIdentity.join(',')}] not allowed in deck colors [${intentPackage.colors.join(',')}]`
        };
      }
    }

    const primaryTribe = (intentPackage ? intentPackage.primaryTribe : '') || '';
    const tribeLower = primaryTribe.toLowerCase();

    // HARD CONSTRAINT 1: Primary Tribe Enforcement for Tribal Intent
    if (primaryTribe && primaryTribe !== 'None' && typeLine.includes('creature')) {
      const isMatchingTribe = typeLine.includes(tribeLower);
      if (!isMatchingTribe) {
        return {
          isAllowed: false,
          vetoReason: `Hard Constraint Veto: Creature "${cardName}" type line "${typeLine}" does not match required primary tribe "${primaryTribe}"`
        };
      }
    }

    // HARD CONSTRAINT 2: Forbidden Engines & Forbidden Packages Check
    const forbiddenPackages = deckIdentity ? (deckIdentity.forbiddenPackages || []) : [];
    if (forbiddenPackages.includes('GO_WIDE_PACKAGE') || forbiddenPackages.includes('TOKEN_PACKAGE')) {
      if (oracleText.includes('create a 1/1') || oracleText.includes('create a 2/2') || oracleText.includes('create') && oracleText.includes('token')) {
        return {
          isAllowed: false,
          vetoReason: `Hard Constraint Veto: Card "${cardName}" generates tokens forbidden by identity [${forbiddenPackages.join(', ')}]`
        };
      }
    }

    if (forbiddenPackages.includes('HUMANS_GO_WIDE_PACKAGE') && typeLine.includes('human')) {
      if (primaryTribe.toLowerCase() !== 'human') {
        return {
          isAllowed: false,
          vetoReason: `Hard Constraint Veto: Human creature "${cardName}" belongs to forbidden package [HUMANS_GO_WIDE_PACKAGE]`
        };
      }
    }

    // HARD CONSTRAINT 3: Creature Classes
    const reqClasses = deckIdentity ? (deckIdentity.requiredCreatureClasses || []) : [];
    if (reqClasses.length > 0 && typeLine.includes('creature')) {
      const matchesClass = reqClasses.some(c => typeLine.includes(c.toLowerCase()));
      if (!matchesClass) {
        return {
          isAllowed: false,
          vetoReason: `Hard Constraint Veto: Creature "${cardName}" does not match required classes [${reqClasses.join(', ')}]`
        };
      }
    }

    return { isAllowed: true, vetoReason: null };
  }

  /**
   * Post-assembly firewall check. Asserts 0% non-identity spells survive in deck.
   * 
   * @param {Array<Object>} compiledCards 
   * @param {import('./deckIdentityModel.js').DeckIdentity} deckIdentity 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage 
   * @returns {{ isClean: boolean, leakedCards: Array<Object>, leakagePercentage: number }}
   */
  static vetoDeckState(compiledCards = [], deckIdentity, intentPackage) {
    const leakedCards = [];

    for (const card of compiledCards) {
      const cardObj = card.cardObj || card;
      const check = this.validateCard(cardObj, deckIdentity, intentPackage);
      if (!check.isAllowed) {
        leakedCards.push({ cardName: card.name || cardObj.name, reason: check.vetoReason });
      }
    }

    const nonLandCount = compiledCards.filter(c => !((c.type_line || c.typeLine || '').toLowerCase().includes('land'))).length;
    const leakagePercentage = nonLandCount > 0 ? Math.round((leakedCards.length / nonLandCount) * 100) : 0;

    return {
      isClean: leakedCards.length === 0,
      leakedCards,
      leakagePercentage
    };
  }
}
