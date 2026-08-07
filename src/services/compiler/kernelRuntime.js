/**
 * src/services/compiler/kernelRuntime.js
 * 
 * KernelRuntime: Orquestador Agnóstico de Ejecución (Runtime Engine).
 * NO conoce ningún módulo ni fase hardcodeada en su código.
 * Ejecuta el ExecutionGraph producido por ExecutionPlanner resolviendo eventos y auditorías.
 */

import { ExecutionPlanner } from './executionPlanner.js';

export class KernelRuntime {
  constructor(pluginRegistry) {
    if (!pluginRegistry) {
      throw new Error('[KernelRuntime Error] pluginRegistry es requerido.');
    }
    this.registry = pluginRegistry;
    this.planner = new ExecutionPlanner(pluginRegistry);
  }

  /**
   * Orquesta la ejecución agnóstica del Grafo de Ejecución sobre el ExecutionContext y StrategicState
   */
  async runCompilationPipeline(executionContext, strategicState, artifacts) {
    if (!executionContext || !strategicState) {
      throw new Error('[KernelRuntime Error] executionContext y strategicState son requeridos.');
    }

    const executionGraph = this.planner.computeExecutionGraph();
    executionContext.log('info', `Iniciando pipeline agnóstico con ${executionGraph.totalModules} módulos.`, { graphHash: executionGraph.graphHash });

    executionContext.eventBus.emit('PassStarted', { phase: 'PIPELINE_INIT', totalModules: executionGraph.totalModules });

    const results = [];

    for (const moduleInstance of executionGraph.executionSequence) {
      executionContext.log('info', `Ejecutando módulo: ${moduleInstance.id} (Fase: ${moduleInstance.phase})`);
      
      executionContext.eventBus.emit('PassStarted', {
        moduleId: moduleInstance.id,
        phase: moduleInstance.phase
      });

      const startTime = Date.now();
      let moduleResult = null;

      try {
        moduleResult = await moduleInstance.execute({
          context: executionContext,
          state: strategicState,
          artifacts
        });
      } catch (err) {
        executionContext.log('error', `Error ejecutando módulo ${moduleInstance.id}: ${err.message}`, { error: err.stack });
        executionContext.eventBus.emit('InvariantViolated', {
          moduleId: moduleInstance.id,
          error: err.message
        });
        throw err;
      }

      const durationMs = Date.now() - startTime;

      executionContext.eventBus.emit('PassFinished', {
        moduleId: moduleInstance.id,
        phase: moduleInstance.phase,
        durationMs
      });

      results.push({
        moduleId: moduleInstance.id,
        phase: moduleInstance.phase,
        durationMs,
        result: moduleResult
      });
    }

    executionContext.eventBus.emit('CompilationFinished', {
      status: 'SUCCESS',
      totalModules: executionGraph.totalModules,
      compilationId: executionContext.compilationId
    });

    return {
      status: 'SUCCESS',
      compilationId: executionContext.compilationId,
      version: strategicState.version,
      executedModules: results
    };
  }
}
