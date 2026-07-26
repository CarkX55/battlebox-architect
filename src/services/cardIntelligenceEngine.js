/**
 * src/services/cardIntelligenceEngine.js
 * 
 * Hito 1: Motor de Inteligencia de Cartas y Perfiles Semánticos.
 * 
 * Parsea el Oracle Text, tipos, costes y palabras clave de CUALQUIER carta de MTG
 * y genera su `SemanticCardProfile` enriquecido con `cardIntent` de forma 100% offline y determinista.
 */

import { getCardKnowledge } from './knowledgeGraphService.js';

/**
 * Genera el perfil de inteligencia semántica de una carta.
 * 
 * @param {Object} card Objeto carta (name, oracle_text, type_line, mana_cost, cmc, keywords)
 * @returns {Object} SemanticCardProfile completo
 */
export function analyzeCardIntelligence(card) {
  if (!card || !card.name) {
    return createEmptyCardIntelligence();
  }

  const oracle = (card.oracle_text || card.text || '').toLowerCase();
  const typeLine = (card.type_line || card.type || '').toLowerCase();
  const keywords = (card.keywords || []).map(k => k.toLowerCase());
  const cmc = typeof card.cmc === 'number' ? card.cmc : parseInt(card.cmc || 0, 10);

  const know = getCardKnowledge(card);

  // 1. Recursos Producidos, Consumidos y Necesitados
  const produces = [];
  const consumes = [];
  const needs = [];
  const enables = [];
  const supports = [];
  const weakAgainst = [];

  // A. Maná / Aceleración
  if (oracle.includes('add {') || oracle.includes('add one mana') || oracle.includes('search your library for a land card')) {
    produces.push('Mana');
    enables.push('TurnAcceleration', 'BigMana');
    supports.push('HighCostSpells');
  }

  // B. Criaturas / Tokens / Presión
  if (typeLine.includes('creature')) {
    produces.push('BoardPresence');
  }
  if (oracle.includes('create') && oracle.includes('token')) {
    produces.push('Tokens', 'BoardWidth');
    enables.push('GoWide', 'SacrificeFodder');
  }

  // C. Robo / Selección / Consistencia / Tutores
  if (oracle.includes('draw a card') || oracle.includes('draw cards')) {
    produces.push('CardAdvantage');
    enables.push('CardSelection');
  }
  if (oracle.includes('search your library for')) {
    produces.push('TutorTarget');
    enables.push('ComboAssembly', 'Consistency');
  }

  // D. Remoción e Interrupción
  if (
    oracle.includes('destroy target') ||
    oracle.includes('exile target') ||
    oracle.includes('destroy all') ||
    oracle.includes('exile all') ||
    (oracle.includes('deals') && oracle.includes('damage to target'))
  ) {
    produces.push('Removal');
    enables.push('BoardControl', 'TempoInterruption');
  }
  if (oracle.includes('counter target spell')) {
    produces.push('Countermagic');
    enables.push('Protection', 'Interruption');
  }
  if (oracle.includes('target opponent discards')) {
    produces.push('HandDisruption');
    enables.push('ResourceDenial');
  }

  // E. Consumo y Necesidades
  if (oracle.includes('sacrifice a creature') || oracle.includes('sacrifice an artifact')) {
    consumes.push(oracle.includes('creature') ? 'Creatures' : 'Artifacts');
    needs.push('SacrificeFodder');
  }
  if (oracle.includes('creatures you control get +') || oracle.includes('creatures you control gain') || oracle.includes('get +x/+x')) {
    needs.push('BoardWidth', 'HighCreatureDensity');
    enables.push('AlphaStrike', 'LethalFinisher');
  }
  if (oracle.includes('whenever you cast an instant or sorcery')) {
    needs.push('HighInstantSorceryDensity');
    enables.push('SpellslingerEngine');
  }

  // F. Debilidades (Weak Against)
  if (typeLine.includes('creature') && cmc <= 2 && !oracle.includes('hexproof')) {
    weakAgainst.push('CheapRemoval', 'BoardWipes');
  }
  if (oracle.includes('return') && oracle.includes('graveyard')) {
    needs.push('GraveyardSetup');
    weakAgainst.push('GraveyardHate');
  }

  // 2. Determinación del Turno Ideal e Importancia
  let bestTurn = 1;
  let importanceEarly = 50;
  let importanceLate = 50;

  if (cmc <= 1 && produces.includes('Mana')) {
    bestTurn = 1;
    importanceEarly = 100;
    importanceLate = 25;
  } else if (cmc <= 2 && (produces.includes('Removal') || produces.includes('CardAdvantage'))) {
    bestTurn = 2;
    importanceEarly = 85;
    importanceLate = 70;
  } else if (cmc >= 4 && (enables.includes('AlphaStrike') || enables.includes('LethalFinisher') || typeLine.includes('planeswalker'))) {
    bestTurn = Math.min(5, cmc);
    importanceEarly = 20;
    importanceLate = 100;
  } else {
    bestTurn = Math.max(1, Math.min(6, cmc));
  }

  // 3. Extracción del "Card Intent" (Intención Humana Percibida)
  const cardIntent = determineCardIntent(produces, enables, needs, cmc, typeLine);

  return {
    cardName: card.name,
    cmc,
    typeLine,
    produces: Array.from(new Set(produces)),
    consumes: Array.from(new Set(consumes)),
    needs: Array.from(new Set(needs)),
    enables: Array.from(new Set(enables)),
    supports: Array.from(new Set(supports)),
    weakAgainst: Array.from(new Set(weakAgainst)),
    bestTurn,
    importanceEarly,
    importanceLate,
    functionalRoles: know.roles || [],
    cardIntent
  };
}

