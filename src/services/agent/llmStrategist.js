/**
 * LLM STRATEGIST — THE BRAIN (Sprint 6 Agentic System Core)
 * 
 * Manages qualitative deckbuilding reasoning, JSON schemas for candidate requests,
 * system prompt directives, and play-set optimization (prioritizing 4x playsets).
 */

import { ArchetypeProfileRegistry } from './archetypeProfiles.js';

export class LLMStrategist {
  /**
   * System Prompt specifying LLM persona, strategic vocabulary, and playset priorization rules.
   */
  static getSystemPrompt(intentPackage = {}) {
    const archetype = intentPackage.tempo || intentPackage.archetype || 'Midrange';
    const tribe = intentPackage.primaryTribe || 'None';
    const colors = (intentPackage.colors || ['B', 'R']).join('/');

    const constraints = intentPackage.userConstraints || {};
    const customPrompt = constraints.customPrompt || intentPackage.prompt || '';
    const playstyle = (constraints.playstyle || 'balanced').toUpperCase();
    const stance = (constraints.stance || 'balanced').toUpperCase();
    const goal = constraints.goal || 'BALANCED';
    const themePriority = constraints.themePriority || 'STRICT_THEME_FIDELITY';
    const curveProfile = constraints.curveProfile || 'balanced';
    const excludedMechanics = constraints.excludedMechanics || [];
    const engineFlavor = constraints.engineFlavor || intentPackage.engineFlavor || '';
    const boostKeywords = constraints.boostKeywords || intentPackage.boostKeywords || [];
    const prioritizePlaysets = constraints.prioritizePlaysets !== false;
    const generationPriority = constraints.generationPriority || intentPackage.generationPriority || 'balanced';
    const rarityMode = constraints.rarityMode || intentPackage.rarityMode || 'high-power';

    return `
You are BattleBox Senior MTG Strategist.
Your goal is to build a competitive 60-card ${colors} ${tribe} ${archetype} deck.

USER DIRECTIVES & SOFT LEVERS:
- Custom Prompt Directive: "${customPrompt}"
- Selection Priority Directive: ${generationPriority.toUpperCase()} (${generationPriority === 'synergy' ? 'Prioritize internal engine combos' : generationPriority === 'competitive' ? 'Prioritize metagame staples & raw power' : generationPriority === 'thematic' ? 'Prioritize strict lore & prompt fidelity' : 'Balanced synergy and metagame power'})
- Global Rarity Constraint: ${rarityMode.toUpperCase()} (${rarityMode === 'pauper' ? 'COMMONS ONLY' : rarityMode === 'artisan' ? 'COMMONS & UNCOMMONS ONLY' : rarityMode === 'standard' ? 'COMMONS, UNCOMMONS & RARES ONLY' : 'UNLIMITED MYTHICS & RARES ALLOWED'})
- Oracle Tuner Sub-Strategy: ${engineFlavor ? engineFlavor : 'Universal Synergy'}
- Target Synergy Keywords: ${boostKeywords.length > 0 ? boostKeywords.join(', ') : 'Standard Archetype Synergy'}
- Playstyle & Stance: ${playstyle} / ${stance} (Goal: ${goal}, Theme: ${themePriority})
- Preferred Curve Profile: ${curveProfile}
- Excluded Mechanics: ${excludedMechanics.length > 0 ? excludedMechanics.join(', ') : 'None'}
- Playset Strategy: ${prioritizePlaysets ? 'ALWAYS PRIORITIZE 4X PLAYSETS' : 'FLEXIBLE COPIES'}

CORE DIRECTIVES:
1. NEVER invent card names or mana costs. You operate purely on qualitative strategic needs.
2. ALWAYS request candidates using JSON schema StrategicNeedRequest.
3. ALWAYS prioritize 4x PLAYSETS for core engine cards to stabilize statistical draw curves.
4. Reason exclusively over the structured DeckState Strategic Summary (CMC curve, color pips, missing roles).
5. 4-PILLAR GOLDEN QUOTA RULE (60-Card Deck):
   - Pillar 1 (Defense & Removal): 8 slots (CMC 1-2 Instant/Sorcery cheap removal & interaction).
   - Pillar 2 (Resource & Card Flow): 8 slots (CMC 1-3 Draw/Impulse/Token engines).
   - Pillar 3 (Core Synergy Engine): 14-16 slots (CMC 1-4 Tribal/Archetype threats & lords).
   - Pillar 4 (Apex Finishers): 4-6 slots MAX (CMC 4-5 Apex Payoffs, strictly capped to prevent top-heavy curves).
6. If feedback indicates 0 candidates were found for a request, you MUST relax constraints (increase cmcMax or pivot strategic role).
`.trim();
  }


