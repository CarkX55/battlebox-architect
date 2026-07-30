/**
 * SimulationPass.js - Pass 4
 * Reads: Deck, ObjectiveComposition
 * Writes: SimulationResult
 * Contract: CompilerState -> SimulationPass -> CompilerState'
 */

import { PolicyDrivenSimulator } from '../simulation/PolicyDrivenSimulator.js';
import { ObjectiveComposition } from '../solver/ObjectiveComposition.js';

export class SimulationPass {
  static READS = Object.freeze(['deck', 'goal']);
  static WRITES = Object.freeze(['simulationResult']);

  static execute(state) {
    const objComp = ObjectiveComposition.createFromGoal(state.goal?.speed || 'StandardWin');
    const simulationResult = PolicyDrivenSimulator.simulateGame({
      deck: state.deck,
      objectiveComposition: objComp,
      seed: 424242 + state.iteration,
      runs: 500
    });

    return state.transition({ simulationResult });
  }
}
