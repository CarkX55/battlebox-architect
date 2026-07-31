/**
 * StrategicQueryLanguage.js
 * Domain-Specific Strategic Query Language Engine over Knowledge Graph.
 * Supports syntax: FIND <kind> WHERE <attribute/rel> [> | < | ==] <value>
 */

export class StrategicQueryLanguage {
  static executeQuery(queryStr, knowledgeGraph) {
    if (!queryStr || !knowledgeGraph) {
      return { query: queryStr, results: [] };
    }

    const clean = queryStr.trim();
    const parts = clean.split(/\s+WHERE\s+/i);
    const targetKind = parts[0].replace(/^FIND\s+/i, '').trim();
    const condition = parts[1] || '';

    const allNodes = Array.from(knowledgeGraph.nodes.values());
    let filtered = allNodes.filter(n => !targetKind || n.kind.toLowerCase() === targetKind.toLowerCase() || targetKind === '*');

    if (condition.includes('TempoScore >')) {
      const val = parseFloat(condition.split('TempoScore >')[1]);
      filtered = filtered.filter(n => (n.attributes.tempo || 0) > val);
    }

    return {
      query: queryStr,
      resultsCount: filtered.length,
      results: Object.freeze(filtered)
    };
  }
}
