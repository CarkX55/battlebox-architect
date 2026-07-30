/**
 * StrategicConceptCatalog.js - Layer 6
 * Catalog of Abstract Strategic Concepts (Tempo, Initiative, Inevitability, Virtual Card Advantage).
 */

import { KnowledgeObject } from '../Core/KnowledgeObject.js';

export class StrategicConceptCatalog {
  static CONCEPTS = Object.freeze([
    new KnowledgeObject({ id: 'Tempo', type: 'Concept', confidence: 0.95, sources: ['DomainKnowledge'] }),
    new KnowledgeObject({ id: 'Initiative', type: 'Concept', confidence: 0.90, sources: ['DomainKnowledge'] }),
    new KnowledgeObject({ id: 'Inevitability', type: 'Concept', confidence: 0.92, sources: ['DomainKnowledge'] }),
    new KnowledgeObject({ id: 'VirtualCardAdvantage', type: 'Concept', confidence: 0.88, sources: ['DomainKnowledge'] }),
    new KnowledgeObject({ id: 'ThreatDensity', type: 'Concept', confidence: 0.90, sources: ['DomainKnowledge'] }),
    new KnowledgeObject({ id: 'OpportunityCost', type: 'Concept', confidence: 0.94, sources: ['DomainKnowledge'] })
  ]);

  static getConcept(id) {
    return StrategicConceptCatalog.CONCEPTS.find(c => c.id === id) || null;
  }
}
