/**
 * DECK STATE — THE GUARDIAN (Sprint 6 Agentic System Core)
 * 
 * Live immutable deck state manager.
 * Enforces MTG deckbuilding rules (4x playset limit, 60-card deck target),
 * tracks CMC curve & mana pips in real-time, exposes `getStrategicSummary()` for
 * low-token LLM reasoning, and deterministically resolves Frank Karsten mana bases.
 */

import { parseSemanticCard } from '../semanticCardParser.js';

export class DeckState {
  constructor(intentPackage = {}) {
    this.intentPackage = intentPackage;
    this.format = (intentPackage.format || 'STANDARD').toUpperCase();
    this.colors = Array.isArray(intentPackage.colors) && intentPackage.colors.length > 0
      ? intentPackage.colors.map(c => c.toUpperCase())
      : ['B', 'R'];
    this.primaryTribe = intentPackage.primaryTribe || null;
    
    const constraints = intentPackage.userConstraints || {};
    this.targetSize = Number(constraints.deckSize || intentPackage.deckSize || 60);
    this.isSingleton = Boolean(constraints.singleton || this.format === 'COMMANDER');
    this.maxCopies = this.isSingleton ? 1 : Number(constraints.maxCopies || 4);
    this.archetype = intentPackage.archetype || intentPackage.tempo || 'Midrange';
    this.selectedEngineId = constraints.selectedEngineId || intentPackage.selectedEngineId || null;

    // v9.5 Persistent Reasoning Memory
    this.strategicMemory = [];
    this.exitReason = null;

    // Dynamic Format & Archetype Land Ratio (Pro Tour Karsten Formula)
    const manaGreed = (constraints.manaGreed || 'balanced').toLowerCase();
    const curveProfile = (constraints.curveProfile || 'balanced').toLowerCase();
    const archetypeLower = (this.archetype || '').toLowerCase();
    const isCommander = this.format === 'COMMANDER' || this.targetSize >= 100;

    if (isCommander) {
      this.targetLands = 36;
    } else {
      let baseLandCount = 24; // Default Midrange baseline
      const engineLower = (intentPackage.selectedEngineId || '').toLowerCase();
      const flavorLower = (intentPackage.engineFlavor || '').toLowerCase();
      
      const isAggroOrTempo = archetypeLower.includes('aggro') || 
                             archetypeLower.includes('burn') || 
                             archetypeLower.includes('tempo') || 
                             engineLower.includes('tempo') || 
                             engineLower.includes('aggro') || 
                             flavorLower.includes('tempo') || 
                             flavorLower.includes('aggro') || 
                             curveProfile.includes('aggressive') || 
                             curveProfile.includes('fast');

      const isControlOrRamp = archetypeLower.includes('control') || 
                              archetypeLower.includes('ramp') || 
                              archetypeLower.includes('big mana') || 
                              archetypeLower.includes('tron') || 
                              engineLower.includes('control') || 
                              engineLower.includes('ramp');

      if (isAggroOrTempo) {
        baseLandCount = 20; // Aggressive / Tempo low-curve baseline
      } else if (isControlOrRamp) {
        baseLandCount = 26; // High curve Control / Ramp baseline
      }

      // Mana Greed tuning
      if (manaGreed === 'greedy') baseLandCount -= 2;
      else if (manaGreed === 'conservative') baseLandCount += 2;

      // Curve Profile tuning
      if (curveProfile.includes('low') || curveProfile.includes('fast') || curveProfile.includes('aggressive')) baseLandCount -= 1;
      else if (curveProfile.includes('high') || curveProfile.includes('heavy')) baseLandCount += 1;

      // Safety boundaries for 60-card decks: min 18, max 28
      this.targetLands = Math.max(18, Math.min(28, baseLandCount));
    }
    this.targetNonLands = this.targetSize - this.targetLands;

    this.cards = new Map(); // cardName -> { name, card, quantity, rationale, role, cmc, colors, type_line, provenance }
    this.nonLandCount = 0;
    this.landCount = 0;
    this.rolesFilled = new Set();
    this.pips = { R: 0, G: 0, W: 0, U: 0, B: 0, C: 0 };
    this.cmcCurve = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    
    // Pro Tour Cognitive Engine Extensions
    this.bottlenecks = []; // Array of { id, priority: 'CRITICAL'|'HIGH'|'MEDIUM', reason, requiredCapabilities }
    this.causalNodes = new Map(); // nodeKey -> { capacityTarget, currentCount, satiated: boolean }
    
    // Causal Economy Infrastructure Ledger
    this.infrastructureLedger = {
      ARTIFACT_FODDER:  { raw: 0, usable: 0, reliable: 0, demand: 0, surplus: 0, deficit: 0 },
      TOKEN_FODDER:     { raw: 0, usable: 0, reliable: 0, demand: 0, surplus: 0, deficit: 0 },
      CREATURE_FODDER:  { raw: 0, usable: 0, reliable: 0, demand: 0, surplus: 0, deficit: 0 },
      GRAVEYARD_DEPTH:  { raw: 0, usable: 0, reliable: 0, demand: 0, surplus: 0, deficit: 0 },
      INSTANT_SORCERY:  { raw: 0, usable: 0, reliable: 0, demand: 0, surplus: 0, deficit: 0 },
      ENCHANTMENT:      { raw: 0, usable: 0, reliable: 0, demand: 0, surplus: 0, deficit: 0 },
      COUNTER:          { raw: 0, usable: 0, reliable: 0, demand: 0, surplus: 0, deficit: 0 },
      EARLY_MANA:       { raw: 0, usable: 0, reliable: 0, demand: 0, surplus: 0, deficit: 0 },
      DISCARD:          { raw: 0, usable: 0, reliable: 0, demand: 0, surplus: 0, deficit: 0 }
    };

    this.updateStrategicBottlenecks();
    this.rebuildInfrastructureLedger();
  }

