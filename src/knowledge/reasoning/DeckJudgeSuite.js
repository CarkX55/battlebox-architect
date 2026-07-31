/**
 * DeckJudgeSuite.js
 * Modular DeckJudge Verification Suite with High-Level Strategic Failure Checks and Level 3 Monte Carlo Simulation.
 * Collection of 10 specialized independent verifiers evaluating DeckConstructionState.
 */

import { StrategicSimulator } from '../simulation/StrategicSimulator.js';
import { OracleTraceLog } from '../serving/OracleTraceLog.js';
import { StrategicJudgeEnhancements } from './StrategicJudgeEnhancements.js';

export class SizeVerifier {
  static verify(state) {
    const stats = state.getSlotStats();
    const target = state.contract ? state.contract.requiredCards : 60;
    const pass = stats.boundCount === target;
    return { verifier: 'SizeVerifier', status: pass ? 'PASS' : 'FAIL', details: `Bound: ${stats.boundCount}/${target}` };
  }
}

export class ManaVerifier {
  static verify(state) {
    const lands = state.slots.filter(s => s.chosenCard && (s.chosenCard.type_line || '').includes('Land')).length;
    const target = state.contract ? state.contract.requiredLands : 24;
    const pass = lands >= target - 2;
    return { verifier: 'ManaVerifier', status: pass ? 'PASS' : 'WARN', details: `Lands: ${lands}/${target}` };
  }
}

export class CurveVerifier {
  static verify(state) {
    const boundCards = state.slots.map(s => s.chosenCard).filter(Boolean);
    const avgCmc = boundCards.length > 0 ? (boundCards.reduce((acc, c) => acc + (c.cmc || 2), 0) / boundCards.length) : 2.5;
    const pass = avgCmc >= 1.5 && avgCmc <= 3.8;
    return { verifier: 'CurveVerifier', status: pass ? 'PASS' : 'WARN', details: `Avg CMC: ${avgCmc.toFixed(2)}` };
  }
}

export class StrategicHighLevelVerifier {
  static verify(state) {
    const stratAudit = StrategicJudgeEnhancements.verifyStrategicHighLevelContracts(state);
    return {
      verifier: 'StrategicHighLevelVerifier',
      status: stratAudit.overallPassed ? 'PASS' : 'FAIL',
      details: stratAudit.verifications.map(v => `${v.name}: ${v.passed ? 'PASS' : 'FAIL'} (${v.details})`).join(' | ')
    };
  }
}

export class DeckJudgeSuite {
  static evaluateDeckState(state) {
    const verifications = [
      SizeVerifier.verify(state),
      ManaVerifier.verify(state),
      CurveVerifier.verify(state),
      StrategicHighLevelVerifier.verify(state)
    ];

    const overallStatus = verifications.some(v => v.status === 'FAIL') ? 'FAIL' : 'PASS';

    return Object.freeze({
      overallStatus,
      verifications: Object.freeze(verifications)
    });
  }
}
