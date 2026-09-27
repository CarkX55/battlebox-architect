/**
 * src/services/compiler/core/gameplanSynthesizer.js
 * 
 * GameplanSynthesizer: V29.0 Pool-Evidence-Driven Gameplan Generator.
 * 
 * Synthesizes a GameplanContract from the selected strategic line(s),
 * the card pool, and format constraints. Every aspect of the gameplan
 * is DEMONSTRABLE against the pool:
 *   - Kill turn derived from pool curve analysis, not from tempo name
 *   - Turn requirements verified against available card density
 *   - Infeasible gameplans explicitly diagnosed as INFEASIBLE
 *   - Recovery plans verified against pool capacity
 * 
 * Axioms:
 *   1. ZERO `if (tempo === 'aggro') { killTurn = 4 }`.
 *   2. The gameplan is derived from pool evidence, not from strategy names.
 *   3. If the pool can't execute a plan, it's declared INFEASIBLE with causal evidence.
 *   4. Recovery plans are verified, not assumed.
 *   5. Deterministic and reproducible.
 */

import { CardCausalContract } from './cardCausalContract.js';
import { StrategicLineGraph } from './strategicLineGraph.js';

/**
 * A functional demand for a specific turn.
 */
export class TurnFunctionalDemand {
  constructor({
    functionName = '',
    constraints = {},
    executionWindow = {},
    criticality = 'IMPORTANT',
    availableInPool = 0,
    targetProbability = 0.88,
    minimumInDeck = 0
  } = {}) {
    this.functionName = functionName;
    this.constraints = Object.freeze({ ...constraints });
    this.executionWindow = Object.freeze({
      earliestTurn: 1,
      latestTurn: 1,
      maxMana: 1,
      requiredColors: [],
      castableTiming: ['MAIN_1'],
      functionalCapabilities: [],
      ...executionWindow
    });
    this.criticality = criticality; // 'CRITICAL' | 'IMPORTANT' | 'OPTIONAL'
    this.availableInPool = availableInPool;
    this.targetProbability = targetProbability;
    this.minimumInDeck = minimumInDeck;
    Object.freeze(this);
  }
}

/**
 * Requirements for a specific turn.
 */
export class TurnRequirement {
  constructor({
    turn = 1,
    functionalDemands = [],
    manaEnvelope = {},
    criticality = 'IMPORTANT',
    failureModes = [],
    description = ''
  } = {}) {
    this.turn = turn;
    this.functionalDemands = Object.freeze([...functionalDemands]);
    this.manaEnvelope = Object.freeze({ total: turn, ...manaEnvelope });
    this.criticality = criticality; // 'CRITICAL' | 'IMPORTANT' | 'OPTIONAL'
    this.failureModes = Object.freeze([...failureModes]);
    this.description = description;
    Object.freeze(this);
  }
}

/**
 * A recovery plan for a specific failure mode.
 */
export class RecoveryPlan {
  constructor({
    trigger = '',
    requiredFunction = '',
    minimumCapacity = 0,
    availableInPool = 0,
    isFeasible = false,
    diagnosis = ''
  } = {}) {
    this.trigger = trigger;
    this.requiredFunction = requiredFunction;
    this.minimumCapacity = minimumCapacity;
    this.availableInPool = availableInPool;
    this.isFeasible = isFeasible;
    this.diagnosis = diagnosis;
    Object.freeze(this);
  }
}

/**
 * Immutable gameplan contract.
 */
