import { FeaturePipeline } from '../../src/knowledge/fusion/FeaturePipeline.js';

console.log('=== TEST: Extensible Dynamic Feature Vector Pipeline ===');

const mockCard = {
  name: 'Lightning Bolt',
  cmc: 1,
  oracleText: 'Lightning Bolt deals 3 damage to any target.',
  colors: ['R']
};

const vector = FeaturePipeline.extractFeatures(mockCard);

console.log(`[PASS] Tempo Score: ${vector.tempo}`);
console.log(`[PASS] Interaction Density: ${vector.interactionDensity}`);
console.log(`[PASS] Extension - Graveyard Resilience: ${vector.extensions.graveyardResilience}`);

if (vector.interactionDensity !== 0.90) {
  console.error('FAILED: Interaction Density score expected 0.90');
  process.exit(1);
}

if (typeof vector.extensions.graveyardResilience === 'undefined') {
  console.error('FAILED: Extension graveyardResilience is missing');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
