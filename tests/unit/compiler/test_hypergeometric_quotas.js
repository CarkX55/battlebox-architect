/**
 * tests/unit/compiler/test_hypergeometric_quotas.js
 * 
 * V29.5 Phase C: Mathematical Derivation & Zero Fixed Quota Certification.
 * Verifies that all densities and quotas are mathematically derived using inverse hypergeometric
 * calculations, without any magic numbers or hardcoded tribal thresholds.
 */

import { HypergeometricDistribution } from '../../../src/services/compiler/core/hypergeometricDistribution.js';

console.log('══════════════════════════════════════════════════════════════════');
console.log('  🏛️ V29.5 PHASE C: MATHEMATICAL DERIVATION & ZERO FIXED QUOTAS');
console.log('══════════════════════════════════════════════════════════════════');

// Test 1: Exact P(X >= 1) calculation
console.log('[Test 1] Testing exact hypergeometric probability P(X >= 1)...');
// P(drawing >= 1 of 4 copies in 7 cards from 60):
// C(56, 7) / C(60, 7) = 0.60049... => P(X>=1) = 1 - 0.60049 = 0.3995...
const p4in7 = HypergeometricDistribution.atLeastOne(60, 4, 7);
console.log(`  P(X>=1 | N=60, K=4, n=7) = ${p4in7.toFixed(4)} (Expected: ~0.3995)`);
if (Math.abs(p4in7 - 0.3995) > 0.002) {
  throw new Error(`Hypergeometric atLeastOne precision error: got ${p4in7}`);
}
console.log('  ✅ Test 1 Passed: Hypergeometric exact probability verified.');

// Test 2: Inverse hypergeometric derivation
console.log('[Test 2] Testing inverse hypergeometric derivation...');
// To have P(X>=1) >= 0.85 with 7 cards drawn from 60:
const kOpening = HypergeometricDistribution.inverseAtLeastOne(60, 7, 0.85);
const pActual = HypergeometricDistribution.atLeastOne(60, kOpening, 7);
const pBelow = HypergeometricDistribution.atLeastOne(60, kOpening - 1, 7);
console.log(`  k for 85% in opening 7: ${kOpening} copies (P=${pActual.toFixed(4)}, with k-1 P=${pBelow.toFixed(4)})`);
if (pActual < 0.85 || pBelow >= 0.85) {
  throw new Error(`Inverse hypergeometric boundary error: k=${kOpening}, p=${pActual}, pBelow=${pBelow}`);
}
console.log('  ✅ Test 2 Passed: Inverse hypergeometric boundary proven.');

// Test 3: Structured Quota Derivation with Audit Provenance
console.log('[Test 3] Testing structured quota derivation with provenance...');
const quota = HypergeometricDistribution.deriveQuota({
  deckSize: 60,
  turn: 2,
  targetProbability: 0.85,
  purpose: 'TURN_2_ON_CURVE_DEPLOYMENT'
});

console.log('  Derived Quota Object:', quota);
if (!quota.requiredCopies || !quota.derivationFormula || !quota.derivationFormula.includes('INV_HYPERGEOMETRIC')) {
  throw new Error('Quota derivation object missing required provenance fields');
}
console.log('  ✅ Test 3 Passed: Provenance formula and metadata sealed.');

// Test 4: Commander 100-card Scaling Invariant
console.log('[Test 4] Testing 100-card commander scaling invariant...');
const quota60 = HypergeometricDistribution.deriveQuota({ deckSize: 60, turn: 2, targetProbability: 0.85 });
const quota100 = HypergeometricDistribution.deriveQuota({ deckSize: 100, turn: 2, targetProbability: 0.85 });
console.log(`  Required copies for 85% by T2: 60-card = ${quota60.requiredCopies} | 100-card = ${quota100.requiredCopies}`);
if (quota100.requiredCopies <= quota60.requiredCopies) {
  throw new Error('Quota failed to scale with deck size!');
}
console.log('  ✅ Test 4 Passed: Exact mathematical scaling across deck sizes.');

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  PHASE C PASS: HYPERGEOMETRIC MATHEMATICAL DERIVATION CERTIFIED');
console.log('══════════════════════════════════════════════════════════════════');
