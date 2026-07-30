/**
 * TransformationPass.js - Pass 6
 * Reads: MetaFeedback
 * Writes: CapabilityRequirements'
 * Contract: CompilerState -> TransformationPass -> CompilerState'
 */

import { ConstraintTransformer } from '../compiler/ConstraintTransformer.js';

export class TransformationPass {
  static READS = Object.freeze(['metaFeedback', 'capabilityRequirements']);
  static WRITES = Object.freeze(['capabilityRequirements']);

  static execute(state) {
    if (!state.metaFeedback || state.metaFeedback.length === 0) {
      return state;
    }

    const newReqs = ConstraintTransformer.transform(state.capabilityRequirements, null, state.metaFeedback);
    return state.transition({ capabilityRequirements: newReqs });
  }
}
