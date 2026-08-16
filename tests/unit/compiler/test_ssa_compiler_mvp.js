/**
 * MASTER SSA STRATEGIC COMPILER MVP PROTOTYPE TEST SUITE (v14.0-SSA)
 * 
 * Verifies end-to-end multi-pass compilation, SSA instruction emitting, IRTypeSystem validation,
 * proof certificates, and the 4 MVP Target Benchmarks (Aggro, Control, Combo, Ramp).
 */

import assert from 'node:assert';
import { EnterpriseMetamodel, METAMODEL_NODE_TYPES } from '../../../src/services/compiler/core/metamodel.js';
import { StrategyIRSSA, IR_TYPES, STRATEGIC_OPCODES } from '../../../src/services/compiler/core/strategyIRSSA.js';
import { CompilerPassPipeline } from '../../../src/services/compiler/core/compilerPassPipeline.js';
import { ProofCertificateFactory } from '../../../src/services/compiler/core/proofCertificates.js';
import { OntologyAndValidationPass } from '../../../src/services/compiler/passes/ontologyAndValidationPass.js';
import { NormalizationAndFoldingPass } from '../../../src/services/compiler/passes/normalizationAndFoldingPass.js';
import { ConstraintAndCostPropagationPass } from '../../../src/services/compiler/passes/constraintAndCostPropagationPass.js';
import { RiskAnalysisAndOptimizationPass } from '../../../src/services/compiler/passes/riskAnalysisAndOptimizationPass.js';

console.log('🧪 Running BattleBox v14.0 SSA Strategic Compiler MVP Test Suite...\n');

// ==========================================
// TEST 1: Enterprise Metamodel Validation
// ==========================================
console.log('--- TEST 1: Enterprise Metamodel Validation ---');
EnterpriseMetamodel.validateNode({ type: METAMODEL_NODE_TYPES.CAPABILITY });
EnterpriseMetamodel.validateEdge(
  { type: METAMODEL_NODE_TYPES.CONCEPT },
  'enables',
  { type: METAMODEL_NODE_TYPES.METRIC }
);
const requiresSemantics = EnterpriseMetamodel.getRelationSemantics('requires');
assert.strictEqual(requiresSemantics.weight, 1.0);
assert.strictEqual(requiresSemantics.transitivity, true);
console.log('✅ TEST 1 PASSED: Enterprise Metamodel validation successful.\n');

// ==========================================
// TEST 2: StrategyIR SSA Form & Invariants
// ==========================================
console.log('--- TEST 2: StrategyIR SSA Form & Invariants ---');
let ir = new StrategyIRSSA();
ir = ir.emitInstruction(
  STRATEGIC_OPCODES.ACQUIRE_CAPABILITY,
  IR_TYPES.CAPABILITY_TYPE,
  [],
  { capabilityId: 'CAP-001', nodeType: METAMODEL_NODE_TYPES.CAPABILITY }
);
ir = ir.emitInstruction(
  STRATEGIC_OPCODES.TRANSFORM_RESOURCE,
  IR_TYPES.METRIC_TYPE,
  [ir.instructions[0].resultVar],
  { metricName: 'Tempo', nodeType: METAMODEL_NODE_TYPES.METRIC }
);
ir = ir.emitPhiNode(IR_TYPES.METRIC_TYPE, 'ssa_val_1', 'ssa_val_2');

assert.strictEqual(ir.instructions.length, 3);
assert.doesNotThrow(() => ir.verifySSASingleAssignment());
assert.doesNotThrow(() => ir.verifyZeroCardsInvariant());
assert.doesNotThrow(() => ir.verifyAcyclic());
console.log('✅ TEST 2 PASSED: StrategyIR SSA Form & Invariants verified.\n');

// ==========================================
// TEST 3: Machine-Verifiable Proof Certificates
// ==========================================
console.log('--- TEST 3: Machine-Verifiable Proof Certificates ---');
const invCert = ProofCertificateFactory.createInvariantCertificate('TestPass', { zeroCardsPreserved: true, dagAcyclic: true });
const optCert = ProofCertificateFactory.createOptimizationCertificate('TestPass', { initialCost: 10, optimizedCost: 6 });
const planCert = ProofCertificateFactory.createPlannerCertificate('TestPass', { variablesSatisfied: 1.0 });

assert.doesNotThrow(() => ProofCertificateFactory.verifyCertificateChain([invCert, optCert, planCert]));
console.log('✅ TEST 3 PASSED: Proof certificates emitted and verified.\n');

