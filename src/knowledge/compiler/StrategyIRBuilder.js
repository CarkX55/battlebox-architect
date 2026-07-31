/**
 * StrategyIRBuilder.js
 * Formal Typed Strategy IR Builder (LLVM-like Intermediate Representation).
 * Constructs typed nodes: GoalNode, EngineNode, PackageNode, ConstraintNode, CapabilityNode, CardBindingNode.
 */

export class IRNode {
  constructor({ id, kind, inputs = [], outputs = [], cost = 0, confidence = 1.0, dependencies = [], metadata = {} }) {
    this.id = id;
    this.kind = kind; // GoalNode | EngineNode | PackageNode | ConstraintNode | CapabilityNode | CardBindingNode
    this.inputs = Object.freeze([...inputs]);
    this.outputs = Object.freeze([...outputs]);
    this.cost = cost;
    this.confidence = confidence;
    this.dependencies = Object.freeze([...dependencies]);
    this.metadata = Object.freeze({ ...metadata });
    Object.freeze(this);
  }
}

export class StrategyIR {
  constructor(plan, nodes = []) {
    this.plan = plan;
    this.nodes = Object.freeze([...nodes]);
    Object.freeze(this);
  }

  getNode(id) {
    return this.nodes.find(n => n.id === id) || null;
  }

  getNodesByKind(kind) {
    return this.nodes.filter(n => n.kind === kind);
  }
}

export class StrategyIRBuilder {
  static buildFromPlan(plan) {
    const nodes = [];

    // 1. Goal Node
    nodes.push(new IRNode({
      id: `goal_${plan.intent.toLowerCase()}`,
      kind: 'GoalNode',
      outputs: Object.keys(plan.targets),
      confidence: 1.0
    }));

    // 2. Engine Nodes
    nodes.push(new IRNode({
      id: 'eng_mana_acceleration',
      kind: 'EngineNode',
      inputs: [`goal_${plan.intent.toLowerCase()}`],
      outputs: ['cap.mana.acceleration'],
      dependencies: [`goal_${plan.intent.toLowerCase()}`],
      confidence: 0.95
    }));

    // 3. Package Nodes
    nodes.push(new IRNode({
      id: 'pkg_elf_ramp',
      kind: 'PackageNode',
      inputs: ['eng_mana_acceleration'],
      outputs: ['cap.mana.acceleration'],
      cost: 1.0,
      confidence: 0.98
    }));

    // 4. Constraint Nodes
    nodes.push(new IRNode({
      id: 'cnstr_tapland_cap',
      kind: 'ConstraintNode',
      metadata: { maxTaplands: plan.constraints.maxTaplands }
    }));

    return new StrategyIR(plan, nodes);
  }
}
