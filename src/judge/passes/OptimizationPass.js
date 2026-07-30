/**
 * OptimizationPass.js - Pass 2
 * Reads: CapabilityRequirements, ObjectiveComposition
 * Writes: ExecutionContracts
 * Contract: CompilerState -> OptimizationPass -> CompilerState'
 */

import { ConstraintOptimizationEngine } from '../solver/ConstraintOptimizationEngine.js';
import { ObjectiveComposition } from '../solver/ObjectiveComposition.js';
import { ConvergencePolicy } from '../solver/ConvergencePolicy.js';

export class OptimizationPass {
  static READS = Object.freeze(['capabilityRequirements', 'goal']);
  static WRITES = Object.freeze(['executionContracts']);

  static execute(state) {
    const objComp = ObjectiveComposition.createFromGoal(state.goal?.speed || 'StandardWin');
    const convPolicy = new ConvergencePolicy({ maxIterations: 5 });
    const copEngine = new ConstraintOptimizationEngine({ objectiveComposition: objComp, convergencePolicy: convPolicy });

    const executionContracts = copEngine.solveCapabilityQuotas(state.capabilityRequirements);
    return state.transition({ executionContracts });
  }
}
