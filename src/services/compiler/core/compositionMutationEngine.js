/**
 * src/services/compiler/core/compositionMutationEngine.js
 * 
 * CompositionMutationEngine: Genetic Mutation Operators for DeckCompositionGenome v29.1.
 * Applies targeted mutations (Micro & Macro) to explore the adjacent Pareto frontier
 * while strictly maintaining 60-card exactness, color legality, and format copy limits.
 * 
 * Invariant: Fully deterministic via seeded PRNG.
 */

import { DeckCompositionGenome } from './deckCompositionGenome.js';
import { MinimumViableGenomeGate } from './minimumViableGenomeGate.js';
import { PRNG } from './prng.js';
import { IdentityFirewall } from './identityFirewall.js';
import { CardCausalContract } from './cardCausalContract.js';
import { GameplanIntegrityGate } from './gameplanIntegrityGate.js';

export class CompositionMutationEngine {
  /**
   * Generates a mutant cohort from a parent genome using deterministic seeded PRNG.
   * 
   * @param {DeckCompositionGenome} parentGenome 
   * @param {Array<Object>} candidatePool 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage 
   * @param {Object} options 
   * @returns {Array<DeckCompositionGenome>}
   */
  static generateCohort(parentGenome, candidatePool = [], intentPackage = {}, options = {}) {
    const cohortSize = Number(options.cohortSize || 6);
    const memory = options.memory;
    const prng = options.prng || new PRNG(472918);

    const cohort = [];
    const seenHashes = new Set();
    if (parentGenome?.compositionHash) {
      seenHashes.add(parentGenome.compositionHash);
    }

    const activeGameplan = intentPackage?.gameplanContract;
    const isStrictTribe = intentPackage?.allowOffTribe === false && intentPackage?.primaryTribe && intentPackage.primaryTribe !== 'None';
    const primaryIdentity = (intentPackage?.primaryTribe || '').toLowerCase();

    const eligiblePool = candidatePool.filter(c => {
      const type = (c.type_line || c.type || '').toLowerCase();
      if (type.includes('land')) return false;

      if (isStrictTribe && type.includes('creature')) {
        if (!IdentityFirewall.isMatchingTribe(c, primaryIdentity)) return false;
      }

      if (activeGameplan) {
        const contract = CardCausalContract.parse(c);
        const gate = GameplanIntegrityGate.evaluateAdmissibility({
          cardContract: contract,
          gameplanContract: activeGameplan,
          intentPackage
        });
        if (!gate.isAdmissible) return false;
      }

      return true;
    });

    const mutationOps = [
      'MICRO_REDUCE_COPIES_AND_DIVERSIFY',
      'MICRO_SWAP_SINGLE_CARD',
      'MACRO_REBALANCE_THREAT_VS_INTERACTION',
      'MACRO_SWAP_REDUNDANT_CREATURE_FOR_REACH',
      'MACRO_CURVE_OPTIMIZATION',
      'MICRO_AUGMENT_HIGH_IMPACT_CARD'
    ];

    let attempts = 0;
    const maxAttempts = cohortSize * 8;

    while (cohort.length < cohortSize && attempts < maxAttempts) {
      attempts++;
      const op = mutationOps[attempts % mutationOps.length];
      const mutant = this.applyMutation(parentGenome, op, eligiblePool, intentPackage, prng);

      if (!mutant) continue;

      const hash = mutant.computeGenomeHash();
      if (seenHashes.has(hash)) continue;
      if (memory && (memory.isDominated(hash) || memory.hasEvaluated(hash))) continue;

      // Gate check: only viable genomes enter the cohort
      const mvg = MinimumViableGenomeGate.validateGenome(mutant, intentPackage);
      if (mvg.isViable) {
        cohort.push(mutant);
        seenHashes.add(hash);
      }
    }

    return cohort;
  }

