/**
 * src/services/compiler/core/strategicStateCoordinator.js
 * 
 * StrategicStateCoordinator: Coordinador Único de Mutación e Invariantes del USS v21.2.
 * Evita el problema del "God Object" monolítico.
 * Regla de Oro:
 * - Los módulos (Simuladores, Optimizadores, Retrievers) LEEN el USS y PROPONEN cambios.
 * - SOLO el StrategicStateCoordinator APLICA y VALIDA las mutaciones inmutables sobre el USS.
 * - Mantiene el Historial Cronológico de Evolución (USS Timeline: Iteration 0 -> Iteration N).
 */

import { UnifiedStrategicState } from './unifiedStrategicState.js';

export class CausalEdge {
  constructor(target, weight = 1.0, condition = null) {
    this.target = target;
    this.weight = Math.min(1.0, Math.max(0.0, Number(weight)));
    this.condition = condition || null; // e.g. "OPPONENT_HAS_BLUE"
    Object.freeze(this);
  }
}

export class StrategicStateCoordinator {
  constructor(initialState = null) {
    this.currentState = initialState || new UnifiedStrategicState();
    this.timeline = [this.currentState]; // Timeline cronológico inmutable
  }

  /**
   * Obtiene la vista inmutable actual del UnifiedStrategicState
   */
  getState() {
    return this.currentState;
  }

  /**
   * Obtiene la línea temporal completa de evolución (Timeline)
   */
  getTimeline() {
    return Object.freeze([...this.timeline]);
  }

  /**
   * Aplica y valida una propuesta de mutación inmutable sobre el USS
   */
  applyMutationProposal(proposal = {}, rationale = '') {
    const previousState = this.currentState;

    // 1. Validar propuesta de actualización
    const updatedGraph = { ...previousState.capabilityKnowledgeGraph, ...(proposal.capabilityKnowledgeGraph || {}) };
    const updatedVector = proposal.strategyVector || previousState.strategyVector;
    const updatedInteraction = proposal.interactionGraph || previousState.interactionGraph;
    const updatedExecution = proposal.executionStatistics || previousState.executionStatistics;

    const newDecisionLog = [
      ...previousState.decisionLog,
      {
        pass: this.timeline.length,
        rationale: rationale || 'Actualización validada por StrategicStateCoordinator',
        timestamp: Date.now()
      }
    ];

    // 2. Construir el nuevo estado inmutable
    const newState = new UnifiedStrategicState({
      ...previousState,
      capabilityKnowledgeGraph: updatedGraph,
      strategyVector: updatedVector,
      interactionGraph: updatedInteraction,
      executionStatistics: updatedExecution,
      decisionLog: newDecisionLog,
      timestamp: Date.now()
    });

    // 3. Registrar en la línea temporal inmutable
    this.currentState = newState;
    this.timeline.push(newState);

    return Object.freeze({
      success: true,
      currentPass: this.timeline.length - 1,
      newState: this.currentState
    });
  }

  /**
   * Revierte el USS a una iteración anterior del Timeline (Instant Rollback)
   */
  rollbackToPass(targetPass = 0) {
    if (targetPass >= 0 && targetPass < this.timeline.length) {
      this.currentState = this.timeline[targetPass];
      return Object.freeze({ success: true, currentPass: targetPass, state: this.currentState });
    }
    return Object.freeze({ success: false, reason: 'Índice de paso inválido en el Timeline' });
  }
}
