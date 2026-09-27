/**
 * src/services/compiler/core/deckExpansion.js
 * 
 * DeckExpansion: Expansión Física Determinista a 60 Slots v22.0.
 * Regla de Invariante Absoluta:
 * DeckExpansion NUNCA decide ni modifica las copias. Simplemente materializa los CapabilityPackages en la lista final.
 */

import { DeckState } from './deckState.js';

export class DeckExpansion {
  /**
   * Pure deterministic expansion function.
   * Signature: expand(copyAllocationState) => DeckState
   * 
   * Absolute Invariant:
   * ZERO DB access, ZERO options, ZERO in-place array mutations (splice, quantity +=).
   * 
   * @param {import('./copyAllocationManager.js').CopyAllocationState} copyAllocationState
   * @returns {DeckState}
   */
  static expand(copyAllocationState) {
    if (!copyAllocationState || !Array.isArray(copyAllocationState.packages)) {
      return new DeckState([]);
    }

    const cardMap = new Map();

    const format = copyAllocationState.mode || 'MODERN';

    for (const pkg of copyAllocationState.packages) {
      const cardName = pkg.winnerCard || `[Pending: ${pkg.role}]`;
      const copies = Number(pkg.copies || pkg.allocatedDensity || 1);
      const cardObj = pkg.winnerCardObj || {};

      // If the package is a composite land bundle (contains ' // '), decompose into individual legal lands
      if (pkg.role === 'Land' && cardName.includes(' // ')) {
        const decomposedLands = DeckExpansion._decomposeLandBundle(cardName, copies, format);
        for (const land of decomposedLands) {
          const existing = cardMap.get(land.name);
          if (existing) {
            existing.quantity += land.quantity;
          } else {
            cardMap.set(land.name, {
              name: land.name,
              quantity: land.quantity,
              role: 'Land',
              packagePriority: pkg.priority,
              lockLevel: pkg.lockLevel,
              mana_cost: '',
              mana_value: 0,
              cmc: 0,
              colors: [],
              color_identity: [],
              type_line: land.type_line || 'Land',
              oracle_text: '',
              rarity: land.type_line?.includes('Basic') ? 'common' : 'rare',
              legalities: {},
              image_uris: null,
              cardObj: { name: land.name, type_line: land.type_line || 'Land' }
            });
          }
        }
        continue;
      }

      const existing = cardMap.get(cardName);
      if (existing) {
        existing.quantity += copies;
      } else {
        cardMap.set(cardName, {
          name: cardName,
          quantity: copies,
          role: pkg.role,
          packagePriority: pkg.priority,
          lockLevel: pkg.lockLevel,
          mana_cost: cardObj.mana_cost || cardObj.manaCost || '',
          mana_value: cardObj.mana_value || cardObj.cmc || 0,
          cmc: cardObj.cmc || cardObj.mana_value || 0,
          colors: cardObj.colors || [],
          color_identity: cardObj.color_identity || cardObj.colorIdentity || [],
          type_line: cardObj.type_line || cardObj.typeLine || '',
          oracle_text: cardObj.oracle_text || cardObj.oracleText || '',
          rarity: cardObj.rarity || 'common',
          legalities: cardObj.legalities || {},
          image_uris: cardObj.image_uris || null,
          cardObj: cardObj
        });
      }
    }

    const deckCards = Array.from(cardMap.values());
    return new DeckState(deckCards, {
      expandedAt: new Date().toISOString(),
      sourceMode: copyAllocationState.mode
    });
  }

  /**
   * Decomposes a composite land bundle string (e.g. "Botanical Sanctum // Yavimaya Coast // Forest // Island")
   * into individual legal card objects respecting the 4-copy rule for non-basics.
   * 
   * @param {string} bundleName 
   * @param {number} totalLandCopies 
   * @param {string} format 
   * @returns {Array<{name: string, quantity: number, type_line: string}>}
   */
  static _decomposeLandBundle(bundleName, totalLandCopies, format = 'MODERN') {
    const isSingleton = format === 'COMMANDER';
    const landNames = bundleName.split(' // ').map(s => s.trim()).filter(Boolean);
    if (landNames.length <= 1) {
      return [{ name: bundleName, quantity: totalLandCopies, type_line: 'Land' }];
    }

    const BASICS = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes', 'Snow-Covered Plains', 'Snow-Covered Island', 'Snow-Covered Swamp', 'Snow-Covered Mountain', 'Snow-Covered Forest']);
    const nonBasics = landNames.filter(n => !BASICS.has(n));
    const basics = landNames.filter(n => BASICS.has(n));

    const result = [];
    let remainingLands = totalLandCopies;

    if (isSingleton) {
      nonBasics.forEach(name => {
        if (remainingLands > 0) {
          result.push({ name, quantity: 1, type_line: 'Land' });
          remainingLands -= 1;
        }
      });
    } else {
      // Constructed (Pioneer, Modern, Standard, Legacy, etc.):
      // Cap non-basics at max 4 copies (2 copies for surveil/triomes if many non-basics)
      nonBasics.forEach((name, idx) => {
        let copiesToAssign = 4;
        if (nonBasics.length >= 3 && idx >= 2) {
          copiesToAssign = 2;
        }
        copiesToAssign = Math.min(copiesToAssign, Math.max(1, remainingLands - (basics.length || 1)));
        if (remainingLands > 0 && copiesToAssign > 0) {
          result.push({ name, quantity: copiesToAssign, type_line: 'Land' });
          remainingLands -= copiesToAssign;
        }
      });
    }

    // Distribute remaining land count across basic lands
    if (basics.length > 0 && remainingLands > 0) {
      const perBasic = Math.floor(remainingLands / basics.length);
      let remainder = remainingLands % basics.length;

      basics.forEach((bName, i) => {
        const qty = perBasic + (i < remainder ? 1 : 0);
        if (qty > 0) {
          result.push({ name: bName, quantity: qty, type_line: `Basic Land — ${bName}` });
        }
      });
    } else if (remainingLands > 0) {
      if (result.length > 0) {
        result[result.length - 1].quantity += remainingLands;
      }
    }

    return result;
  }

  /**
   * Transforma una lista de CapabilityPackages en la lista física de cartas sin alterar copias
   */
  static expandPackagesToDeck(packages = []) {
    return DeckExpansion.expand({ packages }).cards;
  }
}
