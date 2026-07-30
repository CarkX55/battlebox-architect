/**
 * src/judge/capabilities/SemanticReplacer.js
 * Deferred Semantic Replacer for BattleBox Architect v7.
 * Resolves capability contract signatures to verified cards using CapabilityValidator.
 */

import { validateCapability } from './CapabilityValidator.js';

export class SemanticReplacer {
  constructor(cardDatabase = []) {
    this.cardDatabase = cardDatabase;
  }

  resolvePlanSwaps(executablePlan, strategicIR) {
    const adds = executablePlan.proposedSwaps?.adds || [];
    const removes = executablePlan.proposedSwaps?.removes || [];

    const resolvedAdds = [];
    const activeColors = strategicIR?.requestedColors || ['W', 'U'];

    adds.forEach(addReq => {
      if (addReq.name) {
        // Direct card name resolution with capability check
        const validation = validateCapability(addReq, addReq.contract || {});
        if (validation.valid) {
          resolvedAdds.push({ name: addReq.name, quantity: addReq.quantity || 1 });
        }
      } else if (addReq.signature) {
        // Signature resolution
        const sig = addReq.signature.toLowerCase();
        let matchCard = null;

        if (sig.includes('land') || sig.includes('manastability')) {
          const colorToBasic = { W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest' };
          const targetColor = activeColors.find(c => sig.includes(c.toLowerCase())) || activeColors[0] || 'Island';
          matchCard = { name: colorToBasic[targetColor] || 'Island', quantity: addReq.quantity || 1 };
        } else if (sig.includes('interaction')) {
          matchCard = { name: activeColors.includes('U') ? 'Counterspell' : (activeColors.includes('W') ? 'Swords to Plowshares' : 'Fatal Push'), quantity: addReq.quantity || 1 };
        } else if (sig.includes('earlydefender')) {
          matchCard = { name: 'Wall of Omens', quantity: addReq.quantity || 4 };
        } else if (sig.includes('defenderpayoff')) {
          matchCard = { name: 'High Alert', quantity: addReq.quantity || 3 };
        }

        if (matchCard) {
          resolvedAdds.push(matchCard);
        }
      }
    });

    return Object.freeze({
      removes: Object.freeze([...removes]),
      adds: Object.freeze([...resolvedAdds])
    });
  }
}