  /**
   * Generates next strategic need request based on live DeckState summary and optional feedback
   * 
   * @param {Object} summary - Summary from DeckState.getStrategicSummary()
   * @param {string|null} lastFeedback - Optional deadlock feedback message
   * @returns {Object} StrategicNeedRequest
   */
  /**
   * Generates a falsifiable Strategic Thesis for top-down cognitive governance (v9.5)
   * 
   * @param {Object} intentPackage 
   * @returns {Object} Falsifiable Strategic Thesis object
   */
  static generateStrategicThesis(intentPackage = {}) {
    const archetype = (intentPackage.archetype || intentPackage.tempo || 'Aggro').toString().toUpperCase();
    const isAggro = archetype.includes('AGGRO') || archetype.includes('BURN');
    const isTempo = archetype.includes('TEMPO') || archetype.includes('NINJA');
    const isControl = archetype.includes('CONTROL');
    const isAristocrats = archetype.includes('ARISTOCRATS') || archetype.includes('SACRIFICE');

    const primaryTribe = intentPackage.primaryTribe || null;
    const colors = intentPackage.colors || ['B', 'R'];

    let thesisSummary = '';
    let winPath = [];
    let coreCapabilities = [];
    let failureModes = [];
    let falsifiers = [];
    let confidence = 'HIGH';

    const isWerewolf = (primaryTribe || '').toLowerCase().includes('werewolf') || (intentPackage.selectedEngineId || '').includes('werewolf');
    const isNinja = (primaryTribe || '').toLowerCase().includes('ninja') || archetype.includes('NINJA');

    if (isWerewolf) {
      thesisSummary = `Establish early werewolf board presence, leverage Daybound/Nightbound transformation payoffs and tribal power pump.`;
      winPath = ['T1_PRESSURE', 'TRIBAL_DENSITY', 'T2_PRESSURE', 'TRANSFORMATION_PAYOFF'];
      coreCapabilities = ['PLAYABLE_T1', 'TRIBAL_SUBTYPE', 'DAYBOUND_NIGHTBOUND'];
      failureModes = ['NO_EARLY_WEREWOLF', 'DAY_NIGHT_STALL'];
      falsifiers = [
        {
          id: 'FALSIFIER_WEREWOLF_DENSITY_DEFICIT',
          claim: 'Insufficient Werewolf density breaks daybound/nightbound synergy scaling',
          evidenceRequired: ['TRIBAL_DENSITY'],
          failureCondition: 'DENSITY_UNPROVEN'
        }
      ];
    } else if (isAggro) {
      thesisSummary = `Maintain T1-T3 board pressure, leveraging ${primaryTribe || 'tribal'} creature density and combat amplification to close out the game before opponent stabilizes.`;
      winPath = ['T1_PRESSURE', 'TRIBAL_DENSITY', 'T2_PRESSURE', 'REACH'];
      coreCapabilities = ['PLAYABLE_T1', 'BOARD_PRESENCE', 'TRIBAL_SUBTYPE'];
      failureModes = ['NO_T1_PLAY', 'MANA_SCREW', 'SWEEPER_STALL'];
      falsifiers = [
        {
          id: 'FALSIFIER_CURVE_COLLAPSE',
          claim: 'Concentration of 3+ CMC spells degrades T1->T2->T3 sequence execution',
          evidenceRequired: ['T1_EXECUTION', 'T2_EXECUTION', 'T3_ACTION_CAPACITY'],
          failureCondition: 'PLAN_EXECUTION_DEGRADES'
        },
        {
          id: 'FALSIFIER_T1_DEFICIT',
          claim: 'Insufficient T1 board presence delays win turn beyond opponent stabilization threshold',
          evidenceRequired: ['T1_PRESSURE'],
          failureCondition: 'T1_EXECUTION_UNPROVEN'
        }
      ];
    } else if (isTempo) {
      thesisSummary = 'Deploy evasive turn 1 enabler, follow with turn 2 tempo play / Ninjutsu, protecting threat while denying opponent tempo.';
      winPath = ['EVASIVE_ENABLER', 'NINJUTSU_PAYOFF', 'CHEAP_PROTECTION'];
      coreCapabilities = ['EVASIVE_T1', 'NINJUTSU_PAYOFF', 'CHEAP_COUNTER'];
      failureModes = ['NO_EVASIVE_PLAY', 'REMOVAL_BLOCKED_NINJUTSU'];
      falsifiers = [
        {
          id: 'FALSIFIER_NO_EVASIVE_ENABLER',
          claim: 'Without T1 evasive creature, Ninjutsu execution probability drops below acceptable threshold',
          evidenceRequired: ['T1_EXECUTION'],
          failureCondition: 'EVASION_UNPROVEN'
        }
      ];
    } else if (isAristocrats) {
      thesisSummary = 'Assemble sacrifice engine (Fodder + Sacrifice Outlet + Death Payoff) to generate inevitable damage and card advantage.';
      winPath = ['SACRIFICE_FODDER', 'SACRIFICE_OUTLET', 'DEATH_PAYOFF'];
      coreCapabilities = ['TOKEN_GENERATOR', 'SAC_OUTLET', 'DEATH_TRIGGER'];
      failureModes = ['ORPHAN_PAYOFF_NO_FODDER', 'OUTLET_MISSING'];
      falsifiers = [
        {
          id: 'FALSIFIER_ORPHAN_DEMAND',
          claim: 'Payoffs demanding sacrifice fodder without adequate usable supply lead to unfulfilled dependencies',
          evidenceRequired: ['INFRASTRUCTURE_LEDGER'],
          failureCondition: 'UNFULFILLED_DEPENDENCY'
        }
      ];
    } else {
      thesisSummary = 'Control early board with cheap removal/counters, accumulate card advantage, and close with inevitable late-game payoff.';
      winPath = ['CHEAP_REMOVAL', 'CARD_DRAW', 'SWEEPER', 'INEVITABLE_WIN_PAYOFF'];
      coreCapabilities = ['INSTANT_REMOVAL', 'CARD_ADVANTAGE', 'BOARD_WIPE'];
      failureModes = ['MANA_SCREW_EARLY', 'OVERWHELMED_BY_AGGRO'];
      falsifiers = [
        {
          id: 'FALSIFIER_EARLY_INTERACTION_DEFICIT',
          claim: 'Lack of Turn 1-2 interaction leads to non-recoverable life loss against aggressive archetypes',
          evidenceRequired: ['EARLY_INTERACTION'],
          failureCondition: 'INTERACTION_DEFICIT'
        }
      ];
    }

    return {
      thesisSummary,
      thesisConfidence: confidence,
      thesisStatus: 'SUPPORTED',
      version: 'V1',
      winPath,
      coreEngine: {
        archetype,
        primaryTribe,
        colors
      },
      coreCapabilities,
      failureModes,
      falsifiers,
      proofObligations: winPath.map(w => `PO_${w}`)
    };
  }

