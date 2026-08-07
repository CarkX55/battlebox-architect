/**
 * src/services/compiler/core/intentUnderstandingEngine.js
 * 
 * IntentUnderstandingEngine: Motor de Comprensión Neutra de Preferencias v17.2.
 * UI entiende personas -> IntentUnderstandingEngine entiende preferencias -> Compilador entiende Magic.
 * CERO suposiciones de construcción de mazos en la UI.
 */

import { CanonicalUserIntentSpectrum } from '../../../models/userIntentSpectrum.js';
import { IntentConfidenceScorer } from './intentConfidenceScorer.js';


export class IntentUnderstandingEngine {
  /**
   * Procesa las preferencias humanas neutras del usuario y emite un CanonicalUserIntentSpectrum
   */
  static parseUserPreferences(rawInput = {}) {
    const primaryIdea = rawInput.primaryIdea || rawInput.prompt || rawInput.tribe || rawInput.theme || 'Midrange';
    const format = (rawInput.format || 'Modern').toUpperCase();
    const colors = Array.isArray(rawInput.colors) ? rawInput.colors : [];

    const identityLock = rawInput.identityLock || (rawInput.themePriority === 'STRICT_THEME_FIDELITY' ? 'STRICT' : 'SOFT');
    const expectedPowerLevel = rawInput.expectedPowerLevel || rawInput.goal || 'OPTIMIZED';
    const discoveryPreference = rawInput.discoveryPreference || 'BALANCED';
    const winMemory = rawInput.winMemory || rawInput.winEmotion || 'HUGE_CREATURES';

    const signatureCards = Array.isArray(rawInput.signatureCards) ? rawInput.signatureCards : [];
    const mustIncludeCards = Array.isArray(rawInput.mustIncludeCards) || Array.isArray(rawInput.mustInclude) ? (rawInput.mustIncludeCards || rawInput.mustInclude) : [];
    const hatedCards = Array.isArray(rawInput.hatedCards) || Array.isArray(rawInput.excludedCards) ? (rawInput.hatedCards || rawInput.excludedCards) : [];
    const excludedMechanics = Array.isArray(rawInput.excludedMechanics) ? rawInput.excludedMechanics : [];

    const spectrum = new CanonicalUserIntentSpectrum({
      primaryIdea,
      format,
      colors,
      identityLock,
      expectedPowerLevel,
      discoveryPreference,
      winMemory,
      intentPriorities: ['PRIMARY_IDEA', 'WIN_MEMORY', 'POWER_LEVEL', 'EXCLUSIONS', 'DISCOVERY'],
      signatureCards,
      mustIncludeCards,
      hatedCards,
      excludedMechanics,
      intentConfidence: 0.50
    });

    const confidenceReport = IntentConfidenceScorer.calculateConfidence(spectrum);

    return new CanonicalUserIntentSpectrum({
      ...spectrum,
      intentConfidence: confidenceReport.confidenceScore
    });
  }
}

