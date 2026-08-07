/**
 * src/services/compiler/plugins/magic/autoPluginLoader.js
 * 
 * AutoPluginLoader: Cargador Automático Dinámico de Plugins de MTG.
 * Descubre e inscribe evaluadores de cartas y críticos en sus registros correspondientes.
 */

import { CardIntelligenceRegistry } from './cardIntelligenceRegistry.js';
import { CriticRegistry } from './criticRegistry.js';

export class AutoPluginLoader {
  static loadAllPlugins(cardRegistry = null, criticRegistry = null) {
    console.log('🔌 [AutoPluginLoader] Descubriendo e inscribiendo plugins dinámicos de MTG...');

    const resolvedCardRegistry = cardRegistry || new CardIntelligenceRegistry();
    const resolvedCriticRegistry = criticRegistry || new CriticRegistry();

    // Inscripción de evaluadores dinámicos adicionales si fuera necesario
    resolvedCardRegistry.registerEvaluator('Living End', {
      evaluate: (deckSlots = []) => {
        const cheapSpells = deckSlots.filter(s => s && s.name !== 'Living End' && s.cmc > 0 && s.cmc <= 2 && !s.type_line?.toLowerCase().includes('land'));
        const count = cheapSpells.length;
        return {
          card: 'Living End',
          sound: count === 0,
          issue: count > 0 ? `Living End prohíbe hechizos de CMC 1 y 2 (${count} encontrados).` : null
        };
      }
    });

    return Object.freeze({
      cardRegistry: resolvedCardRegistry,
      criticRegistry: resolvedCriticRegistry,
      loadedCardsCount: resolvedCardRegistry.evaluators.size,
      loadedCriticsCount: resolvedCriticRegistry.critics.size
    });
  }
}
