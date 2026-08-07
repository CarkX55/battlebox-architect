/**
 * src/services/compiler/core/copyAllocationAuditor.js
 * 
 * CopyAllocationAuditor: Auditoría Arquitectónica de Invariantes v23.0.
 * 
 * Compares the COMPLETE CopyAllocationState (every package: role, winner, copies,
 * allocatedDensity, lockLevel, priority) against the final deck produced by the pipeline.
 * 
 * This is NOT a test. It is a compiler module that runs on EVERY compilation.
 * 
 * Sprint 23: Informative mode — reports violations without blocking compilation.
 * Future: Will evolve to validate Mana Sources, Curve, LockLevel preservation,
 *         Strategy Vector consistency, and USS consistency.
 * 
 * The audit produces a structured report usable by:
 *   1. OracleTraceLog (PASS 15: Architectural Invariant Audit)
 *   2. BlueprintEditor UI (Copy Allocation Audit panel)
 *   3. DeckTelemetry (permanent metrics)
 */

export const ViolationType = Object.freeze({
  MISSING: 'MISSING',               // Card completely absent from final deck
  REDUCED: 'REDUCED',               // Fewer copies than allocated
  EXCESS: 'EXCESS',                 // More copies than allocated (unexpected)
  SPLIT: 'SPLIT',                   // Copies distributed across unexpected cards
  DENSITY_DEFICIT: 'DENSITY_DEFICIT', // Package total density not met (even if winner copies match)
  ROLE_SUBSTITUTION: 'ROLE_SUBSTITUTION', // Winner card replaced by another card of the same role
  PACKAGE_FRAGMENTATION: 'PACKAGE_FRAGMENTATION' // Single package split across multiple sub-optimal cards
});


/**
 * Individual package audit result.
 */
class PackageAuditResult {
  constructor({
    role,
    winnerCard,
    expectedCopies,
    actualCopies,
    expectedDensity,
    actualDensity,
    lockLevel,
    priority,
    compliance,
    status,
    violations = [],
    mutationTrail = []
  }) {
    this.role = role;
    this.winnerCard = winnerCard;
    this.expectedCopies = expectedCopies;
    this.actualCopies = actualCopies;
    this.expectedDensity = expectedDensity;
    this.actualDensity = actualDensity;
    this.lockLevel = lockLevel;
    this.priority = priority;
    this.compliance = compliance;         // 0.0 to 1.0
    this.status = status;                 // 'PASS', 'WARN', 'FAIL'
    this.violations = Object.freeze([...violations]);
    this.mutationTrail = Object.freeze([...mutationTrail]);

    Object.freeze(this);
  }
}


