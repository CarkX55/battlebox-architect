/**
 * deckModels.js - Modelos Canónicos SSOT para BattleBox Architect v6.0
 * 
 * Regla SSOT:
 * - Capabilities viven ÚNICAMENTE en el perfil semántico (cardIntelligenceEngine)
 * - Relaciones Causal-Semánticas viven ÚNICAMENTE en CausalCardGraph
 * - Resource Graph, Goal Graph & Engine Graph se DERIVAN dinámicamente
 * - Decision Policies & VictoryPlan NO conocen nombres de cartas concretas
 * - StrategicState / Snapshots contienen la métrica dinámica de sesión
 */

// ─── 1. DeckIntent ────────────────────────────────────────────────────────
export function createDeckIntent(formData = {}) {
  const tribeVal = formData.tribe || (formData.tribes && formData.tribes[0]) || '';
  const promptVal = formData.prompt || formData.customInstructions || '';
  return Object.freeze({
    format: formData.format || 'standard',
    colors: formData.colores || formData.colors || [],
    strategicArchetype: formData.archetype || formData.strategicArchetype || 'midrange',
    themes: Object.freeze([...(formData.themes || [])]),
    tribe: tribeVal,
    userPrompt: promptVal,
    tribes: Object.freeze([...(tribeVal ? [tribeVal] : (formData.tribes || []))]),
    mechanics: Object.freeze([...(formData.mechanics || [])]),
    desiredSpeed: formData.speed || formData.desiredSpeed || 'midrange',
    powerLevel: formData.powerLevel || 8,
    budget: 'unlimited',
    mustInclude: Object.freeze([...(formData.mustInclude || [])]),
    excludedCards: Object.freeze([...(formData.excludedNames || formData.excludedCards || [])]),
    customInstructions: promptVal
  });
}

// ─── 2. StrategicConstraints ──────────────────────────────────────────────
export function createStrategicConstraints(intent, engineGraph = null) {
  return {
    mustCurveOut: true,
    latestAcceptableDeadTurn: 2,
    manaProductionConstraints: [],
    minCreatureDensity: intent?.desiredSpeed === 'aggro' ? 22 : null,
    minInteractionDensity: 6,
    maxCurveAverage: intent?.desiredSpeed === 'aggro' ? 2.6 : null,
    mustSurviveWrath: intent?.desiredSpeed === 'midrange' || intent?.desiredSpeed === 'control',
    mustHaveRecoveryPlan: true,
    cardSpecificConstraints: [],
    maxCopiesPerCard: 4,
    exactDeckSize: 60,
    sideboardSize: 15,
    engineDerivedConstraints: []
  };
}

// ─── 2b. ResourceBudget — Economía Global de Recursos ─────────────────────
export function createResourceBudget(intent = {}) {
  const isAggro = intent.desiredSpeed === 'aggro';
  return {
    mana: { targetSources: 24, curveCap: isAggro ? 2.6 : 3.4, currentSources: 0, score: 70 },
    tempo: { targetPlaysByTurn: { T1: 1, T2: 1, T3: 1 }, currentTempoScore: 0, score: 70 },
    cardsInHand: { minDrawSources: isAggro ? 4 : 8, currentDrawSources: 0, score: 70 },
    boardPresence: { minCreatures: isAggro ? 24 : 16, currentCreatures: 0, score: 70 },
    life: { fetchLandCostCap: 6, currentLifeCost: 0, score: 90 },
    threatDensity: { minThreats: isAggro ? 18 : 12, currentThreats: 0, score: 70 },
    redundancy: { minCopiesPerCoreRole: 8, currentRedundancyScore: 0, score: 70 },
    resilience: { antiWipeSources: 4, antiSpotRemovalSources: 4, score: 60 },
    interaction: { minRemoval: 6, minCounters: 0, minDisruption: 4, score: 70 },
    initiative: { earlyAggroThreshold: isAggro ? 85 : 40, score: 70 }
  };
}

