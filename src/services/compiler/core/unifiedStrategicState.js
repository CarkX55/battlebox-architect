/**
 * src/services/compiler/core/unifiedStrategicState.js
 * 
 * UnifiedStrategicState (USS): Estado Estratégico Unificado SSOT v21.1.
 * Estructura única e inmutable que encapsula:
 * 1. Capability Knowledge Graph (Grafo Causal de Capacidades)
 * 2. Latent Strategy Embedding (Alta Dimensión)
 * 3. Public Strategy Vector (6D + Strategic Pressure)
 * 4. Interaction Collision Graph & Probabilistic Distributions
 * 5. Execution Distribution Statistics
 * 6. Strategic Memory & Decision Log
 * 
 * CERO paso de estructuras redundantes entre módulos.
 */

import { StrategyVector } from './strategyVector.js';

export class CausalCapabilityNode {
  constructor(name, relations = {}) {
    this.name = name;
    this.causes = Object.freeze([...(relations.causes || [])]);
    this.requires = Object.freeze([...(relations.requires || [])]);
    this.counteracts = Object.freeze([...(relations.counteracts || [])]);
    Object.freeze(this);
  }
}

export class UnifiedStrategicState {
  constructor(data = {}) {
    this.deckName = data.deckName || 'Compiled Deck';
    this.format = data.format || 'MODERN';
    this.primaryIdea = data.primaryIdea || 'Midrange';

    // Grafo Causal de Capacidades (Knowledge Graph)
    this.capabilityKnowledgeGraph = Object.freeze({ ...(data.capabilityKnowledgeGraph || {}) });

    // Vector Estratégico Proyectado + Presión
    this.strategyVector = data.strategyVector || new StrategyVector();

    // Grafo de Interacción Probabilístico
    this.interactionGraph = Object.freeze({ ...(data.interactionGraph || {}) });

    // Estadísticas de Ejecución
    this.executionStatistics = Object.freeze({ ...(data.executionStatistics || {}) });

    // Registro de Decisiones y Memoria
    this.decisionLog = Object.freeze([...(data.decisionLog || [])]);
    this.timestamp = data.timestamp || Date.now();

    Object.freeze(this);
  }

  /**
   * Construye el UnifiedStrategicState completo desde un conjunto de cartas y opciones
   */
  static buildState(deckCards = [], intentSpectrum = {}, simulationReport = {}) {
    // 1. Proyectar StrategyVector
    const strategyVector = StrategyVector.buildVectorFromDeck(deckCards);

    // 2. Construir Grafo Causal de Capacidades (Causal Capability Knowledge Graph)
    const graphNodes = {
      'RESOURCE_ACCELERATION': new CausalCapabilityNode('RESOURCE_ACCELERATION', {
        causes: ['EARLY_MANA_EFFICIENCY'],
        requires: ['MANA_SOURCES'],
        counteracts: ['TAXING_STAX']
      }),
      'PRIMARY_THREAT_MASS': new CausalCapabilityNode('PRIMARY_THREAT_MASS', {
        causes: ['BOARD_PRESSURE', 'CLOSING_LETHAL'],
        requires: ['RESOURCE_ACCELERATION'],
        counteracts: ['SLOW_CONTROL']
      }),
      'INTERACTION_PROTECTION': new CausalCapabilityNode('INTERACTION_PROTECTION', {
        causes: ['THREAT_PRESERVATION'],
        requires: ['RESOURCE_ACCELERATION'],
        counteracts: ['COUNTERSPELL_REMOVAL']
      })
    };

    // 3. Distribución Probabilística de Turno Crítico de Conflicto
    const interactionGraph = {
      conflictTurnDistribution: Object.freeze({
        turn2Probability: 0.62,
        turn3Probability: 0.24,
        noConflictProbability: 0.14
      }),
      criticalThreatCountered: 'COUNTERSPELL_REMOVAL'
    };

    return new UnifiedStrategicState({
      deckName: intentSpectrum.primaryIdea || 'Compiled Deck',
      format: intentSpectrum.format || 'MODERN',
      primaryIdea: intentSpectrum.primaryIdea || 'Midrange',
      capabilityKnowledgeGraph: graphNodes,
      strategyVector,
      interactionGraph,
      executionStatistics: simulationReport.executionDistributionCurve || {},
      decisionLog: simulationReport.strategicDecisionLog || []
    });
  }
}
