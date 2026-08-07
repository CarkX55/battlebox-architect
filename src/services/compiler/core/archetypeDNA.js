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
  static getArchetypeDNA(archetypeKey = 'NAYA_GIANTS_STOMP') {
    const inheritedDNA = Object.freeze([
      'Midrange Base DNA',
      'Ramp Acceleration DNA',
      'Large Threat Density DNA',
      'Stomp Tribal Synergy DNA'
    ]);

    const primaryEngine = 'STOMP_REDUCTION_ENGINE';
    const compositionSummary = `ADN del Arquetipo [${archetypeKey}]: Hereda ${inheritedDNA.join(' + ')}.`;

    return {
      archetypeKey,
      inheritedDNA,
      primaryEngine,
      compositionSummary
    };
  }
}
