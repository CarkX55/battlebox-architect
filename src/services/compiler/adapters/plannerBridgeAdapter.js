/**
 * src/services/compiler/adapters/plannerBridgeAdapter.js
 * 
 * PlannerBridgeAdapter: Adaptador de Puente para el Motor de Planificación Estratégica.
 * Conecta strategyReasoningEngine.js con el Strategic Kernel v11 sin modificar su código interno.
 */

import { generateAbstractStrategyPlan } from '../../strategyReasoningEngine.js';

export class PlannerBridgeAdapter {
  constructor() {
    this.id = 'PlannerBridgeAdapter';
    this.phase = 'Planner';
    this.requires = [];
    this.capabilities = {
      canRead: ['userIntent', 'config'],
      canWrite: ['goalGraph', 'capabilityGraph'],
      consumesEvents: [],
      producesEvents: ['GoalLocked', 'CapabilitySatisfied']
    };
  }

  async execute({ context, state, artifacts }) {
    context.log('info', `[PlannerBridgeAdapter] Generando plan abstracto para arquetipo: ${context.config.archetype}`);

    // Invocar el motor existente strategyReasoningEngine
    const strategyPlan = generateAbstractStrategyPlan({
      archetype: context.config.archetype,
      prompt: context.config.userPrompt,
      format: context.config.format
    });

    // Actualizar razonamiento en el estado de dominio
    state.mutate(st => {
      st.reasoningState.goalGraph = strategyPlan.strategyGraph;
      st.reasoningState.capabilityGraph = strategyPlan.requiredCapabilities;
      st.reasoningState.targetTurnExecution = strategyPlan.targetTurnExecution;
    });

    // Registrar hecho tipado y evidencia en artefactos
    if (artifacts) {
      artifacts.addFact(
        'TARGET_TURN_EXECUTION',
        strategyPlan.targetTurnExecution,
        4,
        0.95,
        'PlannerBridgeAdapter'
      );

      artifacts.addEvidence(
        'PlannerBridgeAdapter',
        { strategyGraph: strategyPlan.strategyGraph },
        [{ statement: `Plan estratégico generado con ${strategyPlan.strategyGraph.length} metas primarias.` }]
      );
    }

    // Emisión de eventos formales
    context.eventBus.emit('GoalLocked', {
      goalGraph: strategyPlan.strategyGraph,
      targetTurnExecution: strategyPlan.targetTurnExecution
    }, { producer: this.id });

    context.eventBus.emit('CapabilitySatisfied', {
      requiredCapabilities: strategyPlan.requiredCapabilities
    }, { producer: this.id });

    return {
      status: 'SUCCESS',
      goalsCount: strategyPlan.strategyGraph.length,
      targetTurnExecution: strategyPlan.targetTurnExecution
    };
  }
}