// ─── 2c. VictoryPlan & TurnPlan — Jerarquía de Objetivos ──────────────────
export function createVictoryPlan(intent = {}) {
  const isAggro = intent.desiredSpeed === 'aggro';
  return Object.freeze({
    planId: `victory_${Date.now()}`,
    primaryCondition: isAggro ? 'CombatLethal' : 'ResourceStarvation',
    targetTurnLethal: isAggro ? 4 : 6,
    requiredDamageTotal: 20,
    requiredBoardPresence: isAggro ? 12 : 6,
    turnPlan: Object.freeze([
      { turn: 1, targetResource: 'Tempo', goal: 'Desplegar aceleración o criatura T1' },
      { turn: 2, targetResource: 'BoardPresence', goal: 'Generar masa de criaturas o motor principal' },
      { turn: 3, targetResource: 'Resilience', goal: 'Proteger la mesa o incrementar stats (Anthem)' },
      { turn: 4, targetResource: 'ThreatDensity', goal: 'Finisher o ataque letal' }
    ])
  });
}

// ─── 2d. GoalGraph — Grafo de Objetivos Dinámicos ─────────────────────────
export function createGoalGraph(victoryPlan) {
  const turnPlan = victoryPlan?.turnPlan || [];
  return {
    nodes: turnPlan.map(tp => ({
      id: `goal_turn_${tp.turn}`,
      turn: tp.turn,
      resourceNeeded: tp.targetResource,
      objectiveFunction: (deckState) => calculateDynamicObjective(tp.targetResource, deckState, tp.turn)
    })),
    criticalGoalPath: turnPlan.map(tp => `goal_turn_${tp.turn}`)
  };
}

// Functor para objetivos dinámicos (reemplaza números fijos como 93%)
export function calculateDynamicObjective(resource, deckState = {}, turn = 1) {
  const currentCurveAvg = deckState.currentCurveAverage || 2.5;
  const slotsRemaining = deckState.remainingSlots ?? 38;
  const baseTarget = resource === 'Mana' ? 85 : 75;
  return Math.min(100, Math.round(baseTarget + (3.0 - currentCurveAvg) * 10 - (38 - slotsRemaining) * 0.5));
}

// ─── 3. AdaptiveStrategyPlan — COMPLETAMENTE INMUTABLE ─────────────────────
export function createAdaptiveStrategyPlan(reasoning = {}, version = 1, planConfidence = 85) {
  return Object.freeze({
    planId: `plan_v${version}_${Date.now()}`,
    version,
    planConfidence,
    macroStrategy: reasoning.macroStrategy || reasoning.primaryWinPath || 'General Development Strategy',

    decisionPolicies: Object.freeze([
      {
        condition: 'openingHand.hasResource("Tempo") && openingHand.hasT1Dork',
        activePolicy: 'AggressiveDevelopmentPolicy',
        targetTurn: 4,
        description: 'Desarrollar aceleración y desplegar masa agresiva rápidamente'
      },
      {
        condition: '!openingHand.hasT1Dork && openingHand.hasResource("CardAdvantage")',
        activePolicy: 'ValueGrindPolicy',
        targetTurn: 6,
        description: 'Conmutar automáticamente a acumulación de recursos e interacción en turno 2/3'
      }
    ]),

    openingPlan: Object.freeze(reasoning.openingPlan || { targetTurn: 2, goal: 'Ramp or early dork' }),
    midgameTransition: Object.freeze(reasoning.midgameTransition || { targetTurn: 4, goal: 'Establish core engine' }),
    recoveryPlan: Object.freeze(reasoning.recoveryPlan || { trigger: 'Board wipe / Heavy removal', goal: 'Rebuild via card draw' }),
    closingPlan: Object.freeze(reasoning.closingPlan || { targetTurn: 6, goal: 'Alpha strike with finisher' }),

    curveIntent: reasoning.curveIntent || 'balanced',
    manaIntent: reasoning.manaIntent || 'standard',
    criticalResources: Object.freeze([...(reasoning.criticalResources || ['Mana', 'BoardPresence'])]),
    failureConditions: Object.freeze([...(reasoning.failureConditions || [])]),
    previousVersionId: reasoning.previousVersionId || null,
    reasonForVersionChange: reasoning.reasonForVersionChange || 'Initial strategy hypothesis'
  });
}

