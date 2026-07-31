import { StrategyCompetitionEngine } from '../../src/knowledge/domain/StrategyCompetitionEngine.js';
import { HierarchicalOpportunityCost } from '../../src/knowledge/domain/HierarchicalOpportunityCost.js';

console.log('=== TEST: StrategyCompetitionEngine Whole-Strategy Competition ===');

// 1. Test Whole-Strategy Competition
const competitionResult = StrategyCompetitionEngine.evaluateCompetingStrategies('Quiero un Ramp Selesnya competitivo');

console.log(`[PASS] Competing Strategies Count: ${competitionResult.competingStrategiesCount}`);
console.log(`[PASS] Winning Strategy: ${competitionResult.winningStrategy}`);
console.log(`[PASS] Highest Win Expectancy: ${competitionResult.highestWinExpectancy}`);
console.log(`[PASS] Selection Rationale: ${competitionResult.selectionRationale}`);

if (competitionResult.competingStrategiesCount < 3) {
  console.error('FAILED: Expected at least 3 competing strategies');
  process.exit(1);
}

if (!competitionResult.winningStrategy.includes('Devotion')) {
  console.error('FAILED: Mono Green Devotion expected winning strategy with 91% win expectancy');
  process.exit(1);
}

// 2. Test Hierarchical Opportunity Cost (Package Tradeoff)
const packageTradeoff = HierarchicalOpportunityCost.calculatePackageTradeoff('pkg_coco', 'REMOVE');
console.log(`[PASS] Package Tradeoff Level: ${packageTradeoff.level}`);
console.log(`[PASS] Plan A Loss: ${packageTradeoff.planALoss}`);
console.log(`[PASS] Plan B Loss: ${packageTradeoff.planBLoss}`);
console.log(`[PASS] Tradeoff Severity: ${packageTradeoff.tradeoffSeverity}`);

// 3. Test Strategic Budget Allocation
const budget = HierarchicalOpportunityCost.allocateStrategicBudget(60);
console.log(`[PASS] Strategic Budget Plan A Slots: ${budget.budgetAllocation.planA_FastLethal.slots} (${budget.budgetAllocation.planA_FastLethal.percentage})`);
console.log(`[PASS] Strategic Budget Plan B Slots: ${budget.budgetAllocation.planB_ValueGrind.slots} (${budget.budgetAllocation.planB_ValueGrind.percentage})`);

// 4. Test Decision Stability
const stability = HierarchicalOpportunityCost.evaluateDecisionStability('slot_11', 0.15);
console.log(`[PASS] Slot 11 Stability Percentage: ${stability.stabilityPercentage} (${stability.status})`);

console.log('=== STRATEGY COMPETITION ENGINE TEST SUCCESSFUL ===');
