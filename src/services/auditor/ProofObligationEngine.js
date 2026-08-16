/**
 * src/services/auditor/ProofObligationEngine.js
 * 
 * Núcleo del Sistema de Verificación Estratégica v9.3.
 * 
 * Responsabilidades:
 * 1. Genera ProofObligations ANTES de construir el mazo (desde el StrategicPlan + Contract).
 * 2. Evalúa cada obligación contra evidencia determinista del software.
 * 3. Mantiene el ProofDependencyGraph y aísla ROOT FAILURE.
 * 4. Detecta contradicciones entre obligaciones resueltas (CROSS_STEP_CONTRADICTION).
 * 5. Valida trazabilidad completa de EvidenceChains.
 * 
 * LEYES INVIOLABLES IMPLEMENTADAS:
 * - 1ª Ley: NO EVIDENCE → NO CLAIM (sin EvidenceChain → UNPROVEN)
 * - 2ª Ley: EvidenceQuality estricta (AI_INFERENCE jamás → PROVEN)
 * - 3ª Ley: ProofDependencyGraph (ROOT FAILURE isolation)
 * - 7ª Ley: Proof Coverage como diagnóstico, NO como score
 * - 9ª Ley: El auditor diagnostica, no decide cartas
 */

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS: Escala Estricta de Calidad de Evidencia (2ª Ley)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Jerarquía estricta de calidad de evidencia.
 * AI_INFERENCE jamás puede declarar una obligación como PROVEN.
 */
export const EVIDENCE_QUALITY = Object.freeze({
  DETERMINISTIC:        { rank: 0, canProve: true,  label: 'DETERMINISTIC',        minSamples: null },
  SIMULATED_HIGH:       { rank: 1, canProve: true,  label: 'SIMULATED_HIGH',       minSamples: 10000 },
  SIMULATED_LOW:        { rank: 2, canProve: false, label: 'SIMULATED_LOW',        minSamples: 1 },
  EXTERNAL_META:        { rank: 3, canProve: false, label: 'EXTERNAL_META',        minSamples: null },
  AI_INFERENCE:         { rank: 4, canProve: false, label: 'AI_INFERENCE',         minSamples: null }
});

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS: Estados de una ProofObligation
// ─────────────────────────────────────────────────────────────────────────────
export const OBLIGATION_STATUS = Object.freeze({
  UNPROVEN:     'UNPROVEN',      // No evaluada todavía
  PROVEN:       'PROVEN',        // Demostrada con evidencia suficiente
  INCONCLUSIVE: 'INCONCLUSIVE',  // Evidencia insuficiente para demostrar
  REFUTED:      'REFUTED',       // Contradicha activamente por la refutación
  BLOCKED:      'BLOCKED'        // Bloqueada por dependencia ROOT FAILURE
});

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS: Categorías de ProofObligation
// ─────────────────────────────────────────────────────────────────────────────
const OBLIGATION_TYPES = Object.freeze({
  MANA_CASTABILITY:       'MANA_CASTABILITY',
  CURVE_EXECUTION:        'CURVE_EXECUTION',
  THREAT_DENSITY:         'THREAT_DENSITY',
  INTERACTION_DENSITY:    'INTERACTION_DENSITY',
  CAUSAL_CHAIN_INTACT:    'CAUSAL_CHAIN_INTACT',
  WIN_PATH_VIABLE:        'WIN_PATH_VIABLE',
  RESILIENCE_MINIMUM:     'RESILIENCE_MINIMUM',
  TRIBAL_DENSITY:         'TRIBAL_DENSITY',
  PROTECTION_MINIMUM:     'PROTECTION_MINIMUM',
  CARD_ADVANTAGE:         'CARD_ADVANTAGE',
  PO_INFRASTRUCTURE:      'PO_INFRASTRUCTURE'
});

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY: Crear una ProofObligation
// ─────────────────────────────────────────────────────────────────────────────
let obligationCounter = 0;

