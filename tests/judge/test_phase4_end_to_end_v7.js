/**
 * test_phase4_end_to_end_v7.js
 * End-to-End Integration Unit Tests for BattleBox Architect v7.0 Compiler Pipeline.
 */

import { CapabilityDerivationEngine } from '../../src/judge/ir/CapabilityDerivationEngine.js';
import { CapabilityIndex } from '../../src/judge/index/CapabilityIndex.js';
import { ArtifactRegistry } from '../../src/judge/registry/ArtifactRegistry.js';
import { TelemetryLogger } from '../../src/judge/telemetry/TelemetryLogger.js';
import { CapabilityPlan } from '../../src/judge/compiler/CapabilityPlan.js';
import { SolverOptimizer } from '../../src/judge/compiler/SolverOptimizer.js';
import { EmergentRequirementGraph } from '../../src/judge/graph/EmergentRequirementGraph.js';
import { CapabilityFlowGraph } from '../../src/judge/graph/CapabilityFlowGraph.js';
import { ReplacementEngine } from '../../src/judge/candidates/ReplacementEngine.js';
import { SupremeJudgeService } from '../../src/services/supremeJudgeService.js';

function runTests() {
  console.log('🧪 Starting Phase 4 End-to-End v7 Integration Tests...');

  // 1. Instantiation & Registry
  const registry = new ArtifactRegistry();
  const index = new CapabilityIndex();
  const telemetry = new TelemetryLogger();

  // 2. Frontend Derivation
  const llanowarRaw = { id: 'llanowar_001', name: 'Llanowar Elves', cmc: 1, type_line: 'Creature — Elf Druid', oracle_text: '{T}: Add {G}.' };
  const birdsRaw = { id: 'birds_001', name: 'Birds of Paradise', cmc: 1, type_line: 'Creature — Bird', oracle_text: '{T}: Add one mana of any color.' };
  const wrathRaw = { id: 'wrath_001', name: 'Wrath of God', cmc: 4, type_line: 'Sorcery', oracle_text: 'Destroy all creatures.' };

  const cards = [llanowarRaw, birdsRaw, wrathRaw];
  const derivedList = cards.map(c => {
    const derived = CapabilityDerivationEngine.deriveProfile(c);
    index.register(derived.profile.cardId, derived.vector);
    registry.publish('CardSemanticProfile', derived.profile, { producer: 'DerivationEngine' });
    registry.publish('CapabilityVector', derived.vector, { producer: 'DerivationEngine' });
    return derived;
  });

  console.assert(derivedList.length === 3, 'Derived list count must be 3');
  console.log('✅ Step 1 Passed: Frontend derived profiles and registered in index & artifact registry.');

  // 3. Emergent Requirement Graph & Flow Graph
  const reqGraph = EmergentRequirementGraph.buildGraph();
  console.assert(reqGraph.nodes.size === 8, 'RequirementGraph must contain 8 nodes');
  console.assert(reqGraph.edges.length > 0, 'RequirementGraph must contain emergent edges');

  const flowGraph = CapabilityFlowGraph.createFromRequirementGraph('Ramp', reqGraph);
  console.assert(flowGraph.edges[0].type === 'FEEDS', 'FlowGraph edges must have typed relation FEEDS');
  console.log('✅ Step 2 Passed: EmergentRequirementGraph & CapabilityFlowGraph created with typed edges.');

  // 4. Strategic Planning & Solver Optimization
  const initialPlan = new CapabilityPlan({
    archetype: 'Ramp',
    targets: { ManaAcceleration: 8, BoardReset: 2 },
    targetCurve: { 1: 4, 2: 12, 3: 8, 4: 6 }
  });
  registry.publish('CapabilityPlan', initialPlan, { producer: 'Planner' });

  const optimizer = new SolverOptimizer(telemetry);
  const { optimizedPlan, contracts } = optimizer.optimizeAndCompile(initialPlan);
  registry.publish('ExecutionContracts', contracts, { producer: 'Compiler' });

  console.assert(contracts.length === 2, 'Compiled contracts count must be 2');
  console.log('✅ Step 3 Passed: Plan optimized and ExecutionContracts compiled & registered.');

  // 5. Candidate Ranking & Replacement Engine
  const manaContract = contracts.find(c => c.capability === 'ManaAcceleration');
  const candidatePool = derivedList.map(d => ({
    cardId: d.profile.cardId,
    profile: d.profile,
    vector: d.vector,
    contextScore: d.profile.cardName === 'Birds of Paradise' ? 85 : 80
  }));

  const ranked = ReplacementEngine.rankCandidates(candidatePool, manaContract);
  console.assert(ranked[0].cardName === 'Birds of Paradise', 'Birds of Paradise should rank higher');
  console.log('✅ Step 4 Passed: ReplacementEngine ranked candidates correctly.');

  // 6. Supreme Judge Audit & DecisionProof Evidence Tree
  const coverageReport = { satisfiedCount: 2, totalCount: 2 };
  const decisionProof = SupremeJudgeService.auditDeck({
    archetype: 'Ramp',
    assembledCards: [llanowarRaw, birdsRaw],
    coverageReport,
    artifactRegistry: registry
  });

  console.assert(decisionProof.version === 1, 'DecisionProof version must be 1');
  console.assert(decisionProof.verdict === 'PASS', 'DecisionProof verdict must be PASS');
  console.assert(decisionProof.evidenceTree.length === 3, 'Evidence tree must evaluate 3 invariants');
  console.log('✅ Step 5 Passed: SupremeJudgeService audited invariants and published DecisionProof v1 Evidence Tree.');

  console.log('🎉 Phase 4 End-to-End v7 Integration Tests Completed Successfully!');
}

runTests();
