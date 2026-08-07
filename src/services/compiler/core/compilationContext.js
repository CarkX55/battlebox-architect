/**
 * src/services/compiler/core/compilationContext.js
 * 
 * BattleBox Strategic Planning Framework v4.0 — Shared Immutable Context Core.
 * Invariant 6: CompilationContext is strictly immutable. Every pass produces a new snapshot.
 */

export class CompilationContext {
  constructor(state = {}) {
    this.intent = state.intent || null;
    this.strategyIR = state.strategyIR || null;
    this.constraintGraph = state.constraintGraph || null;
    this.capabilityOntology = state.capabilityOntology || null;
    this.cardIndex = state.cardIndex || null;
    this.evidenceStore = state.evidenceStore || new Map();
    this.uncertaintyModel = state.uncertaintyModel || { globalUncertainty: 0.0, nodeUncertainties: new Map() };
    this.pendingQueries = state.pendingQueries || [];
    this.answers = state.answers || new Map();
    this.candidateCache = state.candidateCache || new Map();
    this.unsatisfiedConstraints = state.unsatisfiedConstraints || [];
    this.globalScore = state.globalScore || 0;
    this.eventStore = Object.freeze(state.eventStore || []); // Immutable append-only stream
    this.telemetryLogs = Object.freeze(state.telemetryLogs || []);
    this.repairHistory = Object.freeze(state.repairHistory || []);
    this.finalDeck = state.finalDeck || null;
    this.isFinished = Boolean(state.isFinished);
    
    Object.freeze(this);
  }

  /**
   * Produces a new immutable snapshot with updated properties.
   */
  withState(changes = {}) {
    return new CompilationContext({
      intent: changes.intent !== undefined ? changes.intent : this.intent,
      strategyIR: changes.strategyIR !== undefined ? changes.strategyIR : this.strategyIR,
      constraintGraph: changes.constraintGraph !== undefined ? changes.constraintGraph : this.constraintGraph,
      capabilityOntology: changes.capabilityOntology !== undefined ? changes.capabilityOntology : this.capabilityOntology,
      cardIndex: changes.cardIndex !== undefined ? changes.cardIndex : this.cardIndex,
      evidenceStore: changes.evidenceStore !== undefined ? changes.evidenceStore : new Map(this.evidenceStore),
      uncertaintyModel: changes.uncertaintyModel !== undefined ? changes.uncertaintyModel : this.uncertaintyModel,
      pendingQueries: changes.pendingQueries !== undefined ? changes.pendingQueries : [...this.pendingQueries],
      answers: changes.answers !== undefined ? changes.answers : new Map(this.answers),
      candidateCache: changes.candidateCache !== undefined ? changes.candidateCache : new Map(this.candidateCache),
      unsatisfiedConstraints: changes.unsatisfiedConstraints !== undefined ? changes.unsatisfiedConstraints : [...this.unsatisfiedConstraints],
      globalScore: changes.globalScore !== undefined ? changes.globalScore : this.globalScore,
      eventStore: changes.eventStore !== undefined ? Object.freeze(changes.eventStore) : this.eventStore,
      telemetryLogs: changes.telemetryLogs !== undefined ? Object.freeze(changes.telemetryLogs) : this.telemetryLogs,
      repairHistory: changes.repairHistory !== undefined ? Object.freeze(changes.repairHistory) : this.repairHistory,
      finalDeck: changes.finalDeck !== undefined ? changes.finalDeck : this.finalDeck,
      isFinished: changes.isFinished !== undefined ? changes.isFinished : this.isFinished
    });
  }

  /**
   * Appends an immutable domain event to eventStore.
   */
  appendDomainEvent(event) {
    const newEvent = Object.freeze({
      id: `EVT_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      ...event
    });
    return this.withState({
      eventStore: Object.freeze([...this.eventStore, newEvent])
    });
  }

  /**
   * Appends an immutable telemetry log.
   */
  appendTelemetry(log) {
    const newLog = Object.freeze({
      timestamp: new Date().toISOString(),
      ...log
    });
    return this.withState({
      telemetryLogs: Object.freeze([...this.telemetryLogs, newLog])
    });
  }
}
