/**
 * src/services/compiler/core/canonicalStrategicProjection.js
 * 
 * CanonicalStrategicProjection: Full Semantic Strategic Projection v29.10.
 * 
 * Extracts the canonical strategic core of a deck state to enable rigorous causal
 * invariance testing against irrelevant pool mutations and sensitivity verification
 * under critical engine ablations.
 * 
 * Axioms:
 *   1. Full raw deck state equality (hash(DeckState)) is too brittle: it varies on
 *      internal IDs, build logs, and timestamps.
 *   2. Card composition alone is insufficient: two states with identical cards but
 *      different Gameplans, dependencies, or win paths represent different strategies.
 *   3. StrategicProjection = Intent + Gameplan + DependencyGraph + WinPath + Trajectory + CoreComposition.
 */

import { computeDeterministicHash } from './certifiedDeckState.js';

export class CanonicalStrategicProjection {
  /**
   * @param {Object} params
   * @param {Object|string} params.intentSignature - Structured intent parameters (format, targetTurn, archetype, etc.)
   * @param {Object} params.gameplanIdentity - { name, archetype, primaryEngine, criticalNodes, priorityVector }
   * @param {string} [params.dependencyGraphVersion='v29.10']
   * @param {Object} [params.dependencyGraphCanonical={ nodes: [], edges: [] }] - Explicit ordered representation
   * @param {string} params.dependencyGraphHash - Cryptographic hash of causal circuit dependencies
   * @param {Object} params.winPath - Terminal win condition and turn requirements
   * @param {Object} params.trajectoryConstraints - Curve ceiling, critical turn, timing requirements
   * @param {Array<Object>} params.coreDeckComposition - Sorted non-land card allocations [{ name, quantity, role }]
   */
  constructor({
    intentSignature = {},
    gameplanIdentity = {},
    dependencyGraphVersion = 'v29.10',
    dependencyGraphCanonical = null,
    dependencyGraphHash = 'EMPTY_GRAPH',
    winPath = {},
    trajectoryConstraints = {},
    coreDeckComposition = [],
    identityFingerprint = null
  } = {}) {
    this.intentSignature = Object.freeze(typeof intentSignature === 'string' ? { signature: intentSignature } : { ...intentSignature });
    this.gameplanIdentity = Object.freeze({
      name: String(gameplanIdentity.name || 'DEFAULT_PLAN'),
      archetype: String(gameplanIdentity.archetype || 'UNKNOWN'),
      primaryEngine: String(gameplanIdentity.primaryEngine || 'NONE'),
      criticalNodes: Object.freeze([...(gameplanIdentity.criticalNodes || [])]),
      priorityVector: Object.freeze([...(gameplanIdentity.priorityVector || [])])
    });

    this.identityFingerprint = String(identityFingerprint || computeCanonicalIdentityFingerprint(gameplanIdentity, intentSignature));

    this.dependencyGraphVersion = String(dependencyGraphVersion);

    // Normalize canonical dependency graph representation deterministically
    const rawCanonical = dependencyGraphCanonical || {
      nodes: [...(gameplanIdentity.criticalNodes || [])].sort(),
      edges: (gameplanIdentity.criticalNodes || []).slice(1).map((n, i) => `${gameplanIdentity.criticalNodes[i]}->${n}`).sort()
    };

    this.dependencyGraphCanonical = Object.freeze({
      nodes: Object.freeze([...(rawCanonical.nodes || [])].sort()),
      edges: Object.freeze([...(rawCanonical.edges || [])].sort())
    });

    this.dependencyGraphHash = String(dependencyGraphHash && dependencyGraphHash !== 'EMPTY_GRAPH' 
      ? dependencyGraphHash 
      : computeDeterministicHash({ version: this.dependencyGraphVersion, canonical: this.dependencyGraphCanonical }));

    this.winPath = Object.freeze({
      terminalType: String(winPath.terminalType || 'COMBAT'),
      requiredThroughput: Number(winPath.requiredThroughput ?? 20),
      turnRequirements: Object.freeze([...(winPath.turnRequirements || [])].map(tr => Object.freeze({
        turn: Number(tr.turn || 1),
        demands: Object.freeze([...(tr.functionalDemands || tr.demands || [])].map(d => typeof d === 'string' ? d : d.functionName || 'DEMAND'))
      })))
    });
    this.trajectoryConstraints = Object.freeze({
      curveCeiling: Number(trajectoryConstraints.curveCeiling ?? 5),
      criticalTurn: Number(trajectoryConstraints.criticalTurn ?? 3),
      timingWindows: Object.freeze([...(trajectoryConstraints.timingWindows || [])])
    });

    // Normalize and sort core card allocations deterministically
    const sortedCore = [...coreDeckComposition]
      .filter(c => c && c.name)
      .map(c => ({
        name: String(c.name),
        quantity: Number(c.quantity ?? 1),
        role: String(c.role || c.functionalRole || 'UTILITY')
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    this.coreDeckComposition = Object.freeze(sortedCore.map(c => Object.freeze(c)));

    this.projectionHash = computeDeterministicHash({
      intentSignature: this.intentSignature,
      gameplanIdentity: this.gameplanIdentity,
      dependencyGraphVersion: this.dependencyGraphVersion,
      dependencyGraphCanonical: this.dependencyGraphCanonical,
      dependencyGraphHash: this.dependencyGraphHash,
      winPath: this.winPath,
      trajectoryConstraints: this.trajectoryConstraints,
      coreDeckComposition: this.coreDeckComposition
    });

    Object.freeze(this);
  }

  /**
   * Evaluates if this canonical strategic projection is strictly identical to another.
   */
  isIdentical(other) {
    if (!other || !(other instanceof CanonicalStrategicProjection)) return false;
    return this.projectionHash === other.projectionHash;
  }

  /**
   * Produces a detailed diagnostic diff between two strategic projections.
   */
  diff(other) {
    if (!other) return { identical: false, reason: 'Other projection is null' };
    if (this.projectionHash === other.projectionHash) return { identical: true, diffs: [] };

    const diffs = [];
    if (JSON.stringify(this.intentSignature) !== JSON.stringify(other.intentSignature)) {
      diffs.push('INTENT_SIGNATURE_DIFF');
    }
    if (this.gameplanIdentity.name !== other.gameplanIdentity.name || this.gameplanIdentity.primaryEngine !== other.gameplanIdentity.primaryEngine) {
      diffs.push(`GAMEPLAN_IDENTITY_DIFF: ${this.gameplanIdentity.name} vs ${other.gameplanIdentity.name}`);
    }
    if (this.dependencyGraphHash !== other.dependencyGraphHash) {
      // Detailed semantic diff of nodes and edges
      const addedNodes = other.dependencyGraphCanonical.nodes.filter(n => !this.dependencyGraphCanonical.nodes.includes(n));
      const removedNodes = this.dependencyGraphCanonical.nodes.filter(n => !other.dependencyGraphCanonical.nodes.includes(n));
      const addedEdges = other.dependencyGraphCanonical.edges.filter(e => !this.dependencyGraphCanonical.edges.includes(e));
      const removedEdges = this.dependencyGraphCanonical.edges.filter(e => !other.dependencyGraphCanonical.edges.includes(e));

      diffs.push(`DEPENDENCY_GRAPH_DIFF: AddedNodes=[${addedNodes.join(',')}], RemovedNodes=[${removedNodes.join(',')}], AddedEdges=[${addedEdges.join(',')}], RemovedEdges=[${removedEdges.join(',')}]`);
    }
    if (this.winPath.terminalType !== other.winPath.terminalType) {
      diffs.push(`WIN_PATH_DIFF: ${this.winPath.terminalType} vs ${other.winPath.terminalType}`);
    }
    if (this.trajectoryConstraints.curveCeiling !== other.trajectoryConstraints.curveCeiling) {
      diffs.push('TRAJECTORY_CONSTRAINTS_DIFF');
    }
    if (JSON.stringify(this.coreDeckComposition) !== JSON.stringify(other.coreDeckComposition)) {
      diffs.push('CORE_DECK_COMPOSITION_DIFF');
    }

    return {
      identical: diffs.length === 0,
      diffs
    };
  }

  /**
   * Factory method to extract CanonicalStrategicProjection from a compiled DeckState and associated objects.
   */
  /**
   * Factory method to extract CanonicalStrategicProjection from a compiled DeckState and associated objects.
   */
  static fromDeckState(deckState, intentPackage = {}, activeGameplan = null, dependencyGraph = null) {
    if (!deckState) return new CanonicalStrategicProjection();

    const intentSig = {
      format: intentPackage.format || deckState.format || 'standard',
      archetype: intentPackage.archetype || deckState.archetype || 'midrange',
      targetTurn: intentPackage.targetTurn || 4,
      manaRiskTolerance: intentPackage.manaRiskTolerance || 'MODERATE'
    };

    const gp = activeGameplan || deckState.activeGameplan || {};
    const gpIdentity = {
      name: gp.derivedFromLine || gp.name || (intentPackage.primaryTribe && intentPackage.primaryTribe !== 'None' ? `${intentPackage.primaryTribe} ${intentSig.archetype}` : 'DEFAULT_PLAN'),
      archetype: gp.archetype || intentSig.archetype,
      primaryEngine: (gp.requiredEngines?.[0]?.engineId) || gp.primaryEngine || (gp.strategicLines?.[0]?.name) || 'NONE',
      criticalNodes: gp.criticalNodes || (dependencyGraph?.criticalNodes) || [],
      priorityVector: gp.priorityVector || []
    };

    const depGraphHash = dependencyGraph?.graphHash || 
      (gp.dependencyGraph?.hash) || 
      computeDeterministicHash(gp.dependencies || []);

    const winPath = {
      terminalType: gp.winPath?.terminalType || (gp.terminalPath?.type) || 'COMBAT',
      requiredThroughput: gp.winPath?.requiredThroughput || 20,
      turnRequirements: gp.turnRequirements || []
    };

    const trajConstraints = {
      curveCeiling: gp.curveCeiling || 5,
      criticalTurn: gp.criticalTurn || 3,
      timingWindows: gp.timingWindows || []
    };

    // Structural Identity Fingerprint (V29.10 SSOT - zero prose text dependency)
    const identityFingerprint = computeCanonicalIdentityFingerprint(gp, intentPackage);

    // Filter cards to non-land core composition
    const coreCards = (deckState.cards || [])
      .filter(c => {
        const type = String(c.type_line || c.type || '').toLowerCase();
        return !type.includes('land');
      })
      .map(c => ({
        name: c.name,
        quantity: c.quantity || 1,
        role: c.role || c.functionalRole || 'PAYOFF'
      }));

    const projection = new CanonicalStrategicProjection({
      intentSignature: intentSig,
      gameplanIdentity: gpIdentity,
      dependencyGraphHash: depGraphHash,
      winPath,
      trajectoryConstraints: trajConstraints,
      coreDeckComposition: coreCards,
      identityFingerprint
    });

    // Invariant: Non-empty GameplanContract must preserve structural identity
    const activeContract = activeGameplan || deckState.activeGameplan;
    const hasActiveGameplan = Boolean(activeContract && (
      (activeContract.turnRequirements && activeContract.turnRequirements.length > 0) ||
      activeContract.primaryLine ||
      activeContract.derivedFromLine ||
      activeContract.name ||
      (activeContract.requiredEngines && activeContract.requiredEngines.length > 0)
    ));

    if (hasActiveGameplan) {
      const sourceContract = deckState.activeGameplan || activeContract;
      const expectedFingerprint = computeCanonicalIdentityFingerprint(sourceContract, intentPackage);
      if (projection.identityFingerprint !== expectedFingerprint) {
        throw new Error(`PROTOCOL_VIOLATION: STRATEGIC_IDENTITY_LOSS: Projection fingerprint (${projection.identityFingerprint}) diverges from active GameplanContract fingerprint (${expectedFingerprint}).`);
      }
      if (projection.gameplanIdentity.name === 'DEFAULT_PLAN' && sourceContract.name && sourceContract.name !== 'DEFAULT_PLAN') {
        throw new Error(`PROTOCOL_VIOLATION: STRATEGIC_IDENTITY_LOSS: CanonicalStrategicProjection degraded to DEFAULT_PLAN while an explicit GameplanContract was active.`);
      }
      if (sourceContract.turnRequirements && sourceContract.turnRequirements.length > 0 && projection.winPath.turnRequirements.length === 0) {
        throw new Error(`PROTOCOL_VIOLATION: STRATEGIC_IDENTITY_LOSS: CanonicalStrategicProjection lost turnRequirements from active GameplanContract.`);
      }
    }

    return projection;
  }

  /**
   * Project method alias for CompilerConvergencePipeline.
   */
  static project(deckState, options = {}) {
    return this.fromDeckState(
      deckState,
      options.intentPackage || deckState.intentPackage || {},
      options.gameplanContract || options.activeGameplan || deckState.activeGameplan || null,
      options.dependencyGraph || null
    );
  }
}

/**
 * Computes structural identity fingerprint of a gameplan and intent.
 * Purely structural: derives from mechanics, engines, dependencies, turn requirements,
 * and win conditions. Zero dependency on prose strings or human-authored text.
 */
export function computeCanonicalIdentityFingerprint(gameplan = {}, intentPackage = {}) {
  const gp = gameplan || {};
  const intentIdentityHash = intentPackage.intentHash || intentPackage.computeIntentHash?.() || computeDeterministicHash({
    format: String(intentPackage.format || 'STANDARD').toUpperCase(),
    archetype: String(intentPackage.archetype || 'MIDRANGE').toUpperCase(),
    colors: (intentPackage.colors || []).sort()
  });

  const primaryLine = String(gp.primaryLine?.name || gp.derivedFromLine || gp.strategicLines?.[0]?.name || 'GENERAL_LINE');
  const requiredEngines = (gp.requiredEngines || []).map(e => String(e.engineId || e.name || e)).sort();
  const dependencies = (gp.dependencies || []).map(d => String(d.id || d)).sort();
  const criticalNodes = (gp.criticalNodes || gp.dependencyGraph?.criticalNodes || []).map(n => String(n.nodeId || n)).sort();
  const turnRequirementsHash = computeDeterministicHash(
    (gp.turnRequirements || []).map(tr => ({
      turn: Number(tr.turn || 1),
      maxMana: Number(tr.maxMana || 1),
      demands: (tr.functionalDemands || tr.demands || []).map(fd => typeof fd === 'string' ? fd : fd.functionName || 'DEMAND').sort()
    }))
  );
  const winCondition = String(gp.winCondition?.condition || gp.winCondition?.type || gp.terminalPath?.type || 'COMBAT');
  const causalInvariants = (gp.causalInvariants || []).map(ci => String(ci.id || ci)).sort();

  return computeDeterministicHash({
    intentIdentityHash,
    primaryLine,
    requiredEngines,
    dependencies,
    criticalNodes,
    turnRequirementsHash,
    winCondition,
    causalInvariants
  });
}
