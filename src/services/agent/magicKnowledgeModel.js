/**
 * EXPLICIT MAGIC KNOWLEDGE MODEL (v19.0 Pro)
 * 
 * Formal expert knowledge base for Magic The Gathering archetypes,
 * resource capability relations, target densities, and consistency heuristics.
 */

export const ARCHETYPE_KNOWLEDGE = Object.freeze({
  Aggro: {
    maxAverageCmc: 2.4,
    minCreatures: 20,
    maxCreatures: 28,
    minCheapInteraction: 6,
    targetLands: 22,
    keyResourceRelations: [
      { source: 'Turn1Pressure', enables: 'EarlyAggroClock' },
      { source: 'CheapRemoval', enables: 'TempoBeats' }
    ]
  },
  Ramp: {
    maxAverageCmc: 3.6,
    minAccelerators: 8,
    maxAccelerators: 10,
    minThreatsHighCMC: 12,
    targetLands: 25,
    keyResourceRelations: [
      { source: 'EarlyManaRamp', enables: 'HighCMCThreats' },
      { source: 'BigManaSources', enables: 'GameClosingFinishers' }
    ]
  },
  Control: {
    maxAverageCmc: 3.2,
    minEarlyAnswers: 6,
    minSweepers: 3,
    minCardFlowEngines: 6,
    targetLands: 26,
    keyResourceRelations: [
      { source: 'EarlyInteraction', enables: 'Inevitability' },
      { source: 'BoardSweepers', enables: 'ResetAndRecovery' },
      { source: 'CardAdvantageEngines', enables: 'OutvalueOpponent' }
    ]
  },
  Combo: {
    maxAverageCmc: 3.0,
    minTutorsAndDraw: 8,
    minPieceRedundancy: 8,
    minProtectionSpells: 4,
    targetLands: 23,
    keyResourceRelations: [
      { source: 'TutorDensity', enables: 'PieceAssembly' },
      { source: 'ProtectionSpells', enables: 'ComboExecution' }
    ]
  }
});

export class MagicKnowledgeModel {
  static getArchetypeKnowledge(archetype) {
    const knowledge = ARCHETYPE_KNOWLEDGE[archetype] || ARCHETYPE_KNOWLEDGE.Aggro;
    return Object.freeze({ ...knowledge });
  }

  static evaluateResourceRelation(sourceCapability, targetCapability, archetype) {
    const knowledge = this.getArchetypeKnowledge(archetype);
    const relation = knowledge.keyResourceRelations.find(r => r.source === sourceCapability && r.enables === targetCapability);
    return !!relation;
  }
}
