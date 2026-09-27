/**
 * src/services/autonomousStrategicPipeline.js
 * 
 * BattleBox Architect Master Deterministic Pipeline Bridge.
 * Executes CompilerConvergencePipeline.compileDeckFromScratch() to guarantee
 * 100% 14-Pass Observability, Single Canonical DeckConstructionState, Karsten 24 Lands,
 * Monte Carlo 5,000 Games, and OracleTraceLog Synchronization.
 */

import { createDeckIntent } from '../models/deckModels.js';
import { normalizeForgeInput } from '../models/strategicState.js';
import { buildDeckIdentity } from '../judge/identity/DeckIdentityEngine.js';
import { buildCardPool } from './ragService.js';
import { getAllCards } from './dbIngestor.js';
import { IntentBuilder } from './compiler/core/intentBuilder.js';
import { AgenticDeckArchitect } from './agent/agenticDeckArchitect.js';
import { OracleTraceLog } from '../knowledge/Serving/OracleTraceLog.js';
import { CopyAllocationAuditor } from './compiler/core/copyAllocationAuditor.js';
import { DeckTelemetry } from './compiler/core/deckTelemetry.js';
import { CompilerConvergencePipeline } from '../knowledge/compiler/CompilerConvergencePipeline.js';
import { CanonicalBlueprintModel } from './compiler/core/canonicalBlueprintModel.js';

export const V7_STRATEGIC_COMPILER_ENABLED = true;

export async function runV6AutonomousPipeline(formData = {}) {
  const normInput = normalizeForgeInput(formData);
  const intentPackage = IntentBuilder.buildFromUI(formData);

  let candidatePool = [];
  try {
    const allCards = await getAllCards();
    if (Array.isArray(allCards) && allCards.length > 0) {
      candidatePool = allCards;
    }
  } catch (err) {
    console.warn('[Agentic Architecture] getAllCards error:', err.message);
  }

  if (candidatePool.length < 20) {
    try {
      const ragResult = await buildCardPool(formData);
      if (ragResult && Array.isArray(ragResult.pool) && ragResult.pool.length > 0) {
        candidatePool = ragResult.pool;
      }
    } catch (err) {
      console.warn('[Agentic Architecture] RAG Pool error:', err.message);
    }
  }

  // Execute Master Compiler Convergence Pipeline (v26.1 Causal Compilation)
  const convergenceResult = CompilerConvergencePipeline.compileDeckFromScratch({
    userPrompt: formData.customPrompt || `Mazo competitivo ${normInput.archetype || 'Midrange'} ${(normInput.colors || []).join('/')}`,
    archetype: normInput.archetype,
    format: normInput.format || 'Standard',
    rawCardPool: candidatePool || [],
    uiFormState: normInput
  });

  if (convergenceResult.buildStatus === 'FAILED_PREFLIGHT') {
    throw new Error(`[Strategic Compiler] Pre-flight Check Failed`);
  }

  const canonicalBlueprint = CanonicalBlueprintModel.createFromConvergenceResult(convergenceResult);
  return {
    success: convergenceResult.buildStatus === 'SUCCESS',
    pipelineVersion: 'v26.1-Causal-Compiler-Master',
    sessionId: `sess_${Date.now()}`,
    deck: convergenceResult.state?.cards || [],
    summary: convergenceResult.deckStateSummary || {},
    tacticalReport: convergenceResult.tacticalSimulationReport || {},
    reActLogs: [],
    oracleTraceLog: convergenceResult.oracleTraceLog || OracleTraceLog,
    blueprint: canonicalBlueprint,
    convergenceResult
  };
}


