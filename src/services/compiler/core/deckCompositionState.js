/**
 * src/services/compiler/core/deckCompositionState.js
 * 
 * DeckCompositionState: Universal Holistic System State Model v29.1.
 * Represents a complete 60-card design photograph evaluated through
 * causal proof, turn-by-turn executable win paths, empirical simulation,
 * and multi-dimensional Pareto dominance.
 */

import { DeckState } from './deckState.js';

export class DeckCompositionState {
  constructor({
    genome,
    intent,
    strategicThesis,
    executableWinPath,
    causalGraph = {},
    proofObligations = [],
    executionEvidence = null,
    redundancyGraph = {},
    recoveryProfile = {},
    adversarialProfile = {},
    opportunityCostProfile = {},
    experienceProfile = {},
    dominanceVector = {}
  }) {
    this.genome = genome;
    this.intent = intent;
    this.strategicThesis = strategicThesis;
    this.executableWinPath = executableWinPath;
    this.causalGraph = Object.freeze({ ...causalGraph });
    this.proofObligations = Object.freeze([...proofObligations]);
    this.executionEvidence = executionEvidence;
    this.redundancyGraph = Object.freeze({ ...redundancyGraph });
    this.recoveryProfile = Object.freeze({ ...recoveryProfile });
    this.adversarialProfile = Object.freeze({ ...adversarialProfile });
    this.opportunityCostProfile = Object.freeze({ ...opportunityCostProfile });
    this.experienceProfile = Object.freeze({ ...experienceProfile });
    this.dominanceVector = Object.freeze({ ...dominanceVector });

    Object.freeze(this);
  }

  /**
   * Converts the composition state into a runtime DeckState container.
   * @returns {DeckState}
   */
  toDeckState(vetoLedger = []) {
    const cardList = this.genome.toCardList();
    return new DeckState(cardList, {
      format: this.genome.format,
      archetype: this.strategicThesis?.archetypeKey || this.intent?.tempo || 'Aggro',
      timestamp: new Date().toISOString(),
      vetoLedger: vetoLedger
    });
  }

  /**
   * Returns the canonical genome hash for fast equivalence tests and deduplication.
   */
  get compositionHash() {
    return this.genome.compositionHash;
  }

  /**
   * Returns a structured summary for reporting and auditing.
   */
  toSummary() {
    return {
      compositionHash: this.genome.compositionHash,
      totalCards: this.genome.getTotalCardCount(),
      totalSpells: this.genome.getTotalSpellCount(),
      totalLands: this.genome.landState.totalLands,
      archetype: this.strategicThesis?.archetypeKey,
      executionFit: this.dominanceVector.executionFitScore || 0,
      opponentFit: this.dominanceVector.opponentFitScore || 0,
      experienceFit: this.dominanceVector.experienceFitScore || 0,
      winTurnDistribution: this.executionEvidence?.winPath?.winTurnDistribution || {},
      recoveryProbability: this.recoveryProfile.recoveryProbability || 0,
      dominanceStatus: this.dominanceVector.status || 'UNRANKED'
    };
  }
}
