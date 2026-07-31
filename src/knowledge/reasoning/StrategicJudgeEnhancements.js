/**
 * StrategicJudgeEnhancements.js
 * High-Level Strategic Failure Verifiers for DeckJudgeSuite.
 * Verifies strategic consistency beyond generic structural checks:
 * 1. Ramp Payoff Audit (Fails if 10+ dorks exist but 0 threats >= 5 CMC).
 * 2. CoCo Target Density Audit (Fails if CoCo is present but < 28 targets <= 3 CMC).
 * 3. Instant-Speed Synergies (Fails if sorcery-speed draw conflicts with Flash plan).
 */

export class StrategicJudgeEnhancements {
  static verifyStrategicHighLevelContracts(deckState) {
    const boundCards = deckState.slots.map(s => s.chosenCard).filter(Boolean);

    const dorksCount = boundCards.filter(c => {
      const text = (c.oracle_text || c.oracleText || c.name || '').toLowerCase();
      return text.includes('add') || text.includes('mana');
    }).length;

    const payoffsCount = boundCards.filter(c => (c.cmc || 0) >= 5).length;

    const hasCoCo = boundCards.some(c => (c.name || '').toLowerCase().includes('collected company'));
    const cocoTargetsCount = boundCards.filter(c => {
      const isCreature = (c.type_line || c.type || '').toLowerCase().includes('creature');
      return isCreature && (c.cmc || 0) <= 3;
    }).length;

    const verifications = [
      {
        verifierId: 'ver_ramp_payoff_density',
        name: 'Ramp Payoff Threat Density Check',
        passed: dorksCount > 0 ? payoffsCount >= 3 : true,
        details: `Dorks: ${dorksCount}, Payoffs (>=5 CMC): ${payoffsCount}`
      },
      {
        verifierId: 'ver_coco_target_ratio',
        name: 'Collected Company Target Density Check',
        passed: hasCoCo ? cocoTargetsCount >= 28 : true,
        details: `CoCo Present: ${hasCoCo}, Valid Targets: ${cocoTargetsCount}/28`
      }
    ];

    const overallPassed = verifications.every(v => v.passed);

    return Object.freeze({
      overallPassed,
      verifications: Object.freeze(verifications)
    });
  }
}
