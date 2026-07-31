/**
 * StrategicKnowledgeBase.js
 * Domain Intelligence & Strategic Knowledge Layer for MTG Expert Deck Construction.
 * Encapsulates expert player domain knowledge beyond Oracle text:
 * 1. Engine Knowledge (Collected Company 28+ CMC<=3, Living End, Birthing Pod, Devotion).
 * 2. Tempo & Efficiency Knowledge (T1 Dork > T2 Dork, Counterspell > Cancel).
 * 3. Matchup & Meta Knowledge (Thoughtseize vs Burn, Sheoldred vs Control).
 * 4. Strategic Play Patterns (T1 Dork -> T2 Lord -> T3 CoCo -> T4 Lethal).
 */

export const STRATEGIC_ENGINES = Object.freeze({
  COLLECTED_COMPANY: {
    id: 'engine_coco',
    name: 'Collected Company Engine',
    coreCard: 'Collected Company',
    hardConstraints: {
      minCreaturesCount: 28,
      maxCmcThreshold: 3,
      preferFlashOrEtb: true
    },
    synergyRoles: ['Dork', 'Lord', 'ETB_Creature', 'Flash_Threat']
  },
  LIVING_END: {
    id: 'engine_living_end',
    name: 'Living End Reanimator Engine',
    coreCard: 'Living End',
    hardConstraints: {
      minCyclersCount: 18,
      noSpellsWithCmcLessThan: 3, // For Cascade
      requireCascadeSpells: true
    },
    synergyRoles: ['Cycler', 'Cascade_Enabler']
  },
  MONO_GREEN_DEVOTION: {
    id: 'engine_devotion',
    name: 'Mono Green Devotion Engine',
    coreCard: 'Nykthos, Shrine to Nyx',
    hardConstraints: {
      minGreenManaSymbolsCount: 20,
      requiresDorks: true
    },
    synergyRoles: ['Mana_Dork', 'Heavy_Devotion_Threat']
  },
  BOROS_CONVOKE: {
    id: 'engine_convoke',
    name: 'Boros Convoke Engine',
    coreCard: 'Knight-Errant of Eos',
    hardConstraints: {
      min1DropCreaturesOrTokens: 14,
      requireConvokePayoffs: true
    },
    synergyRoles: ['Cheap_Token_Enabler', 'Convoke_Finisher']
  }
});

export const TEMPO_EFFICIENCY_RULES = Object.freeze({
  DORKS: {
    T1_DORKS: ['Llanowar Elves', 'Elvish Mystic', 'Delighted Halfling', 'Birds of Paradise'],
    T2_DORKS: ['Leaf Gilder', 'Ilysian Caryatid'],
    tempoRule: 'T1 Dorks enable 3-mana spells on Turn 2 (T2 3-CMC). T2 Dorks only enable 3-mana spells on Turn 3 (T3 3-CMC), losing critical tempo.'
  },
  COUNTERS: {
    EFFICIENT_COUNTERS: ['Counterspell', 'Mana Leak', 'Dovin\'s Veto', 'Stern Scolding'],
    INEFFICIENT_COUNTERS: ['Cancel', 'Dissolve'],
    efficiencyRule: '2-CMC counterspells allow holding up interaction while developing threats.'
  }
});

export const MATCHUP_KNOWLEDGE = Object.freeze({
  THOUGHTSEIZE: {
    vsAggroBurn: 'POOR (2 life cost accelerates opposing lethal clock)',
    vsControl: 'EXCELLENT (Strips key sweepers or countermagic)',
    vsCombo: 'CRITICAL (Strips combo piece from hand)'
  },
  SHEOLDRED: {
    vsControl: 'EXCELLENT (Forces immediate answer or drains life on draw)',
    vsCombo: 'MEDIUM (Slow clock unless combo relies on draws)',
    vsLeylineBindingDecks: 'WEAK (Trivial 1-mana removal target)'
  }
});

export class StrategicKnowledgeBase {
  static getEngineRequirements(engineId) {
    return STRATEGIC_ENGINES[engineId] || null;
  }

  static evaluateTempoScore(cardName, role = '') {
    const name = cardName ? cardName.trim() : '';
    if (TEMPO_EFFICIENCY_RULES.DORKS.T1_DORKS.includes(name)) return 0.98;
    if (TEMPO_EFFICIENCY_RULES.DORKS.T2_DORKS.includes(name)) return 0.65;
    if (TEMPO_EFFICIENCY_RULES.COUNTERS.EFFICIENT_COUNTERS.includes(name)) return 0.95;
    if (TEMPO_EFFICIENCY_RULES.COUNTERS.INEFFICIENT_COUNTERS.includes(name)) return 0.50;
    return 0.75;
  }

  static evaluateCoCoCompliance(deckCards = []) {
    const validCreatures = deckCards.filter(c => {
      const isCreature = (c.type_line || c.type || '').includes('Creature');
      const lowCmc = (c.cmc || 0) <= 3;
      return isCreature && lowCmc;
    });

    const count = validCreatures.length;
    const passes = count >= 28;

    return Object.freeze({
      engine: 'Collected Company Engine',
      validCreaturesCount: count,
      required: 28,
      passes,
      rating: passes ? 'OPTIMAL_COCO_RATIO' : 'SUBOPTIMAL_COCO_RATIO'
    });
  }
}
