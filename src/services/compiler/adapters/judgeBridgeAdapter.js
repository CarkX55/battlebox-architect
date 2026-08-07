/**
 * src/services/compiler/adapters/judgeBridgeAdapter.js
 * 
 * JudgeBridgeAdapter: Adaptador de Puente para el Motor de Evaluación de Juez y Auditoría de Pilares.
 * Conecta deckAuditorService.js con el Strategic Kernel v11 sin modificar su código interno.
 */

import { analyzeFunctionalPillars, evaluateConsistencyRadar } from '../../deckAuditorService.js';
import { InvariantEngine, loadStandardInvariants } from '../invariantEngine.js';

export class JudgeBridgeAdapter {
  constructor() {
    this.id = 'JudgeBridgeAdapter';
    this.phase = 'Judge';
    this.requires = ['RankerBridgeAdapter'];
    this.capabilities = {
      canRead: ['deckState'],
      canWrite: ['judgeResults'],
      consumesEvents: ['DecisionTaken'],
      producesEvents: ['JudgeEvaluated']
    };

    this.invariantEngine = new InvariantEngine();
    loadStandardInvariants(this.invariantEngine);
  }

  async execute({ context, state, artifacts }) {
    context.log('info', `[JudgeBridgeAdapter] Evaluando salud y consistencia del mazo.`);

    const deckCards = (state.deckState?.slots || []).filter(Boolean);

    // 1. Auditoría de Pilares Funcionales y Radar de Consistencia
    const pillarAnalysis = analyzeFunctionalPillars(deckCards, context.config.archetype);
    const radarData = evaluateConsistencyRadar(deckCards, context.config.archetype);

    // 2. Validación Declarativa de Invariantes Estructurales
    const violations = this.invariantEngine.validateSlots(state.deckState?.slots || [], state);

    const judgeScore = Math.min(100, Math.max(0, Math.round(radarData.totalScore || 85) - (violations.length * 15)));

    const judgeResults = {
      judgeScore,
      pillarAnalysis,
      radarData,
      violations
    };

    state.mutate(st => {
      st.reasoningState.judgeResults = judgeResults;
    });

    if (artifacts) {
      artifacts.addFact('JUDGE_SCORE', judgeScore, 80, 0.95, 'JudgeBridgeAdapter');
      artifacts.setMetric('JudgeScore', judgeScore, 'points');

      violations.forEach(v => {
        artifacts.addAlert(v.level, v.id, v.message, v.suggestedFix);
      });

      artifacts.addEvidence(
        'JudgeBridgeAdapter',
        { judgeScore, violationsCount: violations.length },
        [{ statement: `Evaluación de Juez completada con Score: ${judgeScore} y ${violations.length} violaciones.` }]
      );
    }

    context.eventBus.emit('JudgeEvaluated', {
      judgeScore,
      violationsCount: violations.length,
      violations
    }, { producer: this.id });

    return {
      status: 'SUCCESS',
      judgeScore,
      violationsCount: violations.length
    };
  }
}
