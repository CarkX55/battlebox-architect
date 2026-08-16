/**
 * src/services/compiler/core/archetypeDNA.js
 * 
 * ArchetypeDNA: Compositional DNA Inheritance Model v1.0.
 * Constructs archetype identities through compositional DNA inheritance:
 *   Giants = Midrange DNA + Ramp DNA + Large Threat DNA + Stomp Engine
 */

export class ArchetypeDNA {
  /**
   * Retrieves compositional DNA traits for an archetype.
   * 
   * @param {string} archetypeKey 
   * @returns {{ archetypeKey: string, inheritedDNA: Array<string>, primaryEngine: string, compositionSummary: string }}
   */
  static getArchetypeDNA(archetypeKey = 'GENERIC_AGGRO') {
    const keyLower = String(archetypeKey).toLowerCase();
    const isAggro = keyLower.includes('aggro') || keyLower.includes('burn') || keyLower.includes('goblin');
    const isRamp = keyLower.includes('ramp') || keyLower.includes('big') || keyLower.includes('hydra') || keyLower.includes('giant');
    const isControl = keyLower.includes('control');
    const isSacrifice = keyLower.includes('sacrifice') || keyLower.includes('aristocrat') || keyLower.includes('zombie');

    let inheritedDNA;
    let primaryEngine;

    if (isSacrifice) {
      inheritedDNA = Object.freeze([
        'Aristocrats Base DNA',
        'Recursive Fodder DNA',
        'Sacrifice Outlet Synergy DNA',
        'Life Drain Reach DNA'
      ]);
      primaryEngine = 'SACRIFICE_DRAIN_ENGINE';
    } else if (isAggro) {
      inheritedDNA = Object.freeze([
        'Hyper-Aggro Base DNA',
        'Turn 1-2 Curve Pressure DNA',
        'Tribal / Lord Synergy DNA',
        'Direct Burn & Reach DNA'
      ]);
      primaryEngine = 'SWARM_HASTE_ENGINE';
    } else if (isControl) {
      inheritedDNA = Object.freeze([
        'Control Foundation DNA',
        'Instant Disruption DNA',
        'Card Velocity & Draw DNA',
        'Inevitable Finisher DNA'
      ]);
      primaryEngine = 'REACTIVE_CONTROL_ENGINE';
    } else if (isRamp) {
      inheritedDNA = Object.freeze([
        'Midrange Base DNA',
        'Ramp Acceleration DNA',
        'Large Threat Density DNA',
        'Stompy Synergy DNA'
      ]);
      primaryEngine = 'RAMP_ACCELERATION_ENGINE';
    } else {
      inheritedDNA = Object.freeze([
        'Midrange Value DNA',
        'Curve Efficiency DNA',
        'Targeted Removal DNA',
        'Resilient Threat DNA'
      ]);
      primaryEngine = 'MIDRANGE_VALUE_ENGINE';
    }

    const compositionSummary = `ADN del Arquetipo [${archetypeKey}]: Hereda ${inheritedDNA.join(' + ')}.`;

    return {
      archetypeKey,
      inheritedDNA,
      primaryEngine,
      compositionSummary
    };
  }
}
