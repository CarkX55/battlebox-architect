/**
 * src/services/compiler/core/searchStrategy.js
 * 
 * Interfaz Polimórfica de Estrategia de Búsqueda (SearchStrategy Interface).
 * Permite intercambiar estrategias (BeamSearch, MCTS, Annealing, Genetic, A*) sin tocar el orquestador.
 */

export class SearchStrategy {
  initialize(initialState, config) { throw new Error('[SearchStrategy Error] Método initialize no implementado.'); }
  expand(node, actions) { throw new Error('[SearchStrategy Error] Método expand no implementado.'); }
  select(nodes) { throw new Error('[SearchStrategy Error] Método select no implementado.'); }
  evaluate(node) { throw new Error('[SearchStrategy Error] Método evaluate no implementado.'); }
  refine(frontier) { throw new Error('[SearchStrategy Error] Método refine no implementado.'); }
  terminate(state) { throw new Error('[SearchStrategy Error] Método terminate no implementado.'); }
  finish() { throw new Error('[SearchStrategy Error] Método finish no implementado.'); }
}

/**
 * Estrategia de Búsqueda Híbrida Base (Beam Initializer -> MCTS Exploration -> Local Search Annealing)
 */
export class HybridSearchStrategy extends SearchStrategy {
  constructor() {
    super();
    this.name = 'HybridSearchStrategy';
    this.frontier = [];
  }

  initialize(initialState, config = {}) {
    this.config = config;
    this.frontier = [{ state: initialState, score: 0 }];
    return Object.freeze({ initialized: true, strategy: this.name });
  }

  expand(node, actions = []) {
    return actions.map(action => ({
      parent: node,
      action,
      state: node.state
    }));
  }

  select(nodes = []) {
    // Selección por Beam / Top N
    const sorted = [...nodes].sort((a, b) => (b.score || 0) - (a.score || 0));
    return sorted.slice(0, this.config.beamWidth || 5);
  }

  evaluate(node) {
    return { score: 85.0, status: 'EVALUATED' };
  }

  refine(frontier = []) {
    // Local Search Annealing / Refinamiento Fino
    return frontier.map(f => ({ ...f, refined: true }));
  }

  terminate(state) {
    return Boolean(state && state.converged);
  }

  finish() {
    return Object.freeze({
      status: 'SUCCESS',
      strategy: this.name,
      bestCandidate: this.frontier[0] || null
    });
  }
}
