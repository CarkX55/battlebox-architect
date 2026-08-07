/**
 * src/services/compiler/strategicStateClass.js
 * 
 * StrategicState: Contenedor SSOT del Estado de Dominio.
 * Separa claramente:
 * - deckState: Estado persistente de slots de mazo (integrado con createDeckConstructionState).
 * - reasoningState: Grafo efímero de metas, capacidades, hipótesis y fronteras de Pareto.
 */

import { createDeckConstructionState } from '../../models/deckModels.js';

export class StrategicState {
  constructor(formData = {}) {
    this.version = 0;
    
    // SSOT Persistente de Slots
    this.deckState = createDeckConstructionState(formData);

    // Estado Efímero de Razonamiento
    this.reasoningState = {
      userIntent: null,
      goalGraph: null,
      capabilityGraph: null,
      hypotheses: {
        strategic: new Map(),
        meta: new Map(),
        simulation: new Map(),
        calibration: new Map()
      },
      decisionFrontier: new Map() // capabilityId -> ParetoFrontier
    };
  }

  /**
   * Mutación gobernada incrementando la versión del estado
   */
  mutate(mutationFn) {
    if (typeof mutationFn === 'function') {
      mutationFn(this);
      this.version++;
    }
    return this.version;
  }

  /**
   * Resetea únicamente el estado efímero de razonamiento manteniendo el deckState intacto
   */
  resetEphemeralReasoning() {
    this.reasoningState.userIntent = null;
    this.reasoningState.goalGraph = null;
    this.reasoningState.capabilityGraph = null;
    this.reasoningState.decisionFrontier.clear();
    this.version++;
  }
}
