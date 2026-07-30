/**
 * CompilerState.js
 * Immutable SSA Context Object passed through Pure Compiler Passes.
 */

export class CompilerState {
  constructor({
    sessionId = `sess_${Date.now()}`,
    goal = {},
    strategyModel = null,
    planIR = null,
    capabilityDependencyGraph = null,
    capabilityRequirements = null,
    executionContracts = [],
    deck = [],
    simulationResult = null,
    decisionProof = null,
    hypothesisSet = null,
    metaFeedback = [],
    iterationHistory = null,
    iteration = 1,
    metadata = {}
  } = {}) {
    this.sessionId = sessionId;
    this.goal = Object.freeze({ ...goal });
    this.strategyModel = strategyModel;
    this.planIR = planIR;
    this.capabilityDependencyGraph = capabilityDependencyGraph;
    this.capabilityRequirements = capabilityRequirements;
    this.executionContracts = Object.freeze([...executionContracts]);
    this.deck = Object.freeze([...deck]);
    this.simulationResult = simulationResult;
    this.decisionProof = decisionProof;
    this.hypothesisSet = hypothesisSet;
    this.metaFeedback = Object.freeze([...metaFeedback]);
    this.iterationHistory = iterationHistory;
    this.iteration = iteration;
    this.metadata = Object.freeze({ ...metadata });

    Object.freeze(this);
  }

  transition(updates = {}) {
    return new CompilerState({
      sessionId: this.sessionId,
      goal: updates.goal || this.goal,
      strategyModel: updates.strategyModel !== undefined ? updates.strategyModel : this.strategyModel,
      planIR: updates.planIR !== undefined ? updates.planIR : this.planIR,
      capabilityDependencyGraph: updates.capabilityDependencyGraph !== undefined ? updates.capabilityDependencyGraph : this.capabilityDependencyGraph,
      capabilityRequirements: updates.capabilityRequirements !== undefined ? updates.capabilityRequirements : this.capabilityRequirements,
      executionContracts: updates.executionContracts || this.executionContracts,
      deck: updates.deck || this.deck,
      simulationResult: updates.simulationResult !== undefined ? updates.simulationResult : this.simulationResult,
      decisionProof: updates.decisionProof !== undefined ? updates.decisionProof : this.decisionProof,
      hypothesisSet: updates.hypothesisSet !== undefined ? updates.hypothesisSet : this.hypothesisSet,
      metaFeedback: updates.metaFeedback || this.metaFeedback,
      iterationHistory: updates.iterationHistory !== undefined ? updates.iterationHistory : this.iterationHistory,
      iteration: updates.iteration !== undefined ? updates.iteration : this.iteration,
      metadata: updates.metadata || this.metadata
    });
  }
}
