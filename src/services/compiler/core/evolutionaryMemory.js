/**
 * src/services/compiler/core/evolutionaryMemory.js
 * 
 * EvolutionaryMemory: Hall of Fame & Dominated Genome Cache v29.1.
 * Prevents the evolutionary search from revisiting discarded or dominated configurations
 * while maintaining the elite set across optimization epochs.
 */

export class EvolutionaryMemory {
  constructor({ maxEliteSize = 6 } = {}) {
    this.maxEliteSize = maxEliteSize;
    this.eliteSet = [];
    this.dominatedCache = new Map(); // Map<compositionHash, { reason, prunedAtEpoch }>
    this.evaluatedGenomes = new Set();
    this.mutationHistory = [];
  }

  /**
   * Checks if a genome hash has already been proven dominated or unviable.
   * @param {string} compositionHash 
   * @returns {boolean}
   */
  isDominated(compositionHash) {
    return this.dominatedCache.has(compositionHash);
  }

  /**
   * Checks if a genome hash was already evaluated in any epoch.
   * @param {string} compositionHash 
   * @returns {boolean}
   */
  hasEvaluated(compositionHash) {
    return this.evaluatedGenomes.has(compositionHash);
  }

  /**
   * Marks a genome hash as dominated/pruned to prevent re-evaluation.
   * @param {string} compositionHash 
   * @param {string} reason 
   * @param {number} epoch 
   */
  markDominated(compositionHash, reason = 'PARETO_DOMINATED', epoch = 1) {
    this.dominatedCache.set(compositionHash, { reason, prunedAtEpoch: epoch });
    this.evaluatedGenomes.add(compositionHash);
  }

  /**
   * Records a successfully evaluated genome in the memory.
   * @param {string} compositionHash 
   */
  recordEvaluation(compositionHash) {
    this.evaluatedGenomes.add(compositionHash);
  }

  /**
   * Adds or updates a state in the Elite Set / Hall of Fame.
   * Keeps only the top non-dominated states up to maxEliteSize.
   * @param {import('./deckCompositionState.js').DeckCompositionState} state 
   */
  addToElite(state) {
    if (!state || !state.genome) return;
    this.recordEvaluation(state.compositionHash);

    // Check if already in elite
    const existingIndex = this.eliteSet.findIndex(s => s.compositionHash === state.compositionHash);
    if (existingIndex !== -1) {
      this.eliteSet[existingIndex] = state;
      return;
    }

    this.eliteSet.push(state);
    
    // Sort elite by Pareto dominance rank or composite quality
    this.eliteSet.sort((a, b) => {
      const execA = a.dominanceVector?.executionFitScore || 0;
      const execB = b.dominanceVector?.executionFitScore || 0;
      return execB - execA;
    });

    if (this.eliteSet.length > this.maxEliteSize) {
      const removed = this.eliteSet.pop();
      if (removed) {
        this.markDominated(removed.compositionHash, 'DROPPED_FROM_ELITE');
      }
    }
  }

  /**
   * Retrieves the current active Elite Set states.
   * @returns {Array<import('./deckCompositionState.js').DeckCompositionState>}
   */
  getEliteStates() {
    return [...this.eliteSet];
  }

  /**
   * Records a mutation event for audit and explainability traces.
   */
  recordMutation({ epoch, mutationType, sourceHash, targetHash, outcome = 'PENDING' }) {
    this.mutationHistory.push({
      epoch,
      mutationType,
      sourceHash,
      targetHash,
      outcome,
      timestamp: new Date().toISOString()
    });
  }
}