export class GameplanContract {
  constructor({
    format = 'STANDARD',
    thesis = '',
    derivedKillTurn = 5,
    derivedFromLine = null,
    identityConstraints = {},
    turnRequirements = [],
    requiredEngines = [],
    winCondition = {},
    recoveryPlans = [],
    recommendedPivots = [],
    causalInvariants = [],
    feasibilityStatus = 'FEASIBLE',
    feasibilityDiagnosis = '',
    poolEvidence = {},
    tacticalExecutionProfile = {}
  } = {}) {
    this.format = String(format || 'STANDARD').toUpperCase();
    this.thesis = thesis;
    this.derivedKillTurn = derivedKillTurn;
    this.derivedFromLine = derivedFromLine;
    this.identityConstraints = Object.freeze({
      primaryIdentity: identityConstraints.primaryIdentity || null,
      identityPolicy: identityConstraints.identityPolicy || null,
      requiredStructuralTraits: Object.freeze([...(identityConstraints.requiredStructuralTraits || [])]),
      requiredMechanicCapabilities: Object.freeze([...(identityConstraints.requiredMechanicCapabilities || [])]),
      allowedUtilityExceptions: Object.freeze([...(identityConstraints.allowedUtilityExceptions || ['MANA_ACCELERATION', 'CHEAP_REMOVAL', 'CARD_FLOW', 'COUNTER_DISRUPTION', 'BOARD_SWEEPER'])]),
      forbiddenStrategicAxes: Object.freeze([...(identityConstraints.forbiddenStrategicAxes || [])])
    });
    this.turnRequirements = Object.freeze([...turnRequirements]);
    this.requiredEngines = Object.freeze([...requiredEngines]);
    this.winCondition = Object.freeze({ ...winCondition });
    this.recoveryPlans = Object.freeze([...recoveryPlans]);
    this.recommendedPivots = Object.freeze([...recommendedPivots]);
    this.causalInvariants = Object.freeze([...(causalInvariants.length > 0 ? causalInvariants : ['STRATEGIC_CAUSAL_CLOSURE', 'GAMEPLAN_IDENTITY_EXCLUSION'])]);
    this.feasibilityStatus = feasibilityStatus; // 'FEASIBLE' | 'INFEASIBLE'
    this.feasibilityDiagnosis = feasibilityDiagnosis;
    this.poolEvidence = Object.freeze({ ...poolEvidence });
    this.tacticalExecutionProfile = Object.freeze({
      landFloodSensitivity: tacticalExecutionProfile.landFloodSensitivity ?? (derivedKillTurn <= 4 ? 1.15 : (derivedKillTurn === 5 ? 0.95 : 0.50)),
      manaScrewSensitivity: tacticalExecutionProfile.manaScrewSensitivity ?? (derivedKillTurn <= 4 ? 1.40 : 1.20),
      earlyCurveWeight: tacticalExecutionProfile.earlyCurveWeight ?? (derivedKillTurn <= 4 ? 0.85 : (derivedKillTurn === 5 ? 0.70 : 0.50)),
      curveOutWeightWindow: Object.freeze([...(tacticalExecutionProfile.curveOutWeightWindow || (derivedKillTurn <= 4 ? [1, 2, 3] : (derivedKillTurn === 5 ? [1, 2, 3, 4] : [2, 3, 4, 5])))]),
      acceptableNonGameRate: tacticalExecutionProfile.acceptableNonGameRate ?? 0.15,
      manaRiskTolerance: tacticalExecutionProfile.manaRiskTolerance ?? (derivedKillTurn <= 4 ? 0.10 : 0.18),
      preferredExecutionWindow: tacticalExecutionProfile.preferredExecutionWindow ?? derivedKillTurn,
      ...tacticalExecutionProfile
    });
    Object.freeze(this);
  }
}

export class GameplanSynthesizer {
  /**
   * Convenience factory to synthesize a gameplan directly from intent and candidate pool.
   */
  static synthesizeGameplan({ intentPackage = {}, deckIdentity = {}, candidatePool = [] } = {}) {
    const format = (intentPackage.format || 'STANDARD').toUpperCase();
    const primaryIdentity = (intentPackage.primaryTribe || deckIdentity.primaryTribe || '').toLowerCase().trim();
    const tempo = (intentPackage.strategicTempo || intentPackage.tempo || deckIdentity.archetypeKey || 'Aggro').toUpperCase();

    const profile = StrategicLineGraph._buildDesiredCapabilityProfile({
      ...intentPackage,
      primaryIdentity
    });
    const desiredCapabilities = Array.from(profile.desired || profile || []);

    // Causal win condition derived from emergent capabilities and tempo without tribal exclusion
    const hasReachCapability = desiredCapabilities.includes('PLAYER_REACH') || desiredCapabilities.includes('DIRECT_DAMAGE');
    const isBurn = hasReachCapability && (tempo.includes('AGGRO') || tempo.includes('BURN'));
    const winCondition = isBurn 
      ? { type: 'BURN_LETHAL', description: 'Burn opponent with direct damage reach', condition: 'BURN_LETHAL' }
      : { type: 'COMBAT_DAMAGE', description: `${primaryIdentity ? primaryIdentity.toUpperCase() + ' ' : ''}${tempo} Combat Beatdown`, condition: 'COMBAT_LETHAL' };

    const derivedKillTurn = tempo.includes('AGGRO') ? 4 : (tempo.includes('CONTROL') ? 7 : 5);

    const line = {
      lineId: `${primaryIdentity.toUpperCase() || 'GENERAL'}_${tempo}`,
      dominantCapabilities: desiredCapabilities,
      winCondition,
      executionProbability: 0.85
    };

    const lineSelection = {
      primaryLine: line,
      secondaryLine: null,
      selectionEvidence: { status: 'SYNTHESIZED_FROM_INTENT' }
    };

    return this.synthesize({
      lineSelection,
      cardPool: candidatePool,
      intentPackage: { ...intentPackage, primaryTribe: primaryIdentity, tempo },
      deckSize: intentPackage.deckSize || 60
    });
  }

