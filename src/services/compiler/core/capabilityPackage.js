/**
 * src/services/compiler/core/capabilityPackage.js
 * 
 * CapabilityPackage: Unidad de Construcción del Mazo v22.0.
 * Empaqueta la densidad requerida, carta ganadora, alternativas, prioridad y nivel de bloqueo.
 */

export const LockLevel = Object.freeze({
  LOCK_HARD: 'LOCK_HARD',
  LOCK_SOFT: 'LOCK_SOFT',
  FLEXIBLE: 'FLEXIBLE'
});

export const PackagePriority = Object.freeze({
  PRIORITY_1_CORE: 'PRIORITY_1_CORE',           // 4x estricto
  PRIORITY_2_SUPPORT: 'PRIORITY_2_SUPPORT',       // 3-4x
  PRIORITY_3_SILVER_BULLET: 'PRIORITY_3_SILVER_BULLET', // 1-2x
  PRIORITY_4_TUTOR_TARGET: 'PRIORITY_4_TUTOR_TARGET'   // 1x
});

export class CapabilityPackage {
  constructor(data = {}) {
    this.role = data.role || 'GENERAL_CAPABILITY';
    this.requiredDensity = Number(data.requiredDensity || 4);
    this.allocatedDensity = Number(data.allocatedDensity || this.requiredDensity);
    this.winnerCard = data.winnerCard || 'Generic Card';
    this.winnerCardObj = data.winnerCardObj || null;
    this.copies = Number(data.copies || 4);
    this.alternatives = Object.freeze([...(data.alternatives || [])]);
    this.priority = data.priority || PackagePriority.PRIORITY_1_CORE;
    this.lockLevel = data.lockLevel || LockLevel.LOCK_HARD;
    this.rationale = data.rationale || 'Asignación de densidad por CapabilityPackage';

    Object.freeze(this);
  }
}
