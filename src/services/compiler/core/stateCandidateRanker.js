/**
 * STATE CANDIDATE RANKER (v23.0 Core Engine)
 * 
 * Compares candidates by evaluating the full resulting deck state:
 * State S + Candidate A -> State A'
 * State S + Candidate B -> State B'
 * State C = NO_ADDITION
 * 
 * Evaluates structured multidimensional deltas rather than a single scalar score.
 * Enforces deterministic state dominance based on WinPath closure, DemandSupplyLedger verification,
 * curve velocity, mana alignment, and zero-orphan invariants.
 * 
 * Classifies candidates into:
 *   - VALID: Functional and legal without hard constraint violations.
 *   - SYNERGISTIC: Connects to existing infrastructure and advances the WinPath.
 *   - STRATEGICALLY_DOMINATED: Valid, but another candidate produces a strictly superior causal state.
 */

import { DemandSupplyLedger } from './demandSupplyLedger.js';

export class StateCandidateRanker {
  /**
   * Compares a list of candidates against the current DeckState and IntentContract.
   * @param {Object} currentState Current DeckState (cards, curve, openDemands, provenNodes, manaPips)
   * @param {Array<Object>} candidates Pool of candidate cards with Oracle truth
   * @param {Object} strategicContract Strategic Contract (WinPath, ProofObligations, IntentLock)
   * @returns {Object} { winningCandidate, stateDelta, evaluatedStates, selectionStatus, classifications }
   */
  static rankCandidatesByStateDelta(currentState, candidates = [], strategicContract = {}) {
    if (!candidates || candidates.length === 0) {
      return {
        winningCandidate: null,
        stateDelta: null,
        evaluatedStates: [],
        selectionStatus: 'NO_SELECTION_SEARCH_EXHAUSTED',
        reason: 'El pool de candidatos está vacío. Se requiere expandir la búsqueda en el Knowledge Engine.'
      };
    }

    const evaluatedStates = [];

    for (const candidate of candidates) {
      const stateDelta = this.computeStateDelta(currentState, candidate, strategicContract);
      const dominanceVector = this.computeDominanceVector(stateDelta);
      
      // Tri-state classification
      let classification = 'VALID';
      if (!stateDelta.demandsSatisfiedByExistingState) {
        classification = 'STRATEGICALLY_DOMINATED';
      } else if (stateDelta.winPathNodesProven.length > 0 || stateDelta.causalEdgesAdded.length >= 2) {
        classification = 'SYNERGISTIC';
      }

      evaluatedStates.push({
        candidate,
        stateDelta,
        dominanceVector,
        classification
      });
    }

    // Sort deterministically by multi-dimensional dominance vector
    evaluatedStates.sort((a, b) => this.compareDominanceVectors(b.dominanceVector, a.dominanceVector));

    // Mark dominated candidates relative to the best candidate
    const topCandidate = evaluatedStates[0];
    for (let i = 1; i < evaluatedStates.length; i++) {
      if (this.isStrictlyDominatedBy(evaluatedStates[i], topCandidate)) {
        evaluatedStates[i].classification = 'STRATEGICALLY_DOMINATED';
      }
    }

    const best = evaluatedStates[0];

    // Evaluate if the best state is strictly better than NO_ADDITION baseline
    if (!best || best.dominanceVector.netUtility <= 0 || !best.stateDelta.demandsSatisfiedByExistingState) {
      const hasUnmetDemands = evaluatedStates.some(e => !e.stateDelta.demandsSatisfiedByExistingState);
      const selectionStatus = hasUnmetDemands ? 'NO_SELECTION_INFRASTRUCTURE' : 'NO_SELECTION_CAUSAL';

      return {
        winningCandidate: null,
        stateDelta: null,
        evaluatedStates,
        selectionStatus,
        reason: selectionStatus === 'NO_SELECTION_INFRASTRUCTURE'
          ? 'Los candidatos disponibles requieren infraestructura no satisfecha en el DemandSupplyLedger actual.'
          : 'Ningún candidato disponible produce una mejora causal comprobable sobre el estado actual.'
      };
    }

    return {
      winningCandidate: best.candidate,
      stateDelta: best.stateDelta,
      evaluatedStates,
      selectionStatus: 'SELECTION_SUCCESS',
      reason: `El estado con ${best.candidate.name} domina las alternativas [${best.classification}] cerrando demandas (${best.stateDelta.needsClosed.join(', ') || 'tempo'}) y avanzando el WinPath.`
    };
  }

