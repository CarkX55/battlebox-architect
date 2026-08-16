/**
 * BATTLEBOX REACT EXPERT AGENT (v23.0 Consolidated Single-Agent Core)
 * 
 * The Single Cognitive Core of BattleBox.
 * Commands the consolidated Tool Suite (DebateTool, OpponentAnalysisTool, KnowledgeRetrievalTool,
 * TurnSimulationTool, CoachExplanationTool, ManaSolverTool, DeckEvaluationTool)
 * and learns from StrategicEpisodicMemory.
 */

import { IntentLock } from './intentLock.js';
import { strategicEpisodicMemory } from './episodicMemory.js';
import { DebateTool } from './tools/debateTool.js';
import { OpponentAnalysisTool } from './tools/opponentAnalysisTool.js';
import { KnowledgeRetrievalEngine } from './tools/knowledgeRetrievalEngine.js';
import { TurnSimulationTool } from './tools/turnSimulationTool.js';
import { CoachExplanationTool } from './tools/coachExplanationTool.js';
import { DeckStateManager } from './tools/deckStateManager.js';
import { ReasoningMemory, IMPORTANCE_TIERS } from './reasoningMemory.js';
import { StrategicSupervisor } from './strategicSupervisor.js';

export class BattleBoxAgent {
  constructor(intentPackage) {
    this.intentLock = IntentLock.fromIntentPackage(intentPackage);
    this.stateManager = new DeckStateManager(this.intentLock);
    this.reasoningMemory = new ReasoningMemory();
    this.supervisor = new StrategicSupervisor(this.intentLock);
    
    this.recalledEpisodes = [];
    this.cognitiveLogs = [];
    this.coachExplanations = [];
  }

  logCognition(phase, thought, action = null) {
    this.cognitiveLogs.push({
      timestamp: new Date().toISOString(),
      phase,
      thought,
      action
    });
  }

