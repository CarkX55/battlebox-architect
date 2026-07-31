/**
 * CandidateExhaustionReport.js
 * Candidate Search Exhaustion Tracker & Report Generator.
 * Tracks candidate admission per slot and emits BUILD FAILED diagnostics if candidate search exhausts.
 */

export class CandidateExhaustionReport {
  constructor() {
    this.packageReports = new Map();
  }

  recordPackageSearch({ packageId, requested, candidatesSearched, rejected, accepted }) {
    const isSatisfied = accepted >= requested;
    const report = Object.freeze({
      packageId,
      requested,
      candidatesSearched,
      rejected,
      accepted,
      status: isSatisfied ? 'SATISFIED' : 'EXHAUSTED'
    });

    this.packageReports.set(packageId, report);
    return report;
  }

  hasExhaustionFailures() {
    return Array.from(this.packageReports.values()).some(r => r.status === 'EXHAUSTED');
  }

  generateDiagnostic() {
    const failures = Array.from(this.packageReports.values()).filter(r => r.status === 'EXHAUSTED');
    if (failures.length === 0) {
      return { status: 'PASS', diagnosticText: 'All package candidate searches satisfied.' };
    }

    const failureSummary = failures.map(f => `${f.packageId} (Requested: ${f.requested}, Accepted: ${f.accepted}, Searched: ${f.candidatesSearched})`).join(', ');

    return {
      status: 'BUILD_FAILED',
      diagnosticText: `BUILD FAILED: Candidate Search Exhausted for packages: ${failureSummary}`
    };
  }
}
