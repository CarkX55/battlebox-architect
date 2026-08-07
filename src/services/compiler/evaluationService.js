/**
 * src/services/compiler/evaluationService.js
 * 
 * EvaluationService: Motor Canónico de Evaluación Multidimensional Enchufable.
 * Conecta los evaluadores desacoplados (Tempo, Curve, Interaction, Consistency, Resilience)
 * para responder a: "¿Esta modificación mejora el mazo y en qué métricas?"
 */

import { MetricsService } from './metricsService.js';
import { StateQueryService } from './stateQueryService.js';

export class EvaluationService {
  constructor() {
    this.evaluators = [];
    this.loadStandardEvaluators();
  }

  registerEvaluator(evaluator) {
    if (!evaluator || !evaluator.id || typeof evaluator.evaluate !== 'function') {
      throw new Error('[EvaluationService Error] Evaluador inválido.');
    }
    this.evaluators.push(evaluator);
  }

  loadStandardEvaluators() {
    // 1. Evaluador de Interacción barata
    this.registerEvaluator({
      id: 'InteractionEvaluator',
      weight: 1.5,
      evaluate: (state, metrics, query) => {
        const removalDensity = metrics.getRemovalDensity();
        return {
          score: Math.min(100, removalDensity * 300),
          metric: 'RemovalDensity',
          value: removalDensity
        };
      }
    });

    // 2. Evaluador de Aceleración de Maná
    this.registerEvaluator({
      id: 'TempoEvaluator',
      weight: 1.2,
      evaluate: (state, metrics, query) => {
        const rampCount = query.getManaAcceleration();
        return {
          score: Math.min(100, rampCount * 12.5),
          metric: 'ManaAcceleration',
          value: rampCount
        };
      }
    });

    // 3. Evaluador de Curva de Maná
    this.registerEvaluator({
      id: 'CurveEvaluator',
      weight: 1.0,
      evaluate: (state, metrics, query) => {
        const curveEntropy = metrics.getCurveEntropy();
        return {
          score: Math.min(100, curveEntropy * 45),
          metric: 'CurveEntropy',
          value: curveEntropy
        };
      }
    });

    // 4. Evaluador de Resiliencia y Evasión
    this.registerEvaluator({
      id: 'ResilienceEvaluator',
      weight: 1.1,
      evaluate: (state, metrics, query) => {
        const resilience = metrics.getResilienceScore();
        return {
          score: resilience,
          metric: 'ResilienceScore',
          value: resilience
        };
      }
    });
  }

  /**
   * Ejecuta todos los evaluadores enchufados sobre el StrategicState
   */
  evaluateState(strategicState) {
    const metrics = new MetricsService(strategicState);
    const query = new StateQueryService(strategicState);
    const evaluations = {};
    let totalScore = 0;
    let totalWeight = 0;

    for (const ev of this.evaluators) {
      try {
        const res = ev.evaluate(strategicState, metrics, query);
        evaluations[ev.id] = res;
        totalScore += (res.score || 0) * (ev.weight || 1.0);
        totalWeight += (ev.weight || 1.0);
      } catch (err) {
        console.error(`[EvaluationService Error] Falló evaluador ${ev.id}:`, err);
      }
    }

    const aggregateScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;

    return {
      aggregateScore,
      evaluations,
      timestamp: Date.now()
    };
  }

  /**
   * Compara dos estados e indica si la modificación mejoró la puntuación multidimensional
   */
  compareStates(prevState, proposedState) {
    const evalPrev = this.evaluateState(prevState);
    const evalProposed = this.evaluateState(proposedState);

    const deltaScore = evalProposed.aggregateScore - evalPrev.aggregateScore;

    return {
      improved: deltaScore >= 0,
      deltaScore,
      prevScore: evalPrev.aggregateScore,
      proposedScore: evalProposed.aggregateScore,
      evaluationsPrev: evalPrev.evaluations,
      evaluationsProposed: evalProposed.evaluations
    };
  }
}
