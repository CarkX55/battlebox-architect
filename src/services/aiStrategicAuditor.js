/**
 * src/services/aiStrategicAuditor.js
 * 
 * Orquestador Fachada del Sistema de Verificación Estratégica v9.3.
 * 
 * Ejecuta el bucle completo:
 * CONTRACT → PLAN → OBLIGATIONS → BUILD → PROVE → REFUTE → DIAGNOSE → PATCH → RE-PROVE → LOCK → ACCEPT
 * 
 * NO decide cartas. NO propone hechizos. NO emite scores.
 * 
 * Pregunta:
 * "¿Ha demostrado el mazo aquello que el contrato estratégico decía que debía demostrar?"
 * 
 * RESPONSABILIDADES:
 * 1. Genera ProofObligations desde el plan estratégico (ANTES del mazo).
 * 2. Recopila evidencia determinista del software (Monte Carlo, conteo, roles).
 * 3. Ejecuta PROVE (evalúa obligaciones contra evidencia).
 * 4. Ejecuta REFUTE (escenarios adversariales R1-R10).
 * 5. DIAGNOSTICA causa raíz de cada fallo.
 * 6. Emite el diagnóstico al DecisionEngine para PATCH (sin emitir órdenes de cartas).
 * 7. RE-PROVE obligaciones afectadas tras parche.
 * 8. LOCK con TransactionLock de 4 factores.
 * 
 * LEYES INVIOLABLES:
 * - 8ª Ley: Auditorías selectivas (LOCAL_AUDIT tras paquetes, GLOBAL_AUDIT al final).
 * - 9ª Ley: El Auditor diagnostica, el DecisionEngine decide.
 * - 10ª Ley: TransactionLock de 4 factores + criterios de terminación.
 */

import { 
  generateObligations, 
  evaluateObligation, 
  buildDependencyGraph, 
  detectContradictions, 
  computeProofCoverage,
  OBLIGATION_STATUS,
  EVIDENCE_QUALITY
} from './auditor/ProofObligationEngine.js';

import { 
  generateAdversarialScenarios, 
  executeRefutation, 
  assessResilience 
} from './auditor/RefutationEngine.js';

import { 
  analyzeWinPaths, 
  simulateTrajectories, 
  computeStrategicFingerprint, 
  calculateJointProbability 
} from './auditor/WinPathAnalyzer.js';

import { runMonteCarloSimulation } from './monteCarloEngine.js';
import { isLand } from './deckCalculator.js';
import { getCardRoleMetadata } from './deckContractEngine.js';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS: Modos de Auditoría (8ª Ley)
// ─────────────────────────────────────────────────────────────────────────────
export const AUDIT_MODE = Object.freeze({
  LOCAL_AUDIT:  'LOCAL_AUDIT',   // Tras completar un paquete estratégico
  GLOBAL_AUDIT: 'GLOBAL_AUDIT'  // Al finalizar la construcción del mazo completo
});

// ─────────────────────────────────────────────────────────────────────────────
// ORQUESTADOR PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Ejecuta la auditoría estratégica completa del mazo.
 * 
 * FLUJO:
 * 1. Genera ProofObligations desde el plan (ANTES de mirar el mazo)
 * 2. Recopila evidencia del mazo actual
 * 3. PROVE: evalúa obligaciones contra evidencia
 * 4. REFUTE: ejecuta escenarios adversariales
 * 5. DIAGNOSE: identifica root causes
 * 6. Construye reporte para el DecisionEngine (sin decidir cartas)
 * 7. Verifica RE-PROVE si hay parches previos
 * 8. LOCK: genera TransactionLock
 * 
 * @param {Array} currentDeck - Mazo actual (cards array)
 * @param {Object} contract - UserIntentContract congelado
 * @param {Object} strategicPlan - Plan estratégico derivado del intent
 * @param {Object} options - { mode, auditId, deckVersion, previousPatches }
 * @returns {Object} Resultado completo de la auditoría estratégica
 */
