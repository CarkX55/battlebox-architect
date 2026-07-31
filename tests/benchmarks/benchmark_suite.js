import { KnowledgeCompiler } from '../../src/knowledge/compiler/KnowledgeCompiler.js';
import { StrategicPlanner } from '../../src/knowledge/planner/StrategicPlanner.js';
import { StrategyIRBuilder } from '../../src/knowledge/compiler/StrategyIRBuilder.js';
import { ConstraintSolver } from '../../src/knowledge/reasoning/ConstraintSolver.js';

console.log('=== BENCHMARK SUITE: BattleBox Knowledge Platform ===');

async function runBenchmarks() {
  // Benchmark 1: Knowledge Compiler Pass Time
  const compiler = new KnowledgeCompiler();
  const mockCards = Array.from({ length: 500 }, (_, i) => ({
    id: `card_${i}`,
    name: `Card ${i}`,
    cmc: (i % 6) + 1,
    typeLine: 'Creature',
    oracleText: '{T}: Add {G}. Draw a card.'
  }));

  const t0 = Date.now();
  const bundle = await compiler.compile(mockCards);
  const t1 = Date.now();
  console.log(`[BENCHMARK] Knowledge Compiler (500 Cards Ingestion & Precomputation): ${t1 - t0} ms (Target: < 500ms)`);

  // Benchmark 2: Strategy IR Generation Time
  const t2 = Date.now();
  const plan = StrategicPlanner.createPlanFromIntent('RAMP');
  const strategyIR = StrategyIRBuilder.buildFromPlan(plan);
  const t3 = Date.now();
  console.log(`[BENCHMARK] Strategy IR Generation: ${t3 - t2} ms (Target: < 10ms)`);

  // Benchmark 3: Constraint Solver Execution Time
  const t4 = Date.now();
  const solverResult = ConstraintSolver.solve(strategyIR, mockCards.slice(0, 60));
  const t5 = Date.now();
  console.log(`[BENCHMARK] Constraint Solver Repair Pass: ${t5 - t4} ms (Target: < 20ms)`);

  console.log('=== ALL BENCHMARKS COMPLETED SUCCESSFULLY ===');
}

runBenchmarks().catch(console.error);