  /**
   * Revises Strategic Thesis under the SAME immutable user contract when refuted (v9.5)
   * 
   * @param {Object} oldThesis 
   * @param {Object} refutationReport 
   * @returns {Object} Revised Strategic Thesis V2
   */
  static reviseThesis(oldThesis, refutationReport = {}) {
    const revisedVersion = `V${(parseInt((oldThesis.version || 'V1').replace('V', '')) || 1) + 1}`;
    return {
      ...oldThesis,
      version: revisedVersion,
      thesisStatus: 'SUPPORTED',
      thesisSummary: `${oldThesis.thesisSummary} (Revised ${revisedVersion} to address root cause: ${refutationReport.rootCause || 'Refutation'})`,
      falsifiers: (oldThesis.falsifiers || []).map(f => ({
        ...f,
        revisedIn: revisedVersion
      }))
    };
  }

  /**
   * Computes the prioritized list of OPEN_NEEDS dynamically from live DeckState.
   * Authority: ZERO reliance on slot numbers or fixed profile sequences.
   * 
   * @param {Object} deckState - Instance of DeckState
   * @returns {Array<Object>} List of open strategic needs with functional contracts
   */
  static computeOpenStrategicNeeds(deckState) {
    if (!deckState) return [];

    const summary = typeof deckState.getStrategicSummary === 'function' 
      ? deckState.getStrategicSummary() 
      : (deckState.summary || deckState);

    const intentPackage = deckState.intentPackage || summary.intentPackage || {};
    const thesis = deckState.strategicThesis || LLMStrategist.generateStrategicThesis(intentPackage);
    const winPath = thesis.winPath || ['T1_PRESSURE', 'TRIBAL_DENSITY', 'T2_PRESSURE', 'REACH'];

    const rawTribe = (deckState.primaryTribe || summary.primaryTribe || intentPackage.primaryTribe || '').toLowerCase();
    const colors = deckState.colors || summary.colors || ['B', 'R'];
    const cards = deckState.cards ? Array.from(deckState.cards.values()) : [];
    const nonLandCount = deckState.nonLandCount !== undefined ? deckState.nonLandCount : (summary.nonLandCards || 0);

    // Density Counters for Evidence Validation
    const t1Cards = cards.filter(c => (c.cmc || c.mana_value || 0) === 1 && !c.type_line?.toLowerCase().includes('land'));
    const t1Count = t1Cards.reduce((sum, c) => sum + (c.quantity || 1), 0);

    const t2Cards = cards.filter(c => (c.cmc || c.mana_value || 0) === 2 && !c.type_line?.toLowerCase().includes('land'));
    const t2Count = t2Cards.reduce((sum, c) => sum + (c.quantity || 1), 0);

    const tribeCards = cards.filter(c => {
      const type = (c.type_line || '').toLowerCase();
      const text = (c.oracle_text || c.text || '').toLowerCase();
      return rawTribe && (type.includes(rawTribe) || text.includes(rawTribe));
    });
    const tribeCount = tribeCards.reduce((sum, c) => sum + (c.quantity || 1), 0);

    const openNeeds = [];

    // Map WinPath Steps directly to Systemic Open Needs
    for (const step of winPath) {
      let isSatisfied = false;
      let needConfig = null;

      if (step === 'T1_PRESSURE' || step === 'EVASIVE_ENABLER') {
        isSatisfied = t1Count >= 4; // Proven T1 presence
        if (!isSatisfied) {
          needConfig = {
            need: 'T1_PRESSURE',
            status: 'OPEN',
            priority: 'CRITICAL',
            whyOpen: 'Primary win path lacks proven turn-1 velocity and early board presence.',
            requiredOutcome: 'T1_BOARD_PRESENCE',
            timing: 'T1',
            requiredCapabilities: ['PLAYABLE_T1', 'BOARD_PRESENCE', 'ADVANCES_WIN_PATH'],
            requiredEvidence: ['T1_BOARD_PRESENCE', 'TURN_WINDOW_VELOCITY'],
            preferredCapabilities: [rawTribe ? `TRIBAL_${rawTribe.toUpperCase()}` : 'TRIBAL_MEMBER', 'HASTE'],
            forbiddenPatterns: ['REQUIRES_T2_MANA', 'PURE_COMBAT_TRICK'],
            cmcMin: 1, cmcMax: 1, targetColors: colors, targetTribe: step === 'EVASIVE_ENABLER' ? null : rawTribe
          };
        }
      } else if (step === 'TRIBAL_DENSITY' || step === 'SACRIFICE_FODDER') {
        isSatisfied = tribeCount >= 12; // Proven core engine density
        if (!isSatisfied) {
          needConfig = {
            need: 'TRIBAL_DENSITY',
            status: 'OPEN',
            priority: 'CRITICAL',
            whyOpen: 'Core board engine lacks required tribal/engine creature density.',
            requiredOutcome: 'ENGINE_DENSITY',
            timing: 'T1_T3',
            requiredCapabilities: ['CREATURE', rawTribe ? `TRIBAL_${rawTribe.toUpperCase()}` : 'ENGINE_PIECE'],
            requiredEvidence: ['TRIBAL_MEMBER_PRESENCE', 'LORD_PUMP_ELIGIBILITY'],
            preferredCapabilities: ['LORD_EFFECT', 'TOKEN_GENERATOR'],
            forbiddenPatterns: ['OFF_TRIBE_CREATURE', 'PURE_COMBAT_TRICK'],
            cmcMin: 1, cmcMax: 4, targetColors: colors, targetTribe: rawTribe
          };
        }
      } else if (step === 'T2_PRESSURE' || step === 'NINJUTSU_PAYOFF' || step === 'SACRIFICE_OUTLET') {
        isSatisfied = t2Count >= 8; // Proven T2 execution
        if (!isSatisfied) {
          needConfig = {
            need: 'T2_PRESSURE',
            status: 'OPEN',
            priority: 'HIGH',
            whyOpen: 'Curve execution lacks T2 threat/acceleration into turn 3.',
            requiredOutcome: 'T2_DEVELOPMENT',
            timing: 'T2',
            requiredCapabilities: ['PLAYABLE_T2', 'BOARD_PRESENCE'],
            requiredEvidence: ['T2_BOARD_DEVELOPMENT'],
            preferredCapabilities: [rawTribe ? `TRIBAL_${rawTribe.toUpperCase()}` : 'TRIBAL_MEMBER', 'LORD_EFFECT'],
            forbiddenPatterns: ['REQUIRES_T3_MANA', 'PURE_COMBAT_TRICK'],
            cmcMin: 2, cmcMax: 2, targetColors: colors, targetTribe: rawTribe
          };
        }
      } else if (step === 'REACH' || step === 'FACE_BURN_REACH' || step === 'TRANSFORMATION_PAYOFF' || step === 'DEATH_PAYOFF') {
        const hasReach = cards.some(c => {
          const text = (c.oracle_text || c.text || '').toLowerCase();
          return text.includes('deals ') || text.includes('nightbound') || text.includes('whenever a creature you control dies');
        });
        isSatisfied = hasReach;
        if (!isSatisfied) {
          needConfig = {
            need: 'FACE_BURN_REACH',
            status: 'OPEN',
            priority: 'HIGH',
            whyOpen: 'Primary win path lacks proven lethal conversion from board advantage to win.',
            requiredOutcome: 'OPPONENT_LIFE_REDUCTION',
            timing: 'T3_T5',
            requiredCapabilities: ['DIRECT_DAMAGE', 'PLAYER_REACH', 'ENGINE_PAYOFF'],
            requiredEvidence: ['PLAYER_TARGETABLE_DIRECT_DAMAGE', 'LETHAL_CONVERSION'],
            preferredCapabilities: ['CHEAP_MANA', 'PLAYER_TARGETABLE'],
            forbiddenPatterns: ['HIGH_CMC_WITHOUT_DISCOUNT'],
            cmcMin: 1, cmcMax: 3, targetColors: colors, targetTribe: rawTribe
          };
        }
      }

      if (needConfig && !isSatisfied) {
        openNeeds.push(needConfig);
      }
    }

    // Infrastructure Ledger Deficits
    if (deckState.infrastructureLedger) {
      for (const [resKey, ledgerItem] of Object.entries(deckState.infrastructureLedger)) {
        if (ledgerItem.demand > 0 && ledgerItem.usable < ledgerItem.demand) {
          openNeeds.push({
            need: 'INFRASTRUCTURE_SUPPORT',
            status: 'OPEN',
            priority: 'CRITICAL',
            whyOpen: `Causal infrastructure deficit: [${resKey}] has demand of ${ledgerItem.demand} but usable supply is only ${ledgerItem.usable}.`,
            requiredOutcome: 'RESOURCE_SUPPLY',
            timing: 'IMMEDIATE',
            requiredCapabilities: ['SUPPLIES_RESOURCE', resKey],
            requiredEvidence: ['RESOURCE_BALANCE_RESTORATION'],
            preferredCapabilities: ['TOKEN_GENERATOR', 'CHEAP_PERMANENT'],
            forbiddenPatterns: ['CONSUMES_RESOURCE_WITHOUT_SUPPLY'],
            cmcMin: 1, cmcMax: 3, targetColors: colors, targetResource: resKey
          });
        }
      }
    }

    // Sort OPEN_NEEDS by priority (CRITICAL -> HIGH -> MEDIUM -> LOW)
    const priorityWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    openNeeds.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

    return openNeeds;
  }

