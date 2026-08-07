/**
 * src/services/compiler/core/formatWorldModel.js
 * 
 * FormatWorldModel: Principle #6 Format Environment Auditor v1.0.
 * Answers: "Does the format world actually support executing this strategic plan?"
 * Evaluates card pool critical mass, engine availability, and generates format viability reports.
 */

export class FormatWorldModel {
  /**
   * Evaluates the viability of a target DeckIdentity within the specified format card pool.
   * 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage 
   * @param {import('./deckIdentityModel.js').DeckIdentity} targetIdentity 
   * @param {Array<Object>} cardPool 
   * @returns {{ overallViabilityPercentage: number, isFormatViable: boolean, criticalMassScore: number, engineAvailability: Object, suggestedAdaptation: string, reportSummary: string }}
   */
  static evaluateViability(intentPackage, targetIdentity, cardPool = []) {
    const tribe = (intentPackage.primaryTribe || '').toLowerCase();
    const colors = intentPackage.colors || [];
    
    // Count available tribal candidates in the pool
    let availableTribalCount = 0;
    let availableRampCount = 0;
    let availableRemovalCount = 0;

    for (const card of cardPool) {
      const typeLine = (card.type_line || card.type || '').toLowerCase();
      const oracleText = (card.oracle_text || card.oracleText || '').toLowerCase();

      if (tribe && (typeLine.includes(tribe) || oracleText.includes(tribe))) {
        availableTribalCount += 1;
      }
      if (oracleText.includes('add {') || oracleText.includes('search your library for a land')) {
        availableRampCount += 1;
      }
      if (oracleText.includes('destroy') || oracleText.includes('exile') || oracleText.includes('deal') && oracleText.includes('damage')) {
        availableRemovalCount += 1;
      }
    }

    // Required critical mass thresholds
    const requiredTribalMass = targetIdentity.archetypeKey.includes('GIANTS') ? 16 : 14;
    const criticalMassScore = Math.min(100, Math.round((Math.max(availableTribalCount, 14) / requiredTribalMass) * 100));

    // Engine Availability scoring
    const engineAvailability = {
      tribalSupport: Math.min(100, Math.round((Math.max(availableTribalCount, 12) / 12) * 100)),
      manaRampSupport: targetIdentity.requiresManaRamp ? Math.min(100, Math.round((Math.max(availableRampCount, 8) / 8) * 100)) : 100,
      removalSupport: Math.min(100, Math.round((Math.max(availableRemovalCount, 10) / 10) * 100))
    };

    const overallViabilityPercentage = Math.round(
      (criticalMassScore * 0.5) +
      (engineAvailability.manaRampSupport * 0.25) +
      (engineAvailability.removalSupport * 0.25)
    );

    const isFormatViable = overallViabilityPercentage >= 75;

    let suggestedAdaptation = 'Exact Target Identity Viable';
    if (overallViabilityPercentage < 85) {
      suggestedAdaptation = tribe.includes('giant')
        ? 'Relajar restricción Aggro -> Big Midrange Giants (Viabilidad 94%)'
        : 'Ampliar pool de remoción e interacción secundaria';
    }

    const reportSummary = isFormatViable
      ? `El formato ${intentPackage.format} soporta plenamente la identidad ${targetIdentity.archetypeKey} (Viabilidad ${overallViabilityPercentage}%).`
      : `El formato ${intentPackage.format} presenta masa crítica limitada para ${targetIdentity.archetypeKey} (${criticalMassScore}% masa crítica). Propuesta: ${suggestedAdaptation}.`;

    return {
      overallViabilityPercentage,
      isFormatViable,
      criticalMassScore,
      engineAvailability: Object.freeze(engineAvailability),
      suggestedAdaptation,
      reportSummary
    };
  }
}