  /**
   * Records structured strategic memory of build decisions and rejections (v9.5)
   */
  recordMemoryEntry(entry = {}) {
    const memoryRecord = {
      iteration: entry.iteration || (this.strategicMemory.length + 1),
      thesisVersion: entry.thesisVersion || 'V1',
      need: entry.need || 'FLEX',
      selected: entry.selected || null,
      rejectedCandidates: entry.rejectedCandidates || [],
      evidence: entry.evidence || [],
      refutations: entry.refutations || [],
      stateBefore: entry.stateBefore || { nonLands: this.nonLandCount },
      stateAfter: entry.stateAfter || { nonLands: this.nonLandCount }
    };
    this.strategicMemory.push(memoryRecord);
  }

  /**
   * Recalculates live deck bottlenecks based on curve, pips, and capabilities
   */
  updateStrategicBottlenecks() {
    this.bottlenecks = [];
    const archetypeLower = (this.archetype || '').toLowerCase();
    const isRamp = archetypeLower.includes('ramp') || archetypeLower.includes('tron');
    const isAggro = archetypeLower.includes('aggro') || archetypeLower.includes('burn');
    const isTempo = archetypeLower.includes('tempo');

    // 1. MANA_ACCELERATION Bottleneck Check
    if (isRamp) {
      const earlyRampCount = (this.cmcCurve[1] || 0) + (this.cmcCurve[2] || 0);
      const highCmcCount = (this.cmcCurve[5] || 0) + (this.cmcCurve[6] || 0) + (this.cmcCurve[7] || 0);
      if (earlyRampCount < 6 && highCmcCount >= 4) {
        this.bottlenecks.push({
          id: 'MANA_ACCELERATION',
          priority: 'CRITICAL',
          reason: `Ramp plan requires early acceleration (current: ${earlyRampCount}/8), high-CMC density is ${highCmcCount}`,
          requiredCapabilities: ['PRODUCES_MANA', 'SEARCH_LAND', 'PLAYABLE_T1_T2']
        });
      }
    }

    // 2. EARLY_INTERACTION Bottleneck Check
    if (isAggro || isTempo) {
      const earlyInteractCount = (this.cmcCurve[1] || 0);
      if (earlyInteractCount < 6 && this.nonLandCount >= 12) {
        this.bottlenecks.push({
          id: 'EARLY_INTERACTION',
          priority: 'CRITICAL',
          reason: `Fast tempo/aggro plan requires T1-T2 responses (current T1: ${earlyInteractCount}/8)`,
          requiredCapabilities: ['CHEAP_REMOVAL', 'COUNTER_SPELL', 'BOUNCE', 'PLAYABLE_T1']
        });
      }
    }

    // 3. CAUSAL_PAYOFF_MISSING Bottleneck Check
    const cardEntries = Array.from(this.cards.values());
    const hasSacOutlets = cardEntries.some(c => {
      const text = (c.oracle_text || c.card?.oracle_text || '').toLowerCase();
      return text.includes('sacrifice a creature') || text.includes('sacrifice another creature');
    });
    const hasDeathPayoffs = cardEntries.some(c => {
      const text = (c.oracle_text || c.card?.oracle_text || '').toLowerCase();
      return text.includes('whenever a creature dies') || text.includes('whenever another creature dies');
    });

    if (hasSacOutlets && !hasDeathPayoffs && this.nonLandCount >= 4) {
      this.bottlenecks.push({
        id: 'CAUSAL_PAYOFF_MISSING',
        priority: 'CRITICAL',
        reason: 'Aristocrats engine has Sacrifice Outlets but 0 Death Payoffs',
        requiredCapabilities: ['DEATH_PAYOFF', 'DRAIN_LIFE']
      });
    }

    return this.bottlenecks;
  }