export class CopyAllocationAuditor {
  /**
   * Audits the final deck against the CopyAllocationState.
   * 
   * Compares every CapabilityPackage in the allocation state against
   * the actual cards in the final deck, checking:
   *   - Winner card copy count
   *   - Package density (total cards fulfilling the role)
   *   - LockLevel preservation
   * 
   * @param {import('./copyAllocationManager.js').CopyAllocationState} copyAllocationState
   * @param {Array<{name: string, quantity?: number, role?: string}>} finalDeckCards
   * @param {import('./mutationRecord.js').MutationLog|null} mutationLog - Optional forensic log
   * @returns {Object} Structured audit report
   */
  static audit(copyAllocationState, finalDeckCards = [], mutationLog = null) {
    if (!copyAllocationState || !copyAllocationState.packages) {
      return CopyAllocationAuditor._emptyReport('NO_ALLOCATION_STATE');
    }

    const packages = copyAllocationState.packages;
    const deckMap = CopyAllocationAuditor._buildDeckMap(finalDeckCards);
    const packageAudits = [];
    const violations = [];

    let totalPackages = 0;
    let respectedPackages = 0;

    for (const pkg of packages) {
      // Skip pending/unresolved packages
      if (!pkg.winnerCard || pkg.winnerCard.startsWith('[Pending')) {
        continue;
      }

      totalPackages++;

      const auditResult = CopyAllocationAuditor._auditPackage(pkg, deckMap, mutationLog);
      packageAudits.push(auditResult);

      if (auditResult.status === 'PASS') {
        respectedPackages++;
      } else {
        violations.push(...auditResult.violations);
      }
    }

    // Global deck metrics
    const totalCardsInDeck = finalDeckCards.reduce((sum, c) => sum + (c.quantity || 1), 0);
    const distinctCards = finalDeckCards.length;
    const singletonCount = finalDeckCards.filter(c => (c.quantity || 1) === 1).length;
    const singletonRatio = distinctCards > 0 ? singletonCount / distinctCards : 0;

    // Copy distribution
    const copyDistribution = CopyAllocationAuditor._computeCopyDistribution(finalDeckCards);

    // Expected distribution from allocation state
    const expectedDistribution = CopyAllocationAuditor._computeExpectedDistribution(packages);

    // Unexpected one-of count (singletons that shouldn't be singletons)
    const unexpectedOneOf = CopyAllocationAuditor._countUnexpectedSingletons(packages, deckMap);

    // Unexpected splits (a card appears at a different count than expected)
    const unexpectedSplits = violations.filter(v => v.type === ViolationType.SPLIT).length;

    const overallStatus = violations.length === 0 ? 'PASS' : 'FAIL';

    return Object.freeze({
      status: overallStatus,
      totalPackages,
      respectedPackages,
      packageCompliance: totalPackages > 0 ? respectedPackages / totalPackages : 1.0,
      violations: Object.freeze(violations),
      packageAudits: Object.freeze(packageAudits),
      singletonRatio: Math.round(singletonRatio * 100) / 100,
      unexpectedOneOf,
      unexpectedSplits,
      copyDistribution: Object.freeze(copyDistribution),
      expectedDistribution: Object.freeze(expectedDistribution),
      totalCardsInDeck,
      distinctCards,
      mutationCount: mutationLog ? mutationLog.count : 0,
      mutationsByPhase: mutationLog ? mutationLog.getSummaryByPhase() : {},
      timestamp: new Date().toISOString()
    });
  }


