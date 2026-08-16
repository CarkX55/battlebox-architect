/**
 * COGNITIVE CONFIDENCE EVALUATOR (v21.0 Feedback Loop Engine)
 * 
 * Measures module confidence percentages (Ramp, Threats, Interaction, ManaBase).
 * Instructs reinvestigation loops if confidence in any critical module falls below 80%.
 */

export class CognitiveConfidenceEvaluator {
  static evaluateConfidence(deckStateMetrics, reasoningMemory) {
    const totalCards = deckStateMetrics.totalCards;
    
    // Evaluate individual module confidence
    const rampCount = (deckStateMetrics.curve[1] || 0) + (deckStateMetrics.curve[2] || 0);
    const threatCount = (deckStateMetrics.curve[3] || 0) + (deckStateMetrics.curve[4] || 0);
    const interactionCount = (deckStateMetrics.curve[2] || 0);

    const rampConfidence = rampCount >= 4 ? 0.98 : 0.50;
    const threatConfidence = threatCount >= 4 ? 0.90 : 0.60;
    const interactionConfidence = interactionCount >= 4 ? 0.85 : 0.40;
    const manaConfidence = totalCards >= 60 ? 1.00 : 0.70;

    const moduleConfidence = {
      ramp: rampConfidence,
      threats: threatConfidence,
      interaction: interactionConfidence,
      manaBase: manaConfidence
    };

    // Calculate overall confidence score
    const overallConfidence = (rampConfidence + threatConfidence + interactionConfidence + manaConfidence) / 4;
    const requiresReinvestigation = overallConfidence < 0.80;

    let targetModuleToInvestigate = null;
    if (interactionConfidence < 0.80) targetModuleToInvestigate = 'interaction';
    else if (threatConfidence < 0.80) targetModuleToInvestigate = 'threats';
    else if (rampConfidence < 0.80) targetModuleToInvestigate = 'ramp';

    return {
      moduleConfidence,
      overallConfidence,
      requiresReinvestigation,
      targetModuleToInvestigate
    };
  }
}
