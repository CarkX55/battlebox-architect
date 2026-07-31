/**
 * KnowledgeObject.js
 * Centralized Unified KnowledgeObject format for all SKE storage & provider operations.
 */

export class KnowledgeObject {
  static VERSION = 1;

  constructor({
    id,
    type = 'GenericKnowledge',
    revision = 1,
    confidence = 0.85,
    evidence = [],
    sources = [],
    relationships = [],
    data = {},
    created = Date.now(),
    lastValidated = Date.now(),
    deprecated = false
  } = {}) {
    this.id = id || `kn_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.type = type;
    this.version = KnowledgeObject.VERSION;
    this.revision = revision;
    this.confidence = confidence;
    this.evidence = Object.freeze([...evidence]);
    this.sources = Object.freeze([...sources]);
    this.relationships = Object.freeze([...relationships]);
    this.data = Object.freeze({ ...data });
    this.created = created;
    this.lastValidated = lastValidated;
    this.deprecated = deprecated;

    Object.freeze(this);
  }
}
