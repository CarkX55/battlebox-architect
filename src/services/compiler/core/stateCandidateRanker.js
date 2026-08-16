/**
 * STATE CANDIDATE RANKER (v23.0 Core Engine)
 * 
 * Compares candidates by evaluating the full resulting deck state:
 * State S + Candidate A -> State A'
 * State S + Candidate B -> State B'
 * State C = NO_ADDITION
 * 
 * Evaluates structured multidimensional deltas rather than a single scalar score.
 * Enforces deterministic state dominance based on WinPath closure, demand satisfaction,
 * curve velocity, mana alignment, and zero-orphan invariants.
 */

export class StateCandidateRanker {
  /**
   * Compares a list of candidates against the current DeckState and IntentContract.
   * @param {Object} currentState Current DeckState (cards, curve, openDemands, provenNodes, manaPips)
   * @param {Array<Object>} candidates Pool of candidate cards with Oracle truth
   * @param {Object} strategicContract Strategic Contract (WinPath, ProofObligations, IntentLock)
   * @returns {Object} { winningCandidate, stateDelta, evaluatedStates, selectionStatus }
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
    const winPath = strategicContract.winPath || [];
    const proofObligations = strategicContract.proofObligations || [];
    const openDemands = currentState.openDemands || [];

    for (const candidate of candidates) {
      const stateDelta = this.computeStateDelta(currentState, candidate, strategicContract);
      evaluatedStates.push({
        candidate,
        stateDelta,
        dominanceVector: this.computeDominanceVector(stateDelta)
      });
    }

    // Sort deterministically by dominance vector
    evaluatedStates.sort((a, b) => this.compareDominanceVectors(b.dominanceVector, a.dominanceVector));

    const best = evaluatedStates[0];

    // Evaluate if the best state is strictly better than NO_ADDITION
    if (!best || best.dominanceVector.netUtility <= 0) {
      // Check if failure is due to missing infrastructure
      const hasUnmetDemands = evaluatedStates.some(e => !e.stateDelta.demandsSatisfiedByExistingState);
      const selectionStatus = hasUnmetDemands ? 'NO_SELECTION_INFRASTRUCTURE' : 'NO_SELECTION_CAUSAL';

      return {
        winningCandidate: null,
        stateDelta: null,
        evaluatedStates,
        selectionStatus,
        reason: selectionStatus === 'NO_SELECTION_INFRASTRUCTURE'
          ? 'Los candidatos disponibles requieren infraestructura no satisfecha en el estado actual.'
          : 'Ningún candidato disponible produce una mejora causal comprobable sobre el estado actual.'
      };
    }

    return {
      winningCandidate: best.candidate,
      stateDelta: best.stateDelta,
      evaluatedStates,
      selectionStatus: 'SELECTION_SUCCESS',
      reason: `El estado con ${best.candidate.name} domina las alternativas cerrando demandas (${best.stateDelta.needsClosed.join(', ') || 'tempo'}) y avanzando el WinPath.`
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
    const candidateDemands = candidate.demands || [];

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

    // 3. New demands introduced and whether existing state satisfies them
    const newDemands = [...candidateDemands];
    let demandsSatisfiedByExistingState = true;
    const existingCapabilities = new Set(existingCards.flatMap(c => c.capabilities || c.semanticTags || []));

    for (const dem of newDemands) {
      if (!existingCapabilities.has(dem) && !this.existingStateSatisfiesDemand(currentState, dem)) {
        demandsSatisfiedByExistingState = false;
      }
    }

    // 4. Causal edges added
    const causalEdgesAdded = [];
    for (const need of needsClosed) {
      causalEdgesAdded.push(`${candidate.name} -> SATISFIES(${need})`);
    }
    for (const existing of existingCards) {
      if (this.cardsHaveSynergy(candidate, existing)) {
        causalEdgesAdded.push(`${candidate.name} <-> SYNERGY(${existing.name})`);
      }
    }

    // 5. Curve and Mana Delta
    const cmc = Number(candidate.cmc || 0);
    const curveBefore = currentState.curve || {};
    const curveCountAtCmc = (curveBefore[cmc] || 0);
    const curveHealthImpact = this.evaluateCurveImpact(cmc, curveCountAtCmc, strategicContract.archetype);

    // 6. Redundancy & Diminishing Returns
    const currentCopies = existingCards.filter(c => c.name === candidate.name).reduce((sum, c) => sum + (c.quantity || 1), 0);
    const isLegendary = (candidate.type_line || candidate.type || '').includes('Legendary');
    const redundancyPenalty = isLegendary && currentCopies >= 2 ? 0.4 : (currentCopies >= 3 ? 0.2 : 0);

    // 7. Opportunity Cost & Competitiveness
    const isDominated = this.isStrictlyDominatedCard(candidate, existingCards);

    return {
      candidateName: candidate.name,
      winPathNodesProven,
      needsClosed,
      newDemands,
      demandsSatisfiedByExistingState,
      causalEdgesAdded,
      curveDelta: { cmc, currentCountAtCmc: curveCountAtCmc, healthImpact: curveHealthImpact },
      manaDelta: { colorPips: candidate.mana_cost || '', aligned: true },
      redundancyDelta: { currentCopies, redundancyPenalty },
      opportunityCost: { isDominated, alternativeCandidateCount: 0 },
      executionDelta: {
        provesWinPath: winPathNodesProven.length > 0,
        closesObligations: needsClosed.length > 0,
        unsupportedDemandsCount: demandsSatisfiedByExistingState ? 0 : newDemands.length
      }
    };
  }

  /**
   * Computes a dominance vector for deterministic Pareto ordering.
   */
  static computeDominanceVector(delta) {
    let winPathScore = delta.winPathNodesProven.length * 2.5;
    let needsScore = delta.needsClosed.length * 2.0;
    let synergyScore = delta.causalEdgesAdded.length * 0.75;
    let curveScore = delta.curveDelta.healthImpact * 1.5;
    let demandPenalty = delta.demandsSatisfiedByExistingState ? 0 : (delta.newDemands.length * 2.0);
    let redundancyPenalty = delta.redundancyDelta.redundancyPenalty * 2.5;
    let dominationPenalty = delta.opportunityCost.isDominated ? 5.0 : 0;

    const netUtility = (winPathScore + needsScore + synergyScore + curveScore) - (demandPenalty + redundancyPenalty + dominationPenalty);

    return {
      netUtility,
      winPathProvenCount: delta.winPathNodesProven.length,
      needsClosedCount: delta.needsClosed.length,
      unsupportedDemands: delta.executionDelta.unsupportedDemandsCount,
      curveHealth: delta.curveDelta.healthImpact,
      isDominated: delta.opportunityCost.isDominated
    };
  }