  /**
   * Generates next strategic need request based on live DeckState (NEED-FIRST Paradigm)
   * 
   * @param {Object} summary - Summary from DeckState.getStrategicSummary() or DeckState instance
   * @param {string|null} lastFeedback - Optional deadlock feedback message
   * @param {Object|null} deckStateInstance - Live DeckState instance
   * @returns {Object} StrategicNeedRequest
   */
  static generateStrategicNeed(summary = {}, lastFeedback = null, deckStateInstance = null) {
    const deckState = deckStateInstance || (summary.deckState ? summary.deckState : summary);
    const colors = summary.colors || deckState.colors || ['B', 'R'];
    const tribe = summary.primaryTribe || deckState.primaryTribe || null;

    // Handle Deadlock Feedback: Relax Search Constraints (v9.7 - NO FLEX FALLBACK)
    if (lastFeedback && lastFeedback.includes('0 candidates')) {
      const openNeeds = LLMStrategist.computeOpenStrategicNeeds(deckState);
      const topNeed = openNeeds[0] || { need: 'TRIBAL_DENSITY', priority: 'HIGH' };
      
      return {
        need: topNeed.need || 'UTILITY_SUPPORT',
        priority: topNeed.priority || 'HIGH',
        requiredCapabilities: topNeed.requiredCapabilities || ['CREATURE'],
        preferredCapabilities: topNeed.preferredCapabilities || [],
        forbiddenPatterns: [], // Relax forbidden patterns
        targetColors: colors,
        cmcMin: 1,
        cmcMax: 5, // Expand CMC window to find higher-tier threats
        targetTribe: tribe,
        reasoning: `Relaxing search constraints for need [${topNeed.need || 'UTILITY_SUPPORT'}] to resolve 0-candidate deadlock without reverting to FLEX.`
      };
    }

    // Compute OPEN_NEEDS dynamically from state
    const openNeeds = LLMStrategist.computeOpenStrategicNeeds(deckState);

    if (openNeeds.length > 0) {
      const topNeed = openNeeds[0];
      return {
        need: topNeed.need,
        priority: topNeed.priority,
        requiredCapabilities: topNeed.requiredCapabilities,
        preferredCapabilities: topNeed.preferredCapabilities,
        forbiddenPatterns: topNeed.forbiddenPatterns,
        targetColors: topNeed.targetColors || colors,
        cmcMin: topNeed.cmcMin || 1,
        cmcMax: topNeed.cmcMax || 4,
        targetTribe: topNeed.targetTribe || tribe,
        reasoning: topNeed.reason
      };
    }

    // WinPath Completion Invariant (v10.3): When openNeeds.length === 0, transition directly to STOP_CAUSAL
    return {
      need: 'STOP_CAUSAL',
      status: 'SATISFIED',
      priority: 'LOW',
      targetColors: colors,
      reasoning: 'All WinPath node requirements are SATISFIED. State C (NO_ADDITION) governs remainder of non-land slots.'
    };
  }

  /**
   * Select winning card among 3-5 candidates returned by CardImplementer
   * 
   * @param {Array<Object>} candidates
   * @param {Object} needRequest
   * @param {Object} summary
   * @returns {Object} StrategicChoiceResponse
   */
  static selectWinnerFromCandidates(candidates = [], needRequest = {}, summary = {}) {
    if (!candidates || candidates.length === 0) {
      return null;
    }

    // Select candidate #1 (highest scoring match from CardImplementer)
    const winner = candidates[0];
    const isCommander = summary.format === 'COMMANDER';
    const recommendedCopies = isCommander ? 1 : 4;

    return {
      chosenCard: winner.name,
      chosenCardObj: winner,
      recommendedCopies,
      justification: `Selected [${winner.name}] (CMC ${winner.cmc}) to fulfill strategic role [${needRequest.need}] as a ${recommendedCopies}x playset.`
    };
  }
}
