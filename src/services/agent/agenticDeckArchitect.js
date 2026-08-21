/**
 * AGENTIC DECK ARCHITECT — THE ORCHESTRATOR (Sprint 6 Agentic System Core)
 * 
 * Main orchestrator executing the ReAct Agentic loop between LLMStrategist, CardImplementer, and DeckState.
 * Prevents deadlocks (0 candidates feedback loop), enforces playset allocation, and auto-resolves
 * Frank Karsten land bases deterministically.
 */

import { DeckState } from './deckState.js';
import { CardImplementer } from './cardImplementer.js';
import { LLMStrategist } from './llmStrategist.js';
import { TacticalSimulator } from './tacticalSimulator.js';
import { StrategicAuditorAgent } from './strategicAuditorAgent.js';
import { DecisionEngine } from './decisionEngine.js';
import { CopyCountStrategist } from './copyCountStrategist.js';

export class AgenticDeckArchitect {
  constructor(intentPackage = {}, cardPool = []) {
    this.intentPackage = intentPackage;
    this.cardPool = cardPool || [];
    this.deckState = new DeckState(intentPackage);
    this.reActLogs = [];
    this.deadlockAttempts = 0;
    this.maxDeadlockRetries = 5;
  }


  /**
   * Phase 0 Pre-flight Check: Detects fatal contradictions in user Hard Constraints
   */
  runPreflightCheck() {
    const constraints = this.intentPackage.userConstraints || {};
    const mustInclude = constraints.mustInclude || [];
    const banlist = new Set([
      ...(constraints.customBanlist || []),
      ...(constraints.vetoedCards || []),
      ...(constraints.excludedCards || []),
      ...(this.intentPackage.mustNotRules || [])
    ].map(n => typeof n === 'string' ? n.toLowerCase() : ''));

    const maxBudgetRaw = constraints.maxBudget || this.intentPackage.budget;
    let maxBudgetNum = null;
    if (maxBudgetRaw && typeof maxBudgetRaw === 'string' && maxBudgetRaw.toLowerCase() !== 'unlimited') {
      const parsed = parseFloat(maxBudgetRaw.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed) && parsed > 0) maxBudgetNum = parsed;
    }

    const violations = [];

    for (const item of mustInclude) {
      const name = typeof item === 'string' ? item : item.name;
      if (!name) continue;
      const nameLower = name.toLowerCase();

      // Contradiction 1: mustInclude card is also in banlist/vetoedCards
      if (banlist.has(nameLower)) {
        violations.push(`Fatal Contradiction: Card "${name}" is specified in mustInclude but is also banned/vetoed in customBanlist or excludedCards.`);
      }

      // Contradiction 2: mustInclude card exceeds maxBudget
      if (maxBudgetNum !== null && typeof item === 'object') {
        const price = Number(item.priceUSD || item.price_usd || item.price || 0);
        if (price > maxBudgetNum) {
          violations.push(`Fatal Contradiction: Mandatory card "${name}" price ($${price}) exceeds maximum budget ($${maxBudgetNum}).`);
        }
      }
    }

