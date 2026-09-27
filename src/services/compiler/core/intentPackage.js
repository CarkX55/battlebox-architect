/**
 * src/services/compiler/core/intentPackage.js
 * 
 * IntentPackage: Single Intent Authority Domain Model v1.2.
 * Immutable SSOT representation of 100% user intent received from the UI.
 */

export class IntentPackage {
  constructor({
    prompt = '',
    format = 'Standard',
    colors = [],
    primaryTribe = null,
    tempo = 'Aggro',
    strategy = [],
    mechanics = [],
    budget = 'Unlimited',
    powerLevel = 'Competitive',
    userConstraints = {},
    preferredCurve = { 1: 12, 2: 18, 3: 12, 4: 6, 5: 4, 6: 2 },
    expectedWinTurn = 5,
    mustRules = [],
    mustNotRules = [],
    preferRules = [],
    isOpenStrategy = false,
    customizationLevel = 'ADVANCED',
    intentPriorities = {
      competitiveVsTheme: 0.8,
      tribeVsSynergy: 0.8,
      innovationVsConsistency: 0.2
    },
    archetypePreferences = {},
    tripartiteConstraints = {
      hard: [],
      preferred: [],
      open: true
    },
    thesisRefutationPolicy = 'REFORMULATE_IF_BETTER',
    softPreferences = {
      likedCards: [],
      avoidedCards: []
    },
    strategicFreedom = {
      discoverSynergies: true,
      allowSubArchetypePivot: true,
      reformulateIfRefuted: true,
      allowOffTribe: false
    },
    decisionPhilosophy = 'MAX_POWER',
    constructionMode = 'PRO',
    source = 'UI_FORM_STATE',
    timestamp = null
  } = {}) {
    this.prompt = prompt;
    this.format = (format || 'Standard').toUpperCase();
    this.colors = Object.freeze(colors.map(c => c.toUpperCase()));
    this.primaryTribe = primaryTribe ? primaryTribe.trim() : null;

    // Canonical strategicTempo (Rule 5 & Phase B): Unified SSOT enum
    let normalizedTempo = 'MIDRANGE';
    const rawTempoStr = String(tempo || '').toUpperCase();
    if (rawTempoStr.includes('AGGRO') || rawTempoStr.includes('BURN') || rawTempoStr.includes('SLIGH')) {
      normalizedTempo = 'AGGRO';
    } else if (rawTempoStr.includes('TEMPO')) {
      normalizedTempo = 'TEMPO';
    } else if (rawTempoStr.includes('CONTROL')) {
      normalizedTempo = 'CONTROL';
    } else if (rawTempoStr.includes('RAMP')) {
      normalizedTempo = 'RAMP';
    } else if (rawTempoStr.includes('COMBO')) {
      normalizedTempo = 'COMBO';
    } else if (rawTempoStr.includes('MIDRANGE')) {
      normalizedTempo = 'MIDRANGE';
    }
    this.strategicTempo = normalizedTempo;
    this.tempo = normalizedTempo;
    this.archetype = normalizedTempo;

    // Canonical tribalPreference (Continuous Weight 0.0 - 1.0, Rule 1)
    const rawTribalVal = intentPriorities?.tribeVsSynergy !== undefined
      ? Number(intentPriorities.tribeVsSynergy)
      : 0.8;
    const clampedTribalVal = Math.max(0.0, Math.min(1.0, isNaN(rawTribalVal) ? 0.8 : rawTribalVal));
    this.tribalPreference = Object.freeze({
      value: clampedTribalVal,
      interpretation: clampedTribalVal >= 0.75 ? 'TRIBAL_PURITY' : (clampedTribalVal <= 0.25 ? 'POWER_SYNERGY' : 'BALANCED'),
      source: 'UI'
    });

    // Canonical allowOffTribe (Hard Permission Gate, Rule 1)
    this.allowOffTribe = strategicFreedom?.allowOffTribe !== undefined
      ? Boolean(strategicFreedom.allowOffTribe)
      : false;

    this.strategy = Object.freeze([...(Array.isArray(strategy) ? strategy : (strategy ? [strategy] : []))]);

    // Canonical Identity Policy (Creature Domain vs Spell Utility)
    const creatureMembershipMode = (!this.primaryTribe || this.primaryTribe === 'None')
      ? 'NON_TRIBAL'
      : (this.allowOffTribe ? 'ALLOW_APPROVED_EXTERNAL_ENGINE' : 'STRICT_TRIBE');
    this.identityPolicy = Object.freeze({
      creatureMembershipMode,
      primaryTribe: this.primaryTribe,
      allowOffTribe: this.allowOffTribe
    });

    // Tri-State Mechanics Modalities: EXPLICIT_REQUIRED (Hard gate), PREFERRED (Affinity boost), OPTIONAL (Tiebreaker)
    let explicitReq = [];
    let req = [];
    let pref = [];
    let opt = [];

    if (mechanics && typeof mechanics === 'object' && !Array.isArray(mechanics)) {
      explicitReq = Array.isArray(mechanics.explicitRequired) ? [...mechanics.explicitRequired] : [];
      req = Array.isArray(mechanics.required) ? [...mechanics.required] : (mechanics.required ? [mechanics.required] : []);
      pref = Array.isArray(mechanics.preferred) ? [...mechanics.preferred] : (mechanics.preferred ? [mechanics.preferred] : []);
      opt = Array.isArray(mechanics.optional) ? [...mechanics.optional] : (mechanics.optional ? [mechanics.optional] : []);
    } else if (Array.isArray(mechanics)) {
      pref = [...mechanics];
    }

    // Extract explicit mechanical capabilities from strategy, engineId, and engineFlavor signals
    const explicitSignals = [
      ...(Array.isArray(this.strategy) ? this.strategy : [this.strategy]),
      userConstraints?.selectedEngineId || '',
      userConstraints?.engineFlavor || '',
      prompt || ''
    ].map(s => String(s || '').toLowerCase());

    for (const sig of explicitSignals) {
      if (sig.includes('daybound') || sig.includes('nightbound') || sig.includes('day/night') || sig.includes('daynight') || sig.includes('transform')) {
        explicitReq.push('DAYBOUND_NIGHTBOUND', 'STATE_TRANSITION_ENGINE', 'TRANSFORM_PAYOFF');
      }
      if (sig.includes('sacrifice') || sig.includes('aristocrat') || sig.includes('dies')) {
        explicitReq.push('SACRIFICE_OUTLET', 'DEATH_PAYOFF');
      }
      if (sig.includes('landfall') || sig.includes('land_enters')) {
        explicitReq.push('LANDFALL_PAYOFF', 'LAND_ACCELERATION');
      }
      if (sig.includes('burn') || sig.includes('reach')) {
        explicitReq.push('PLAYER_REACH');
      }
      if (sig.includes('counter') && (sig.includes('+1/+1') || sig.includes('growth'))) {
        explicitReq.push('COUNTER_GENERATOR', 'GROWTH_PAYOFF');
      }
      if (sig.includes('token') && (sig.includes('swarm') || sig.includes('populate'))) {
        explicitReq.push('TOKEN_GENERATOR');
      }
    }

    // Also include mustRules / preferRules if present
    if (Array.isArray(mustRules)) req.push(...mustRules);
    if (Array.isArray(preferRules)) pref.push(...preferRules);

    const mergedExplicit = [...new Set([...explicitReq, ...req])].map(m => String(m).toUpperCase().replace(/[\s-]/g, '_'));

    this.mechanicsModalities = Object.freeze({
      explicitRequired: Object.freeze(mergedExplicit),
      required: Object.freeze(mergedExplicit),
      preferred: Object.freeze(pref.map(m => String(m).toUpperCase().replace(/[\s-]/g, '_'))),
      optional: Object.freeze(opt.map(m => String(m).toUpperCase().replace(/[\s-]/g, '_')))
    });

    const allMechs = Array.isArray(mechanics) ? mechanics : [...req, ...pref, ...opt];
    this.mechanics = Object.freeze([...new Set(allMechs.map(m => String(m).toUpperCase().replace(/[\s-]/g, '_')))]);
    this.budget = budget;
    this.powerLevel = powerLevel;
    this.userConstraints = Object.freeze({ ...userConstraints });
    this.preferredCurve = Object.freeze({ ...preferredCurve });
    this.expectedWinTurn = expectedWinTurn;
    
    // Explicit contract DSL rules
    this.mustRules = Object.freeze([...mustRules]);
    this.mustNotRules = Object.freeze([...mustNotRules]);
    this.preferRules = Object.freeze([...preferRules]);

    // Declarative Strategic Extensions (v3.0)
    this.isOpenStrategy = Boolean(isOpenStrategy);
    this.customizationLevel = customizationLevel;
    this.intentPriorities = Object.freeze({ ...intentPriorities });
    this.archetypePreferences = Object.freeze({ ...archetypePreferences });
    this.tripartiteConstraints = Object.freeze({
      hard: Object.freeze([...(tripartiteConstraints.hard || [])]),
      preferred: Object.freeze([...(tripartiteConstraints.preferred || [])]),
      open: tripartiteConstraints.open !== false
    });
    this.thesisRefutationPolicy = thesisRefutationPolicy;
    this.softPreferences = Object.freeze({
      likedCards: Object.freeze([...(softPreferences.likedCards || [])]),
      avoidedCards: Object.freeze([...(softPreferences.avoidedCards || [])])
    });
    this.strategicFreedom = Object.freeze({ ...strategicFreedom });
    this.decisionPhilosophy = decisionPhilosophy;
    this.constructionMode = constructionMode;

    this.source = source;
    this.timestamp = timestamp || new Date().toISOString();

    this.validate();
    Object.freeze(this);
  }

