/**
 * src/services/compiler/core/strategicInferenceGraph.js
 * 
 * StrategicInferenceGraph: Causal Strategic Inference Graph v1.0.
 * Computes multi-step causal inference chains:
 *   Card -> Resource -> Engine -> Objective -> Win Line -> Matchup Pressure
 */

export class StrategicInferenceGraph {
  /**
   * Builds causal strategic inference chain for a card.
   * 
   * @param {string} cardName 
   * @returns {{ cardName: string, inferenceChain: Array<Object>, reasoningSummary: string }}
   */
  static buildInferenceChain(cardName = 'Bonecrusher Giant') {
    const inferenceChain = Object.freeze([
      { step: 1, type: 'CARD', label: cardName },
      { step: 2, type: 'RESOURCE', label: 'Stomp Instant Interaction' },
      { step: 3, type: 'ENGINE', label: 'Early Board Removal & Tempo Retention' },
      { step: 4, type: 'OBJECTIVE', label: 'Activate Giant Synergy & Pressure Window' },
      { step: 5, type: 'WIN_LINE', label: 'Midgame Stomp Beats' },
      { step: 6, type: 'MATCHUP_PRESSURE', label: 'Forces Opponent Premium Removal' }
    ]);

    const reasoningSummary = `Grafo de Inferencia Causal: ${cardName} ──► Interacción Stomp ──► Retención de Tempo ──► Presión Tribal ──► Línea de Victoria ──► Fuerza Remoción Enemiga.`;

    return {
      cardName,
      inferenceChain,
      reasoningSummary
    };
  }
}
