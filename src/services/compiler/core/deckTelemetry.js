/**
 * src/services/compiler/core/deckTelemetry.js
 * 
 * DeckTelemetry: Métricas Permanentes de Distribución de Copias v23.0.
 * 
 * Captures a standardized telemetry snapshot for every compiled deck.
 * Includes both absolute metrics and Expected vs Actual comparison
 * so that systemic drift is detectable even when the auditor hasn't
 * flagged individual packages.
 * 
 * These metrics are designed to be:
 *   1. Logged per-compilation (detect regressions immediately)
 *   2. Aggregated over time (detect systemic drift)
 *   3. Displayed in the UI (transparency)
 */

export class DeckTelemetry {
  /**
   * Capture telemetry for a compiled deck.
   * 
   * @param {Array<{name: string, quantity?: number, role?: string}>} finalDeckCards
   * @param {import('./copyAllocationManager.js').CopyAllocationState|null} copyAllocationState
   * @param {Object|null} auditReport - Output from CopyAllocationAuditor.audit()
   * @returns {Object} Frozen telemetry snapshot
   */
  static capture(finalDeckCards = [], copyAllocationState = null, auditReport = null) {
    const distinctCards = finalDeckCards.filter(c => c && c.name);
    const totalCards = distinctCards.reduce((sum, c) => sum + (c.quantity || 1), 0);

    // Actual copy distribution
    const actualDistribution = DeckTelemetry._computeDistribution(distinctCards);

    // Expected copy distribution from allocation state
    const expectedDistribution = copyAllocationState
      ? DeckTelemetry._computeExpectedDistribution(copyAllocationState.packages)
      : null;

    // Distribution delta
    const distributionDelta = expectedDistribution
      ? DeckTelemetry._computeDelta(expectedDistribution, actualDistribution)
      : null;

    // Singleton metrics
    const singletons = distinctCards.filter(c => (c.quantity || 1) === 1);
    const singletonRatio = distinctCards.length > 0
      ? Math.round((singletons.length / distinctCards.length) * 100) / 100
      : 0;

    // Core playsets (4x)
    const playsets = distinctCards.filter(c => (c.quantity || 1) >= 4);
    const playsetRatio = distinctCards.length > 0
      ? Math.round((playsets.length / distinctCards.length) * 100) / 100
      : 0;

    // Package compliance from audit report (if available)
    const packageCompliance = auditReport
      ? auditReport.packageCompliance
      : (copyAllocationState ? 1.0 : null);

    const winnerCompliance = auditReport
      ? (auditReport.totalPackages > 0
        ? auditReport.respectedPackages / auditReport.totalPackages
        : 1.0)
      : null;

    // Violations from audit
    const copyAllocationViolations = auditReport
      ? auditReport.violations.length
      : 0;

    const unexpectedSplits = auditReport
      ? auditReport.unexpectedSplits
      : 0;

    // Invariant compliance KPIs (Sprint 23 Refinement)
    let copyAllocationCompliance = 1.0;
    let winnerPreservationCompliance = 1.0;
    let densityPreservationCompliance = 1.0;
    let lockCompliance = 1.0;

    if (auditReport && auditReport.packageAudits && auditReport.packageAudits.length > 0) {
      const total = auditReport.packageAudits.length;
      const copyMatches = auditReport.packageAudits.filter(p => p.actualCopies === p.expectedCopies).length;
      const winnerMatches = auditReport.packageAudits.filter(p => p.actualCopies > 0 || p.role === 'Land' || p.role === 'LAND_BASE').length;
      const densityMatches = auditReport.packageAudits.filter(p => p.actualDensity >= p.expectedDensity * 0.75).length;
      const hardLocked = auditReport.packageAudits.filter(p => p.lockLevel === 'LOCK_HARD');
      const hardLockedRespected = hardLocked.filter(p => p.status === 'PASS').length;

      copyAllocationCompliance = Math.round((copyMatches / total) * 100) / 100;
      winnerPreservationCompliance = Math.round((winnerMatches / total) * 100) / 100;
      densityPreservationCompliance = Math.round((densityMatches / total) * 100) / 100;
      lockCompliance = hardLocked.length > 0 ? Math.round((hardLockedRespected / hardLocked.length) * 100) / 100 : 1.0;
    }

    const invariantCompliance = Object.freeze({
      copyAllocation: copyAllocationCompliance,
      winnerPreservation: winnerPreservationCompliance,
      densityPreservation: densityPreservationCompliance,
      lockCompliance
    });

    return Object.freeze({
      // --- Absolute Metrics ---
      totalCards,
      totalDistinctCards: distinctCards.length,
      
      // --- Copy Distribution (Actual) ---
      copyDistribution: Object.freeze(actualDistribution),
      
      // --- Copy Distribution (Expected) ---
      expectedDistribution: expectedDistribution ? Object.freeze(expectedDistribution) : null,
      
      // --- Distribution Delta (Expected - Actual) ---
      distributionDelta: distributionDelta ? Object.freeze(distributionDelta) : null,

      // --- Ratios ---
      singletonRatio,
      playsetRatio,

      // --- Compliance & KPIs ---
      packageCompliance,
      winnerCompliance,
      invariantCompliance,

      // --- Violations ---
      unexpectedSplits,
      copyAllocationViolations,

      // --- Allocation State Info ---
      allocationMode: copyAllocationState ? copyAllocationState.mode : null,
      allocationModeSource: copyAllocationState ? copyAllocationState.modeSource : null,

      // --- Metadata ---
      timestamp: new Date().toISOString(),
      version: '23.0'
    });
  }


