/**
 * FeaturePipeline.js
 * Extensible Feature Vector Pipeline Framework for Card Feature Pre-computation.
 */

export class FeaturePipeline {
  static extractFeatures(card) {
    if (!card) return null;

    const text = (card.oracleText || card.oracle_text || card.text || '').toLowerCase();
    const cmc = card.cmc || card.manaValue || 0;

    // Core 12-dimensional numerical vector
    const vector = {
      tempo: cmc <= 2 ? 0.85 : (cmc <= 4 ? 0.60 : 0.35),
      consistency: cmc <= 3 ? 0.80 : 0.50,
      resilience: text.includes('indestructible') || text.includes('ward') || text.includes('hexproof') ? 0.90 : 0.50,
      redundancy: 0.75,
      manaEfficiency: cmc === 1 ? 0.95 : (cmc === 2 ? 0.85 : 0.60),
      colorPressure: (card.colors || []).length > 2 ? 0.80 : 0.30,
      drawQuality: text.includes('draw') ? 0.85 : 0.20,
      interactionDensity: text.includes('destroy') || text.includes('exile') || text.includes('counter') || text.includes('damage') || text.includes('deal') ? 0.90 : 0.20,
      closingSpeed: cmc >= 5 ? 0.85 : 0.40,
      recovery: text.includes('return') || text.includes('graveyard') ? 0.85 : 0.30,
      explosiveness: text.includes('haste') || text.includes('add ') ? 0.90 : 0.30,
      fragility: text.includes('when this creature dies') ? 0.20 : 0.50,
      extensions: {
        graveyardResilience: text.includes('graveyard') ? 0.85 : 0.10,
        stackControl: text.includes('counter target') ? 0.90 : 0.10,
        manaFlexibility: (card.colors || []).length === 0 ? 0.95 : 0.40
      }
    };

    return Object.freeze(vector);
  }
}
