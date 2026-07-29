/**
 * src/services/engineDiscoveryService.js
 * 
 * Hito 3b: Descubrimiento Dinámico de Motores mediante Clustering de Capacidades
 * 
 * Permite descubrir motores nuevos de colecciones futuras sin tocar código.
 * Convierte agrupaciones de capacidades e interacciones causales del CausalCardGraph en EngineNodes.
 */

import { createEngineNode } from '../models/deckModels.js';
import { analyzeCardIntelligence } from './cardIntelligenceEngine.js';

/**
 * Descubre motores estratégicos dinámicos a partir del CausalCardGraph y candidatos.
 * 
 * @param {Object} causalCardGraph Grafo causal de cartas
 * @param {Array<Object>} candidates Cartas candidatas
 * @returns {Array<Object>} Lista de EngineNodes descubiertos
 */
export function discoverEnginesFromCapabilities(causalCardGraph, candidates = []) {
  const capabilityGroups = {};

  // 1. Agrupar cartas por capacidades principales (SSOT: Card Intelligence)
  for (const card of candidates) {
    const profile = analyzeCardIntelligence(card);
    const primaryCaps = [...profile.produces, ...profile.enables];

    for (const cap of primaryCaps) {
      if (!capabilityGroups[cap]) {
        capabilityGroups[cap] = [];
      }
      capabilityGroups[cap].push({ card, profile });
    }
  }

  const discoveredNodes = [];

  // 2. Mapear grupos de masa crítica a EngineNodes dinámicos (Mínimo 3 cartas para considerar un motor)
  for (const [cap, members] of Object.entries(capabilityGroups)) {
    if (members.length >= 3) {
      const engineId = deriveEngineIdFromCapability(cap);
      
      const node = createEngineNode({
        id: engineId,
        label: `Dynamic ${cap} Engine`,
        type: members.length >= 5 ? 'primary' : 'support',
        capabilities: [cap],
        deploymentPhase: members[0].profile.bestTurn <= 2 ? 'early' : (members[0].profile.bestTurn <= 4 ? 'mid' : 'late'),
        requiredCoverage: members.length >= 5 ? 85 : 70,
        requiredHealthScore: 70
      });

      discoveredNodes.push(node);
    }
  }

  // 3. Inferir dependencias causales entre motores descubiertos
  const nodeMap = new Map(discoveredNodes.map(n => [n.id, n]));

  if (causalCardGraph && causalCardGraph.causalEdges) {
    for (const edge of causalCardGraph.causalEdges) {
      const srcCard = candidates.find(c => c.name === edge.source);
      const tgtCard = candidates.find(c => c.name === edge.target);

      if (srcCard && tgtCard) {
        const srcProf = analyzeCardIntelligence(srcCard);
        const tgtProf = analyzeCardIntelligence(tgtCard);

        const srcEngId = deriveEngineIdFromCapability(srcProf.produces[0] || srcProf.enables[0]);
        const tgtEngId = deriveEngineIdFromCapability(tgtProf.produces[0] || tgtProf.enables[0]);

        if (srcEngId && tgtEngId && srcEngId !== tgtEngId) {
          const srcNode = nodeMap.get(srcEngId);
          if (srcNode && !srcNode.enables.some(e => e.target === tgtEngId)) {
            srcNode.enables.push({
              target: tgtEngId,
              weight: edge.weight || 0.8,
              confidence: edge.confidence || 0.9
            });
          }
        }
      }
    }
  }

  return Array.from(nodeMap.values());
}

function deriveEngineIdFromCapability(cap) {
  if (!cap) return 'token_engine';
  const c = cap.toLowerCase();
  if (c.includes('mana') || c.includes('acceleration') || c.includes('ramp')) return 'ramp_engine';
  if (c.includes('token') || c.includes('gowide') || c.includes('boardwidth') || c.includes('presence')) return 'token_engine';
  if (c.includes('sacrifice') || c.includes('fodder') || c.includes('death')) return 'sacrificefodder_engine';
  if (c.includes('anthem') || c.includes('buff') || c.includes('lord')) return 'anthem_engine';
  if (c.includes('cardadvantage') || c.includes('draw')) return 'draw_engine';
  if (c.includes('removal') || c.includes('control') || c.includes('interaction')) return 'removal_engine';
  if (c.includes('alphastrike') || c.includes('finisher') || c.includes('wincond')) return 'finisher_engine';
  if (c.includes('protection') || c.includes('countermagic')) return 'protection_engine';
  return 'token_engine';
}
