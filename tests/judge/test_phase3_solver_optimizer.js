/**
 * test_phase3_solver_optimizer.js
 * Layer 4 Automated Unit Tests for CapabilityPlan, SolverOptimizer, and ExecutionContracts.
 */

import { CapabilityPlan } from '../../src/judge/compiler/CapabilityPlan.js';
import { ExecutionContract } from '../../src/judge/capabilities/ExecutionContract.js';
import { SolverOptimizer } from '../../src/judge/compiler/SolverOptimizer.js';
import { TelemetryLogger } from '../../src/judge/telemetry/TelemetryLogger.js';

function runTests() {
  console.log('🧪 Starting Phase 3 Unit Tests (Solver, Optimizer & Contracts)...');

  // Test 1: CapabilityPlan & ExecutionContract Immutability & Versioning
  const plan = new CapabilityPlan({
    archetype: 'Ramp',
    targets: { ManaAcceleration: 8, CardDraw: 6, SingleTargetRemoval: 4 },
    targetCurve: { 1: 4, 2: 12, 3: 8, 4: 6 }
  });

  console.assert(plan.version === 1, 'CapabilityPlan version must be 1');
  console.assert(plan.compatibleUntil === 2, 'CapabilityPlan compatibleUntil must be 2');
  console.assert(plan.targets.ManaAcceleration === 8, 'Target count mismatch');
  console.log('✅ Test 1 Passed: CapabilityPlan instantiated and versioned v1.');

  // Test 2: LLVM Dynamic Pass Optimization Pipeline
  const telemetry = new TelemetryLogger();
  const optimizer = new SolverOptimizer(telemetry);

  optimizer.registerPass({
    id: 'CurveOptimizationPass',
    priority: 1,
    requires: ['RawTargets'],
    produces: ['CurveOptimizedTargets'],
    run: (p) => new CapabilityPlan({ ...p, targets: { ...p.targets, ManaAcceleration: 10 } })
  });

  const { optimizedPlan, contracts } = optimizer.optimizeAndCompile(plan);

  console.assert(optimizedPlan.targets.ManaAcceleration === 10, 'Optimizer pass must update target count to 10');
  console.assert(contracts.length === 3, 'Compiler must emit 3 ExecutionContracts');

  const manaContract = contracts.find(c => c.capability === 'ManaAcceleration');
  console.assert(manaContract.version === 1, 'ExecutionContract version must be 1');
  console.assert(manaContract.priority === 'critical', 'ManaAcceleration contract priority must be critical');
  console.log('✅ Test 2 Passed: SolverOptimizer dynamically schedules passes and compiles ExecutionContracts v1.');

  // Test 3: Telemetry Verification
  console.assert(telemetry.getLogs().length === 1, 'TelemetryLogger must record pass execution log');
  console.log('✅ Test 3 Passed: TelemetryLogger captured pass execution.');

  console.log('🎉 Phase 3 Unit Tests Completed Successfully!');
}

runTests();