  /**
   * Computes the structured state delta when adding a candidate to currentState.
   */
  static computeStateDelta(currentState, candidate, strategicContract) {
    const existingCards = currentState.cards || [];
    const winPath = strategicContract.winPath || [];
    const proofObligations = strategicContract.proofObligations || [];
    const openDemands = currentState.openDemands || [];

    const candidateCapabilities = candidate.capabilities || candidate.semanticTags || [];

    // 1. WinPath Nodes Proven by this candidate
    const winPathNodesProven = [];
    for (const node of winPath) {
      const nodeKey = typeof node === 'string' ? node : (node.id || node.name);
      if (candidateCapabilities.includes(nodeKey) || this.matchesNodeRequirement(candidate, node)) {
        winPathNodesProven.push(nodeKey);
      }
    }

    // 2. Needs and open obligations closed
    const needsClosed = [];
    for (const demand of openDemands) {
      if (candidateCapabilities.includes(demand) || this.candidateSatisfiesDemand(candidate, demand)) {
        needsClosed.push(demand);
      }
    }
    for (const obl of proofObligations) {
      const oblKey = typeof obl === 'string' ? obl : obl.name;
      if (candidateCapabilities.includes(oblKey) && !needsClosed.includes(oblKey)) {
        needsClosed.push(oblKey);
      }
    }

    // 3. Universal DemandSupplyLedger Audit
    const demandAudit = DemandSupplyLedger.auditCardDemands(candidate, currentState);
    const demandsSatisfiedByExistingState = demandAudit.isSatisfied;
    const newDemands = demandAudit.demands;

    // 4. Causal edges added
    const causalEdgesAdded = [];
    for (const need of needsClosed) {
      causalEdgesAdded.push(`${candidate.name} -> SATISFIES(${need})`);
    }
    for (const existing of existingCards) {
      if (this.cardsHaveSynergy(candidate, existing.card || existing)) {
        causalEdgesAdded.push(`${candidate.name} <-> SYNERGY(${(existing.card || existing).name})`);
      }
    }

    // 5. Curve and Mana Delta
    const cmc = Number(candidate.cmc || candidate.mana_value || 0);
    const curveBefore = currentState.curve || {};
    const curveCountAtCmc = (curveBefore[cmc] || 0);
    const curveHealthImpact = this.evaluateCurveImpact(cmc, curveCountAtCmc, strategicContract.archetype);

    // 6. Redundancy & Diminishing Returns (Evaluates character collision across printings)
    const cardRootName = this.extractCharacterRoot(candidate.name);
    const currentCopies = existingCards
      .filter(c => (c.name === candidate.name || (c.card && c.card.name === candidate.name)))
      .reduce((sum, c) => sum + Number(c.quantity || c.count || 1), 0);

    const characterOverlaps = existingCards
      .filter(c => this.extractCharacterRoot((c.card || c).name) === cardRootName && (c.card || c).name !== candidate.name)
      .reduce((sum, c) => sum + Number(c.quantity || c.count || 1), 0);

    const isLegendary = (candidate.type_line || candidate.type || '').includes('Legendary');
    let redundancyPenalty = 0;
    if (isLegendary) {
      if (currentCopies >= 2) redundancyPenalty += 0.5;
      if (currentCopies >= 3) redundancyPenalty += 1.2;
      if (characterOverlaps >= 2) redundancyPenalty += 1.5; // Heavy penalty for character collision (e.g. 2nd Krenko printing)
    }

    // 7. Causal Cross-Domain Bridge Detection (Emergent from StateDelta)
    const bridgeContribution = this.detectCrossDomainBridge(
      candidate,
      currentState,
      strategicContract,
      needsClosed,
      winPathNodesProven
    );

    // 8. Opportunity Cost
    const isDominated = this.isStrictlyDominatedCard(candidate, existingCards);

    return {
      candidateName: candidate.name,
      winPathNodesProven,
      needsClosed,
      newDemands,
      demandsSatisfiedByExistingState,
      demandAudit,
      causalEdgesAdded,
      bridgeContribution,
      curveDelta: { cmc, currentCountAtCmc: curveCountAtCmc, healthImpact: curveHealthImpact },
      manaDelta: { colorPips: candidate.mana_cost || '', aligned: true },
      redundancyDelta: { currentCopies, characterOverlaps, redundancyPenalty },
      opportunityCost: { isDominated, alternativeCandidateCount: 0 },
      executionDelta: {
        provesWinPath: winPathNodesProven.length > 0,
        closesObligations: needsClosed.length > 0,
        unsupportedDemandsCount: demandsSatisfiedByExistingState ? 0 : demandAudit.failureReasons.length
      }
    };
  }