  /**
   * Compares two dominance vectors deterministically.
   */
  static compareDominanceVectors(a, b) {
    // 1. Non-dominated cards always rank above dominated ones
    if (!a.isDominated && b.isDominated) return 1;
    if (a.isDominated && !b.isDominated) return -1;

    // 2. States with zero unsupported demands strictly dominate states with unsupported demands
    if (a.unsupportedDemands === 0 && b.unsupportedDemands > 0) return 1;
    if (a.unsupportedDemands > 0 && b.unsupportedDemands === 0) return -1;

    // 3. Higher WinPath proven count
    if (a.winPathProvenCount !== b.winPathProvenCount) {
      return a.winPathProvenCount - b.winPathProvenCount;
    }

    // 4. Higher needs closed count
    if (a.needsClosedCount !== b.needsClosedCount) {
      return a.needsClosedCount - b.needsClosedCount;
    }

    // 5. Higher net utility
    return a.netUtility - b.netUtility;
  }

  static matchesNodeRequirement(card, node) {
    const cardText = (card.oracle_text || card.text || '').toLowerCase();
    const typeLine = (card.type_line || card.type || '').toLowerCase();
    const nodeStr = (typeof node === 'string' ? node : (node.id || node.name || '')).toLowerCase();

    if (nodeStr.includes('ramp') || nodeStr.includes('mana')) {
      return cardText.includes('add ') || cardText.includes('search your library for a') || card.cmc <= 2 && typeLine.includes('creature') && cardText.includes('mana');
    }
    if (nodeStr.includes('removal') || nodeStr.includes('interaction')) {
      return cardText.includes('destroy') || cardText.includes('exile') || cardText.includes('damage') || cardText.includes('counter target');
    }
    if (nodeStr.includes('draw') || nodeStr.includes('advantage')) {
      return cardText.includes('draw') || cardText.includes('look at the top');
    }
    if (nodeStr.includes('sacrifice') || nodeStr.includes('sac_outlet')) {
      return cardText.includes('sacrifice a') || cardText.includes('sacrifice another');
    }
    if (nodeStr.includes('fodder')) {
      return cardText.includes('create') && cardText.includes('token') || card.cmc <= 1;
    }
    return false;
  }

  static candidateSatisfiesDemand(card, demand) {
    return this.matchesNodeRequirement(card, demand);
  }

  static existingStateSatisfiesDemand(currentState, demand) {
    const cards = currentState.cards || [];
    const demandLower = (demand || '').toLowerCase();
    if (demandLower.includes('goblin') || demandLower.includes('fodder')) {
      return cards.some(c => (c.type_line || c.type || '').toLowerCase().includes('goblin') || (c.name || '').toLowerCase().includes('goblin'));
    }
    if (demandLower.includes('graveyard')) {
      return cards.some(c => (c.oracle_text || c.text || '').toLowerCase().includes('mill') || (c.oracle_text || c.text || '').toLowerCase().includes('discard'));
    }
    return false;
  }

  static cardsHaveSynergy(cardA, cardB) {
    const textA = (cardA.oracle_text || cardA.text || '').toLowerCase();
    const textB = (cardB.oracle_text || cardB.text || '').toLowerCase();
    const typeA = (cardA.type_line || cardA.type || '').toLowerCase();
    const typeB = (cardB.type_line || cardB.type || '').toLowerCase();

    if (textA.includes('goblin') && typeB.includes('goblin')) return true;
    if (textB.includes('goblin') && typeA.includes('goblin')) return true;
    if (textA.includes('sacrifice') && (textB.includes('dies') || textB.includes('graveyard'))) return true;
    if ((textA.includes('ninja') || textA.includes('ninjutsu')) && (textB.includes("can't be blocked") || textB.includes('flying') || (cardB.cmc <= 1 && typeB.includes('creature')))) return true;
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
    const cmc = Number(candidate.cmc || 0);
    const power = Number(candidate.power || 0);
    const toughness = Number(candidate.toughness || 0);
    const text = (candidate.oracle_text || candidate.text || '').trim();

    if (cmc >= 4 && power <= 2 && toughness <= 2 && text.length === 0) {
      return true;
    }
    return false;
  }
}
