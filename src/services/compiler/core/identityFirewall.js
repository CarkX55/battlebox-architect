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
    const isBasicLand = ['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes'].includes(cardName.toLowerCase());

    // HARD CONSTRAINT 0: Format Legality Enforcement (All cards except standard basic lands)
    if (intentPackage && intentPackage.format && !isBasicLand) {
      const formatKey = intentPackage.format.toLowerCase();
      if (card.legalities && card.legalities[formatKey] && card.legalities[formatKey] !== 'legal') {
        return {
          isAllowed: false,
          vetoReason: `Hard Constraint Veto: Card "${cardName}" is NOT legal in format "${intentPackage.format}" (status: ${card.legalities[formatKey]})`
        };
      }
    }

    // HARD CONSTRAINT 0b: Color Identity Enforcement (All cards)
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

    // Pure non-creature lands pass identity checks once legal and color-compliant
    const isPureLand = typeLine.includes('land') && !typeLine.includes('creature');
    if (isPureLand) {
      return { isAllowed: true, vetoReason: null };
    }

    const primaryTribe = (intentPackage ? intentPackage.primaryTribe : '') || '';
    const tribeLower = primaryTribe.toLowerCase();

    // HARD CONSTRAINT 1: Primary Tribe Enforcement for Tribal Intent
    if (primaryTribe && primaryTribe !== 'None' && typeLine.includes('creature')) {
      let isMatchingTribe = false;
      if (tribeLower.includes('saproling') || tribeLower.includes('fungus') || tribeLower.includes('hongo')) {
        isMatchingTribe = typeLine.includes('saproling') || typeLine.includes('fungus') || 
                          oracleText.includes('saproling') || oracleText.includes('fungus') ||
                          cardName.toLowerCase().includes('slimefoot') || cardName.toLowerCase().includes('thallid');
      } else if (tribeLower.includes('thopter') || tribeLower.includes('servo')) {
        isMatchingTribe = typeLine.includes('thopter') || typeLine.includes('servo') || typeLine.includes('artificer') ||
                          oracleText.includes('thopter') || oracleText.includes('servo');
      } else {
        isMatchingTribe = typeLine.includes(tribeLower);
      }

      if (!isMatchingTribe) {
        return {
          isAllowed: false,
          vetoReason: `Hard Constraint Veto: Creature "${cardName}" type line "${typeLine}" does not match required primary tribe "${primaryTribe}"`
        };
      }
    }

    // HARD CONSTRAINT 1b: Prevent off-tribe token pollution in tribal decks
    if (primaryTribe && (tribeLower.includes('saproling') || tribeLower.includes('fungus') || tribeLower.includes('hongo'))) {
      const otherTokenTribes = ['ooze', 'goblin', 'zombie', 'skeleton', 'pilot', 'alien', 'soldier', 'cat', 'dog', 'knight', 'vampire', 'dinosaur', 'dragon', 'faerie', 'merfolk'];
      const createsOtherSpecificToken = otherTokenTribes.some(ot => 
        oracleText.includes(`create`) && (oracleText.includes(`${ot} creature token`) || oracleText.includes(`${ot} token`))
      );
      if (createsOtherSpecificToken && !oracleText.includes('saproling') && !oracleText.includes('fungus')) {
        return {
          isAllowed: false,
          vetoReason: `Hard Constraint Veto: Card "${cardName}" generates off-tribe tokens in a Saproling/Fungus tribal deck`
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