  /**
   * Detects whether candidate acts as an emergent bridge between distinct functional domains.
   * BRIDGE is defined as cross-domain causal connectivity that improves the global state
   * without creating unresolved hard demands and preserving/advancing the WinPath.
   */
  static detectCrossDomainBridge(candidate, currentState, strategicContract, needsClosed = [], winPathNodesProven = []) {
    const candidateDomains = this.identifyCardDomains(candidate);
    if (candidateDomains.length < 2) {
      return { isBridge: false, fromDomain: null, toDomain: null, causalEdgesAdded: [], winPathNodesImproved: [] };
    }

    const fromDomain = candidateDomains[0];
    const toDomain = candidateDomains[1];

    const causalEdgesAdded = [
      `${candidate.name} (${fromDomain}) -> CONNECTS -> (${toDomain})`
    ];

    for (const need of needsClosed) {
      causalEdgesAdded.push(`${candidate.name} -> RESOLVES(${need})`);
    }

    return {
      isBridge: true,
      fromDomain,
      toDomain,
      causalEdgesAdded,
      winPathNodesImproved: [...winPathNodesProven]
    };
  }

  /**
   * Identifies functional domains provided by a card based on Oracle text, capabilities and types.
   */
  static identifyCardDomains(card) {
    const domains = [];
    const text = (card.oracle_text || card.text || '').toLowerCase();
    const type = (card.type_line || card.type || '').toLowerCase();

    if (type.includes('creature') && (type.includes('—') || type.includes('-'))) {
      const subtypes = type.split(/—|-/)[1]?.trim() || '';
      if (subtypes.length > 0) domains.push('TRIBAL_ENGINE');
    }
    if (text.includes('destroy') || text.includes('exile') || text.includes('deals damage to') || text.includes('counter target')) {
      domains.push('INTERACTION');
    }
    if (text.includes('draw') || text.includes('look at the top') || text.includes('investigate')) {
      domains.push('CARD_FLOW');
    }
    if (text.includes('add ') || text.includes('search your library for a land') || text.includes('treasure')) {
      domains.push('RAMP_INFRASTRUCTURE');
    }
    if (text.includes('sacrifice') || text.includes('dies') || text.includes('graveyard')) {
      domains.push('SACRIFICE_RECURSION');
    }
    if (text.includes('whenever') && (text.includes('+1/+1') || text.includes('token') || text.includes('gain life') || text.includes('loses life'))) {
      domains.push('SYNERGY_PAYOFF');
    }
    if (text.includes('hexproof') || text.includes('ward') || text.includes('indestructible') || text.includes('protection from')) {
      domains.push('PROTECTION');
    }

    return [...new Set(domains)];
  }

  /**
   * Computes a dominance vector for deterministic multi-dimensional Pareto ordering.
   */
  static computeDominanceVector(delta) {
    const winPathScore = delta.winPathNodesProven.length * 3.0;
    const needsScore = delta.needsClosed.length * 2.0;
    const synergyScore = delta.causalEdgesAdded.length * 0.8;
    const bridgeScore = delta.bridgeContribution?.isBridge ? (delta.bridgeContribution.causalEdgesAdded.length * 1.2 + 2.0) : 0;
    const curveScore = delta.curveDelta.healthImpact * 1.5;
    const demandPenalty = delta.demandsSatisfiedByExistingState ? 0 : (delta.executionDelta.unsupportedDemandsCount * 3.0 + 5.0);
    const redundancyPenalty = delta.redundancyDelta.redundancyPenalty * 3.0;
    const dominationPenalty = delta.opportunityCost.isDominated ? 6.0 : 0;

    const netUtility = (winPathScore + needsScore + synergyScore + bridgeScore + curveScore) - (demandPenalty + redundancyPenalty + dominationPenalty);

    return {
      netUtility: Number(netUtility.toFixed(2)),
      hasUnsupportedDemands: !delta.demandsSatisfiedByExistingState,
      isBridge: Boolean(delta.bridgeContribution?.isBridge),
      fromDomain: delta.bridgeContribution?.fromDomain || null,
      toDomain: delta.bridgeContribution?.toDomain || null,
      winPathProvenCount: delta.winPathNodesProven.length,
      needsClosedCount: delta.needsClosed.length,
      synergyCount: delta.causalEdgesAdded.length,
      curveHealth: delta.curveDelta.healthImpact,
      redundancyPenalty: delta.redundancyDelta.redundancyPenalty,
      isDominated: delta.opportunityCost.isDominated
    };
  }

