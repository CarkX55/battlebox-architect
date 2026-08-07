/**
 * src/services/compiler/core/capabilityRequirement.js
 * 
 * CapabilityRequirement: Rich Strategic Contract between Strategy Competition and Package Composition.
 * 
 * Sits between PASS 1 (Strategy Competition) and PASS 4 (Package Composition).
 * Requirements do NOT know specific cards yet — they describe WHAT the deck needs.
 * CapabilityPackages (produced by CopyAllocationManager from these) know HOW MANY copies.
 * DeckExpansion (slots) knows WHERE each card sits.
 * 
 * Four distinct levels:
 *   CapabilityRequirements → CapabilityPackages → CopyAllocationState → DeckExpansion
 */

/**
 * Importance levels for capability requirements.
 * Drives priority assignment in CopyAllocationManager.
 */
export const CapabilityImportance = Object.freeze({
  CORE: 'CORE',               // Without this the deck doesn't function (e.g., mana dorks in Elf Ramp)
  HIGH: 'HIGH',               // Important for consistency but deck survives without (e.g., card draw)
  SUPPORT: 'SUPPORT',         // Adds resilience or flexibility (e.g., interaction)
  SILVER_BULLET: 'SILVER_BULLET', // Situational 1-of (e.g., tutor targets)
  FLEX: 'FLEX'                // Optional slots, filled last
});

/**
 * Format-specific default allocation modes.
 * Determines how CopyAllocationManager distributes copies.
 */
export const FORMAT_ALLOCATION_POLICY = Object.freeze({
  COMMANDER: { defaultMode: 'SINGLETON', userOverridable: false },
  STANDARD: { defaultMode: 'PRIORITIZE_4X', userOverridable: true },
  MODERN: { defaultMode: 'PRIORITIZE_4X', userOverridable: true },
  PIONEER: { defaultMode: 'PRIORITIZE_4X', userOverridable: true },
  LEGACY: { defaultMode: 'PRIORITIZE_4X', userOverridable: true },
  VINTAGE: { defaultMode: 'PRIORITIZE_4X', userOverridable: true },
  PAUPER: { defaultMode: 'PRIORITIZE_4X', userOverridable: true },
  CASUAL: { defaultMode: 'BALANCED', userOverridable: true },
  BATTLEBOX: { defaultMode: 'SINGLETON', userOverridable: false }
});

/**
 * Resolves the allocation mode for a given format, with optional user override.
 * @param {string} format - The deck format (e.g., 'MODERN', 'COMMANDER')
 * @param {string|null} userOverride - Optional user-specified mode override
 * @returns {{ mode: string, source: string }} The resolved mode and where it came from
 */
export function resolveAllocationMode(format, userOverride = null) {
  const normalizedFormat = (format || 'MODERN').toUpperCase();
  const policy = FORMAT_ALLOCATION_POLICY[normalizedFormat] || FORMAT_ALLOCATION_POLICY.MODERN;

  if (userOverride && policy.userOverridable) {
    return { mode: userOverride, source: 'USER_OVERRIDE' };
  }

  return { mode: policy.defaultMode, source: 'FORMAT_POLICY' };
}


export class CapabilityRequirement {
  /**
   * @param {Object} data
   * @param {string} data.capability - Capability identifier (e.g., 'TURN_1_ACCELERATION', 'CARD_DRAW')
   * @param {number} data.targetDensity - Ideal number of cards fulfilling this capability
   * @param {number} data.minDensity - Minimum viable density before strategy collapses
   * @param {string} data.importance - CapabilityImportance level
   * @param {string[]} data.preferredCharacteristics - Desired card traits (e.g., ['CREATURE', 'GREEN', 'CMC1'])
   * @param {string} data.role - Human-readable role label (e.g., 'Mana Acceleration')
   * @param {string} data.rationale - Why this capability is needed
   */
  constructor(data = {}) {
    this.capability = data.capability || 'GENERAL_CAPABILITY';
    this.targetDensity = Number(data.targetDensity || 4);
    this.minDensity = Number(data.minDensity || Math.max(1, Math.floor(this.targetDensity * 0.75)));
    this.importance = data.importance || CapabilityImportance.SUPPORT;
    this.preferredCharacteristics = Object.freeze([...(data.preferredCharacteristics || [])]);
    this.role = data.role || 'General';
    this.rationale = data.rationale || '';

    Object.freeze(this);
  }
}
