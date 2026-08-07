/**
 * src/services/compiler/core/beamSearchStrategy.js
 * 
 * Implementación Limpia e Incremental de Búsqueda en Haz (BeamSearchStrategy).
 * Hereda de la interfaz polimórfica SearchStrategy.
 * Mantiene un haz acotado de los mejores N candidatos (beamWidth) para prevenir explosión combinatoria.
 */

import { SearchStrategy } from './searchStrategy.js';

export class BeamSearchStrategy extends SearchStrategy {
  constructor(options = {}) {
    super();
    this.name = 'BeamSearchStrategy';
    this.beamWidth = options.beamWidth || 8;
    this.maxDepth = options.maxDepth || 10;
    this.beam = [];
    this.nodesExplored = 0;
  }

  initialize(initialState, config = {}) {
    this.beamWidth = config.beamWidth || this.beamWidth;
    this.maxDepth = config.maxDepth || this.maxDepth;
    this.beam = [{ state: initialState, score: 0, depth: 0, path: [] }];
    this.nodesExplored = 1;
    return Object.freeze({ initialized: true, beamWidth: this.beamWidth, strategy: this.name });
  }

  expand(node, actions = []) {
    this.nodesExplored += actions.length;
    return actions.map(action => ({
      state: node.state,
      score: (node.score || 0) + (action.heuristicValue || 10),
      depth: (node.depth || 0) + 1,
      path: [...(node.path || []), action]
    }));
  }

  select(expandedNodes = []) {
    // Ordenar descendente por score y acotar al tamaño del haz (beamWidth)
    const sorted = [...expandedNodes].sort((a, b) => b.score - a.score);
    this.beam = sorted.slice(0, this.beamWidth);
    return this.beam;
  }

  evaluate(node) {
    const isComplete = (node.depth || 0) >= this.maxDepth;
    return {
      score: node.score || 0,
      isComplete,
      depth: node.depth
    };
  }

  refine(frontier = []) {
    return frontier.map(candidate => ({
      ...candidate,
      refinedScore: (candidate.score || 0) * 1.05
    }));
  }

  terminate(candidate) {
    return Boolean(candidate && candidate.depth >= this.maxDepth);
  }

  finish() {
    const bestCandidate = this.beam.sort((a, b) => b.score - a.score)[0] || null;
    return Object.freeze({
      status: 'SUCCESS',
      strategy: this.name,
      beamWidth: this.beamWidth,
      totalExploredNodes: this.nodesExplored,
      bestCandidate
    });
  }
}