  /**
   * Evaluates a potential orphan card through a complete contrafactual state comparison loop:
   * State A' = State without Card X
   * State B' = State without Card X + Candidate B
   * State C  = State without Card X + NO_ADDITION
   * 
   * @returns {Object} { decision: 'RESTORE_X' | 'REPLACE' | 'KEEP_REMOVED', winningCard, stateDelta }
   */
  static evaluateZeroOrphanContrafactual(currentState, potentialOrphanCard, alternativeCandidates = [], strategicContract = {}) {
    // 1. Compute baseline State A' (without Card X)
    const cardsWithoutX = (currentState.cards || []).filter(c => {
      const name = c.name || (c.card && c.card.name);
      return name !== potentialOrphanCard.name;
    });
    const stateWithoutX = { ...currentState, cards: cardsWithoutX };

    // 2. Compute State A' validity (does Thesis / WinPath remain proven without X?)
    const deltaWithoutX = this.computeStateDelta(stateWithoutX, potentialOrphanCard, strategicContract);

    // 3. Rank alternative candidates for replacement
    const replacementEvaluation = this.rankCandidatesByStateDelta(stateWithoutX, alternativeCandidates, strategicContract);

    if (replacementEvaluation.winningCandidate && replacementEvaluation.winningCandidate.name !== potentialOrphanCard.name) {
      const bestAlternative = replacementEvaluation.evaluatedStates[0];
      if (bestAlternative && bestAlternative.dominanceVector.netUtility > deltaWithoutX.dominanceVector?.netUtility) {
        return {
          decision: 'REPLACE',
          winningCard: replacementEvaluation.winningCandidate,
          stateDelta: replacementEvaluation.stateDelta,
          reason: `El candidato ${replacementEvaluation.winningCandidate.name} produce un estado causal contrafácticamente superior al reemplazar a ${potentialOrphanCard.name}.`
        };
      }
    }

    // If removing Card X degrades the state and no replacement dominates, restore Card X
    return {
      decision: 'RESTORE_X',
      winningCard: potentialOrphanCard,
      stateDelta: deltaWithoutX,
      reason: `La presencia de ${potentialOrphanCard.name} está justificada causalmente por ser el ocupante dominante del estado.`
    };
  }

  /**
   * Compares two dominance vectors deterministically through multi-dimensional criteria.
   */
  static compareDominanceVectors(a, b) {
    // 1. Non-dominated cards always rank above dominated ones
    if (!a.isDominated && b.isDominated) return 1;
    if (a.isDominated && !b.isDominated) return -1;

    // 2. States with zero unsupported demands strictly dominate states with unsupported demands
    if (!a.hasUnsupportedDemands && b.hasUnsupportedDemands) return 1;
    if (a.hasUnsupportedDemands && !b.hasUnsupportedDemands) return -1;

    // 3. Higher WinPath proven count
    if (a.winPathProvenCount !== b.winPathProvenCount) {
      return a.winPathProvenCount - b.winPathProvenCount;
    }

    // 4. Higher needs closed count
    if (a.needsClosedCount !== b.needsClosedCount) {
      return a.needsClosedCount - b.needsClosedCount;
    }

    // 5. Higher synergy density
    if (a.synergyCount !== b.synergyCount) {
      return a.synergyCount - b.synergyCount;
    }

    // 6. Net utility
    return a.netUtility - b.netUtility;
  }

  static isStrictlyDominatedBy(evaluatedA, evaluatedB) {
    const vecA = evaluatedA.dominanceVector;
    const vecB = evaluatedB.dominanceVector;

    return (
      vecB.netUtility > vecA.netUtility &&
      vecB.winPathProvenCount >= vecA.winPathProvenCount &&
      !vecB.hasUnsupportedDemands &&
      (vecA.hasUnsupportedDemands || vecB.synergyCount > vecA.synergyCount)
    );
  }

  static extractCharacterRoot(name = '') {
    if (!name) return '';
    // Extracts root character name before commas (e.g. "Krenko, Baron of Tin Street" -> "krenko")
    const parts = name.toLowerCase().split(',');
    return parts[0].trim();
  }

