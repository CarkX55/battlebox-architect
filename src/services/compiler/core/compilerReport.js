/**
 * src/services/compiler/core/compilerReport.js
 * 
 * CompilerReport: Single Public UI & Audit Contract v1.0.
 * Consolidated compilation summary consumed by the UI.
 */

export class CompilerReport {
  constructor({
    intentPackage = null,
    capabilityPlan = null,
    allocationState = null,
    deckState = null,
    fitnessReport = null,
    auditReport = null,
    telemetry = null,
    residualVector = null,
    rejectedEvidence = [],
    compilerConfidence = 100,
    optimizationDistance = 0
  } = {}) {
    this.intentPackage = intentPackage ? intentPackage.toJSON() : null;
    this.capabilityPlan = capabilityPlan ? capabilityPlan.toJSON() : null;
    this.allocationState = allocationState ? allocationState.getPackageSummaries() : [];
    this.deckState = deckState ? deckState.toJSON() : null;
    this.fitnessReport = fitnessReport || null;
    this.auditReport = auditReport || null;
    this.telemetry = telemetry || null;
    this.residualVector = residualVector || null;
    this.rejectedEvidence = Object.freeze([...rejectedEvidence]);

    this.compilerConfidence = compilerConfidence;
    this.optimizationDistance = optimizationDistance;

    // Explainability summary
    this.explainability = Object.freeze({
      topDecisions: this._buildTopDecisions(allocationState),
      topConflicts: this._buildTopConflicts(auditReport),
      topCompromises: this._buildTopCompromises(residualVector)
    });

    Object.freeze(this);
  }

  /**
   * Helper to build top decisions list for explainability.
   * @private
   */
  _buildTopDecisions(allocationState) {
    if (!allocationState || !allocationState.packages) return [];
    return allocationState.packages
      .filter(p => p.winnerCard && !p.winnerCard.startsWith('[Pending'))
      .slice(0, 5)
      .map(p => `Allocated ${p.copies}x "${p.winnerCard}" for role [${p.role}] (${p.rationale || 'Core package'})`);
  }

  /**
   * Helper to build top conflicts list for explainability.
   * @private
   */
  _buildTopConflicts(auditReport) {
    if (!auditReport || !auditReport.violations) return [];
    return auditReport.violations.map(v => `${v.type}: ${v.detail}`);
  }

  /**
   * Helper to build top compromises list for explainability.
   * @private
   */
  _buildTopCompromises(residualVector) {
    if (!residualVector || !residualVector.deltas) return [];
    return residualVector.deltas
      .filter(d => !d.satisfied)
      .map(d => `Axis [${d.id}]: Target ${d.target}, achieved ${d.achieved} (residual ${d.residual})`);
  }

  toJSON() {
    return {
      compilerConfidence: this.compilerConfidence,
      optimizationDistance: this.optimizationDistance,
      intentPackage: this.intentPackage,
      capabilityPlan: this.capabilityPlan,
      allocationState: this.allocationState,
      deckState: this.deckState,
      fitnessReport: this.fitnessReport,
      auditReport: this.auditReport,
      telemetry: this.telemetry,
      residualVector: this.residualVector,
      explainability: this.explainability,
      rejectedEvidence: this.rejectedEvidence
    };
  }
}
