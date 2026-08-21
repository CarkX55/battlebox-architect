/**
 * DEMAND SUPPLY LEDGER (v24.0 Core Engine)
 * 
 * Universal Causal Demand-Supply Ledger with reliableSupply computation.
 * Evaluates whether operational prerequisites required by cards in the deck
 * are reliably supported by existing infrastructure at the relevant turn window.
 * 
 * Invariant:
 * If a card has a HARD demand and reliableSupply == 0 or below minimum threshold,
 * it receives UNFULFILLED_HARD_DEMAND and action: 'REJECT'.
 * If a card is SELF_SUPPLYING, its internal loop is validated and marked SATISFIED.
 */

import { CardCausalContract } from './cardCausalContract.js';

export class DemandSupplyLedger {
  /**
   * Extracts demands declared by a card's Oracle text using CardCausalContract.
   * @param {Object} card
   * @returns {Array<Object>}
   */
  static extractCardDemands(card) {
    if (!card) return [];
    const contract = CardCausalContract.parse(card);
    return contract ? contract.demands : [];
  }

  /**
   * Extracts capabilities supplied by a card's Oracle text using CardCausalContract.
   * @param {Object} card
   * @returns {Array<Object>}
   */
  static extractCardSupplies(card) {
    if (!card) return [];
    const contract = CardCausalContract.parse(card);
    return contract ? contract.supplies : [];
  }

  /**
   * Calculates the current supply of a resource in the deck state.
   * @param {Object} deckState Current deck state { cards: [...] }
   * @param {string} resource Name of the resource
   * @returns {number} Available raw supply count in deck
   */
  static computeAvailableSupply(deckState, resource) {
    const cards = (deckState && deckState.cards) || [];
    let supply = 0;

    for (const entry of cards) {
      const card = entry.card || entry;
      const count = Number(entry.quantity || entry.count || 1);
      const oracle = (card.oracle_text || card.oracleText || '').toLowerCase();
      const typeLine = (card.type_line || card.typeLine || '').toLowerCase();

      switch (resource) {
        case 'ARTIFACT_CONTROL':
          if (
            typeLine.includes('artifact') ||
            oracle.includes('create a treasure') ||
            oracle.includes('create a blood token') ||
            oracle.includes('create a clue') ||
            oracle.includes('create a map token') ||
            oracle.includes('create a food token') ||
            oracle.includes('create an incubator')
          ) {
            supply += count;
          }
          break;

        case 'ACTIVATED_ABILITY_CONSUMER':
          // Cards with activated abilities (cost : effect)
          if (
            oracle.includes(':{') ||
            oracle.includes('{t}:') ||
            oracle.includes('{1}:') ||
            oracle.includes('{2}:') ||
            oracle.includes('{3}:') ||
            oracle.includes('{u}:') ||
            oracle.includes('{g}:') ||
            oracle.includes('{r}:') ||
            oracle.includes('{w}:') ||
            oracle.includes('{b}:') ||
            oracle.includes('cycling {') ||
            oracle.includes('unearth {') ||
            oracle.includes('adapt ') ||
            oracle.includes('monstrosity ')
          ) {
            supply += count;
          }
          break;

        case 'INSTANT_OR_SORCERY_CONSUMER':
          if (typeLine.includes('instant') || typeLine.includes('sorcery')) {
            supply += count;
          }
          break;

        case 'SACRIFICE_FODDER':
          if (
            typeLine.includes('creature') ||
            oracle.includes('create a token') ||
            oracle.includes('create two') ||
            oracle.includes('mobilize') ||
            oracle.includes('treasure token') ||
            oracle.includes('blood token')
          ) {
            supply += count;
          }
          break;

        case 'GRAVEYARD_FUEL':
          if (
            typeLine.includes('instant') ||
            typeLine.includes('sorcery') ||
            oracle.includes('mill') ||
            oracle.includes('discard') ||
            oracle.includes('sacrifice') ||
            oracle.includes('dredge')
          ) {
            supply += count;
          }
          break;

        case 'COUNTER_INFRASTRUCTURE':
          if (
            oracle.includes('+1/+1 counter') ||
            oracle.includes('proliferate') ||
            oracle.includes('backup') ||
            oracle.includes('modular')
          ) {
            supply += count;
          }
          break;

        case 'ENERGY_SUPPLY':
          if (oracle.includes('you get {e}')) {
            supply += count;
          }
          break;

        case 'OPPONENT_TARGET_AVAILABILITY':
          // Meta dependent default availability assumption
          supply += 4;
          break;

        default:
          break;
      }
    }

    return supply;
  }