  /**
   * Applies a specific mutation operator to generate a new DeckCompositionGenome.
   * @private
   */
  static applyMutation(parentGenome, opType, candidatePool = [], intentPackage = {}, prng = new PRNG(472918)) {
    const mutant = parentGenome.clone();
    const spellEntries = Array.from(mutant.copiesByOracleId.entries());
    if (spellEntries.length === 0) return null;

    // Micro Operator 1: Reduce a 4x/3x card by 1 and allocate 1x of an alternative card
    if (opType === 'MICRO_REDUCE_COPIES_AND_DIVERSIFY') {
      const candidates4x = spellEntries.filter(([_, count]) => count >= 3);
      if (candidates4x.length === 0) return null;

      const [targetOracleId, currentCount] = candidates4x[Math.floor(prng.next() * candidates4x.length)];
      mutant.copiesByOracleId.set(targetOracleId, currentCount - 1);

      // Find another card in genome to bump, or inject a fresh alternative from candidatePool
      const candidatesToBump = spellEntries.filter(([id, count]) => id !== targetOracleId && count < 4);
      if (candidatesToBump.length > 0 && prng.next() < 0.6) {
        const [bumpId, bumpCount] = candidatesToBump[Math.floor(prng.next() * candidatesToBump.length)];
        mutant.copiesByOracleId.set(bumpId, bumpCount + 1);
      } else if (candidatePool.length > 0) {
        const freshCard = candidatePool[Math.floor(prng.next() * candidatePool.length)];
        const freshId = DeckCompositionGenome.getOracleId(freshCard);
        if (!mutant.copiesByOracleId.has(freshId)) {
          mutant.cardIdentityMap.set(freshId, freshCard);
          mutant.copiesByOracleId.set(freshId, 1);
          mutant.rolesByOracleId.set(freshId, freshCard.role || 'SUPPORT_REACH');
        } else {
          const existCount = mutant.copiesByOracleId.get(freshId) || 0;
          if (existCount < 4) {
            mutant.copiesByOracleId.set(freshId, existCount + 1);
          } else {
            return null;
          }
        }
      }
      return mutant;
    }

    // Micro Operator 2: Swap a single card (e.g. replace 2x card A with 2x card B)
    if (opType === 'MICRO_SWAP_SINGLE_CARD') {
      const randomEntry = spellEntries[Math.floor(prng.next() * spellEntries.length)];
      if (!randomEntry) return null;

      const [donorId, donorCount] = randomEntry;
      const unownedCandidates = candidatePool.filter(c => !mutant.copiesByOracleId.has(DeckCompositionGenome.getOracleId(c)));
      if (unownedCandidates.length === 0) return null;

      const newCard = unownedCandidates[Math.floor(prng.next() * unownedCandidates.length)];
      const newId = DeckCompositionGenome.getOracleId(newCard);

      mutant.copiesByOracleId.delete(donorId);
      mutant.cardIdentityMap.delete(donorId);
      mutant.rolesByOracleId.delete(donorId);

      mutant.cardIdentityMap.set(newId, newCard);
      mutant.copiesByOracleId.set(newId, donorCount);
      mutant.rolesByOracleId.set(newId, newCard.role || 'INTERACTION_SWAP');
      return mutant;
    }

    // Macro Operator 3: Rebalance Threat vs Interaction / Reach
    if (opType === 'MACRO_REBALANCE_THREAT_VS_INTERACTION' || opType === 'MACRO_SWAP_REDUNDANT_CREATURE_FOR_REACH') {
      // Find creature spells with count >= 4 and CMC >= 3
      const heavyCreatureEntries = spellEntries.filter(([id, count]) => {
        const cardObj = mutant.cardIdentityMap.get(id);
        const type = (cardObj?.type_line || cardObj?.type || '').toLowerCase();
        const cmc = Number(cardObj?.cmc || 0);
        return type.includes('creature') && count >= 3 && cmc >= 2;
      });

      if (heavyCreatureEntries.length === 0) return null;

      const [trimId, trimCount] = heavyCreatureEntries[0];
      const trimAmount = Math.min(2, trimCount - 1);
      if (trimAmount <= 0) return null;

      mutant.copiesByOracleId.set(trimId, trimCount - trimAmount);

      // Find burn / removal / interaction spells in pool
      const reachSpells = candidatePool.filter(c => {
        const text = (c.oracle_text || c.oracleText || c.text || '').toLowerCase();
        const type = (c.type_line || c.type || '').toLowerCase();
        return (type.includes('instant') || type.includes('sorcery') || text.includes('damage') || text.includes('destroy') || text.includes('exile'));
      });

      if (reachSpells.length > 0) {
        const reachCard = reachSpells[Math.floor(prng.next() * reachSpells.length)];
        const reachId = DeckCompositionGenome.getOracleId(reachCard);

        if (mutant.copiesByOracleId.has(reachId)) {
          const cur = mutant.copiesByOracleId.get(reachId);
          mutant.copiesByOracleId.set(reachId, Math.min(4, cur + trimAmount));
        } else {
          mutant.cardIdentityMap.set(reachId, reachCard);
          mutant.copiesByOracleId.set(reachId, trimAmount);
          mutant.rolesByOracleId.set(reachId, 'DIRECT_REACH_BURN');
        }
      }
      return mutant;
    }

    // Macro Operator 4: Curve Optimization (Trims high-CMC, adds low-CMC plays)
    if (opType === 'MACRO_CURVE_OPTIMIZATION') {
      const highCmcEntries = spellEntries.filter(([id, _]) => {
        const cardObj = mutant.cardIdentityMap.get(id);
        return Number(cardObj?.cmc || 0) >= 4;
      });

      if (highCmcEntries.length === 0) return null;

      const [highId, highCount] = highCmcEntries[0];
      mutant.copiesByOracleId.set(highId, Math.max(1, highCount - 1));

      const cheapDrops = candidatePool.filter(c => Number(c.cmc || 0) <= 2);
      if (cheapDrops.length > 0) {
        const drop = cheapDrops[Math.floor(prng.next() * cheapDrops.length)];
        const dropId = DeckCompositionGenome.getOracleId(drop);
        const cur = mutant.copiesByOracleId.get(dropId) || 0;
        if (cur < 4) {
          mutant.cardIdentityMap.set(dropId, drop);
          mutant.copiesByOracleId.set(dropId, cur + 1);
          mutant.rolesByOracleId.set(dropId, 'CURVE_SMOOTHER');
        }
      }
      return mutant;
    }

    return null;
  }
}