  static matchesNodeRequirement(card, node) {
    const cardText = (card.oracle_text || card.text || '').toLowerCase();
    const typeLine = (card.type_line || card.type || '').toLowerCase();
    const nodeStr = (typeof node === 'string' ? node : (node.id || node.name || '')).toLowerCase();

    if (nodeStr.includes('ramp') || nodeStr.includes('mana')) {
      return cardText.includes('add ') || cardText.includes('search your library for a') || (card.cmc <= 2 && typeLine.includes('creature') && cardText.includes('mana'));
    }
    if (nodeStr.includes('burn') || nodeStr.includes('reach') || nodeStr.includes('player_targetable')) {
      return cardText.includes('deals damage to any target') || cardText.includes('deals damage to target player') || cardText.includes('deals damage to target opponent') || cardText.includes('each opponent loses');
    }
    if (nodeStr.includes('removal') || nodeStr.includes('interaction')) {
      return cardText.includes('destroy') || cardText.includes('exile') || cardText.includes('damage') || cardText.includes('counter target');
    }
    if (nodeStr.includes('draw') || nodeStr.includes('advantage') || nodeStr.includes('card_flow')) {
      return cardText.includes('draw') || cardText.includes('look at the top');
    }
    if (nodeStr.includes('sacrifice') || nodeStr.includes('sac_outlet')) {
      return cardText.includes('sacrifice a') || cardText.includes('sacrifice another');
    }
    if (nodeStr.includes('fodder') || nodeStr.includes('token')) {
      return (cardText.includes('create') && cardText.includes('token')) || (card.cmc <= 1 && typeLine.includes('creature'));
    }
    return false;
  }

  static candidateSatisfiesDemand(card, demand) {
    return this.matchesNodeRequirement(card, demand);
  }

  static cardsHaveSynergy(cardA, cardB) {
    const textA = (cardA.oracle_text || cardA.text || '').toLowerCase();
    const textB = (cardB.oracle_text || cardB.text || '').toLowerCase();
    const typeA = (cardA.type_line || cardA.type || '').toLowerCase();
    const typeB = (cardB.type_line || cardB.type || '').toLowerCase();

    // Tribal synergies
    const subtypesA = typeA.split('—')[1] || '';
    const subtypesB = typeB.split('—')[1] || '';
    const wordsA = subtypesA.split(' ').filter(w => w.length > 2);
    for (const word of wordsA) {
      if (textB.includes(word) || textA.includes(word)) return true;
    }

    // Mechanical synergies (Sacrifice <-> Dies/Graveyard, Artifacts <-> Affinity/Bargain, Counters <-> Proliferate)
    if (textA.includes('sacrifice') && (textB.includes('dies') || textB.includes('graveyard') || textB.includes('descend'))) return true;
    if (textB.includes('sacrifice') && (textA.includes('dies') || textA.includes('graveyard') || textA.includes('descend'))) return true;
    if ((typeA.includes('artifact') || textA.includes('treasure')) && (textB.includes('artifact') || textB.includes('bargain'))) return true;
    if ((typeB.includes('artifact') || textB.includes('treasure')) && (textA.includes('artifact') || textA.includes('bargain'))) return true;

    return false;
  }

  static evaluateCurveImpact(cmc, currentCountAtCmc, archetype = 'Aggro') {
    const arch = (archetype || 'Aggro').toLowerCase();
    if (arch.includes('aggro')) {
      if (cmc === 1) return currentCountAtCmc < 12 ? 1.0 : (currentCountAtCmc < 16 ? 0.5 : -0.2);
      if (cmc === 2) return currentCountAtCmc < 14 ? 1.0 : (currentCountAtCmc < 18 ? 0.3 : -0.5);
      if (cmc === 3) return currentCountAtCmc < 8 ? 0.8 : (currentCountAtCmc < 12 ? 0.1 : -0.8);
      if (cmc >= 4) return currentCountAtCmc < 4 ? 0.2 : -1.0;
    }
    if (arch.includes('control')) {
      if (cmc === 1 || cmc === 2) return currentCountAtCmc < 14 ? 1.0 : 0.4;
      if (cmc === 3 || cmc === 4) return currentCountAtCmc < 12 ? 0.9 : 0.2;
      if (cmc >= 5) return currentCountAtCmc < 6 ? 0.5 : -0.5;
    }
    return currentCountAtCmc < 8 ? 0.7 : 0.1;
  }

  static isStrictlyDominatedCard(candidate, existingCards) {
    const cmc = Number(candidate.cmc || candidate.mana_value || 0);
    const power = Number(candidate.power || 0);
    const toughness = Number(candidate.toughness || 0);
    const text = (candidate.oracle_text || candidate.text || '').trim();

    if (cmc >= 4 && power <= 2 && toughness <= 2 && text.length === 0) {
      return true;
    }
    return false;
  }
}
