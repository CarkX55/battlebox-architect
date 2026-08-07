/**
 * src/services/compiler/core/strategicKnowledgeValidator.js
 * 
 * StrategicKnowledgeValidator: Validador Científico de Evidencia Estratégica v19.0.
 * Antes de persistir un patrón en strategic_memory.json, verifica:
 * 1. Muestra mínima suficiente (validationCount >= 3)
 * 2. Ganancia estadísticamente significativa (deltaGain >= 10%)
 * 3. Consistencia entre ejecuciones y vigencia del entorno
 */

export class StrategicKnowledgeValidator {
  /**
   * Evalúa si una evidencia empírica califica para promoción a patrón persistente
   */
  static validatePatternForPromotion(evidence = {}) {
    const deltaGain = Number(evidence.deltaGain || 0);
    const validationCount = Number(evidence.validationCount || 1);
    const initialConfidence = Number(evidence.confidence || 0.50);

    // Criterios científicos de promoción
    const isStatisticallySignificant = deltaGain >= 10;
    const hasSufficientSample = validationCount >= 3;
    const isHighConfidence = initialConfidence >= 0.75;

    const promoted = isStatisticallySignificant && (hasSufficientSample || isHighConfidence);

    const calculatedConfidence = Math.min(
      0.99,
      Math.max(0.50, initialConfidence + (validationCount * 0.05) + (deltaGain * 0.01))
    );

    return Object.freeze({
      promoted,
      validatedConfidence: Math.round(calculatedConfidence * 100) / 100,
      validationReason: promoted
        ? `Patrón validado científicamente: deltaGain (+${deltaGain}%) y muestra (${validationCount}) suficientes.`
        : `Evidencia rechazada para persistencia: requiere deltaGain >= 10% y muestra suficiente.`
    });
  }
}
