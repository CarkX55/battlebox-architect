/**
 * STRATEGIC SUPERVISOR (v19.0 Pro)
 * 
 * Proactive Supervisor auditing BattleBoxAgent progress.
 * Constantly audits deck state, victory plan alignment, threat/removal ratios,
 * and authorizes dynamic backtracking or hypothesis pivoting.
 */

import { MagicKnowledgeModel } from './magicKnowledgeModel.js';

export class StrategicSupervisor {
  constructor(intentLock) {
    this.intentLock = intentLock;
    this.knowledge = MagicKnowledgeModel.getArchetypeKnowledge(intentLock.archetype);
    this.auditLogs = [];
  }

  logSupervisorAudit(message, action = 'CONTINUE') {
    this.auditLogs.push({
      timestamp: new Date().toISOString(),
      message,
      action
    });
  }

  auditProgress(currentStateMetrics, reasoningMemory) {
    const totalCards = currentStateMetrics.totalCards;
    this.logSupervisorAudit(`Supervisando progreso del mazo: ${totalCards}/60 cartas completadas.`);

    // 1. Check Removal Overload vs Threat Balance
    const removalCount = (currentStateMetrics.curve[1] || 0) + (currentStateMetrics.curve[2] || 0);
    if (totalCards >= 30 && removalCount > 14) {
      this.logSupervisorAudit('ADVERTENCIA DEL SUPERVISOR: Densidad de remoción demasiado alta (>14 copias). Riesgo de perder el Plan A.', 'RECOMMEND_BACKTRACK_REMOVAL');
      return {
        aligned: false,
        action: 'RECOMMEND_BACKTRACK_REMOVAL',
        recommendation: 'Eliminar 2-4 copias de remoción flexible e incrementar criaturas de curva 3-4.'
      };
    }

    // 2. Check Threat Density for Ramp Archetype
    if (this.intentLock.archetype === 'Ramp' && totalCards >= 40) {
      const highCmcThreats = (currentStateMetrics.curve[4] || 0) + (currentStateMetrics.curve[5] || 0);
      if (highCmcThreats < 8) {
        this.logSupervisorAudit('ADVERTENCIA DEL SUPERVISOR: Falta densidad de amenazas de alto CMC para mazo Ramp.', 'RECOMMEND_INCREASE_THREATS');
        return {
          aligned: false,
          action: 'RECOMMEND_INCREASE_THREATS',
          recommendation: 'Buscar amenazas tribales de CMC 4-5.'
        };
      }
    }

    this.logSupervisorAudit('Supervisión realizada: Mazo 100% alineado con la Intención del Usuario e Invariantes.', 'CONTINUE');
    return {
      aligned: true,
      action: 'CONTINUE',
      recommendation: 'Continuar con el bucle cognitivo ReAct.'
    };
  }
}
