/**
 * src/services/compiler/executionPlanner.js
 * 
 * ExecutionPlanner: Planificador de Grafo de Ejecución.
 * Desacopla la ordenación del DAG del KernelRuntime.
 * Calcula el ExecutionGraph resolviendo dependencias de módulos y habilitando ejecución paralela.
 */

export class ExecutionPlanner {
  constructor(pluginRegistry) {
    if (!pluginRegistry) {
      throw new Error('[ExecutionPlanner Error] pluginRegistry es requerido.');
    }
    this.registry = pluginRegistry;
  }

  /**
   * Genera el ExecutionGraph topológicamente ordenado
   */
  computeExecutionGraph() {
    const sortedModules = this.registry.getTopologicalExecutionOrder();
    
    return {
      totalModules: sortedModules.length,
      executionSequence: sortedModules,
      graphHash: `DAG_${Date.now()}_${sortedModules.map(m => m.id).join('_')}`
    };
  }
}
