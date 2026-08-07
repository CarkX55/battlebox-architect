/**
 * src/services/compiler/core/pureIntentBlueprint.js
 * 
 * PureIntentBlueprint: Especificación Declarativa Pura de Intenciones Estratégicas v14.1.
 * Contiene contratos cuantitativos con prioridades, unidades requeridas y cobertura objetivo.
 * CERO nombres de cartas (boundCard), CERO paquetes de tierras (Land Package), CERO cantidades estáticas por carta.
 */

export class QuantitativeContractRequirement {
  constructor(data = {}) {
    this.capabilityId = data.capabilityId || 'cap.unassigned';
    this.priority = data.priority || 'CRITICAL'; // CRITICAL | HIGH | MEDIUM | OPTIONAL
    this.requiredUnits = Number(data.requiredUnits || 4);
    this.targetCoverageRate = Number(data.targetCoverageRate || 0.85);
    this.constraints = Object.freeze({
      tribe: data.constraints?.tribe || null,
      isLord: Boolean(data.constraints?.isLord),
      cmcMax: Number(data.constraints?.cmcMax || 99),
      requiredTags: Object.freeze([...(data.constraints?.requiredTags || [])]),
      forbiddenTags: Object.freeze([...(data.constraints?.forbiddenTags || [])])
    });
    this.validate();
    Object.freeze(this);
  }

  validate() {
    if (!this.capabilityId) {
      throw new Error('[QuantitativeContractRequirement Error] capabilityId es requerido.');
    }
  }

  toJSON() {
    return {
      capabilityId: this.capabilityId,
      priority: this.priority,
      requiredUnits: this.requiredUnits,
      targetCoverageRate: this.targetCoverageRate,
      constraints: this.constraints
    };
  }

  static fromJSON(jsonObj) {
    const data = typeof jsonObj === 'string' ? JSON.parse(jsonObj) : jsonObj;
    return new QuantitativeContractRequirement(data);
  }
}

export class PureIntentBlueprint {
  constructor(data = {}) {
    this.version = data.version || '14.1.0';
    this.archetype = data.archetype || 'Custom Intent Archetype';
    this.format = data.format || 'Modern';
    this.macroStrategy = data.macroStrategy || 'Strategic Intention';
    this.contracts = Object.freeze((data.contracts || []).map(c => new QuantitativeContractRequirement(c)));
    this.validate();
    Object.freeze(this);
  }

  validate() {
    // Garantizar que no existen nombres de cartas ni paquetes de tierras
    const jsonStr = JSON.stringify(this.contracts).toLowerCase();
    if (jsonStr.includes('boundcard') || jsonStr.includes('land package')) {
      throw new Error('[PureIntentBlueprint Error] El blueprint no puede contener boundCard ni Land Package.');
    }
  }

  toJSON() {
    return {
      version: this.version,
      archetype: this.archetype,
      format: this.format,
      macroStrategy: this.macroStrategy,
      contracts: this.contracts.map(c => c.toJSON())
    };
  }

  static fromJSON(jsonObj) {
    const data = typeof jsonObj === 'string' ? JSON.parse(jsonObj) : jsonObj;
    return new PureIntentBlueprint(data);
  }
}
