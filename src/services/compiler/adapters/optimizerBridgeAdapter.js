/**
 * src/services/compiler/adapters/optimizerBridgeAdapter.js
 * 
 * OptimizerBridgeAdapter: Adaptador de Puente para el Motor de Optimización y Balanceo de Maná.
 * Conecta deckOptimizerService.js con el Strategic Kernel v11 sin modificar su código interno.
 */

import { corregirTamañoYBaseDeMana } from '../../deckOptimizerService.js';
import { DeckService } from '../deckService.js';

export class OptimizerBridgeAdapter {
  constructor() {
    this.id = 'OptimizerBridgeAdapter';
    this.phase = 'Optimizer';
    this.requires = ['SimulatorBridgeAdapter'];
    this.capabilities = {
      canRead: ['deckState', 'judgeResults', 'simulationResults'],
      canWrite: ['deckState'],
      consumesEvents: ['SimulationCompleted'],
      producesEvents: ['OptimizationAccepted']
    };
  }

  async execute({ context, state, artifacts }) {
    context.log('info', `[OptimizerBridgeAdapter] Balanceando base de tierras y tamaño de mazo.`);

    const deckCards = (state.deckState?.slots || []).filter(Boolean);
    const targetSize = context.config.deckSize || 60;

    const formData = {
      colores: context.config.colors,
      arquetipo: context.config.archetype,
      formato: context.config.format
    };

    // Invocar la optimización de maná y balance de slots
    const correctedCards = await corregirTamañoYBaseDeMana(deckCards, targetSize, formData, [], false);

    // Actualizar slots usando DeckService (Validate-Before-Apply)
    const deckService = new DeckService(state, context.eventBus);
    
    // Expandir cartas corregidas a slots
    const newSlots = [];
    correctedCards.forEach(c => {
      const qty = Number(c.quantity || c.count || 1);
      for (let i = 0; i < qty; i++) {
        newSlots.push({ ...c, quantity: 1 });
      }
    });

    // Rellenar hasta targetSize si es necesario
    while (newSlots.length < targetSize) {
      newSlots.push({ name: 'Forest', type_line: 'Basic Land — Forest', isBasicLand: true, quantity: 1 });
    }

    deckService.setDeckSlots(newSlots.slice(0, targetSize));

    if (artifacts) {
      artifacts.setMetric('OptimizedDeckSize', newSlots.length, 'cards');

      artifacts.addEvidence(
        'OptimizerBridgeAdapter',
        { finalSize: newSlots.length },
        [{ statement: `Mazo optimizado y balanceado exactamente a ${newSlots.length} cartas.` }]
      );
    }

    context.eventBus.emit('OptimizationAccepted', {
      finalSize: newSlots.length,
      isBalanced: newSlots.length === targetSize
    }, { producer: this.id });

    return {
      status: 'SUCCESS',
      finalSize: newSlots.length,
      isBalanced: newSlots.length === targetSize
    };
  }
}