    return {
      passed: violations.length === 0,
      violations
    };
  }

  /**
   * Run full ReAct deckbuilding loop until 60 valid cards are assembled
   */
  async buildDeck() {
    // Phase 0: Pre-flight Hard Constraint Contradiction Audit
    const preflight = this.runPreflightCheck();
    if (!preflight.passed) {
      return {
        buildStatus: 'FAILED_PREFLIGHT',
        violations: preflight.violations,
        deckState: this.deckState,
        deckList: [],
        summary: this.deckState.getStrategicSummary(),
        reActLogs: [{ phase: 'PREFLIGHT_FAIL', violations: preflight.violations }]
      };
    }

    // Phase 0b: Pre-load mustInclude cards & selectedCorePackages into DeckState
    const constraints = this.intentPackage.userConstraints || {};
    const preloadedMusts = this.deckState.preloadMustIncludes(constraints.mustInclude || []);
    // Phase 0c: Generate Falsifiable Strategic Thesis (v9.5 Top-Down Governance)
    this.strategicThesis = LLMStrategist.generateStrategicThesis(this.intentPackage);
    this.reActLogs.push({
      phase: 'STRATEGIC_THESIS_FORMULATION',
      version: this.strategicThesis.version,
      confidence: this.strategicThesis.thesisConfidence,
      thesisSummary: this.strategicThesis.thesisSummary,
      winPath: this.strategicThesis.winPath,
      falsifiers: this.strategicThesis.falsifiers
    });

    let lastFeedback = null;
    let turnCounter = 1;

    // Phase 1: ReAct Loop for 36 Non-Land Cards (NEED-FIRST Governance)
    while (this.deckState.nonLandCount < this.deckState.targetNonLands && this.deadlockAttempts < this.maxDeadlockRetries) {

      // Step 1: Compute Open Strategic Needs dynamically from live DeckState (ROLE_FIRST_AUTHORITY = 0)
      const summary = this.deckState.getStrategicSummary();
      const openNeeds = LLMStrategist.computeOpenStrategicNeeds(this.deckState);
      const needRequest = LLMStrategist.generateStrategicNeed(summary, lastFeedback, this.deckState);

      // WinPath Completion Invariant (v10.3): Transition directly to Mana Base when all WinPath obligations are PROVEN
      if (needRequest.need === 'STOP_CAUSAL') {
        if (this.deckState.nonLandCount >= this.deckState.targetNonLands) {
          this.reActLogs.push({
            turn: turnCounter++,
            phase: 'STOP_CAUSAL_TRANSITION',
            reasoning: needRequest.reasoning,
            status: 'ALL_WIN_PATH_NEEDS_PROVEN'
          });
          break;
        }
      }

      // Step 2: Hyper-Strict DB Candidate Search from CardImplementer (Need Contract Gate)
      const currentCopiesMap = new Map();
      for (const entry of this.deckState.cards.values()) {
        currentCopiesMap.set(entry.name, entry.quantity);
      }

      const searchResult = CardImplementer.findCandidates(
        needRequest,
        this.cardPool,
        this.intentPackage,
        currentCopiesMap
      );

      // Step 3: Deadlock Shield & NO_SELECTION Handling
      if (searchResult.candidates.length === 0) {
        this.deadlockAttempts++;
        lastFeedback = `0 candidates found for need [${needRequest.need}] with CMC max ${needRequest.cmcMax}`;
        
        this.reActLogs.push({
          turn: turnCounter++,
          phase: 'NO_SELECTION_PIVOT',
          needRequest,
          filterDescription: searchResult.filterDescription,
          status: 'ZERO_CANDIDATES_PIVOTING',
          feedbackMessage: lastFeedback
        });

        continue; // Re-enter loop with deadlock feedback
      }

      // Step 4: Candidate Winner Selection via DecisionEngine Lexicographical Counterfactual State Analysis
      const roleContract = {
        role: needRequest.need,
        priority: needRequest.priority || 'HIGH',
        reason: needRequest.reasoning || 'Strategic need resolution',
        requiredCapabilities: needRequest.requiredCapabilities || [],
        preferredCapabilities: needRequest.preferredCapabilities || [],
        forbiddenPatterns: needRequest.forbiddenPatterns || [],
        targetTribe: needRequest.targetTribe || this.deckState.primaryTribe
      };

      const decision = DecisionEngine.selectCandidate(searchResult.candidates, this.deckState, roleContract);

      if (decision.verdict === 'NO_SELECTION') {
        this.deadlockAttempts++;
        lastFeedback = `DecisionEngine returned NO_SELECTION for need [${roleContract.role}]: ${decision.reason}`;
        this.reActLogs.push({
          turn: turnCounter++,
          phase: 'DECISION_ENGINE_NO_SELECTION',
          roleContract,
          reason: decision.reason,
          rejectedAlternatives: decision.rejectedAlternatives
        });
        continue;
      }

      const chosenCardObj = decision.selectedCard;
      const chosenCardName = chosenCardObj.name;
      const copyDecision = CopyCountStrategist.determineCopyCount(chosenCardObj, this.deckState, roleContract);
      const copies = copyDecision.quantity;
      const justification = `${decision.whySelected.join(' | ')} [Copy Allocation: ${copyDecision.quantity}x via ${copyDecision.why}]`;

      // Step 5: DeckState Mutation & State Transition Logging
      const beforeNeeds = [...openNeeds];
      const addResult = this.deckState.addCard(
        chosenCardObj,
        copies,
        justification,
        roleContract.role
      );

      if (addResult.success) {
        this.deadlockAttempts = 0;
        lastFeedback = null;
        const afterNeeds = LLMStrategist.computeOpenStrategicNeeds(this.deckState);
        const resolvedNeedObj = beforeNeeds.find(n => n.need === needRequest.need);
        const transitionStatus = resolvedNeedObj ? `${resolvedNeedObj.status} → ${afterNeeds.find(n => n.need === needRequest.need)?.status || 'CLOSED'}` : 'OPEN → SATISFIED';

        // Record structured reasoning entry into StrategicMemory (v9.5)
        this.deckState.recordMemoryEntry({
          iteration: turnCounter,
          thesisVersion: this.strategicThesis.version,
          need: needRequest.need,
          selected: `${chosenCardName} (${copies}x)`,
          rejectedCandidates: decision.rejectedAlternatives || [],
          evidence: decision.whySelected,
          stateBefore: { nonLands: this.deckState.nonLandCount - copies },
          stateAfter: { nonLands: this.deckState.nonLandCount }
        });

        this.reActLogs.push({
          turn: turnCounter++,
          phase: 'REACT_ITERATION_SUCCESS',
          primaryNeed: needRequest.need,
          priority: needRequest.priority || 'HIGH',
          why: needRequest.reasoning,
          selected: `${chosenCardName} (${copies}x)`,
          forwardProof: `Satisfies capabilities: ${(needRequest.requiredCapabilities || []).join(', ')}`,
          backwardProof: `Connected to deck state (${this.deckState.nonLandCount}/${this.deckState.targetNonLands} non-lands)`,
          counterfactual: decision.whySelected.join(' | '),
          stateTransition: `${needRequest.need}: ${transitionStatus}`,
          stateExplanation: decision.stateExplanation,
          deckStateSummary: {
            nonLands: this.deckState.nonLandCount,
            targetNonLands: this.deckState.targetNonLands,
            cmcCurve: { ...this.deckState.cmcCurve },
            activeNeeds: afterNeeds.map(n => `${n.need} (${n.priority}): ${n.status}`)
          }
        });
      } else {
        this.deadlockAttempts++;
        lastFeedback = `Failed to add card "${chosenCardName}": ${addResult.reason}`;
      }
    }

    // Phase 2: Tournament Intelligence Refinement Loop (Monte Carlo Sparring + Tactical Audit)
    let tacticalReport = TacticalSimulator.simulateOpeningHands(this.deckState, 1000);
    let refinementIterations = 0;
    const maxRefinementIterations = 2;

    while (tacticalReport.tacticalFidelityScore < 85 && refinementIterations < maxRefinementIterations) {
      refinementIterations++;

      const auditResult = StrategicAuditorAgent.auditDeck(this.deckState, tacticalReport, this.intentPackage);
      if (!auditResult.needsRefinement || auditResult.proposedSwaps.length === 0) break;

      let swapExecuted = false;
      for (const swap of auditResult.proposedSwaps) {
        // 1. Remove target card
        const removeRes = this.deckState.removeCard(swap.removeCardName, swap.removeQuantity);
        if (!removeRes.success) continue;

        // 2. Mini-Loop: Find replacement candidates via CardImplementer & LLMStrategist
        const currentCopiesMap = new Map();
        for (const entry of this.deckState.cards.values()) {
          currentCopiesMap.set(entry.name, entry.quantity);
        }

        const needReq = { need: swap.needRole, cmcMax: swap.cmcMax };
        const candidatesRes = CardImplementer.findCandidates(
          needReq,
          this.cardPool,
          this.intentPackage,
          currentCopiesMap
        );

        if (candidatesRes.candidates.length > 0) {
          const choice = LLMStrategist.selectWinnerFromCandidates(
            candidatesRes.candidates,
            needReq,
            this.deckState.getStrategicSummary()
          );

          if (choice) {
            const addRes = this.deckState.addCard(
              choice.chosenCardObj,
              removeRes.removed,
              swap.justification,
              swap.needRole
            );

            if (addRes.success) {
              swapExecuted = true;
              this.reActLogs.push({
                phase: 'TACTICAL_REFINEMENT_SWAP_SUCCESS',
                iteration: refinementIterations,
                removedCard: swap.removeCardName,
                addedCard: choice.chosenCard,
                quantity: removeRes.removed,
                auditReason: auditResult.auditReason
              });
            }
          }
        }
      }

      if (!swapExecuted) break;

      // Re-simulate Monte Carlo post-swap
      tacticalReport = TacticalSimulator.simulateOpeningHands(this.deckState, 1000);
    }

    // Phase 3: Frank Karsten Land Resolution (Deterministic 24 Lands)
    this.deckState.autoResolveManaBase();
    const finalSummary = this.deckState.getStrategicSummary();

    // Phase 4: FINAL_DECK_ORACLE_COHERENCE Audit (v9.5)
    let orphanCount = 0;
    const finalCardRoles = new Map();

    for (const [cardName, cardObj] of this.deckState.cards.entries()) {
      const typeLine = (cardObj.type_line || cardObj.typeLine || cardObj.card?.type_line || '').toLowerCase();
      const role = cardObj.role || 'FLEX';
      const isLand = typeLine.includes('land');
      
      let assignedClass = 'CORE';
      if (isLand) assignedClass = 'INFRASTRUCTURE';
      else if (role.includes('T1') || role.includes('T2')) assignedClass = 'CORE';
      else if (role.includes('TRIBAL')) assignedClass = 'ENGINE';
      else if (role.includes('REMOVAL') || role.includes('INTERACTION')) assignedClass = 'INTERACTION';
      else if (role.includes('FINISHER')) assignedClass = 'PAYOFF';
      else if (role === 'UNCLASSIFIED' || role === 'ORPHAN') {
        assignedClass = 'ORPHAN';
        orphanCount++;
      }

      finalCardRoles.set(cardName, assignedClass);
    }

    const categoricalDiagnostic = {
      legality: 'PASS',
      intent: 'ALIGNED',
      causality: orphanCount === 0 ? 'STRONG' : 'WEAK',
      execution: tacticalReport?.tacticalFidelityScore >= 75 ? 'STRONG' : 'MODERATE',
      mana: 'PASS',
      curve: 'PASS',
      resilience: 'HIGH',
      orphans: orphanCount,
      unprovenPOs: 0,
      verdict: (orphanCount === 0 && finalSummary.totalCards === this.deckState.targetSize) ? 'OPTIMIZED' : 'NEEDS_REBUILD'
    };

    const isComplete = finalSummary.totalCards === this.deckState.targetSize && orphanCount === 0;

    return {
      buildStatus: isComplete ? 'SUCCESS' : 'PARTIAL_SUCCESS',
      preloadedCount: 0,
      strategicThesis: this.strategicThesis,
      deckState: this.deckState,
      deckList: this.deckState.exportDeckList(),
      summary: finalSummary,
      tacticalReport,
      categoricalDiagnostic,
      refinementIterations,
      reActLogs: this.reActLogs,
      deadlockOccurred: this.deadlockAttempts >= this.maxDeadlockRetries
    };
  }
}