  /**
   * Audit a single package against the final deck.
   * @private
   */
  static _auditPackage(pkg, deckMap, mutationLog) {
    const isLandPackage = pkg.role === 'Land' || pkg.role === 'LAND_BASE' ||
      (pkg.winnerCard && (pkg.winnerCard.startsWith('Land') || pkg.winnerCard.includes('Karsten')));

    const winnerName = (pkg.winnerCard || '').toLowerCase().trim();
    const actualEntry = deckMap.get(winnerName);

    const role = (pkg.role || '').toLowerCase();
    let actualDensity = 0;
    for (const [, card] of deckMap) {
      const cardRole = (card.role || '').toLowerCase();
      const typeLine = (card.type_line || '').toLowerCase();
      if (cardRole === role || cardRole.includes(role) || role.includes(cardRole) || (isLandPackage && typeLine.includes('land'))) {
        actualDensity += (card.quantity || 1);
      }
    }

    const expectedDensity = pkg.allocatedDensity || pkg.requiredDensity || pkg.copies || 0;
    const expectedCopies = isLandPackage ? expectedDensity : (pkg.copies || 0);
    const actualCopies = isLandPackage ? actualDensity : (actualEntry ? (actualEntry.quantity || 1) : 0);

    // At minimum, if winner card was found, ensure actualDensity is at least actualCopies
    if (!isLandPackage && actualCopies > 0 && actualDensity === 0) {
      actualDensity = actualCopies;
    }

    // Determine violations
    const violations = [];

    if (!isLandPackage) {
      if (actualCopies === 0 && expectedCopies > 0) {
        if (actualDensity >= expectedDensity) {
          violations.push({
            type: ViolationType.ROLE_SUBSTITUTION,
            package: pkg.role,
            winnerCard: pkg.winnerCard,
            expected: expectedCopies,
            actual: 0,
            detail: `Winner card "${pkg.winnerCard}" was completely substituted by another card for role "${pkg.role}" (density ${actualDensity}/${expectedDensity} met)`,
            introducedBy: CopyAllocationAuditor._findIntroducer(pkg.winnerCard, mutationLog)
          });
        } else {
          violations.push({
            type: ViolationType.MISSING,
            package: pkg.role,
            winnerCard: pkg.winnerCard,
            expected: expectedCopies,
            actual: 0,
            detail: `Winner card "${pkg.winnerCard}" is completely absent from the final deck`,
            introducedBy: CopyAllocationAuditor._findIntroducer(pkg.winnerCard, mutationLog)
          });
        }
      } else if (actualCopies < expectedCopies) {
        if (actualDensity >= expectedDensity) {
          violations.push({
            type: ViolationType.PACKAGE_FRAGMENTATION,
            package: pkg.role,
            winnerCard: pkg.winnerCard,
            expected: expectedCopies,
            actual: actualCopies,
            detail: `Package "${pkg.role}" fragmented: winner "${pkg.winnerCard}" reduced to ${actualCopies}x/${expectedCopies}x while role density was filled by other cards (${actualDensity}/${expectedDensity})`,
            introducedBy: CopyAllocationAuditor._findIntroducer(pkg.winnerCard, mutationLog)
          });
        } else {
          violations.push({
            type: ViolationType.REDUCED,
            package: pkg.role,
            winnerCard: pkg.winnerCard,
            expected: expectedCopies,
            actual: actualCopies,
            detail: `Winner card "${pkg.winnerCard}" reduced from ${expectedCopies}x to ${actualCopies}x`,
            introducedBy: CopyAllocationAuditor._findIntroducer(pkg.winnerCard, mutationLog)
          });
        }
      } else if (actualCopies > expectedCopies) {
        violations.push({
          type: ViolationType.EXCESS,
          package: pkg.role,
          winnerCard: pkg.winnerCard,
          expected: expectedCopies,
          actual: actualCopies,
          detail: `Winner card "${pkg.winnerCard}" has ${actualCopies}x but only ${expectedCopies}x was allocated`,
          introducedBy: CopyAllocationAuditor._findIntroducer(pkg.winnerCard, mutationLog)
        });
      }
    }

    // Density check (independent of winner copies)
    if (actualDensity < expectedDensity * 0.75) {
      violations.push({
        type: ViolationType.DENSITY_DEFICIT,
        package: pkg.role,
        winnerCard: pkg.winnerCard,
        expected: expectedDensity,
        actual: actualDensity,
        detail: `Role "${pkg.role}" density is ${actualDensity}/${expectedDensity} (below 75% threshold)`,
        introducedBy: null
      });
    }

    // Compliance score
    const copyCompliance = expectedCopies > 0 ? Math.min(actualCopies / expectedCopies, 1.0) : 1.0;
    const densityCompliance = expectedDensity > 0 ? Math.min(actualDensity / expectedDensity, 1.0) : 1.0;
    const compliance = (copyCompliance + densityCompliance) / 2;

    // Status
    let status;
    if (violations.length === 0) {
      status = 'PASS';
    } else if (compliance >= 0.75) {
      status = 'WARN';
    } else {
      status = 'FAIL';
    }

    // Mutation trail for this card
    const mutationTrail = mutationLog
      ? mutationLog.getRecordsForCard(pkg.winnerCard)
      : [];

    return new PackageAuditResult({
      role: pkg.role,
      winnerCard: pkg.winnerCard,
      expectedCopies,
      actualCopies,
      expectedDensity,
      actualDensity,
      lockLevel: pkg.lockLevel,
      priority: pkg.priority,
      compliance: Math.round(compliance * 100) / 100,
      status,
      violations,
      mutationTrail
    });
  }


