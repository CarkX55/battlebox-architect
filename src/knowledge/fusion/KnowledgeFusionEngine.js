/**
 * KnowledgeFusionEngine.js
 * Multi-Source Fusion Engine: Resolves conflicts, calculates dynamic confidence, and merges knowledge objects.
 */

import { KnowledgeObject } from '../storage/KnowledgeObject.js';
import { ConfidenceCalculator } from '../validation/ConfidenceCalculator.js';

export class KnowledgeFusionEngine {
  static fuse(rawObjects = []) {
    if (!rawObjects || rawObjects.length === 0) return [];

    const map = new Map();

    for (const obj of rawObjects) {
      const key = obj.id || `${obj.type}_${JSON.stringify(obj.data || {})}`;

      if (!map.has(key)) {
        map.set(key, obj);
      } else {
        const existing = map.get(key);
        const mergedSources = Array.from(new Set([...(existing.sources || []), ...(obj.sources || [])]));
        const mergedEvidence = [...(existing.evidence || []), ...(obj.evidence || [])];
        const mergedRelationships = Array.from(new Set([...(existing.relationships || []), ...(obj.relationships || [])]));
        
        // Calculate updated dynamic confidence
        const dynamicConfidence = ConfidenceCalculator.calculate([
          ...mergedSources.map(s => ({ source: s, confidence: 0.85 })),
          ...mergedEvidence
        ]);

        const fusedData = {
          ...(existing.data || {}),
          ...(obj.data || {})
        };

        const fusedObj = new KnowledgeObject({
          id: existing.id,
          type: existing.type,
          version: existing.version,
          revision: (existing.revision || 1) + 1,
          confidence: dynamicConfidence,
          evidence: mergedEvidence,
          sources: mergedSources,
          relationships: mergedRelationships,
          data: fusedData,
          created: existing.created,
          lastValidated: Date.now(),
          deprecated: existing.deprecated && obj.deprecated
        });

        map.set(key, fusedObj);
      }
    }

    return Array.from(map.values());
  }
}
