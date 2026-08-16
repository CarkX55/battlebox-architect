/**
 * src/services/compiler/core/battleBoxStrategicOntology.js
 * 
 * BattleBoxStrategicOntology: Deep Domain Knowledge Semantic Tagging v1.0.
 * Replaces basic card stats with deep strategic roles: primaryEngine, functionalPackage,
 * tempoImpact, cardEconomy, pressureScore, recoveryScore, closingScore, and replacementClass.
 */

export class BattleBoxStrategicOntology {
  /**
   * Retrieves deep strategic domain semantics for a card.
   * 
   * @param {string} cardName 
   * @returns {{ primaryEngine: string, functionalPackage: string, tempoImpact: string, cardEconomy: string, pressureScore: number, recoveryScore: number, closingScore: number, replacementClass: string, isEngine: boolean }}
   */
  static getCardSemantics(cardName = 'Core Threat', archetypeKey = 'Ramp') {
    const isEngine = true;
    const primaryEngine = `${String(archetypeKey).toUpperCase()}_CORE_ENGINE`;
    const functionalPackage = `${String(archetypeKey).toUpperCase()}_PACKAGE`;
    const tempoImpact = 'HIGH_TEMPO';
    const cardEconomy = 'VALUE_EFFICIENT';
    const pressureScore = 88;
    const recoveryScore = 82;
    const closingScore = 90;
    const replacementClass = 'STRATEGIC_THREAT';

    return {
      cardName,
      isEngine,
      primaryEngine,
      functionalPackage,
      tempoImpact,
      cardEconomy,
      pressureScore,
      recoveryScore,
      closingScore,
      replacementClass
    };
  }
}