  /**
   * Generates dynamic StrategicRole contract for the NEXT unfilled slot
   */
  getNextStrategicRoleContract() {
    this.updateStrategicBottlenecks();
    const criticalBottleneck = this.bottlenecks.find(b => b.priority === 'CRITICAL');

    if (criticalBottleneck) {
      return {
        role: criticalBottleneck.id,
        priority: 'CRITICAL',
        reason: criticalBottleneck.reason,
        requiredCapabilities: criticalBottleneck.requiredCapabilities,
        castabilityContract: {
          turn: criticalBottleneck.id.includes('T1') ? 1 : 2,
          minProbability: 0.90,
          source: 'STRATEGIC_ROLE_BOTTLENECK'
        }
      };
    }

    // Default Role Contract derivation from Archetype & unfilled slots
    const archetypeLower = (this.archetype || '').toLowerCase();
    if (this.primaryTribe && (this.cmcCurve[2] + this.cmcCurve[3]) < 16) {
      return {
        role: 'TRIBAL_THREAT',
        priority: 'HIGH',
        reason: `Building core tribal density for [${this.primaryTribe}]`,
        requiredCapabilities: ['CREATURE', 'TRIBAL_SUBTYPE'],
        targetTribe: this.primaryTribe
      };
    }

    if (archetypeLower.includes('tempo') && this.cmcCurve[1] < 8) {
      return {
        role: 'EARLY_INTERACTION',
        priority: 'HIGH',
        reason: 'Tempo double-spelling index requires T1-T2 interaction',
        requiredCapabilities: ['COUNTER_SPELL', 'FLASH', 'CHEAP_REMOVAL', 'PLAYABLE_T1']
      };
    }

    return {
      role: 'FLEX_THREAT',
      priority: 'MEDIUM',
      reason: 'Standard strategic progression',
      requiredCapabilities: ['CREATURE', 'SPELL']
    };
  }

  /**
   * Phase 0 Pre-load: Mandatory Must-Include Cards from UI
   */
  preloadMustIncludes(mustIncludeCards = []) {
    if (!Array.isArray(mustIncludeCards) || mustIncludeCards.length === 0) return [];

    const preloaded = [];
    for (const item of mustIncludeCards) {
      const cardObj = typeof item === 'string' ? { name: item, cmc: 2, type_line: 'Creature', colors: this.colors } : item;
      const copies = this.isSingleton ? 1 : 4;
      const res = this.addCard(cardObj, copies, 'Preloaded User Mandatory Must-Include', 'MUST_INCLUDE');
      if (res.success) {
        preloaded.push({ name: cardObj.name, count: res.added });
      }
    }
    return preloaded;
  }

