import { CapabilityPlanner } from '../../src/knowledge/planner/CapabilityPlanner.js';

console.log('=== TEST: CapabilityPlanner Abstract Capability Sets ===');

const plan = CapabilityPlanner.planCapabilitiesFromIntent('INCREMENTAL_VALUE');

console.log(`[PASS] User Goal: ${plan.userGoal}`);
console.log(`[PASS] Required Capabilities Count: ${plan.requiredCapabilities.length}`);
console.log(`[PASS] Required Capability: ${plan.requiredCapabilities[0]}`);

if (plan.requiredCapabilities.length !== 4) {
  console.error('FAILED: Expected 4 required capabilities');
  process.exit(1);
}

if (plan.requiredCapabilities[0] !== 'cap.card.draw') {
  console.error('FAILED: Expected cap.card.draw as first capability');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