function createObligation(type, description, threshold, dependsOn = []) {
  obligationCounter++;
  return {
    id: `PO_${String(obligationCounter).padStart(3, '0')}`,
    type,
    description,
    threshold,       // { metric: string, min?: number, max?: number }
    dependsOn,       // ['PO_001', 'PO_002'] — ProofDependencyGraph edges
    status: OBLIGATION_STATUS.UNPROVEN,
    evidenceChain: null,
    evaluatedAt: null,
    rootCauseOf: []   // IDs de obligaciones que dependen de esta si falla
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GENERACIÓN DE PROOF OBLIGATIONS DESDE EL PLAN ESTRATÉGICO
//    (Se generan ANTES de construir el mazo — Principio Fundamental)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Genera el conjunto de ProofObligations a partir del plan estratégico y el contrato del usuario.
 * Las obligaciones se crean ANTES de inspeccionar el mazo real.
 * 
 * @param {Object} strategicPlan - Plan estratégico derivado del intent del usuario
 * @param {Object} contract - UserIntentContract congelado (de deckContractLock.js)
 * @returns {Array<Object>} Lista de ProofObligations ordenadas por dependencia
 */
export function generateObligations(strategicPlan = {}, contract = {}) {
  obligationCounter = 0; // Reset para cada generación
  const obligations = [];
  
  const format = contract.level0?.format?.value || 'modern';
  const archetype = (contract.level1?.archetype?.value || 'MIDRANGE').toUpperCase();
  const tribe = contract.level0?.tribe?.value || '';
  const deckSize = contract.level0?.deckSize?.value || 60;
  
  // ── PO_001: MANA CASTABILITY T2 ──
  // Toda estrategia necesita poder lanzar hechizos en T2.
  // Threshold varía por arquetipo: Aggro necesita más consistencia temprana.
  const manaThresholdT2 = ['AGGRO', 'TEMPO', 'BURN'].includes(archetype) ? 0.85 : 0.75;
  obligations.push(createObligation(
    OBLIGATION_TYPES.MANA_CASTABILITY,
    'El mazo debe poder castear hechizos clave en turno 2 con consistencia mínima',
    { metric: 'P(cast_key_spell_T2)', min: manaThresholdT2 },
    [] // Sin dependencias — es una obligación raíz
  ));

  // ── PO_002: CURVE EXECUTION ──
  // La curva de maná debe permitir ejecución en curva T1→T4.
  const curveThreshold = archetype === 'CONTROL' ? 0.60 : 0.70;
  obligations.push(createObligation(
    OBLIGATION_TYPES.CURVE_EXECUTION,
    'El mazo debe ejecutar su curva de hechizos T1→T4 con consistencia mínima',
    { metric: 'P(on_curve_T1_T4)', min: curveThreshold },
    ['PO_001'] // Depende de que la mana funcione
  ));

  // ── PO_003: THREAT DENSITY ──
  // El mazo necesita amenazas suficientes para ganar.
  const threatMin = archetype === 'CONTROL' ? 4 : (archetype === 'AGGRO' ? 20 : 10);
  obligations.push(createObligation(
    OBLIGATION_TYPES.THREAT_DENSITY,
    `El mazo necesita al menos ${threatMin} amenazas conectadas con el plan de victoria`,
    { metric: 'threat_count', min: threatMin },
    [] // Sin dependencias directas
  ));

  // ── PO_004: INTERACTION DENSITY ──
  // Interacción mínima para sobrevivir.
  const interactionMin = archetype === 'AGGRO' ? 2 : (archetype === 'CONTROL' ? 12 : 6);
  obligations.push(createObligation(
    OBLIGATION_TYPES.INTERACTION_DENSITY,
    `El mazo necesita al menos ${interactionMin} piezas de interacción`,
    { metric: 'interaction_count', min: interactionMin },
    []
  ));

  // ── PO_005: CAUSAL CHAIN INTACT ──
  // La cadena causal (Enabler → Engine → Payoff) debe estar intacta.
  obligations.push(createObligation(
    OBLIGATION_TYPES.CAUSAL_CHAIN_INTACT,
    'La cadena causal Enabler → Engine → Payoff debe tener todos los eslabones presentes',
    { metric: 'causal_chain_completeness', min: 1.0 },
    ['PO_003'] // Depende de que haya amenazas
  ));

  // ── PO_006: WIN PATH VIABLE ──
  // Al menos un camino de victoria debe ser viable.
  obligations.push(createObligation(
    OBLIGATION_TYPES.WIN_PATH_VIABLE,
    'Al menos un camino de victoria debe ser viable en simulación',
    { metric: 'P(win_path_viable)', min: 0.45 },
    ['PO_001', 'PO_003', 'PO_005'] // Depende de maná, amenazas y cadena causal
  ));

  // ── PO_007: RESILIENCE MINIMUM ──
  // El mazo debe sobrevivir al menos un escenario adversarial sin colapsar.
  obligations.push(createObligation(
    OBLIGATION_TYPES.RESILIENCE_MINIMUM,
    'El mazo debe mantener viabilidad mínima bajo al menos un escenario adversarial',
    { metric: 'resilience_under_refutation', min: 0.35 },
    ['PO_006'] // Depende de que haya win path
  ));

  // ── PO_008: TRIBAL DENSITY (Condicional) ──
  if (tribe && tribe !== 'none' && tribe !== 'ninguna') {
    const tribalMinPct = contract.level0?.strictThemeFidelity?.value ? 0.70 : 0.50;
    obligations.push(createObligation(
      OBLIGATION_TYPES.TRIBAL_DENSITY,
      `Al menos ${Math.round(tribalMinPct * 100)}% de las criaturas deben pertenecer a la tribu ${tribe}`,
      { metric: 'tribal_creature_pct', min: tribalMinPct },
      ['PO_003'] // Depende de amenazas
    ));
  }

  // ── PO_009: CARD ADVANTAGE (Condicional — no-Aggro) ──
  if (!['AGGRO', 'BURN'].includes(archetype)) {
    const drawMin = archetype === 'CONTROL' ? 8 : 4;
    obligations.push(createObligation(
      OBLIGATION_TYPES.CARD_ADVANTAGE,
      `El mazo necesita al menos ${drawMin} fuentes de card advantage`,
      { metric: 'draw_source_count', min: drawMin },
      []
    ));
  }

  return obligations;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. EVALUACIÓN DE UNA OBLIGACIÓN CONTRA EVIDENCIA
//    (1ª y 2ª Ley: NO EVIDENCE → NO CLAIM & AI_INFERENCE ≠ PROVEN)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Evalúa una ProofObligation contra evidencia proporcionada por el software.
 * 
 * REGLAS INVIOLABLES:
 * - Sin evidenceChain → UNPROVEN (1ª Ley)
 * - AI_INFERENCE jamás → PROVEN (2ª Ley)
 * - Si status de dependencia es REFUTED/BLOCKED → BLOCKED (3ª Ley)
 * 
 * @param {Object} obligation - ProofObligation a evaluar
 * @param {Object} evidence - Evidencia proporcionada por el software
 * @param {Array} allObligations - Todas las obligaciones (para verificar dependencias)
 * @returns {Object} Obligación actualizada con nuevo status
 */
export function evaluateObligation(obligation, evidence, allObligations = []) {
  const evaluated = { ...obligation, evaluatedAt: new Date().toISOString() };

  // ── 3ª Ley: Verificar dependencias (ProofDependencyGraph) ──
  if (obligation.dependsOn && obligation.dependsOn.length > 0) {
    const blockedDeps = obligation.dependsOn.filter(depId => {
      const dep = allObligations.find(o => o.id === depId);
      return dep && (dep.status === OBLIGATION_STATUS.REFUTED || dep.status === OBLIGATION_STATUS.BLOCKED);
    });
    if (blockedDeps.length > 0) {
      evaluated.status = OBLIGATION_STATUS.BLOCKED;
      evaluated.evidenceChain = {
        source: 'DEPENDENCY_GRAPH',
        quality: EVIDENCE_QUALITY.DETERMINISTIC,
        data: { blockedBy: blockedDeps },
        timestamp: new Date().toISOString(),
        traceId: `TRACE-DEP-${obligation.id}`
      };
      return evaluated;
    }
  }

  // ── 1ª Ley: NO EVIDENCE → NO CLAIM ──
  if (!evidence || !evidence.value === undefined) {
    evaluated.status = OBLIGATION_STATUS.UNPROVEN;
    evaluated.evidenceChain = null;
    return evaluated;
  }

  // ── Construir EvidenceChain ──
  const chain = buildEvidenceChain(evidence, obligation);
  evaluated.evidenceChain = chain;

  // ── 2ª Ley: AI_INFERENCE jamás puede declarar PROVEN ──
  const quality = chain.quality;
  if (!quality || !quality.canProve) {
    // Evidencia insuficiente para demostrar, pero puede soportar
    const meetsThreshold = checkThreshold(obligation.threshold, evidence.value);
    evaluated.status = meetsThreshold ? OBLIGATION_STATUS.INCONCLUSIVE : OBLIGATION_STATUS.REFUTED;
    return evaluated;
  }

  // ── Verificar contra threshold ──
  const meetsThreshold = checkThreshold(obligation.threshold, evidence.value);
  evaluated.status = meetsThreshold ? OBLIGATION_STATUS.PROVEN : OBLIGATION_STATUS.REFUTED;

  return evaluated;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PROOF DEPENDENCY GRAPH — ROOT FAILURE ISOLATION (3ª Ley)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Construye el ProofDependencyGraph y propaga ROOT FAILURE.
 * Si PO_001 falla, todas las obligaciones que dependen de ella se marcan como BLOCKED.
 * Retorna las obligaciones ordenadas topológicamente y con root causes identificadas.
 * 
 * @param {Array<Object>} obligations - Lista de ProofObligations evaluadas
 * @returns {Object} { obligations: Array, rootFailures: Array, dependencyEdges: Array }
 */
export function buildDependencyGraph(obligations) {
  const rootFailures = [];
  const dependencyEdges = [];

  // 1. Construir mapa de dependencias
  const obligationMap = new Map();
  obligations.forEach(o => obligationMap.set(o.id, { ...o }));

  // 2. Construir edges
  obligations.forEach(o => {
    (o.dependsOn || []).forEach(depId => {
      dependencyEdges.push({ from: depId, to: o.id });
    });
  });

  // 3. Identificar ROOT FAILURES (obligaciones REFUTED sin dependencias fallidas)
  obligations.forEach(o => {
    if (o.status === OBLIGATION_STATUS.REFUTED) {
      const hasDependencyFailure = (o.dependsOn || []).some(depId => {
        const dep = obligationMap.get(depId);
        return dep && (dep.status === OBLIGATION_STATUS.REFUTED || dep.status === OBLIGATION_STATUS.BLOCKED);
      });
      if (!hasDependencyFailure) {
        rootFailures.push(o.id);
      }
    }
  });

  // 4. Propagar BLOCKED desde ROOT FAILURES
  const propagated = propagateBlockedStatus(obligations, rootFailures);

  // 5. Marcar rootCauseOf en las obligaciones raíz
  rootFailures.forEach(rootId => {
    const root = propagated.find(o => o.id === rootId);
    if (root) {
      root.rootCauseOf = findDependents(rootId, propagated);
    }
  });

  return {
    obligations: propagated,
    rootFailures,
    dependencyEdges
  };
}

/**
 * Propaga BLOCKED status a todas las obligaciones que dependen de ROOT FAILURES.
 */
function propagateBlockedStatus(obligations, rootFailures) {
  const result = obligations.map(o => ({ ...o }));
  const obligationMap = new Map();
  result.forEach(o => obligationMap.set(o.id, o));

  // BFS para propagar BLOCKED
  const queue = [...rootFailures];
  const visited = new Set(rootFailures);

  while (queue.length > 0) {
    const currentId = queue.shift();
    
    // Encontrar todas las obligaciones que dependen de currentId
    result.forEach(o => {
      if ((o.dependsOn || []).includes(currentId) && !visited.has(o.id)) {
        if (o.status !== OBLIGATION_STATUS.REFUTED) {
          o.status = OBLIGATION_STATUS.BLOCKED;
        }
        visited.add(o.id);
        queue.push(o.id);
      }
    });
  }

  return result;
}

/**
 * Encuentra todas las obligaciones que dependen directa o indirectamente de una obligación dada.
 */
function findDependents(obligationId, obligations) {
  const dependents = [];
  const queue = [obligationId];
  const visited = new Set([obligationId]);

  while (queue.length > 0) {
    const currentId = queue.shift();
    obligations.forEach(o => {
      if ((o.dependsOn || []).includes(currentId) && !visited.has(o.id)) {
        dependents.push(o.id);
        visited.add(o.id);
        queue.push(o.id);
      }
    });
  }

  return dependents;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DETECCIÓN DE CONTRADICCIONES (CROSS_STEP_CONTRADICTION)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Detecta contradicciones entre obligaciones resueltas.
 * Ejemplo: PO_003 (threats=20 PROVEN) + PO_004 (interaction=12 PROVEN) 
 *   pero deckSize=60 con 24 lands → solo 16 slots para 32 cartas requeridas = CONTRADICCIÓN.
 * 
 * @param {Array<Object>} obligations - Obligaciones evaluadas
 * @param {Object} deckState - Estado actual del mazo
 * @returns {Array<Object>} Lista de contradicciones detectadas
 */
export function detectContradictions(obligations, deckState = {}) {
  const contradictions = [];
  const provenObligations = obligations.filter(o => o.status === OBLIGATION_STATUS.PROVEN);

  // ── Contradicción 1: Slot Budget Overflow ──
  // Verificar si las obligaciones PROVEN exigen más slots de los disponibles
  const deckSize = deckState.deckSize || 60;
  const landCount = deckState.landCount || 24;
  const availableSpellSlots = deckSize - landCount;

  let minRequiredSlots = 0;
  const slotDemands = [];

  provenObligations.forEach(o => {
    if (o.threshold && o.threshold.metric && o.threshold.min && typeof o.threshold.min === 'number') {
      // Solo contar métricas que miden cantidad absoluta de cartas
      if (['threat_count', 'interaction_count', 'draw_source_count'].includes(o.threshold.metric)) {
        minRequiredSlots += o.threshold.min;
        slotDemands.push({ id: o.id, metric: o.threshold.metric, min: o.threshold.min });
      }
    }
  });

  if (minRequiredSlots > availableSpellSlots) {
    contradictions.push({
      type: 'SLOT_BUDGET_OVERFLOW',
      severity: 'CRITICAL',
      description: `Las obligaciones PROVEN exigen ${minRequiredSlots} slots de hechizos, pero solo hay ${availableSpellSlots} disponibles (${deckSize} - ${landCount} tierras).`,
      involvedObligations: slotDemands.map(d => d.id),
      data: { required: minRequiredSlots, available: availableSpellSlots, demands: slotDemands }
    });
  }

  // ── Contradicción 2: Strategic Direction Conflict ──
  // Un mazo no puede ser simultáneamente hyper-aggro (T1 plays) y control pesado
  const hasCurveAggressive = provenObligations.some(o => 
    o.type === OBLIGATION_TYPES.CURVE_EXECUTION && o.threshold?.min >= 0.80
  );
  const hasHeavyInteraction = provenObligations.some(o => 
    o.type === OBLIGATION_TYPES.INTERACTION_DENSITY && o.threshold?.min >= 12
  );

  if (hasCurveAggressive && hasHeavyInteraction) {
    contradictions.push({
      type: 'STRATEGIC_DIRECTION_CONFLICT',
      severity: 'WARNING',
      description: 'Las obligaciones implican simultáneamente una curva agresiva y una interacción pesada de control — direcciones potencialmente contradictorias.',
      involvedObligations: provenObligations
        .filter(o => o.type === OBLIGATION_TYPES.CURVE_EXECUTION || o.type === OBLIGATION_TYPES.INTERACTION_DENSITY)
        .map(o => o.id),
      data: {}
    });
  }

  // ── Contradicción 3: Unresolved Deferred Infrastructure Obligation (DEFERRED_CANNOT_REMAIN_UNRESOLVED) ──
  const unresolvedDeferred = obligations.filter(o => 
    o.type === OBLIGATION_TYPES.PO_INFRASTRUCTURE && o.status !== OBLIGATION_STATUS.PROVEN
  );

  if (unresolvedDeferred.length > 0) {
    contradictions.push({
      type: 'UNRESOLVED_DEFERRED_OBLIGATION',
      severity: 'CRITICAL',
      description: `Existen ${unresolvedDeferred.length} obligación(es) de infraestructura diferidas que no fueron cerradas antes de finalizar el mazo.`,
      involvedObligations: unresolvedDeferred.map(o => o.id),
      data: { unresolvedDeferred }
    });
  }

  // ── Contradicción 4: Orphan Demand Detection (Cartas Parásitas) ──
  if (deckState.infrastructureLedger) {
    for (const [key, item] of Object.entries(deckState.infrastructureLedger)) {
      if (item.demand > 0 && item.usable === 0) {
        contradictions.push({
          type: 'ORPHAN_DEMAND',
          severity: 'CRITICAL',
          description: `Se detectó demanda infraestructural de [${key}] (${item.demand} requeridos), pero el mazo posee 0 suministro utilizable. Carta Parásita detectada.`,
          involvedObligations: [],
          data: { key, demand: item.demand, usable: item.usable }
        });
      }
    }
  }

  // ── Contradicción 5: Orphan Engine Detection (Suministro Sin Función Estratégica) ──
  if (deckState.infrastructureLedger) {
    for (const [key, item] of Object.entries(deckState.infrastructureLedger)) {
      if (item.usable >= 10 && item.demand === 0 && !['INSTANT_SORCERY', 'EARLY_MANA'].includes(key)) {
        contradictions.push({
          type: 'ORPHAN_ENGINE',
          severity: 'WARNING',
          description: `Se detectó suministro elevado de [${key}] (${item.usable} utilizables), pero no existe ningún consumidor ni demanda registrada en el mazo.`,
          involvedObligations: [],
          data: { key, usable: item.usable, demand: item.demand }
        });
      }
    }
  }

  return contradictions;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. VALIDACIÓN DE EVIDENCE CHAIN (Trazabilidad Completa)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Valida la trazabilidad completa de una EvidenceChain.
 * Una chain válida debe tener: source, quality, data, timestamp, traceId.
 * 
 * @param {Object} chain - EvidenceChain a validar
 * @returns {Object} { valid: boolean, reason?: string }
 */
export function validateEvidenceChain(chain) {
  if (!chain) {
    return { valid: false, reason: 'EvidenceChain es null — NO EVIDENCE → NO CLAIM (1ª Ley)' };
  }

  const requiredFields = ['source', 'quality', 'data', 'timestamp', 'traceId'];
  for (const field of requiredFields) {
    if (chain[field] === undefined || chain[field] === null) {
      return { valid: false, reason: `EvidenceChain falta campo requerido: ${field}` };
    }
  }

  // Verificar que quality sea un nivel reconocido
  const validQualities = Object.values(EVIDENCE_QUALITY).map(q => q.label);
  if (!validQualities.includes(chain.quality?.label)) {
    return { valid: false, reason: `EvidenceQuality "${chain.quality?.label}" no es un nivel reconocido` };
  }

  // Verificar minSamples para SIMULATED_HIGH
  if (chain.quality?.label === 'SIMULATED_HIGH' && chain.data?.sampleSize < EVIDENCE_QUALITY.SIMULATED_HIGH.minSamples) {
    return { 
      valid: false, 
      reason: `SIMULATED_HIGH requiere N≥${EVIDENCE_QUALITY.SIMULATED_HIGH.minSamples}, pero N=${chain.data.sampleSize}` 
    };
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. PROOF COVERAGE (7ª Ley — Diagnóstico, NO Score)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Calcula Proof Coverage como indicador diagnóstico.
 * NO es un score ni una función objetivo. Es instrumentación para saber
 * cuántas obligaciones se han demostrado.
 * 
 * @param {Array<Object>} obligations - Todas las obligaciones
 * @returns {Object} Reporte de cobertura
 */
export function computeProofCoverage(obligations) {
  const total = obligations.length;
  if (total === 0) {
    return { proven: 0, total: 0, coverage: 0, breakdown: {} };
  }

  const byStatus = {};
  Object.values(OBLIGATION_STATUS).forEach(s => { byStatus[s] = 0; });
  obligations.forEach(o => {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
  });

  return {
    proven: byStatus[OBLIGATION_STATUS.PROVEN] || 0,
    total,
    coverage: (byStatus[OBLIGATION_STATUS.PROVEN] || 0) / total,
    breakdown: byStatus,
    // Diagnóstico: obligaciones críticas no demostradas
    unprovenCritical: obligations
      .filter(o => o.status !== OBLIGATION_STATUS.PROVEN && o.status !== OBLIGATION_STATUS.BLOCKED)
      .map(o => ({ id: o.id, type: o.type, status: o.status }))
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construye una EvidenceChain a partir de evidencia cruda.
 */
function buildEvidenceChain(evidence, obligation) {
  const qualityLevel = resolveEvidenceQuality(evidence);
  
  return {
    source: evidence.source || 'SOFTWARE_DETERMINISTIC',
    quality: qualityLevel,
    data: {
      value: evidence.value,
      metric: obligation.threshold?.metric,
      sampleSize: evidence.sampleSize || null,
      rawData: evidence.rawData || null
    },
    timestamp: new Date().toISOString(),
    traceId: `TRACE-${obligation.id}-${Date.now()}`
  };
}

/**
 * Resuelve el nivel de EvidenceQuality según la fuente y los datos.
 */
function resolveEvidenceQuality(evidence) {
  if (!evidence || !evidence.source) {
    return EVIDENCE_QUALITY.AI_INFERENCE;
  }

  const source = evidence.source.toUpperCase();
  
  if (source === 'DETERMINISTIC' || source === 'SOFTWARE_DETERMINISTIC' || source === 'DECK_STATE') {
    return EVIDENCE_QUALITY.DETERMINISTIC;
  }
  
  if (source === 'MONTE_CARLO' || source === 'SIMULATION') {
    const sampleSize = evidence.sampleSize || 0;
    return sampleSize >= 10000 
      ? EVIDENCE_QUALITY.SIMULATED_HIGH 
      : EVIDENCE_QUALITY.SIMULATED_LOW;
  }
  
  if (source === 'META_DATA' || source === 'EXTERNAL_META' || source === 'MTGTOP8') {
    return EVIDENCE_QUALITY.EXTERNAL_META;
  }
  
  if (source === 'AI' || source === 'AI_INFERENCE' || source === 'LLM') {
    return EVIDENCE_QUALITY.AI_INFERENCE;
  }

  // Default conservador
  return EVIDENCE_QUALITY.SIMULATED_LOW;
}

/**
 * Verifica si un valor cumple con el threshold de una obligación.
 */
function checkThreshold(threshold, value) {
  if (!threshold || value === undefined || value === null) return false;
  
  if (threshold.min !== undefined && value < threshold.min) return false;
  if (threshold.max !== undefined && value > threshold.max) return false;
  
  return true;
}
