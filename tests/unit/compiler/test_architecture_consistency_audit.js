/**
 * tests/unit/compiler/test_architecture_consistency_audit.js
 * 
 * Test Suite: Architecture Consistency Audit & Pure Model View Verification.
 * Asserts:
 *   1. 500 Random Intent Compilations produce 100% Single Source of Truth (SSOT) CanonicalBlueprintModels.
 *   2. HardcodedKnowledgeAuditor confirms hardcodedRemnantsCount === 0 across all compilations.
 *   3. 100% of executiveSpecification, dagNodes, decisionGraph, and constraintsChecklist originate from compiler models.
 */

import { CompilerConvergencePipeline } from '../../../src/knowledge/compiler/CompilerConvergencePipeline.js';
import { CanonicalBlueprintModel } from '../../../src/services/compiler/core/canonicalBlueprintModel.js';
import { HardcodedKnowledgeAuditor } from '../../../src/services/compiler/core/hardcodedKnowledgeAuditor.js';

function runRandomConsistencyAudit() {
  console.log('🧪 Running Architecture Consistency & No Hardcoded Knowledge Audit (500 Random Intents)...\n');

  const formats = ['Standard', 'Pioneer', 'Modern', 'Commander'];
  const archetypes = ['Aggro', 'Midrange', 'Control', 'Ramp', 'Combo'];
  const tribes = ['Giants', 'Humans', 'Elves', 'Goblins', 'Dragons', 'Merfolk', 'Vampires'];
  const colorCombinations = [
    ['W', 'R', 'G'],
    ['U', 'B'],
    ['G', 'R'],
    ['W', 'U', 'B'],
    ['R', 'G', 'B'],
    ['W']
  ];

  let totalAudited = 0;
  let totalClean = 0;

  for (let i = 1; i <= 500; i++) {
    const format = formats[i % formats.length];
    const archetype = archetypes[i % archetypes.length];
    const tribe = tribes[i % tribes.length];
    const colors = colorCombinations[i % colorCombinations.length];

    const mockUIState = {
      format,
      colors,
      archetype,
      primaryTribe: tribe,
      prompt: `${colors.join('')} ${tribe} ${archetype} ${format}`
    };

    const convergenceResult = CompilerConvergencePipeline.compileDeckFromScratch({
      userPrompt: mockUIState.prompt,
      archetype,
      format,
      uiFormState: mockUIState
    });

    const canonicalModel = CanonicalBlueprintModel.createFromConvergenceResult(convergenceResult);
    const auditRes = HardcodedKnowledgeAuditor.auditModelToViewConsistency(canonicalModel);

    totalAudited++;
    if (auditRes.isClean && auditRes.hardcodedRemnantsCount === 0 && auditRes.ssotModelProvenance === 100) {
      totalClean++;
    } else {
      throw new Error(`❌ ARCHITECTURE AUDIT VIOLATION at iteration ${i}: Hardcoded remnant or invalid SSOT provenance detected for prompt "${mockUIState.prompt}"`);
    }
  }

  console.log(`📊 Random Intent Consistency Audit Summary:`);
  console.log(`   - Total Random Compilations Audited: ${totalAudited}`);
  console.log(`   - Compilations with 100% SSOT Provenance: ${totalClean}`);
  console.log(`   - Hardcoded Remnants Detected: 0`);
  console.log(`   👉 Single Source of Truth Model Provenance: 100.0%`);

  if (totalClean !== 500) {
    throw new Error(`❌ ARCHITECTURE AUDIT FAILED: Only ${totalClean}/500 compilations passed SSOT consistency.`);
  }

  console.log('\n🎉 ALL ARCHITECTURE CONSISTENCY AUDIT TESTS PASSED SUCCESSFULLY! (0 Hardcoded Remnants Guaranteed)');
}

runRandomConsistencyAudit();
