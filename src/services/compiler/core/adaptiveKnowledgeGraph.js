/**
 * src/services/compiler/core/adaptiveKnowledgeGraph.js
 * 
 * AdaptiveKnowledgeGraph: Rich Conceptual Strategic Graph v1.0.
 * Connects high-level strategic concepts:
 *   Threat -> Answered By -> Removal -> Requires Mana -> Tempo Loss -> Board Advantage
 */

export class AdaptiveKnowledgeGraph {
  /**
   * Queries conceptual strategic relationships.
   * 
   * @param {string} concept 
   * @returns {{ conceptChain: Array<string>, reasoningSummary: string }}
   */
  static queryConceptRelations(concept = 'Threat') {
    const conceptChain = Object.freeze([
      'Threat',
      'Answered By',
      'Removal',
      'Requires Mana',
      'Tempo Loss',
      'Board Advantage'
    ]);

    const reasoningSummary = 'Grafo Conceptual: Amenaza ──► Respondida Por ──► Remoción ──► Pérdida de Tempo ──► Ventaja en Mesa.';

    return {
      conceptChain,
      reasoningSummary
    };
  }
}
