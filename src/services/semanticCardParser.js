/**
 * src/services/semanticCardParser.js
 * 
 * Parser Semántico Algorítmico y Motor de Extracción de Capacidades de MTG.
 * 
 * Convierte el Oracle Text, la línea de tipos y el coste de maná de CUALQUIER carta de MTG
 * en un Vector Semántico ESTRUCTURADO con Doble Vector Causal (Supplies vs Demands).
 */

import { getCardKnowledge } from './knowledgeGraphService.js';

// ─────────────────────────────────────────────────────────────────────────────
// TAXONOMÍA ESTRUCTURADA DE DEMANDAS CAUSALES
// ─────────────────────────────────────────────────────────────────────────────
export const RESOURCE_DEMANDS = Object.freeze({
  // 1. Disponibilidad de Recursos Físicos
  RESOURCE_AVAILABILITY: {
    ARTIFACT_FODDER:  'ARTIFACT_FODDER',
    TOKEN_FODDER:     'TOKEN_FODDER',
    CREATURE_FODDER:  'CREATURE_FODDER',
    DISCARD_FODDER:   'DISCARD_FODDER',
    GRAVEYARD_DEPTH:  'GRAVEYARD_DEPTH'
  },
  
  // 2. Requisitos de Densidad de Mazo
  DENSITY_REQUIREMENTS: {
    TRIBAL_DENSITY:          'TRIBAL_DENSITY',
    INSTANT_SORCERY_DENSITY: 'INSTANT_SORCERY_DENSITY',
    ENCHANTMENT_DENSITY:     'ENCHANTMENT_DENSITY',
    ARTIFACT_DENSITY:        'ARTIFACT_DENSITY',
    COUNTER_DENSITY:         'COUNTER_DENSITY'
  },

  // 3. Requisitos de Ejecución & Curva
  EXECUTION_REQUIREMENTS: {
    EARLY_MANA_ACCESS:  'EARLY_MANA_ACCESS',
    COLOR_PIP_COVERAGE: 'COLOR_PIP_COVERAGE'
  },

  // 4. Holgura de Recursos Secundarios
  RESOURCE_SLACK: {
    LIFE_PAYMENT_SLACK: 'LIFE_PAYMENT_SLACK'
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// NIVELES DE NECESIDAD DE DEMANDA
// ─────────────────────────────────────────────────────────────────────────────
export const DEMAND_NECESSITY = Object.freeze({
  HARD:        'HARD',        // Inejecutable/inútil sin la infraestructura (VETO si no hay ruta/plan)
  CONDITIONAL: 'CONDITIONAL', // Pierde eficiencia sin ella, pero mantiene utilidad autónoma (Degrada fit)
  AMPLIFYING:  'AMPLIFYING'   // Potencia adicional, pero 100% jugable de forma autónoma (Ajusta prioridad)
});

/**
 * Parsea una carta y retorna su `SemanticCardRepresentation` enriquecida con Supplies & Demands.
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

  // 2. Vector de Capacidades (0 - 100)
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

  // 3. Requisitos estructurales legados (compatibilidad)
  const requirements = {
    minBoardWidth: 0,
    minInstantSorceryCount: 0,
    minArtifactCount: 0,
    minGraveyardCount: 0,
    requiresSacrificeFodder: false,
    requiresCounters: false
  };

  // 4. DOBLE VECTOR CAUSAL: SUPPLIES & DEMANDS
  const supplies = [];
  const demands = [];

  const enables = [];
  const multiplies = [];
  const conflicts = [];

  // --- ANÁLISIS EXHAUSTIVO DEL TEXTO ORACLE & LÍNEA DE TIPOS ---

  // ── A. PRODUCER: Fodder & Tokens (Artefactos, Criaturas, Tesoros, Clues, Blood) ──
  const createsToken = oracle.includes('create') && oracle.includes('token');
  const isTreasure = oracle.includes('treasure token') || oracle.includes('create a treasure');
  const isClue = oracle.includes('clue token') || oracle.includes('investigate');
  const isBlood = oracle.includes('blood token') || oracle.includes('create a blood');
  const isFood = oracle.includes('food token') || oracle.includes('create a food');
  const isArtifactType = typeLine.includes('artifact');

  if (isTreasure || isClue || isBlood || isFood) {
    supplies.push({
      resource: RESOURCE_DEMANDS.RESOURCE_AVAILABILITY.ARTIFACT_FODDER,
      effect: 'PRODUCE_TOKEN',
      usableAsFodder: true,
      quantity: 1
    });
    enables.push('ArtifactFodder');
  }

  if (isArtifactType) {
    const isCheapOrFodder = cmc <= 2 || typeLine.includes('equipment') || isTreasure || isClue || isBlood || isFood;
    supplies.push({
      resource: RESOURCE_DEMANDS.DENSITY_REQUIREMENTS.ARTIFACT_DENSITY,
      effect: 'PERMANENT',
      usableAsFodder: isCheapOrFodder,
      quantity: 1
    });
  }

  if (createsToken && (oracle.includes('creature token') || oracle.includes('goblin') || oracle.includes('zombie') || oracle.includes('saproling') || oracle.includes('elf'))) {
    supplies.push({
      resource: RESOURCE_DEMANDS.RESOURCE_AVAILABILITY.TOKEN_FODDER,
      effect: 'PRODUCE_CREATURE_TOKEN',
      usableAsFodder: true,
      quantity: 1
    });
    supplies.push({
      resource: RESOURCE_DEMANDS.RESOURCE_AVAILABILITY.CREATURE_FODDER,
      effect: 'PRODUCE_CREATURE_FODDER',
      usableAsFodder: true,
      quantity: 1
    });
    enables.push('BoardWidth', 'SacrificeFodder');
    multiplies.push('Aristocrats', 'GoWide');
  }

  // ── B. CONSUMER: Demandas de Sacrificio ──
  const requiresSacrificeArtifact = oracle.includes('sacrifice an artifact') || 
                                     oracle.includes('whenever an artifact you control is put into a graveyard') ||
                                     (oracle.includes('artifact') && oracle.includes('sacrifice'));
  
  if (requiresSacrificeArtifact) {
    demands.push({
      resource: RESOURCE_DEMANDS.RESOURCE_AVAILABILITY.ARTIFACT_FODDER,
      necessity: DEMAND_NECESSITY.HARD,
      timing: cmc <= 2 ? 'EARLY_GAME' : 'MID_GAME',
      targetTurn: Math.max(1, cmc),
      quantity: 1
    });
  }

  const requiresSacrificeCreature = oracle.includes('sacrifice a creature') || oracle.includes('sacrifice another creature');
  if (requiresSacrificeCreature) {
    demands.push({
      resource: RESOURCE_DEMANDS.RESOURCE_AVAILABILITY.CREATURE_FODDER,
      necessity: DEMAND_NECESSITY.HARD,
      timing: cmc <= 2 ? 'EARLY_GAME' : 'MID_GAME',
      targetTurn: Math.max(1, cmc),
      quantity: 1
    });
    requirements.requiresSacrificeFodder = true;
    enables.push('SacOutlet');
  }

  // ── C. CONSUMER: Cementerio & Delve ──
  const hasDelve = oracle.includes('delve') || keywords.includes('delve');
  const hasThreshold = oracle.includes('threshold') || oracle.includes('seven or more cards in your graveyard');
  const isReanimate = oracle.includes('return target creature card from your graveyard') || oracle.includes('put target creature card from a graveyard');

  if (hasDelve || hasThreshold || isReanimate) {
    demands.push({
      resource: RESOURCE_DEMANDS.RESOURCE_AVAILABILITY.GRAVEYARD_DEPTH,
      necessity: DEMAND_NECESSITY.HARD,
      timing: 'MID_GAME',
      targetTurn: Math.max(2, cmc),
      quantity: hasDelve ? 4 : 5
    });
    requirements.minGraveyardCount = 4;
  }

  // Self-mill / Discard suministra cementerio
  if (oracle.includes('mill') || (oracle.includes('draw') && oracle.includes('discard'))) {
    supplies.push({
      resource: RESOURCE_DEMANDS.RESOURCE_AVAILABILITY.GRAVEYARD_DEPTH,
      effect: 'FILL_GRAVEYARD',
      usableAsFodder: true,
      quantity: 2
    });
    enables.push('Looting', 'GraveyardEnabler');
  }

  // ── D. CONSUMER: Spellslinger & Cantrips ──
  const isSpellslingerPayoff = (oracle.includes('whenever you cast an instant or sorcery') || oracle.includes('magecraft') || keywords.includes('prowess'));
  if (isSpellslingerPayoff) {
    demands.push({
      resource: RESOURCE_DEMANDS.DENSITY_REQUIREMENTS.INSTANT_SORCERY_DENSITY,
      necessity: DEMAND_NECESSITY.CONDITIONAL,
      timing: 'WHOLE_GAME',
      targetTurn: 2,
      quantity: 12
    });
    requirements.minInstantSorceryCount = 12;
  }

  if (typeLine.includes('instant') || typeLine.includes('sorcery')) {
    supplies.push({
      resource: RESOURCE_DEMANDS.DENSITY_REQUIREMENTS.INSTANT_SORCERY_DENSITY,
      effect: 'SPELL_COUNT',
      usableAsFodder: true,
      quantity: 1
    });
  }

  // ── E. CONSUMER: Contadores +1/+1 ──
  if (oracle.includes('+1/+1 counter') || oracle.includes('proliferate')) {
    if (oracle.includes('whenever a +1/+1 counter is put') || oracle.includes('remove a +1/+1 counter')) {
      demands.push({
        resource: RESOURCE_DEMANDS.DENSITY_REQUIREMENTS.COUNTER_DENSITY,
        necessity: DEMAND_NECESSITY.CONDITIONAL,
        timing: 'MID_GAME',
        targetTurn: 2,
        quantity: 6
      });
    } else {
      supplies.push({
        resource: RESOURCE_DEMANDS.DENSITY_REQUIREMENTS.COUNTER_DENSITY,
        effect: 'ADD_COUNTERS',
        usableAsFodder: true,
        quantity: 1
      });
    }
    requirements.requiresCounters = true;
    multiplies.push('CounterEngine');
  }

  // ── F. Aceleración & Maná ──
  if (oracle.includes('add {') || oracle.includes('add one mana') || oracle.includes('search your library for a land card')) {
    capabilities.ManaAcceleration = cmc <= 1 ? 100 : (cmc === 2 ? 85 : 60);
    capabilities.EarlyGameScore = Math.max(capabilities.EarlyGameScore, 90);
    capabilities.LateGameScore = Math.min(capabilities.LateGameScore, 30);
    
    supplies.push({
      resource: RESOURCE_DEMANDS.EXECUTION_REQUIREMENTS.EARLY_MANA_ACCESS,
      effect: 'MANA_ACCELERATION',
      usableAsFodder: true,
      quantity: 1
    });
    enables.push('TurnAcceleration');
  }

  if (cmc >= 5) {
    demands.push({
      resource: RESOURCE_DEMANDS.EXECUTION_REQUIREMENTS.EARLY_MANA_ACCESS,
      necessity: DEMAND_NECESSITY.AMPLIFYING,
      timing: 'EARLY_GAME',
      targetTurn: 2,
      quantity: 2
    });
  }

  // ── G. Remoción / Interacción / Finishers ──
  if (oracle.includes('deals') && (oracle.includes('damage to any target') || oracle.includes('damage to target player') || oracle.includes('deals') && oracle.includes('damage'))) {
    capabilities.RemovalImpact = cmc <= 2 ? 95 : 75;
    capabilities.TempoBoost += 40;
    supplies.push({
      resource: 'DIRECT_DAMAGE',
      effect: 'DAMAGE',
      usableAsFodder: false,
      quantity: 1
    });
    if (oracle.includes('any target') || oracle.includes('target player')) {
      supplies.push({
        resource: 'PLAYER_REACH',
        effect: 'FACE_DAMAGE',
        usableAsFodder: false,
        quantity: 1
      });
    }
  } else if (oracle.includes('destroy target') || oracle.includes('exile target')) {
    capabilities.RemovalImpact = cmc <= 2 ? 95 : 75;
    capabilities.TempoBoost += 40;
    supplies.push({
      resource: 'INTERACTION_SPELL',
      effect: 'REMOVAL',
      usableAsFodder: false,
      quantity: 1
    });
  }

  if (oracle.includes('draw a card') || oracle.includes('draws two cards') || oracle.includes('draw cards')) {
    capabilities.CardDrawEfficiency = cmc <= 2 ? 90 : 70;
    supplies.push({
      resource: 'CARD_ADVANTAGE',
      effect: 'DRAW',
      usableAsFodder: false,
      quantity: 1
    });
  }

  // Integración de Know-Overridden Tags
  if (know.engines) {
    know.engines.forEach(eng => enables.push(eng));
  }

  const cardCausalContract = {
    card: card.name,
    oracleSource: 'SCRYFALL_ORACLE',
    supplies: supplies.map(s => s.resource),
    demands: demands.map(d => ({ resource: d.resource, necessity: d.necessity, targetTurn: d.targetTurn || 2 })),
    timing: {
      earliestRelevantTurn: Math.max(1, cmc),
      latestStrategicTurn: cmc >= 4 ? 6 : 4
    },
    targets: oracle.includes('any target') || oracle.includes('target player') ? ['PLAYER_OR_PLANESWALKER', 'CREATURE'] : ['CREATURE'],
    costs: oracle.includes('sacrifice') ? ['SACRIFICE_PERMANENT'] : [],
    causalEdges: supplies.map(s => s.resource).concat(demands.map(d => `REQUIRES_${d.resource}`)),
    strategicRoles: know.roles || [],
    evidence: ['oracle_text', 'type_line', 'mana_cost']
  };

  return {
    cardName: card.name,
    cmc,
    typeLine,
    capabilities,
    requirements,
    supplies,
    demands,
    cardCausalContract,
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
    supplies: [],
    demands: [],
    enables: [],
    multiplies: [],
    conflicts: [],
    roles: [],
    tags: []
  };
}