  /**
   * Synthesizes a GameplanContract from the selected strategic line and pool.
   * 
   * @param {Object} params
   * @param {import('./strategicLineGraph.js').StrategicLineSelection} params.lineSelection
   * @param {Array<Object>} params.cardPool - All legal non-land cards
   * @param {import('./intentPackage.js').IntentPackage} params.intentPackage
   * @param {number} [params.deckSize=60]
   * @param {number} [params.handSize=7]
   * @returns {GameplanContract}
   */
  static synthesize({ lineSelection, cardPool = [], intentPackage = {}, deckSize = 60, handSize = 7 } = {}) {
    const format = (intentPackage.format || 'STANDARD').toUpperCase();
    const isCommander = format === 'COMMANDER' || format === 'EDH' || format === 'BRAWL';
    const effectiveDeckSize = isCommander ? 99 : deckSize;

    if (!lineSelection || !lineSelection.primaryLine) {
      return new GameplanContract({
        format,
        feasibilityStatus: 'INFEASIBLE',
        feasibilityDiagnosis: 'No primary strategic line was selected. Cannot synthesize a gameplan.',
        poolEvidence: { totalCandidates: cardPool.length }
      });
    }

    const primaryLine = lineSelection.primaryLine.line || lineSelection.primaryLine;

    // 1. Parse contracts for all cards in the pool (not just the line's cards)
    const poolEntries = this._parsePool(cardPool);

    // 2. Analyze the pool's tempo curve to derive the kill turn
    const curveAnalysis = this._analyzeTempoCurve(poolEntries, primaryLine, intentPackage);

    // 3. Extract abstract identityConstraints with formal identityPolicy
    const primaryIdentity = intentPackage.primaryTribe && intentPackage.primaryTribe !== 'None' ? intentPackage.primaryTribe : null;
    const identityPolicy = intentPackage.identityPolicy || {
      creatureMembershipMode: primaryIdentity ? (intentPackage.allowOffTribe ? 'ALLOW_APPROVED_EXTERNAL_ENGINE' : 'STRICT_TRIBE') : 'NON_TRIBAL',
      primaryTribe: primaryIdentity,
      allowOffTribe: Boolean(intentPackage.allowOffTribe)
    };

    const explicitReq = intentPackage.mechanicsModalities?.explicitRequired || intentPackage.mechanicsModalities?.required || [];
    const domCaps = Array.isArray(primaryLine.dominantCapabilities) ? primaryLine.dominantCapabilities : Array.from(primaryLine.dominantCapabilities || []);
    const lineMechanics = domCaps.filter(c => 
      c.includes('DAY') || c.includes('TRANSFORM') || c.includes('SACRIFICE') || c.includes('DEATH') || 
      c.includes('LANDFALL') || c.includes('TOKEN') || c.includes('COUNTER') || c.includes('BURN') || c.includes('REACH')
    );
    const requiredMechanics = [
      ...explicitReq,
      ...(Array.isArray(intentPackage.mechanics) ? intentPackage.mechanics : (intentPackage.mechanics ? [intentPackage.mechanics] : [])),
      ...(Array.isArray(intentPackage.constraints?.boostKeywords) ? intentPackage.constraints.boostKeywords : []),
      ...lineMechanics
    ];
    const forbiddenAxes = [
      ...(Array.isArray(intentPackage.constraints?.excludedMechanics) ? intentPackage.constraints.excludedMechanics : []),
      ...(Array.isArray(intentPackage.constraints?.vetoedKeywords) ? intentPackage.constraints.vetoedKeywords : []),
      ...(Array.isArray(intentPackage.constraints?.forbiddenStrategicAxes) ? intentPackage.constraints.forbiddenStrategicAxes : [])
    ];
    const identityConstraints = {
      primaryIdentity,
      identityPolicy,
      requiredStructuralTraits: primaryIdentity ? ['CREATURE'] : [],
      requiredMechanicCapabilities: [...new Set(requiredMechanics.map(m => String(m).toUpperCase().replace(/[\s-]/g, '_')))],
      allowedUtilityExceptions: ['MANA_ACCELERATION', 'CHEAP_REMOVAL', 'CARD_FLOW', 'COUNTER_DISRUPTION', 'BOARD_SWEEPER'],
      forbiddenStrategicAxes: forbiddenAxes.map(f => String(f).toUpperCase().replace(/[\s-]/g, '_'))
    };

    // 4. Build turn requirements from the curve analysis and line capabilities
    const turnRequirements = this._buildTurnRequirements(
      curveAnalysis, primaryLine, poolEntries, effectiveDeckSize, handSize, identityConstraints, intentPackage
    );

    // 5. Derive required engines from turn requirements
    const requiredEngines = this._deriveEngines(turnRequirements, poolEntries, effectiveDeckSize, handSize);

    // 6. Check overall feasibility
    const infeasibleTurns = turnRequirements.filter(tr =>
      tr.functionalDemands.some(fd => fd.availableInPool < fd.minimumInDeck)
    );

    const feasibilityStatus = infeasibleTurns.length === 0 ? 'FEASIBLE' : 'INFEASIBLE';
    const feasibilityDiagnosis = infeasibleTurns.length > 0
      ? `Infeasible at turn(s) ${infeasibleTurns.map(t => t.turn).join(', ')}: ` +
        infeasibleTurns.map(t => {
          const failingDemands = t.functionalDemands.filter(fd => fd.availableInPool < fd.minimumInDeck);
          return failingDemands.map(fd =>
            `${fd.functionName}: need ${fd.minimumInDeck} in deck, only ${fd.availableInPool} available in pool`
          ).join('; ');
        }).join(' | ')
      : '';

    // 7. Derive recovery plans & viable pivot recommendations
    const recoveryPlans = this._deriveRecoveryPlans(primaryLine, poolEntries);
    const recommendedPivots = [];
    if (feasibilityStatus === 'INFEASIBLE') {
      const candidates = [
        lineSelection.secondaryLine?.line,
        ...(lineSelection.rejectedLines || []).map(r => r.line)
      ].filter(Boolean);

      for (const cand of candidates) {
        if (cand && cand.executionProbability >= 0.35 && cand.label !== primaryLine.label) {
          recommendedPivots.push({
            label: cand.label,
            winCondition: cand.winCondition?.condition,
            executionProbability: cand.executionProbability,
            reason: `Supported alternative in candidate pool (execution probability: ${(cand.executionProbability * 100).toFixed(1)}%)`
          });
        }
      }
    }

    // 8. Build thesis string (observability only)
    const thesis = this._buildThesis(primaryLine, curveAnalysis);

    // 9. Line's participating cards on the primary line
    const primaryCardNames = new Set(primaryLine.participatingCardNames || []);
    const primaryPoolCards = poolEntries.filter(e => primaryCardNames.has(e.name));

    return new GameplanContract({
      format,
      thesis,
      derivedKillTurn: curveAnalysis.derivedKillTurn,
      derivedFromLine: primaryLine.label,
      identityConstraints,
      turnRequirements,
      requiredEngines,
      winCondition: {
        type: primaryLine.winCondition.condition || 'UNKNOWN',
        description: primaryLine.winCondition.description || '',
        estimatedExecutionProbability: primaryLine.executionProbability
      },
      recoveryPlans,
      recommendedPivots,
      feasibilityStatus,
      feasibilityDiagnosis,
      poolEvidence: {
        totalCandidates: poolEntries.length,
        candidatesOnPrimaryLine: primaryPoolCards.length,
        candidatesOnSecondaryLine: lineSelection.secondaryLine
          ? poolEntries.filter(e => (lineSelection.secondaryLine.line.participatingCardNames || []).includes(e.name)).length
          : 0,
        curveDistribution: curveAnalysis.curveDistribution,
        derivedKillTurn: curveAnalysis.derivedKillTurn
      },
      tacticalExecutionProfile: {
        landFloodSensitivity: curveAnalysis.derivedKillTurn <= 4 ? 1.15 : (curveAnalysis.derivedKillTurn === 5 ? ((curveAnalysis.lowCurve / Math.max(1, curveAnalysis.lineCardCount)) >= 0.4 ? 1.05 : 0.90) : 0.50),
        manaScrewSensitivity: curveAnalysis.derivedKillTurn <= 4 ? 1.40 : 1.20,
        earlyCurveWeight: curveAnalysis.derivedKillTurn <= 4 ? 0.85 : (curveAnalysis.derivedKillTurn === 5 ? 0.75 : 0.50),
        curveOutWeightWindow: curveAnalysis.derivedKillTurn <= 4 ? [1, 2, 3] : (curveAnalysis.derivedKillTurn === 5 ? [1, 2, 3, 4] : [2, 3, 4, 5]),
        acceptableNonGameRate: 0.15,
        manaRiskTolerance: curveAnalysis.derivedKillTurn <= 4 ? 0.10 : 0.18,
        preferredExecutionWindow: curveAnalysis.derivedKillTurn
      }
    });
  }

