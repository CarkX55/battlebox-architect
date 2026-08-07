/**
 * src/services/compiler/core/intentConfidenceScorer.js
 * 
 * IntentConfidenceScorer: Evaluador de Riqueza y Reducción de Incertidumbre v17.2.
 * Mide la calidad de la información capturada (0% -> 100%).
 */

export class IntentConfidenceScorer {
  /**
   * Evalúa la certidumbre estratégica real sobre el modelo de intención
   */
  static calculateConfidence(intentSpectrum = {}) {
    const idea = (intentSpectrum.primaryIdea || intentSpectrum.prompt || '').toLowerCase().trim();
    
    // Identidades cohesivas de alta certeza instantánea
    const highCohesionConcepts = ['goblins', 'merfolk', 'elves', 'vampires', 'dragons', 'burn', 'tron', 'hydras', 'zombies'];
    const isHighCohesion = highCohesionConcepts.some(c => idea.includes(c));

    let score = isHighCohesion ? 75 : 0;

    if (intentSpectrum.format && intentSpectrum.format !== '') score += 15;
    if (intentSpectrum.colors && intentSpectrum.colors.length > 0) score += 10;
    if (intentSpectrum.primaryIdea && intentSpectrum.primaryIdea !== '') score += 15;
    if (intentSpectrum.signatureCards && intentSpectrum.signatureCards.length > 0) score += 10;
    if (intentSpectrum.mustIncludeCards && intentSpectrum.mustIncludeCards.length > 0) score += 10;

    const confidence = Math.min(100, score) / 100;

    return Object.freeze({
      confidenceScore: confidence,
      isHighCohesion,
      rating: confidence >= 0.75 ? 'HIGH_INTENT' : confidence >= 0.50 ? 'MEDIUM_INTENT' : 'LOW_INTENT',
      needsClarification: confidence < 0.65
    });
  }
}


