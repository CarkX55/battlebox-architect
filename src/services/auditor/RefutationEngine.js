/**
 * src/services/auditor/RefutationEngine.js
 * 
 * Motor Adversarial de Refutación del Sistema de Verificación Estratégica v9.3.
 * 
 * Responsabilidades:
 * 1. Genera escenarios adversariales R1-R10 para intentar ROMPER la estrategia del mazo.
 * 2. Ejecuta cada refutación deterministamente contra el mazo y los resultados de Monte Carlo.
 * 3. Evalúa el impacto de cada escenario contra los thresholds de las ProofObligations.
 * 4. Resume la resiliencia global del mazo frente a todos los vectores.
 * 
 * PRINCIPIO FUNDAMENTAL:
 * - REFUTATION ≠ FAILURE automáticamente.
 * - Un escenario adversarial solo refuta una obligación si el impacto la lleva
 *   por debajo de su threshold. Una caída del 10% puede ser aceptable si el mazo
 *   aún cumple su obligación mínima.
 * 
 * LEYES INVIOLABLES IMPLEMENTADAS:
 * - 4ª Ley: La IA propone hipótesis; el software ejecuta la simulación.
 * - 9ª Ley: El RefutationEngine diagnostica, no decide cartas.
 */

import { EVIDENCE_QUALITY, OBLIGATION_STATUS } from './ProofObligationEngine.js';
import { isLand } from '../deckCalculator.js';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS: Vectores de Refutación R1-R10
// ─────────────────────────────────────────────────────────────────────────────
export const REFUTATION_VECTORS = Object.freeze({
  R1_THREAT_REMOVED_T2:    { id: 'R1',  label: 'THREAT_REMOVED_T2',    description: 'Amenaza principal removida en T2 (Path to Exile, Fatal Push)', applicability: 'ALL' },
  R2_MANA_DENIED:          { id: 'R2',  label: 'MANA_DENIED',          description: 'Sin fuentes de color correctas en T1-T2 (Blood Moon, Wasteland)',  applicability: 'ALL' },
  R3_SWEEPER_T3_T4:        { id: 'R3',  label: 'SWEEPER_T3_T4',        description: 'Board wipe enemigo en T3-T4 (Wrath of God, Supreme Verdict)',      applicability: 'CREATURE_HEAVY' },
  R4_COUNTER_KEY_SPELL:    { id: 'R4',  label: 'COUNTER_KEY_SPELL',    description: 'Hechizo clave contrarrestado (Counterspell)',                       applicability: 'ALL' },
  R5_GRAVEYARD_EXILE:      { id: 'R5',  label: 'GRAVEYARD_EXILE',      description: 'Cementerio exiliado (Rest in Peace, Leyline of the Void)',           applicability: 'GRAVEYARD_DEPENDENT' },
  R6_ARTIFACT_HATE:        { id: 'R6',  label: 'ARTIFACT_HATE',        description: 'Destrucción de artefactos (Stony Silence, Collector Ouphe)',         applicability: 'ARTIFACT_DEPENDENT' },
  R7_FLOOD_SCENARIO:       { id: 'R7',  label: 'FLOOD_SCENARIO',       description: '5+ tierras en mano — escenario de flood',                           applicability: 'ALL' },
  R8_SCREW_SCENARIO:       { id: 'R8',  label: 'SCREW_SCENARIO',       description: '0-1 tierras en mano — escenario de screw',                           applicability: 'ALL' },
  R9_MIRROR_TEMPO:         { id: 'R9',  label: 'MIRROR_TEMPO',         description: 'Oponente con plan idéntico pero más rápido',                         applicability: 'ALL' },
  R10_HATE_PIECE:          { id: 'R10', label: 'HATE_PIECE',           description: 'Pieza de odio específica contra la estrategia',                      applicability: 'ALL' }
});

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS: Niveles de Impacto
// ─────────────────────────────────────────────────────────────────────────────
const IMPACT_LEVELS = Object.freeze({
  NEGLIGIBLE: { label: 'NEGLIGIBLE', maxDrop: 0.05, description: 'Caída <5%' },
  MINOR:      { label: 'MINOR',      maxDrop: 0.15, description: 'Caída 5-15%' },
  SIGNIFICANT:{ label: 'SIGNIFICANT', maxDrop: 0.30, description: 'Caída 15-30%' },
  CRITICAL:   { label: 'CRITICAL',    maxDrop: 1.00, description: 'Caída >30%' }
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. GENERACIÓN DE ESCENARIOS ADVERSARIALES
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Genera escenarios adversariales aplicables a este mazo y sus obligaciones.
 * Filtra los vectores R1-R10 según la composición del mazo.
 * 
 * @param {Array} deck - Mazo actual (cards array)
 * @param {Array} obligations - ProofObligations generadas
 * @param {Object} strategicPlan - Plan estratégico del mazo
 * @returns {Array<Object>} Escenarios adversariales aplicables
 */
export function generateAdversarialScenarios(deck = [], obligations = [], strategicPlan = {}) {
  const deckProfile = analyzeDeckProfile(deck);
  const scenarios = [];
  let scenarioCounter = 0;

  for (const vector of Object.values(REFUTATION_VECTORS)) {
    // Filtrar vectores por aplicabilidad
    if (!isVectorApplicable(vector, deckProfile)) continue;

    scenarioCounter++;
    const scenarioId = `ADV_${vector.id}_${String(scenarioCounter).padStart(3, '0')}`;

    scenarios.push({
      scenarioId,
      vector: vector.id,
      label: vector.label,
      description: vector.description,
      applicability: vector.applicability,
      // Las obligaciones que este escenario puede refutar
      targetObligations: identifyTargetObligations(vector, obligations),
      status: 'PENDING',
      result: null
    });
  }

  return scenarios;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. EJECUCIÓN DE REFUTACIÓN
//    (4ª Ley: Software ejecuta deterministamente la simulación)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Ejecuta una refutación: simula el escenario adversarial contra el mazo.
 * 
 * REGLA: REFUTATION ≠ FAILURE automáticamente.
 * El impacto se mide contra el threshold de la obligación objetivo.
 * 
 * @param {Object} scenario - Escenario adversarial a ejecutar
 * @param {Array} deck - Mazo actual
 * @param {Object} monteCarloResult - Resultado previo de Monte Carlo (baseline)
 * @param {Array} obligations - ProofObligations para verificar thresholds
 * @returns {Object} Resultado de la refutación
 */
export function executeRefutation(scenario, deck = [], monteCarloResult = {}, obligations = []) {
  const baseline = extractBaselineFromMC(monteCarloResult, scenario.vector);
  
  // Simular el impacto del escenario adversarial sobre el mazo
  const scenarioProbability = simulateScenarioImpact(scenario, deck, monteCarloResult);
  
  const delta = scenarioProbability - baseline;
  const dropPct = baseline > 0 ? Math.abs(delta / baseline) : 0;
  const impactLevel = classifyImpact(dropPct);

  // Verificar contra thresholds de las obligaciones objetivo
  const obligationVerdicts = [];
  (scenario.targetObligations || []).forEach(poId => {
    const obligation = obligations.find(o => o.id === poId);
    if (!obligation) return;

    const threshold = obligation.threshold?.min || 0;
    const underThreshold = scenarioProbability < threshold;

    obligationVerdicts.push({
      obligationId: poId,
      obligationType: obligation.type,
      threshold,
      scenarioProbability,
      underThreshold,
      // REGLA CLAVE: solo REFUTED si cae bajo el threshold
      verdict: underThreshold ? 'REFUTED' : 'SUPPORTED'
    });
  });

  const overallStatus = obligationVerdicts.some(v => v.verdict === 'REFUTED') ? 'REFUTED' : 'SUPPORTED';

  return {
    scenarioId: scenario.scenarioId,
    vector: scenario.vector,
    label: scenario.label,
    baseline,
    scenarioProbability,
    delta,
    dropPct: Math.round(dropPct * 100),
    impact: impactLevel.label,
    status: overallStatus,
    obligationVerdicts,
    evidenceChain: {
      source: 'SOFTWARE_DETERMINISTIC',
      quality: EVIDENCE_QUALITY.DETERMINISTIC,
      data: {
        baseline,
        scenarioProbability,
        delta,
        impact: impactLevel.label,
        vector: scenario.vector
      },
      timestamp: new Date().toISOString(),
      traceId: `TRACE-REFUTE-${scenario.scenarioId}`
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. EVALUACIÓN DE RESILIENCIA GLOBAL
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Resume la resiliencia del mazo frente a todos los escenarios adversariales.
 * 
 * @param {Array<Object>} refutationResults - Resultados de todas las refutaciones
 * @returns {Object} Resumen de resiliencia
 */
export function assessResilience(refutationResults = []) {
  if (refutationResults.length === 0) {
    return {
      overallResilience: 'UNKNOWN',
      scenariosTested: 0,
      scenariosSupported: 0,
      scenariosRefuted: 0,
      criticalVulnerabilities: [],
      resilienceProfile: {}
    };
  }

  const supported = refutationResults.filter(r => r.status === 'SUPPORTED');
  const refuted = refutationResults.filter(r => r.status === 'REFUTED');
  const critical = refutationResults.filter(r => r.impact === 'CRITICAL');

  // Clasificar resiliencia global
  let overallResilience = 'HIGH';
  if (refuted.length > 0 && critical.length > 0) {
    overallResilience = 'LOW';
  } else if (refuted.length > 0) {
    overallResilience = 'MODERATE';
  } else if (critical.length > 0) {
    overallResilience = 'FRAGILE';
  }

  // Perfil por vector
  const resilienceProfile = {};
  refutationResults.forEach(r => {
    resilienceProfile[r.vector] = {
      status: r.status,
      impact: r.impact,
      delta: r.delta,
      baseline: r.baseline,
      scenarioProbability: r.scenarioProbability
    };
  });

  return {
    overallResilience,
    scenariosTested: refutationResults.length,
    scenariosSupported: supported.length,
    scenariosRefuted: refuted.length,
    criticalVulnerabilities: critical.map(r => ({
      vector: r.vector,
      label: r.label,
      impact: r.impact,
      dropPct: r.dropPct,
      refutedObligations: (r.obligationVerdicts || []).filter(v => v.verdict === 'REFUTED').map(v => v.obligationId)
    })),
    resilienceProfile
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analiza el perfil del mazo para filtrar vectores de refutación aplicables.
 */
function analyzeDeckProfile(deck) {
  let creatureCount = 0;
  let graveyardDependent = false;
  let artifactDependent = false;
  let totalCards = 0;

  deck.forEach(card => {
    const qty = card.quantity || card.count || card.copies || 1;
    totalCards += qty;
    const typeLine = (card.type_line || card.typeLine || card.type || '').toLowerCase();
    const oracle = (card.oracle_text || card.text || '').toLowerCase();

    if (typeLine.includes('creature')) creatureCount += qty;
    if (oracle.includes('graveyard') || oracle.includes('dies') || oracle.includes('mill') || oracle.includes('dredge')) {
      graveyardDependent = true;
    }
    if (typeLine.includes('artifact') || oracle.includes('artifact')) {
      artifactDependent = true;
    }
  });

  return {
    totalCards,
    creatureCount,
    creatureHeavy: creatureCount >= 15,
    graveyardDependent,
    artifactDependent
  };
}

/**
 * Determina si un vector de refutación es aplicable a este mazo.
 */
function isVectorApplicable(vector, deckProfile) {
  if (vector.applicability === 'ALL') return true;
  if (vector.applicability === 'CREATURE_HEAVY') return deckProfile.creatureHeavy;
  if (vector.applicability === 'GRAVEYARD_DEPENDENT') return deckProfile.graveyardDependent;
  if (vector.applicability === 'ARTIFACT_DEPENDENT') return deckProfile.artifactDependent;
  return true;
}

/**
 * Identifica qué obligaciones puede refutar un vector dado.
 */
function identifyTargetObligations(vector, obligations) {
  const targets = [];

  obligations.forEach(o => {
    const vectorId = vector.id;

    // R1 (Amenaza removida) ataca: THREAT_DENSITY, WIN_PATH_VIABLE
    if (vectorId === 'R1' && ['THREAT_DENSITY', 'WIN_PATH_VIABLE'].includes(o.type)) targets.push(o.id);
    // R2 (Mana denied) ataca: MANA_CASTABILITY, CURVE_EXECUTION
    if (vectorId === 'R2' && ['MANA_CASTABILITY', 'CURVE_EXECUTION'].includes(o.type)) targets.push(o.id);
    // R3 (Sweeper) ataca: THREAT_DENSITY, WIN_PATH_VIABLE, RESILIENCE_MINIMUM
    if (vectorId === 'R3' && ['THREAT_DENSITY', 'WIN_PATH_VIABLE', 'RESILIENCE_MINIMUM'].includes(o.type)) targets.push(o.id);
    // R4 (Counter) ataca: WIN_PATH_VIABLE, CAUSAL_CHAIN_INTACT
    if (vectorId === 'R4' && ['WIN_PATH_VIABLE', 'CAUSAL_CHAIN_INTACT'].includes(o.type)) targets.push(o.id);
    // R5 (Graveyard exile) ataca: CAUSAL_CHAIN_INTACT, WIN_PATH_VIABLE
    if (vectorId === 'R5' && ['CAUSAL_CHAIN_INTACT', 'WIN_PATH_VIABLE'].includes(o.type)) targets.push(o.id);
    // R6 (Artifact hate) ataca: CAUSAL_CHAIN_INTACT, WIN_PATH_VIABLE
    if (vectorId === 'R6' && ['CAUSAL_CHAIN_INTACT', 'WIN_PATH_VIABLE'].includes(o.type)) targets.push(o.id);
    // R7 (Flood) ataca: CURVE_EXECUTION, WIN_PATH_VIABLE
    if (vectorId === 'R7' && ['CURVE_EXECUTION', 'WIN_PATH_VIABLE'].includes(o.type)) targets.push(o.id);
    // R8 (Screw) ataca: MANA_CASTABILITY, CURVE_EXECUTION
    if (vectorId === 'R8' && ['MANA_CASTABILITY', 'CURVE_EXECUTION'].includes(o.type)) targets.push(o.id);
    // R9 (Mirror tempo) ataca: WIN_PATH_VIABLE, RESILIENCE_MINIMUM
    if (vectorId === 'R9' && ['WIN_PATH_VIABLE', 'RESILIENCE_MINIMUM'].includes(o.type)) targets.push(o.id);
    // R10 (Hate piece) ataca: CAUSAL_CHAIN_INTACT, WIN_PATH_VIABLE, RESILIENCE_MINIMUM
    if (vectorId === 'R10' && ['CAUSAL_CHAIN_INTACT', 'WIN_PATH_VIABLE', 'RESILIENCE_MINIMUM'].includes(o.type)) targets.push(o.id);
  });

  return targets;
}

/**
 * Extrae la probabilidad baseline del resultado de Monte Carlo según el vector.
 */
function extractBaselineFromMC(mcResult, vectorId) {
  if (!mcResult) return 0.70; // Default conservador

  // Para vectores relacionados con maná, usar datos de maná
  if (['R2', 'R7', 'R8'].includes(vectorId)) {
    const manaT2 = (mcResult.manaAvailablePct?.turn2 || 75) / 100;
    return manaT2;
  }

  // Para vectores relacionados con amenazas
  if (['R1', 'R3', 'R9'].includes(vectorId)) {
    // Usar probabilidad de juego en T1 como proxy de presión
    const t1Play = (mcResult.turn1PlayPct || 50) / 100;
    return Math.max(t1Play, 0.50);
  }

  // Para vectores generales (R4, R5, R6, R10), usar el promedio ponderado
  const perfectHand = (mcResult.mulliganRisk?.perfectHandPct || 60) / 100;
  return Math.max(perfectHand, 0.50);
}

/**
 * Simula el impacto de un escenario adversarial sobre el mazo.
 * Esta es una simulación determinista que modela el peor caso del escenario.
 */
function simulateScenarioImpact(scenario, deck, mcResult) {
  const baseline = extractBaselineFromMC(mcResult, scenario.vector);
  const deckProfile = analyzeDeckProfile(deck);

  switch (scenario.vector) {
    case 'R1': {
      // Amenaza principal removida T2: impacto depende de diversidad de amenazas
      const threatDiversity = Math.min(deckProfile.creatureCount / 20, 1.0);
      // Más diversidad = menos impacto
      const impactFactor = 1 - (threatDiversity * 0.5);
      return Math.max(0, baseline * (1 - impactFactor * 0.3));
    }
    
    case 'R2': {
      // Mana denied T1-T2: basado en el ratio de tierras especiales vs básicas
      const landCards = deck.filter(c => isLand(c));
      const totalLands = landCards.reduce((sum, c) => sum + (c.quantity || c.count || 1), 0);
      const basicCount = landCards.filter(c => {
        const name = (c.name || '').toLowerCase();
        return ['plains', 'island', 'swamp', 'mountain', 'forest',
                'snow-covered plains', 'snow-covered island', 'snow-covered swamp',
                'snow-covered mountain', 'snow-covered forest'].includes(name);
      }).reduce((sum, c) => sum + (c.quantity || c.count || 1), 0);
      
      const basicRatio = totalLands > 0 ? basicCount / totalLands : 0;
      // Más básicas = más resistencia a Blood Moon/Wasteland
      return baseline * (0.3 + basicRatio * 0.6);
    }
    
    case 'R3': {
      // Sweeper T3-T4: impacto basado en cuántas criaturas hay en juego
      const creatureRatio = Math.min(deckProfile.creatureCount / 25, 1.0);
      // Más criaturas = más impacto del sweeper
      return baseline * (1 - creatureRatio * 0.5);
    }
    
    case 'R4': {
      // Counter key spell: impacto depende de redundancia de win conditions
      const winConditions = deck.filter(c => {
        const cmc = c.cmc || c.mana_value || 0;
        return cmc >= 4 && !isLand(c);
      });
      const redundancy = Math.min(winConditions.length / 6, 1.0);
      return baseline * (0.4 + redundancy * 0.5);
    }
    
    case 'R5': {
      // Graveyard exile: si el mazo no depende del cementerio, impacto mínimo
      if (!deckProfile.graveyardDependent) return baseline * 0.95;
      return baseline * 0.25; // Impacto devastador para mazos de graveyard
    }
    
    case 'R6': {
      // Artifact hate: si el mazo no depende de artefactos, impacto mínimo
      if (!deckProfile.artifactDependent) return baseline * 0.95;
      return baseline * 0.30;
    }
    
    case 'R7': {
      // Flood: usar directamente el dato de Monte Carlo
      const floodPct = (mcResult?.mulliganRisk?.floodHandPct || 10) / 100;
      // En flood, la probabilidad de ejecutar el plan cae proporcionalmente
      return baseline * (1 - floodPct * 1.5);
    }
    
    case 'R8': {
      // Screw: usar directamente el dato de Monte Carlo
      const screwPct = (mcResult?.mulliganRisk?.zeroOrOneLandPct || 15) / 100;
      return baseline * (1 - screwPct * 2.0);
    }
    
    case 'R9': {
      // Mirror tempo: depende de la velocidad del mazo (CMC promedio bajo = más resistente)
      const nonLands = deck.filter(c => !isLand(c));
      const avgCmc = nonLands.length > 0 
        ? nonLands.reduce((sum, c) => sum + (c.cmc || c.mana_value || 0), 0) / nonLands.length 
        : 3.0;
      // CMC promedio bajo = más resistente a un oponente más rápido
      const speedFactor = Math.max(0, 1 - (avgCmc / 5));
      return baseline * (0.3 + speedFactor * 0.5);
    }
    
    case 'R10': {
      // Hate piece genérica: impacto moderado por defecto
      // Sería más preciso con conocimiento del formato/meta
      return baseline * 0.55;
    }
    
    default:
      return baseline * 0.70;
  }
}

/**
 * Clasifica el nivel de impacto basado en el porcentaje de caída.
 */
function classifyImpact(dropPct) {
  if (dropPct <= IMPACT_LEVELS.NEGLIGIBLE.maxDrop) return IMPACT_LEVELS.NEGLIGIBLE;
  if (dropPct <= IMPACT_LEVELS.MINOR.maxDrop) return IMPACT_LEVELS.MINOR;
  if (dropPct <= IMPACT_LEVELS.SIGNIFICANT.maxDrop) return IMPACT_LEVELS.SIGNIFICANT;
  return IMPACT_LEVELS.CRITICAL;
}
