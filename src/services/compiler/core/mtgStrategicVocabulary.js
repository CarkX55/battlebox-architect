/**
 * src/services/compiler/core/mtgStrategicVocabulary.js
 * 
 * BattleBox Strategic Planning Framework v4.0 — MTG Strategic Vocabulary Plugin.
 * Maps MTG-specific strategic concepts (Tempo, Ramp, Sweepers, Mana Curve) into domain-agnostic StrategyIR nodes.
 */

import { StrategyIR } from './strategyIR.js';

export class MTGStrategicVocabulary {
  static compileToStrategyIR(intentPackage) {
    const archetype = intentPackage.archetype || 'Aggro';
    const tribe = intentPackage.primaryTribe || 'Giants';
    const mechanics = intentPackage.mechanics || ['Stomp'];

    const nodes = [
      { id: 'GOAL_1', type: 'GoalNode', label: `Achieve Lethal Damage before Turn 6`, priority: 100 },
      { id: 'CAP_RAMP', type: 'CapabilityNode', label: 'CMC 1-2 Mana Acceleration', priority: 90 },
      { id: 'CAP_REMOVAL', type: 'CapabilityNode', label: 'Cheap Interaction / Stomp Removal', priority: 85 },
      { id: 'CAP_THREAT', type: 'CapabilityNode', label: `Mid-Curve ${tribe} Threat Density`, priority: 95 },
      { id: 'CAP_CARD_FLOW', type: 'CapabilityNode', label: 'Virtual 2-for-1 Card Advantage', priority: 80 },
      { id: 'RISK_SWEEPER', type: 'RiskNode', label: 'Vulnerability to Board Sweepers T4-T5', severity: 'HIGH' }
    ];

    const edges = [
      { source: 'GOAL_1', target: 'CAP_RAMP', relation: 'requires' },
      { source: 'GOAL_1', target: 'CAP_THREAT', relation: 'requires' },
      { source: 'CAP_RAMP', target: 'CAP_THREAT', relation: 'enables' },
      { source: 'CAP_REMOVAL', target: 'CAP_THREAT', relation: 'supports' },
      { source: 'CAP_THREAT', target: 'RISK_SWEEPER', relation: 'conflicts' }
    ];

    const sir = new StrategyIR({
      intentHash: `INTENT_${archetype}_${tribe}`,
      strategyTarget: `${archetype}_${tribe}_STOMP`,
      nodes,
      edges
    });

    sir.verifyZeroCardsInvariant();
    return sir;
  }
}
