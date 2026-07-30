/**
 * src/judge/capabilities/SemanticReplacer.js
 * Deferred Semantic Replacer. Resolves plan signatures to actual cards from DB/RAG pool at the very end.
 */

export class SemanticReplacer {
  constructor(cardDatabase = []) {
    this.cardDatabase = cardDatabase;
  }

  resolvePlanSwaps(executablePlan, strategicIR) {
    const adds = executablePlan.proposedSwaps?.adds || [];
    const removes = executablePlan.proposedSwaps?.removes || [];

    const resolvedAdds = [];
    const activeColors = strategicIR.requestedColors;

    adds.forEach(addReq => {
      if (addReq.name) {
        // Direct card name resolution
        resolvedAdds.push({ name: addReq.name, quantity: addReq.quantity || 1 });
      } else if (addReq.signature) {
        // Deferred signature resolution
        const sig = addReq.signature.toLowerCase();
        let matchCard = null;

        if (sig.includes('land')) {
          const colorToBasic = { W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest' };
          const targetColor = activeColors.find(c => sig.includes(c.toLowerCase())) || activeColors[0] || 'Island';
          matchCard = { name: colorToBasic[targetColor] || 'Island', quantity: addReq.quantity || 1 };
        } else if (sig.includes('interaction')) {
          matchCard = { name: activeColors.includes('R') ? 'Lightning Bolt' : (activeColors.includes('U') ? 'Counterspell' : 'Fatal Push'), quantity: addReq.quantity || 1 };
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
