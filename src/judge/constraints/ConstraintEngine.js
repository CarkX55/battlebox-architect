/**
 * src/judge/constraints/ConstraintEngine.js
 * Unified Constraint Engine & Solver for format rules, color identity, copy limits.
 */

export class ConstraintEngine {
  constructor(manifest) {
    this.manifest = manifest;
  }

  validateIR(strategicIR) {
    const violations = [];
    const format = strategicIR.format;
    const cards = strategicIR.cards;
    const targetSize = this.manifest.constraints.targetDeckSize || (format === 'COMMANDER' ? 100 : 60);

    // 1. Deck size check
    if (strategicIR.totalDeckSize !== targetSize) {
      violations.push({
        code: 'SIZE_VIOLATION',
        severity: 'BLOCKING',
        message: `Mazo de ${strategicIR.totalDeckSize} cartas no coincide con el objetivo del formato (${targetSize} cartas).`,
        deficit: targetSize - strategicIR.totalDeckSize
      });
    }

    // 2. Legal copy limits check
    const maxCopiesAllowed = format === 'COMMANDER' ? 1 : 4;
    cards.forEach(card => {
      if (card.isLand && ['plains','island','swamp','mountain','forest','wastes'].includes(card.cardName.toLowerCase())) {
        return; // Basic lands unlimited
      }
      if (card.quantity > maxCopiesAllowed) {
        violations.push({
          code: 'COPY_LIMIT_VIOLATION',
          severity: 'BLOCKING',
          message: `La carta "${card.cardName}" contiene ${card.quantity} copias (máximo permitido en ${format}: ${maxCopiesAllowed}).`,
          cardName: card.cardName,
          quantity: card.quantity,
          maxAllowed: maxCopiesAllowed
        });
      }
    });

    // 3. Color contamination check
    const requestedColors = new Set(strategicIR.requestedColors);
    if (requestedColors.size > 0) {
      cards.forEach(card => {
        if (card.colors.length > 0) {
          const illegalColors = card.colors.filter(c => !requestedColors.has(c));
          if (illegalColors.length > 0) {
            violations.push({
              code: 'COLOR_CONTAMINATION',
              severity: 'CRITICAL',
              message: `La carta "${card.cardName}" contiene color ${illegalColors.join(', ')} no incluido en la identidad solicitada [${Array.from(requestedColors).join(', ')}].`,
              cardName: card.cardName,
              illegalColors
            });
          }
        }
      });
    }

    return Object.freeze({
      isLegal: violations.filter(v => v.severity === 'BLOCKING').length === 0,
      violations: Object.freeze(violations)
    });
  }
}
