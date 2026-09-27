/**
 * src/services/compiler/core/deckState.js
 * 
 * DeckState: Physical & Causal Deck State IR v28.3.
 * Immutable physical deck snapshot containing cards, curve, proof coverage,
 * state deficits, and normalized Oracle identity indices.
 */

import { extractCanonicalCmc, extractCanonicalOracleText, extractCanonicalTypeLine } from './canonicalCardNormalizer.js';

export function normalizeOracleIdentity(card) {
  if (!card) return 'unknown';
  const rawName = card.name || card.cardObj?.name || card.card?.name || '';
  if (rawName) {
    return rawName.toLowerCase().trim();
  }
  if (card.oracle_id) return String(card.oracle_id).toLowerCase().trim();
  if (card.oracleId) return String(card.oracleId).toLowerCase().trim();
  return 'unknown';
}

export class DeckState {
  constructor(cards = [], metadata = {}) {
    let cardArray = [];
    let meta = {};
    if (Array.isArray(cards)) {
      cardArray = cards;
      meta = metadata || {};
    } else if (cards && Array.isArray(cards.cards)) {
      cardArray = cards.cards;
      meta = cards;
    }

    this.cards = Object.freeze(cardArray.map(c => {
      const cardObj = c.cardObj || c;
      const canonicalCmc = extractCanonicalCmc(cardObj || c);
      const canonicalType = extractCanonicalTypeLine(cardObj || c) || c.type_line || c.typeLine || cardObj.type_line || '';
      const canonicalOracle = extractCanonicalOracleText(cardObj || c) || c.oracle_text || c.oracleText || cardObj.oracle_text || '';

      if (cardObj && typeof cardObj === 'object') {
        if (cardObj.semantic_representation) {
          cardObj.semantic_representation.cmc = canonicalCmc;
          if (cardObj.semantic_representation.cardCausalContract) {
            cardObj.semantic_representation.cardCausalContract.cmc = canonicalCmc;
          }
        }
      }

      return Object.freeze({
        name: c.name || cardObj.name,
        oracle_id: normalizeOracleIdentity(c),
        quantity: Number(c.quantity || c.copies || c.count || 1),
        role: c.role || 'General',
        packagePriority: c.packagePriority || 'SUPPORT',
        lockLevel: c.lockLevel || 'LOCK_SOFT',
        mana_cost: c.mana_cost || c.manaCost || cardObj.mana_cost || '',
        mana_value: canonicalCmc,
        cmc: canonicalCmc,
        colors: Object.freeze([...(c.colors || cardObj.colors || [])]),
        color_identity: Object.freeze([...(c.color_identity || c.colorIdentity || cardObj.color_identity || [])]),
        type_line: canonicalType,
        oracle_text: canonicalOracle,
        rarity: c.rarity || cardObj.rarity || 'common',
        image_uris: c.image_uris || cardObj.image_uris || null,
        cardObj: cardObj,
        isLand: Boolean(
          canonicalType.toLowerCase().includes('land') ||
          c.role === 'Land' || c.role === 'MANA_BASE' || c.isLand
        )
      });
    }));

    this.totalCardCount = this.cards.reduce((sum, c) => sum + c.quantity, 0);
    this.distinctCardCount = this.cards.length;
    this.format = String(meta.format || meta.intentPackage?.format || 'STANDARD').toUpperCase();
    this.archetype = String(meta.archetype || meta.intentPackage?.archetype || 'Aggro');
    this.vetoLedger = Object.freeze([...(meta.vetoLedger || [])]);
    this.superiorityCertificates = Object.freeze([...(meta.superiorityCertificates || [])]);
    this.metadata = Object.freeze({ ...meta, format: this.format, archetype: this.archetype, vetoLedger: this.vetoLedger, superiorityCertificates: this.superiorityCertificates });

    // Aggregate counts by canonical Oracle Identity
    const oracleMap = new Map();
    for (const c of this.cards) {
      const oId = normalizeOracleIdentity(c);
      oracleMap.set(oId, (oracleMap.get(oId) || 0) + c.quantity);
    }
    this.oracleIdentityDistribution = Object.freeze(Object.fromEntries(oracleMap));

    // Dynamic Causal Proof Coverage & State Deficits
    const { proofCoverage, stateDeficits } = this.calculateProofCoverageAndDeficits(metadata);
    this.proofCoverage = Object.freeze(proofCoverage);
    this.stateDeficits = Object.freeze(stateDeficits);

    // V29.5 Viability & Feasibility Status
    this.buildStatus = meta.buildStatus || 'SUCCESS';
    this.isViable = meta.isViable !== undefined ? Boolean(meta.isViable) : true;
    this.builderCoverage = meta.builderCoverage || null;
    this.feasibilityDiagnosis = meta.feasibilityDiagnosis || '';

    Object.freeze(this);
  }

  get curve() {
    const curveMap = {};
    for (const c of this.cards) {
      if (!c.isLand) {
        const cmc = Number(c.cmc || c.mana_value || 0);
        curveMap[cmc] = (curveMap[cmc] || 0) + (c.quantity || 1);
      }
    }
    return curveMap;
  }

  get spells() {
    return this.cards.filter(c => !c.isLand);
  }

  get lands() {
    return this.cards.filter(c => c.isLand);
  }

  get totalLands() {
    return this.lands.reduce((sum, c) => sum + c.quantity, 0);
  }

  get totalSpells() {
    return this.spells.reduce((sum, c) => sum + c.quantity, 0);
  }

