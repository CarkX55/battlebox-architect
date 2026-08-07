/**
 * src/services/compiler/core/engineDependencyGraph.js
 * 
 * EngineDependencyGraph: Proyección Automática del WeightedCapabilityGraph v16.
 * CERO funciones hardcodeadas (NO existe buildMerfolkEngineGraph manual).
 * El DAG emerge automáticamente de la proyección de los contratos del Archetype DSL
 * y del WeightedCapabilityGraph, e incluye la validación de Dependency Density (densidad de dependencias).
 */

import { WeightedCapabilityGraph } from '../plugins/magic/weightedCapabilityGraph.js';

export class EngineDependencyGraph {
  /**
   * Proyecta el DAG de dependencias de motores automáticamente desde un Archetype DSL
   */
  static projectFromDSL(archetypeDSLInstance, weightedCapGraph = new WeightedCapabilityGraph()) {
    const dsl = archetypeDSLInstance.build ? archetypeDSLInstance.build() : archetypeDSLInstance;
    const reqs = dsl.requirements || [];

    const nodes = reqs.map((req, idx) => {
      const confidence = weightedCapGraph.getTransitionConfidence(
        reqs[idx - 1]?.capabilityId || req.capabilityId,
        req.capabilityId
      );

      return Object.freeze({
        id: `NODE_${req.capabilityId}`,
        capabilityId: req.capabilityId,
        minUnitsRequired: req.minQty || 4,
        dependencies: idx === 0 ? [] : [`NODE_${reqs[idx - 1].capabilityId}`],
        transitionConfidence: confidence
      });
    });

    return Object.freeze({
      archetype: dsl.archetype,
      projectedNodes: Object.freeze(nodes),
      supportsEngines: dsl.supports || []
    });
  }

  /**
   * Valida la Densidad de Dependencias (Dependency Density Validation)
   * Comprueba que la base de datos contenga candidatos suficientes para satisfacer las unidades requeridas
   */
  static validateDependencyDensity(projectedDAG = {}, candidatePool = []) {
    const unmetNodes = [];

    projectedDAG.projectedNodes.forEach(node => {
      const matchingCandidates = candidatePool.filter(c => 
        (c.capabilities || []).includes(node.capabilityId) || c.capability === node.capabilityId
      );
      const totalAvailable = matchingCandidates.reduce((sum, c) => sum + Number(c.quantity || c.count || 4), 0);

      if (totalAvailable < node.minUnitsRequired) {
        unmetNodes.push({
          nodeId: node.id,
          capabilityId: node.capabilityId,
          required: node.minUnitsRequired,
          available: totalAvailable
        });
      }
    });

    return Object.freeze({
      isDensitySatisfied: unmetNodes.length === 0,
      unmetNodes: Object.freeze(unmetNodes),
      totalNodesValidated: projectedDAG.projectedNodes.length
    });
  }
}