  /**
   * Format telemetry as a human-readable string (for logs).
   * @param {Object} telemetry - Output from DeckTelemetry.capture()
   * @returns {string}
   */
  static format(telemetry) {
    if (!telemetry) return '[No Telemetry]';

    const lines = [
      '╔══════════════════════════════════════╗',
      '║       DECK TELEMETRY REPORT         ║',
      '╠══════════════════════════════════════╣',
      `║ Total Cards:         ${String(telemetry.totalCards).padStart(3)}            ║`,
      `║ Distinct Cards:      ${String(telemetry.totalDistinctCards).padStart(3)}            ║`,
      '╠══════════════════════════════════════╣',
      '║ Copy Distribution                   ║',
    ];

    if (telemetry.expectedDistribution) {
      lines.push(
        '║           Expected  Actual   Delta  ║',
        `║  4x:        ${String(telemetry.expectedDistribution['4x']).padStart(3)}      ${String(telemetry.copyDistribution['4x']).padStart(3)}    ${DeckTelemetry._formatDelta(telemetry.distributionDelta?.['4x'])}   ║`,
        `║  3x:        ${String(telemetry.expectedDistribution['3x']).padStart(3)}      ${String(telemetry.copyDistribution['3x']).padStart(3)}    ${DeckTelemetry._formatDelta(telemetry.distributionDelta?.['3x'])}   ║`,
        `║  2x:        ${String(telemetry.expectedDistribution['2x']).padStart(3)}      ${String(telemetry.copyDistribution['2x']).padStart(3)}    ${DeckTelemetry._formatDelta(telemetry.distributionDelta?.['2x'])}   ║`,
        `║  1x:        ${String(telemetry.expectedDistribution['1x']).padStart(3)}      ${String(telemetry.copyDistribution['1x']).padStart(3)}    ${DeckTelemetry._formatDelta(telemetry.distributionDelta?.['1x'])}   ║`
      );
    } else {
      lines.push(
        `║  4x:  ${String(telemetry.copyDistribution['4x']).padStart(3)} cards                  ║`,
        `║  3x:  ${String(telemetry.copyDistribution['3x']).padStart(3)} cards                  ║`,
        `║  2x:  ${String(telemetry.copyDistribution['2x']).padStart(3)} cards                  ║`,
        `║  1x:  ${String(telemetry.copyDistribution['1x']).padStart(3)} cards                  ║`
      );
    }

    lines.push(
      '╠══════════════════════════════════════╣',
      `║ Singleton Ratio:     ${String(Math.round(telemetry.singletonRatio * 100)).padStart(3)}%           ║`,
      `║ Playset Ratio:       ${String(Math.round(telemetry.playsetRatio * 100)).padStart(3)}%           ║`
    );

    if (telemetry.packageCompliance !== null) {
      lines.push(
        `║ Package Compliance:  ${String(Math.round(telemetry.packageCompliance * 100)).padStart(3)}%           ║`,
        `║ Winner Compliance:   ${String(Math.round((telemetry.winnerCompliance || 0) * 100)).padStart(3)}%           ║`
      );
    }

    lines.push(
      `║ Unexpected Splits:   ${String(telemetry.unexpectedSplits).padStart(3)}            ║`,
      `║ Copy Violations:     ${String(telemetry.copyAllocationViolations).padStart(3)}            ║`,
      '╚══════════════════════════════════════╝'
    );

    return lines.join('\n');
  }


  /**
   * Compute copy distribution from deck cards.
   * @private
   */
  static _computeDistribution(cards) {
    const dist = { '4x': 0, '3x': 0, '2x': 0, '1x': 0 };
    for (const card of cards) {
      const qty = card.quantity || 1;
      if (qty >= 4) dist['4x']++;
      else if (qty === 3) dist['3x']++;
      else if (qty === 2) dist['2x']++;
      else if (qty === 1) dist['1x']++;
    }
    return dist;
  }


  /**
   * Compute expected distribution from allocation packages.
   * @private
   */
  static _computeExpectedDistribution(packages) {
    const dist = { '4x': 0, '3x': 0, '2x': 0, '1x': 0 };
    for (const pkg of packages) {
      if (!pkg.winnerCard || (pkg.winnerCard || '').startsWith('[Pending')) continue;
      if (pkg.role === 'Land' || pkg.role === 'LAND_BASE') continue;

      const copies = pkg.copies || 1;
      if (copies >= 4) dist['4x']++;
      else if (copies === 3) dist['3x']++;
      else if (copies === 2) dist['2x']++;
      else if (copies === 1) dist['1x']++;
    }
    return dist;
  }


  /**
   * Compute delta between expected and actual distributions.
   * @private
   */
  static _computeDelta(expected, actual) {
    return {
      '4x': actual['4x'] - expected['4x'],
      '3x': actual['3x'] - expected['3x'],
      '2x': actual['2x'] - expected['2x'],
      '1x': actual['1x'] - expected['1x']
    };
  }


  /**
   * Format a delta number with sign.
   * @private
   */
  static _formatDelta(val) {
    if (val === undefined || val === null) return '  -';
    if (val === 0) return '  0';
    if (val > 0) return ` +${val}`;
    return ` ${val}`;
  }
}
