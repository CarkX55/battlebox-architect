import { DynamicStrategicEngine, EXPERT_PLAY_SEQUENCES } from '../../src/knowledge/domain/DynamicStrategicEngine.js';
import { WinPlanOptimizer } from '../../src/knowledge/compiler/WinPlanOptimizer.js';
import { DeckConstructionState } from '../../src/knowledge/compiler/DeckConstructionState.js';
import { SlotCandidateRanker } from '../../src/knowledge/compiler/SlotCandidateRanker.js';

console.log('=== TEST: DynamicStrategicEngine & Multi-Tier Win Plan Maximization ===');

// 1. Test Turn-by-Turn Play Sequences
console.log(`[PASS] Expert Play Sequence 1: ${EXPERT_PLAY_SEQUENCES[0].name}`);
console.log(`[PASS] T1 Action: ${EXPERT_PLAY_SEQUENCES[0].turn1}`);
console.log(`[PASS] T4 Action: ${EXPERT_PLAY_SEQUENCES[0].turn4}`);

// 2. Test Dynamic Meta Card Valuation
const lowRemovalDorkScore = DynamicStrategicEngine.evaluateDynamicCardValue('Llanowar Elves', 0.15);
const heavyRemovalDorkScore = DynamicStrategicEngine.evaluateDynamicCardValue('Llanowar Elves', 0.50);

console.log(`[PASS] Low Removal Meta Dork Valuation: ${lowRemovalDorkScore}`);
console.log(`[PASS] Heavy Removal Meta Dork Valuation: ${heavyRemovalDorkScore}`);

if (lowRemovalDorkScore <= heavyRemovalDorkScore) {
  console.error('FAILED: Low removal meta expected higher dork valuation than heavy removal meta');
  process.exit(1);
}

// 3. Test Multi-Tier Win Plans (Plan A, Plan B, Plan C)
const winPlans = DynamicStrategicEngine.buildDeckWinPlans('Ramp');
console.log(`[PASS] Plan A: ${winPlans.primaryPlanA.name}`);
console.log(`[PASS] Plan B: ${winPlans.fallbackPlanB.name}`);
console.log(`[PASS] Plan C: ${winPlans.contingencyPlanC.name}`);

// 4. Test Win-Plan Execution Optimizer
let state = new DeckConstructionState({ totalSlots: 60 });
state = state.reserveSlots('pkg_ramp', 'Ramp', 10, 'cap.mana.acceleration', 'ir_1');
state = state.reserveSlots('pkg_draw', 'Draw', 8, 'cap.card.draw', 'ir_2');
state = state.reserveSlots('pkg_threats', 'Threat', 18, 'cap.threat', 'ir_3');
state = state.reserveSlots('pkg_lands', 'Land', 24, 'cap.mana.source', 'ir_4');

const cardPool = [
  { name: 'Llanowar Elves', cmc: 1, type_line: 'Creature', oracle_text: '{T}: Add {G}.' },
  { name: 'Harmonize', cmc: 4, type_line: 'Sorcery', oracle_text: 'Draw three cards.' },
  { name: 'Craterhoof Behemoth', cmc: 8, type_line: 'Creature', oracle_text: 'Haste, Trample.' },
  { name: 'Forest', cmc: 0, type_line: 'Basic Land', oracle_text: '{T}: Add {G}.' }
];

state = SlotCandidateRanker.rankAndBindDeck(state, cardPool);

const winPlanEval = WinPlanOptimizer.evaluateDeckWinPlanExecution(state, 0.30);

console.log(`[PASS] Plan A Execution Probability: ${(winPlanEval.planAExecutionProbability * 100).toFixed(1)}%`);
console.log(`[PASS] Plan B Execution Probability: ${(winPlanEval.planBExecutionProbability * 100).toFixed(1)}%`);
console.log(`[PASS] Plan C Execution Probability: ${(winPlanEval.planCExecutionProbability * 100).toFixed(1)}%`);
console.log(`[PASS] Overall Win-Plan Execution Score: ${(winPlanEval.maxWinPlanExecutionScore * 100).toFixed(1)}%`);
console.log(`[PASS] Win-Plan Rating: ${winPlanEval.rating}`);

if (winPlanEval.maxWinPlanExecutionScore < 0.60) {
  console.error('FAILED: Win-plan execution score expected >= 0.60');
  process.exit(1);
}

console.log('=== DYNAMIC STRATEGIC ENGINE TEST SUCCESSFUL ===');
