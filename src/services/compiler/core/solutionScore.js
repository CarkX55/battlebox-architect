/**
 * src/services/compiler/core/solutionScore.js
 * 
 * SolutionScore & ObjectiveScore Component Model v1.0.
 * Retains detailed individual evaluation components instead of collapsing into a single lossy scalar.
 */

export class SolutionScore {
  constructor({
    strategy = 100,
    curve = 100,
    tempo = 100,
    interaction = 100,
    mana = 100,
    redundancy = 100,
    consistency = 100,
    synergy = 100
  } = {}) {
    this.strategy = Number(strategy);
    this.curve = Number(curve);
    this.tempo = Number(tempo);
    this.interaction = Number(interaction);
    this.mana = Number(mana);
    this.redundancy = Number(redundancy);
    this.consistency = Number(consistency);
    this.synergy = Number(synergy);

    Object.freeze(this);
  }

  get totalObjectiveScore() {
    const score = (this.strategy * 0.30) +
                  (this.curve * 0.15) +
                  (this.tempo * 0.15) +
                  (this.interaction * 0.15) +
                  (this.consistency * 0.15) +
                  (this.synergy * 0.10);
    return Math.round(score * 100) / 100;
  }

  toJSON() {
    return {
      totalObjectiveScore: this.totalObjectiveScore,
      components: {
        strategy: this.strategy,
        curve: this.curve,
        tempo: this.tempo,
        interaction: this.interaction,
        mana: this.mana,
        redundancy: this.redundancy,
        consistency: this.consistency,
        synergy: this.synergy
      }
    };
  }
}
