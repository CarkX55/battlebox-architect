/**
 * TradeOffAnalyzer.js
 * Evaluates Strategic Compromises (Early Survival vs Late Consistency, Velocity vs Resilience).
 */

import { ReasoningObject } from '../Core/ReasoningObject.js';

export class TradeOffAnalyzer {
  static analyzeTradeOffs(archetype, metagameContext = {}) {
    const isFastMetagame = metagameContext.fastAggroDensity > 0.40;

    if (isFastMetagame) {
      return new ReasoningObject({
        inferenceId: `inf_tradeoff_fastmeta_${Date.now()}`,
        context: { archetype, metagame: 'FastAggro' },
        premises: ['Fast metagame detected (>40% Aggro density)'],
        tradeOffs: [{ sacrifice: 'LateGameCardFlow', gain: 'EarlyInteractionDensity', weight: 0.85 }],
        conclusion: 'Sacrifice late-game card flow to increase early interaction and survival.',
        confidence: 0.92
      });
    }

    return new ReasoningObject({
      inferenceId: `inf_tradeoff_stdmeta_${Date.now()}`,
      context: { archetype, metagame: 'Standard' },
      premises: ['Balanced metagame detected'],
      tradeOffs: [{ sacrifice: 'ExtremeSpeed', gain: 'ConsistencyAndRedundancy', weight: 0.75 }],
      conclusion: 'Maintain balanced engine speed with emphasis on consistency and redundancy.',
      confidence: 0.88
    });
  }
}
