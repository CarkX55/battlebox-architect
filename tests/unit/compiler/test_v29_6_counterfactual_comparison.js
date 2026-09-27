/**
 * tests/unit/compiler/test_v29_6_counterfactual_comparison.js
 * 
 * V29.6 Counterfactual Candidate Comparison & State Context Test Suite.
 * 
 * Verifies:
 * 1. AST Audit: ZERO heuristic quality score points in StateContextEvaluator (no +3 for cheap, etc.).
 * 2. 5-Context Vector Preservation: [Early, Behind, Parity, Topdeck, Constrained] without arbitrary averaging.
 * 3. Counterfactual Dominance: An efficient card defeats a slow tap-to-draw card under a tempo gameplan.
 * 4. Audit Trail Recording: Emits structured decision record with observed advantage and confidence.
 */

import fs from 'fs';
import path from 'path';
import { StateContextEvaluator } from '../../../src/services/compiler/core/stateContextEvaluator.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('══════════════════════════════════════════════════════════════════');
console.log('  TEST SUITE: V29.6 COUNTERFACTUAL CANDIDATE COMPARISON');
console.log('══════════════════════════════════════════════════════════════════\n');

// ─── TEST 1: AST AUDIT FOR ZERO HEURISTIC POINT ASSIGNMENTS ─────────────────
console.log('[Test 1] AST / Code Audit: Verifying Zero Heuristic Point Constants...');

const evaluatorPath = path.resolve(process.cwd(), 'src/services/compiler/core/stateContextEvaluator.js');
const fileContent = fs.readFileSync(evaluatorPath, 'utf8');

// Check for forbidden heuristic patterns: e.g. quality +=, score +=, roleQuality +=, + 3.0, etc.
const forbiddenPatterns = [
  /quality\s*\+=/i,
  /score\s*\+=/i,
  /roleQuality\s*\+=/i,
  /\+\s*3\.0/,
  /\+\s*2\.0/,
  /\+\s*2\.5/
];

let heuristicViolations = 0;
for (const pattern of forbiddenPatterns) {
  if (pattern.test(fileContent)) {
    console.error(`  ❌ Found forbidden heuristic pattern in stateContextEvaluator.js: ${pattern}`);
    heuristicViolations++;
  }
}

assert(heuristicViolations === 0, 'Zero heuristic quality point constants found in StateContextEvaluator.');

// ─── TEST 2: 5-CONTEXT VECTOR PRESERVATION ──────────────────────────────────
console.log('\n[Test 2] Preserving the 5-Context Vector [Early, Behind, Parity, Topdeck, Constrained]...');

const baseDeck = {
  cards: [
    { name: 'Mountain', isLand: true, quantity: 10, type_line: 'Basic Land — Mountain' },
    { name: 'Forest', isLand: true, quantity: 10, type_line: 'Basic Land — Forest' },
    { name: 'Kessig Naturalist', cmc: 2, power: 2, toughness: 2, quantity: 4, type_line: 'Creature — Human Werewolf' },
    { name: 'Outland Liberator', cmc: 2, power: 2, toughness: 2, quantity: 4, type_line: 'Creature — Human Werewolf' },
    { name: 'Tovolar, Dire Overlord', cmc: 3, power: 3, toughness: 3, quantity: 4, type_line: 'Legendary Creature — Human Werewolf' }
  ]
};

const candidateEfficient = {
  name: 'Reckless Stormseeker',
  cmc: 3,
  power: 2,
  toughness: 3,
  type_line: 'Creature — Human Werewolf',
  oracle_text: 'At the beginning of combat on your turn, target creature you control gets +1/+0 and gains haste until end of turn.'
};

const evalResult = StateContextEvaluator.evaluateCandidateInContexts(baseDeck, candidateEfficient, {
  strategicTempo: 'TEMPO',
  primaryTribe: 'Werewolf'
}, { sampleSize: 50 });

assert(evalResult.contextVector !== undefined, 'Returned context vector.');
assert(typeof evalResult.contextVector.early === 'number', 'Early context measured.');
assert(typeof evalResult.contextVector.behind === 'number', 'Behind context measured.');
assert(typeof evalResult.contextVector.parity === 'number', 'Parity context measured.');
assert(typeof evalResult.contextVector.topdeck === 'number', 'Topdeck context measured.');
assert(typeof evalResult.contextVector.constrained === 'number', 'Constrained context measured.');

// ─── TEST 3: COUNTERFACTUAL COMPARISON (EFFICIENT VS SLOW TAP-TO-DRAW) ───────
console.log('\n[Test 3] Counterfactual Dominance: Efficient Threat vs Slow Tap-to-Draw...');

// Slow 4-mana tap-to-draw artifact (causally valid for CARD_FLOW, but terrible in tempo)
const candidateSlowDraw = {
  name: 'Jayemdae Tome',
  cmc: 4,
  power: 0,
  toughness: 0,
  type_line: 'Artifact',
  oracle_text: '{4}, {T}: Draw a card.'
};

const comparison = StateContextEvaluator.compareCounterfactuals(
  baseDeck,
  candidateEfficient,
  candidateSlowDraw,
  { strategicTempo: 'TEMPO', primaryTribe: 'Werewolf' },
  { sampleSize: 50, decisionPoint: 'TURN_3_PLAY' }
);

assert(comparison.winner.name === 'Reckless Stormseeker', `Counterfactual winner is Reckless Stormseeker (found ${comparison.winner.name}).`);
assert(comparison.loser.name === 'Jayemdae Tome', 'Slow tap-to-draw Tome is defeated counterfactually.');
assert(comparison.audit.contextDeltas.early >= 0, 'Reckless Stormseeker dominates in early tempo.');
assert(comparison.audit.confidence >= 0.6, `Decision made with statistical confidence (${comparison.audit.confidence}).`);

// ─── TEST 4: AUDIT TRAIL RECORDING ──────────────────────────────────────────
console.log('\n[Test 4] Structured Counterfactual Audit Trail Verification...');

assert(comparison.audit.decisionPoint === 'TURN_3_PLAY', 'Audit trail records decision point.');
assert(comparison.audit.winner === 'Reckless Stormseeker', 'Audit trail records winner.');
assert(Array.isArray(comparison.audit.alternatives) && comparison.audit.alternatives.includes('Jayemdae Tome'), 'Audit trail records alternatives.');
assert(comparison.audit.observedAdvantage.dominantContextsWon >= 2, 'Audit trail proves multi-context dominance.');

console.log('\n══════════════════════════════════════════════════════════════════');
console.log(`  V29.6 COUNTERFACTUAL TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('══════════════════════════════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
