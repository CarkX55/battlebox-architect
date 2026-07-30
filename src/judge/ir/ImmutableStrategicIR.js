/**
 * src/judge/ir/ImmutableStrategicIR.js
 * Level 2 Immutable Strategic Intermediate Representation.
 * Pure value object representing the entire deck's strategic architecture.
 */

import { buildCardSemanticIR } from './CardSemanticIR.js';

export function createImmutableStrategicIR(cards = [], forgeContext = {}) {
  const normalizedSemanticCards = cards.map(c => buildCardSemanticIR(c));
  const totalDeckSize = normalizedSemanticCards.reduce((sum, c) => sum + c.quantity, 0);

  const pips = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  normalizedSemanticCards.forEach(c => {
    const cost = c.manaCost || '';
    const qty = c.quantity;
    if (cost.includes('{W}')) pips.W += (cost.match(/\{W\}/g) || []).length * qty;
    if (cost.includes('{U}')) pips.U += (cost.match(/\{U\}/g) || []).length * qty;
    if (cost.includes('{B}')) pips.B += (cost.match(/\{B\}/g) || []).length * qty;
    if (cost.includes('{R}')) pips.R += (cost.match(/\{R\}/g) || []).length * qty;
    if (cost.includes('{G}')) pips.G += (cost.match(/\{G\}/g) || []).length * qty;
  });

  return Object.freeze({
    id: `ir_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`,
    cards: Object.freeze(normalizedSemanticCards),
    totalDeckSize,
    pips: Object.freeze({ ...pips }),
    requestedColors: Object.freeze([...(forgeContext.colores || [])]),
    archetype: forgeContext.archetype || forgeContext.arquetipo || 'midrange',
    strategy: forgeContext.strategy || forgeContext.estrategia || '',
    format: (forgeContext.format || forgeContext.formato || 'MODERN').toUpperCase(),
    timestamp: new Date().toISOString()
  });
}
