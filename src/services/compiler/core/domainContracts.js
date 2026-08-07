/**
 * src/services/compiler/core/domainContracts.js
 * 
 * Clases de Dominio Tipadas e Inmutables para el Core del Compilador v13.
 * Garantiza validación, serialización POJO limpia (toJSON) y versionado.
 */

import { COMPILER_VERSION } from './compilerVersion.js';
import { CAPABILITY_IDS } from './capabilityCatalog.js';

export class CapabilityContract {
  constructor(data = {}) {
    this.version = data.version || COMPILER_VERSION.contracts;
    this.capabilityId = data.capabilityId || CAPABILITY_IDS.MANA_SOURCE;
    this.targetUnits = Number(data.targetUnits || 1);
    this.targetProbability = Number(data.targetProbability || 0.85);
    this.cmcMax = Number(data.cmcMax || 99);
    this.preferredType = data.preferredType || 'any';
    this.validate();
    Object.freeze(this);
  }

  validate() {
    if (!this.capabilityId) {
      throw new Error('[CapabilityContract Error] capabilityId es requerido.');
    }
    if (this.targetProbability < 0 || this.targetProbability > 1.0) {
      throw new Error('[CapabilityContract Error] targetProbability debe estar entre 0.0 y 1.0.');
    }
  }

  toJSON() {
    return {
      version: this.version,
      capabilityId: this.capabilityId,
      targetUnits: this.targetUnits,
      targetProbability: this.targetProbability,
      cmcMax: this.cmcMax,
      preferredType: this.preferredType
    };
  }

  static fromJSON(jsonObj) {
    const data = typeof jsonObj === 'string' ? JSON.parse(jsonObj) : jsonObj;
    return new CapabilityContract(data);
  }
}

export class CritiqueResult {
  constructor(data = {}) {
    this.version = data.version || COMPILER_VERSION.contracts;
    this.criticId = data.criticId || 'UnknownCritic';
    this.passed = Boolean(data.passed);
    this.severity = data.severity || 'HIGH'; // CRITICAL | HIGH | MEDIUM | LOW
    this.issue = data.issue || '';
    this.requiredNeed = data.requiredNeed || null;
    this.metricName = data.metricName || 'Score';
    this.currentValue = Number(data.currentValue || 0);
    this.targetValue = Number(data.targetValue || 0);
    Object.freeze(this);
  }

  toJSON() {
    return {
      version: this.version,
      criticId: this.criticId,
      passed: this.passed,
      severity: this.severity,
      issue: this.issue,
      requiredNeed: this.requiredNeed,
      metricName: this.metricName,
      currentValue: this.currentValue,
      targetValue: this.targetValue
    };
  }

  static fromJSON(jsonObj) {
    const data = typeof jsonObj === 'string' ? JSON.parse(jsonObj) : jsonObj;
    return new CritiqueResult(data);
  }
}

export class SimulationReport {
  constructor(data = {}) {
    this.version = data.version || COMPILER_VERSION.contracts;
    this.simulatedHands = Number(data.simulatedHands || 1000);
    this.keepableRate = Number(data.keepableRate || 0.85);
    this.estimatedKillTurn = Number(data.estimatedKillTurn || 4.2);
    this.recoveryRate = Number(data.recoveryRate || 0.70);
    this.nodesExplored = Number(data.nodesExplored || 100);
    Object.freeze(this);
  }

  toJSON() {
    return {
      version: this.version,
      simulatedHands: this.simulatedHands,
      keepableRate: this.keepableRate,
      estimatedKillTurn: this.estimatedKillTurn,
      recoveryRate: this.recoveryRate,
      nodesExplored: this.nodesExplored
    };
  }

  static fromJSON(jsonObj) {
    const data = typeof jsonObj === 'string' ? JSON.parse(jsonObj) : jsonObj;
    return new SimulationReport(data);
  }
}

export class RepairProposal {
  constructor(data = {}) {
    this.version = data.version || COMPILER_VERSION.contracts;
    this.requiredCapability = data.requiredCapability ? new CapabilityContract(data.requiredCapability) : null;
    this.justification = Object.freeze({
      criticId: data.justification?.criticId || 'UnknownCritic',
      metricName: data.justification?.metricName || 'Score',
      currentValue: Number(data.justification?.currentValue || 0),
      targetValue: Number(data.justification?.targetValue || 0),
      reason: data.justification?.reason || ''
    });
    Object.freeze(this);
  }

  toJSON() {
    return {
      version: this.version,
      requiredCapability: this.requiredCapability ? this.requiredCapability.toJSON() : null,
      justification: this.justification
    };
  }

  static fromJSON(jsonObj) {
    const data = typeof jsonObj === 'string' ? JSON.parse(jsonObj) : jsonObj;
    return new RepairProposal(data);
  }
}
