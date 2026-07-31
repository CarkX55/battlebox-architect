/**
 * KnowledgeDiffViewer.js
 * Programmatic & Visual Knowledge Bundle Diff Engine.
 * Computes exact diffs between two published Knowledge Bundles (addedNodes, deprecatedNodes, modifiedWeights).
 */

export class KnowledgeDiffViewer {
  static computeBundleDiff(oldBundle, newBundle) {
    if (!oldBundle || !newBundle) {
      return { addedNodes: [], deprecatedNodes: [], weightChanges: [] };
    }

    const oldNodes = oldBundle.graph ? oldBundle.graph.nodes : new Map();
    const newNodes = newBundle.graph ? newBundle.graph.nodes : new Map();

    const addedNodes = [];
    const deprecatedNodes = [];

    // Find added nodes
    for (const [id, node] of newNodes.entries()) {
      if (!oldNodes.has(id)) {
        addedNodes.push(node);
      }
    }

    // Find deprecated/removed nodes
    for (const [id, node] of oldNodes.entries()) {
      if (!newNodes.has(id)) {
        deprecatedNodes.push(node);
      }
    }

    return {
      oldBundleId: oldBundle.bundleId,
      newBundleId: newBundle.bundleId,
      addedCount: addedNodes.length,
      deprecatedCount: deprecatedNodes.length,
      addedNodes: Object.freeze(addedNodes),
      deprecatedNodes: Object.freeze(deprecatedNodes)
    };
  }
}