/**
 * Deduce el Card Intent percibido por un jugador pro.
 */
function determineCardIntent(produces, enables, needs, cmc, typeLine) {
  if (produces.includes('TutorTarget') || enables.includes('Consistency')) {
    return {
      primaryIntent: 'Consistencia',
      humanDescription: 'Encuentra la pieza necesaria, reduce la varianza y asegura el plan.'
    };
  }
  if (enables.includes('TurnAcceleration') || produces.includes('Mana')) {
    return {
      primaryIntent: 'Velocidad',
      humanDescription: 'Adelanta un turno el desarrollo de maná y permite lanzar amenazas antes.'
    };
  }
  if (enables.includes('Protection') || produces.includes('Countermagic')) {
    return {
      primaryIntent: 'Protección',
      humanDescription: 'Protege las piezas clave y defiende la ventaja en mesa.'
    };
  }
  if (enables.includes('AlphaStrike') || enables.includes('LethalFinisher')) {
    return {
      primaryIntent: 'Cierre',
      humanDescription: 'Convierte la ventaja acumulada en una victoria inmediata.'
    };
  }
  if (produces.includes('Removal') || produces.includes('HandDisruption')) {
    return {
      primaryIntent: 'Interrupción',
      humanDescription: 'Desmantela el desarrollo del rival y frena su tempo.'
    };
  }
  if (produces.includes('CardAdvantage')) {
    return {
      primaryIntent: 'Recuperación',
      humanDescription: 'Recarga la mano y mantiene la presión en partidas largas.'
    };
  }

  return {
    primaryIntent: 'Desarrollo',
    humanDescription: 'Aporta presencia de mesa y solidez al plan general.'
  };
}

function createEmptyCardIntelligence() {
  return {
    cardName: 'Unknown',
    cmc: 0,
    typeLine: '',
    produces: [],
    consumes: [],
    needs: [],
    enables: [],
    supports: [],
    weakAgainst: [],
    bestTurn: 1,
    importanceEarly: 50,
    importanceLate: 50,
    functionalRoles: [],
    cardIntent: {
      primaryIntent: 'Desarrollo',
      humanDescription: 'Carta genérica.'
    }
  };
}
