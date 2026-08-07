/**
 * src/services/compiler/core/strategicInteractionModel.js
 * 
 * StrategicInteractionModel: Modelo de Colisión Causal entre Motores Estratégicos v21.0.
 * Analiza la colisión estructural entre el vector propio y el vector del oponente,
 * prediciendo cuellos de botella por turno y recomendando capacidades contrafácticas de respuesta.
 */

import { StrategyVector } from './strategyVector.js';

export class StrategicInteractionModel {
  /**
   * Modela la colisión de interacción entre mi mazo y el del rival
   */
  static modelInteractionCollision(myDeck = [], opponentDeck = []) {
    const myVector = StrategyVector.buildVectorFromDeck(myDeck);
    const oppVector = StrategyVector.buildVectorFromDeck(opponentDeck);

    const similarity = StrategyVector.cosineSimilarity(myVector, oppVector);

    // Predicción de conflicto por colisión de motores
    let turnBottleneckConflict = null;
    let executionImpactDelta = 0;
    const recommendations = [];

    if (oppVector.interaction > 0.40 && myVector.resource > 0.50) {
      turnBottleneckConflict = 'Turn 2 Counterspell / Removal interruption of Resource Acceleration';
      executionImpactDelta = -18;
      recommendations.push({
        action: 'INJECT_PROTECTION_CAPABILITY',
        details: 'Inyectar capacidad de protección de maná (Cavern of Souls / Veil of Summer / Protection) para amortiguar la interacción rival en Turno 2.'
      });
    } else if (oppVector.strategicPressure > 0.70 && myVector.protection < 0.30) {
      turnBottleneckConflict = 'Early Turn Aggro Pressure breach of defenses';
      executionImpactDelta = -15;
      recommendations.push({
        action: 'INJECT_INTERACTION_CAPABILITY',
        details: 'Aumentar fuentes de remoción temprana de CMC 1-2 para frenar la presión estocástica rival.'
      });
    }

    return Object.freeze({
      myStrategyVector: myVector,
      opponentStrategyVector: oppVector,
      structuralSimilarityScore: similarity,
      turnBottleneckConflict,
      predictedExecutionImpactDelta: executionImpactDelta,
      counterStrategyRecommendations: Object.freeze(recommendations)
    });
  }
}
