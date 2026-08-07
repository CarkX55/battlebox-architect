/**
 * src/services/compiler/core/goldStandardDataset.js
 * 
 * GoldStandardDataset: Dataset de Referencia de Torneos & Benchmark de Capacidades v16.1.
 * Contiene mazos ganadores de torneo de referencia y evalúa la Similitud de Capacidades y Motores
 * en lugar de la similitud estricta nombre a nombre de carta (evitando penalizar la innovación).
 */

export class GoldStandardDataset {
  static referenceTournamentDecks = Object.freeze([
    {
      benchmarkId: 'GOLD_MODERN_ELVES',
      archetype: 'Golgari Elves',
      targetCapabilities: ['cap.mana.acceleration.t1.v1', 'cap.threat.value.v1', 'cap.engine.coco.v1', 'cap.finisher.lethal.v1'],
      expectedEngines: ['engine.collected_company.v1', 'engine.chord_of_calling.v1']
    },
    {
      benchmarkId: 'GOLD_MODERN_BURN',
      archetype: 'Burn',
      targetCapabilities: ['cap.threat.value.v1', 'cap.removal.early.v1', 'cap.finisher.lethal.v1'],
      expectedEngines: ['engine.burn_spells.v1']
    },
    {
      benchmarkId: 'GOLD_MODERN_TRON',
      archetype: 'Mono Green Tron',
      targetCapabilities: ['cap.mana.acceleration.t1.v1', 'cap.threat.value.v1', 'cap.finisher.lethal.v1'],
      expectedEngines: ['engine.tron_big_mana.v1']
    },
    {
      benchmarkId: 'GOLD_MODERN_YAWGMOTH',
      archetype: 'Golgari Yawgmoth',
      targetCapabilities: ['cap.mana.acceleration.t1.v1', 'cap.threat.value.v1', 'cap.engine.coco.v1', 'cap.finisher.lethal.v1'],
      expectedEngines: ['engine.yawgmoth_loop.v1']
    }
  ]);

  /**
   * Evalúa la Similitud de Capacidades y Motores (Capability & Engine Similarity)
   */
  static evaluateCapabilitySimilarity(compiledDeck = [], referenceDeck = {}) {
    const compiledCaps = new Set();
    compiledDeck.forEach(s => {
      if (s.capability) compiledCaps.add(s.capability);
      if (Array.isArray(s.capabilities)) s.capabilities.forEach(c => compiledCaps.add(c));
    });

    const targetCaps = referenceDeck.targetCapabilities || [];
    let matchedCaps = 0;

    targetCaps.forEach(cap => {
      if (compiledCaps.has(cap)) matchedCaps++;
    });

    const capabilitySimilarityRate = targetCaps.length > 0 
      ? Math.round((matchedCaps / targetCaps.length) * 100) / 100 
      : 1.0;

    return Object.freeze({
      benchmarkId: referenceDeck.benchmarkId,
      archetype: referenceDeck.archetype,
      capabilitySimilarityRate,
      matchedCapabilitiesCount: matchedCaps,
      totalTargetCapabilitiesCount: targetCaps.length,
      isCompetitiveMatch: capabilitySimilarityRate >= 0.85
    });
  }
}
