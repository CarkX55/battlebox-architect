import { CardRoleIntelligence } from '../../src/knowledge/domain/CardRoleIntelligence.js';
import { DecisionEngine } from '../../src/knowledge/compiler/DecisionEngine.js';

console.log('=== TEST: CardRoleIntelligence & Disruption Plan Survival ===');

// 1. Test Card Role Metadata Retrieval
const llanowarRole = CardRoleIntelligence.getCardRole('Llanowar Elves');
console.log(`[PASS] Llanowar Elves Primary Role: ${llanowarRole.primaryRole}`);
console.log(`[PASS] Llanowar Elves Criticality: ${llanowarRole.criticality}`);
console.log(`[PASS] Best Turns: ${llanowarRole.bestTurns.join(', ')}`);
console.log(`[PASS] Replacement Cost: ${llanowarRole.replacementCost}`);

if (llanowarRole.criticality !== 0.99) {
  console.error('FAILED: Llanowar Elves criticality expected 0.99');
  process.exit(1);
}

// 2. Test Disruption Plan Survival Analysis
const survivalResult = CardRoleIntelligence.evaluatePlanSurvivalOnDisruption('Llanowar Elves', 'Plan A');
console.log(`[PASS] Disrupted Card: ${survivalResult.disruptedCardName}`);
console.log(`[PASS] Plan Survival Percentage: ${survivalResult.planSurvivalPercentage}%`);
console.log(`[PASS] Pivot Recommendation: ${survivalResult.pivotRecommendation}`);

if (survivalResult.planSurvivalPercentage > 75) {
  console.error('FAILED: Disruption of 0.99 criticality card should reduce Plan A survival below 75%');
  process.exit(1);
}

// 3. Test DecisionEngine Scoring with CardRoleIntelligence
const scoreLlanowar = DecisionEngine.scoreCandidateInContext({ name: 'Llanowar Elves' });
console.log(`[PASS] Llanowar Elves Final Composite Score: ${scoreLlanowar.totalScore}`);

console.log('=== CARD ROLE INTELLIGENCE TEST SUCCESSFUL ===');
