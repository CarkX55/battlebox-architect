/**
 * SimulationProvider.js
 * Plugin Provider for Empirical Simulation Learnings.
 */

import { KnowledgeProvider } from './KnowledgeProvider.js';
import { KnowledgeObject } from '../storage/KnowledgeObject.js';

export class SimulationProvider extends KnowledgeProvider {
  constructor() {
    super('SimulationProvider');
  }

  async sync() {
    this.lastSyncTimestamp = Date.now();

    return [
      new KnowledgeObject({
        id: 'kn_simulation_ramp_vs_aggro',
        type: 'EmpiricalKnowledge',
        confidence: 0.93,
        sources: ['PolicyDrivenSimulator'],
        data: { scenario: 'Aggro', expectedWinRate: 58.5, recommendedBlockers: 6 }
      })
    ];
  }
}
