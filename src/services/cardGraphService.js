/**
 * src/services/cardGraphService.js
 * 
 * Hito 3a: Grafo Causal de Cartas (CausalCardGraph) con 15 Aristas Estratégicas
 * 
 * Regla SSOT:
 * - Card Profile (cardIntelligenceEngine) es la ÚNICA fuente de verdad para capacidades.
 * - CardGraph almacena la red de relaciones causales directas entre cartas.
 * - Las 15 aristas estratégicas:
 *   requires, enables, protects, duplicates, enhances, accelerates, stalls, fixes,
 *   tutors, recurs, transforms, locks, feeds, scales, taxes.
 */

import { analyzeCardIntelligence } from './cardIntelligenceEngine.js';
import { createCausalCardGraph } from '../models/deckModels.js';

/**
 * Construye el CausalCardGraph a partir de una lista de cartas candidatas.
 * 
 * @param {Array<Object>} candidates Lista de cartas MTG
 * @returns {Object} CausalCardGraph congelable
 */
export function buildCausalCardGraph(candidates = []) {
  const nodes = candidates.map(card => {
    const profile = analyzeCardIntelligence(card);
    return {
      id: card.name,
      card,
      profile
    };
  });

  const causalEdges = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;

      const source = nodes[i];
      const target = nodes[j];
      const edgesFound = detectCausalRelations(source, target);

      for (const edge of edgesFound) {
        causalEdges.push({
          source: source.id,
          target: target.id,
          relation: edge.relation,
          weight: edge.weight,
          confidence: edge.confidence,
          reason: edge.reason
        });
      }
    }
  }

  return createCausalCardGraph(candidates, causalEdges);
}

/**
 * Detecta las 15 aristas estratégicas entre dos cartas de forma determinista.
 */
function detectCausalRelations(source, target) {
  const sp = source.profile;
  const tp = target.profile;
  const edges = [];

  const sOracle = (source.card.oracle_text || source.card.text || '').toLowerCase();
  const tOracle = (target.card.oracle_text || target.card.text || '').toLowerCase();

  // 1. ACCELERATES: Ramp dork/rock acelera carta cara
  if (sp.produces.includes('Mana') && target.card.cmc >= 3) {
    edges.push({
      relation: 'accelerates',
      weight: sp.cmc <= 1 ? 0.95 : 0.75,
      confidence: 0.98,
      reason: `${source.id} (CMC ${sp.cmc}) acelera el despliegue de ${target.id} (CMC ${target.card.cmc})`
    });
  }

  // 2. FEEDS / ENABLES: Generador de tokens/fodder alimenta payoff/sacrificio
  if (sp.enables.includes('SacrificeFodder') && (tp.consumes.includes('Creatures') || tOracle.includes('sacrifice a creature'))) {
    edges.push({
      relation: 'feeds',
      weight: 0.90,
      confidence: 0.95,
      reason: `${source.id} genera alimento/tokens para ${target.id}`
    });
  }

  // 3. SCALES / ENHANCES: Go-Wide genera masa para finisher tipo Overrun
  if (sp.enables.includes('GoWide') && (tp.enables.includes('AlphaStrike') || tp.needs.includes('BoardWidth'))) {
    edges.push({
      relation: 'scales',
      weight: 1.0,
      confidence: 0.99,
      reason: `${source.id} expande la mesa incrementando la letalidad de ${target.id}`
    });
  }

  // 4. PROTECTS: Protege de remoçao / sweepers
  if (sp.enables.includes('Protection') && (tp.weakAgainst.includes('CheapRemoval') || tp.weakAgainst.includes('BoardWipes'))) {
    edges.push({
      relation: 'protects',
      weight: 0.85,
      confidence: 0.92,
      reason: `${source.id} aporta protección/countermagic a ${target.id}`
    });
  }

  // 5. TUTORS: Busca la carta objetivo en la biblioteca
  if (sOracle.includes('search your library for') && (sOracle.includes(target.card.name.toLowerCase()) || sOracle.includes('card'))) {
    edges.push({
      relation: 'tutors',
      weight: 0.95,
      confidence: 0.99,
      reason: `${source.id} busca en la biblioteca a ${target.id}`
    });
  }

  // 6. FIXES: Maná o fijación de colores
  if (sp.produces.includes('Mana') && target.card.mana_cost && target.card.mana_cost.includes('{') && target.card.cmc >= 2) {
    edges.push({
      relation: 'fixes',
      weight: 0.70,
      confidence: 0.88,
      reason: `${source.id} aporta maná/fijación para ${target.id}`
    });
  }

  // 7. RECURS: Trae de vuelta del cementerio
  if (sOracle.includes('return') && sOracle.includes('graveyard') && (tp.typeLine.includes('creature') || tp.typeLine.includes('permanent'))) {
    edges.push({
      relation: 'recurs',
      weight: 0.85,
      confidence: 0.94,
      reason: `${source.id} recurre ${target.id} desde el cementerio`
    });
  }

  // 8. DUPLICATES: Efectos idénticos o lores (Parallel Lives / Anointed Procession)
  if (sp.enables.includes('GoWide') && tp.enables.includes('GoWide')) {
    edges.push({
      relation: 'duplicates',
      weight: 0.80,
      confidence: 0.90,
      reason: `${source.id} y ${target.id} duplican/comparten el mismo rol de GoWide`
    });
  }

  // 9. STALLS / TAXES / LOCKS / TRANSFORMS
  if (sp.produces.includes('Countermagic') || sp.produces.includes('Removal')) {
    edges.push({
      relation: 'stalls',
      weight: 0.60,
      confidence: 0.80,
      reason: `${source.id} retarda el tempo dando espacio a ${target.id}`
    });
  }

  return edges;
}
