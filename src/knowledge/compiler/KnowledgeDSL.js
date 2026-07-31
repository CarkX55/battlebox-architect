/**
 * KnowledgeDSL.js
 * Game-Agnostic Knowledge Domain Specific Language Primitives.
 * The compiler operates strictly on DSL primitives (Capability, Node, Relationship, Evidence, Rule, Feature).
 */

export class DSLNode {
  constructor({ id, kind, name, attributes = {} }) {
    this.id = id;
    this.kind = kind; // 'Capability' | 'Engine' | 'Concept' | 'Strategy' | 'Card'
    this.name = name;
    this.attributes = Object.freeze({ ...attributes });
    Object.freeze(this);
  }
}

export class DSLRelationship {
  constructor({ sourceId, targetId, type, weight = 1.0, metadata = {} }) {
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.type = type; // SATISFIES, REQUIRES, COUNTERS, ENABLES, REPLACES, CAUSES, SUPPORTS
    this.weight = weight;
    this.metadata = Object.freeze({ ...metadata });
    Object.freeze(this);
  }
}

export class DSLEvidence {
  constructor({ source, confidence, assertion, weight = 1.0 }) {
    this.source = source;
    this.confidence = confidence;
    this.assertion = assertion;
    this.weight = weight;
    Object.freeze(this);
  }
}

export class DSLRule {
  constructor({ id, version = 1, condition, action, parameters = {} }) {
    this.id = id;
    this.version = version;
    this.condition = condition;
    this.action = action;
    this.parameters = Object.freeze({ ...parameters });
    Object.freeze(this);
  }
}

export class KnowledgeDSL {
  static createCapabilityNode(id, name, attrs = {}) {
    return new DSLNode({ id, kind: 'Capability', name, attributes: attrs });
  }

  static createEngineNode(id, name, attrs = {}) {
    return new DSLNode({ id, kind: 'Engine', name, attributes: attrs });
  }

  static createRelationship(sourceId, targetId, type, weight = 1.0, metadata = {}) {
    return new DSLRelationship({ sourceId, targetId, type, weight, metadata });
  }
}
