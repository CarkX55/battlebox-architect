import { MetaEvolutionEngine } from '../../src/knowledge/meta/MetaEvolutionEngine.js';

console.log('=== TEST: MetaEvolutionEngine Time-Series Tracking ===');

const engine = new MetaEvolutionEngine();

engine.recordSnapshot('week_30', [
  { name: 'Selesnya Ramp', metaShare: 0.12, winrate: 0.54 },
  { name: 'Mono Red Aggro', metaShare: 0.25, winrate: 0.58 }
]);

engine.recordSnapshot('week_31', [
  { name: 'Selesnya Ramp', metaShare: 0.18, winrate: 0.57 },
  { name: 'Mono Red Aggro', metaShare: 0.20, winrate: 0.52 }
]);

const trajectory = engine.getArchetypeTrajectory('Selesnya Ramp');
console.log(`[PASS] Selesnya Ramp Snapshot Points Count: ${trajectory.length}`);

const shifts = engine.detectMetaShifts('week_31', 'week_30');
console.log(`[PASS] Detected Meta Shifts Count: ${shifts.shifts.length}`);
console.log(`[PASS] Selesnya Ramp Trend: ${shifts.shifts[0].trend} (Share Delta: +${shifts.shifts[0].shareDelta})`);

if (shifts.shifts.length !== 2) {
  console.error('FAILED: Expected 2 shifts detected');
  process.exit(1);
}

if (shifts.shifts[0].trend !== 'RISING') {
  console.error('FAILED: Selesnya Ramp trend expected RISING');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