  /**
   * Computes the reliable supply and hypergeometric availability probability
   * of having the resource by the required turn.
   * @param {number} availableSupply Raw copies in 60-card deck
   * @param {number} turn Turn at which the resource is required
   * @returns {{ reliableSupply: number, probability: number }}
   */
  static computeReliableSupply(availableSupply, turn = 2) {
    if (availableSupply <= 0) {
      return { reliableSupply: 0, probability: 0.0 };
    }

    const deckSize = 60;
    // By turn T on play: 7 + (T - 1) cards drawn = 6 + T cards seen
    const cardsSeen = Math.min(deckSize, 6 + turn);

    // Hypergeometric probability P(X >= 1) = 1 - ( (deckSize - supply) choose cardsSeen ) / ( deckSize choose cardsSeen )
    let probNone = 1.0;
    for (let i = 0; i < cardsSeen; i++) {
      probNone *= (deckSize - availableSupply - i) / (deckSize - i);
    }
    const probAtLeastOne = Math.max(0, Math.min(1.0, 1.0 - probNone));

    // Reliable supply is the expected count available discounted by probability
    const expectedDrawn = (availableSupply * cardsSeen) / deckSize;
    const reliableSupply = Number((expectedDrawn * probAtLeastOne).toFixed(2));

    return {
      reliableSupply,
      probability: Number(probAtLeastOne.toFixed(2))
    };
  }

  /**
   * Audits a candidate card against current deck state infrastructure using CardCausalContract.
   * @param {Object} card Candidate card to evaluate
   * @param {Object} deckState Current deck state
   * @param {Object} [intentContext={}]
   * @returns {{ isSatisfied: boolean, demands: Array<Object>, failureReasons: Array<string> }}
   */
  static auditCardDemands(card, deckState, intentContext = {}) {
    const contract = CardCausalContract.parse(card);
    if (!contract) return { isSatisfied: true, demands: [], failureReasons: [] };

    const declaredDemands = contract.demands || [];
    const ledgerEntries = [];
    const failureReasons = [];
    let isSatisfied = true;

    for (const demand of declaredDemands) {
      // 1. If self-supplying, mark satisfied automatically
      if (demand.necessity === 'SELF_SUPPLYING') {
        ledgerEntries.push({
          resource: demand.resource,
          necessity: demand.necessity,
          timing: 'SELF_CONTAINED',
          requiredBy: card.name,
          availableSupply: 4,
          reliableSupply: 4,
          requiredAt: { turn: 1, probability: 1.0 },
          status: 'SATISFIED',
          action: 'ALLOW'
        });
        continue;
      }

      // 2. Compute available supply in deck state
      const availableSupply = this.computeAvailableSupply(deckState, demand.resource);
      const turn = demand.turn || (card.cmc || card.mana_value || 2);
      const { reliableSupply, probability } = this.computeReliableSupply(availableSupply, turn);

      // Hard demand verification
      let satisfies = false;
      if (demand.necessity === 'HARD') {
        satisfies = availableSupply >= 4 && probability >= 0.45;
      } else if (demand.necessity === 'OPPONENT_DEPENDENT') {
        satisfies = true; // Evaluated via metagame scenarios
      } else {
        satisfies = availableSupply >= 1;
      }

      const status = satisfies ? 'SATISFIED' : 'UNFULFILLED';
      const action = status === 'SATISFIED' ? 'ALLOW' : (demand.necessity === 'HARD' ? 'REJECT' : 'WARN');

      if (status === 'UNFULFILLED' && demand.necessity === 'HARD') {
        isSatisfied = false;
        failureReasons.push(
          `Demanda estricta [${demand.resource}] no satisfecha por la infraestructura del mazo (Disponibles: ${availableSupply}, Fiables: ${reliableSupply}, P: ${Math.round(probability * 100)}%).`
        );
      }

      ledgerEntries.push({
        resource: demand.resource,
        necessity: demand.necessity,
        timing: turn <= 2 ? 'EARLY' : 'MID',
        requiredBy: card.name,
        availableSupply,
        reliableSupply,
        requiredAt: {
          turn,
          probability
        },
        status,
        action
      });
    }

    return {
      isSatisfied,
      demands: ledgerEntries,
      failureReasons
    };
  }
}
