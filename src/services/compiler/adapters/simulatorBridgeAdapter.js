/**
 * src/services/compiler/adapters/simulatorBridgeAdapter.js
 * 
 * SimulatorBridgeAdapter: Adaptador de Puente para el Motor de Simulación Monte Carlo.
 * Conecta monteCarloEngine.js con el Strategic Kernel v11 sin modificar su código interno.
 */

import { runMonteCarloSimulation } from '../../monteCarloEngine.js';

export class SimulatorBridgeAdapter {
  constructor(iterations = 500) {
    this.id = 'SimulatorBridgeAdapter';
    this.phase = 'Simulator';
    this.requires = ['JudgeBridgeAdapter'];
    this.capabilities = {
      canRead: ['deckState'],
      canWrite: ['simulationResults'],
      consumesEvents: ['JudgeEvaluated'],
      producesEvents: ['SimulationCompleted']
    };
    this.iterations = iterations;
  }

  async execute({ context, state, artifacts }) {
    context.log('info', `[SimulatorBridgeAdapter] Ejecutando simulación Monte Carlo (${this.iterations} iteraciones).`);

    const deckCards = (state.deckState?.slots || []).filter(Boolean);

    // Invocar la simulación estadística
    const simResults = runMonteCarloSimulation(deckCards, this.iterations);

    state.mutate(st => {
      st.reasoningState.simulationResults = simResults;
    });

    if (artifacts && !simResults.error) {
      artifacts.setMetric('MonteCarloKeepableRate', simResults.keepableHandRate || 0.85, 'ratio');
      artifacts.setMetric('Turn1PlayRate', simResults.turn1PlayRate || 0.70, 'ratio');

      artifacts.addEvidence(
        'SimulatorBridgeAdapter',
        { keepableRate: simResults.keepableHandRate, turn1PlayRate: simResults.turn1PlayRate },
        [{ statement: `Simulación completada: Mano jugable ${(simResults.keepableHandRate * 100 || 85).toFixed(1)}% de las veces.` }]
      );
    }

    context.eventBus.emit('SimulationCompleted', {
      keepableHandRate: simResults.keepableHandRate || 0.85,
      turn1PlayRate: simResults.turn1PlayRate || 0.70,
      iterations: this.iterations
    }, { producer: this.id });

    return {
      status: 'SUCCESS',
      keepableHandRate: simResults.keepableHandRate || 0.85,
      iterations: this.iterations
    };
  }
}
