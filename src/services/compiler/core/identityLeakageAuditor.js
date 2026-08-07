/**
 * src/services/compiler/core/identityLeakageAuditor.js
 * 
 * IdentityLeakageAuditor: Permanent Zero-Leakage Compliance Auditor v1.0.
 * Calculates Leakage % across Spells, Packages, DNA, Engines, and Roles.
 * Target Leakage = 0%.
 */

import { IdentityFirewall } from './identityFirewall.js';

export class IdentityLeakageAuditor {
  /**
   * Performs full identity leakage audit on compiled deck state.
   * 
   * @param {Array<Object>} compiledCards 
   * @param {import('./deckIdentityModel.js').DeckIdentity} deckIdentity 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage 
   * @returns {{ totalSpellsCount: number, leakedSpellsCount: number, leakagePercentage: number, isClean: boolean, leakageReport: Object }}
   */
  static audit(compiledCards = [], deckIdentity, intentPackage) {
    const spellCards = compiledCards.filter(c => {
      const cardObj = c.cardObj || c;
      const typeLine = (cardObj.type_line || cardObj.typeLine || '').toLowerCase();
      return !typeLine.includes('land');
    });

    const firewallRes = IdentityFirewall.vetoDeckState(spellCards, deckIdentity, intentPackage);

    const leakageReport = {
      totalSpellsCount: spellCards.length,
      leakedSpellsCount: firewallRes.leakedCards.length,
      leakagePercentage: firewallRes.leakagePercentage,
      isClean: firewallRes.isClean,
      leakedDetails: firewallRes.leakedCards
    };

    return leakageReport;
  }
}
