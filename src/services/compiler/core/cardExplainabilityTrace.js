/**
 * src/services/compiler/core/cardExplainabilityTrace.js
 * 
 * CardExplainabilityTrace: Traza de Explicabilidad Vectorial Bi-Direccional v15.
 * Registra el desglose cuantitativo completo por dimensión:
 * [ΔCoverage, ΔSynergy, ΔConsistency, ΔTempo, ΔMana, ΔCurve, ΔMeta, ΔUtility, Decision, Reason]
 */

export class CardExplainabilityTrace {
  /**
   * Genera el registro vectorial auditable para una decisión de selección o rechazo
   */
  static formatVectorDecision(cardName, decisionStatus, vectorDeltas = {}, reason = '') {
    const record = Object.freeze({
      cardName,
      decision: decisionStatus, // 'ACCEPTED' | 'REJECTED'
      deltas: Object.freeze({
        deltaCoverage: Number(vectorDeltas.coverage || 0),
        deltaSynergy: Number(vectorDeltas.synergy || 0),
        deltaConsistency: Number(vectorDeltas.consistency || 0),
        deltaTempo: Number(vectorDeltas.tempo || 0),
        deltaMana: Number(vectorDeltas.mana || 0),
        deltaCurve: Number(vectorDeltas.curve || 0),
        deltaMeta: Number(vectorDeltas.meta || 0),
        deltaUtility: Number(vectorDeltas.utility || 0)
      }),
      reason
    });

    const sign = record.deltas.deltaUtility >= 0 ? '+' : '';
    const statusIcon = decisionStatus === 'ACCEPTED' ? '✅' : '❌';
    const formattedLine = `${statusIcon} ${cardName.padEnd(22, ' ')} | ${decisionStatus.padEnd(8, ' ')} | ΔUtility: ${sign}${record.deltas.deltaUtility} | Reason: ${reason}`;

    return Object.freeze({
      record,
      formattedLine
    });
  }

  static evaluate(card) {
    const res = this.formatVectorDecision(card.name || 'Sample Card', 'ACCEPTED', { utility: 0.85 }, 'Optimal capability provider');
    return { formattedLine: res.formattedLine };
  }
}