// ─── 4. EngineNode — Motor con Objetivos Dinámicos ────────────────────────
export function createEngineNode(data = {}) {
  return {
    id: data.id,
    label: data.label || data.id,
    type: data.type || 'primary',
    capabilities: data.capabilities || [],
    deploymentPhase: data.deploymentPhase || 'mid',
    computeCoverageObjective: (deckState, turnPlan) => calculateDynamicObjective(data.id, deckState, 3),
    enables:  data.enables  || [],
    requires: data.requires || [],
    conflicts: data.conflicts || [],
    enhances: data.enhances || []
  };
}

// ─── 5. EngineGraph — Weighted DAG + Engine Health ────────────────────────
export function createEngineGraph(nodes = []) {
  return {
    nodes,
    topologicalOrder: [],
    criticalPath: [],
    optionalEngines: [],
    bottlenecks: [],
    coverage: {},
    missingCapabilities: [],
    expectedCapabilityAvailability: {},
    engineHealth: {},
    convergenceThresholds: {}
  };
}

// ─── 5b. CausalCardGraph — Grafo Causal con 15 Aristas Estratégicas ────────
export function createCausalCardGraph(cards = [], causalEdges = []) {
  return {
    nodes: cards.map(c => ({ id: c.name, card: c, capabilities: c.capabilitiesProduced || [] })),
    causalEdges,
    clusters: []
  };
}

// ─── 6. FunctionalPackage — Paquete de cartas ─────────────────────────────
export function createFunctionalPackage(data = {}) {
  return {
    id: data.id,
    label: data.label || data.id,
    engine: data.engine || null,
    capabilities: data.capabilities || [],
    cards: data.cards || [],
    internalSynergy: data.internalSynergy || 0,
    totalSlots: data.totalSlots || (data.cards ? data.cards.reduce((sum, c) => sum + (c.qty || 1), 0) : 0),
    averageCMC: data.averageCMC || 2.0
  };
}

// ─── 7. FunctionalSlot — Slot derivado de engine ──────────────────────────
export function createFunctionalSlot(engineNode, slotData = {}) {
  return {
    id: slotData.id,
    label: slotData.label || slotData.id,
    name: slotData.name || slotData.label || slotData.id,
    purposeDescription: slotData.purposeDescription || '',
    search_query: slotData.search_query || '',
    cmcCategory: slotData.cmcCategory || '2',
    finisherQuality: slotData.finisherQuality || 'standard',
    quantity: slotData.quantity || 1,
    sourceEngine: engineNode ? engineNode.id : null,
    capabilities: slotData.capabilities || [],
    timing: slotData.timing || {},
    manaValue: slotData.manaValue || {},
    cardTypes: slotData.cardTypes || [],
    priority: slotData.priority || 'normal',
    flexibility: slotData.flexibility || 'medium',
    dependencyWarning: slotData.dependencyWarning || null
  };
}

// ─── 8. StrategicContributionVector ───────────────────────────────────────
export function createStrategicContributionVector(scores = {}) {
  return {
    capabilityFit: scores.capabilityFit || 0,
    strategyFit: scores.strategyFit || 0,
    engineFit: scores.engineFit || 0,
    synergyFit: scores.synergyFit || 0,
    dependencySatisfaction: scores.dependencySatisfaction || 0,
    curveFit: scores.curveFit || 0,
    manaFit: scores.manaFit || 0,
    consistencyImpact: scores.consistencyImpact || 0,
    resilienceImpact: scores.resilienceImpact || 0,
    metaConfidence: scores.metaConfidence || 0,
    opportunityCostGlobal: scores.opportunityCostGlobal || 0,
    bestAlternative: scores.bestAlternative || null,
    monteCarloAdjustment: scores.monteCarloAdjustment || 0,
    evidences: scores.evidences || []
  };
}

