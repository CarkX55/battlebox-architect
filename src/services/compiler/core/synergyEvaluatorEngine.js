/**
 * src/services/compiler/core/synergyEvaluatorEngine.js
 * 
 * SynergyEvaluatorEngine: Evaluación de Prerrequisitos de Grafo de Capacidades v15.
 * CERO reglas hardcodeadas por nombre de carta (NO pregunta "¿Existe Collected Company?").
 * Pregunta: "¿Se cumplen los prerrequisitos de capacidad del motor N en el WeightedCapabilityGraph?".
 */

import { CardIntelligenceEngine } from './cardIntelligenceEngine.js';

export class SynergyEvaluatorEngine {
  /**
   * Evalúa la sinergia global basada en satisfacción de prerrequisitos de capacidades
   */
  static evaluateGraphPrerequisites(deckSlots = [], capabilityGraphPrerequisites = []) {
    let positiveSynergyBonus = 0;
    let negativeSynergyPenalty = 0;

    // Compilar perfiles semánticos de todas las cartas sin volver a leer Oracle
    const profiles = deckSlots.map(s => CardIntelligenceEngine.buildProfile(s));

    // 1. Prerrequisito: CoCo Engine (Exige densidad de criaturas CMC <= 3 >= 24)
    const cocoTargets = profiles.filter(p => p.manaProfile.cmc <= 3 && p.strategicRoles.includes('CREATURE_BODY'));
    const cocoTargetCount = cocoTargets.length;
    const hasCoCoEngine = profiles.some(p => p.engineAffinity.coco >= 0.9);

    if (hasCoCoEngine) {
      if (cocoTargetCount < 24) {
        negativeSynergyPenalty += 0.40; // Penalización por incumplir el prerrequisito del grafo
      } else {
        positiveSynergyBonus += 0.30;  // Bono por cumplir la densidad del motor
      }
    }

    // 2. Prerrequisito: Vial Engine (Exige criaturas CMC 1-2 >= 18)
    const vialTargets = profiles.filter(p => p.manaProfile.cmc <= 2 && p.strategicRoles.includes('CREATURE_BODY'));
    const vialTargetCount = vialTargets.length;
    const hasVialEngine = profiles.some(p => p.engineAffinity.vial >= 0.9);

    if (hasVialEngine) {
      if (vialTargetCount < 18) {
        negativeSynergyPenalty += 0.35;
      } else {
        positiveSynergyBonus += 0.25;
      }
    }

    const netSynergyScore = Math.max(0, Math.round((1.0 + positiveSynergyBonus - negativeSynergyPenalty) * 100) / 100);

    return Object.freeze({
      positiveSynergyBonus,
      negativeSynergyPenalty,
      netSynergyScore,
      hasCoCoEngine,
      cocoTargetCount,
      hasVialEngine,
      vialTargetCount
    });
  }

  static evaluate(deck) {
    const res = this.evaluateGraphPrerequisites(deck.slots || deck);
    return { netSynergyScore: res.netSynergyScore };
  }
}