  async runReActLoop() {
    // 1. Recall Episodic Lessons from StrategicEpisodicMemory
    this.recalledEpisodes = strategicEpisodicMemory.recallSimilarEpisodes(this.intentLock);
    if (this.recalledEpisodes.length > 0) {
      this.logCognition('RECALL_EPISODIC_MEMORY', `Recuperada lección episódica de partida anterior (${this.recalledEpisodes[0].episodeId}): ${this.recalledEpisodes[0].episodicLesson}`);
    }

    // 2. Invoke DebateTool for Plan Competition
    const debate = DebateTool.evaluatePlanDebate(this.intentLock);
    this.logCognition('INVOKE_DEBATE_TOOL', `DebateTool invocado: ${debate.summary}`);

    // 3. Invoke OpponentAnalysisTool
    const opponentModel = OpponentAnalysisTool.analyzeOpponentMeta('Control');
    this.logCognition('INVOKE_OPPONENT_TOOL', `OpponentAnalysisTool invocado vs ${opponentModel.targetOpponent}: ${opponentModel.profile.requiredAdaptation}`);

    // 4. Search Knowledge Package for Ramp
    let knowledgePkgRamp = KnowledgeRetrievalEngine.searchKnowledge({
      minCmc: 1,
      maxCmc: 2,
      requiredType: 'Creature'
    }, this.intentLock);

    if (knowledgePkgRamp.candidates.length > 0) {
      const chosenRamp = knowledgePkgRamp.candidates[0];
      const alternatives = knowledgePkgRamp.candidates.slice(1).map(c => c.name);

      // Invoke TurnSimulationTool
      const sim = TurnSimulationTool.simulateOpeningHands(chosenRamp, this.stateManager.getMetrics());

      if (sim.simulationPassed) {
        const coachExp = CoachExplanationTool.formatExplanation(
          chosenRamp,
          alternatives,
          `Alineado con lección episódica ${this.recalledEpisodes[0]?.episodeId || 'base'}`
        );
        this.coachExplanations.push(coachExp);

        this.stateManager.addCard(chosenRamp, 4, coachExp.explanation);

        this.reasoningMemory.recordDecision({
          cardName: chosenRamp.name,
          count: 4,
          choiceRationale: coachExp.explanation,
          evaluatedAlternatives: alternatives,
          importanceRank: IMPORTANCE_TIERS.CRITICAL_FOUNDATION
        });

        this.logCognition('DECIDE_AND_JUSTIFY', `Añadidas 4 copias de ${chosenRamp.name}`, { explanation: coachExp.explanation });
      }
    }

    // 5. Search Knowledge Package for Threats
    const knowledgePkgThreats = KnowledgeRetrievalEngine.searchKnowledge({
      minCmc: 3,
      maxCmc: 5,
      requiredType: 'Creature'
    }, this.intentLock);

    if (knowledgePkgThreats.candidates.length > 0) {
      const chosenThreat = knowledgePkgThreats.candidates[0];
      const alternatives = knowledgePkgThreats.candidates.slice(1).map(c => c.name);

      const coachExp = CoachExplanationTool.formatExplanation(
        chosenThreat,
        alternatives,
        `Adaptación vs ${opponentModel.profile.primaryThreat}`
      );
      this.coachExplanations.push(coachExp);

      this.stateManager.addCard(chosenThreat, 4, coachExp.explanation);

      this.reasoningMemory.recordDecision({
        cardName: chosenThreat.name,
        count: 4,
        choiceRationale: coachExp.explanation,
        evaluatedAlternatives: alternatives,
        importanceRank: IMPORTANCE_TIERS.CORE_ENGINE
      });

      this.logCognition('DECIDE_AND_JUSTIFY', `Añadidas 4 copias de ${chosenThreat.name}`);
    }

    // 6. Search Knowledge Package for Interaction
    const knowledgePkgInteraction = KnowledgeRetrievalEngine.searchKnowledge({
      minCmc: 1,
      maxCmc: 3
    }, this.intentLock);

    if (knowledgePkgInteraction.candidates.length > 0) {
      const chosenInteraction = knowledgePkgInteraction.candidates[0];
      const alternatives = knowledgePkgInteraction.candidates.slice(1).map(c => c.name);

      const coachExp = CoachExplanationTool.formatExplanation(
        chosenInteraction,
        alternatives,
        'Interacción de tempo en Turno 2'
      );
      this.coachExplanations.push(coachExp);

      this.stateManager.addCard(chosenInteraction, 4, coachExp.explanation);

      this.reasoningMemory.recordDecision({
        cardName: chosenInteraction.name,
        count: 4,
        choiceRationale: coachExp.explanation,
        evaluatedAlternatives: alternatives,
        importanceRank: IMPORTANCE_TIERS.UTILITY_RESPONSE
      });

      this.logCognition('DECIDE_AND_JUSTIFY', `Añadidas 4 copias de ${chosenInteraction.name}`);
    }

    // 7. Auto-resolve Frank Karsten Mana Base
    this.logCognition('AUTO_RESOLVE_MANA', 'Resolviendo base de tierras Frank Karsten deterministamente');
    this.stateManager.autoResolveManaBase();

    // 8. Audit Progress with StrategicSupervisor
    this.supervisor.auditProgress(this.stateManager.getMetrics(), this.reasoningMemory);

    return {
      deckList: this.stateManager.exportDeckList(),
      metrics: this.stateManager.getMetrics(),
      cognitiveLogs: this.cognitiveLogs,
      reasoningTrace: this.reasoningMemory.exportCausalTrace(),
      coachExplanations: this.coachExplanations,
      recalledEpisodes: this.recalledEpisodes,
      debateSummary: debate.summary,
      debate: debate,
      opponentModel: opponentModel,
      opponentAdaptation: opponentModel.profile.requiredAdaptation,
      activeHypothesis: { id: 'HYPOTHESIS_A', description: 'Ramp into Big Threats' },
      supervisorAudits: this.supervisor.auditLogs,
      gameplan: {
        timeline: {
          'Turn 1': 'Desplegar aceleración inicial / mana acceleration',
          'Turn 2': 'Establecer presencia de mesa',
          'Turn 3+': 'Desplegar amenazas principales'
        }
      },
      confidenceReport: { overallConfidence: 0.85 }
    };
  }
}
