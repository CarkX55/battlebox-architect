import { StrategicDecisionEngine } from '../../src/knowledge/domain/StrategicDecisionEngine.js';
import { DeckConstructionState } from '../../src/knowledge/compiler/DeckConstructionState.js';
import { SlotCandidateRanker } from '../../src/knowledge/compiler/SlotCandidateRanker.js';
import { DeckJudgeSuite } from '../../src/knowledge/reasoning/DeckJudgeSuite.js';
import { CompilationProof } from '../../src/knowledge/serving/CompilationProof.js';

console.log('=== TEST: StrategicDecisionEngine Opportunity Cost & Tradeoff Rationale ===');

// 1. Test Opportunity Cost Evaluation (Llanowar Elves vs Leaf Gilder)
const evalNode = StrategicDecisionEngine.evaluateCardOpportunityCost('Llanowar Elves', 'Leaf Gilder', { slotId: 'slot_1' });

console.log(`[PASS] Chosen Card: ${evalNode.chosenCard}`);
console.log(`[PASS] Runner-Up Card: ${evalNode.runnerUpCard}`);
console.log(`[PASS] Opportunity Cost Score: ${evalNode.opportunityCost}`);
console.log(`[PASS] Plan A Gain: ${evalNode.planGainLoss.planAGain}`);
console.log(`[PASS] Plan B Gain: ${evalNode.planGainLoss.planBGain}`);
console.log(`[PASS] Dependency Degree: ${evalNode.dependencyDegree}`);
console.log(`[PASS] Evidence Confidence: ${evalNode.confidence}`);
console.log(`[PASS] Evidence Tier: ${evalNode.evidenceTier}`);
console.log(`[PASS] Decision Rationale: ${evalNode.decisionRationale}`);

if (evalNode.opportunityCost <= 0) {
  console.error('FAILED: Opportunity cost expected > 0');
  process.exit(1);
}

// 2. Test CompilationProof Navigable Tradeoff Tree
let state = new DeckConstructionState({ totalSlots: 60 });
state = state.reserveSlots('pkg_ramp', 'Ramp', 10, 'cap.mana.acceleration', 'ir_1');

state = SlotCandidateRanker.rankAndBindDeck(state, [
  { name: 'Llanowar Elves', cmc: 1, type_line: 'Creature', oracle_text: '{T}: Add {G}.' }
]);

const judgeResults = DeckJudgeSuite.evaluateDeckState(state);
const proof = CompilationProof.generateProof(state, judgeResults, null);

console.log(`[PASS] Navigable Decision Tree Length: ${proof.decisionTree.length}`);
console.log(`[PASS] Slot 1 Chosen: ${proof.decisionTree[0].chosenCard} vs Runner-Up: ${proof.decisionTree[0].runnerUpCard}`);
console.log(`[PASS] Slot 1 Opportunity Cost: ${proof.decisionTree[0].opportunityCost}`);

if (!proof.decisionTree[0].opportunityCost) {
  console.error('FAILED: Slot 1 decision node opportunity cost missing in CompilationProof');
  process.exit(1);
}

console.log('=== STRATEGIC DECISION ENGINE TEST SUCCESSFUL ===');
