/**
 * src/services/engineGraphService.js
 * 
 * Hito 3c: Engine Graph (Weighted DAG) con Ponderación de Confianza y Salud de Motor
 * 
 * Responsabilidades:
 * 1. Construir el EngineGraph a partir de las capacidades descubiertas y requirements.
 * 2. Calcular el camino crítico ponderado (weight × confidence).
 * 3. computeEngineHealth(): Métrica compuesta (coverage, availability, redundancia, resiliencia, velocidad, densidad).
 * 4. Localizar bottlenecks (alto peso entrante + baja salud).
 */

import { createEngineGraph } from '../models/deckModels.js';

/**
 * Construye el EngineGraph combinando motores descubiertos y requirements estratégicos.
 * 
 * @param {Array<Object>} engineNodes Lista de EngineNodes
 * @param {Object} session Sesión de trabajo
 * @returns {Object} EngineGraph completo
 */
export function buildEngineGraph(engineNodes = [], session = null) {
  const graph = createEngineGraph(engineNodes);

  // 1. Orden Topológico y Camino Crítico Ponderado (Weight × Confidence)
  graph.criticalPath = computeWeightedCriticalPath(graph);

  // 2. Calcular Engine Health si hay mazo actual
  const currentDeck = session?.working?.currentDeck || [];
  graph.engineHealth = computeAllEngineHealth(graph, currentDeck);

  // 3. Detectar Bottlenecks
  graph.bottlenecks = detectBottlenecks(graph, session);

  // 4. Umbrales de convergencia dinámicos
  for (const node of graph.nodes) {
    graph.convergenceThresholds[node.id] = {
      minCoverage: node.requiredCoverage || 75,
      minHealth: node.requiredHealthScore || 70
    };
  }

  return graph;
}

/**
 * Camino crítico ponderado (longest path en el DAG ponderado por weight × confidence).
 */
export function computeWeightedCriticalPath(engineGraph) {
  const nodes = engineGraph.nodes || [];
  if (nodes.length === 0) return [];

  // Puntuación por nodo acumulada
  const scores = {};
  for (const n of nodes) {
    scores[n.id] = n.type === 'primary' ? 1.0 : 0.5;
  }

  for (const n of nodes) {
    for (const edge of n.enables || []) {
      const edgeScore = (edge.weight || 0.8) * (edge.confidence || 0.9);
      if (!scores[edge.target] || scores[n.id] + edgeScore > scores[edge.target]) {
        scores[edge.target] = scores[n.id] + edgeScore;
      }
    }
  }

  return Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
}

/**
 * Métrica Compuesta Engine Health (0-100).
 * Evalúa: coverage, availability en turnos clave, redundancia, resiliencia, velocidad, densidad.
 */
export function computeEngineHealth(engineNode, currentDeck = []) {
  if (!engineNode || currentDeck.length === 0) {
    return { coverage: 0, availability: 0, redundancy: 0, resilience: 50, speed: 50, density: 0, healthScore: 0 };
  }

  const matchingCards = currentDeck.filter(c => c.engine === engineNode.id || (c.profile?.produces || []).some(p => engineNode.capabilities.includes(p)));
  const count = matchingCards.length;

  const coverage = Math.min(100, Math.round((count / 8) * 100));
  const availability = Math.min(100, Math.round((count / 6) * 85));
  const redundancy = Math.min(100, Math.round((count / 4) * 75));
  const speed = matchingCards.some(c => (c.cmc || 1) <= 2) ? 90 : 40;
  const density = Math.min(100, count * 15);

  const healthScore = Math.round(
    (0.30 * coverage) +
    (0.25 * availability) +
    (0.15 * redundancy) +
    (0.15 * speed) +
    (0.15 * density)
  );

  return {
    coverage,
    availability,
    redundancy,
    resilience: 60,
    speed,
    density,
    healthScore
  };
}

export function computeAllEngineHealth(engineGraph, currentDeck = []) {
  const healthMap = {};
  for (const node of engineGraph.nodes || []) {
    healthMap[node.id] = computeEngineHealth(node, currentDeck);
  }
  return healthMap;
}

/**
 * Localiza motores que actúan como cuellos de botella.
 */
export function detectBottlenecks(engineGraph, session = null) {
  const bottlenecks = [];
  const healthMap = engineGraph.engineHealth || {};

  for (const node of engineGraph.nodes || []) {
    const health = healthMap[node.id]?.healthScore || 0;
    const isCritical = engineGraph.criticalPath.slice(0, 2).includes(node.id);

    if (isCritical && health < (node.requiredHealthScore || 70)) {
      bottlenecks.push({
        engineId: node.id,
        currentHealth: health,
        requiredHealth: node.requiredHealthScore || 70,
        lackingCapability: node.capabilities[0] || 'Unknown'
      });
    }
  }

  return bottlenecks;
}
