/**
 * tests/judge/test_core_pipeline.js
 * Verification unit test suite for BattleBox Architect v7 Core Pipeline.
 */

import { runSupremeJudgeAudit } from '../../src/judge/services/supremeJudgeService.js';

async function testCorePipelineExecution() {
  console.log('🧪 Running Core Pipeline Test...');

  const mockCards = [
    { name: 'Birds of Paradise', quantity: 4, type_line: 'Creature — Bird', mana_cost: '{G}', cmc: 1, oracle_text: 'Tap: Add one mana of any color.' },
    { name: 'Llanowar Elves', quantity: 4, type_line: 'Creature — Elf Druid', mana_cost: '{G}', cmc: 1, oracle_text: 'Tap: Add {G}.' },
    { name: 'Questing Beast', quantity: 3, type_line: 'Creature — Beast', mana_cost: '{2}{G}{G}', cmc: 4, oracle_text: 'Vigilance, deathtouch, haste.' },
    { name: 'Forest', quantity: 18, type_line: 'Basic Land — Forest', cmc: 0 }
  ];

  const mockFormData = {
    colores: ['G'],
    format: 'MODERN',
    archetype: 'aggro',
    strategy: 'Fast combat pressure'
  };

  const report = await runSupremeJudgeAudit(mockCards, mockFormData, mockCards);

  console.log('✅ Audit Fingerprint generated:', report.auditFingerprint.auditHash);
  console.log('✅ Health Score:', report.dimensions.overallHealth);
  console.log('✅ Is Format Legal:', report.isLegal);
  console.log('✅ Winning Plan Name:', report.winningPlan.name);
  console.log('✅ Transactional Blueprint Removes/Adds:', report.blueprint.removes.length, report.blueprint.adds.length);

  if (report.auditFingerprint.auditHash && report.winningPlan.name) {
    console.log('🎉 TEST SUCCESSFUL: BattleBox Architect v7 Core Pipeline operates cleanly!');
  } else {
    throw new Error('Core Pipeline Test failed: Missing audit hash or winning plan.');
  }
}

testCorePipelineExecution().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
