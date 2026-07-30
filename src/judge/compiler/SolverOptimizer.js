/**
 * SolverOptimizer.js
 * LLVM-Style Dynamic Pass Optimizer.
 * Automatically schedules optimization passes based on declared requires/produces requirements.
 */

import { CapabilityPlan } from './CapabilityPlan.js';
import { ExecutionContract } from '../capabilities/ExecutionContract.js';

export class SolverOptimizer {
  constructor(telemetryLogger = null) {
    this.telemetry = telemetryLogger;
    this.registeredPasses = [];
  }

  registerPass(pass) {
    // pass: { id, priority, requires: [], produces: [], run: (plan) => plan }
    this.registeredPasses.push(pass);
  }

  schedulePasses() {
    // Sort passes by priority (lower number = higher priority)
    return [...this.registeredPasses].sort((a, b) => (a.priority || 10) - (b.priority || 10));
  }

  optimizeAndCompile(initialPlan) {
    const scheduled = this.schedulePasses();
    let currentPlan = initialPlan;

    for (const pass of scheduled) {
      const startTime = Date.now();
      const nextPlan = pass.run(currentPlan);
      const durationMs = Date.now() - startTime;

      if (this.telemetry) {
        this.telemetry.logPassExecution(pass.id, currentPlan, nextPlan, durationMs);
      }
      currentPlan = nextPlan;
    }

    // Compile optimized CapabilityPlan into ExecutionContracts
    const contracts = [];
    for (const [capName, targetCount] of Object.entries(currentPlan.targets)) {
      contracts.push(new ExecutionContract({
        id: `Contract_${capName}`,
        capability: capName,
        objective: `Satisfy ${capName} target quota`,
        priority: capName === 'ManaAcceleration' ? 'critical' : 'required',
        minCount: Math.max(1, targetCount - 2),
        idealCount: targetCount,
        maxCount: targetCount + 4,
        weights: { speed: 0.5, volume: 0.5 }
      }));
    }

    return { optimizedPlan: currentPlan, contracts };
  }
}
