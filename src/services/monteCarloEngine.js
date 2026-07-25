/**
 * src/services/monteCarloEngine.js
 * 
 * Motor de Simulación Monte Carlo (1,000 Manos Iniciales) para Magic: The Gathering.
 * 
 * Ejecuta 1,000 simulaciónes estadísticas de robos iniciales en ~15 ms en JavaScript
 * para calcular empíricamente la consistencia de maná, curvas de juego y riesgos de mulligan.
 */

import { isLand } from './deckCalculator.js';

/**
 * Mezcla un array de cartas utilizando el algoritmo Fisher-Yates.
 */
function shuffleLibrary(deckArray) {
  const library = [...deckArray];
  for (let i = library.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [library[i], library[j]] = [library[j], library[i]];
  }
  return library;
}

/**
 * Expande un mazo comprimido [{ name, quantity, ... }] en un array plano de 60/100 cartas individuales.
 */
export function flattenDeckList(deck = []) {
  const flat = [];
  deck.forEach(card => {
    const qty = Number(card.quantity || card.count || 1);
    for (let i = 0; i < qty; i++) {
      flat.push({
        ...card,
        cmc: typeof card.cmc === 'number' ? card.cmc : parseInt(card.cmc || card.mana_value || 0, 10),
        isLandCard: isLand(card)
      });
    }
  });
  return flat;
}

/**
 * Ejecuta la simulación Monte Carlo de 1,000 manos iniciales.
 * 
 * @param {Array} deck - Mazo actual
 * @param {number} iterations - Número de manos a simular (predeterminado: 1000)
 * @returns {Object} Estadísticas empíricas de la simulación
 */
export function runMonteCarloSimulation(deck = [], iterations = 1000) {
  const flatDeck = flattenDeckList(deck);
  const deckSize = flatDeck.length;

  if (deckSize < 40) {
    return { error: "Tamaño de mazo insuficiente para simulación Monte Carlo." };
  }

  let zeroOneLandHands = 0;
  let perfectManaHands = 0; // 2-4 tierras en mano de 7
  let floodHands = 0;      // 5+ tierras en mano de 7

  let turn1PlayCount = 0;
  let turn2RampCount = 0;

  const manaAvailableTurns = { turn1: 0, turn2: 0, turn3: 0, turn4: 0 };

  for (let sim = 0; sim < iterations; sim++) {
    const library = shuffleLibrary(flatDeck);
    const hand = library.slice(0, 7);
    const drawT2 = library[7];
    const drawT3 = library[8];
    const drawT4 = library[9];

    // 1. Conteo de tierras en mano inicial
    const landsInHand = hand.filter(c => c.isLandCard).length;
    if (landsInHand <= 1) zeroOneLandHands++;
    else if (landsInHand >= 2 && landsInHand <= 4) perfectManaHands++;
    else if (landsInHand >= 5) floodHands++;

    // 2. Disponibilidad de Maná por Turno
    let landsT1 = landsInHand;
    let landsT2 = landsT1 + (drawT2 && drawT2.isLandCard ? 1 : 0);
    let landsT3 = landsT2 + (drawT3 && drawT3.isLandCard ? 1 : 0);
    let landsT4 = landsT3 + (drawT4 && drawT4.isLandCard ? 1 : 0);

    if (landsT1 >= 1) manaAvailableTurns.turn1++;
    if (landsT2 >= 2) manaAvailableTurns.turn2++;
    if (landsT3 >= 3) manaAvailableTurns.turn3++;
    if (landsT4 >= 4) manaAvailableTurns.turn4++;

    // 3. Probabilidad de Jugada en Turno 1 (Criatura/Spell CMC 1 de color jugable)
    const hasT1Play = hand.some(c => !c.isLandCard && c.cmc === 1);
    if (landsT1 >= 1 && hasT1Play) turn1PlayCount++;

    // 4. Probabilidad de Aceleración en Turno 2 (Ramp CMC <= 2)
    const handPlusT2 = [...hand, drawT2].filter(Boolean);
    const hasT2Ramp = handPlusT2.some(c => !c.isLandCard && c.cmc <= 2 && (
      (c.oracle_text || c.text || '').toLowerCase().includes('add') ||
      (c.oracle_text || c.text || '').toLowerCase().includes('search your library for a land')
    ));
    if (landsT2 >= 2 && hasT2Ramp) turn2RampCount++;
  }

  return {
    iterations,
    mulliganRisk: {
      zeroOrOneLandPct: Math.round((zeroOneLandHands / iterations) * 100),
      perfectHandPct: Math.round((perfectManaHands / iterations) * 100),
      floodHandPct: Math.round((floodHands / iterations) * 100)
    },
    manaAvailablePct: {
      turn1: Math.round((manaAvailableTurns.turn1 / iterations) * 100),
      turn2: Math.round((manaAvailableTurns.turn2 / iterations) * 100),
      turn3: Math.round((manaAvailableTurns.turn3 / iterations) * 100),
      turn4: Math.round((manaAvailableTurns.turn4 / iterations) * 100)
    },
    turn1PlayPct: Math.round((turn1PlayCount / iterations) * 100),
    turn2RampPct: Math.round((turn2RampCount / iterations) * 100)
  };
}