  /**
   * Build a name→card map from the deck list for O(1) lookups.
   * @private
   */
  static _buildDeckMap(deckCards) {
    const map = new Map();
    for (const card of deckCards) {
      if (!card || !card.name) continue;
      const key = card.name.toLowerCase().trim();
      if (map.has(key)) {
        // Merge quantities for duplicate entries
        const existing = map.get(key);
        existing.quantity = (existing.quantity || 1) + (card.quantity || 1);
      } else {
        map.set(key, { ...card });
      }
    }
    return map;
  }


  /**
   * Compute copy distribution histogram: { '4x': N, '3x': N, '2x': N, '1x': N }
   * @private
   */
  static _computeCopyDistribution(deckCards) {
    const dist = { '4x': 0, '3x': 0, '2x': 0, '1x': 0 };
    for (const card of deckCards) {
      const qty = card.quantity || 1;
      if (qty >= 4) dist['4x']++;
      else if (qty === 3) dist['3x']++;
      else if (qty === 2) dist['2x']++;
      else if (qty === 1) dist['1x']++;
    }
    return dist;
  }


  /**
   * Compute expected copy distribution from the allocation state.
   * @private
   */
  static _computeExpectedDistribution(packages) {
    const dist = { '4x': 0, '3x': 0, '2x': 0, '1x': 0 };
    for (const pkg of packages) {
      if (!pkg.winnerCard || pkg.winnerCard.startsWith('[Pending')) continue;
      // Land packages have special handling
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
   * Count singletons in the deck that should NOT be singletons per the allocation state.
   * @private
   */
  static _countUnexpectedSingletons(packages, deckMap) {
    let count = 0;
    for (const pkg of packages) {
      if (!pkg.winnerCard || pkg.winnerCard.startsWith('[Pending')) continue;
      if (pkg.role === 'Land' || pkg.role === 'LAND_BASE') continue;

      const key = pkg.winnerCard.toLowerCase().trim();
      const actual = deckMap.get(key);
      const actualQty = actual ? (actual.quantity || 1) : 0;

      // If allocated > 1 but actual is 1, it's an unexpected singleton
      if (pkg.copies > 1 && actualQty === 1) {
        count++;
      }
    }
    return count;
  }


  /**
   * Find which phase introduced a violation via the mutation log.
   * @private
   */
  static _findIntroducer(cardName, mutationLog) {
    if (!mutationLog) return null;

    const records = mutationLog.getRecordsForCard(cardName);
    if (records.length === 0) return null;

    // Find the last mutation that reduced or removed copies
    const reducingMutations = records.filter(r =>
      r.action === 'REMOVE' ||
      r.action === 'REDUCE_COPIES' ||
      r.action === 'SPLICE' ||
      (r.action === 'SWAP' && r.quantityAfter < r.quantityBefore)
    );

    if (reducingMutations.length > 0) {
      const last = reducingMutations[reducingMutations.length - 1];
      return {
        phase: last.phase,
        action: last.action,
        reason: last.reason,
        mutationIndex: records.indexOf(last),
        timestamp: last.timestamp
      };
    }

    return null;
  }


  /**
   * Generate an empty report for when no allocation state is available.
   * @private
   */
  static _emptyReport(reason = 'UNKNOWN') {
    return Object.freeze({
      status: 'SKIPPED',
      totalPackages: 0,
      respectedPackages: 0,
      packageCompliance: 1.0,
      violations: Object.freeze([]),
      packageAudits: Object.freeze([]),
      singletonRatio: 0,
      unexpectedOneOf: 0,
      unexpectedSplits: 0,
      copyDistribution: Object.freeze({ '4x': 0, '3x': 0, '2x': 0, '1x': 0 }),
      expectedDistribution: Object.freeze({ '4x': 0, '3x': 0, '2x': 0, '1x': 0 }),
      totalCardsInDeck: 0,
      distinctCards: 0,
      mutationCount: 0,
      mutationsByPhase: {},
      reason,
      timestamp: new Date().toISOString()
    });
  }
}
