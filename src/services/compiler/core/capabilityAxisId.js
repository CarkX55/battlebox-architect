/**
 * src/services/compiler/core/capabilityAxisId.js
 * 
 * CapabilityAxisID: Typed Capability Enum v1.0.
 * Single canonical authority for capability axis identifiers across the compiler.
 * Prevents typo bugs like 'TURN_PRESSURE' vs 'TURN1_PRESSURE'.
 */

export const CapabilityAxisID = Object.freeze({
  TURN1_PRESSURE: 'TURN1_PRESSURE',
  TURN2_PRESSURE: 'TURN2_PRESSURE',
  CHEAP_REMOVAL: 'CHEAP_REMOVAL',
  COUNTER_DISRUPTION: 'COUNTER_DISRUPTION',
  BOARD_SWEEPER: 'BOARD_SWEEPER',
  CARD_FLOW: 'CARD_FLOW',
  TRIBAL_DENSITY: 'TRIBAL_DENSITY',
  MANA_BASE: 'MANA_BASE',
  BOARD_PRESENCE: 'BOARD_PRESENCE',
  RAMP_ACCELERATION: 'RAMP_ACCELERATION',
  AMPLIFY_BOARD_PRESSURE: 'AMPLIFY_BOARD_PRESSURE',
  FINISHER: 'FINISHER'
});

export function normalizeCapabilityAxisId(rawId = '') {
  if (!rawId) return CapabilityAxisID.BOARD_PRESENCE;
  const upper = rawId.toUpperCase().trim();
  if (CapabilityAxisID[upper]) return CapabilityAxisID[upper];

  const map = {
    'TURN_PRESSURE': CapabilityAxisID.TURN1_PRESSURE,
    'T1_PRESSURE': CapabilityAxisID.TURN1_PRESSURE,
    'TURN_ONE_PRESSURE': CapabilityAxisID.TURN1_PRESSURE,
    'T2_PRESSURE': CapabilityAxisID.TURN2_PRESSURE,
    'REMOVAL': CapabilityAxisID.CHEAP_REMOVAL,
    'REMOVAL_DENSITY': CapabilityAxisID.CHEAP_REMOVAL,
    'SPOT_REMOVAL': CapabilityAxisID.CHEAP_REMOVAL,
    'COUNTER': CapabilityAxisID.COUNTER_DISRUPTION,
    'COUNTERSPELL': CapabilityAxisID.COUNTER_DISRUPTION,
    'COUNTERSPELL_SUITE': CapabilityAxisID.COUNTER_DISRUPTION,
    'COUNTERMAGIC': CapabilityAxisID.COUNTER_DISRUPTION,
    'SWEEPER': CapabilityAxisID.BOARD_SWEEPER,
    'BOARD_WIPE': CapabilityAxisID.BOARD_SWEEPER,
    'MASS_REMOVAL': CapabilityAxisID.BOARD_SWEEPER,
    'CARD_DRAW': CapabilityAxisID.CARD_FLOW,
    'CARD_VELOCITY': CapabilityAxisID.CARD_FLOW,
    'CARD_ADVANTAGE': CapabilityAxisID.CARD_FLOW,
    'RAMP': CapabilityAxisID.RAMP_ACCELERATION,
    'LANDS': CapabilityAxisID.MANA_BASE
  };

  return map[upper] || upper;
}
