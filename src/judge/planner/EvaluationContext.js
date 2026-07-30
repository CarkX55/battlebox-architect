/**
 * src/judge/planner/EvaluationContext.js
 * Evaluation Context for Pareto Tournament and Plan Optimization.
 */

export function createEvaluationContext(manifest, forgeContext = {}) {
  return Object.freeze({
    manifest,
    archetype: forgeContext.archetype || forgeContext.arquetipo || 'midrange',
    strategy: forgeContext.strategy || forgeContext.estrategia || '',
    format: (forgeContext.format || forgeContext.formato || 'MODERN').toUpperCase(),
    requestedColors: Object.freeze([...(forgeContext.colores || [])]),
    objectives: Object.freeze([...(manifest.pareto?.objectives || ['consistency', 'resilience', 'tempo', 'interaction'])]),
    timestamp: new Date().toISOString()
  });
}
