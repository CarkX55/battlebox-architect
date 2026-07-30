/**
 * KnowledgeObject.js - Version 1
 * Base Schema for all Knowledge Objects in BattleBox Architect v8.0 SKE.
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
    created = Date.now(),
    lastValidated = Date.now(),
    deprecated = false
  } = {}) {
    this.id = id || `kn_${type}_${Date.now()}`;
    this.type = type;
    this.version = KnowledgeObject.VERSION;
    this.revision = revision;
    this.confidence = confidence;
    this.evidence = Object.freeze([...evidence]);
    this.sources = Object.freeze([...sources]);
    this.relationships = Object.freeze([...relationships]);
    this.created = created;
    this.lastValidated = lastValidated;
    this.deprecated = deprecated;

    Object.freeze(this);
  }
}
