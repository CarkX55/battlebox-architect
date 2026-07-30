/**
 * src/services/autonomousStrategicPipeline.js
 * 
 * Hito 10: Servicio Conector de la Arquitectura v6.0 Autonomous Strategic Planner para la UI
 * 
 * Expone un flujo de ejecución limpio y determinista que conecta los 9 hitos de v6.0
 * directamente con DeckForge.jsx y BlueprintEditor.jsx.
 */

import { createDeckIntent, createVictoryPlan, createGoalGraph, createAdaptiveStrategyPlan } from '../models/deckModels.js';
import { createStrategicSession, updateWorkingStrategyPlan, updateWorkingBlueprint, consolidateDeckCards, normalizeForgeInput } from '../models/strategicState.js';
import { analyzeCardIntelligence } from './cardIntelligenceEngine.js';
import { buildCausalCardGraph } from './cardGraphService.js';
import { discoverEnginesFromCapabilities } from './engineDiscoveryService.js';
import { buildEngineGraph } from './engineGraphService.js';
import { composeDynamicBlueprint } from './strategicEngineComposer.js';
import { buildFunctionalPackages } from './functionalPackageService.js';
import { assembleDeckInSession } from './hybridAssemblerService.js';
import { validateSessionDeck } from './deckOperationValidator.js';
import { executeRefinementLoop, runAdversarialMonteCarloScenarios } from './refinementLoopService.js';
import { generateExplicabilityReport, recordStrategicPattern } from './strategicMemoryService.js';
import { getAllCards } from './dbIngestor.js';
import { buildCardPool } from './ragService.js';
import { generateAbstractStrategyPlan } from './strategyReasoningEngine.js';

/**
 * Ejecuta el pipeline completo de planificación estratégica v6.0.
 * 
 * @param {Object} formData Datos del formulario de la UI (format, colors, archetype, speed, prompt, etc.)
 * @returns {Object} Resultado completo para la UI (deck, session, snapshot, explicabilityReport, blueprint)
 */
export async function runV6AutonomousPipeline(formData = {}) {
  const normInput = normalizeForgeInput(formData);
  // 1. DeckIntent & Objetivos Cuestionales
  const intent = createDeckIntent(normInput);
  const session = createStrategicSession(intent);
  const victoryPlan = createVictoryPlan(intent);
  const goalGraph = createGoalGraph(victoryPlan);

  const abstractPlan = generateAbstractStrategyPlan(normInput);

  const strategyPlan = createAdaptiveStrategyPlan({
    macroStrategy: `${intent.strategicArchetype.toUpperCase()} (${abstractPlan.strategy || 'Causal'}) Strategy`,
    targetTurnExecution: abstractPlan.targetTurnExecution,
    strategyGraph: abstractPlan.strategyGraph,
    requiredCapabilities: abstractPlan.requiredCapabilities,
    openingPlan: { targetTurn: 2, goal: 'Desarrollar maná / aceleración / filtrado' },
    midgameTransition: { targetTurn: Math.floor(abstractPlan.targetTurnExecution), goal: 'Desplegar motor principal y control' },
    closingPlan: { targetTurn: Math.ceil(abstractPlan.targetTurnExecution + 1.5), goal: 'Ejecución letal / Finisher' }
  }, 1, 92);

  updateWorkingStrategyPlan(session, strategyPlan);

  // 2. Obtener pool de cartas candidatas mediante RAG Semántico + Scoring de Tribu/Sinergias
  let candidatePool = [];
  try {
    const ragResult = await buildCardPool(formData);
    if (ragResult && Array.isArray(ragResult.pool) && ragResult.pool.length > 0) {
      candidatePool = ragResult.pool;
    }
  } catch (err) {
    console.warn('[v6.0 Pipeline] Fallback a getAllCards por error en RAG:', err.message);
  }

  if (candidatePool.length === 0) {
    const allCards = await getAllCards();
    candidatePool = allCards.slice(0, 150);
  }

  // 2.5 Filter candidate pool with DeckIdentityEngine FIRST to eliminate forbidden directions
  const { buildDeckIdentity } = await import('../judge/identity/DeckIdentityEngine.js');
  const deckIdentity = buildDeckIdentity(normInput);
  const cleanPool = candidatePool.filter(card => !deckIdentity.isCardForbidden(card));

  session.candidatePool = cleanPool;
  session.working.deckIdentity = deckIdentity;

  // 3. Causal Card Graph & Engine Discovery & Weighted EngineGraph
  const causalCardGraph = buildCausalCardGraph(cleanPool);
  const discoveredNodes = discoverEnginesFromCapabilities(causalCardGraph, cleanPool);
  const engineGraph = buildEngineGraph(discoveredNodes, session);

  // 4. Strategic Engine Composer -> Dynamic Blueprint
  const blueprint = composeDynamicBlueprint(session, engineGraph);
  updateWorkingBlueprint(session, blueprint);

  // 5. Functional Packages & Hybrid Assembler
  const packages = buildFunctionalPackages(cleanPool, blueprint);
  assembleDeckInSession(session, cleanPool, packages);

  // 6. Validadores SSOT de Contrato
  const validationResult = validateSessionDeck(session);

  // 7. MDP Player Adversarial Simulator & Refinement Loop con Rollback
  const finalSnapshot = await executeRefinementLoop(session, 2);

  // 8. Persistencia en Memoria Temporal & Reporte de Explicabilidad
  recordStrategicPattern({
    archetype: intent.strategicArchetype,
    abstractRule: 'BalancedResourceBudget > GreedyHighCMCSpells',
    confidence: 0.96
  }, { format: intent.format });

  const explicabilityReport = generateExplicabilityReport(session);

  return {
    success: true,
    deck: consolidateDeckCards(session.working.currentDeck),
    session,
    victoryPlan,
    goalGraph,
    causalCardGraph,
    engineGraph,
    blueprint,
    validationResult,
    finalSnapshot,
    explicabilityReport,
    hierarchicalUtility: finalSnapshot.hierarchicalUtility || session.working.hierarchicalUtility,
    resourceBudget: session.working.resourceBudget,
    adversarialResults: session.working.adversarialResults
  };
}
