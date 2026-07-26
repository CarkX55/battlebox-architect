/**
 * src/services/synergyGraphService.js
 * 
 * Hito 2: Servicio de Grafo Directo de Sinergias (Synergy Graph).
 * 
 * Mapea las relaciones dirigidas directas entre cartas (habilita, requiere, mejora, sustituye).
 */

import { analyzeCardIntelligence } from './cardIntelligenceEngine.js';

/**
 * Construye las aristas relacionales dirigidas del mazo.
 * 
 * @param {Array} deckList Lista de cartas en el mazo
 * @returns {Array} Lista de aristas del Synergy Graph ({ source, target, relation, description })
 */
export function buildDirectSynergyGraph(deckList = []) {
  if (!Array.isArray(deckList) || deckList.length < 2) {
    return [];
  }

  const edges = [];

  for (let i = 0; i < deckList.length; i++) {
    for (let j = 0; j < deckList.length; j++) {
      if (i === j) continue;

      const cardA = deckList[i];
      const cardB = deckList[j];

      const intelA = cardA.card_intelligence || analyzeCardIntelligence(cardA);
      const intelB = cardB.card_intelligence || analyzeCardIntelligence(cardB);

      // 1. Relación "habilita" (Acelera a costes altos, genera tokens para sac-outlets)
      if (intelA.produces.includes('Mana') && intelB.cmc >= 4) {
        edges.push({
          source: cardA.name,
          target: cardB.name,
          relation: 'habilita',
          description: `${cardA.name} acelera el maná para lanzar ${cardB.name} turnos antes.`
        });
      }

      if (intelA.produces.includes('Tokens') && intelB.needs.includes('BoardWidth')) {
        edges.push({
          source: cardA.name,
          target: cardB.name,
          relation: 'habilita',
          description: `${cardA.name} genera la masa de tokens que activa la letalidad de ${cardB.name}.`
        });
      }

      if (intelA.produces.includes('Tokens') && intelB.needs.includes('SacrificeFodder')) {
        edges.push({
          source: cardA.name,
          target: cardB.name,
          relation: 'habilita',
          description: `${cardA.name} genera fichas que alimentan el coste de sacrificio de ${cardB.name}.`
        });
      }

      // 2. Relación "mejora" (Synergy Multiplier)
      if (intelA.produces.includes('TutorTarget') && intelB.enables.includes('AlphaStrike')) {
        edges.push({
          source: cardA.name,
          target: cardB.name,
          relation: 'mejora',
          description: `${cardA.name} busca de forma consistente la pieza de cierre ${cardB.name}.`
        });
      }

      // 3. Relación "sustituye" (Functional Substitutes)
      if (intelA.cmc === intelB.cmc && intelA.cardIntent.primaryIntent === intelB.cardIntent.primaryIntent && intelA.cardIntent.primaryIntent !== 'Desarrollo') {
        edges.push({
          source: cardA.name,
          target: cardB.name,
          relation: 'sustituye',
          description: `${cardA.name} y ${cardB.name} son funcionalmente redundantes en el rol de ${intelA.cardIntent.primaryIntent}.`
        });
      }
    }
  }

  return edges;
}
