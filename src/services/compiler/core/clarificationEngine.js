/**
 * src/services/compiler/core/clarificationEngine.js
 * 
 * ClarificationEngine: Motor de Aclaración Guiado por Reducción de Incertidumbre v17.2.
 * Si IntentConfidence < 65%, genera UNA SOLA PREGUNTA NEUTRA de máximo impacto
 * que maximiza la ganancia de información sin agobiar al usuario.
 */

export class ClarificationEngine {
  /**
   * Determina la única pregunta de máximo impacto para reducir la incertidumbre del mazo
   */
  static generateUncertaintyReductionQuestion(intentSpectrum = {}, confidenceReport = {}) {
    if (!confidenceReport.needsClarification) {
      return Object.freeze({ needsQuestion: false, question: null });
    }

    // Si falta la prioridad entre identidad temática y poder competitivo
    if (!intentSpectrum.identityLock || intentSpectrum.identityLock === 'SOFT') {
      return Object.freeze({
        needsQuestion: true,
        questionId: 'Q_IDENTITY_VS_POWER',
        promptText: '¿Qué es más importante para ti en esta partida con amigos?',
        options: Object.freeze([
          { id: 'STRICT', label: 'Que todas las cartas sean estrictamente de la temática solicitada' },
          { id: 'OPEN', label: 'Que el mazo sea lo más fuerte posible aunque incluya cartas de apoyo externas' }
        ])
      });
    }

    // Si falta la memoria de victoria
    return Object.freeze({
      needsQuestion: true,
      questionId: 'Q_WIN_MEMORY',
      promptText: '¿Cómo te gustaría que tus amigos recuerden esta partida?',
      options: Object.freeze([
        { id: 'FAST_VICTORY', label: 'Porque ganaste muy rápido' },
        { id: 'HUGE_CREATURES', label: 'Porque sacaste criaturas gigantes' },
        { id: 'CRAZY_COMBO', label: 'Porque hiciste un combo o vuelco espectacular' },
        { id: 'ALWAYS_ANSWER', label: 'Porque siempre tenías respuesta a todo' }
      ])
    });
  }
}