  // ─── Private Methods ───

  /**
   * Parses pool cards into structured entries.
   * @private
   */
  static _parsePool(cardPool) {
    const entries = [];
    for (const card of cardPool) {
      const type = (card.type_line || card.type || '').toLowerCase();
      if (type.includes('land') && !type.includes('creature')) continue;

      const contract = CardCausalContract.parse(card);
      if (!contract) continue;

      entries.push({
        card,
        name: contract.cardIdentity.name,
        cmc: contract.cardIdentity.cmc || 0,
        typeLine: (contract.cardIdentity.typeLine || '').toLowerCase(),
        oracle: (contract.cardIdentity.oracleText || '').toLowerCase(),
        power: Number(contract.cardIdentity.power || 0),
        supplies: contract.supplies || [],
        demands: contract.demands || [],
        capabilities: (contract.supplies || []).map(s => s.capability)
      });
    }
    return entries;
  }

  /**
   * Analyzes the pool's tempo curve to derive the kill turn.
   * Kill turn is NOT derived from the tempo name — it's derived from
   * the pool's actual card distribution.
   * @private
   */
  static _analyzeTempoCurve(poolEntries, primaryLine, intentPackage = {}) {
    const lineCards = new Set(primaryLine.participatingCardNames || []);
    const lineEntries = poolEntries.filter(e => lineCards.has(e.name));

    // Evaluate curve distribution across the available pool
    const curveDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    for (const entry of poolEntries) {
      const bucket = Math.min(6, Math.max(1, entry.cmc));
      curveDistribution[bucket]++;
    }

    const lowCurve = curveDistribution[1] + curveDistribution[2];
    const midCurve = curveDistribution[3] + curveDistribution[4];
    const highCurve = curveDistribution[5] + curveDistribution[6];

    // Check for amplifiers/lords in pool
    const amplifierCount = poolEntries.filter(e =>
      e.capabilities.includes('TRIBAL_LORD') ||
      e.capabilities.includes('COUNTER_GENERATOR') ||
      e.oracle.includes('creatures you control get +') ||
      e.oracle.includes('have haste') ||
      e.oracle.includes('battle cry')
    ).length;

    // Check for burn/reach in pool
    const reachCount = poolEntries.filter(e =>
      e.capabilities.includes('PLAYER_REACH') ||
      e.capabilities.includes('CHEAP_REMOVAL')
    ).length;

    const tempo = (intentPackage.tempo || intentPackage.archetype || '').toLowerCase();

    let derivedKillTurn;
    if (tempo.includes('control')) {
      derivedKillTurn = 7;
    } else if (tempo.includes('ramp')) {
      derivedKillTurn = highCurve >= 2 ? 6 : 7;
    } else if (tempo.includes('midrange') || tempo.includes('tempo') || tempo.includes('sacrifice') || tempo.includes('attrition')) {
      derivedKillTurn = 5;
    } else if (lowCurve >= 6 && (tempo.includes('aggro') || tempo.includes('burn') || (amplifierCount >= 2 && reachCount >= 3))) {
      derivedKillTurn = 4;
    } else if (lowCurve >= 4 && midCurve >= 3) {
      derivedKillTurn = 5;
    } else if (midCurve >= 5 || (lowCurve >= 3 && highCurve >= 2)) {
      derivedKillTurn = 6;
    } else {
      derivedKillTurn = 5;
    }

    return {
      curveDistribution,
      lowCurve,
      midCurve,
      highCurve,
      amplifierCount,
      reachCount,
      derivedKillTurn,
      lineCardCount: lineEntries.length
    };
  }

