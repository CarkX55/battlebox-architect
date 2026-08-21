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
    const rawArch = (intentPackage.archetype || intentPackage.tempo || 'Aggro').toString().toUpperCase();
    const rawStrat = (intentPackage.strategy || '').toString().toUpperCase();
    const rawEngine = (intentPackage.selectedEngineId || '').toString().toUpperCase();
    const rawTribeStr = (intentPackage.primaryTribe || intentPackage.tribe || '').toString().toLowerCase();
    const colors = intentPackage.colors || ['B', 'R'];

    const combText = `${rawArch} ${rawStrat} ${rawEngine} ${rawTribeStr}`;

    let thesisSummary = '';
    let winPath = [];
    let coreCapabilities = [];
    let failureModes = [];
    let falsifiers = [];
    let confidence = 'HIGH';

    // 1. Oceanic Alliance / Sea Monsters (Tritones, Krakens, Leviatanes, Pulpos, Serpientes)
    const isSeaMonsters = rawTribeStr.includes('sea_monster') || rawTribeStr.includes('sea') || rawTribeStr.includes('marino') || rawTribeStr.includes('kraken') || rawTribeStr.includes('leviathan') || rawTribeStr.includes('octopus') || rawTribeStr.includes('serpent') || combText.includes('SEA_MONSTER');
    
    // 2. Heavy Tribal Ramp (Dragons, Dinosaurs, Eldrazi, Angels, Giants, Apex Predators)
    const isHeavyTribal = rawTribeStr.match(/dragon|demon|dinosaur|eldrazi|angel|giant|apex_predators/) && (combText.includes('RAMP') || combText.includes('BIG_MANA') || combText.includes('MIDRANGE'));

    // 3. Specific Engine & Strategy Profiles
    const isWerewolf = rawTribeStr.includes('werewolf') || combText.includes('WEREWOLF');
    const isNinja = rawTribeStr.includes('ninja') || combText.includes('NINJA');
    const isAristocrats = combText.includes('ARISTOCRAT') || combText.includes('SACRIFICE');
    const isSpellslinger = combText.includes('SPELLSLINGER') || combText.includes('PROWESS') || combText.includes('MAGECRAFT');
    const isReanimator = combText.includes('REANIMAT') || combText.includes('DREDGE') || combText.includes('GRAVEYARD');
    const isBlink = combText.includes('BLINK') || combText.includes('FLICKER');
    const isLandfall = combText.includes('LANDFALL');
    const isLifegain = combText.includes('LIFEGAIN') || combText.includes('SOUL_WARDEN');
    const isPrison = combText.includes('PRISON') || combText.includes('TAX') || combText.includes('STAX') || combText.includes('HATEBEAR');
    const isVoltron = combText.includes('VOLTRON') || combText.includes('EQUIPMENT') || combText.includes('AURA') || combText.includes('HAMMER');
    const isAffinity = combText.includes('AFFINITY') || combText.includes('VEHICLES') || combText.includes('ARTIFACT');
    const isStormCascade = combText.includes('STORM') || combText.includes('CASCADE');
    const isGeneralRamp = combText.includes('RAMP') || combText.includes('TRON') || combText.includes('BIG_MANA') || combText.includes('TITAN');
    const isAggro = combText.includes('AGGRO') || combText.includes('BURN');
    const isTempo = combText.includes('TEMPO');
    const isMidrange = combText.includes('MIDRANGE');

    if (isSeaMonsters) {
      thesisSummary = 'Develop early mana acceleration with Merfolk/ramp and deploy colossal oceanic apex threats (Krakens, Leviathans, Serpents, Octopuses) ahead of curve.';
      winPath = ['EARLY_RAMP', 'TRIBAL_DENSITY', 'CARD_FLOW', 'INEVITABLE_WIN_PAYOFF'];
      coreCapabilities = ['MANA_ACCELERATION', 'TRIBAL_SUBTYPE', 'APEX_PAYOFF'];
      failureModes = ['NO_EARLY_RAMP', 'OCEANIC_APEX_DEFICIT'];
      falsifiers = [
        {
          id: 'FALSIFIER_OCEANIC_RAMP_DEFICIT',
          claim: 'Lack of Turn 1-2 mana acceleration delays Sea Monster apex closers past opponent stabilization clock',
          evidenceRequired: ['MANA_ACCELERATION'],
          failureCondition: 'RAMP_UNPROVEN'
        }
      ];
    } else if (isHeavyTribal) {
      thesisSummary = `Accelerate early mana via ramp/dorks and deploy colossal ${rawTribeStr} apex threats to dominate the mid-to-late game.`;
      winPath = ['EARLY_RAMP', 'TRIBAL_DENSITY', 'CHEAP_REMOVAL', 'INEVITABLE_WIN_PAYOFF'];
      coreCapabilities = ['MANA_ACCELERATION', 'TRIBAL_SUBTYPE', 'APEX_PAYOFF'];
      failureModes = ['NO_EARLY_RAMP', 'THREAT_DEFICIT'];
      falsifiers = [
        {
          id: 'FALSIFIER_HEAVY_TRIBE_RAMP_DEFICIT',
          claim: 'Insufficient early mana ramp prevents deploying heavy tribal payoffs on schedule',
          evidenceRequired: ['MANA_ACCELERATION'],
          failureCondition: 'RAMP_UNPROVEN'
        }
      ];
    } else if (isWerewolf) {
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
    } else if (isNinja) {
      thesisSummary = 'Deploy evasive turn 1 enabler, follow with turn 2 tempo play / Ninjutsu, protecting threat while denying opponent tempo.';
      winPath = ['EVASIVE_ENABLER', 'NINJUTSU_PAYOFF', 'CHEAP_REMOVAL', 'CARD_FLOW'];
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
      winPath = ['SACRIFICE_FODDER', 'SACRIFICE_OUTLET', 'DEATH_PAYOFF', 'CARD_FLOW'];
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
    } else if (isSpellslinger) {
      thesisSummary = 'Chain low-cost instants and sorceries to trigger prowess/magecraft and burn out the opponent.';
      winPath = ['T1_PRESSURE', 'CHEAP_REMOVAL', 'CARD_FLOW', 'REACH'];
      coreCapabilities = ['LOW_CMC_SPELL', 'PROWESS', 'DIRECT_DAMAGE'];
      failureModes = ['NO_SPELL_VELOCITY', 'OUT_OF_GAS'];
      falsifiers = [
        {
          id: 'FALSIFIER_SPELL_DENSITY_DEFICIT',
          claim: 'Insufficient cheap instants/sorceries prevents double-spelling and prowess scaling',
          evidenceRequired: ['SPELL_DENSITY'],
          failureCondition: 'SPELL_VELOCITY_UNPROVEN'
        }
      ];
    } else if (isReanimator) {
      thesisSummary = 'Discard colossal threats to the graveyard and reanimate them in early turns for overwhelming board presence.';
      winPath = ['CARD_FLOW', 'CHEAP_REMOVAL', 'INEVITABLE_WIN_PAYOFF'];
      coreCapabilities = ['LOOTING_ENABLER', 'REANIMATE_SPELL', 'APEX_PAYOFF'];
      failureModes = ['NO_DISCARD_OUTLET', 'NO_REANIMATE_SPELL'];
      falsifiers = [
        {
          id: 'FALSIFIER_REANIMATOR_TRIAD_DEFICIT',
          claim: 'Absence of discard enablers or reanimate spells breaks the graveyard combo chain',
          evidenceRequired: ['GRAVEYARD_INFRASTRUCTURE'],
          failureCondition: 'REANIMATOR_UNPROVEN'
        }
      ];
    } else if (isBlink) {
      thesisSummary = 'Deploy creatures with powerful enters-the-battlefield abilities and flicker them repeatedly for compounding card and board advantage.';
      winPath = ['T1_PRESSURE', 'TRIBAL_DENSITY', 'CHEAP_REMOVAL', 'CARD_FLOW'];
      coreCapabilities = ['ETB_VALUE', 'FLICKER_ENABLER', 'INTERACTION'];
      failureModes = ['NO_ETB_TARGETS', 'FLICKER_STALL'];
      falsifiers = [
        {
          id: 'FALSIFIER_ETB_TARGET_DEFICIT',
          claim: 'Lack of high-impact ETB creatures reduces flicker efficiency',
          evidenceRequired: ['ETB_DENSITY'],
          failureCondition: 'ETB_UNPROVEN'
        }
      ];
    } else if (isLandfall) {
      thesisSummary = 'Trigger landfall synergies repeatedly through land ramp, fetchlands, and extra land drops to overwhelm the board.';
      winPath = ['EARLY_RAMP', 'TRIBAL_DENSITY', 'CARD_FLOW', 'INEVITABLE_WIN_PAYOFF'];
      coreCapabilities = ['MANA_ACCELERATION', 'LANDFALL_PAYOFF', 'CARD_FLOW'];
      failureModes = ['NO_LAND_DROPS', 'PAYOFF_MISSING'];
      falsifiers = [
        {
          id: 'FALSIFIER_LANDFALL_ENGINE_DEFICIT',
          claim: 'Insufficient ramp or land fetchers stalls landfall trigger velocity',
          evidenceRequired: ['MANA_ACCELERATION'],
          failureCondition: 'LANDFALL_UNPROVEN'
        }
      ];
    } else if (isLifegain) {
      thesisSummary = 'Generate passive life gain to rapidly grow scalable threats (Pridemates) and trigger life-total payoffs.';
      winPath = ['T1_PRESSURE', 'TRIBAL_DENSITY', 'CHEAP_REMOVAL', 'REACH'];
      coreCapabilities = ['LIFEGAIN_SOURCE', 'LIFEGAIN_PAYOFF', 'BOARD_PRESENCE'];
      failureModes = ['NO_LIFE_SOURCE', 'GROWTH_STALL'];
      falsifiers = [
        {
          id: 'FALSIFIER_LIFEGAIN_ENGINE_DEFICIT',
          claim: 'Lack of Turn 1-2 lifegain triggers prevents scaling growable attackers',
          evidenceRequired: ['T1_PRESSURE'],
          failureCondition: 'LIFEGAIN_UNPROVEN'
        }
      ];
    } else if (isPrison) {
      thesisSummary = 'Deploy mana taxes, fiscal hatebears, and asymmetric locks to restrict opponent actions while applying steady beatdown pressure.';
      winPath = ['T1_PRESSURE', 'CHEAP_REMOVAL', 'TRIBAL_DENSITY', 'CARD_FLOW'];
      coreCapabilities = ['TAX_EFFECT', 'HATEBEAR', 'DISRUPTION'];
      failureModes = ['NO_TAX_PRESSURE', 'OPPONENT_BREAKS_LOCK'];
      falsifiers = [
        {
          id: 'FALSIFIER_TAX_LOCK_DEFICIT',
          claim: 'Failure to deploy Turn 2 tax piece allows opponent to execute faster gameplan',
          evidenceRequired: ['TAX_DENSITY'],
          failureCondition: 'TAX_UNPROVEN'
        }
      ];
    } else if (isVoltron) {
      thesisSummary = 'Suit an early evasive carrier with powerful equipment/auras and protect it to deal lethal combat damage in few swings.';
      winPath = ['T1_PRESSURE', 'T2_PRESSURE', 'CHEAP_REMOVAL', 'REACH'];
      coreCapabilities = ['EQUIPMENT_AURA', 'VOLTRON_CARRIER', 'PROTECTION'];
      failureModes = ['NO_CARRIER', 'EQUIPMENT_UNATTACHED'];
      falsifiers = [
        {
          id: 'FALSIFIER_VOLTRON_CARRIER_DEFICIT',
          claim: 'Lack of cheap resilient carriers leaves equipment stranded without combat impact',
          evidenceRequired: ['T1_PRESSURE'],
          failureCondition: 'CARRIER_UNPROVEN'
        }
      ];
    } else if (isAffinity) {
      thesisSummary = 'Flood the board with cheap artifacts to exploit Affinity/Metalcraft cost reductions and deploy high-power artifact threats.';
      winPath = ['T1_PRESSURE', 'T2_PRESSURE', 'CARD_FLOW', 'REACH'];
      coreCapabilities = ['CHEAP_ARTIFACT', 'AFFINITY_PAYOFF', 'CARD_FLOW'];
      failureModes = ['NO_ARTIFACT_FLOOD', 'AFFINITY_STALL'];
      falsifiers = [
        {
          id: 'FALSIFIER_AFFINITY_MASS_DEFICIT',
          claim: 'Insufficient 0-1 CMC artifacts prevents rapid affinity cost discounts',
          evidenceRequired: ['T1_PRESSURE'],
          failureCondition: 'AFFINITY_UNPROVEN'
        }
      ];
    } else if (isStormCascade) {
      thesisSummary = 'Build resource engine to chain free cascade spells or storm copies into an explosive, game-ending turn.';
      winPath = ['EARLY_RAMP', 'CARD_FLOW', 'CHEAP_REMOVAL', 'INEVITABLE_WIN_PAYOFF'];
      coreCapabilities = ['MANA_ACCELERATION', 'CASCADE_SPELL', 'CARD_FLOW'];
      failureModes = ['NO_MANA_ENGINE', 'FIZZLE'];
      falsifiers = [
        {
          id: 'FALSIFIER_STORM_CHAIN_DEFICIT',
          claim: 'Lack of mana generation or card draw leads to fizzling mid-chain',
          evidenceRequired: ['MANA_ACCELERATION'],
          failureCondition: 'CASCADE_UNPROVEN'
        }
      ];
    } else if (isGeneralRamp) {
      thesisSummary = 'Accelerate mana in early turns via ramp/tutors/dorks, stabilize the board, and deploy colossal apex threats ahead of curve.';
      winPath = ['EARLY_RAMP', 'CARD_FLOW', 'CHEAP_REMOVAL', 'INEVITABLE_WIN_PAYOFF'];
      coreCapabilities = ['MANA_ACCELERATION', 'CARD_FLOW', 'APEX_PAYOFF'];
      failureModes = ['NO_RAMP_ACCELERATION', 'THREAT_DEFICIT'];
      falsifiers = [
        {
          id: 'FALSIFIER_RAMP_DEFICIT',
          claim: 'Lack of Turn 1-2 ramp acceleration delays high-CMC apex threats past opponent lethal clock',
          evidenceRequired: ['MANA_ACCELERATION'],
          failureCondition: 'RAMP_UNPROVEN'
        }
      ];
    } else if (isAggro) {
      thesisSummary = `Maintain T1-T3 board pressure, leveraging ${rawTribeStr || 'tribal'} creature density and combat amplification to close out the game before opponent stabilizes.`;
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
      thesisSummary = 'Deploy early aggressive threats, protect them with cheap counters/bounces, and deny opponent tempo to win quickly.';
      winPath = ['T1_PRESSURE', 'CHEAP_REMOVAL', 'CARD_FLOW', 'REACH'];
      coreCapabilities = ['PLAYABLE_T1', 'CHEAP_COUNTER', 'BOUNCE'];
      failureModes = ['NO_T1_PLAY', 'REMOVAL_STALL'];
      falsifiers = [
        {
          id: 'FALSIFIER_TEMPO_EXECUTION_DEFICIT',
          claim: 'Without early board pressure, reactive disruption fails to produce winning clock',
          evidenceRequired: ['T1_PRESSURE'],
          failureCondition: 'TEMPO_UNPROVEN'
        }
      ];
    } else if (isMidrange) {
      thesisSummary = 'Control early board with cheap removal/discard, deploy efficient 2-for-1 threats, and outvalue the opponent in the midgame.';
      winPath = ['CHEAP_REMOVAL', 'TRIBAL_DENSITY', 'CARD_FLOW', 'INEVITABLE_WIN_PAYOFF'];
      coreCapabilities = ['INSTANT_REMOVAL', 'CARD_ADVANTAGE', 'BOARD_PRESENCE'];
      failureModes = ['MANA_SCREW_EARLY', 'OVERWHELMED_BY_AGGRO'];
      falsifiers = [
        {
          id: 'FALSIFIER_MIDRANGE_VALUE_DEFICIT',
          claim: 'Lack of 2-for-1 card advantage trades degrades midgame stabilization',
          evidenceRequired: ['CARD_ADVANTAGE'],
          failureCondition: 'VALUE_UNPROVEN'
        }
      ];
    } else {
      // Default: Control (Azorius / Jeskai / Dimir)
      thesisSummary = 'Control the board with counterspells and removal, reset wide boards with sweepers, generate card advantage, and close with inevitable late-game payoff.';
      winPath = ['CHEAP_REMOVAL', 'CARD_FLOW', 'SWEEPER', 'INEVITABLE_WIN_PAYOFF'];
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
        archetype: rawArch,
        primaryTribe: rawTribeStr,
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
    const targetNonLands = deckState.targetNonLands || 36;

    // Density Counters for Evidence Validation
    const nonLandCards = cards.filter(c => !c.type_line?.toLowerCase().includes('land'));
    const t1Cards = nonLandCards.filter(c => (c.cmc || c.mana_value || 0) <= 1);
    const t1Count = t1Cards.reduce((sum, c) => sum + (c.quantity || 1), 0);

    const t2Cards = nonLandCards.filter(c => (c.cmc || c.mana_value || 0) === 2);
    const t2Count = t2Cards.reduce((sum, c) => sum + (c.quantity || 1), 0);

    const creatureCards = nonLandCards.filter(c => (c.type_line || '').toLowerCase().includes('creature'));
    const creatureCount = creatureCards.reduce((sum, c) => sum + (c.quantity || 1), 0);

    const tribeCards = nonLandCards.filter(c => {
      const type = (c.type_line || '').toLowerCase();
      const text = (c.oracle_text || c.text || '').toLowerCase();
      return rawTribe && (type.includes(rawTribe) || text.includes(rawTribe));
    });
    const tribeCount = tribeCards.reduce((sum, c) => sum + (c.quantity || 1), 0);

    const removalCards = nonLandCards.filter(c => {
      const text = (c.oracle_text || c.text || '').toLowerCase();
      return text.includes('destroy') || text.includes('exile') || text.includes('counter target') || text.includes('deals ') || text.includes('-x/-x');
    });
    const removalCount = removalCards.reduce((sum, c) => sum + (c.quantity || 1), 0);

    const drawCards = nonLandCards.filter(c => {
      const text = (c.oracle_text || c.text || '').toLowerCase();
      return text.includes('draw a') || text.includes('draw cards') || text.includes('exile the top') || text.includes('investigate');
    });
    const drawCount = drawCards.reduce((sum, c) => sum + (c.quantity || 1), 0);

    const finisherCards = nonLandCards.filter(c => (c.cmc || c.mana_value || 0) >= 4 || Number(c.power || 0) >= 4);
    const finisherCount = finisherCards.reduce((sum, c) => sum + (c.quantity || 1), 0);

    const rampCards = nonLandCards.filter(c => {
      const text = (c.oracle_text || c.text || '').toLowerCase();
      return text.includes('add {') || text.includes('search your library for a land') || text.includes('additional land');
    });
    const rampCount = rampCards.reduce((sum, c) => sum + (c.quantity || 1), 0);

    const openNeeds = [];

    // Map WinPath Steps directly to Systemic Open Needs
    for (const step of winPath) {
      let isSatisfied = false;
      let needConfig = null;

      if (step === 'T1_PRESSURE' || step === 'EVASIVE_ENABLER') {
        isSatisfied = t1Count >= 4;
        if (!isSatisfied) {
          needConfig = {
            need: 'T1_PRESSURE',
            status: 'OPEN',
            priority: 'CRITICAL',
            whyOpen: 'Primary win path lacks proven turn-1 velocity and early board presence.',
            requiredOutcome: 'T1_BOARD_PRESENCE',
            timing: 'T1',
            requiredCapabilities: ['PLAYABLE_T1', 'BOARD_PRESENCE', 'ADVANCES_WIN_PATH'],
            preferredCapabilities: [rawTribe ? `TRIBAL_${rawTribe.toUpperCase()}` : 'TRIBAL_MEMBER', 'HASTE'],
            forbiddenPatterns: ['REQUIRES_T2_MANA', 'PURE_COMBAT_TRICK'],
            cmcMin: 1, cmcMax: 1, targetColors: colors, targetTribe: step === 'EVASIVE_ENABLER' ? null : rawTribe
          };
        }
      } else if (step === 'TRIBAL_DENSITY' || step === 'SACRIFICE_FODDER') {
        isSatisfied = (rawTribe ? tribeCount >= 12 : creatureCount >= 12);
        if (!isSatisfied) {
          const isHeavyTribe = rawTribe && /dragon|demon|dinosaur|eldrazi|angel|giant|sea|marino|kraken|leviathan|serpent|octopus|apex_predators/.test(rawTribe.toLowerCase());
          const maxTribeCmc = isHeavyTribe ? 8 : 4;
          needConfig = {
            need: 'TRIBAL_DENSITY',
            status: 'OPEN',
            priority: 'CRITICAL',
            whyOpen: 'Core board engine lacks required tribal/engine creature density.',
            requiredOutcome: 'ENGINE_DENSITY',
            timing: isHeavyTribe ? 'T2_T6' : 'T1_T3',
            requiredCapabilities: ['CREATURE', rawTribe ? `TRIBAL_${rawTribe.toUpperCase()}` : 'ENGINE_PIECE'],
            preferredCapabilities: ['LORD_EFFECT', 'TOKEN_GENERATOR', 'APEX_PAYOFF'],
            forbiddenPatterns: ['OFF_TRIBE_CREATURE', 'PURE_COMBAT_TRICK'],
            cmcMin: 1, cmcMax: maxTribeCmc, targetColors: colors, targetTribe: rawTribe
          };
        }
      } else if (step === 'T2_PRESSURE' || step === 'NINJUTSU_PAYOFF' || step === 'SACRIFICE_OUTLET') {
        isSatisfied = t2Count >= 8;
        if (!isSatisfied) {
          needConfig = {
            need: 'T2_PRESSURE',
            status: 'OPEN',
            priority: 'HIGH',
            whyOpen: 'Curve execution lacks T2 threat/acceleration into turn 3.',
            requiredOutcome: 'T2_DEVELOPMENT',
            timing: 'T2',
            requiredCapabilities: ['PLAYABLE_T2', 'BOARD_PRESENCE'],
            preferredCapabilities: [rawTribe ? `TRIBAL_${rawTribe.toUpperCase()}` : 'TRIBAL_MEMBER', 'LORD_EFFECT'],
            forbiddenPatterns: ['REQUIRES_T3_MANA', 'PURE_COMBAT_TRICK'],
            cmcMin: 2, cmcMax: 2, targetColors: colors, targetTribe: rawTribe
          };
        }
      } else if (step === 'CHEAP_REMOVAL' || step === 'INSTANT_REMOVAL' || step === 'INTERACTION' || step === 'DISRUPTION') {
        isSatisfied = removalCount >= 6;
        if (!isSatisfied) {
          needConfig = {
            need: 'CHEAP_REMOVAL',
            status: 'OPEN',
            priority: 'CRITICAL',
            whyOpen: 'Lack of early interaction and removal to control opponent threats.',
            requiredOutcome: 'OPPONENT_THREAT_REMOVAL',
            timing: 'T1_T3',
            requiredCapabilities: ['CHEAP_REMOVAL', 'INSTANT_SPEED'],
            preferredCapabilities: ['EXILE', 'DESTROY', 'MODULAR'],
            forbiddenPatterns: ['PURE_COMBAT_TRICK'],
            cmcMin: 1, cmcMax: 3, targetColors: colors, targetTribe: null
          };
        }
      } else if (step === 'CARD_DRAW' || step === 'CARD_FLOW' || step === 'RESOURCE_ENGINE') {
        isSatisfied = drawCount >= 6;
        if (!isSatisfied) {
          needConfig = {
            need: 'CARD_FLOW',
            status: 'OPEN',
            priority: 'HIGH',
            whyOpen: 'Engine requires resource generation and card velocity to avoid running out of gas.',
            requiredOutcome: 'CARD_ADVANTAGE',
            timing: 'T2_T4',
            requiredCapabilities: ['CARD_ADVANTAGE', 'CARD_FLOW'],
            preferredCapabilities: ['REPEATED_DRAW', 'IMPULSE_DRAW'],
            forbiddenPatterns: [],
            cmcMin: 1, cmcMax: 4, targetColors: colors, targetTribe: null
          };
        }
      } else if (step === 'SWEEPER' || step === 'BOARD_WIPE') {
        const hasSweeper = cards.some(c => {
          const text = (c.oracle_text || c.text || '').toLowerCase();
          return text.includes('destroy all') || text.includes('exile all') || text.includes('each creature') || text.includes('return all creatures');
        });
        isSatisfied = hasSweeper;
        if (!isSatisfied) {
          needConfig = {
            need: 'CHEAP_REMOVAL',
            status: 'OPEN',
            priority: 'HIGH',
            whyOpen: 'Control / Midrange plan requires a reset mechanism for wide boards.',
            requiredOutcome: 'BOARD_RESET',
            timing: 'T3_T5',
            requiredCapabilities: ['MASS_REMOVAL', 'BOARD_WIPE'],
            preferredCapabilities: ['UNCONDITIONAL_WRATH'],
            forbiddenPatterns: [],
            cmcMin: 3, cmcMax: 5, targetColors: colors, targetTribe: null
          };
        }
      } else if (step === 'INEVITABLE_WIN_PAYOFF' || step === 'FINISHER' || step === 'APEX_PAYOFF') {
        isSatisfied = finisherCount >= 4;
        if (!isSatisfied) {
          needConfig = {
            need: 'FINISHER',
            status: 'OPEN',
            priority: 'HIGH',
            whyOpen: 'Midrange / Control / Ramp plan lacks apex closers to seal victory.',
            requiredOutcome: 'LETHAL_GAME_CLOSER',
            timing: 'T5_T7',
            requiredCapabilities: ['APEX_PAYOFF', 'FINISHER', 'HIGH_POWER'],
            preferredCapabilities: ['TRAMPLE', 'HASTE', 'PROTECTION', 'ETB_VALUE'],
            forbiddenPatterns: [],
            cmcMin: 4, cmcMax: 12, targetColors: colors, targetTribe: rawTribe
          };
        }
      } else if (step === 'EARLY_RAMP' || step === 'RAMP' || step === 'MANA_ACCELERATION') {
        isSatisfied = rampCount >= 6;
        if (!isSatisfied) {
          needConfig = {
            need: 'EARLY_RAMP',
            status: 'OPEN',
            priority: 'HIGH',
            whyOpen: 'Ramp / Big Mana plan requires early mana acceleration and land searching.',
            requiredOutcome: 'MANA_ACCELERATION',
            timing: 'T1_T3',
            requiredCapabilities: ['MANA_RAMP'],
            preferredCapabilities: ['LAND_TUTOR', 'DORK', 'ARTIFACT_RAMP'],
            forbiddenPatterns: [],
            cmcMin: 1, cmcMax: 3, targetColors: colors, targetTribe: null
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
            preferredCapabilities: ['TOKEN_GENERATOR', 'CHEAP_PERMANENT'],
            forbiddenPatterns: ['CONSUMES_RESOURCE_WITHOUT_SUPPLY'],
            cmcMin: 1, cmcMax: 3, targetColors: colors, targetResource: resKey
          });
        }
      }
    }

    // ─── QUOTA COMPLETION SAFETY NET (CRITICAL SPRINT INVARIANT) ───
    // If all WinPath nodes are satisfied but non-land slots remain unfilled:
    if (openNeeds.length === 0 && nonLandCount < targetNonLands) {
      const isRampOrTron = (thesis.winPath || []).includes('EARLY_RAMP') || (deckState.intentPackage?.selectedEngineId || '').includes('tron');
      
      if (isRampOrTron && finisherCount < 8) {
        openNeeds.push({
          need: 'FINISHER',
          status: 'OPEN',
          priority: 'HIGH',
          whyOpen: `Filling Ramp/Tron apex threat density (${finisherCount}/8).`,
          requiredOutcome: 'LETHAL_GAME_CLOSER',
          timing: 'T4_T7',
          requiredCapabilities: ['FINISHER', 'HIGH_POWER'],
          preferredCapabilities: ['TRAMPLE', 'HASTE', 'PROTECTION', 'ETB_VALUE'],
          forbiddenPatterns: [],
          cmcMin: 4, cmcMax: 12, targetColors: colors, targetTribe: rawTribe
        });
      } else if (creatureCount < 16 && !isRampOrTron) {
        openNeeds.push({
          need: 'TRIBAL_DENSITY',
          status: 'OPEN',
          priority: 'HIGH',
          whyOpen: `Filling core creature density (${creatureCount}/16).`,
          requiredOutcome: 'BOARD_PRESENCE',
          timing: 'T2_T4',
          requiredCapabilities: ['CREATURE'],
          preferredCapabilities: [rawTribe ? `TRIBAL_${rawTribe.toUpperCase()}` : 'VALUE_CREATURE'],
          forbiddenPatterns: [],
          cmcMin: 2, cmcMax: 4, targetColors: colors, targetTribe: rawTribe
        });
      } else if (removalCount < 6) {
        openNeeds.push({
          need: 'CHEAP_REMOVAL',
          status: 'OPEN',
          priority: 'HIGH',
          whyOpen: `Filling interaction quota (${removalCount}/6).`,
          requiredOutcome: 'OPPONENT_THREAT_REMOVAL',
          timing: 'T1_T3',
          requiredCapabilities: ['CHEAP_REMOVAL'],
          preferredCapabilities: ['INSTANT_SPEED'],
          forbiddenPatterns: [],
          cmcMin: 1, cmcMax: 3, targetColors: colors, targetTribe: null
        });
      } else if (drawCount < 4) {
        openNeeds.push({
          need: 'CARD_FLOW',
          status: 'OPEN',
          priority: 'MEDIUM',
          whyOpen: `Filling card flow quota (${drawCount}/4).`,
          requiredOutcome: 'CARD_ADVANTAGE',
          timing: 'T2_T4',
          requiredCapabilities: ['CARD_ADVANTAGE'],
          preferredCapabilities: ['DRAW'],
          forbiddenPatterns: [],
          cmcMin: 1, cmcMax: 3, targetColors: colors, targetTribe: rawTribe
        });
      } else {
        openNeeds.push({
          need: isRampOrTron ? 'FINISHER' : 'TRIBAL_DENSITY',
          status: 'OPEN',
          priority: 'MEDIUM',
          whyOpen: `Completing final non-land slots (${nonLandCount}/${targetNonLands}).`,
          requiredOutcome: isRampOrTron ? 'LETHAL_GAME_CLOSER' : 'MIDGAME_DEVELOPMENT',
          timing: 'T2_T4',
          requiredCapabilities: isRampOrTron ? ['FINISHER', 'HIGH_POWER'] : ['CREATURE', 'SPELL'],
          preferredCapabilities: ['VALUE'],
          forbiddenPatterns: [],
          cmcMin: isRampOrTron ? 4 : 1,
          cmcMax: isRampOrTron ? 12 : 5,
          targetColors: colors,
          targetTribe: rawTribe
        });
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
    const nonLandCount = deckState.nonLandCount !== undefined ? deckState.nonLandCount : (summary.nonLandCards || 0);
    const targetNonLands = deckState.targetNonLands || 36;

    // Handle Deadlock Feedback: Relax Search Constraints and cycle to alternative open needs
    if (lastFeedback && (lastFeedback.includes('0 candidates') || lastFeedback.includes('NO_SELECTION') || lastFeedback.includes('DecisionEngine'))) {
      const openNeeds = LLMStrategist.computeOpenStrategicNeeds(deckState);
      // Pick next alternative need if top need stalled
      const topNeed = openNeeds.length > 1 ? openNeeds[1] : (openNeeds[0] || { need: 'TRIBAL_DENSITY', priority: 'HIGH' });
      
      return {
        need: topNeed.need || 'TRIBAL_DENSITY',
        priority: topNeed.priority || 'HIGH',
        requiredCapabilities: topNeed.requiredCapabilities || ['CREATURE'],
        preferredCapabilities: topNeed.preferredCapabilities || [],
        forbiddenPatterns: [],
        targetColors: colors,
        cmcMin: 1,
        cmcMax: topNeed.cmcMax || 12,
        targetTribe: tribe,
        reasoning: `Pivoting to alternative need [${topNeed.need || 'TRIBAL_DENSITY'}] with expanded CMC [1-${topNeed.cmcMax || 12}] to resolve deadlock.`
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
        reasoning: topNeed.whyOpen || topNeed.reason
      };
    }

    // WinPath Completion Invariant: Only return STOP_CAUSAL if non-land quota is truly filled!
    if (nonLandCount >= targetNonLands) {
      return {
        need: 'STOP_CAUSAL',
        status: 'SATISFIED',
        priority: 'LOW',
        targetColors: colors,
        reasoning: 'All WinPath node requirements are SATISFIED and 36 non-land cards are compiled.'
      };
    }

    // Fallback: Continue filling non-land slots
    return {
      need: 'TRIBAL_DENSITY',
      priority: 'MEDIUM',
      requiredCapabilities: ['CREATURE'],
      preferredCapabilities: [],
      forbiddenPatterns: [],
      targetColors: colors,
      cmcMin: 2,
      cmcMax: 4,
      targetTribe: tribe,
      reasoning: `Filling remaining non-land slots (${nonLandCount}/${targetNonLands}).`
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