  /**
   * Phase 0 Pre-load: Selected Core Packages from UI
   */
  preloadCorePackages(selectedCorePackages = []) {
    if (!Array.isArray(selectedCorePackages) || selectedCorePackages.length === 0) return [];

    const preloaded = [];
    const MAX_PRELOAD_CORE_SLOTS = 8; // Leave 28+ non-land slots open for ReAct Agent loop!

    for (const pkg of selectedCorePackages) {
      const cards = pkg.cards || pkg.packageCards || (Array.isArray(pkg) ? pkg : []);
      // Filter to Tier 1 cards only
      const tier1Cards = cards.filter(c => typeof c === 'object' && c.tier === 1);
      const targetCards = tier1Cards.length > 0 ? tier1Cards : cards;

      for (const card of targetCards) {
        if (this.nonLandCount >= MAX_PRELOAD_CORE_SLOTS) break;

        const cardObj = typeof card === 'string' ? { name: card, cmc: 3, type_line: 'Creature', colors: this.colors } : card;
        const requestedQty = card.quantity || 4;
        const copies = this.isSingleton ? 1 : Math.min(requestedQty, MAX_PRELOAD_CORE_SLOTS - this.nonLandCount);
        
        if (copies <= 0) break;

        const res = this.addCard(cardObj, copies, `Preloaded Core Seed [${pkg.name || pkg.id || 'CORE'}]`, 'CORE_PACKAGE');
        if (res.success) {
          preloaded.push({ name: cardObj.name, count: res.added });
        }
      }
    }
    return preloaded;
  }


  isBasicLand(cardName = '') {
    const norm = cardName.toLowerCase();
    return ['swamp', 'mountain', 'forest', 'island', 'plains', 'snow-covered swamp', 'snow-covered mountain', 'snow-covered forest', 'snow-covered island', 'snow-covered plains'].includes(norm);
  }

  /**
   * Add card to state with playset validation & invariants
   */
  addCard(card, count = 4, rationale = '', role = '') {
    if (!card || !card.name) {
      return { success: false, reason: 'Invalid card object provided' };
    }

    const cardName = card.name;
    const isLand = (card.type_line || card.typeLine || '').toLowerCase().includes('land') || this.isBasicLand(cardName);
    const existing = this.cards.get(cardName);
    const currentQty = existing ? existing.quantity : 0;

    // Invariant 1: Playset Limit (Basic lands exempt)
    if (!this.isBasicLand(cardName) && currentQty + count > this.maxCopies) {
      const allowed = Math.max(0, this.maxCopies - currentQty);
      if (allowed === 0) {
        return { success: false, reason: `Card "${cardName}" has reached maximum playset limit of ${this.maxCopies} copies.` };
      }
      count = allowed; // Truncate to max allowed
    }

    // Invariant 2: Capacity check
    if (!isLand && this.nonLandCount + count > this.targetNonLands) {
      const allowed = Math.max(0, this.targetNonLands - this.nonLandCount);
      if (allowed === 0) {
        return { success: false, reason: `Non-land deck capacity reached (${this.nonLandCount}/${this.targetNonLands} slots).` };
      }
      count = allowed;
    }

    // Invariant 3: High-CMC Ceiling Check (Prevent top-heavy curves, with exception for Heavy Tribes)
    const cmcVal = Number(card.cmc || card.mana_value || 0);
    if (!isLand && cmcVal >= 5) {
      const isRamp = (this.archetype || '').toLowerCase().includes('ramp') || (this.selectedEngineId || '').toLowerCase().includes('ramp');
      const targetTribe = (this.primaryTribe || '').toLowerCase();
      const HEAVY_TRIBES = ['dragon', 'demon', 'giant', 'dinosaur', 'eldrazi', 'kraken', 'sphinx', 'angel', 'sea_monsters', 'apex_predators'];
      const isHeavyTribe = HEAVY_TRIBES.some(t => targetTribe.includes(t));

      const max5PlusAllowed = isHeavyTribe ? 14 : (isRamp ? 10 : 6);
      const current5Plus = (this.cmcCurve[5] || 0) + (this.cmcCurve[6] || 0) + (this.cmcCurve[7] || 0);
      if (current5Plus + count > max5PlusAllowed) {
        const allowed = Math.max(0, max5PlusAllowed - current5Plus);
        if (allowed === 0) {
          return { success: false, reason: `High-CMC spell capacity reached (${current5Plus}/${max5PlusAllowed} slots for CMC >= 5).` };
        }
        count = allowed;
      }
    }

    if (count <= 0) {
      return { success: false, reason: 'No available slots for this card' };
    }

    // Mutate state deterministically
    const newQty = currentQty + count;
    this.cards.set(cardName, {
      name: cardName,
      card,
      quantity: newQty,
      rationale: rationale || `Strategic inclusion for role [${role || 'FLEX'}]`,
      role: role || existing?.role || 'FLEX',
      cmc: card.cmc || card.mana_value || 0,
      oracle_text: card.oracle_text || card.oracleText || card.text || '',
      type_line: card.type_line || card.typeLine || ''
    });

    if (isLand) {
      this.landCount += count;
    } else {
      this.nonLandCount += count;
      if (role) this.rolesFilled.add(role.toUpperCase());

      // Track CMC curve
      const cmc = Math.min(7, card.cmc || card.mana_value || 0);
      this.cmcCurve[cmc] = (this.cmcCurve[cmc] || 0) + count;

      // Track Mana Pips
      const costStr = (card.mana_cost || card.manaCost || '').toUpperCase();
      if (costStr.length > 0) {
        for (const char of ['R', 'G', 'W', 'U', 'B']) {
          const matches = (costStr.match(new RegExp(char, 'g')) || []).length;
          this.pips[char] += matches * count;
        }
      } else if (Array.isArray(card.colors) && card.colors.length > 0) {
        for (const col of card.colors) {
          const char = col.toUpperCase();
          if (this.pips[char] !== undefined) {
            this.pips[char] += 1 * count;
          }
        }
      }

    }

    this.rebuildInfrastructureLedger();

    return {
      success: true,
      added: count,
      totalCardCopies: newQty,
      nonLandCount: this.nonLandCount,
      remainingNonLandSlots: this.targetNonLands - this.nonLandCount
    };
  }

