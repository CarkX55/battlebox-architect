/**
 * CompilerCostModel.js
 * Multidimensional Compiler Cost Model Vector Evaluator.
 */

export class CompilerCostModel {
  static evaluateSwap(sourceVector, targetVector) {
    if (!sourceVector || !targetVector) {
      return { netGain: 0, deltaVector: {} };
    }

    const deltaVector = {
      tempo: targetVector.tempo - sourceVector.tempo,
      resilience: targetVector.resilience - sourceVector.resilience,
      consistency: targetVector.consistency - sourceVector.consistency,
      redundancy: targetVector.redundancy - sourceVector.redundancy,
      manaEfficiency: targetVector.manaEfficiency - sourceVector.manaEfficiency,
      colorPressure: targetVector.colorPressure - sourceVector.colorPressure,
      drawQuality: targetVector.drawQuality - sourceVector.drawQuality,
      interactionDensity: targetVector.interactionDensity - sourceVector.interactionDensity,
      closingSpeed: targetVector.closingSpeed - sourceVector.closingSpeed,
      recovery: targetVector.recovery - sourceVector.recovery,
      explosiveness: targetVector.explosiveness - sourceVector.explosiveness,
      fragility: targetVector.fragility - sourceVector.fragility
    };

    const netGain = Object.values(deltaVector).reduce((acc, val) => acc + val, 0);

    return {
      netGain: Number(netGain.toFixed(3)),
      deltaVector: Object.freeze(deltaVector)
    };
  }
}
