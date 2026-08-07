/**
 * src/services/compiler/metricsService.js
 * 
 * MetricsService: Servicio Canónico de Métricas Derivadas Agregadas.
 * Calcula métricas complejas del mazo utilizando StateQueryService:
 * - getRemovalDensity()
 * - getThreatDensity()
 * - getCurveEntropy()
 * - getResilienceScore()
 */

import { StateQueryService } from './stateQueryService.js';

export class MetricsService {
  constructor(strategicState) {
    this.query = new StateQueryService(strategicState);
    this.state = strategicState;
  }

  /**
   * Densidad de interacción/remoción en proporción a los hechizos del maindeck
   */
  getRemovalDensity() {
    const slots = this.state?.deckState?.slots || [];
    const nonLands = slots.filter(s => s && s.name && !s.type_line?.toLowerCase().includes('land'));
    const totalSpells = nonLands.reduce((acc, s) => acc + Number(s.quantity || s.count || 1), 0);
    if (totalSpells === 0) return 0;

    const interactionCount = this.query.getEarlyInteraction();
    return Math.round((interactionCount / totalSpells) * 100) / 100;
  }

  /**
   * Densidad de amenazas en proporción al mazo total
   */
  getThreatDensity() {
    const slots = this.state?.deckState?.slots || [];
    const totalDeckCards = slots.reduce((acc, s) => acc + Number(s?.quantity || s?.count || 1), 0);
    if (totalDeckCards === 0) return 0;

    const threats = this.query.getPlayableThreats(2);
    const threatCount = threats.reduce((acc, s) => acc + Number(s.quantity || s.count || 1), 0);
    return Math.round((threatCount / totalDeckCards) * 100) / 100;
  }

  /**
   * Entropía de distribución de la curva de maná
   */
  getCurveEntropy() {
    const slots = this.state?.deckState?.slots || [];
    const cmcCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;

    slots.forEach(s => {
      if (!s || !s.name || s.type_line?.toLowerCase().includes('land')) return;
      const cmc = typeof s.cmc === 'number' ? s.cmc : parseInt(s.cmc || 2, 10);
      const bucket = cmc >= 5 ? 5 : (cmc < 1 ? 1 : cmc);
      const qty = Number(s.quantity || s.count || 1);
      cmcCounts[bucket] += qty;
      total += qty;
    });

    if (total === 0) return 0;

    let entropy = 0;
    Object.values(cmcCounts).forEach(count => {
      const p = count / total;
      if (p > 0) entropy -= p * Math.log2(p);
    });

    return Math.round(entropy * 1000) / 1000;
  }

  /**
   * Puntuación de resiliencia del mazo frente a interacción (basado en evasión y ventaja de cartas)
   */
  getResilienceScore() {
    const drawCards = this.query.getCardsByRole('draw');
    const drawQty = drawCards.reduce((acc, s) => acc + Number(s.quantity || s.count || 1), 0);
    
    const threats = this.query.getPlayableThreats(2);
    const evasiveQty = threats.filter(t => {
      const oracle = (t.oracle_text || t.text || '').toLowerCase();
      return oracle.includes('flying') || oracle.includes('hexproof') || oracle.includes('ward') || oracle.includes('indestructible');
    }).reduce((acc, s) => acc + Number(s.quantity || s.count || 1), 0);

    const score = (drawQty * 15) + (evasiveQty * 10);
    return Math.min(100, Math.round(score));
  }
}
