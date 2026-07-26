/**
 * src/services/semanticCardParser.js
 * 
 * Parser Semántico Algorítmico y Motor de Extracción de Capacidades de MTG.
 * 
 * Convierte el Oracle Text, la línea de tipos y el coste de maná de CUALQUIER carta de MTG
 * en un Vector Semántico ESTRUCTURADO (Capabilities, Requirements, Enables, Conflicts).
 */

import { getCardKnowledge } from './knowledgeGraphService.js';

/**
 * Parsea una carta y retorna su `SemanticCardRepresentation`.
 * 
 * @param {Object} card Objeto carta (name, oracle_text, type_line, mana_cost, cmc, keywords)
 * @returns {Object} Representación semántica enriquecida
 */
export function parseSemanticCard(card) {
  if (!card || !card.name) {
    return createEmptySemanticRepresentation();
  }

  const nameLower = card.name.toLowerCase();
  const oracle = (card.oracle_text || card.text || '').toLowerCase();
  const typeLine = (card.type_line || card.type || '').toLowerCase();
  const keywords = (card.keywords || []).map(k => k.toLowerCase());
  const cmc = typeof card.cmc === 'number' ? card.cmc : parseInt(card.cmc || 0, 10);

  // 1. Carga inicial con fallback a Overrides de Knowledge Graph
  const know = getCardKnowledge(card);

  // 2. Definición del Vector de Capacidades (0 - 100)
  const capabilities = {
    ManaAcceleration: 0,
    TempoBoost: 0,
    BoardPressure: 0,
    FinisherLethality: 0,
    CardDrawEfficiency: 0,
    RemovalImpact: 0,
    EarlyGameScore: 50,
    LateGameScore: 50
  };

  // 3. Definición de Requisitos y Condicionales
  const requirements = {
    minBoardWidth: 0,           // Mínimo de criaturas necesarias en mesa (ej. Overrun)
    minInstantSorceryCount: 0,  // Requisito de cantrips/hechizos (ej. Spellslinger)
    minArtifactCount: 0,        // Requisito de artefactos (ej. Affinity/Metalcraft)
    minGraveyardCount: 0,       // Requisito de cementerio (ej. Delve/Threshold)
    requiresSacrificeFodder: false,
    requiresCounters: false
  };

  // 4. Mecánicas y Relaciones
  const enables = [];
  const multiplies = [];
  const conflicts = [];

  // --- ANÁLISIS ALGORTÍMICO DEL TEXTO ORACLE ---

  // A. Aceleración de Maná (Ramp / Mana Dorks / Rocks)
  if (oracle.includes('add {') || oracle.includes('add one mana') || oracle.includes('search your library for a land card')) {
    capabilities.ManaAcceleration = cmc <= 1 ? 100 : (cmc === 2 ? 85 : 60);
    capabilities.EarlyGameScore = Math.max(capabilities.EarlyGameScore, 90);
    capabilities.LateGameScore = Math.min(capabilities.LateGameScore, 30);
    enables.push('TurnAcceleration');
  }

  // B. Generación de Presión / Go-Wide / Tokens
  if (oracle.includes('create') && oracle.includes('token')) {
    capabilities.BoardPressure += 70;
    enables.push('BoardWidth', 'SacrificeFodder');
    multiplies.push('Aristocrats', 'GoWide');
  }
  if (typeLine.includes('creature') && cmc <= 2 && (oracle.includes('haste') || keywords.includes('haste') || oracle.includes('can\'t be blocked'))) {
    capabilities.BoardPressure += 80;
    capabilities.TempoBoost += 75;
    capabilities.EarlyGameScore += 25;
  }

  // C. Finishers y Lethality (Overrun, Team Buffs, Direct Damage High)
  if (
    oracle.includes('creatures you control get +') ||
    oracle.includes('creatures you control gain') ||
    oracle.includes('get +x/+x') ||
    oracle.includes('number of creatures you control') ||
    oracle.includes('additional combat phase')
  ) {
    capabilities.FinisherLethality = 95;
    capabilities.LateGameScore = 100;
    requirements.minBoardWidth = 4;
    enables.push('AlphaStrike');
  }

  // D. Robo y Cantrips (Card Advantage)
  if (oracle.includes('draw a card') || oracle.includes('draws two cards') || oracle.includes('draw cards')) {
    if (oracle.includes('whenever you cast') || oracle.includes('whenever a creature enters')) {
      capabilities.CardDrawEfficiency = 85;
      if (oracle.includes('instant') || oracle.includes('sorcery')) {
        requirements.minInstantSorceryCount = 10;
      }
      if (oracle.includes('creature')) {
        requirements.minBoardWidth = 3;
      }
    } else {
      capabilities.CardDrawEfficiency = cmc <= 2 ? 90 : 70;
    }
  }

  // E. Remoción e Interacción
  if (oracle.includes('destroy target') || oracle.includes('exile target') || (oracle.includes('deals') && oracle.includes('damage to target'))) {
    capabilities.RemovalImpact = cmc <= 2 ? 95 : 75;
    capabilities.TempoBoost += 40;
  }

  // F. Motores Específicos (Aristocrats, Spellslinger, Reanimate, Counters)
  if (oracle.includes('sacrifice a creature') || oracle.includes('sacrifice another creature')) {
    requirements.requiresSacrificeFodder = true;
    enables.push('SacOutlet');
  }
  if (oracle.includes('whenever another creature dies') || oracle.includes('whenever a creature you control dies')) {
    enables.push('DeathPayoff');
    requirements.requiresSacrificeFodder = true;
  }
  if (oracle.includes('+1/+1 counter') || oracle.includes('proliferate')) {
    requirements.requiresCounters = true;
    multiplies.push('CounterEngine');
  }

  // G. Conflictos (Wipes vs GoWide, Graveyard Hate vs Reanimator)
  if (oracle.includes('destroy all creatures') || oracle.includes('exile all creatures')) {
    conflicts.push('GoWideStrategy');
    capabilities.RemovalImpact = 100;
  }
  if (oracle.includes('rest in peace') || oracle.includes('cards in graveyards can\'t')) {
    conflicts.push('ReanimatorStrategy', 'FlashbackStrategy');
  }

  // Integración de Know-Overridden Tags
  if (know.engines) {
    know.engines.forEach(eng => enables.push(eng));
  }

  return {
    cardName: card.name,
    cmc,
    typeLine,
    capabilities,
    requirements,
    enables: Array.from(new Set(enables)),
    multiplies: Array.from(new Set(multiplies)),
    conflicts: Array.from(new Set(conflicts)),
    roles: know.roles || [],
    tags: know.tags || []
  };
}

function createEmptySemanticRepresentation() {
  return {
    cardName: 'Unknown',
    cmc: 0,
    typeLine: '',
    capabilities: {
      ManaAcceleration: 0,
      TempoBoost: 0,
      BoardPressure: 0,
      FinisherLethality: 0,
      CardDrawEfficiency: 0,
      RemovalImpact: 0,
      EarlyGameScore: 50,
      LateGameScore: 50
    },
    requirements: {
      minBoardWidth: 0,
      minInstantSorceryCount: 0,
      minArtifactCount: 0,
      minGraveyardCount: 0,
      requiresSacrificeFodder: false,
      requiresCounters: false
    },
    enables: [],
    multiplies: [],
    conflicts: [],
    roles: [],
    tags: []
  };
}
