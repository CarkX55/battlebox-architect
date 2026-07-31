import { DeckContract } from '../../src/knowledge/compiler/DeckContract.js';

console.log('=== TEST: DeckContract Master Specification ===');

const contract = new DeckContract({
  requiredCards: 60,
  requiredLands: 24,
  requiredRamp: 10,
  requiredInteraction: 8,
  requiredDraw: 8
});

console.log(`[PASS] Required Cards: ${contract.requiredCards}`);
console.log(`[PASS] Required Lands: ${contract.requiredLands}`);
console.log(`[PASS] Required Ramp: ${contract.requiredRamp}`);

if (contract.requiredCards !== 60) {
  console.error('FAILED: Required cards expected 60');
  process.exit(1);
}

if (contract.requiredLands !== 24) {
  console.error('FAILED: Required lands expected 24');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
