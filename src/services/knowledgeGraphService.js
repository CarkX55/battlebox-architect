/**
 * src/services/knowledgeGraphService.js
 * 
 * Servicio de Knowledge Graph para etiquetado estructurado y cálculo de sinergias.
 * 
 * En lugar de depender de búsquedas difusas en texto Oracle, este servicio asigna:
 * - roles: ["Ramp", "Threat", "Removal", "CardDraw", "Engine", "Finisher"]
 * - tags: ["ETB", "Sacrifice", "Burn", "Graveyard", "Token", "Haste"]
 * - engines: ["Blink", "Aristocrats", "Prowess", "Madness", "Delve"]
 * - worksWith: ["Monastery Swiftspear", "Yawgmoth, Thran Physician", ...]
 * - antiSynergies: ["Grafdigger's Cage", "Collector Ouphe", ...]
 */

import { MICRO_SYNERGIES_GRAPH, COMPETITIVE_ANTI_SYNERGIES } from '../constants/legacyBattleBox.js';

// Base de conocimiento estática para cartas y motores icónicos de 60 cartas
const KNOWLEDGE_GRAPH_OVERIDES = {
  "monastery swiftspear": {
    roles: ["Threat", "AggroFinisher"],
    tags: ["Prowess", "Haste", "NoncreatureSpell"],
    engines: ["Prowess", "Spellslinger"],
    worksWith: ["play with fire", "lightning strike", "slickshot show-off", "light up the stage"]
  },
  "slickshot show-off": {
    roles: ["Threat", "Finisher"],
    tags: ["Plot", "Flying", "Prowess"],
    engines: ["Spellslinger", "Prowess"],
    worksWith: ["monastery swiftspear", "play with fire", "kumano faces kakkazan"]
  },
  "yawgmoth, thran physician": {
    roles: ["Engine", "Removal", "CardDraw"],
    tags: ["Sacrifice", "Proliferate", "PayLife"],
    engines: ["Aristocrats", "Combo"],
    worksWith: ["young wolf", "strangleroot geist", "blood artist", "zulaport cutthroat"]
  },
  "young wolf": {
    roles: ["Fodder", "Threat"],
    tags: ["Undying", "SacrificeOutlet"],
    engines: ["Aristocrats"],
    worksWith: ["yawgmoth, thran physician", "strangleroot geist"]
  },
  "thassa's oracle": {
    roles: ["WinCondition", "ComboPiece"],
    tags: ["ETB", "Devotion", "Mill"],
    engines: ["Combo"],
    worksWith: ["demonic consultation", "tainted pact"]
  },
  "archon of cruelty": {
    roles: ["ReanimateTarget", "Finisher"],
    tags: ["ETB", "Attack", "Drain", "Discard", "Draw"],
    engines: ["Reanimator", "CreatureCheating"],
    worksWith: ["persist", "unmarked grave", "faithful mending"]
  }
};

/**
 * Infiere metadatos estructurados para una carta si no tiene override manual.
 */
export function getCardKnowledge(card) {
  if (!card || !card.name) return { roles: [], tags: [], engines: [], worksWith: [], antiSynergies: [] };

  const nameLower = card.name.toLowerCase();

  // 1. Si existe un override manual explícito
  if (KNOWLEDGE_GRAPH_OVERIDES[nameLower]) {
    return KNOWLEDGE_GRAPH_OVERIDES[nameLower];
  }

  // 2. Extraer dinámicamente según Oracle Text, tipos y subdatos
  const oracle = (card.oracle_text || card.text || '').toLowerCase();
  const typeLine = (card.type_line || card.type || '').toLowerCase();
  const keywords = (card.keywords || []).map(k => k.toLowerCase());

  const roles = [];
  const tags = [...keywords];
  const engines = [];
  const worksWith = [];

  // Conexiones desde MICRO_SYNERGIES_GRAPH
  if (MICRO_SYNERGIES_GRAPH[nameLower]) {
    const targets = MICRO_SYNERGIES_GRAPH[nameLower].map(t => t.target.toLowerCase());
    worksWith.push(...targets);
  }

  // Deducción de Roles
  if (typeLine.includes('land')) {
    roles.push('Land');
  } else {
    if (oracle.includes('deals') && (oracle.includes('damage to any target') || oracle.includes('damage to target'))) {
      roles.push('Removal', 'Burn');
    }
    if (oracle.includes('destroy target') || oracle.includes('exile target')) {
      roles.push('Removal');
    }
    if (oracle.includes('draw a card') || oracle.includes('draws') || oracle.includes('look at the top')) {
      roles.push('CardDraw');
    }
    if (oracle.includes('add {') || oracle.includes('search your library for a land')) {
      roles.push('Ramp');
    }
    if (typeLine.includes('creature')) {
      roles.push('Threat');
      if (oracle.includes('haste') || oracle.includes('flying')) tags.push('Evasion');
    }
    if (oracle.includes('counter target spell')) {
      roles.push('Counterspell', 'Interaction');
    }
  }

  // Deducción de Engines
  if (oracle.includes('whenever you cast an instant or sorcery') || oracle.includes('prowess')) {
    engines.push('Spellslinger', 'Prowess');
  }
  if (oracle.includes('whenever a creature dies') || oracle.includes('sacrifice a creature')) {
    engines.push('Aristocrats');
  }
  if (oracle.includes('return target creature card from your graveyard')) {
    engines.push('Reanimator');
  }

  return {
    roles,
    tags,
    engines,
    worksWith,
    antiSynergies: COMPETITIVE_ANTI_SYNERGIES[nameLower] || []
  };
}

/**
 * Calcula el coeficiente de sinergia entre dos cartas (0.0 a 10.0).
 */
export function calculatePairwiseSynergyScore(cardA, cardB) {
  if (!cardA || !cardB) return 0;
  
  const nameA = cardA.name.toLowerCase();
  const nameB = cardB.name.toLowerCase();

  // 1. Grafo explícito de micro-sinergias
  if (MICRO_SYNERGIES_GRAPH[nameA]) {
    const match = MICRO_SYNERGIES_GRAPH[nameA].find(m => m.target.toLowerCase() === nameB);
    if (match) return match.multiplier || 5.0;
  }

  // 2. Coincidencia de metadatos Knowledge Graph
  const knowA = getCardKnowledge(cardA);
  const knowB = getCardKnowledge(cardB);

  let score = 0;

  // Motores compartidos
  const sharedEngines = knowA.engines.filter(e => knowB.engines.includes(e));
  if (sharedEngines.length > 0) score += 3.5 * sharedEngines.length;

  // Tags complementarios (ej: Prowess + NoncreatureSpell / Sacrifice + Fodder)
  if (knowA.tags.includes('Prowess') && knowB.roles.includes('Burn')) score += 2.0;
  if (knowA.engines.includes('Aristocrats') && knowB.tags.includes('SacrificeOutlet')) score += 3.0;

  // Anti-sinergias
  if (knowA.antiSynergies.includes(nameB) || knowB.antiSynergies.includes(nameA)) {
    score -= 8.0;
  }

  return Math.max(0, Math.min(10.0, score));
}
