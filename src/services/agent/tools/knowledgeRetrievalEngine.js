/**
 * KNOWLEDGE RETRIEVAL ENGINE (v20.0 "Search Knowledge, Not Cards")
 * 
 * Retrieves complete structured Knowledge Packages for the BattleBoxAgent:
 * Candidates + Derived Capabilities (Layer 2) + Expert Analysis (Layer 3) +
 * Living Meta Stats (Layer 4) + Knowledge Graph Synergies + Expert Deck Corpus Reference.
 */

import { SearchEngineTool } from './searchEngineTool.js';
import { SemanticCapabilityExtractor } from '../../knowledge/semanticCapabilityExtractor.js';
import { offlineKnowledgeDatabase } from '../../knowledge/offlineKnowledgeGenerator.js';
import { metaIngestionPipeline } from '../../knowledge/metaIngestionPipeline.js';
import { strategicKnowledgeGraph } from '../../knowledge/strategicKnowledgeGraph.js';
import { expertDeckCorpus } from '../../knowledge/expertDeckCorpus.js';

export class KnowledgeRetrievalEngine {
  static searchKnowledge(directedQuery = {}, intentLock) {
    // 1. Get raw candidate cards (Layer 1 + SearchEngineTool)
    const rawCandidates = SearchEngineTool.executeSearch(directedQuery, intentLock);

    // 2. Enrich candidate pool with Knowledge Package
    const enrichedCandidates = rawCandidates.map(card => {
      const capabilities = SemanticCapabilityExtractor.extractCapabilities(card);
      const expertAnalysis = offlineKnowledgeDatabase.generateExpertKnowledge(card);
      const coOccurrences = metaIngestionPipeline.getCoOccurrenceStats(card.name);
      const graphSynergies = strategicKnowledgeGraph.getSynergiesForCard(card.name);

      return {
        ...card,
        capabilities,
        expertAnalysis,
        coOccurrences,
        graphSynergies
      };
    });

    // 3. Retrieve matching Expert Deck Corpus Blueprint
    const corpusBlueprint = expertDeckCorpus.findMatchingCorpus({
      format: intentLock.format,
      archetype: intentLock.archetype,
      tribe: intentLock.tribe
    });

    return {
      candidates: enrichedCandidates,
      corpusBlueprint,
      retrievedAt: new Date().toISOString()
    };
  }
}
