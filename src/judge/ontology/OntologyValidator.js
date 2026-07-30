/**
 * OntologyValidator.js
 * Self-validates CapabilityOntology and StrategyOntology at application startup.
 */

import { CapabilityOntology } from './CapabilityOntology.js';
import { StrategyOntology } from './StrategyOntology.js';

export class OntologyValidator {
  static validate() {
    const errors = [];

    // 1. Validate CapabilityOntology
    if (!CapabilityOntology || CapabilityOntology.version !== 1) {
      errors.push('CapabilityOntology missing or invalid version.');
    } else {
      const caps = CapabilityOntology.capabilities;
      const capIds = new Set(Object.keys(caps));

      for (const [id, cap] of Object.entries(caps)) {
        if (cap.id !== id) {
          errors.push(`Capability ID mismatch: Key '${id}' vs Object ID '${cap.id}'`);
        }
        if (!Array.isArray(cap.requires) || !Array.isArray(cap.produces)) {
          errors.push(`Capability '${id}' must define requires and produces arrays.`);
        }
      }
    }

    // 2. Validate StrategyOntology
    if (!StrategyOntology || StrategyOntology.version !== 1) {
      errors.push('StrategyOntology missing or invalid version.');
    } else {
      const archetypes = StrategyOntology.archetypes;
      const capIds = new Set(Object.keys(CapabilityOntology.capabilities));

      for (const [archId, arch] of Object.entries(archetypes)) {
        if (arch.id !== archId) {
          errors.push(`Archetype ID mismatch: Key '${archId}' vs Object ID '${arch.id}'`);
        }
        for (const capRef of arch.consumedCapabilities) {
          if (!capIds.has(capRef)) {
            errors.push(`Archetype '${archId}' references unknown capability '${capRef}'`);
          }
        }
        if (!Array.isArray(arch.invariants) || arch.invariants.length === 0) {
          errors.push(`Archetype '${archId}' must declare at least one invariant.`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`[OntologyValidationError] Failures detected:\n- ${errors.join('\n- ')}`);
    }

    return { valid: true, capabilityCount: Object.keys(CapabilityOntology.capabilities).length, archetypeCount: Object.keys(StrategyOntology.archetypes).length };
  }
}
