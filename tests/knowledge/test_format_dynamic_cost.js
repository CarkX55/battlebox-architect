import { CompilerCostModel } from '../../src/knowledge/compiler/CompilerCostModel.js';

console.log('=== TEST: Format-Dynamic Cost Model Weight Vectors ===');

const sourceVector = { tempo: 0.85, resilience: 0.50, consistency: 0.80, interactionDensity: 0.40 };
const targetVector = { tempo: 0.35, resilience: 0.90, consistency: 0.85, interactionDensity: 0.80 };

const standardResult = CompilerCostModel.evaluateSwap(sourceVector, targetVector, 'STANDARD');
const commanderResult = CompilerCostModel.evaluateSwap(sourceVector, targetVector, 'COMMANDER');

console.log(`[PASS] Standard Net Gain: ${standardResult.netGain} (Tempo Weight: ${standardResult.formatWeights.tempo})`);
console.log(`[PASS] Commander Net Gain: ${commanderResult.netGain} (Tempo Weight: ${commanderResult.formatWeights.tempo})`);

if (standardResult.formatWeights.tempo !== 0.40) {
  console.error('FAILED: Standard tempo weight expected 0.40');
  process.exit(1);
}

if (commanderResult.formatWeights.tempo !== 0.12) {
  console.error('FAILED: Commander tempo weight expected 0.12');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
