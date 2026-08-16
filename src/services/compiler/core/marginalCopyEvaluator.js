/**
 * MARGINAL COPY EVALUATOR (v23.0 Core Engine)
 * 
 * Universal Copy Domain Evaluator (0 .. MAX_FORMAT_COPIES).
 * Evaluates marginal state gain (stateGain) for each incremental copy:
 * 0 -> 1, 1 -> 2, 2 -> 3, 3 -> 4 ... up to format maximum.
 * 
 * Eliminates automatic 4x playset inflation.
 * Calculates diminishing returns for legendaries, high-CMC curves, and tutor targets.
 */

export class MarginalCopyEvaluator {
  /**
   * Determines the maximum legal copies for a card in the given format.
   */
  static getCopyDomain(card, format = 'MODERN', customConstraints = {}) {
    const nameLower = (card.name || '').toLowerCase();
    const typeLine = (card.type_line || card.type || '').toLowerCase();

    // 1. Unlimited copy exceptions (Relentless Rats, Shadowborn Apostle, Dragon's Approach, Persistent Petitioners, Basic Lands)
    if (
      typeLine.includes('basic land') ||
      nameLower.includes('relentless rats') ||
      nameLower.includes('shadowborn apostle') ||
      nameLower.includes('dragon\'s approach') ||
      nameLower.includes('persistent petitioners') ||
      nameLower.includes('slime against humanity')
    ) {
      return { min: 0, max: 60, source: 'CARD_RULE_EXCEPTION' };
    }

    // 2. Nazgûl (9 copies)
    if (nameLower.includes('nazgûl') || nameLower.includes('nazgul')) {
      return { min: 0, max: 9, source: 'CARD_RULE_EXCEPTION' };
    }

    // 3. Format Specific Limits
    const fmt = (format || 'MODERN').toUpperCase();
    if (fmt === 'COMMANDER' || fmt === 'EDH' || fmt === 'BRAWL' || fmt === 'SINGLETON') {
      return { min: 0, max: 1, source: 'FORMAT_SINGLETON_RULE' };
    }

    // 4. Custom constraint override (e.g. user set max copies = 3)
    if (customConstraints.maxCopies !== undefined) {
      return { min: 0, max: Number(customConstraints.maxCopies), source: 'USER_CONSTRAINT' };
    }

    // Standard Constructed default: 4
    return { min: 0, max: 4, source: 'CONSTRUCTED_FORMAT_RULE' };
  }

  /**
   * Evaluates the marginal state gain for each incremental copy from 1 to maxDomain.
   * @param {Object} card Card to evaluate
   * @param {Object} currentState Current deck state
   * @param {Object} strategicContract Strategic thesis and WinPath
   * @returns {Object} { optimalCopies, copyEvaluation, copyDomain }
   */
  static evaluateOptimalCopies(card, currentState = {}, strategicContract = {}) {
    const format = strategicContract.format || 'MODERN';
    const copyDomain = this.getCopyDomain(card, format, strategicContract.constraints || {});
    const maxCopies = copyDomain.max;

    const copyEvaluation = {};
    let optimalCopies = 0;
    const isLegendary = (card.type_line || card.type || '').includes('Legendary');
    const cmc = Number(card.cmc || 0);
    const isCoreEngine = (strategicContract.winPath || []).some(node => {
      const nodeKey = typeof node === 'string' ? node : (node.id || node.name || '');
      return (card.oracle_text || '').toLowerCase().includes(nodeKey.toLowerCase());
    });

    const isTutorOrCantrip = (card.oracle_text || '').toLowerCase().includes('search your library') || (cmc <= 1 && (card.oracle_text || '').toLowerCase().includes('draw a card'));

    for (let copyNum = 1; copyNum <= maxCopies; copyNum++) {
      const marginalResult = this.computeMarginalGainForCopy(copyNum, {
        card,
        isLegendary,
        cmc,
        isCoreEngine,
        isTutorOrCantrip,
        currentState,
        strategicContract
      });

      copyEvaluation[copyNum] = marginalResult;

      // Acceptance Threshold: marginal gain must be >= 0.5 to justify adding copy
      if (marginalResult.stateGain >= 0.5) {
        optimalCopies = copyNum;
      } else {
        // Marginal gain no longer justifies adding additional copies
        break;
      }
    }

    return {
      cardName: card.name,
      copyDomain,
      copyEvaluation,
      optimalCopies: Math.max(1, optimalCopies)
    };
  }

  /**
   * Calculates marginal gain for an individual copy index (e.g. 1st copy vs 4th copy).
   */
  static computeMarginalGainForCopy(copyNum, ctx) {
    const { card, isLegendary, cmc, isCoreEngine, isTutorOrCantrip } = ctx;

    // Base utility of first copy
    let baseGain = isCoreEngine ? 3.0 : 2.0;

    if (copyNum === 1) {
      return {
        stateGain: baseGain,
        justification: `Copia 1: Introduce la capacidad ${card.name} al mazo y abre líneas de interacción/motor.`
      };
    }

    if (copyNum === 2) {
      let gain = baseGain * 0.85;
      if (isLegendary) gain -= 0.3; // Slight dead draw risk
      if (cmc >= 5) gain -= 0.5; // High curve density risk
      return {
        stateGain: Number(gain.toFixed(2)),
        justification: `Copia 2: Aumenta la probabilidad de robo a ~40% en Turno ${cmc + 1}.`
      };
    }

    if (copyNum === 3) {
      let gain = baseGain * 0.65;
      if (isLegendary) gain -= 0.8; // Noticeable legendary dead-in-hand risk
      if (cmc >= 4) gain -= 0.6;
      if (isCoreEngine) gain += 0.4; // Core engines reward high consistency
      return {
        stateGain: Number(gain.toFixed(2)),
        justification: `Copia 3: Asegura consistencia central (~54% robo en mano inicial/T3).`
      };
    }

    if (copyNum === 4) {
      let gain = baseGain * 0.45;
      if (isLegendary) gain -= 1.4; // Severe legendary redundancy penalty
      if (cmc >= 4) gain -= 1.0; // High CMC clunkiness
      if (isCoreEngine && !isLegendary) gain += 0.5; // 4x playset only for cheap non-legendary foundations
      if (isTutorOrCantrip) gain += 0.3;
      return {
        stateGain: Number(Math.max(0.1, gain).toFixed(2)),
        justification: gain >= 0.5
          ? `Copia 4: Maximiza probabilidad absoluta en Turno 1-2 (Playset no-legendario esencial).`
          : `Copia 4 descartada: Riesgo de carta muerta por ser Legendaria o curva alta (Ganancia marginal ${gain.toFixed(2)} < 0.5).`
      };
    }

    // Unlimited copy fallback (e.g. basic lands or Relentless)
    return {
      stateGain: 1.0,
      justification: `Copia ${copyNum}: Demanda de consistencia de paquete sin restricciones.`
    };
  }
}
