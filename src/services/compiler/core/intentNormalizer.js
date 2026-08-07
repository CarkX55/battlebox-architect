/**
 * src/services/compiler/core/intentNormalizer.js
 * 
 * BattleBox Strategic Planning Framework v4.0 — Intent Normalizer.
 * Normalizes raw UI state into typed immutable StrategicIntent contracts.
 */

export class IntentNormalizer {
  static normalizeUIState(uiFormState = {}) {
    const intent = {
      format: uiFormState.format || 'Standard',
      colors: Object.freeze(uiFormState.colors || ['White', 'Red', 'Green']),
      archetype: uiFormState.archetype || 'Aggro',
      primaryTribe: uiFormState.primaryTribe || uiFormState.tribe || 'Giants',
      mechanics: Object.freeze(uiFormState.mechanics || ['Stomp']),
      prompt: uiFormState.prompt || 'Naya Giants Aggro',
      budget: uiFormState.budget || 'Unlimited',
      competitiveness: uiFormState.competitiveness || 'Competitive',
      excludedCards: Object.freeze(uiFormState.excludedCards || []),
      excludedMechanics: Object.freeze(uiFormState.excludedMechanics || [])
    };

    return Object.freeze(intent);
  }
}