  /**
   * Remove or decrement card from deckState during tactical refinement swaps
   */
  removeCard(cardName, count = 1) {
    const existing = this.cards.get(cardName);
    if (!existing) {
      return { success: false, reason: `Card "${cardName}" not in deckState` };
    }

    const removeQty = Math.min(existing.quantity, count);
    const newQty = existing.quantity - removeQty;

    const isLand = (existing.type_line || '').toLowerCase().includes('land') || this.isBasicLand(cardName);

    if (isLand) {
      this.landCount -= removeQty;
    } else {
      this.nonLandCount -= removeQty;
      const cmc = Math.min(7, existing.cmc || 0);
      this.cmcCurve[cmc] = Math.max(0, (this.cmcCurve[cmc] || 0) - removeQty);
    }

    if (newQty <= 0) {
      this.cards.delete(cardName);
    } else {
      existing.quantity = newQty;
    }

    this.rebuildInfrastructureLedger();

    return { success: true, removed: removeQty, remaining: newQty };
  }

  /**
   * Recalculates Causal Infrastructure Ledger (RAW_SUPPLY, USABLE_SUPPLY, RELIABLE_SUPPLY, Surplus/Deficit)
   */
  rebuildInfrastructureLedger() {
    const ledger = {
      ARTIFACT_FODDER:  { raw: 0, usable: 0, reliable: 0, demand: 0, surplus: 0, deficit: 0 },
      TOKEN_FODDER:     { raw: 0, usable: 0, reliable: 0, demand: 0, surplus: 0, deficit: 0 },
      CREATURE_FODDER:  { raw: 0, usable: 0, reliable: 0, demand: 0, surplus: 0, deficit: 0 },
      GRAVEYARD_DEPTH:  { raw: 0, usable: 0, reliable: 0, demand: 0, surplus: 0, deficit: 0 },
      INSTANT_SORCERY:  { raw: 0, usable: 0, reliable: 0, demand: 0, surplus: 0, deficit: 0 },
      ENCHANTMENT:      { raw: 0, usable: 0, reliable: 0, demand: 0, surplus: 0, deficit: 0 },
      COUNTER:          { raw: 0, usable: 0, reliable: 0, demand: 0, surplus: 0, deficit: 0 },
      EARLY_MANA:       { raw: 0, usable: 0, reliable: 0, demand: 0, surplus: 0, deficit: 0 },
      DISCARD:          { raw: 0, usable: 0, reliable: 0, demand: 0, surplus: 0, deficit: 0 }
    };

    // Calculate Cantrip/Tutor Assembly Factor
    let cantripCount = 0;
    for (const entry of this.cards.values()) {
      const cardObj = entry.card || entry;
      const oracle = (cardObj.oracle_text || cardObj.oracleText || cardObj.text || '').toLowerCase();
      if (oracle.includes('draw a card') || oracle.includes('look at the top') || oracle.includes('search your library')) {
        cantripCount += entry.quantity;
      }
    }
    const assemblyFactor = 1.0 + (cantripCount * 0.05);

    // Populate supplies & demands
    for (const entry of this.cards.values()) {
      const cardObj = entry.card || entry;
      const parsed = parseSemanticCard(cardObj);
      const qty = entry.quantity || 1;

      // Accumulate supplies
      (parsed.supplies || []).forEach(sup => {
        const key = this.mapResourceToLedgerKey(sup.resource);
        if (ledger[key]) {
          ledger[key].raw += qty * (sup.quantity || 1);
          if (sup.usableAsFodder !== false) {
            ledger[key].usable += qty * (sup.quantity || 1);
          }
        }
      });

      // Accumulate demands
      (parsed.demands || []).forEach(dem => {
        const key = this.mapResourceToLedgerKey(dem.resource);
        if (ledger[key]) {
          ledger[key].demand += qty * (dem.quantity || 1);
        }
      });
    }

    // Calculate reliable supply, surplus and deficit
    for (const key of Object.keys(ledger)) {
      const entry = ledger[key];
      entry.reliable = Math.round(entry.usable * assemblyFactor * 10) / 10;
      entry.surplus = Math.max(0, entry.usable - entry.demand);
      entry.deficit = Math.max(0, entry.demand - entry.usable);
    }

    this.infrastructureLedger = ledger;
  }

