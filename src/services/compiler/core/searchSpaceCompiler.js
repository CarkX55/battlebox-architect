/**
 * src/services/compiler/core/searchSpaceCompiler.js
 * 
 * SearchSpaceCompiler: Restricted Candidate Universe Compiler v1.0.
 * Constructs a restricted candidate search space pool strictly adhering to
 * DeckIdentity, ArchetypeDNA, mandatoryPackages, and primaryTribe BEFORE candidate scoring.
 */

import { IdentityFirewall } from './identityFirewall.js';
import { CardCausalContract } from './cardCausalContract.js';
import { GameplanIntegrityGate } from './gameplanIntegrityGate.js';

export class SearchSpaceCompiler {
  /**
   * Compiles a restricted candidate universe pool adhering 100% to identity hard constraints.
   * 
   * @param {Array<Object>} rawPool 
   * @param {import('./deckIdentityModel.js').DeckIdentity} deckIdentity 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage 
   * @returns {{ restrictedPool: Array<Object>, rejectedCount: number, rejectionLog: Array<Object> }}
   */
  static compileRestrictedPool(rawPool = [], deckIdentity, intentPackage, gameplanContract = null) {
    const activeGameplan = gameplanContract || intentPackage?.gameplanContract;
    const restrictedPool = [];
    const rejectionLog = [];

    for (const card of rawPool) {
      const validation = IdentityFirewall.validateCard(card, deckIdentity, intentPackage);
      if (!validation.isAllowed) {
        rejectionLog.push({
          cardName: card.name,
          reason: validation.vetoReason
        });
        continue;
      }

      const type = (card.type_line || card.type || '').toLowerCase();
      if (activeGameplan && !type.includes('land')) {
        const contract = CardCausalContract.parse(card);
        const gate = GameplanIntegrityGate.evaluateAdmissibility({
          cardContract: contract,
          gameplanContract: activeGameplan,
          intentPackage
        });
        if (!gate.isAdmissible) {
          rejectionLog.push({
            cardName: card.name,
            reason: gate.rejectionReason || 'GAMEPLAN_CAUSAL_PARASITE'
          });
          continue;
        }
      }

      restrictedPool.push(card);
    }

    return {
      restrictedPool: Object.freeze(restrictedPool),
      rejectedCount: rejectionLog.length,
      rejectionLog: Object.freeze(rejectionLog)
    };
  }
}
