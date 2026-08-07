/**
 * src/services/compiler/core/intentToBlueprintBridge.js
 * 
 * IntentToBlueprintBridge: Única Capa de Traducción de Preferencias Humanas a Parámetros v17.2.
 * NINGÚN componente UI emite pesos numéricos directamente.
 * Traduce identityLock, expectedPowerLevel, discoveryPreference, signatureCards y hatedCards
 * al PureIntentBlueprint del compilador v16.1.
 */

export class IntentToBlueprintBridge {
  /**
   * Traduce el CanonicalUserIntentSpectrum al PureIntentBlueprint inmutable
   */
  static mapIntentToPureBlueprint(intentSpectrum = {}) {
    const isStrict = intentSpectrum.identityLock === 'STRICT';
    const isPowerMax = intentSpectrum.expectedPowerLevel === 'MAXIMUM_POSSIBLE';

    // Mapeo de presupuesto creativo y temas
    const themeFidelityWeight = isStrict ? 1.0 : isPowerMax ? 0.4 : 0.75;
    const discoveryBias = intentSpectrum.discoveryPreference === 'TREASURE_HUNTER' ? 0.35 : 0.10;

    return Object.freeze({
      archetype: intentSpectrum.primaryIdea,
      format: intentSpectrum.format || 'Modern',
      colors: intentSpectrum.colors || [],
      themeFidelityWeight,
      discoveryBias,
      signatureCards: intentSpectrum.signatureCards || [],
      mustIncludeCards: intentSpectrum.mustIncludeCards || [],
      hatedCards: intentSpectrum.hatedCards || [],
      excludedMechanics: intentSpectrum.excludedMechanics || []
    });
  }
}