  get interactionCount() {
    let count = 0;
    for (const c of this.spells) {
      const text = (c.oracle_text || '').toLowerCase();
      const isInteraction = 
        text.includes('destroy') ||
        text.includes('exile target') ||
        text.includes('exile all') ||
        text.includes('counter target') ||
        text.includes('damage to target') ||
        text.includes('damage to any target') ||
        text.includes('damage to each') ||
        text.includes('fights target') ||
        c.role === 'CHEAP_REMOVAL' ||
        c.role === 'REMOVAL' ||
        c.role === 'BOARD_SWEEPER';
      if (isInteraction) {
        count += c.quantity;
      }
    }
    return count;
  }

  get cardFlowCount() {
    let count = 0;
    for (const c of this.spells) {
      const text = (c.oracle_text || '').toLowerCase();
      const isFlow = 
        text.includes('draw a card') ||
        text.includes('draw two') ||
        text.includes('draw three') ||
        text.includes('exile the top card of your library. you may play') ||
        text.includes('exile the top') ||
        text.includes('look at the top') ||
        c.role === 'CARD_FLOW' ||
        c.role === 'RESOURCE_ENGINE';
      if (isFlow) {
        count += c.quantity;
      }
    }
    return count;
  }

  get earlyPressureCount() {
    let count = 0;
    for (const c of this.spells) {
      const type = (c.type_line || '').toLowerCase();
      const cmc = Number(c.cmc || 0);
      if (type.includes('creature') && cmc <= 2) {
        count += c.quantity;
      }
    }
    return count;
  }

  /**
   * Derives state proof coverage and deficits from the current cards vs thesis.
   */
  calculateProofCoverageAndDeficits(metadata = {}) {
    const archetype = (metadata.archetype || metadata.tempo || 'Aggro').toLowerCase();
    const isAggro = archetype.includes('aggro') || archetype.includes('burn');
    const isControl = archetype.includes('control');
    const isMidrange = archetype.includes('midrange');
    const isRamp = archetype.includes('ramp');

    const interactionCount = this.interactionCount;
    const cardFlowCount = this.cardFlowCount;
    const earlyPressureCount = this.earlyPressureCount;

    const stateDeficits = [];
    const proofCoverage = {};

    // 1. SURVIVAL_WINDOW (Early Interaction)
    const interactionSatisfied = isAggro ? (interactionCount >= 4) : (isControl ? interactionCount >= 8 : interactionCount >= 4);
    proofCoverage.survivalWindow = {
      required: !archetype.includes('solitaire'),
      satisfied: interactionSatisfied,
      count: interactionCount,
      status: interactionSatisfied ? 'SATISFIED' : 'UNDER_SUPPORTED'
    };
    if (!interactionSatisfied && !archetype.includes('solitaire')) {
      stateDeficits.push({
        obligation: 'SURVIVAL_WINDOW',
        status: 'UNDER_SUPPORTED',
        affectedTurns: [1, 2, 3],
        currentCount: interactionCount,
        severity: interactionCount === 0 ? 'HIGH' : 'MEDIUM',
        missingCapabilities: ['EARLY_INTERACTION', 'CHEAP_REMOVAL']
      });
    }

    // 2. RESOURCE_FLOW (Card Flow / Gas Retention)
    const flowSatisfied = cardFlowCount >= 2;
    proofCoverage.resourceFlow = {
      required: true,
      satisfied: flowSatisfied,
      count: cardFlowCount,
      status: flowSatisfied ? 'SATISFIED' : 'UNDER_SUPPORTED'
    };
    if (!flowSatisfied) {
      stateDeficits.push({
        obligation: 'RESOURCE_FLOW',
        status: 'UNDER_SUPPORTED',
        affectedTurns: [3, 4, 5],
        currentCount: cardFlowCount,
        severity: cardFlowCount === 0 ? 'MEDIUM' : 'LOW',
        missingCapabilities: ['CARD_FLOW', 'IMPULSE_DRAW']
      });
    }

    // 3. EARLY_PRESSURE (Aggro / Tempo Curve Execution)
    if (isAggro || archetype.includes('tempo')) {
      const pressureSatisfied = earlyPressureCount >= 10;
      proofCoverage.earlyPressure = {
        required: true,
        satisfied: pressureSatisfied,
        count: earlyPressureCount,
        status: pressureSatisfied ? 'SATISFIED' : 'UNDER_SUPPORTED'
      };
      if (!pressureSatisfied) {
        stateDeficits.push({
          obligation: 'EARLY_PRESSURE',
          status: 'UNDER_SUPPORTED',
          affectedTurns: [1, 2],
          currentCount: earlyPressureCount,
          severity: earlyPressureCount < 6 ? 'HIGH' : 'MEDIUM',
          missingCapabilities: ['TURN1_PLAY', 'TURN2_PRESSURE']
        });
      }
    }

    return { proofCoverage, stateDeficits };
  }

  validate() {
    if (!Array.isArray(this.cards)) {
      throw new Error('[DeckState Validation Error] cards must be an array.');
    }
  }

  toJSON() {
    return {
      totalCardCount: this.totalCardCount,
      distinctCardCount: this.distinctCardCount,
      cards: this.cards,
      proofCoverage: this.proofCoverage,
      stateDeficits: this.stateDeficits,
      oracleIdentityDistribution: this.oracleIdentityDistribution,
      metadata: this.metadata
    };
  }
}
