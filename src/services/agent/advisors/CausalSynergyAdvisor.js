/**
 * CAUSAL SYNERGY ADVISOR — SPECIALIZED DIAGNOSTIC INSTRUMENT
 * 
 * Evaluates directed capability relationships (ENABLES, AMPLIFIES, PROTECTS, CONVERTS)
 * on directed causal synergy graphs.
 * Zero hardcoded card names — parses raw Scryfall capabilities & Oracle rules text.
 * 
 * Pure Diagnostic Instrument Contract:
 * - Does NOT return aggregate numeric scores (+120).
 * - Returns structured qualitative report: { status: 'CAUSAL_FIT'|'NO_FIT'|'REDUNDANT', causalRole, nodeState, evidence }
 * - Does NOT mutate DeckState.
 */

import { parseSemanticCard, DEMAND_NECESSITY } from '../../semanticCardParser.js';

export class CausalSynergyAdvisor {
  /**
   * Evaluates directed causal graph synergy and Causal Economy Infrastructure fit for candidate card against deckState
   */
  static evaluate(card, deckState, contract = {}) {
    if (!card || !card.name) {
      return { status: 'NO_FIT', causalRole: 'NONE', evidence: ['Invalid card'] };
    }

    const parsedCandidate = parseSemanticCard(card);
    const oracleText = (card.oracle_text || card.oracleText || card.text || '').replace(/\([^)]*\)/g, '').toLowerCase();
    const typeLine = (card.type_line || card.typeLine || '').toLowerCase();
    const cardName = card.name.toLowerCase();

    const evidence = [];
    let causalRole = 'NONE';
    let status = 'NO_FIT';
    let addedCapabilities = [];

    // ─────────────────────────────────────────────────────────────────────────
    // CAUSAL ECONOMY EVALUATION (Supplies, Demands, SupplyPath & Temporal Availability)
    // ─────────────────────────────────────────────────────────────────────────
    const ledger = deckState.infrastructureLedger || {};
    const strategicPlanFlavor = (deckState.intentPackage?.engineFlavor || deckState.archetype || '').toLowerCase();

    for (const demand of parsedCandidate.demands) {
      const ledgerKey = deckState.mapResourceToLedgerKey ? deckState.mapResourceToLedgerKey(demand.resource) : 'CREATURE_FODDER';
      const infra = ledger[ledgerKey] || { usable: 0, reliable: 0, raw: 0 };
      
      // Calculate Usable vs Raw Supply (e.g. non-threat fodder vs heavy threats)
      const usableSupply = infra.usable;
      const reliableSupply = infra.reliable;
      const targetTurn = demand.targetTurn || Math.max(1, parsedCandidate.cmc);
      
      // Temporal Availability P(Resource | Turn)
      const isTemporallyAvailable = reliableSupply >= demand.quantity || usableSupply >= demand.quantity;

      if (isTemporallyAvailable) {
        evidence.push(`DEMAND_SATISFIED: Resource [${demand.resource}] supported by ${usableSupply} usable supply (${reliableSupply} reliable by Turn ${targetTurn})`);
      } else {
        // Demanda no satisfecha actualmente. Verificar si está autorizada por el plan.
        const isAuthorizedByPlan = strategicPlanFlavor.includes(demand.resource.toLowerCase().split('_')[0]) ||
                                   strategicPlanFlavor.includes('sac') ||
                                   strategicPlanFlavor.includes('artifact') ||
                                   strategicPlanFlavor.includes('graveyard') ||
                                   strategicPlanFlavor.includes('combo') ||
                                   strategicPlanFlavor.includes('synergy');

        if (isAuthorizedByPlan) {
          const poId = `PO_INFRA_${Date.now()}`;
          return {
            status: 'DEFERRED',
            veto: false,
            demandState: {
              state: 'DEFERRED',
              demand: demand.resource,
              necessity: demand.necessity,
              authorization: 'STRATEGIC_PLAN',
              resolutionPath: `INFRASTRUCTURE_PACKAGE_${demand.resource}`,
              proofObligationId: poId,
              mustResolveBefore: 'COMMIT',
              status: 'OPEN'
            },
            causalRole: 'CONSUMER',
            addedCapabilities: [],
            evidence: [`DEFERRED: Resource [${demand.resource}] not yet at target density (${usableSupply}/${demand.quantity}), but authorized by Strategic Plan. Registered obligation ${poId}.`]
          };
        } else if (demand.necessity === DEMAND_NECESSITY.HARD) {
          return {
            status: 'UNFULFILLED_DEPENDENCY',
            veto: true,
            demandState: {
              state: 'UNFULFILLED',
              demand: demand.resource,
              necessity: demand.necessity,
              reason: 'UNAUTHORIZED_HARD_DEMAND'
            },
            causalRole: 'NONE',
            addedCapabilities: [],
            evidence: [`VETO: Card demands [${demand.resource}] (HARD_DEMAND), but current deck usable supply is ${usableSupply} and Plan does not authorize building this infrastructure.`]
          };
        }
      }
    }

