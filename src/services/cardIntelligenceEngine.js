/**
 * src/services/cardIntelligenceEngine.js
 * 
 * Hito 1: Motor de Inteligencia de Cartas y Perfiles Semánticos.
 * 
 * Parsea el Oracle Text, tipos, costes y palabras clave de CUALQUIER carta de MTG
 * y genera su `SemanticCardProfile` enriquecido con `cardIntent` de forma 100% offline y determinista.
 */

import { getCardKnowledge } from './knowledgeGraphService.js';
import {
  extractCanonicalCmc,
  extractCanonicalOracleText,
  extractCanonicalTypeLine,
  extractCanonicalKeywords
} from './compiler/core/canonicalCardNormalizer.js';

/**
 * Derives the earliest strategic contribution turn causally from card action profiles.
 * Distinguishes legal casting cost, alternate costs, hand activations, and transforming DFCs.
 * 
 * @param {Object} params
 * @returns {number} Earliest strategic contribution turn (1..6)
 */
export function deriveEarliestStrategicContribution({ cmc, oracleText = '', typeLine = '', keywords = [], card = null }) {
  const oracle = (oracleText || '').toLowerCase();
  const type = (typeLine || '').toLowerCase();
  const kw = (keywords || []).map(k => String(k).toLowerCase());

  // 1. Lands and 0-cost mana accelerants can contribute on Turn 1
  if (type.includes('land') || (cmc === 0 && (oracle.includes('add {') || oracle.includes('mana')))) {
    return 1;
  }

  // 2. 1-CMC cards contribute on Turn 1
  if (cmc <= 1) {
    return 1;
  }

  // 3. Alternate action profiles for Turn 1 contribution on higher CMC cards
  // A. Cycling / Transmute / Channel for 1 or 0 mana from hand
  const hasCheapCycling = /cycling\s*\{[1wubrgx0]\}/i.test(oracle);
  const hasCheapChannel = /channel\s*[-—]\s*\{[1wubrgx0]\}/i.test(oracle);
  const hasFreeCast = oracle.includes('rather than pay this spell\'s mana cost') ||
                      oracle.includes('you may exile a') ||
                      kw.includes('pitch');

  if (hasCheapCycling || hasCheapChannel || hasFreeCast) {
    return 1;
  }

  // B. Transforming / Modal DFCs (MDFCs) with a land reverse face
  const faces = Array.isArray(card?.card_faces) ? card.card_faces : (Array.isArray(card?.cardObj?.card_faces) ? card.cardObj.card_faces : []);
  if (faces.length > 1) {
    const backType = (faces[1].type_line || '').toLowerCase();
    if (backType.includes('land')) {
      return 1; // Can be played as a land on T1
    }
  }

  // 4. 2-CMC cards contribute on Turn 2
  if (cmc === 2) {
    return 2;
  }

  // 5. Higher CMC cards (>= 3):
  // Check if they have 2-mana alternate actions (e.g. Cycling {2})
  const has2ManaCycling = /cycling\s*\{[2]\}/i.test(oracle);
  if (has2ManaCycling) {
    return 2;
  }

  // Standard causal contribution is the turn the card can realistically be cast
  return Math.max(1, Math.min(6, Math.floor(cmc)));
}

/**
 * Builds the canonical card profile as the Single Source of Truth (SSOT).
 * Strictly derived from CanonicalCardNormalizer; NEVER consumes unvalidated card_intelligence.
 * 
 * @param {Object} card 
 * @returns {Object} Immutable CanonicalCardProfile
 */
