/**
 * src/judge/passes/PassRegistry.js
 * Registry and Dependency Injection Factory for Compiler Passes.
 */

import { ManaAnalysisPass } from './analysis/ManaAnalysisPass.js';
import { EngineAnalysisPass } from './analysis/EngineAnalysisPass.js';
import { InteractionAnalysisPass } from './analysis/InteractionAnalysisPass.js';
import { DeadCardAnalysisPass } from './analysis/DeadCardAnalysisPass.js';

export class PassRegistry {
  constructor() {
    this.passes = new Map();

    // Register standard analysis passes
    this.registerPass('ManaAnalysisPass', ManaAnalysisPass);
    this.registerPass('EngineAnalysisPass', EngineAnalysisPass);
    this.registerPass('InteractionAnalysisPass', InteractionAnalysisPass);
    this.registerPass('DeadCardAnalysisPass', DeadCardAnalysisPass);
  }

  registerPass(passName, passClass) {
    this.passes.set(passName, passClass);
  }

  createPassInstance(passName) {
    const PassClass = this.passes.get(passName);
    if (!PassClass) {
      throw new Error(`Pass "${passName}" is not registered in PassRegistry.`);
    }
    return new PassClass();
  }
}
