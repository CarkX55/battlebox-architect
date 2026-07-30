/**
 * src/judge/ontology/StrategyOntology.js
 * Official Strategic Ontology for BattleBox Architect v7.
 * Standardizes 16 strategic primitives across DSL and IR.
 */

export const STRATEGY_ONTOLOGY_PRIMITIVES = Object.freeze({
  ACCELERATION: 'Acceleration',
  PRESSURE: 'Pressure',
  INEVITABILITY: 'Inevitability',
  TEMPO: 'Tempo',
  LOCK: 'Lock',
  ATTRITION: 'Attrition',
  VALUE: 'Value',
  RECURSION: 'Recursion',
  REACH: 'Reach',
  PIVOT: 'Pivot',
  FLEXIBILITY: 'Flexibility',
  ENGINE: 'Engine',
  PAYOFF: 'Payoff',
  SUPPORT: 'Support',
  BRIDGE: 'Bridge',
  FINISHER: 'Finisher'
});

export const ONTOLOGY_VERSION = '1.0.0';

export function validateOntologyPrimitive(primitive) {
  return Object.values(STRATEGY_ONTOLOGY_PRIMITIVES).includes(primitive);
}