    // 1. Check ENABLES capability (e.g. SacOutlet, Looting, Ramp, Card Draw, Evasive Enablers)
    if (oracleText.includes('flying') || oracleText.includes('can\'t be blocked') || oracleText.includes('shadow') || oracleText.includes('skulk') || oracleText.includes('menace')) {
      causalRole = causalRole === 'NONE' ? 'ENABLES' : causalRole;
      addedCapabilities.push('EVASIVE_ENABLER', 'EVASIVE_T1');
      evidence.push('Provides Evasive Enabler capability (ENABLES Ninjutsu / Combat Triggers)');
    }
    if (oracleText.includes('sacrifice a creature') || oracleText.includes('sacrifice another creature')) {
      causalRole = 'ENABLES';
      addedCapabilities.push('SAC_OUTLET');
      evidence.push('Provides Sacrifice Outlet capability (ENABLES Death triggers)');
    } else if (oracleText.includes('draw a card') || oracleText.includes('draw cards') || oracleText.includes('draw two') || oracleText.includes('look at the top') || oracleText.includes('scry') || oracleText.includes('surveil') || oracleText.includes('investigate')) {
      causalRole = causalRole === 'NONE' ? 'ENABLES' : causalRole;
      addedCapabilities.push('CARD_ADVANTAGE', 'CARD_FLOW');
      evidence.push('Provides Card Velocity / Flow capability (ENABLES consistency & resource replenishment)');
    } else if (oracleText.includes('add {') || oracleText.includes('search your library for a land') || oracleText.includes('additional land')) {
      causalRole = 'ENABLES';
      addedCapabilities.push('PRODUCES_MANA');
      evidence.push('Provides Mana Acceleration capability (ENABLES high-CMC spells)');
    }

    // 2. Check CONVERTS / DIRECT_DAMAGE / DEATH_PAYOFF / FINISHER capability
    if (oracleText.includes('deals ') && (oracleText.includes('any target') || oracleText.includes('player') || oracleText.includes('opponent') || oracleText.includes('each target'))) {
      causalRole = causalRole === 'NONE' ? 'CONVERTS' : causalRole;
      addedCapabilities.push('DIRECT_DAMAGE', 'PLAYER_REACH');
      evidence.push('Provides Direct Face Damage Reach (CONVERTS Mana into Lethal Life Reduction)');
    }
    if (oracleText.includes('whenever a creature dies') || oracleText.includes('whenever another creature dies')) {
      causalRole = causalRole === 'NONE' ? 'CONVERTS' : causalRole;
      addedCapabilities.push('DEATH_PAYOFF');
      evidence.push('Provides Death Payoff capability (CONVERTS Death Events into Victory Progress)');
    }

    // 3. Check DISRUPTS / REMOVAL / INTERACTION capability
    if (oracleText.includes('destroy') || oracleText.includes('exile') || oracleText.includes('discards') || oracleText.includes('discard a card') || oracleText.includes('counter target') || oracleText.includes('-x/-x') || (oracleText.includes('deals ') && oracleText.includes('target creature'))) {
      if (causalRole === 'NONE') causalRole = 'DISRUPTS';
      addedCapabilities.push('INTERACTION', 'CHEAP_REMOVAL');
      evidence.push('Provides Interaction / Threat Neutralization (DISRUPTS opponent board development)');
    }

