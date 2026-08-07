/**
 * src/services/compiler/plugins/magic/criticRegistry.js
 * 
 * CriticRegistry: Registro Plugeable de Críticos Adversariales de MTG.
 * Cada vector de ataque o metajuego es un plugin independiente que evalúa
 * el estado del mazo bajo un ScenarioContext dado.
 */

import { CritiqueResult } from '../../core/domainContracts.js';

export class CriticRegistry {
  constructor() {
    this.critics = new Map(); // criticId -> CriticPlugin
    this.registerStandardCritics();
  }

  registerCritic(criticId, criticPlugin) {
    if (!criticId || !criticPlugin || typeof criticPlugin.evaluate !== 'function') {
      throw new Error(`[CriticRegistry Error] Crítico inválido para ${criticId}`);
    }
    this.critics.set(criticId, Object.freeze(criticPlugin));
  }

  registerStandardCritics() {
    // 1. Crítico de Sweepers / Wrath of God
    this.registerCritic('WrathCritic', {
      evaluate: (deckSlots, scenarioContext, simulationReport) => {
        const recoveryRate = simulationReport?.recoveryRate ?? 0.60;
        const passed = recoveryRate >= 0.70;
        return new CritiqueResult({
          criticId: 'WrathCritic',
          passed,
          severity: 'HIGH',
          metricName: 'RecoveryScore',
          currentValue: recoveryRate,
          targetValue: 0.70,
          issue: passed ? null : `Vulnerabilidad alta ante limpias de mesa (Wrath effects). RecoveryScore (${recoveryRate}) < Target (0.70).`,
          requiredNeed: passed ? null : 'RECOVERY_ENGINE'
        });
      }
    });

    // 2. Crítico de Blood Moon
    this.registerCritic('BloodMoonCritic', {
      evaluate: (deckSlots, scenarioContext) => {
        const basicLands = deckSlots.filter(s => s && (s.isBasicLand || s.type_line?.toLowerCase().includes('basic land')));
        const basicCount = basicLands.reduce((sum, s) => sum + Number(s.quantity || s.count || 1), 0);
        const passed = basicCount >= 3;
        return new CritiqueResult({
          criticId: 'BloodMoonCritic',
          passed,
          severity: 'CRITICAL',
          metricName: 'BasicLandCount',
          currentValue: basicCount,
          targetValue: 3,
          issue: passed ? null : `Colapso total por Blood Moon (tienes ${basicCount} tierras básicas, requeridas >= 3).`,
          requiredNeed: passed ? null : 'BASIC_LANDS'
        });
      }
    });
  }

  evaluateAll(deckSlots, scenarioContext, simulationReport) {
    const critiqueResults = [];
    for (const critic of this.critics.values()) {
      const res = critic.evaluate(deckSlots, scenarioContext, simulationReport);
      if (res) critiqueResults.push(res);
    }
    return critiqueResults;
  }
}
