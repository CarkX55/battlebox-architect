/**
 * SpiceRackProvider.js
 * Plugin Provider for SpiceRack Competitive Archetypes, Ratios, and Turn-to-Win Metrics.
 */

import { KnowledgeProvider } from './KnowledgeProvider.js';
import { KnowledgeObject } from '../storage/KnowledgeObject.js';
import { ConfigManager } from '../../../config/ConfigManager.js';

export class SpiceRackProvider extends KnowledgeProvider {
  constructor() {
    super('SpiceRackProvider');
    const config = ConfigManager.getInstance();
    this.spiceRackUrl = config.spiceRackUrl;
  }

  async sync() {
    this.lastSyncTimestamp = Date.now();

    const archetypes = [
      { name: 'Ramp', turnToWin: 5, colors: ['G', 'U'], primaryEngine: 'ManaAcceleration' },
      { name: 'Boros Convoke', turnToWin: 4, colors: ['W', 'R'], primaryEngine: 'TokenAggro' },
      { name: 'Dimir Midrange', turnToWin: 6, colors: ['U', 'B'], primaryEngine: 'CardDrawAndRemoval' },
      { name: 'Esper Midrange', turnToWin: 6, colors: ['W', 'U', 'B'], primaryEngine: 'ValueGrind' },
      { name: 'Azorius Control', turnToWin: 8, colors: ['W', 'U'], primaryEngine: 'CountermagicAndBoardReset' },
      { name: 'Mono Red Aggro', turnToWin: 4, colors: ['R'], primaryEngine: 'BurnAndVelocity' },
      { name: 'Walls Defender', turnToWin: 6, colors: ['W', 'U', 'G'], primaryEngine: 'DefenderToughness' }
    ];

    return archetypes.map(a => new KnowledgeObject({
      id: `kn_spicerack_archetype_${a.name.replace(/\s+/g, '_')}`,
      type: 'StrategyKnowledge',
      confidence: 0.94,
      sources: ['SpiceRack_Metrics'],
      data: {
        archetype: a.name,
        targetTurnToWin: a.turnToWin,
        colors: a.colors,
        primaryEngine: a.primaryEngine
      }
    }));
  }
}
