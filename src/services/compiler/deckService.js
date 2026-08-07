/**
 * src/services/compiler/deckService.js
 * 
 * DeckService: Fachada de Mutación Gobernada (Write Facade).
 * Implementa la directiva de seguridad: Validate -> Apply -> Emit.
 * 
 * Flujo:
 * 1. Simula la mutación sobre un array prospectivo sin tocar el estado.
 * 2. Valida mediante InvariantEngine. Si existe violaciÃ³n CRITICAL (RULE o ARCHETYPE), aborta.
 * 3. Aplica la mutación limpia en state.deckState.slots y actualiza state.version.
 * 4. Emite el evento de auditoría en CompilerEventBus.
 */

import { InvariantEngine, loadStandardInvariants, INVARIANT_LEVEL } from './invariantEngine.js';

export class DeckService {
  constructor(strategicState, eventBus, invariantEngine = null) {
    if (!strategicState) {
      throw new Error('[DeckService Error] strategicState es requerido.');
    }
    this.state = strategicState;
    this.eventBus = eventBus;

    if (invariantEngine) {
      this.invariantEngine = invariantEngine;
    } else {
      this.invariantEngine = new InvariantEngine();
      loadStandardInvariants(this.invariantEngine);
    }
  }

  /**
   * Asigna una carta a un slot específico siguiendo el flujo Validate -> Apply -> Emit
   */
  bindCard(slotIndex, card, decisionId = null) {
    if (slotIndex < 0) {
      throw new Error(`[DeckService Error] slotIndex inválido: ${slotIndex}`);
    }

    const currentSlots = [...(this.state.deckState?.slots || [])];
    
    // 1. Simulación no destructiva en array prospectivo
    const prospectiveSlots = [...currentSlots];
    prospectiveSlots[slotIndex] = card;

    // 2. Validación PREVIA a la aplicación (Validate-Before-Apply)
    const violations = this.invariantEngine.validateSlots(prospectiveSlots, this.state);
    const blockingViolation = violations.find(
      v => v.level === INVARIANT_LEVEL.RULE || v.level === INVARIANT_LEVEL.ARCHETYPE
    );

    if (blockingViolation) {
      const errorMsg = `[DeckService PRE-VALIDATION ABORTED] ${blockingViolation.message}`;
      if (this.eventBus) {
        this.eventBus.emit('InvariantViolated', {
          slotIndex,
          card,
          violation: blockingViolation
        });
      }
      throw new Error(errorMsg);
    }

    // 3. Aplicación limpia en el estado
    const previousCard = currentSlots[slotIndex] || null;
    this.state.mutate(st => {
      st.deckState.slots[slotIndex] = card;
    });

    // 4. Emisión del evento de auditoría
    if (this.eventBus) {
      this.eventBus.emit('SlotBound', {
        slotIndex,
        card,
        decisionId,
        previousCard,
        warnings: violations.filter(v => v.level === INVARIANT_LEVEL.STYLE || v.level === INVARIANT_LEVEL.META)
      });
    }

    return true;
  }

  /**
   * Remueve la carta de un slot específico
   */
  removeCard(slotIndex) {
    if (slotIndex < 0) return false;
    const currentSlots = this.state.deckState?.slots || [];
    const previousCard = currentSlots[slotIndex] || null;

    this.state.mutate(st => {
      st.deckState.slots[slotIndex] = null;
    });

    if (this.eventBus) {
      this.eventBus.emit('SlotUnbound', { slotIndex, previousCard });
    }

    return true;
  }

  /**
   * Reemplaza todo el array de slots tras una validación completa de invariantes
   */
  setDeckSlots(newSlots = []) {
    const violations = this.invariantEngine.validateSlots(newSlots, this.state);
    const blockingViolation = violations.find(
      v => v.level === INVARIANT_LEVEL.RULE || v.level === INVARIANT_LEVEL.ARCHETYPE
    );

    if (blockingViolation) {
      throw new Error(`[DeckService setDeckSlots ABORTED] ${blockingViolation.message}`);
    }

    this.state.mutate(st => {
      st.deckState.slots = [...newSlots];
    });

    if (this.eventBus) {
      this.eventBus.emit('StateChanged', {
        type: 'SET_DECK_SLOTS',
        slotCount: newSlots.length
      });
    }

    return true;
  }
}