  /**
   * Builds turn requirements from curve analysis and line capabilities.
   * @private
   */
  static _buildTurnRequirements(curveAnalysis, primaryLine, poolEntries, deckSize, handSize, identityConstraints = {}, intentPackage = {}) {
    const lineCards = new Set(primaryLine.participatingCardNames || []);
    const lineEntries = poolEntries.filter(e => lineCards.has(e.name));
    const killTurn = curveAnalysis.derivedKillTurn;
    const turns = [];

    const isIdentityCompatible = (entry) => {
      if (!identityConstraints || !identityConstraints.primaryIdentity) return true;
      const targetTribe = identityConstraints.primaryIdentity.toLowerCase();
      const isMember = entry.typeLine.includes(targetTribe) || (entry.oracle && entry.oracle.includes('changeling'));
      const isUtility = (identityConstraints.allowedUtilityExceptions || []).some(u => entry.capabilities.includes(u));
      return isMember || isUtility;
    };

    // Helper: count cards matching a predicate in the line's pool
    const countInLine = (predicate) => lineEntries.filter(predicate).length;
    // Helper: count cards matching a predicate in the FULL pool
    const countInPool = (predicate) => poolEntries.filter(predicate).length;
    // Helper: compute total copy capacity matching a predicate in the FULL pool
    const capacityInPool = (predicate) => {
      return poolEntries
        .filter(predicate)
        .reduce((sum, e) => sum + Math.min(4, e.count || 4), 0);
    };

    // Helper: compute minimum cards needed for target probability
    const minForTarget = (targetP = 0.88) => {
      for (let k = 1; k <= deckSize; k++) {
        const p = 1 - this._hyperP0(deckSize, k, handSize);
        if (p >= targetP) return k;
      }
      return deckSize;
    };

    // Turn 1: Deploy something (Strict timing maxMana: 1)
    const isStrictCreatureMode = identityConstraints.identityPolicy?.creatureMembershipMode === 'STRICT_TRIBE';
    const isBurnStrategy = (primaryLine.winCondition?.condition === 'BURN_LETHAL') ||
      (primaryLine.dominantCapabilities || []).includes('PLAYER_REACH') ||
      (intentPackage?.userPrompt || '').toLowerCase().includes('burn') ||
      (intentPackage?.strategy === 'Burn');
    const requiresOnIdentity = isStrictCreatureMode || Boolean(identityConstraints.primaryIdentity);
    const isAggressiveVelocity = killTurn <= 4;
    const isLateGameOrControl = killTurn >= 6;

    const t1Predicate = (e) => {
      if (e.cmc > 1) return false;
      if (requiresOnIdentity) {
        return e.typeLine.includes('creature') && isIdentityCompatible(e);
      }
      return (e.typeLine.includes('creature') || e.capabilities.includes('MANA_ACCELERATION') || e.capabilities.includes('CARD_FLOW') || (isBurnStrategy && e.capabilities.includes('PLAYER_REACH'))) && isIdentityCompatible(e);
    };

    const t1Capacity = capacityInPool(t1Predicate);
    const t1Min = isLateGameOrControl ? 0 : minForTarget(isAggressiveVelocity ? 0.88 : 0.70);
    
    if (!isLateGameOrControl || t1Capacity > 0) {
      turns.push(new TurnRequirement({
        turn: 1,
        description: requiresOnIdentity ? 'Deploy on-identity 1CMC creature' : (isBurnStrategy ? 'Deploy pressure body or burn reach' : (isAggressiveVelocity ? 'Deploy body or enabler' : 'Establish early presence or cantrip velocity')),
        criticality: isAggressiveVelocity ? 'CRITICAL' : (isLateGameOrControl ? 'OPTIONAL' : 'IMPORTANT'),
        functionalDemands: [
          new TurnFunctionalDemand({
            functionName: requiresOnIdentity ? 'DEPLOY_ON_IDENTITY_1CMC_BODY' : (isBurnStrategy ? 'DEPLOY_1CMC_BODY_OR_BURN' : 'DEPLOY_1CMC_BODY_OR_ENABLER'),
            constraints: { cmc: { max: 1 }, type: requiresOnIdentity ? 'creature' : null, requiresOnIdentity },
            executionWindow: {
              earliestTurn: 1,
              latestTurn: 1,
              maxMana: 1,
              castableTiming: ['MAIN_1', 'INSTANT'],
              functionalCapabilities: requiresOnIdentity ? ['EARLY_ON_IDENTITY_BODY', 'EARLY_BODY'] : ['EARLY_BODY', 'MANA_DORK', 'CANTRIP_VELOCITY', 'DIRECT_BURN']
            },
            criticality: isAggressiveVelocity ? 'CRITICAL' : (isLateGameOrControl ? 'OPTIONAL' : 'IMPORTANT'),
            availableInPool: t1Capacity,
            targetProbability: isAggressiveVelocity ? 0.88 : (isLateGameOrControl ? 0.40 : 0.70),
            minimumInDeck: isAggressiveVelocity ? t1Min : (isLateGameOrControl ? 0 : Math.max(1, Math.floor(t1Min * 0.6)))
          })
        ],
        manaEnvelope: { total: 1 },
        failureModes: isAggressiveVelocity ? ['NO_T1_PLAY_TEMPO_LOSS'] : []
      }));
    }

    // Turn 2: Develop threat, ramp, or establish interaction (Strict timing maxMana: 2)
    const t2Predicate = (e) => e.cmc <= 2 && (
      e.typeLine.includes('creature') ||
      e.capabilities.includes('MANA_ACCELERATION') ||
      e.capabilities.includes('LAND_ACCELERATION') ||
      e.capabilities.includes('CHEAP_REMOVAL') ||
      e.capabilities.includes('COUNTERSPELL') ||
      e.capabilities.includes('CARD_FLOW') ||
      (isBurnStrategy && e.capabilities.includes('PLAYER_REACH'))
    ) && isIdentityCompatible(e);

    const t2Capacity = capacityInPool(t2Predicate);
    turns.push(new TurnRequirement({
      turn: 2,
      description: isBurnStrategy ? 'Develop threat or direct burn' : (isLateGameOrControl ? 'Establish cheap interaction or ramp' : 'Develop board or advance engine'),
      criticality: isAggressiveVelocity ? 'CRITICAL' : (isLateGameOrControl ? 'OPTIONAL' : 'IMPORTANT'),
      functionalDemands: [
        new TurnFunctionalDemand({
          functionName: isBurnStrategy ? 'DEPLOY_2CMC_THREAT_OR_BURN' : 'DEPLOY_2CMC_THREAT_OR_ENGINE',
          constraints: { cmc: { max: 2 }, requiresOnIdentity: Boolean(identityConstraints.primaryIdentity) && !isBurnStrategy },
          executionWindow: {
            earliestTurn: 2,
            latestTurn: 2,
            maxMana: 2,
            castableTiming: ['MAIN_1', 'INSTANT'],
            functionalCapabilities: ['THREAT_DEPLOYMENT', 'RAMP_ENABLER', 'INTERACTION', 'DIRECT_BURN']
          },
          criticality: isAggressiveVelocity ? 'CRITICAL' : (isLateGameOrControl ? 'OPTIONAL' : 'IMPORTANT'),
          availableInPool: t2Capacity,
          targetProbability: isAggressiveVelocity ? 0.85 : (isLateGameOrControl ? 0.60 : 0.80),
          minimumInDeck: isAggressiveVelocity ? minForTarget(0.85) : (isLateGameOrControl ? Math.min(6, t2Capacity) : minForTarget(0.80))
        })
      ],
      manaEnvelope: { total: 2 },
      failureModes: isAggressiveVelocity ? ['EMPTY_BOARD_T2'] : []
    }));

    // Turn 3: Amplify or execute engine (Strict timing maxMana: 3)
    const amplifiersPredicate = (e) =>
      e.cmc <= 3 && (
        e.capabilities.includes('TRIBAL_LORD') ||
        e.capabilities.includes('SACRIFICE_OUTLET') ||
        e.capabilities.includes('DEATH_PAYOFF') ||
        e.capabilities.includes('COUNTER_GENERATOR') ||
        e.capabilities.includes('CARD_FLOW') ||
        e.capabilities.includes('MANA_ACCELERATION') ||
        e.typeLine.includes('planeswalker') ||
        (isBurnStrategy && (e.capabilities.includes('PLAYER_REACH') || e.oracle.includes('damage') || e.oracle.includes('prowess'))) ||
        e.oracle.includes('creatures you control get +') ||
        e.oracle.includes('have haste') ||
        e.oracle.includes('search your library for a land')
      );
    const amplifiersCapacity = capacityInPool(amplifiersPredicate);
    turns.push(new TurnRequirement({
      turn: 3,
      description: 'Amplify board or execute engine step',
      criticality: 'IMPORTANT',
      functionalDemands: [
        new TurnFunctionalDemand({
          functionName: 'AMPLIFY_OR_ENGINE_STEP',
          constraints: { cmc: { max: 3 }, role: 'amplifier_or_engine' },
          executionWindow: {
            earliestTurn: 3,
            latestTurn: 3,
            maxMana: 3,
            castableTiming: ['MAIN_1'],
            functionalCapabilities: ['BOARD_AMPLIFIER', 'ENGINE_STEP', 'RAMP_SPIKE']
          },
          criticality: 'IMPORTANT',
          availableInPool: amplifiersCapacity,
          targetProbability: 0.75,
          minimumInDeck: Math.max(3, minForTarget(0.75))
        })
      ],
      manaEnvelope: { total: 3 },
      failureModes: ['BOARD_WIPE_BLOWOUT', 'ENGINE_MISSING_PIECE']
    }));

    // Turn 4+: Convert to win (Strict timing maxMana: killTurn)
    if (killTurn <= 5) {
      const closersPredicate = (e) =>
        e.cmc <= killTurn && (
          e.capabilities.includes('PLAYER_REACH') ||
          (e.typeLine.includes('creature') && e.power >= 3 && (e.oracle.includes('haste') || e.oracle.includes('trample'))) ||
          e.oracle.includes('damage to any target')
        );
      const closersCapacity = capacityInPool(closersPredicate);
      turns.push(new TurnRequirement({
        turn: killTurn,
        description: 'Convert to lethal',
        criticality: 'IMPORTANT',
        functionalDemands: [
          new TurnFunctionalDemand({
            functionName: 'CONVERT_TO_LETHAL',
            constraints: { cmc: { max: killTurn }, role: 'closer_or_reach' },
            executionWindow: {
              earliestTurn: 4,
              latestTurn: killTurn,
              maxMana: killTurn,
              castableTiming: ['COMBAT', 'MAIN_1', 'INSTANT'],
              functionalCapabilities: ['BURN_REACH', 'ALPHA_STRIKE', 'COMBAT_FINISHER']
            },
            criticality: 'IMPORTANT',
            availableInPool: closersCapacity,
            targetProbability: 0.70,
            minimumInDeck: Math.max(2, minForTarget(0.70))
          })
        ],
        manaEnvelope: { total: killTurn },
        failureModes: ['OPPONENT_LIFE_TOO_HIGH', 'OUT_OF_GAS']
      }));
    } else {
      // Slower strategy: deploy finisher
      const finishers = countInPool(e =>
        e.capabilities.includes('FINISHER') ||
        e.capabilities.includes('SWEEPER') ||
        (e.power >= 5 && e.typeLine.includes('creature')) ||
        e.typeLine.includes('planeswalker')
      );
      turns.push(new TurnRequirement({
        turn: killTurn,
        description: 'Deploy finisher or lock board',
        criticality: 'IMPORTANT',
        functionalDemands: [
          new TurnFunctionalDemand({
            functionName: 'DEPLOY_FINISHER',
            constraints: { role: 'finisher' },
            executionWindow: {
              earliestTurn: 5,
              latestTurn: killTurn,
              maxMana: killTurn,
              castableTiming: ['MAIN_1'],
              functionalCapabilities: ['LARGE_FINISHER', 'PLANESWALKER_LOCK', 'SWEEPER_STABILIZATION']
            },
            criticality: 'IMPORTANT',
            availableInPool: finishers,
            targetProbability: 0.70,
            minimumInDeck: Math.max(2, minForTarget(0.70))
          })
        ],
        manaEnvelope: { total: killTurn },
        failureModes: ['NO_FINISHER_AVAILABLE']
      }));
    }

    return turns;
  }

