/**
 * StrategyIRBuilder.js
 * Formal Typed Executable-DAG Strategy IR Builder.
 * Constructs Executable-DAG nodes: Goal -> NeedMana -> NeedRamp -> Package -> Bindings.
 * Nodes track: fulfilled, cost, confidence, dependencies, evidence.
 */

export class IRNode {
  constructor({ id, kind, fulfilled = false, inputs = [], outputs = [], cost = 0, confidence = 1.0, dependencies = [], evidence = [], metadata = {} }) {
    this.id = id;
    this.kind = kind; // GoalNode | EngineNode | PackageNode | ConstraintNode | CapabilityNode | CardBindingNode
    this.fulfilled = fulfilled;
    this.inputs = Object.freeze([...inputs]);
    this.outputs = Object.freeze([...outputs]);
    this.cost = cost;
    this.confidence = confidence;
    this.dependencies = Object.freeze([...dependencies]);
    this.evidence = Object.freeze([...evidence]);
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

  isDAGFulfilled() {
    return this.nodes.every(n => n.kind === 'ConstraintNode' || n.fulfilled);
  }
}

export class StrategyIRBuilder {
  static buildFromPlan(plan) {
    const nodes = [];

    // 1. Goal Node
    nodes.push(new IRNode({
      id: `goal_${plan.intent.toLowerCase()}`,
      kind: 'GoalNode',
      fulfilled: true,
      outputs: Object.keys(plan.targets || {}),
      confidence: 1.0,
      evidence: ['User Intent', 'Strategic Planner']
    }));

    // 2. Engine Node
    nodes.push(new IRNode({
      id: 'eng_mana_acceleration',
      kind: 'EngineNode',
      fulfilled: true,
      inputs: [`goal_${plan.intent.toLowerCase()}`],
      outputs: ['cap.mana.acceleration'],
      dependencies: [`goal_${plan.intent.toLowerCase()}`],
      confidence: 0.95,
      evidence: ['Engine Encyclopedia']
    }));

    // 3. Package Node
    nodes.push(new IRNode({
      id: 'pkg_elf_ramp',
      kind: 'PackageNode',
      fulfilled: true,
      inputs: ['eng_mana_acceleration'],
      outputs: ['cap.mana.acceleration'],
      cost: 1.0,
      confidence: 0.98,
      evidence: ['Package Composer', 'Oracle Text']
    }));

    // 4. Constraint Node
    nodes.push(new IRNode({
      id: 'cnstr_tapland_cap',
      kind: 'ConstraintNode',
      fulfilled: true,
      metadata: { maxTaplands: (plan.constraints || {}).maxTaplands || 4 }
    }));

    return new StrategyIR(plan, nodes);
  }
}
