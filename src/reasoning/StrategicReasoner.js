/**
 * StrategicReasoner.js - Core SRE Engine
 * Consumes Strategic Knowledge Engine (v8.0 SKE) and infers synthesized StrategyModel for Compiler Core (v7.3).
 */

import { IntentGraph } from './Graph/IntentGraph.js';
import { TradeOffAnalyzer } from './Analysis/TradeOffAnalyzer.js';
import { RiskAndPivotInferrer } from './Analysis/RiskAndPivotInferrer.js';
import { StrategyModel } from '../judge/ir/StrategyModel.js';
import { StrategicKnowledgeService } from '../knowledge/Serving/StrategicKnowledgeService.js';

export class StrategicReasoner {
  constructor() {
    this.skeService = new StrategicKnowledgeService();
  }

  synthesizeStrategyModel(goal = {}) {
    const archetype = goal.strategicArchetype || 'Ramp';
    const intentGraph = new IntentGraph({ archetype });
    const expandedCaps = intentGraph.expandDependencies();
    const tradeOffAnalysis = TradeOffAnalyzer.analyzeTradeOffs(archetype, goal.metagame);
    const risks = RiskAndPivotInferrer.inferRisks(archetype);

    const tempoConcept = this.skeService.getStrategicConcept('Tempo');

    return new StrategyModel({
      archetype,
      strategicLines: [
        { id: 'Plan_A', name: `Primary ${archetype} Engine`, probability: 0.70 },
        { id: 'Plan_B', name: risks.pivotCondition, probability: 0.20 },
        { id: 'Plan_C', name: 'Fallback Stabilizer', probability: 0.10 }
      ],
      metadata: {
        reasonerVersion: 'v9.0-SRE',
        tradeOffs: tradeOffAnalysis.tradeOffs,
        risks,
        expandedCapabilities: expandedCaps,
        conceptServed: tempoConcept ? tempoConcept.id : null
      }
    });
  }
}
