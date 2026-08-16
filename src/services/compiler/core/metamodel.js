/**
 * BATTLEBOX ENTERPRISE METAMODEL (v14.0-SSA Single Source of Truth)
 * 
 * Executable metamodel defining all legal node types, structural constraints,
 * and legal directional relationships in the BattleBox Strategic Knowledge Engine.
 */

export const METAMODEL_NODE_TYPES = Object.freeze({
  CONCEPT: 'Concept',
  METRIC: 'Metric',
  CAPABILITY: 'Capability',
  TRANSITION: 'Transition',
  STRATEGY: 'Strategy',
  OBJECTIVE: 'Objective',
  GOAL: 'Goal',
  REQUIREMENT: 'Requirement',
  CONSTRAINT: 'Constraint',
  RISK: 'Risk',
  EVIDENCE: 'Evidence',
  RULE: 'Rule',
  DECISION: 'Decision',
  PATTERN: 'Pattern'
});

export const METAMODEL_EDGE_RELATIONS = Object.freeze({
  REQUIRES: 'requires',
  ENABLES: 'enables',
  CONFLICTS: 'conflicts',
  SUPPORTS: 'supports',
  REPLACES: 'replaces'
});

export const RELATION_SEMANTICS = Object.freeze({
  [METAMODEL_EDGE_RELATIONS.REQUIRES]: {
    weight: 1.0,
    symmetry: false,
    transitivity: true,
    inverse: 'requiredBy',
    priority: 1
  },
  [METAMODEL_EDGE_RELATIONS.ENABLES]: {
    weight: 0.85,
    symmetry: false,
    transitivity: true,
    inverse: 'enabledBy',
    priority: 2
  },
  [METAMODEL_EDGE_RELATIONS.CONFLICTS]: {
    weight: -1.0,
    symmetry: true,
    transitivity: false,
    inverse: 'conflictsWith',
    priority: 1
  },
  [METAMODEL_EDGE_RELATIONS.SUPPORTS]: {
    weight: 0.5,
    symmetry: false,
    transitivity: false,
    inverse: 'supportedBy',
    priority: 3
  },
  [METAMODEL_EDGE_RELATIONS.REPLACES]: {
    weight: 0.9,
    symmetry: true,
    transitivity: true,
    inverse: 'replacedBy',
    priority: 2
  }
});

export const LEGAL_EDGE_RULES = Object.freeze([
  { source: METAMODEL_NODE_TYPES.CONCEPT, relation: METAMODEL_EDGE_RELATIONS.ENABLES, target: METAMODEL_NODE_TYPES.METRIC },
  { source: METAMODEL_NODE_TYPES.METRIC, relation: METAMODEL_EDGE_RELATIONS.ENABLES, target: METAMODEL_NODE_TYPES.CAPABILITY },
  { source: METAMODEL_NODE_TYPES.CAPABILITY, relation: METAMODEL_EDGE_RELATIONS.ENABLES, target: METAMODEL_NODE_TYPES.TRANSITION },
  { source: METAMODEL_NODE_TYPES.CAPABILITY, relation: METAMODEL_EDGE_RELATIONS.REQUIRES, target: METAMODEL_NODE_TYPES.REQUIREMENT },
  { source: METAMODEL_NODE_TYPES.CAPABILITY, relation: METAMODEL_EDGE_RELATIONS.CONFLICTS, target: METAMODEL_NODE_TYPES.RISK },
  { source: METAMODEL_NODE_TYPES.TRANSITION, relation: METAMODEL_EDGE_RELATIONS.ENABLES, target: METAMODEL_NODE_TYPES.STRATEGY },
  { source: METAMODEL_NODE_TYPES.STRATEGY, relation: METAMODEL_EDGE_RELATIONS.REQUIRES, target: METAMODEL_NODE_TYPES.GOAL },
  { source: METAMODEL_NODE_TYPES.GOAL, relation: METAMODEL_EDGE_RELATIONS.SUPPORTS, target: METAMODEL_NODE_TYPES.OBJECTIVE },
  { source: METAMODEL_NODE_TYPES.CONSTRAINT, relation: METAMODEL_EDGE_RELATIONS.REQUIRES, target: METAMODEL_NODE_TYPES.OBJECTIVE }
]);

export class EnterpriseMetamodel {
  static validateNode(node) {
    if (!node || typeof node !== 'object') {
      throw new Error('MetamodelValidationError: Node must be an object');
    }
    if (!Object.values(METAMODEL_NODE_TYPES).includes(node.type)) {
      throw new Error(`MetamodelValidationError: Invalid node type "${node.type}"`);
    }
    return true;
  }

  static validateEdge(sourceNode, relation, targetNode) {
    this.validateNode(sourceNode);
    this.validateNode(targetNode);
    if (!Object.values(METAMODEL_EDGE_RELATIONS).includes(relation)) {
      throw new Error(`MetamodelValidationError: Invalid relation type "${relation}"`);
    }
    return true;
  }

  static getRelationSemantics(relation) {
    const semantics = RELATION_SEMANTICS[relation];
    if (!semantics) {
      throw new Error(`MetamodelError: No semantics defined for relation "${relation}"`);
    }
    return semantics;
  }
}
