/**
 * src/services/compiler/core/archetypeDSL.js
 * 
 * ArchetypeDSL: DSL Declarativo Tipado para Arquetipos Estratégicos v16.
 * Utiliza constantes tipadas en lugar de cadenas sueltas para prevenir errores.
 */

import { CAPABILITY_IDS } from './capabilityCatalog.js';

export const ENGINE_IDS = Object.freeze({
  AETHER_VIAL: 'engine.aether_vial.v1',
  COLLECTED_COMPANY: 'engine.collected_company.v1',
  CHORD_OF_CALLING: 'engine.chord_of_calling.v1',
  TRON_BIG_MANA: 'engine.tron_big_mana.v1',
  YAWGMOTH_LOOP: 'engine.yawgmoth_loop.v1'
});

export class ArchetypeBuilder {
  constructor(name) {
    this.name = name;
    this.requirements = [];
    this.supportsList = [];
    this.preferences = [];
    this.gamePlanPhases = [];
  }

  requires(capabilityId, minQty = 4) {
    this.requirements.push(Object.freeze({ capabilityId, minQty }));
    return this;
  }

  supports(engineId) {
    this.supportsList.push(engineId);
    return this;
  }

  prefers(constraintStr) {
    this.preferences.push(constraintStr);
    return this;
  }

  gamePlan(phaseSequence = []) {
    this.gamePlanPhases = Object.freeze([...phaseSequence]);
    return this;
  }

  build() {
    return Object.freeze({
      archetype: this.name,
      requirements: Object.freeze([...this.requirements]),
      supports: Object.freeze([...this.supportsList]),
      preferences: Object.freeze([...this.preferences]),
      gamePlanPhases: Object.freeze([...this.gamePlanPhases])
    });
  }
}

export class ArchetypeDSL {
  static define(name) {
    return new ArchetypeBuilder(name);
  }

  static getMerfolkDSL() {
    return this.define('Merfolk Tempo')
      .requires(CAPABILITY_IDS.MANA_ACCELERATION_T1, 4)
      .requires(CAPABILITY_IDS.VALUE_THREAT, 12)
      .supports(ENGINE_IDS.AETHER_VIAL)
      .supports(ENGINE_IDS.COLLECTED_COMPANY)
      .prefers('CMC<=2')
      .gamePlan([
        { id: 'PHASE_1', label: 'Deploy Tempo Dorks / Vial' },
        { id: 'PHASE_2', label: 'Snowball Creature Board & Lords' },
        { id: 'PHASE_3', label: 'Islandwalk Evasion / CoCo Burst' },
        { id: 'PHASE_4', label: 'Close Lethal Damage' }
      ])
      .build();
  }
}
