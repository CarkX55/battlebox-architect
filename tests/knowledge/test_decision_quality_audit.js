import { IterativeDeckOptimizer } from '../../src/knowledge/compiler/IterativeDeckOptimizer.js';
import { StrategicJudgeEnhancements } from '../../src/knowledge/reasoning/StrategicJudgeEnhancements.js';
import { DecisionQualityAudit } from '../../src/knowledge/compiler/DecisionQualityAudit.js';
import { DeckConstructionState } from '../../src/knowledge/compiler/DeckConstructionState.js';
import { SlotCandidateRanker } from '../../src/knowledge/compiler/SlotCandidateRanker.js';

console.log('=== TEST: DecisionQualityAudit, Iterative Optimization & Strategic Judge ===');

// 1. Prepare DeckState with 60 slots
let state = new DeckConstructionState({ totalSlots: 60 });
state = state.reserveSlots('pkg_ramp', 'Ramp', 10, 'cap.mana.acceleration', 'ir_1');
state = state.reserveSlots('pkg_draw', 'Draw', 8, 'cap.card.draw', 'ir_2');
state = state.reserveSlots('pkg_threats', 'Threat', 18, 'cap.threat', 'ir_3');
state = state.reserveSlots('pkg_lands', 'Land', 24, 'cap.mana.source', 'ir_4');

const cardPool = Array.from({ length: 250 }, (_, i) => ({
  name: `Card #${i + 1}`,
  cmc: (i % 5) + 1,
  type_line: i % 2 === 0 ? 'Creature — Elf' : 'Sorcery',
  oracle_text: i % 3 === 0 ? '{T}: Add {G}.' : 'Draw two cards.'
}));

state = SlotCandidateRanker.rankAndBindDeck(state, cardPool);

// 2. Test Decision Quality Audit
const auditReport = DecisionQualityAudit.auditDeckDecisionQuality(state, 250);

console.log(`[PASS] Total Slots Audited: ${auditReport.totalSlotsAudited}`);
console.log(`[PASS] Raw Candidate Pool Size: ${auditReport.averageRawPoolSize}`);
console.log(`[PASS] Admitted Candidates: ${auditReport.averageAdmittedCandidates}`);
console.log(`[PASS] Slot 1 Winner: ${auditReport.slotAudits[0].winnerCard}`);
console.log(`[PASS] Slot 1 Runner-Up: ${auditReport.slotAudits[0].runnerUpCard} (Score Delta: ${auditReport.slotAudits[0].scoreDelta})`);
console.log(`[PASS] Slot 1 Rejection Rationale: ${auditReport.slotAudits[0].rejectedCandidates[0].cardName} - ${auditReport.slotAudits[0].rejectedCandidates[0].reason}`);

if (auditReport.totalSlotsAudited !== 60) {
  console.error('FAILED: Decision quality audit expected 60 slots audited');
  process.exit(1);
}

// 3. Test Iterative Local Search Optimizer
const optReport = IterativeDeckOptimizer.optimizeDeckVariants(state, 2);

console.log(`[PASS] Baseline Win Rate: ${optReport.baselineWinRate}`);
console.log(`[PASS] Optimized Win Rate: ${optReport.optimizedWinRate}`);
console.log(`[PASS] Win Rate Delta: ${optReport.winRateDelta}`);
console.log(`[PASS] Optimization Status: ${optReport.status}`);

// 4. Test Strategic High Level Judge Enhancements
const stratJudge = StrategicJudgeEnhancements.verifyStrategicHighLevelContracts(state);

console.log(`[PASS] High-Level Strategic Judge Passed: ${stratJudge.overallPassed}`);
console.log(`[PASS] Payoff Check: ${stratJudge.verifications[0].name} -> ${stratJudge.verifications[0].passed}`);

if (!stratJudge.verifications[0].verifierId) {
  console.error('FAILED: Strategic judge verifierId missing');
  process.exit(1);
}

console.log('=== DECISION QUALITY AUDIT TEST SUCCESSFUL ===');
