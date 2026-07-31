/**
 * CompilerCostModel.js
 * Multidimensional Format-Dynamic Compiler Cost Model Vector Evaluator.
 * Dynamically adjusts weights per format: Standard (tempo=0.40), Commander (tempo=0.12), Modern (tempo=0.55).
 */

export const FORMAT_WEIGHT_MULTIPLIERS = {
  STANDARD: { tempo: 0.40, resilience: 0.70, consistency: 0.85, interactionDensity: 0.75 },
  COMMANDER: { tempo: 0.12, resilience: 0.95, consistency: 0.60, interactionDensity: 0.80 },
  MODERN: { tempo: 0.55, resilience: 0.80, consistency: 0.90, interactionDensity: 0.95 }
};

export class CompilerCostModel {
  static getFormatWeights(format = 'STANDARD') {
    const key = (format || 'STANDARD').toUpperCase();
    return FORMAT_WEIGHT_MULTIPLIERS[key] || FORMAT_WEIGHT_MULTIPLIERS.STANDARD;
  }

  static evaluateSwap(sourceVector, targetVector, format = 'STANDARD') {
    if (!sourceVector || !targetVector) {
      return { netGain: 0, deltaVector: {}, formatWeights: this.getFormatWeights(format) };
    }

    const weights = this.getFormatWeights(format);

    const deltaVector = {
      tempo: (targetVector.tempo - sourceVector.tempo) * (weights.tempo || 0.40),
      resilience: (targetVector.resilience - sourceVector.resilience) * (weights.resilience || 0.70),
      consistency: (targetVector.consistency - sourceVector.consistency) * (weights.consistency || 0.85),
      interactionDensity: (targetVector.interactionDensity - sourceVector.interactionDensity) * (weights.interactionDensity || 0.75)
    };

    const netGain = Object.values(deltaVector).reduce((acc, val) => acc + val, 0);

    return {
      netGain: Number(netGain.toFixed(3)),
      deltaVector: Object.freeze(deltaVector),
      formatWeights: weights
    };
  }
}
