/**
 * StrategicKnowledgeService.js
 * Unified Serving API for BattleBox Architect v8.0 Strategic Knowledge Engine (SKE).
 */

import { StrategicConceptCatalog } from '../ConceptKnowledge/StrategicConceptCatalog.js';
import { CausalKnowledgeGraph } from '../Graph/CausalKnowledgeGraph.js';

export class StrategicKnowledgeService {
  constructor() {
    this.causalGraph = new CausalKnowledgeGraph();
  }

  getStrategicConcept(conceptId) {
    return StrategicConceptCatalog.getConcept(conceptId);
  }

  getCausalRelations(capability) {
    return this.causalGraph.getRelationsFor(capability);
  }
}
