/**
 * src/services/compiler/plugins/magic/cardIntelligenceRegistry.js
 * 
 * CardIntelligenceRegistry: Registro Plugeable de Evaluadores de Cartas Estructurales de MTG.
 * Añadir soporte para una carta compleja nueva implica simplemente registrar un plugin nuevo,
 * sin modificar una sola línea del núcleo del compilador.
 */

export class CardIntelligenceRegistry {
  constructor() {
    this.evaluators = new Map(); // cardName -> PluginEvaluator
    this.registerStandardPlugins();
  }

  registerEvaluator(cardName, evaluatorModule) {
    if (!cardName || !evaluatorModule || typeof evaluatorModule.evaluate !== 'function') {
      throw new Error(`[CardIntelligenceRegistry Error] Evaluador inválido para ${cardName}`);
    }
    this.evaluators.set(cardName.toLowerCase().trim(), Object.freeze(evaluatorModule));
  }

  registerStandardPlugins() {
    // 1. Plugin Evaluador de Collected Company
    this.registerEvaluator('Collected Company', {
      evaluate: (deckSlots = []) => {
        const valid = deckSlots.filter(s => s && s.cmc <= 3 && s.type_line?.toLowerCase().includes('creature'));
        const count = valid.reduce((sum, s) => sum + Number(s.quantity || s.count || 1), 0);
        const hitRate = count >= 28 ? 0.94 : (count >= 24 ? 0.86 : 0.72);
        return {
          card: 'Collected Company',
          sound: count >= 26,
          hitRate,
          expectedManaValue: Math.round(hitRate * 5.8 * 10) / 10,
          issue: count < 26 ? `Insuficientes objetivos de CMC <= 3 para CoCo (${count} encontrados, 26 requeridos).` : null
        };
      }
    });

    // 2. Plugin Evaluador de Chord of Calling
    this.registerEvaluator('Chord of Calling', {
      evaluate: (deckSlots = []) => {
        const valid = deckSlots.filter(s => s && s.type_line?.toLowerCase().includes('creature'));
        const count = valid.reduce((sum, s) => sum + Number(s.quantity || s.count || 1), 0);
        return {
          card: 'Chord of Calling',
          sound: count >= 22,
          convokeSupport: count >= 22 ? 'HIGH' : 'LOW',
          issue: count < 22 ? `Insuficientes criaturas en el mazo para convocar Chord (${count} encontradas).` : null
        };
      }
    });
  }

  evaluateDeckCards(deckSlots = []) {
    const evaluationResults = [];
    for (const card of deckSlots) {
      if (!card || !card.name) continue;
      const plugin = this.evaluators.get(card.name.toLowerCase().trim());
      if (plugin) {
        evaluationResults.push(plugin.evaluate(deckSlots));
      }
    }
    return evaluationResults;
  }
}
