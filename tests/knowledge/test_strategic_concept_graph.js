import { StrategicConceptGraph, STRATEGIC_CONCEPTS } from '../../src/knowledge/domain/StrategicConceptGraph.js';
import { InteractiveNodeRecompiler } from '../../src/knowledge/compiler/InteractiveNodeRecompiler.js';
import { StrategicBenchmarkSuite } from '../../src/knowledge/meta/StrategicBenchmarkSuite.js';
import { DeckConstructionState } from '../../src/knowledge/compiler/DeckConstructionState.js';

console.log('=== TEST: Strategic Concept Graph, Sub-Node Recompiler & 500-Scenario Benchmark ===');

// 1. Test Strategic Concept Graph Vector Mapping
const llanowarVector = StrategicConceptGraph.getCardConceptVector('Llanowar Elves');
console.log(`[PASS] Llanowar Elves Concept Vector: ${llanowarVector.join(', ')}`);

const sheoldredVector = StrategicConceptGraph.getCardConceptVector('Sheoldred, the Apocalypse');
console.log(`[PASS] Sheoldred Concept Vector: ${sheoldredVector.join(', ')}`);

if (!llanowarVector.includes(STRATEGIC_CONCEPTS.TEMPO)) {
  console.error('FAILED: Expected Llanowar Elves to include TEMPO concept');
  process.exit(1);
}

// 2. Test Interactive Node Recompiler
let state = new DeckConstructionState({ totalSlots: 60 });
state = state.reserveSlots('pkg_removal', 'Removal', 4, 'cap.removal', 'ir_1');

const recompileResult = InteractiveNodeRecompiler.recompileSubNode(state, 'pkg_removal', 'Heavy Mono-Red Aggro Meta');
console.log(`[PASS] Recompiled Node ID: ${recompileResult.targetNodeId}`);
console.log(`[PASS] Recompiled Slots Count: ${recompileResult.recompiledSlotsCount}`);
console.log(`[PASS] Updated Card Choice: ${recompileResult.updatedCardChoice}`);
console.log(`[PASS] Explanation: ${recompileResult.explanation}`);

if (recompileResult.recompiledSlotsCount !== 4) {
  console.error('FAILED: Expected 4 removal slots to be recompiled');
  process.exit(1);
}

// 3. Test 500-Scenario Strategic Benchmark Suite
const benchmark = StrategicBenchmarkSuite.runBenchmarkBattery(500);
console.log(`[PASS] Scenarios Evaluated: ${benchmark.scenariosEvaluated}`);
console.log(`[PASS] Contract Compliance Rate: ${benchmark.contractComplianceRate}`);
console.log(`[PASS] Format Legality Rate: ${benchmark.formatLegalityRate}`);
console.log(`[PASS] Strategic Cohesion: ${benchmark.strategicCohesionPercentage}`);
console.log(`[PASS] Pro Tournament Alignment: ${benchmark.proTournamentAlignmentPercentage}`);
console.log(`[PASS] Local Search Win-Rate Gain: ${benchmark.localSearchWinRateGain}`);

if (benchmark.contractComplianceRate !== '100.0%') {
  console.error('FAILED: Contract compliance rate expected to be 100.0%');
  process.exit(1);
}

console.log('=== STRATEGIC CONCEPT GRAPH & BENCHMARK TEST SUCCESSFUL ===');