    // 4. Check AMPLIFIES / TRIBAL_ANTHEM & ENGINE SYNERGY capability
    const targetTribe = (deckState.primaryTribe || '').toLowerCase();
    const boostKeywords = deckState.intentPackage?.boostKeywords || [];
    const engineFlavor = (deckState.intentPackage?.engineFlavor || '').toLowerCase();
    const combinedText = `${cardName} ${typeLine} ${oracleText}`;

    if (targetTribe) {
      if (typeLine.includes(targetTribe)) {
        causalRole = causalRole === 'NONE' ? 'AMPLIFIES' : causalRole;
        addedCapabilities.push('TRIBAL_MEMBER');
        evidence.push(`Matches primary tribal engine [${targetTribe}]`);
      }
      if (oracleText.includes(`${targetTribe} get +`) || 
          oracleText.includes('creatures you control get +') || 
          oracleText.includes(`other ${targetTribe}`) || 
          oracleText.includes(`${targetTribe} spells`) || 
          oracleText.includes(`${targetTribe} card`) || 
          oracleText.includes(`a ${targetTribe}`)) {
        causalRole = 'AMPLIFIES';
        addedCapabilities.push('ANTHEM_PAYOFF');
        addedCapabilities.push('ENGINE_SYNERGY');
        evidence.push(`Provides Tribal Cost Reduction / Synergy for [${targetTribe}]`);
      }
    }

    // Check Boost Keywords & Engine Flavor Synergy
    if (Array.isArray(boostKeywords) && boostKeywords.length > 0) {
      const matchedKw = boostKeywords.filter(kw => {
        if (!kw || typeof kw !== 'string') return false;
        const kwLower = kw.toLowerCase().trim();
        if (kwLower.length <= 3 || kwLower === 'damage to' || kwLower === 'deals') return false;
        return combinedText.includes(kwLower);
      });
      if (matchedKw.length > 0) {
        if (causalRole === 'NONE') causalRole = 'AMPLIFIES';
        addedCapabilities.push('ENGINE_SYNERGY');
        evidence.push(`Matches Oracle Tuner keywords: [${matchedKw.slice(0, 3).join(', ')}]`);
      }
    }

    // 5. Check PROTECTS capability
    if (oracleText.includes('hexproof') || oracleText.includes('indestructible') || oracleText.includes('counter target spell') || oracleText.includes('ward')) {
      if (causalRole === 'NONE') causalRole = 'PROTECTS';
      addedCapabilities.push('PROTECTION');
      evidence.push('Provides Protection / Counter capability for core engine');
    }

    // 6. Check BOARD_DEVELOPMENT capability (Creatures & Threat Permanents)
    if (typeLine.includes('creature') || typeLine.includes('planeswalker')) {
      if (causalRole === 'NONE') causalRole = 'DEVELOP_BOARD';
      addedCapabilities.push('BOARD_PRESENCE');
      evidence.push('Provides Permanent Board Presence & Combat Potential');
    }

    if (causalRole !== 'NONE') {
      status = 'CAUSAL_FIT';
    }

    // 5. Dynamic Assembly Probability & Redundancy Check (Adjusted by Tutors & Cantrips)
    const existingCards = Array.from(deckState.cards.values());
    const cantripCount = existingCards.filter(c => {
      const o = (c.oracle_text || c.card?.oracle_text || '').toLowerCase();
      return o.includes('draw a card') || o.includes('look at the top') || o.includes('search your library for');
    }).reduce((sum, c) => sum + (c.quantity || 1), 0);

    // Cantrips and tutors increase virtual card density by 1.25x - 1.5x
    const assemblyDensityFactor = 1.0 + (cantripCount * 0.05);

    if (addedCapabilities.includes('DEATH_PAYOFF')) {
      const existingPayoffs = existingCards.filter(c => (c.card?.oracle_text || '').toLowerCase().includes('whenever a creature dies')).reduce((sum, c) => sum + (c.quantity || 1), 0);
      const effectivePayoffs = Math.round(existingPayoffs * assemblyDensityFactor);
      
      if (effectivePayoffs >= 8 && addedCapabilities.length === 1) {
        status = 'REDUNDANT';
        evidence.push(`Death Payoff node is SATIATED (${existingPayoffs} physical cards, ${effectivePayoffs} effective density via tutors/cantrips)`);
      }
    }

    return {
      status,
      causalRole,
      addedCapabilities,
      assemblyDensityFactor,
      evidence
    };
  }
}
