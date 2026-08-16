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
  static buildInferenceChain(cardName = 'Core Threat', archetypeKey = 'Ramp') {
    const isRamp = String(archetypeKey).toLowerCase().includes('ramp');
    const isControl = String(archetypeKey).toLowerCase().includes('control');
    
    const resLabel = isRamp ? 'Mana Ramp & Threat Scaling' : isControl ? 'Counter / Removal Interaction' : 'Aggressive Tempo Deployment';
    const engLabel = isRamp ? 'High-Curve Threat Acceleration' : isControl ? 'Card Advantage & Board Control' : 'Early Pressure & Board State';
    const objLabel = `Execute ${archetypeKey} Strategy`;
    const winLabel = isRamp ? 'Overwhelming Big Mana Combat' : isControl ? 'Inevitable Late Game Lock' : 'Lethal Combat Damage';

    const inferenceChain = Object.freeze([
      { step: 1, type: 'CARD', label: cardName },
      { step: 2, type: 'RESOURCE', label: resLabel },
      { step: 3, type: 'ENGINE', label: engLabel },
      { step: 4, type: 'OBJECTIVE', label: objLabel },
      { step: 5, type: 'WIN_LINE', label: winLabel },
      { step: 6, type: 'MATCHUP_PRESSURE', label: 'Forces Opponent Premium Removal' }
    ]);

    const reasoningSummary = `Grafo de Inferencia Causal: ${cardName} ──► ${resLabel} ──► ${engLabel} ──► ${objLabel} ──► ${winLabel} ──► Fuerza Respuesta Enemiga.`;

    return {
      cardName,
      inferenceChain,
      reasoningSummary
    };
  }
}
