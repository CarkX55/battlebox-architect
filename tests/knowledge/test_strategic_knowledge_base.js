import { StrategicKnowledgeBase } from '../../src/knowledge/domain/StrategicKnowledgeBase.js';
import { CompetitiveMetaBenchmark } from '../../src/knowledge/meta/CompetitiveMetaBenchmark.js';
import { DeckConstructionState } from '../../src/knowledge/compiler/DeckConstructionState.js';
import { SlotCandidateRanker } from '../../src/knowledge/compiler/SlotCandidateRanker.js';

console.log('=== TEST: StrategicKnowledgeBase & External Pro Tour Meta Benchmark ===');

// 1. Test Tempo Valuation (T1 Dork > T2 Dork)
const llanowarScore = StrategicKnowledgeBase.evaluateTempoScore('Llanowar Elves');
const leafGilderScore = StrategicKnowledgeBase.evaluateTempoScore('Leaf Gilder');

console.log(`[PASS] Llanowar Elves (T1 Dork) Tempo Score: ${llanowarScore}`);
console.log(`[PASS] Leaf Gilder (T2 Dork) Tempo Score: ${leafGilderScore}`);

if (llanowarScore <= leafGilderScore) {
  console.error('FAILED: T1 Dork expected to score higher tempo valuation than T2 Dork');
  process.exit(1);
}

// 2. Test Collected Company 28+ Creature Threshold Evaluator
const deckWithCoCo28 = Array.from({ length: 28 }, (_, i) => ({
  name: `Creature #${i + 1}`,
  type_line: 'Creature — Elf',
  cmc: 2
}));

const cocoEvalPass = StrategicKnowledgeBase.evaluateCoCoCompliance(deckWithCoCo28);
console.log(`[PASS] CoCo Engine Evaluation (28 Creatures): ${cocoEvalPass.rating}`);

if (!cocoEvalPass.passes) {
  console.error('FAILED: Expected CoCo evaluation to pass with 28 creatures');
  process.exit(1);
}

// 3. Test External Pro Tour Deck Benchmark
let state = new DeckConstructionState({ totalSlots: 60 });
state = state.reserveSlots('pkg_ramp', 'Ramp', 10, 'cap.mana.acceleration', 'ir_1');
state = state.reserveSlots('pkg_lands', 'Land', 24, 'cap.mana.source', 'ir_2');
state = state.reserveSlots('pkg_threats', 'Threat', 26, 'cap.threat', 'ir_3');

const pool = [
  { name: 'Delighted Halfling', cmc: 1, type_line: 'Creature', oracle_text: '{T}: Add {C}.' },
  { name: 'Topiary Stomper', cmc: 3, type_line: 'Creature', oracle_text: 'Search for a land.' },
  { name: 'Forest', cmc: 0, type_line: 'Basic Land', oracle_text: '{T}: Add {G}.' }
];

state = SlotCandidateRanker.rankAndBindDeck(state, pool);

const benchmark = CompetitiveMetaBenchmark.benchmarkDeckAgainstTournamentMeta(state, 'SELESNYA_RAMP_STANDARD');

console.log(`[PASS] Pro Tour Reference Deck: ${benchmark.referenceDeckName}`);
console.log(`[PASS] Core Overlap Percentage: ${benchmark.coreOverlapPercentage}%`);
console.log(`[PASS] Curve Alignment Score: ${benchmark.curveAlignmentScore}%`);
console.log(`[PASS] Rating: ${benchmark.rating}`);

if (benchmark.coreOverlapPercentage < 20) {
  console.error('FAILED: Core overlap expected > 20%');
  process.exit(1);
}

console.log('=== STRATEGIC KNOWLEDGE BASE TEST SUCCESSFUL ===');
