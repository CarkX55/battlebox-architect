/**
 * ONTOLOGY AND VALIDATION PASS (Analysis & Transformation Pass Card #1)
 * 
 * Parses relation semantics, validates ontology consistency, and asserts DAG acyclicity.
 */

import { CompilerPassContract } from '../core/compilerPassPipeline.js';
import { EnterpriseMetamodel } from '../core/metamodel.js';
import { IR_TYPES, STRATEGIC_OPCODES } from '../core/strategyIRSSA.js';

export const OntologyAndValidationPass = new CompilerPassContract({
  name: 'OntologyAndValidationPass',
  type: 'TRANSFORMATION',
  requiresAnalysis: [],
  provides: ['ValidatedStrategyIR'],
  execute: async (currentIR, analysisMap, context) => {
    currentIR.verifyAcyclic();
    currentIR.verifyZeroCardsInvariant();

    // Verify all emitted instructions align with the Enterprise Metamodel
    for (const inst of currentIR.instructions) {
      if (inst.metadata && inst.metadata.nodeType) {
        EnterpriseMetamodel.validateNode({ type: inst.metadata.nodeType });
      }
    }

    return {
      transformedIR: currentIR,
      invalidatedAnalysis: [],
      status: 'VALIDATED'
    };
  }
});