  mapResourceToLedgerKey(resourceStr) {
    if (!resourceStr) return 'CREATURE_FODDER';
    const s = resourceStr.toUpperCase();
    if (s.includes('ARTIFACT')) return 'ARTIFACT_FODDER';
    if (s.includes('TOKEN')) return 'TOKEN_FODDER';
    if (s.includes('CREATURE')) return 'CREATURE_FODDER';
    if (s.includes('GRAVEYARD')) return 'GRAVEYARD_DEPTH';
    if (s.includes('INSTANT') || s.includes('SORCERY')) return 'INSTANT_SORCERY';
    if (s.includes('ENCHANTMENT')) return 'ENCHANTMENT';
    if (s.includes('COUNTER')) return 'COUNTER';
    if (s.includes('MANA')) return 'EARLY_MANA';
    if (s.includes('DISCARD')) return 'DISCARD';
    return 'CREATURE_FODDER';
  }

  /**
   * Returns strategic metrics
   */
  getMetrics() {
    return {
      totalCards: this.nonLandCount + this.landCount,
      nonLandCards: this.nonLandCount,
      targetNonLands: this.targetNonLands,
      landCards: this.landCount,
      targetLands: this.targetLands,
      cmcCurve: { ...this.cmcCurve },
      pips: { ...this.pips },
      rolesFilled: Array.from(this.rolesFilled)
    };
  }

  /**
   * Token-optimized compact summary for LLM context window
   */
  getStrategicSummary() {
    const allPossibleRoles = ['EARLY_INTERACTION', 'CHEAP_REMOVAL', 'EARLY_RAMP', 'CARD_FLOW', 'TRIBAL_THREAT', 'TRIBAL_DENSITY', 'FINISHER'];
    const filledArray = Array.from(this.rolesFilled);
    const missingRoles = allPossibleRoles.filter(r => !filledArray.includes(r));

    return {
      totalCards: this.nonLandCount + this.landCount,
      targetSize: this.targetSize,
      nonLandCards: this.nonLandCount,
      targetNonLands: this.targetNonLands,
      remainingNonLandSlots: Math.max(0, this.targetNonLands - this.nonLandCount),
      format: this.format,
      colors: this.colors,
      primaryTribe: this.primaryTribe,
      archetype: this.archetype,
      selectedEngineId: this.selectedEngineId,
      strategy: this.selectedEngineId,
      cmc_curve: { ...this.cmcCurve },
      pips: {
        B: this.pips.B,
        R: this.pips.R,
        U: this.pips.U,
        G: this.pips.G,
        W: this.pips.W
      },
      roles_filled: filledArray,
      missing_roles: missingRoles
    };
  }

