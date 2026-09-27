/**
 * src/services/compiler/core/executionEvidence.js
 * 
 * ExecutionEvidence Schema & Immutable Evidence Container v28.1.
 * 
 * INVARIANT: Execution evidence is empirical observation data, NOT a decision authority.
 * It provides deterministic telemetry to StateCandidateRanker and DeterministicSupremeJudge.
 */

export const ConfidenceTier = Object.freeze({
  HIGH_CONFIDENCE: 'HIGH_CONFIDENCE',           // >= 10,000 samples, low variance
  MEDIUM_CONFIDENCE: 'MEDIUM_CONFIDENCE',       // 1,000 - 9,999 samples
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',             // 100 - 999 samples
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE' // < 100 samples or unsupported mechanics encountered
});

export class ExecutionEvidence {
  /**
   * Constructs an immutable ExecutionEvidence instance.
   * @param {Object} params
   */
  constructor({
    candidateId = 'state_root',
    simulationConfig = {},
    execution = {},
    winPath = {},
    resilience = {},
    redundancy = {},
    experience = {},
    failures = [],
    traces = [],
    unsupportedMechanics = [],
    confidence = {},
    evidenceTier = 'EMPIRICAL_SIMULATION',
    isIllustrative = false
  }) {
    this.candidateId = candidateId;
    this.evidenceTier = isIllustrative ? 'ILLUSTRATIVE_MOCK' : (evidenceTier || 'EMPIRICAL_SIMULATION');
    this.isIllustrative = Boolean(isIllustrative || evidenceTier === 'ILLUSTRATIVE_MOCK');
    this.isDecisionSafe = !this.isIllustrative && (simulationConfig.simulationCount ?? 1000) >= 50;

    this.simulationConfig = Object.freeze({
      seed: simulationConfig.seed ?? 472918,
      simulationCount: simulationConfig.simulationCount ?? 1000,
      engineVersion: simulationConfig.engineVersion || 'v28.1',
      policyVersion: simulationConfig.policyVersion || 'generic-v1',
      timestamp: simulationConfig.timestamp || new Date().toISOString()
    });

    this.execution = Object.freeze({
      openingHandKeepRate: Number(execution.openingHandKeepRate ?? 0.80),
      mulliganRate: Number(execution.mulliganRate ?? 0.20),
      earlyManaReliability: Number(execution.earlyManaReliability ?? 0.90),
      curveExecutionProbability: Number(execution.curveExecutionProbability ?? 0.85),
      colorFailureRate: Number(execution.colorFailureRate ?? 0.05),
      strandedCardRate: Number(execution.strandedCardRate ?? 0.04),
      deadCardRate: Number(execution.deadCardRate ?? 0.03),
      avgManaSpentTurn1to4: Number(execution.avgManaSpentTurn1to4 ?? 8.5)
    });

    this.winPath = Object.freeze({
      winPathSuccessRate: Number(winPath.winPathSuccessRate ?? 0.75),
      expectedKillTurn: Number(winPath.expectedKillTurn ?? 4.5),
      winTurnDistribution: Object.freeze({
        T3: Number(winPath.winTurnDistribution?.T3 ?? 0.05),
        T4: Number(winPath.winTurnDistribution?.T4 ?? 0.65),
        T5: Number(winPath.winTurnDistribution?.T5 ?? 0.25),
        T6Plus: Number(winPath.winTurnDistribution?.T6Plus ?? 0.05)
      }),
      lethalRate: Number(winPath.lethalRate ?? 0.75),
      failedStep: winPath.failedStep || null,
      failureReason: winPath.failureReason || null
    });

    this.resilience = Object.freeze({
      recoveryProbability: Number(resilience.recoveryProbability ?? 0.70),
      adversarialSurvivalRate: Number(resilience.adversarialSurvivalRate ?? 0.68),
      singlePointOfFailure: Boolean(resilience.singlePointOfFailure ?? false),
      criticalFailurePoints: Object.freeze([...(resilience.criticalFailurePoints || [])]),
      resilienceIndex: Number(resilience.resilienceIndex ?? 72)
    });

    this.redundancy = Object.freeze({
      functionalRedundancyScore: Number(redundancy.functionalRedundancyScore ?? 0.80),
      nominalRedundancyScore: Number(redundancy.nominalRedundancyScore ?? 0.85),
      spofCount: Number(redundancy.spofCount ?? 0)
    });

    this.experience = Object.freeze({
      interactionQuality: Number(experience.interactionQuality ?? 0.85),
      gameplayDiversity: Number(experience.gameplayDiversity ?? 0.80),
      boardAgency: Number(experience.boardAgency ?? 0.82),
      comebackPotential: Number(experience.comebackPotential ?? 0.75),
      nonGameLockoutRisk: Number(experience.nonGameLockoutRisk ?? 0.05),
      identityExpression: Number(experience.identityExpression ?? 0.90)
    });

    this.failures = Object.freeze([...failures]);
    this.traces = Object.freeze([...traces]);
    this.unsupportedMechanics = Object.freeze([...unsupportedMechanics]);

    // Compute Confidence Tier
    const sampleSize = this.simulationConfig.simulationCount;
    let confidenceTier = ConfidenceTier.MEDIUM_CONFIDENCE;
    if (this.unsupportedMechanics.length > 0) {
      confidenceTier = ConfidenceTier.INSUFFICIENT_EVIDENCE;
    } else if (sampleSize >= 10000) {
      confidenceTier = ConfidenceTier.HIGH_CONFIDENCE;
    } else if (sampleSize >= 1000) {
      confidenceTier = ConfidenceTier.MEDIUM_CONFIDENCE;
    } else if (sampleSize >= 100) {
      confidenceTier = ConfidenceTier.LOW_CONFIDENCE;
    } else {
      confidenceTier = ConfidenceTier.INSUFFICIENT_EVIDENCE;
    }

    this.confidence = Object.freeze({
      sampleSize,
      confidence: Number(confidence.confidence ?? (confidenceTier === ConfidenceTier.HIGH_CONFIDENCE ? 0.98 : (confidenceTier === ConfidenceTier.MEDIUM_CONFIDENCE ? 0.90 : 0.65))),
      confidenceTier
    });

    Object.freeze(this);
  }

