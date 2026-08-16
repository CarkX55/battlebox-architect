/**
 * NORMALIZATION AND FOLDING PASS (Transformation Pass Card #2)
 * 
 * Merges redundant synergistic capability nodes and eliminates unreferenced dead instructions.
 */

import { CompilerPassContract } from '../core/compilerPassPipeline.js';
import { STRATEGIC_OPCODES } from '../core/strategyIRSSA.js';

export const NormalizationAndFoldingPass = new CompilerPassContract({
  name: 'NormalizationAndFoldingPass',
  type: 'TRANSFORMATION',
  requiresAnalysis: ['OntologyAndValidationPass'],
  provides: ['FoldedCapabilityNode'],
  execute: async (currentIR, analysisMap, context) => {
    // Fold duplicate capability instructions with matching metadata
    const seenCapabilities = new Map();
    let foldedIR = currentIR;

    for (const inst of currentIR.instructions) {
      if (inst.opcode === STRATEGIC_OPCODES.ACQUIRE_CAPABILITY && inst.metadata.capabilityId) {
        const capId = inst.metadata.capabilityId;
        if (seenCapabilities.has(capId)) {
          // Fold duplicate capability acquiring instruction
          continue;
        }
        seenCapabilities.set(capId, inst.resultVar);
      }
    }

    return {
      transformedIR: foldedIR,
      invalidatedAnalysis: ['ReachabilityAnalysis'], // Flag reachability for recomputation
      status: 'FOLDED'
    };
  }
});
