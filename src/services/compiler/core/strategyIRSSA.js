/**
 * STRATEGY IR SSA FORM ENGINE (StrategyIR/v2.0-SSA)
 * 
 * Strict Static Single Assignment (SSA) form representation for strategic reasoning.
 * Immutable values assigned exactly once with static typing and Phi (Φ) nodes.
 */

export const IR_TYPES = Object.freeze({
  CAPABILITY_TYPE: 'CapabilityType',
  METRIC_TYPE: 'MetricType',
  PROBABILITY_TYPE: 'ProbabilityType',
  CONSTRAINT_TYPE: 'ConstraintType',
  PATTERN_TYPE: 'PatternType'
});

export const STRATEGIC_OPCODES = Object.freeze({
  ACQUIRE_CAPABILITY: 'AcquireCapability',
  CONSUME_CAPABILITY: 'ConsumeCapability',
  TRANSFORM_RESOURCE: 'TransformResource',
  ACTIVATE_PATTERN: 'ActivatePattern',
  RESOLVE_CONSTRAINT: 'ResolveConstraint',
  BRANCH_DECISION: 'BranchDecision',
  MERGE_DECISION: 'MergeDecision', // Phi Node (Φ)
  FORK_PLAN: 'ForkPlan'
});

export class IRTypeSystem {
  static validateAssignment(valueType, targetVar) {
    if (!Object.values(IR_TYPES).includes(valueType)) {
      throw new Error(`IRTypeError: Unknown IR type "${valueType}" for variable ${targetVar}`);
    }
    return true;
  }

  static assertOpTypes(opcode, inputs, outputType) {
    if (!Object.values(STRATEGIC_OPCODES).includes(opcode)) {
      throw new Error(`IRTypeError: Unknown opcode "${opcode}"`);
    }
    return true;
  }
}

export class SSAInstruction {
  constructor({ opcode, resultVar, resultType, operands = [], metadata = {} }) {
    this.opcode = opcode;
    this.resultVar = resultVar;
    this.resultType = resultType;
    this.operands = operands;
    this.metadata = metadata;
    this.timestamp = Date.now();
    
    IRTypeSystem.validateAssignment(resultType, resultVar);
    IRTypeSystem.assertOpTypes(opcode, operands, resultType);
    Object.freeze(this);
  }
}

export class StrategyIRSSA {
  constructor({ version = 'StrategyIR/v2.0-SSA', instructions = [], metadata = {} } = {}) {
    this.version = version;
    this.instructions = Object.freeze([...instructions]);
    this.metadata = Object.freeze({ ...metadata });
    this.varCounter = instructions.length;
    this.assignedVars = new Set(instructions.map(i => i.resultVar));
    
    this.verifySSASingleAssignment();
  }

  emitInstruction(opcode, resultType, operands = [], metadata = {}) {
    this.varCounter += 1;
    const resultVar = `ssa_val_${this.varCounter}`;
    if (this.assignedVars.has(resultVar)) {
      throw new Error(`SSAError: Single Assignment Violation for variable ${resultVar}`);
    }

    const inst = new SSAInstruction({
      opcode,
      resultVar,
      resultType,
      operands,
      metadata
    });

    const newInstructions = [...this.instructions, inst];
    return new StrategyIRSSA({
      version: this.version,
      instructions: newInstructions,
      metadata: this.metadata
    });
  }

  emitPhiNode(resultType, trueVar, falseVar, metadata = {}) {
    return this.emitInstruction(
      STRATEGIC_OPCODES.MERGE_DECISION,
      resultType,
      [trueVar, falseVar],
      { ...metadata, isPhiNode: true }
    );
  }

  verifySSASingleAssignment() {
    const seen = new Set();
    for (const inst of this.instructions) {
      if (seen.has(inst.resultVar)) {
        throw new Error(`SSAInvarianceError: Variable ${inst.resultVar} assigned multiple times`);
      }
      seen.add(inst.resultVar);
    }
    return true;
  }

  verifyZeroCardsInvariant() {
    for (const inst of this.instructions) {
      const serialized = JSON.stringify(inst);
      // Check for illegal leaks of raw card names or oracle text in Core IR
      if (inst.metadata && inst.metadata.rawCardName) {
        throw new Error(`FrameworkInvariantViolation (INV-01): Card leak detected in StrategyIR: ${inst.metadata.rawCardName}`);
      }
    }
    return true;
  }

  verifyAcyclic() {
    // Topological DAG check on instructions
    const graph = new Map();
    for (const inst of this.instructions) {
      graph.set(inst.resultVar, inst.operands);
    }

    const visited = new Set();
    const recStack = new Set();

    const dfs = (varName) => {
      if (recStack.has(varName)) return false; // Cycle detected
      if (visited.has(varName)) return true;

      visited.add(varName);
      recStack.add(varName);

      const deps = graph.get(varName) || [];
      for (const dep of deps) {
        if (!dfs(dep)) return false;
      }

      recStack.delete(varName);
      return true;
    };

    for (const inst of this.instructions) {
      if (!dfs(inst.resultVar)) {
        throw new Error(`StrategyIRDAGViolation: Cycle detected in SSA instruction graph at ${inst.resultVar}`);
      }
    }
    return true;
  }
}