  /**
   * Computes a deterministic structural hash of the IntentPackage.
   * Used by CompilerConvergencePipeline to assert 0 mutations across passes.
   * @returns {string}
   */
  computeIntentHash() {
    const raw = JSON.stringify({
      format: this.format,
      colors: this.colors,
      primaryTribe: this.primaryTribe,
      strategicTempo: this.strategicTempo,
      tribalPreference: this.tribalPreference,
      allowOffTribe: this.allowOffTribe,
      strategy: this.strategy,
      mechanics: this.mechanics,
      budget: this.budget,
      powerLevel: this.powerLevel,
      userConstraints: this.userConstraints,
      mustRules: this.mustRules,
      mustNotRules: this.mustNotRules,
      preferRules: this.preferRules,
      isOpenStrategy: this.isOpenStrategy,
      archetypePreferences: this.archetypePreferences,
      tripartiteConstraints: this.tripartiteConstraints
    });

    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `hash_intent_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Returns Intent Provenance Ledger for audit transparency in CompilerReport.
   * @returns {Array<{ field: string, source: string, value: any }>}
   */
  getProvenanceLedger() {
    return Object.freeze([
      { field: 'format', source: this.source, value: this.format },
      { field: 'colors', source: this.source, value: this.colors.join(', ') || 'Colorless' },
      { field: 'archetype', source: this.source, value: this.tempo },
      { field: 'tribe', source: this.source, value: this.primaryTribe || 'None' },
      { field: 'strategy', source: this.source, value: this.strategy.join(', ') || 'None' },
      { field: 'mechanics', source: this.source, value: this.mechanics.join(', ') || 'None' },
      { field: 'budget', source: this.source, value: this.budget },
      { field: 'powerLevel', source: this.source, value: this.powerLevel },
      { field: 'customizationLevel', source: this.source, value: this.customizationLevel },
      { field: 'refutationPolicy', source: this.source, value: this.thesisRefutationPolicy }
    ]);
  }

  /**
   * Asserts structural validity of the IntentPackage.
   */
  validate() {
    if (!this.format) {
      throw new Error('[IntentPackage Validation Error] Format is required.');
    }
    if (!Array.isArray(this.colors)) {
      throw new Error('[IntentPackage Validation Error] Colors must be an array.');
    }
  }

  /**
   * Evaluates Intent Completeness percentage against UI requirements.
   * Aborts compilation if missing mandatory fields.
   * 
   * @returns {{ completenessPercentage: number, missingFields: string[], isComplete: boolean }}
   */
  evaluateCompleteness() {
    const missingFields = [];

    if (!this.format) missingFields.push('format');
    if (!this.colors || this.colors.length === 0) missingFields.push('colors');
    if (!this.tempo && !this.prompt) missingFields.push('tempo');

    const totalCheck = 3;
    const passedCount = totalCheck - missingFields.length;
    const completenessPercentage = Math.round((passedCount / totalCheck) * 100);

    return {
      completenessPercentage,
      missingFields: Object.freeze(missingFields),
      isComplete: completenessPercentage === 100
    };
  }

  /**
   * Formats a clean observable log header for PASS 1.
   * @returns {string}
   */
  formatLogHeader() {
    return [
      '========== INTENT PACKAGE (UI SOURCE OF TRUTH) ==========',
      `FORMAT:      ${this.format}`,
      `COLORS:      ${this.colors.join(', ') || 'Colorless'}`,
      `ARCHETYPE:   ${this.tempo}`,
      `TRIBE:       ${this.primaryTribe || 'None'}`,
      `STRATEGY:    ${this.strategy.join(', ') || 'General'}`,
      `MECHANICS:   ${this.mechanics.join(', ') || 'Standard'}`,
      `BUDGET:      ${this.budget}`,
      `POWER LEVEL: ${this.powerLevel}`,
      `CONSTRAINTS: ${JSON.stringify(this.userConstraints)}`,
      '========================================================='
    ].join('\n');
  }

  /**
   * Evaluates compliance of a given deck array against this IntentPackage contract.
   */
  computeCompliance(deckCards = []) {
    if (!deckCards || deckCards.length === 0) {
      return {
        colorCompliance: 100,
        tribeCompliance: 100,
        formatCompliance: 100,
        forbiddenBreaches: [],
        overallComplianceScore: 100
      };
    }

    let validColorCount = 0;
    let validTribeCount = 0;
    let totalNonLandCount = 0;
    const forbiddenBreaches = [];

    const allowedColorsSet = new Set(this.colors);

    for (const card of deckCards) {
      const qty = card.quantity || 1;
      const typeLine = (card.type_line || card.typeLine || '').toLowerCase();
      const isLand = typeLine.includes('land');

      if (!isLand) {
        totalNonLandCount += qty;

        const cardColors = card.colors || [];
        const colorValid = cardColors.length === 0 || allowedColorsSet.has('C') || cardColors.every(c => allowedColorsSet.has(c.toUpperCase()));
        if (colorValid) validColorCount += qty;
        else {
          forbiddenBreaches.push({
            cardName: card.name,
            rule: `Card color [${cardColors.join(', ')}] violates intent colors [${this.colors.join(', ')}]`
          });
        }

        if (this.primaryTribe) {
          if (typeLine.includes(this.primaryTribe.toLowerCase())) {
            validTribeCount += qty;
          }
        }
      }

      const cardNameLower = (card.name || '').toLowerCase();
      for (const rule of this.mustNotRules) {
        const ruleLower = rule.toLowerCase();
        if (cardNameLower.includes(ruleLower) || typeLine.includes(ruleLower)) {
          forbiddenBreaches.push({
            cardName: card.name,
            rule: `Forbidden by rule: "${rule}"`
          });
        }
      }
    }

    const colorCompliance = totalNonLandCount > 0 ? (validColorCount / totalNonLandCount) * 100 : 100;
    const tribeCompliance = (this.primaryTribe && totalNonLandCount > 0)
      ? Math.min(100, (validTribeCount / (totalNonLandCount * 0.4)) * 100)
      : 100;

    const penalty = forbiddenBreaches.length * 15;
    const overallComplianceScore = Math.max(0, Math.round(((colorCompliance * 0.6) + (tribeCompliance * 0.4)) - penalty));

    return {
      colorCompliance: Math.round(colorCompliance),
      tribeCompliance: Math.round(tribeCompliance),
      formatCompliance: 100,
      forbiddenBreaches: Object.freeze(forbiddenBreaches),
      overallComplianceScore
    };
  }

  toJSON() {
    return {
      prompt: this.prompt,
      format: this.format,
      colors: this.colors,
      primaryTribe: this.primaryTribe,
      tempo: this.tempo,
      strategy: this.strategy,
      mechanics: this.mechanics,
      budget: this.budget,
      powerLevel: this.powerLevel,
      userConstraints: this.userConstraints,
      preferredCurve: this.preferredCurve,
      expectedWinTurn: this.expectedWinTurn,
      mustRules: this.mustRules,
      mustNotRules: this.mustNotRules,
      preferRules: this.preferRules,
      source: this.source,
      timestamp: this.timestamp
    };
  }
}
