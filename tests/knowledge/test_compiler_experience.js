import { CompilerExperienceMemory } from '../../src/knowledge/lifecycle/CompilerExperienceMemory.js';

console.log('=== TEST: CompilerExperienceMemory Persistent Failure Patterns ===');

const memory = new CompilerExperienceMemory();

memory.recordFailurePattern({
  archetype: 'Domain Ramp',
  condition: 'Acceleration < 8',
  failureRate: 0.73,
  trialCount: 1000
});

const failureRate = memory.getFailureRate('Domain Ramp', 'Acceleration < 8');
console.log(`[PASS] Failure Rate Retreived: ${(failureRate * 100).toFixed(0)}%`);

const highRisk = memory.listHighRiskPatterns(0.50);
console.log(`[PASS] High Risk Patterns Count: ${highRisk.length}`);

if (failureRate !== 0.73) {
  console.error('FAILED: Failure rate expected 0.73');
  process.exit(1);
}

if (highRisk.length !== 1) {
  console.error('FAILED: High risk patterns count expected 1');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
