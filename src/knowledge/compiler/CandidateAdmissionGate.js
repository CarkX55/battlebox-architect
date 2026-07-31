/**
 * CandidateAdmissionGate.js
 * Candidate Admission Gate Filter.
 * Pre-ranking strategic candidate filter. Eliminates legally valid but strategically incompatible candidates
 * (e.g., dorks that enter tapped, require another creature, or produce restricted mana).
 */

export class CandidateAdmissionGate {
  static evaluateAdmission(card, role = 'Ramp') {
    if (!card) return { admitted: false, reason: 'NULL_CARD' };

    const text = (card.oracleText || card.oracle_text || card.text || '').toLowerCase();
    const name = (card.name || '').toLowerCase();

    // 1. Ramp Admission Rules
    if (role === 'Ramp') {
      if (text.includes('enters the battlefield tapped') || text.includes('enters tapped')) {
        return { admitted: false, reason: 'RAMP_ENTERS_TAPPED_TEMPO_LOSS' };
      }
      if (text.includes('as an additional cost') && text.includes('sacrifice a creature')) {
        return { admitted: false, reason: 'RAMP_REQUIRES_SACRIFICE_INCOMPATIBLE' };
      }
      if (text.includes('spend this mana only to cast creature spells')) {
        return { admitted: false, reason: 'RAMP_RESTRICTED_MANA_POOL' };
      }
    }

    // 2. Removal Admission Rules
    if (role === 'Removal') {
      if (text.includes('sorcery') && (card.type_line || '').toLowerCase().includes('sorcery') && (card.cmc || 0) > 3) {
        return { admitted: false, reason: 'REMOVAL_SLOW_SORCERY_HIGH_CMC' };
      }
    }

    // Default: Admitted
    return { admitted: true, reason: 'STRATEGICALLY_COMPATIBLE' };
  }

  static filterCandidates(candidates = [], role = 'Ramp') {
    const admitted = [];
    const rejected = [];

    for (const c of candidates) {
      const result = this.evaluateAdmission(c, role);
      if (result.admitted) {
        admitted.push(c);
      } else {
        rejected.push({ card: c, reason: result.reason });
      }
    }

    return { admitted, rejected };
  }
}
