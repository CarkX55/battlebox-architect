/**
 * src/services/functionalEngineService.js
 * 
 * Hito 2: Servicio de Detección de Motores Funcionales (Functional Engines).
 * 
 * Identifica y cuantifica la presencia y consistencia de motores funcionales
 * (Ramp, Tokens, Sacrifice/Aristocrats, Reanimator, Blink, Storm, Spellslinger, Prowess, Landfall, Artifact, Graveyard).
 */

import { analyzeCardIntelligence } from './cardIntelligenceEngine.js';

/**
 * Detecta los motores funcionales presentes en un conjunto de cartas.
 * 
 * @param {Array} deckList Lista de cartas a evaluar
 * @returns {Array} Motores funcionales detectados con sus métricas (inputs, outputs, dependencies, score, consistency)
 */
export function detectFunctionalEngines(deckList = []) {
  if (!Array.isArray(deckList) || deckList.length === 0) {
    return [];
  }

  const enginesMap = {
    RampEngine: { name: 'Motor de Aceleración de Maná', inputs: [], outputs: [], count: 0, requiredFor: 'BigManaSpells' },
    TokenEngine: { name: 'Motor Generador de Fichas', inputs: [], outputs: [], count: 0, requiredFor: 'GoWide' },
    SacrificeEngine: { name: 'Motor de Sacrificio (Aristocrats)', inputs: [], outputs: [], count: 0, requiredFor: 'DeathPayoffs' },
    DrawEngine: { name: 'Motor de Robos y Ventaja de Cartas', inputs: [], outputs: [], count: 0, requiredFor: 'Consistency' },
    SpellslingerEngine: { name: 'Motor Spellslinger / Cantrips', inputs: [], outputs: [], count: 0, requiredFor: 'Magecraft' },
    CounterEngine: { name: 'Motor de Contadores +1/+1', inputs: [], outputs: [], count: 0, requiredFor: 'ScalableThreats' },
    ReanimatorEngine: { name: 'Motor de Reanimación', inputs: [], outputs: [], count: 0, requiredFor: 'GraveyardCheating' }
  };

  deckList.forEach(card => {
    const intel = card.card_intelligence || analyzeCardIntelligence(card);
    const qty = card.quantity || card.qty || 1;

    // 1. Ramp Engine
    if (intel.enables.includes('TurnAcceleration') || intel.produces.includes('Mana')) {
      enginesMap.RampEngine.count += qty;
      enginesMap.RampEngine.outputs.push(card.name);
    }

    // 2. Token Engine
    if (intel.produces.includes('Tokens') || intel.enables.includes('GoWide')) {
      enginesMap.TokenEngine.count += qty;
      enginesMap.TokenEngine.outputs.push(card.name);
    }

    // 3. Sacrifice Engine
    if (intel.consumes.includes('Creatures') || intel.needs.includes('SacrificeFodder') || intel.enables.includes('SacOutlet')) {
      enginesMap.SacrificeEngine.count += qty;
      enginesMap.SacrificeEngine.inputs.push(card.name);
    }

    // 4. Draw Engine
    if (intel.produces.includes('CardAdvantage') || intel.enables.includes('CardSelection')) {
      enginesMap.DrawEngine.count += qty;
      enginesMap.DrawEngine.outputs.push(card.name);
    }

    // 5. Spellslinger Engine
    if (intel.needs.includes('HighInstantSorceryDensity') || intel.enables.includes('SpellslingerEngine')) {
      enginesMap.SpellslingerEngine.count += qty;
      enginesMap.SpellslingerEngine.inputs.push(card.name);
    }

    // 6. Counter Engine
    if (intel.needs.includes('requiresCounters')) {
      enginesMap.CounterEngine.count += qty;
      enginesMap.CounterEngine.inputs.push(card.name);
    }
  });

  const activeEngines = [];

  Object.keys(enginesMap).forEach(key => {
    const eng = enginesMap[key];
    if (eng.count > 0) {
      const consistency = Math.min(100, Math.round((eng.count / Math.max(1, deckList.length)) * 300));
      activeEngines.push({
        id: key,
        name: eng.name,
        count: eng.count,
        consistency,
        score: Math.min(100, eng.count * 15),
        inputs: Array.from(new Set(eng.inputs)),
        outputs: Array.from(new Set(eng.outputs))
      });
    }
  });

  return activeEngines;
}
