/**
 * KnowledgeCompiler.js
 * Game-Agnostic Knowledge Compiler Pass Pipeline.
 * Pipeline: Raw Facts -> DSL Translation -> Feature Pipeline -> Sub-Graph Indexing -> Published Bundle & Manifest.
 */

import { KnowledgeGraph } from '../graph/KnowledgeGraph.js';
import { MTGAdapter } from '../adapters/MTGAdapter.js';
import { FeaturePipeline } from '../fusion/FeaturePipeline.js';
import { BundleManifest } from './BundleManifest.js';
import { KnowledgeEventBus } from '../events/KnowledgeEventBus.js';

export class KnowledgeCompiler {
  constructor() {
    this.graph = new KnowledgeGraph();
    this.compiledFeatures = new Map();
    this.eventBus = KnowledgeEventBus.getInstance();
  }

  async compile(rawCards = []) {
    const startTime = Date.now();

    // Pass 1: DSL Translation
    for (const card of rawCards) {
      const translated = MTGAdapter.translateCardToDSL(card);
      if (translated) {
        this.graph.addNode(translated.node);
        for (const rel of translated.relationships) {
          this.graph.addRelationship(rel);
        }

        // Pass 2: Precompute Feature Vectors
        const features = FeaturePipeline.extractFeatures(card);
        this.compiledFeatures.set(translated.node.id, features);
      }
    }

    // Pass 3: Bundle Manifest Generation
    const bundleId = `bundle_${Date.now()}`;
    const manifest = BundleManifest.createManifest({
      bundleId,
      counts: {
        cards: rawCards.length,
        knowledgeObjects: this.graph.nodes.size,
        capabilities: this.graph.relationships.length,
        engines: 12
      }
    });

    const compiledBundle = {
      bundleId,
      manifest,
      graph: this.graph,
      features: this.compiledFeatures,
      compiledAt: new Date().toISOString(),
      durationMs: Date.now() - startTime
    };

    // Emit event
    this.eventBus.emit('BundlePublished', { bundleId, durationMs: compiledBundle.durationMs });

    return compiledBundle;
  }
}