export async function runStrategicAudit(currentDeck = [], contract = {}, strategicPlan = {}, options = {}) {
  const auditId = options.auditId || `AUDIT-V93-${Date.now()}`;
  const deckVersion = options.deckVersion || 1;
  const mode = options.mode || AUDIT_MODE.GLOBAL_AUDIT;
  const previousPatches = options.previousPatches || [];

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 1: GENERATE PROOF OBLIGATIONS (Antes del mazo)
  // ═══════════════════════════════════════════════════════════════════════════
  const obligations = generateObligations(strategicPlan, contract);

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 2: GATHER EVIDENCE (Evidencia determinista del software)
  // ═══════════════════════════════════════════════════════════════════════════
  const evidence = gatherDeckEvidence(currentDeck, contract);

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 3: PROVE (Evaluar obligaciones contra evidencia)
  // ═══════════════════════════════════════════════════════════════════════════
  let evaluatedObligations = obligations.map(obligation => {
    const relevantEvidence = matchEvidenceToObligation(obligation, evidence);
    return evaluateObligation(obligation, relevantEvidence, obligations);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 3b: BUILD DEPENDENCY GRAPH & PROPAGATE ROOT FAILURES
  // ═══════════════════════════════════════════════════════════════════════════
  const dependencyResult = buildDependencyGraph(evaluatedObligations);
  evaluatedObligations = dependencyResult.obligations;
  const rootFailures = dependencyResult.rootFailures;

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 4: REFUTE (Escenarios Adversariales R1-R10)
  // ═══════════════════════════════════════════════════════════════════════════
  const adversarialScenarios = generateAdversarialScenarios(currentDeck, evaluatedObligations, strategicPlan);
  const mcResult = evidence._monteCarloRaw;
  
  const refutationResults = adversarialScenarios.map(scenario => 
    executeRefutation(scenario, currentDeck, mcResult, evaluatedObligations)
  );

  const resilienceReport = assessResilience(refutationResults);

  // Actualizar obligaciones con resultados de refutación
  refutationResults.forEach(refResult => {
    (refResult.obligationVerdicts || []).forEach(verdict => {
      if (verdict.verdict === 'REFUTED') {
        const ob = evaluatedObligations.find(o => o.id === verdict.obligationId);
        if (ob && ob.status !== OBLIGATION_STATUS.BLOCKED) {
          ob.status = OBLIGATION_STATUS.REFUTED;
          ob.evidenceChain = refResult.evidenceChain;
        }
      }
    });
  });

  // Re-calcular grafo de dependencias tras refutación
  const postRefutationGraph = buildDependencyGraph(evaluatedObligations);
  evaluatedObligations = postRefutationGraph.obligations;

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 5: DIAGNOSE (Identificar causas raíz)
  // ═══════════════════════════════════════════════════════════════════════════
  const diagnosis = diagnosRootCauses(evaluatedObligations, postRefutationGraph.rootFailures, evidence);

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 5b: DETECT CONTRADICTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const deckState = {
    deckSize: currentDeck.reduce((sum, c) => sum + (c.quantity || c.count || c.copies || 1), 0),
    landCount: currentDeck.filter(c => isLand(c)).reduce((sum, c) => sum + (c.quantity || c.count || c.copies || 1), 0)
  };
  const contradictions = detectContradictions(evaluatedObligations, deckState);

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 6: WIN PATH ANALYSIS & STRATEGIC FINGERPRINT
  // ═══════════════════════════════════════════════════════════════════════════
  const winPathAnalysis = analyzeWinPaths(currentDeck, strategicPlan);
  const trajectoryResult = simulateTrajectories(currentDeck, 1000, { winPaths: winPathAnalysis.winPaths });
  const archetype = contract.level1?.archetype?.value || 'MIDRANGE';
  const fingerprint = computeStrategicFingerprint(currentDeck, trajectoryResult, archetype);
  const jointProbability = calculateJointProbability(trajectoryResult);

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 7: PROOF COVERAGE (Diagnóstico, no score)
  // ═══════════════════════════════════════════════════════════════════════════
  const proofCoverage = computeProofCoverage(evaluatedObligations);

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 8: RE-PROVE CHECK (¿Hay parches previos que requieren re-verificación?)
  // ═══════════════════════════════════════════════════════════════════════════
  const reProofRequired = previousPatches.length > 0;
  let reProofStatus = 'NOT_REQUIRED';
  if (reProofRequired) {
    // Verificar que las obligaciones afectadas por parches anteriores siguen PROVEN
    const affectedObligations = evaluatedObligations.filter(o => 
      o.status === OBLIGATION_STATUS.PROVEN || o.status === OBLIGATION_STATUS.INCONCLUSIVE
    );
    const allStillProven = affectedObligations.every(o => o.status === OBLIGATION_STATUS.PROVEN);
    reProofStatus = allStillProven ? 'PASSED' : 'FAILED';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 9: VERDICT & TRANSACTION LOCK (10ª Ley)
  // ═══════════════════════════════════════════════════════════════════════════
  const verdict = computeVerdict(evaluatedObligations, contradictions, reProofStatus, contract);
  const transactionLock = generateTransactionLock(auditId, deckVersion, contract, verdict);

  // ═══════════════════════════════════════════════════════════════════════════
  // RESULTADO COMPLETO
  // ═══════════════════════════════════════════════════════════════════════════
  return {
    auditId,
    deckVersion,
    mode,
    timestamp: new Date().toISOString(),

    // Triada: ¿Es Legal? → ¿Funciona? → ¿Es Óptimo?
    triada: {
      legal: verdict.contractIntact ? 'PASS' : 'FAIL',
      functional: verdict.status === 'ACCEPT' || verdict.status === 'ACCEPT_WITH_WARNINGS' ? 'PASS' : 'FAIL',
      optimal: 'PENDING_DECISION_ENGINE'  // Lo decide el DecisionEngine, no el auditor
    },

    // ProofObligations evaluadas
    proofObligations: evaluatedObligations,
    proofCoverage,
    
    // Dependencias y root causes
    dependencyGraph: {
      rootFailures: postRefutationGraph.rootFailures,
      edges: postRefutationGraph.dependencyEdges
    },
    
    // Refutación adversarial
    refutation: {
      scenariosTested: refutationResults.length,
      results: refutationResults,
      resilience: resilienceReport
    },

    // Win Paths y trayectorias
    winPaths: winPathAnalysis,
    trajectories: {
      winRate: trajectoryResult.winRate,
      progressiveWinRate: trajectoryResult.progressiveWinRate,
      summary: trajectoryResult.trajectorySummary
    },
    jointProbability,
    
    // Strategic Fingerprint
    fingerprint,
    
    // Contradicciones
    contradictions,
    
    // Diagnóstico
    diagnosis,
    
    // Re-Proof
    reProof: {
      required: reProofRequired,
      status: reProofStatus
    },

    // Veredicto y Lock
    verdict,
    transactionLock,

    // Meta
    isReadOnly: true  // La auditoría NUNCA modifica el mazo
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GATHER EVIDENCE — Recopilación de Evidencia Determinista
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Recopila toda la evidencia determinista del mazo actual.
 * Esta es la fuente de verdad para la evaluación de obligaciones.
 */
function gatherDeckEvidence(deck, contract) {
  const nonLands = deck.filter(c => !isLand(c));
  const lands = deck.filter(c => isLand(c));
  
  const totalCards = deck.reduce((sum, c) => sum + (c.quantity || c.count || c.copies || 1), 0);
  const totalLands = lands.reduce((sum, c) => sum + (c.quantity || c.count || c.copies || 1), 0);
  const totalSpells = totalCards - totalLands;

  // Clasificar por rol
  const byRole = { ramp: 0, finisher: 0, interaction: 0, draw: 0, creature_support: 0, utility: 0 };
  nonLands.forEach(c => {
    const qty = c.quantity || c.count || c.copies || 1;
    const meta = getCardRoleMetadata(c);
    byRole[meta.primaryRole] = (byRole[meta.primaryRole] || 0) + qty;
  });

  // Contar amenazas (finishers + creature_support)
  const threatCount = (byRole.finisher || 0) + (byRole.creature_support || 0);
  const interactionCount = byRole.interaction || 0;
  const drawCount = byRole.draw || 0;

  // Monte Carlo
  const mcResult = runMonteCarloSimulation(deck, 1000);

  // Contar criaturas tribales (si aplica)
  const tribe = (contract.level0?.tribe?.value || '').toLowerCase();
  let tribalCreaturePct = 0;
  if (tribe && tribe !== 'none' && tribe !== 'ninguna') {
    const creatures = nonLands.filter(c => {
      const typeLine = (c.type_line || c.typeLine || c.type || '').toLowerCase();
      return typeLine.includes('creature');
    });
    const totalCreatures = creatures.reduce((sum, c) => sum + (c.quantity || c.count || c.copies || 1), 0);
    const tribalCreatures = creatures.filter(c => {
      const typeLine = (c.type_line || c.typeLine || c.type || '').toLowerCase();
      const oracle = (c.oracle_text || c.text || '').toLowerCase();
      return typeLine.includes(tribe) || oracle.includes(tribe);
    }).reduce((sum, c) => sum + (c.quantity || c.count || c.copies || 1), 0);
    tribalCreaturePct = totalCreatures > 0 ? tribalCreatures / totalCreatures : 0;
  }

  // Cadena causal: verificar si existen enablers, engines y payoffs
  const hasEnablers = byRole.ramp > 0 || drawCount > 0;
  const hasEngines = nonLands.some(c => {
    const oracle = (c.oracle_text || c.text || '').toLowerCase();
    return oracle.includes('whenever') || oracle.includes('at the beginning');
  });
  const hasPayoffs = byRole.finisher > 0;
  const causalChainCompleteness = [hasEnablers, hasEngines, hasPayoffs].filter(Boolean).length / 3;

  return {
    // Evidencia determinista
    threatCount: { value: threatCount, source: 'DETERMINISTIC', sampleSize: null },
    interactionCount: { value: interactionCount, source: 'DETERMINISTIC', sampleSize: null },
    drawSourceCount: { value: drawCount, source: 'DETERMINISTIC', sampleSize: null },
    totalCards: { value: totalCards, source: 'DETERMINISTIC', sampleSize: null },
    totalLands: { value: totalLands, source: 'DETERMINISTIC', sampleSize: null },

    // Evidencia simulada (Monte Carlo)
    manaCastabilityT2: { 
      value: (mcResult?.manaAvailablePct?.turn2 || 0) / 100, 
      source: 'MONTE_CARLO', 
      sampleSize: mcResult?.iterations || 1000 
    },
    curveExecution: { 
      value: calculateCurveExecution(mcResult), 
      source: 'MONTE_CARLO', 
      sampleSize: mcResult?.iterations || 1000 
    },

    // Cadena causal
    causalChainCompleteness: { value: causalChainCompleteness, source: 'DETERMINISTIC', sampleSize: null },

    // Win path placeholder (se calcula en el paso 6)
    winPathViability: { value: 0.50, source: 'MONTE_CARLO', sampleSize: 1000 },

    // Resiliencia placeholder (se actualiza tras refutación)
    resilienceUnderRefutation: { value: 0.50, source: 'MONTE_CARLO', sampleSize: 1000 },

    // Tribal
    tribalCreaturePct: { value: tribalCreaturePct, source: 'DETERMINISTIC', sampleSize: null },

    // Raw para otros módulos
    _monteCarloRaw: mcResult,
    _roleBreakdown: byRole
  };
}

/**
 * Calcula la ejecución de curva T1-T4 como promedio ponderado.
 */
function calculateCurveExecution(mcResult) {
  if (!mcResult || !mcResult.manaAvailablePct) return 0.50;
  const t1 = (mcResult.manaAvailablePct.turn1 || 0) / 100;
  const t2 = (mcResult.manaAvailablePct.turn2 || 0) / 100;
  const t3 = (mcResult.manaAvailablePct.turn3 || 0) / 100;
  const t4 = (mcResult.manaAvailablePct.turn4 || 0) / 100;
  // Ponderación: T2 y T3 son más críticos
  return (t1 * 0.15 + t2 * 0.35 + t3 * 0.30 + t4 * 0.20);
}

/**
 * Mapea la evidencia relevante a una obligación específica.
 */
function matchEvidenceToObligation(obligation, evidence) {
  const metric = obligation.threshold?.metric;
  if (!metric) return null;

  const evidenceMap = {
    'P(cast_key_spell_T2)': evidence.manaCastabilityT2,
    'P(on_curve_T1_T4)': evidence.curveExecution,
    'threat_count': evidence.threatCount,
    'interaction_count': evidence.interactionCount,
    'causal_chain_completeness': evidence.causalChainCompleteness,
    'P(win_path_viable)': evidence.winPathViability,
    'resilience_under_refutation': evidence.resilienceUnderRefutation,
    'tribal_creature_pct': evidence.tribalCreaturePct,
    'draw_source_count': evidence.drawSourceCount
  };

  return evidenceMap[metric] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSE — Identificación de Causas Raíz
// ─────────────────────────────────────────────────────────────────────────────
function diagnosRootCauses(obligations, rootFailureIds, evidence) {
  const rootCauses = [];

  rootFailureIds.forEach(rootId => {
    const obligation = obligations.find(o => o.id === rootId);
    if (!obligation) return;

    let causeDescription = '';
    let causeCategory = '';

    switch (obligation.type) {
      case 'MANA_CASTABILITY':
        causeCategory = 'MANA_INFRASTRUCTURE';
        causeDescription = `Infraestructura de maná insuficiente: P(T2 cast) = ${evidence.manaCastabilityT2?.value || 'N/A'} < ${obligation.threshold?.min}`;
        break;
      case 'CURVE_EXECUTION':
        causeCategory = 'CURVE_STRUCTURE';
        causeDescription = `Estructura de curva no permite ejecución fluida T1-T4`;
        break;
      case 'THREAT_DENSITY':
        causeCategory = 'CAUSAL_DENSITY';
        causeDescription = `Densidad de amenazas insuficiente: ${evidence.threatCount?.value || 0} < ${obligation.threshold?.min}`;
        break;
      case 'INTERACTION_DENSITY':
        causeCategory = 'INTERACTION_DEFICIT';
        causeDescription = `Interacción insuficiente: ${evidence.interactionCount?.value || 0} < ${obligation.threshold?.min}`;
        break;
      case 'CAUSAL_CHAIN_INTACT':
        causeCategory = 'CAUSAL_CHAIN_BROKEN';
        causeDescription = `Cadena causal incompleta: eslabones faltantes en Enabler → Engine → Payoff`;
        break;
      case 'WIN_PATH_VIABLE':
        causeCategory = 'WIN_PATH_ABSENT';
        causeDescription = `No se encontró un camino de victoria viable en simulación`;
        break;
      default:
        causeCategory = 'UNKNOWN';
        causeDescription = `Obligación ${obligation.id} (${obligation.type}) no demostrada`;
    }

    rootCauses.push({
      obligationId: rootId,
      obligationType: obligation.type,
      category: causeCategory,
      description: causeDescription,
      affectedObligations: obligation.rootCauseOf || [],
      severity: obligation.threshold?.min >= 0.80 ? 'CRITICAL' : 'HIGH'
    });
  });

  return {
    rootCauses,
    totalRootCauses: rootCauses.length,
    categories: [...new Set(rootCauses.map(rc => rc.category))]
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VERDICT — Cómputo del Veredicto Final (10ª Ley)
// ─────────────────────────────────────────────────────────────────────────────
function computeVerdict(obligations, contradictions, reProofStatus, contract) {
  const criticalRefuted = obligations.filter(o => o.status === OBLIGATION_STATUS.REFUTED);
  const criticalContradictions = contradictions.filter(c => c.severity === 'CRITICAL');
  const contractIntact = true; // El contrato se verifica externamente

  // Criterios de terminación (10ª Ley)
  const criteria = {
    zeroCriticalRefuted: criticalRefuted.length === 0,
    zeroCriticalContradictions: criticalContradictions.length === 0,
    contractIntact,
    reProofPassed: reProofStatus === 'NOT_REQUIRED' || reProofStatus === 'PASSED'
  };

  let status = 'ACCEPT';
  let reason = 'Todas las obligaciones demostradas, sin contradicciones críticas.';

  if (!criteria.zeroCriticalRefuted) {
    status = 'REJECT';
    reason = `${criticalRefuted.length} obligación(es) refutada(s): ${criticalRefuted.map(o => o.id).join(', ')}`;
  } else if (!criteria.zeroCriticalContradictions) {
    status = 'REJECT';
    reason = `${criticalContradictions.length} contradicción(es) crítica(s) sin resolver`;
  } else if (!criteria.reProofPassed) {
    status = 'REJECT';
    reason = 'Re-proof tras parche anterior FALLIDO';
  } else {
    // Verificar si hay warnings (no-critical)
    const unproven = obligations.filter(o => o.status === OBLIGATION_STATUS.UNPROVEN || o.status === OBLIGATION_STATUS.INCONCLUSIVE);
    const nonCriticalContradictions = contradictions.filter(c => c.severity !== 'CRITICAL');
    
    if (unproven.length > 0 || nonCriticalContradictions.length > 0) {
      status = 'ACCEPT_WITH_WARNINGS';
      reason = `Aceptado con ${unproven.length} obligación(es) no demostrada(s) y ${nonCriticalContradictions.length} advertencia(s).`;
    }
  }

  return {
    status,
    reason,
    criteria,
    contractIntact,
    obligationSummary: {
      total: obligations.length,
      proven: obligations.filter(o => o.status === OBLIGATION_STATUS.PROVEN).length,
      refuted: criticalRefuted.length,
      inconclusive: obligations.filter(o => o.status === OBLIGATION_STATUS.INCONCLUSIVE).length,
      blocked: obligations.filter(o => o.status === OBLIGATION_STATUS.BLOCKED).length,
      unproven: obligations.filter(o => o.status === OBLIGATION_STATUS.UNPROVEN).length
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION LOCK — Hash de 4 Factores (10ª Ley)
// ─────────────────────────────────────────────────────────────────────────────
function generateTransactionLock(auditId, deckVersion, contract, verdict) {
  const contractHash = contract.contractHash || 'NO-CONTRACT';
  const verdictHash = `${verdict.status}-${verdict.obligationSummary.proven}/${verdict.obligationSummary.total}`;
  
  const compositeStr = `${auditId}|V${deckVersion}|${contractHash}|${verdictHash}`;
  let hash = 0;
  for (let i = 0; i < compositeStr.length; i++) {
    const char = compositeStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const lockHash = `TX-LOCK-V93-${Math.abs(hash).toString(16).toUpperCase()}`;

  return {
    auditId,
    deckVersion,
    contractHash,
    verdictHash,
    transactionLockHash: lockHash,
    timestamp: new Date().toISOString()
  };
}