  /**
   * Frank Karsten Land Resolver: Auto-fills 24 land slots based on non-land pip ratios
   */
  autoResolveManaBase() {
    const neededLands = this.targetSize - (this.nonLandCount + this.landCount);
    if (neededLands <= 0) return;

    // Dual Land DB matching deck colors
    const dualLandCatalog = [
      { name: 'Blood Crypt', colors: ['B', 'R'], type_line: 'Land — Swamp Mountain' },
      { name: 'Stomping Ground', colors: ['R', 'G'], type_line: 'Land — Mountain Forest' },
      { name: 'Overgrown Tomb', colors: ['B', 'G'], type_line: 'Land — Swamp Forest' },
      { name: 'Steam Vents', colors: ['U', 'R'], type_line: 'Land — Island Mountain' },
      { name: 'Watery Grave', colors: ['U', 'B'], type_line: 'Land — Island Swamp' },
      { name: 'Temple Garden', colors: ['G', 'W'], type_line: 'Land — Forest Plains' },
      { name: 'Sacred Foundry', colors: ['R', 'W'], type_line: 'Land — Mountain Plains' },
      { name: 'Godless Shrine', colors: ['W', 'B'], type_line: 'Land — Plains Swamp' },
      { name: 'Hallowed Fountain', colors: ['W', 'U'], type_line: 'Land — Plains Island' },
      { name: 'Breeding Pool', colors: ['G', 'U'], type_line: 'Land — Forest Island' }
    ];

    // Find dual land matching deck colors
    const matchingDual = dualLandCatalog.find(land => 
      land.colors.every(c => this.colors.includes(c))
    );

    let assigned = 0;

    // Allocate 4 copies of matching dual land if multicolor
    if (matchingDual && this.colors.length > 1 && neededLands >= 4) {
      this.addCard({
        name: matchingDual.name,
        type_line: matchingDual.type_line,
        cmc: 0,
        colors: matchingDual.colors
      }, 4, 'Frank Karsten Dual Land allocation', 'MANA_BASE');
      assigned += 4;
    }

    const remainingLands = this.targetSize - (this.nonLandCount + this.landCount);
    if (remainingLands <= 0) return;

    // Determine basic land distribution based on pip count ratios
    const totalPips = (this.colors.includes('B') ? this.pips.B : 0) +
                      (this.colors.includes('R') ? this.pips.R : 0) +
                      (this.colors.includes('U') ? this.pips.U : 0) +
                      (this.colors.includes('G') ? this.pips.G : 0) +
                      (this.colors.includes('W') ? this.pips.W : 0) || 1;

    const basicMap = {
      B: { name: 'Swamp', type_line: 'Basic Land — Swamp' },
      R: { name: 'Mountain', type_line: 'Basic Land — Mountain' },
      U: { name: 'Island', type_line: 'Basic Land — Island' },
      G: { name: 'Forest', type_line: 'Basic Land — Forest' },
      W: { name: 'Plains', type_line: 'Basic Land — Plains' }
    };

    const activeColors = this.colors.filter(c => basicMap[c]);
    let landsDistributed = 0;

    for (let i = 0; i < activeColors.length; i++) {
      const color = activeColors[i];
      const basic = basicMap[color];
      const pipCount = Math.max(1, this.pips[color] || 1);

      let allocatedCount = Math.round(remainingLands * (pipCount / totalPips));
      if (i === activeColors.length - 1) {
        allocatedCount = remainingLands - landsDistributed; // Remainder to last color
      }

      if (allocatedCount > 0) {
        this.addCard({
          name: basic.name,
          type_line: basic.type_line,
          cmc: 0,
          colors: [color]
        }, allocatedCount, `Frank Karsten Basic ${basic.name} ratio allocation`, 'MANA_BASE');
        landsDistributed += allocatedCount;
      }
    }
  }

  /**
   * Export final 60-card deck list
   */
  exportDeckList() {
    const list = [];
    for (const entry of this.cards.values()) {
      list.push({
        name: entry.name,
        quantity: entry.quantity,
        role: entry.role,
        rationale: entry.rationale,
        cmc: entry.cmc,
        type_line: entry.type_line
      });
    }
    return list;
  }
}