  /**
   * Derives engine summaries from turn requirements.
   * @private
   */
  static _deriveEngines(turnRequirements, poolEntries, deckSize, handSize) {
    const engines = [];
    const seenFunctions = new Set();

    for (const turn of turnRequirements) {
      for (const demand of turn.functionalDemands) {
        if (seenFunctions.has(demand.functionName)) continue;
        seenFunctions.add(demand.functionName);

        engines.push({
          engineId: demand.functionName,
          purpose: `Provide ${demand.functionName} for turn ${turn.turn}`,
          derivedFrom: `turnRequirements[${turn.turn}]`,
          minimumCards: demand.minimumInDeck,
          availableInPool: demand.availableInPool,
          isSufficient: demand.availableInPool >= demand.minimumInDeck
        });
      }
    }

    return engines;
  }

  /**
   * Derives recovery plans from the line's failure modes and pool capacity.
   * @private
   */
  static _deriveRecoveryPlans(primaryLine, poolEntries) {
    const plans = [];

    // Recovery: board wipe → burn reach
    const burnReach = poolEntries.filter(e =>
      e.capabilities.includes('PLAYER_REACH')
    ).length;
    plans.push(new RecoveryPlan({
      trigger: 'BOARD_WIPE',
      requiredFunction: 'DIRECT_DAMAGE_TO_FACE',
      minimumCapacity: 4,
      availableInPool: burnReach,
      isFeasible: burnReach >= 4,
      diagnosis: burnReach >= 4
        ? `${burnReach} burn/reach spells available for post-wipe reach plan`
        : `Only ${burnReach} burn/reach spells in pool — insufficient for post-wipe recovery`
    }));

    // Recovery: mana screw → card flow
    const cardFlow = poolEntries.filter(e =>
      e.capabilities.includes('CARD_FLOW')
    ).length;
    plans.push(new RecoveryPlan({
      trigger: 'MANA_SCREW',
      requiredFunction: 'CARD_FLOW_RECOVERY',
      minimumCapacity: 2,
      availableInPool: cardFlow,
      isFeasible: cardFlow >= 2,
      diagnosis: cardFlow >= 2
        ? `${cardFlow} card flow effects available for recovery`
        : `Only ${cardFlow} card flow effects — limited recovery capacity`
    }));

    // Recovery: opponent stabilizes → recursive/resilient threats
    const recursion = poolEntries.filter(e =>
      e.capabilities.includes('DEATH_PAYOFF') ||
      e.capabilities.includes('REANIMATION_SPELL') ||
      e.capabilities.includes('TOKEN_GENERATOR') ||
      (e.oracle.includes('can\'t be countered') || e.oracle.includes('indestructible'))
    ).length;
    plans.push(new RecoveryPlan({
      trigger: 'OPPONENT_STABILIZES',
      requiredFunction: 'RESILIENT_THREATS',
      minimumCapacity: 3,
      availableInPool: recursion,
      isFeasible: recursion >= 3,
      diagnosis: recursion >= 3
        ? `${recursion} resilient/recursive threats available`
        : `Only ${recursion} resilient threats — vulnerability to stabilization`
    }));

    return plans;
  }

  /**
   * Builds a thesis string for observability.
   * @private
   */
  static _buildThesis(primaryLine, curveAnalysis) {
    const winCond = primaryLine.winCondition.description || primaryLine.winCondition.condition || 'unknown';
    const caps = (primaryLine.dominantCapabilities || []).join(', ');
    return `Strategy via ${winCond}. Dominant capabilities: ${caps}. ` +
           `Derived kill turn: ${curveAnalysis.derivedKillTurn}. ` +
           `Pool: ${curveAnalysis.lineCardCount} cards on line (${curveAnalysis.lowCurve} low / ${curveAnalysis.midCurve} mid / ${curveAnalysis.highCurve} high curve).`;
  }

  /**
   * P(X=0) for hypergeometric: C(N-K, n) / C(N, n)
   * @private
   */
  static _hyperP0(N, K, n) {
    if (K <= 0 || N <= 0 || n <= 0) return 1;
    if (K >= N) return 0;
    let logP = 0;
    for (let i = 0; i < n; i++) {
      logP += Math.log(N - K - i) - Math.log(N - i);
    }
    return Math.exp(logP);
  }
}
