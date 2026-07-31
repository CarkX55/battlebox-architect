import { ConfidenceTrajectoryTracker } from '../../src/knowledge/lifecycle/ConfidenceTrajectoryTracker.js';

console.log('=== TEST: ConfidenceTrajectoryTracker Evolution ===');

const tracker = new ConfidenceTrajectoryTracker();

tracker.recordConfidencePoint('ko_ramp_101', 'bundle_v1', 0.75);
tracker.recordConfidencePoint('ko_ramp_101', 'bundle_v2', 0.82);
tracker.recordConfidencePoint('ko_ramp_101', 'bundle_v3', 0.88);
tracker.recordConfidencePoint('ko_ramp_101', 'bundle_v4', 0.95);

const trajectory = tracker.getTrajectory('ko_ramp_101');

console.log(`[PASS] Initial Confidence: ${trajectory.initialConfidence}`);
console.log(`[PASS] Current Confidence: ${trajectory.currentConfidence}`);
console.log(`[PASS] Confidence Delta: +${trajectory.confidenceDelta}`);
console.log(`[PASS] Status: ${trajectory.status}`);

if (trajectory.currentConfidence !== 0.95) {
  console.error('FAILED: Current confidence expected 0.95');
  process.exit(1);
}

if (trajectory.status !== 'GAINING_CONFIDENCE') {
  console.error('FAILED: Expected GAINING_CONFIDENCE status');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
