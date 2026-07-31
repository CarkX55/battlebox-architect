import { CandidateExhaustionReport } from '../../src/knowledge/compiler/CandidateExhaustionReport.js';

console.log('=== TEST: CandidateExhaustionReport & Hard Failure Diagnostic ===');

const tracker = new CandidateExhaustionReport();

tracker.recordPackageSearch({
  packageId: 'pkg_elf_ramp',
  requested: 10,
  candidatesSearched: 53,
  rejected: 43,
  accepted: 10
});

tracker.recordPackageSearch({
  packageId: 'pkg_removal',
  requested: 8,
  candidatesSearched: 5,
  rejected: 1,
  accepted: 4
});

const isFailed = tracker.hasExhaustionFailures();
const diagnostic = tracker.generateDiagnostic();

console.log(`[PASS] Has Exhaustion Failures: ${isFailed}`);
console.log(`[PASS] Diagnostic Status: ${diagnostic.status}`);
console.log(`[PASS] Diagnostic Message: ${diagnostic.diagnosticText}`);

if (!isFailed) {
  console.error('FAILED: Exhaustion expected true due to pkg_removal (accepted 4/8)');
  process.exit(1);
}

if (diagnostic.status !== 'BUILD_FAILED') {
  console.error('FAILED: Diagnostic status expected BUILD_FAILED');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