  /**
   * Creates a default baseline evidence object for unsimulated / empty states.
   */
  static createBaseline(candidateId = 'baseline') {
    return new ExecutionEvidence({
      candidateId,
      simulationConfig: { seed: 472918, simulationCount: 0, engineVersion: 'v28.1' },
      execution: { openingHandKeepRate: 0.5, earlyManaReliability: 0.5, curveExecutionProbability: 0.5 },
      winPath: { winPathSuccessRate: 0.5, expectedKillTurn: 5.0 },
      resilience: { recoveryProbability: 0.5, adversarialSurvivalRate: 0.5 },
      confidence: { sampleSize: 0, confidence: 0, confidenceTier: ConfidenceTier.INSUFFICIENT_EVIDENCE },
      isIllustrative: true,
      evidenceTier: 'ILLUSTRATIVE_MOCK'
    });
  }

  /**
   * Enforces that evidence passed into a decision-making component is real empirical simulation evidence,
   * not illustrative telemetry or mock data.
   * 
   * @param {ExecutionEvidence} evidence 
   * @param {string} consumerName 
   * @throws {Error} If evidence fails decision-safety invariants
   */
  static assertDecisionSafe(evidence, consumerName = 'DECISION_CONSUMER') {
    if (!evidence) {
      throw new Error(`[DECISION_SAFE_VIOLATION] Consumer "${consumerName}" received null or undefined evidence.`);
    }
    if (evidence.isIllustrative || evidence.evidenceTier === 'ILLUSTRATIVE_MOCK') {
      throw new Error(`[DECISION_SAFE_VIOLATION] Consumer "${consumerName}" cannot consume illustrative mock telemetry. EvidenceTier is "${evidence.evidenceTier}".`);
    }
    if (!evidence.isDecisionSafe) {
      throw new Error(`[DECISION_SAFE_VIOLATION] Consumer "${consumerName}" received evidence marked not decision safe.`);
    }
    return true;
  }
}
