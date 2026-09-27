/**
 * src/services/compiler/core/minimumViableGenomeGate.js
 * 
 * Minimum Viable Genome (MVG) Gate v29.1.
 * Fast-fail structural verification gate executed BEFORE simulation.
 * Rejects structurally unviable or illegal genomes instantly, saving thousands
 * of unnecessary simulation rollout cycles.
 */

import { DemandSupplyLedger } from './demandSupplyLedger.js';
import { MarginalCopyEvaluator } from './marginalCopyEvaluator.js';
import { IdentityFirewall } from './identityFirewall.js';
import { CardCausalContract } from './cardCausalContract.js';
import { GameplanIntegrityGate } from './gameplanIntegrityGate.js';

export class MinimumViableGenomeGate {
  /**
   * Evaluates if a candidate genome satisfies the Minimum Viable Genome invariants.
   * 
   * @param {import('./deckCompositionGenome.js').DeckCompositionGenome} genome 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage 
   * @param {Object} deckIdentity 
   * @returns {{ isViable: boolean, rejectionReasons: string[], defectSummary: string|null }}
   */
  static validateGenome(genome, intentPackage = {}, deckIdentity = {}) {
    const rejectionReasons = [];
    const format = (intentPackage.format || genome.format || 'STANDARD').toUpperCase();
    const isCommander = format === 'COMMANDER' || format === 'EDH' || format === 'BRAWL';
    const targetSize = isCommander ? 100 : (intentPackage.userConstraints?.deckSize || 60);

    // 1. Deck Size Exactness
    const totalCount = genome.getTotalCardCount();
    if (totalCount !== targetSize) {
      rejectionReasons.push(`DECK_SIZE_MISMATCH: Genome has ${totalCount} cards (Expected: ${targetSize})`);
    }

    // 2. Legal Copy Counts
    const maxConstructedCopies = intentPackage.userConstraints?.maxCopies || (isCommander ? 1 : 4);
    for (const [oracleId, count] of genome.copiesByOracleId.entries()) {
      if (count > maxConstructedCopies) {
        const cardObj = genome.cardIdentityMap.get(oracleId) || {};
        const domain = MarginalCopyEvaluator.getCopyDomain(cardObj, format, intentPackage.userConstraints || {});
        if (count > domain.max) {
          rejectionReasons.push(`ILLEGAL_COPY_COUNT: "${cardObj.name || oracleId}" has ${count}x copies (Max legal: ${domain.max}x)`);
        }
      }
      if (count < 0) {
        rejectionReasons.push(`NEGATIVE_COPY_COUNT: "${oracleId}" has invalid negative quantity ${count}`);
      }
    }

    // 3. Color Identity Compliance
    const allowedColors = new Set((intentPackage.colors && intentPackage.colors.length > 0 ? intentPackage.colors : ['R']).map(c => c.toUpperCase()));
    for (const [oracleId, cardObj] of genome.cardIdentityMap.entries()) {
      const cardColors = cardObj.colors || [];
      const isColorLegal = cardColors.length === 0 || allowedColors.has('C') || cardColors.every(c => allowedColors.has(c.toUpperCase()));
      if (!isColorLegal) {
        rejectionReasons.push(`COLOR_IDENTITY_VIOLATION: "${cardObj.name || oracleId}" [${cardColors.join(',')}] outside allowed [${Array.from(allowedColors).join(',')}]`);
      }
    }

    // 4. Mana Base Sane Bounds
    const minLands = isCommander ? 32 : 18;
    const maxLands = isCommander ? 44 : 28;
    const totalLands = Number(genome.landState.totalLands || 0);

    if (totalLands < minLands || totalLands > maxLands) {
      rejectionReasons.push(`LAND_COUNT_OUT_OF_BOUNDS: ${totalLands} lands (Acceptable range: ${minLands}-${maxLands})`);
    }

    // 5. Causal Demand-Supply Hard Invariants (Zero Unpayable Hard Demands)
    const cardList = genome.toCardList();
    const mockDeckState = { cards: cardList };
    
    for (const entry of cardList) {
      if (!entry.isLand) {
        const demandAudit = DemandSupplyLedger.auditCardDemands(entry.card || entry, mockDeckState, intentPackage);
        if (!demandAudit.isSatisfied) {
          const unpayable = demandAudit.failureReasons.join('; ');
          rejectionReasons.push(`UNFULFILLED_HARD_DEMAND: "${entry.name}" demands unmet infrastructure: ${unpayable}`);
        }
      }
    }

    // 6. Proactive Threat Minimum (Non-empty proactive curve)
    const nonLandCount = genome.getTotalSpellCount();
    if (nonLandCount < (targetSize - maxLands)) {
      rejectionReasons.push(`INSUFFICIENT_SPELL_DENSITY: Genome only has ${nonLandCount} spells`);
    }

    // 7. Identity Firewall & Gameplan Causal Invariant Gate
    const activeGameplan = intentPackage?.gameplanContract;
    const isStrictTribe = intentPackage?.allowOffTribe === false && intentPackage?.primaryTribe && intentPackage.primaryTribe !== 'None';
    const primaryIdentity = (intentPackage?.primaryTribe || '').toLowerCase();

    for (const [oracleId, cardObj] of genome.cardIdentityMap.entries()) {
      const type = (cardObj?.type_line || cardObj?.type || '').toLowerCase();
      if (!type.includes('land')) {
        if (isStrictTribe && type.includes('creature')) {
          if (!IdentityFirewall.isMatchingTribe(cardObj, primaryIdentity)) {
            rejectionReasons.push(`STRICT_IDENTITY_LEAK: "${cardObj.name || oracleId}" is not a ${primaryIdentity}`);
          }
        }
        if (activeGameplan) {
          const contract = CardCausalContract.parse(cardObj);
          const gate = GameplanIntegrityGate.evaluateAdmissibility({
            cardContract: contract,
            gameplanContract: activeGameplan,
            intentPackage
          });
          if (!gate.isAdmissible) {
            rejectionReasons.push(`GAMEPLAN_CAUSAL_PARASITE: "${cardObj.name || oracleId}" has no causal path to gameplan`);
          }
        }
      }
    }

    const isViable = rejectionReasons.length === 0;

    return Object.freeze({
      isViable,
      rejectionReasons: Object.freeze(rejectionReasons),
      defectSummary: isViable ? null : rejectionReasons.join(' | ')
    });
  }
}
