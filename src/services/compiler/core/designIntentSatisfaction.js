/**
 * src/services/compiler/core/designIntentSatisfaction.js
 * 
 * DesignIntentSatisfaction (DIS): Métrica de Satisfacción de la Intención de Diseño v17.3.
 * Mide cuantitativamente (0% -> 100%) cuánto se parece el mazo generado al mazo que el usuario soñaba construir.
 * Un mazo con Win Rate 72% pero DIS 35% es un FRACASO.
 * Un mazo con Win Rate 61% y DIS 98% es un ÉXITO TOTAL.
 */

export class DesignIntentSatisfaction {
  /**
   * Evalúa la métrica DIS comparando el mazo final contra la identidad soñada por el usuario
   */
  static evaluateDIS(compiledDeckList = [], intentSpectrum = {}) {
    let themeScore = 1.0;
    let signatureCardScore = 1.0;
    let exclusionScore = 1.0;

    const deckCardNames = new Set(compiledDeckList.map(c => (c.name || c.cardName || '').toLowerCase().trim()));

    // 1. Preservación de la Identidad Temática Primaria
    const primaryIdea = (intentSpectrum.primaryIdea || '').toLowerCase();
    const matchingThemeCards = compiledDeckList.filter(c => {
      const typeLine = (c.type_line || c.typeLine || '').toLowerCase();
      const oracleText = (c.oracle_text || c.oracleText || '').toLowerCase();
      return typeLine.includes(primaryIdea) || oracleText.includes(primaryIdea);
    });

    if (primaryIdea && primaryIdea.length > 2) {
      themeScore = matchingThemeCards.length >= 8 ? 1.0 : matchingThemeCards.length >= 4 ? 0.8 : 0.6;
    }

    // 2. Presencia de Cartas Emblemáticas (Signature Cards)
    const signatures = intentSpectrum.signatureCards || [];
    if (signatures.length > 0) {
      let foundCount = 0;
      signatures.forEach(sig => {
        if (deckCardNames.has(sig.toLowerCase().trim())) foundCount++;
      });
      signatureCardScore = Math.round((foundCount / signatures.length) * 100) / 100;
    }

    // 3. Respeto Absoluto a Cartas Vetadas (Hated Cards)
    const hated = intentSpectrum.hatedCards || [];
    let violationCount = 0;
    hated.forEach(h => {
      if (deckCardNames.has(h.toLowerCase().trim())) violationCount++;
    });
    if (violationCount > 0) {
      exclusionScore = 0.0; // Penalización severa por violar vetos
    }

    const disRaw = (themeScore * 0.40 + signatureCardScore * 0.35 + exclusionScore * 0.25);
    const disPercentage = Math.round(disRaw * 100);

    return Object.freeze({
      disScore: disPercentage,
      rating: disPercentage >= 90 ? 'PERFECT_MATCH' : disPercentage >= 75 ? 'HIGH_MATCH' : 'MODERATE_MATCH',
      factors: Object.freeze({
        themePreservationScore: themeScore,
        signatureCardPresenceScore: signatureCardScore,
        exclusionComplianceScore: exclusionScore
      })
    });
  }
}
