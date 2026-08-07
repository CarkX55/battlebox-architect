/**
 * src/services/compiler/core/capabilityOntology.js
 * 
 * BattleBox Strategic Planning Framework v4.0 — Capability Ontology.
 * Pure graph of capability relationships decoupled from concrete cards.
 * Invariant 2 & Invariant 4 compliant.
 */

export class CapabilityOntology {
  constructor() {
    this.ontologyMap = new Map([
      ['EarlyRamp', { category: 'RAMP', requires: ['ManaSource'], enables: ['MidCurveThreats'] }],
      ['StompRemoval', { category: 'INTERACTION', requires: ['RedMana'], supports: ['EarlyTempo'] }],
      ['GiantThreat', { category: 'THREAT', requires: ['ManaRamp'], enables: ['CombatDamageLethal'] }],
      ['CardFlow2For1', { category: 'CARD_ADVANTAGE', requires: ['MultiPhaseEngine'], supports: ['RecoverySweeper'] }]
    ]);
    Object.freeze(this);
  }

  getCapabilityDetails(capabilityName) {
    return this.ontologyMap.get(capabilityName) || null;
  }
}