// ==========================================
// TEST 4: MVP Target 1 — Naya Giants Aggro (Standard)
// ==========================================
console.log('--- TEST 4: MVP Target 1 — Naya Giants Aggro (Standard) ---');
const pipelineAggro = new CompilerPassPipeline();
pipelineAggro.registerPass(OntologyAndValidationPass);
pipelineAggro.registerPass(NormalizationAndFoldingPass);
pipelineAggro.registerPass(ConstraintAndCostPropagationPass);
pipelineAggro.registerPass(RiskAnalysisAndOptimizationPass);

let aggroIR = new StrategyIRSSA();
aggroIR = aggroIR.emitInstruction(STRATEGIC_OPCODES.ACQUIRE_CAPABILITY, IR_TYPES.CAPABILITY_TYPE, [], { capabilityId: 'CAP-001', nodeType: METAMODEL_NODE_TYPES.CAPABILITY });
aggroIR = aggroIR.emitInstruction(STRATEGIC_OPCODES.ACQUIRE_CAPABILITY, IR_TYPES.CAPABILITY_TYPE, [], { capabilityId: 'CAP-003', nodeType: METAMODEL_NODE_TYPES.CAPABILITY });

(async () => {
  const resultAggro = await pipelineAggro.executePipeline(aggroIR, { archetype: 'NayaGiantsAggro', format: 'Standard' });
  assert.strictEqual(resultAggro.executionLogs.length, 4);
  assert.strictEqual(resultAggro.certificates.length, 1);
  console.log('✅ TEST 4 PASSED: Naya Giants Aggro compiled successfully end-to-end.\n');

  // ==========================================
  // TEST 5: MVP Target 2 — Azorius Control (Pioneer)
  // ==========================================
  console.log('--- TEST 5: MVP Target 2 — Azorius Control (Pioneer) ---');
  let controlIR = new StrategyIRSSA();
  controlIR = controlIR.emitInstruction(STRATEGIC_OPCODES.ACQUIRE_CAPABILITY, IR_TYPES.CAPABILITY_TYPE, [], { capabilityId: 'CAP-002', nodeType: METAMODEL_NODE_TYPES.CAPABILITY });
  controlIR = controlIR.emitInstruction(STRATEGIC_OPCODES.ACQUIRE_CAPABILITY, IR_TYPES.CAPABILITY_TYPE, [], { capabilityId: 'CAP-005', nodeType: METAMODEL_NODE_TYPES.CAPABILITY });

  const resultControl = await pipelineAggro.executePipeline(controlIR, { archetype: 'AzoriusControl', format: 'Pioneer' });
  assert.strictEqual(resultControl.executionLogs.length, 4);
  console.log('✅ TEST 5 PASSED: Azorius Control compiled successfully end-to-end.\n');

  // ==========================================
  // TEST 6: MVP Target 3 — Yawgmoth Combo (Modern)
  // ==========================================
  console.log('--- TEST 6: MVP Target 3 — Yawgmoth Combo (Modern) ---');
  let comboIR = new StrategyIRSSA();
  comboIR = comboIR.emitInstruction(STRATEGIC_OPCODES.ACTIVATE_PATTERN, IR_TYPES.PATTERN_TYPE, [], { patternId: 'PAT-COMBO-01', nodeType: METAMODEL_NODE_TYPES.PATTERN });

  const resultCombo = await pipelineAggro.executePipeline(comboIR, { archetype: 'YawgmothCombo', format: 'Modern' });
  assert.strictEqual(resultCombo.executionLogs.length, 4);
  console.log('✅ TEST 6 PASSED: Yawgmoth Combo compiled successfully end-to-end.\n');

  // ==========================================
  // TEST 7: MVP Target 4 — Mono-Green Ramp (Modern)
  // ==========================================
  console.log('--- TEST 7: MVP Target 4 — Mono-Green Ramp (Modern) ---');
  let rampIR = new StrategyIRSSA();
  rampIR = rampIR.emitInstruction(STRATEGIC_OPCODES.TRANSFORM_RESOURCE, IR_TYPES.METRIC_TYPE, [], { metricName: 'BigManaRamp', nodeType: METAMODEL_NODE_TYPES.METRIC });

  const resultRamp = await pipelineAggro.executePipeline(rampIR, { archetype: 'MonoGreenRamp', format: 'Modern' });
  assert.strictEqual(resultRamp.executionLogs.length, 4);
  console.log('✅ TEST 7 PASSED: Mono-Green Ramp compiled successfully end-to-end.\n');

  console.log('🎉 ALL 7 MVP STRATEGIC COMPILER SUITE TESTS PASSED WITH 100% SUCCESS!');
})();