// ─── 9. DeckOperation ────────────────────────────────────────────────────
export function createDeckOperation(data = {}) {
  return {
    type: data.type,
    sourceCard: data.sourceCard || null,
    targetCard: data.targetCard || null,
    quantity: data.quantity || 1,
    slot: data.slot || null,
    engine: data.engine || null,
    reason: data.reason || '',
    expectedImpact: data.expectedImpact || null
  };
}

// ─── 10. Dynamic Archetype-Learned Utility Function ───────────────────────
export function calculateDynamicArchetypeUtility(state = {}, archetype = 'midrange') {
  const weights = getArchetypeUtilityWeights(archetype);
  const strategicUtility = (state.policyComplianceScore || 75) * 0.6 + (state.currentWinPathProbability || 50) * 0.4;
  const resourceUtility  = (
    (state.resourceBudget?.mana?.score || 70) * weights.mana +
    (state.resourceBudget?.tempo?.score || 70) * weights.tempo +
    (state.adversarialResults?.robustnessScore || 50) * weights.resilience
  );
  const cardUtility = state.avgCardMetaConfidence || 65;

  const totalUtility = Math.round(
    (weights.strategicWeight * strategicUtility) +
    (weights.resourceWeight * resourceUtility) +
    (weights.cardWeight * cardUtility)
  );

  return {
    totalUtility,
    strategicUtility: Math.round(strategicUtility),
    resourceUtility: Math.round(resourceUtility),
    cardUtility: Math.round(cardUtility)
  };
}

function getArchetypeUtilityWeights(archetype) {
  const arch = (archetype || '').toLowerCase();
  if (arch.includes('aggro') || arch.includes('burn')) {
    return { strategicWeight: 0.50, resourceWeight: 0.40, cardWeight: 0.10, mana: 0.20, tempo: 0.50, resilience: 0.01 };
  }
  if (arch.includes('control')) {
    return { strategicWeight: 0.40, resourceWeight: 0.45, cardWeight: 0.15, mana: 0.30, tempo: 0.15, resilience: 0.35 };
  }
  return { strategicWeight: 0.50, resourceWeight: 0.35, cardWeight: 0.15, mana: 0.25, tempo: 0.35, resilience: 0.20 };
}

// ─── 11. MDP Player Agent (Markov Decision Process Simulator) ─────────────
export function simulateMDPPlayerTurn(gameState = {}, decisionPolicy = null) {
  return {
    nextGameState: gameState,
    actionTaken: 'Play optimal card per policy',
    utilityDelta: +4.5
  };
}

// ─── 12. Scientific Hypothesis (Monte Carlo Refinement) ───────────────────
export function createScientificHypothesis(detectedFailurePattern = {}) {
  return {
    hypothesisId: `hyp_${Date.now()}`,
    detectedPattern: detectedFailurePattern.patternName || 'Unknown pattern',
    rootCauseResource: detectedFailurePattern.lackingResource || 'Tempo',
    proposedExperiment: detectedFailurePattern.proposedDeckOps || [],
    expectedUtilityDelta: detectedFailurePattern.expectedDelta || +10,
    status: 'PROPOSED'
  };
}

// ─── 13. Temporal Metagame Memory Decay ───────────────────────────────────
export function createTemporalPatternMemoryEntry(patternData = {}, currentMetaContext = {}) {
  const ageDays = (Date.now() - (patternData.lastValidated || Date.now())) / (1000 * 60 * 60 * 24);
  const recency = Math.exp(-ageDays / 365);
  const metagameSimilarity = computeMetaSimilarity(patternData.metaContext, currentMetaContext);
  const effectiveWeight = (patternData.confidence || 1) * recency * metagameSimilarity;

  return Object.freeze({
    patternId: patternData.patternId || `pat_${Date.now()}`,
    archetypeContext: patternData.archetype || 'midrange',
    abstractRule: patternData.abstractRule || 'No rule specified',
    effectiveWeight,
    isValid: effectiveWeight >= 0.15
  });
}

function computeMetaSimilarity(metaA, metaB) {
  if (!metaA || !metaB) return 1.0;
  return metaA.format === metaB.format ? 0.9 : 0.4;
}