export function buildCanonicalCardProfile(card) {
  if (!card || !card.name) {
    return Object.freeze({
      name: 'Unknown',
      cmc: 0,
      manaValue: 0,
      typeLine: '',
      oracleText: '',
      keywords: [],
      bestTurn: 1,
      card_faces: null
    });
  }

  const cmc = extractCanonicalCmc(card);
  const oracleText = extractCanonicalOracleText(card);
  const typeLine = extractCanonicalTypeLine(card);
  const keywords = extractCanonicalKeywords(card);
  const bestTurn = deriveEarliestStrategicContribution({ cmc, oracleText, typeLine, keywords, card });

  const faces = Array.isArray(card.card_faces)
    ? card.card_faces
    : (Array.isArray(card.cardObj?.card_faces) ? card.cardObj.card_faces : null);

  return Object.freeze({
    name: card.name,
    cmc,
    manaValue: cmc,
    typeLine,
    oracleText,
    keywords,
    bestTurn,
    card_faces: faces
  });
}

/**
 * Genera el perfil de inteligencia semántica de una carta estrictamente derivado
 * de su CanonicalCardProfile.
 * 
 * @param {Object} card Objeto carta
 * @returns {Object} SemanticCardProfile completo
 */
export function analyzeCardIntelligence(card) {
  if (!card || !card.name) {
    return createEmptyCardIntelligence();
  }

  const profile = buildCanonicalCardProfile(card);
  const cmc = profile.cmc;
  const oracle = profile.oracleText.toLowerCase();
  const typeLine = profile.typeLine.toLowerCase();
  const keywords = profile.keywords.map(k => k.toLowerCase());
  const bestTurn = profile.bestTurn;

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

  // 2. Importancia Relativa por Fase
  let importanceEarly = 50;
  let importanceLate = 50;
  if (bestTurn === 1 && produces.includes('Mana')) {
    importanceEarly = 100;
    importanceLate = 25;
  } else if (bestTurn <= 2 && (produces.includes('Removal') || produces.includes('CardAdvantage'))) {
    importanceEarly = 85;
    importanceLate = 70;
  } else if (bestTurn >= 4 && (enables.includes('AlphaStrike') || enables.includes('LethalFinisher') || typeLine.includes('planeswalker'))) {
    importanceEarly = 20;
    importanceLate = 100;
  }

  // 3. Extracción del "Card Intent"
  const cardIntent = determineCardIntent(produces, enables, needs, cmc, typeLine);

  return {
    cardName: profile.name,
    cmc: profile.cmc,
    typeLine: profile.typeLine,
    produces: Array.from(new Set(produces)),
    consumes: Array.from(new Set(consumes)),
    needs: Array.from(new Set(needs)),
    enables: Array.from(new Set(enables)),
    supports: Array.from(new Set(supports)),
    weakAgainst: Array.from(new Set(weakAgainst)),
    bestTurn: profile.bestTurn,
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

/**
 * Canonical card profile extractor for downstream strategic reasoning.
 * Strictly derives all properties from CanonicalCardNormalizer and attaches
 * derived CardIntelligence. Prohibits raw card field access and ensures
 * zero reliance on pre-existing or stale card.card_intelligence.
 * 
 * @param {Object} card
 * @returns {Object} Immutable CanonicalCardProfile
 */
export function extractCanonicalCardProfile(card) {
  if (!card) return Object.freeze(createEmptyCardIntelligence());
  const profile = buildCanonicalCardProfile(card);
  const intel = analyzeCardIntelligence(card);

  // Self-heal the input card object in-memory to prevent legacy consumer divergence
  if (typeof card === 'object') {
    card.card_intelligence = intel;
  }

  return Object.freeze({
    name: profile.name,
    cmc: profile.cmc,
    manaValue: profile.cmc,
    typeLine: profile.typeLine,
    oracleText: profile.oracleText,
    keywords: profile.keywords,
    bestTurn: profile.bestTurn,
    card_faces: profile.card_faces,
    produces: intel.produces,
    consumes: intel.consumes,
    needs: intel.needs,
    enables: intel.enables,
    supports: intel.supports,
    weakAgainst: intel.weakAgainst,
    functionalRoles: intel.functionalRoles,
    cardIntent: intel.cardIntent
  });
}

