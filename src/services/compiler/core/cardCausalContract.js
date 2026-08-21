/**
 * CARD CAUSAL CONTRACT (v24.0 Core Engine)
 * 
 * Universal Semantic & Operational Prerequisite Parser for MTG Cards.
 * Transforms raw card Oracle text and type line into an immutable, structured
 * Causal Contract with zero hardcoded card name exceptions.
 * 
 * Architecture:
 *   Oracle Truth
 *    ├── Costs (Mana, Additional Sacrifice, Discard, Life, Tap, Counters)
 *    ├── Effects (Add Mana, Draw, Damage, Create Token, Destroy, Bounce, Counter, Buff)
 *    ├── Restrictions (Spend this mana only to..., Cast only if..., Can't attack unless...)
 *    ├── Targets (Creature, Player, Artifact, Permanent, Spell, Card in Graveyard)
 *    ├── Timing (Instant, Sorcery, ETB, Attack, Upkeep, Death)
 *    └── Conditions (If you control, As long as, Delirium, Metalcraft, Threshold)
 * 
 *   Derived Contract
 *    ├── Supplies (Atomic capabilities and resources provided)
 *    ├── Demands (Categorized: HARD, CONDITIONAL, AMPLIFYING, SELF_SUPPLYING, OPPONENT_DEPENDENT)
 *    ├── SelfSupply (Self-sufficient internal loops)
 *    └── OperationalPrerequisites (Deck & State infrastructure requirements)
 */

export class CardCausalContract {
  /**
   * Parses a raw MTG card object into a full CardCausalContract.
   * @param {Object} card 
   * @returns {Object} CardCausalContract
   */
  static parse(card) {
    if (!card) return null;

    const oracleRaw = card.oracle_text || card.oracleText || '';
    const oracle = oracleRaw.toLowerCase();
    const typeLineRaw = card.type_line || card.typeLine || '';
    const typeLine = typeLineRaw.toLowerCase();
    const name = card.name || 'Unknown';
    const cmc = Number(card.cmc || card.mana_value || 0);
    const manaCost = card.mana_cost || card.manaCost || '';
    const colors = Array.isArray(card.colors) ? card.colors : [];
    const colorIdentity = Array.isArray(card.color_identity) ? card.color_identity : [];
    const power = card.power !== undefined ? String(card.power) : '';
    const toughness = card.toughness !== undefined ? String(card.toughness) : '';

    // 1. Oracle Truth Extraction
    const oracleTruth = this._extractOracleTruth(oracle, typeLine, cmc);

    // 2. Derived Capabilities: Supplies
    const supplies = this._deriveSupplies(oracleTruth, oracle, typeLine, cmc);

    // 3. Derived Capabilities: Demands & Self-Supply
    const { demands, selfSupply } = this._deriveDemandsAndSelfSupply(oracleTruth, oracle, typeLine, cmc, supplies);

    // 4. Derived Capabilities: Operational Prerequisites
    const operationalPrerequisites = this._deriveOperationalPrerequisites(oracleTruth, demands);

    return Object.freeze({
      cardIdentity: Object.freeze({
        name,
        manaCost,
        typeLine: typeLineRaw,
        oracleText: oracleRaw,
        cmc,
        colors,
        colorIdentity,
        power,
        toughness,
        isCreature: typeLine.includes('creature'),
        isInstant: typeLine.includes('instant'),
        isSorcery: typeLine.includes('sorcery'),
        isArtifact: typeLine.includes('artifact'),
        isEnchantment: typeLine.includes('enchantment'),
        isPlaneswalker: typeLine.includes('planeswalker'),
        isLand: typeLine.includes('land'),
        isLegendary: typeLine.includes('legendary')
      }),
      oracleTruth: Object.freeze(oracleTruth),
      supplies: Object.freeze(supplies),
      demands: Object.freeze(demands),
      selfSupply: Object.freeze(selfSupply),
      operationalPrerequisites: Object.freeze(operationalPrerequisites)
    });
  }

  /**
   * Internal parser: Extracts atomic costs, effects, restrictions, targets, timing, and conditions.
   * @private
   */
  static _extractOracleTruth(oracle, typeLine, cmc) {
    const costs = [];
    const effects = [];
    const restrictions = [];
    const targets = [];
    const timing = [];
    const conditions = [];

    // --- Costs ---
    if (oracle.includes('as an additional cost to cast this spell, sacrifice') || oracle.includes('as an additional cost, sacrifice')) {
      costs.push({ type: 'ADDITIONAL_SACRIFICE', target: oracle.includes('artifact') ? 'ARTIFACT_OR_CREATURE' : 'CREATURE' });
    }
    if (oracle.includes('as an additional cost to cast this spell, discard') || oracle.includes('as an additional cost, discard')) {
      costs.push({ type: 'ADDITIONAL_DISCARD', count: 1 });
    }
    if (oracle.includes('pay {e}') || oracle.includes('pay {e}{e}')) {
      costs.push({ type: 'PAY_ENERGY', amount: (oracle.match(/\{e\}/g) || []).length });
    }
    if (oracle.includes('remove a +1/+1 counter') || oracle.includes('remove one or more +1/+1 counters')) {
      costs.push({ type: 'REMOVE_COUNTER', counterType: '+1/+1' });
    }
    if (oracle.includes('kicker')) {
      costs.push({ type: 'KICKER_OPTIONAL' });
    }

    // --- Restrictions (Spend this mana only to..., cast only if...) ---
    if (oracle.includes('spend this mana only to activate abilities')) {
      restrictions.push({ type: 'MANA_RESTRICTION', allowedUse: 'ACTIVATED_ABILITIES_ONLY', description: 'Spend mana only on activated abilities' });
    } else if (oracle.includes('spend this mana only to cast an instant or sorcery') || oracle.includes('spend this mana only to cast instant or sorcery')) {
      restrictions.push({ type: 'MANA_RESTRICTION', allowedUse: 'INSTANT_OR_SORCERY_ONLY', description: 'Spend mana only on instant or sorcery spells' });
    } else if (oracle.includes('spend this mana only to cast creature spells') || oracle.includes('spend this mana only to cast a creature spell')) {
      restrictions.push({ type: 'MANA_RESTRICTION', allowedUse: 'CREATURE_SPELLS_ONLY', description: 'Spend mana only on creature spells' });
    } else if (oracle.includes('spend this mana only to cast artifact spells') || oracle.includes('spend this mana only to cast an artifact spell')) {
      restrictions.push({ type: 'MANA_RESTRICTION', allowedUse: 'ARTIFACT_SPELLS_ONLY', description: 'Spend mana only on artifact spells' });
    } else if (oracle.includes('spend this mana only to cast legendary') || oracle.includes('spend this mana only to cast a legendary')) {
      restrictions.push({ type: 'MANA_RESTRICTION', allowedUse: 'LEGENDARY_SPELLS_ONLY', description: 'Spend mana only on legendary spells' });
    } else if (oracle.includes('spend this mana only')) {
      restrictions.push({ type: 'MANA_RESTRICTION', allowedUse: 'SPECIFIC_RESTRICTION', description: 'Spend mana only on specific designated targets' });
    }

    if (oracle.includes("can't attack unless") || oracle.includes("can't attack or block unless")) {
      restrictions.push({ type: 'ATTACK_RESTRICTION', condition: 'CONDITIONAL_ATTACK' });
    }

    // --- Targets ---
    if (oracle.includes('to any target') || oracle.includes('deals ') && oracle.includes('damage to any target')) {
      targets.push({ type: 'ANY_TARGET', canHitPlayer: true, canHitCreature: true, canHitPlaneswalker: true });
    } else if (oracle.includes('target player') || oracle.includes('target opponent') || oracle.includes('each opponent')) {
      targets.push({ type: 'TARGET_PLAYER', canHitPlayer: true, canHitCreature: false, canHitPlaneswalker: false });
    }
    if (oracle.includes('target creature') || oracle.includes('target attacking creature') || oracle.includes('target tapped creature')) {
      targets.push({ type: 'TARGET_CREATURE', canHitPlayer: false, canHitCreature: true, canHitPlaneswalker: false });
    }
    if (oracle.includes('target planeswalker')) {
      targets.push({ type: 'TARGET_PLANESWALKER', canHitPlayer: false, canHitCreature: false, canHitPlaneswalker: true });
    }
    if (oracle.includes('target permanent') || oracle.includes('target nonland permanent')) {
      targets.push({ type: 'TARGET_PERMANENT', canHitPlayer: false, canHitCreature: true, canHitPlaneswalker: true });
    }
    if (oracle.includes('target spell') || oracle.includes('target instant or sorcery') || oracle.includes('target noncreature spell')) {
      targets.push({ type: 'TARGET_SPELL' });
    }
    if (oracle.includes('target card from your graveyard') || oracle.includes('target card in a graveyard') || oracle.includes('target creature card from your graveyard')) {
      targets.push({ type: 'TARGET_GRAVEYARD_CARD' });
    }

    // --- Effects ---
    // Mana Generation
    if (oracle.includes('{t}: add') || oracle.includes('{t}: put') || oracle.includes('add {') || oracle.includes('adds {')) {
      effects.push({ type: 'ADD_MANA', isTriggered: !oracle.includes('{t}: add') });
    }
    // Land Search Ramp
    if (oracle.includes('search your library for a basic land') || oracle.includes('search your library for a land card') || oracle.includes('put a land card from your hand')) {
      effects.push({ type: 'LAND_RAMP' });
    }
    // Token Generation
    if (oracle.includes('create a') || oracle.includes('create two') || oracle.includes('create x') || oracle.includes('create that many') || oracle.includes('create a token')) {
      effects.push({ type: 'CREATE_TOKEN' });
    }
    // Card Advantage / Draw
    if (oracle.includes('draw a card') || oracle.includes('draw two cards') || oracle.includes('draw three cards') || oracle.includes('draws a card')) {
      effects.push({ type: 'DRAW_CARDS' });
    }
    // Counter Spell
    if (oracle.includes('counter target spell') || oracle.includes('counter target noncreature spell') || oracle.includes('counter target creature spell')) {
      effects.push({ type: 'COUNTER_SPELL' });
    }
    // Removal & Burn (Destroy / Exile / -N/-N / Damage)
    const isDamageEffect = (oracle.includes('deals ') && oracle.includes('damage')) || oracle.includes('deal damage');
    const isDestroyOrExile = oracle.includes('destroy target') || oracle.includes('exile target') || oracle.includes('destroy all') || oracle.includes('exile all');
    if (isDamageEffect || isDestroyOrExile) {
      const canHitFace = targets.some(t => t.canHitPlayer);
      if (canHitFace) {
        effects.push({ type: 'PLAYER_BURN', canHitPlayer: true });
      }
      if (oracle.includes('destroy all') || oracle.includes('exile all') || oracle.includes('return each creature that isn\'t') || (oracle.includes('deals') && oracle.includes('damage to each creature'))) {
        effects.push({ type: 'BOARD_SWEEPER' });
      } else {
        effects.push({ type: 'SPOT_REMOVAL', canHitPlayer: canHitFace });
      }
    }

    // --- Conditions ---
    if (oracle.includes('affinity for artifacts') || oracle.includes('metalcraft') || oracle.includes('if you control an artifact') || oracle.includes('cast an artifact spell from your hand without paying')) {
      conditions.push({ type: 'REQUIRES_ARTIFACTS', source: 'ORACLE_CONDITION' });
    }
    if (oracle.includes('delirium') || oracle.includes('threshold') || oracle.includes('cards in your graveyard')) {
      conditions.push({ type: 'GRAVEYARD_THRESHOLD', source: 'ORACLE_CONDITION' });
    }
    if (oracle.includes('modified') || oracle.includes('with a +1/+1 counter') || oracle.includes('each creature you control with a +1/+1 counter')) {
      conditions.push({ type: 'COUNTER_CONDITION', source: 'ORACLE_CONDITION' });
    }

    // --- Timing ---
    if (typeLine.includes('instant') || oracle.includes('flash')) {
      timing.push('INSTANT_SPEED');
    } else {
      timing.push('SORCERY_SPEED');
    }
    if (oracle.includes('when this creature enters') || oracle.includes('when this permanent enters') || oracle.includes('when you cast')) {
      timing.push('ON_ENTER_OR_CAST');
    }
    if (oracle.includes('whenever a creature you control attacks') || oracle.includes('whenever this creature attacks')) {
      timing.push('ON_ATTACK');
    }
    if (oracle.includes('at the beginning of your upkeep') || oracle.includes('at the beginning of each upkeep')) {
      timing.push('ON_UPKEEP');
    }
    if (oracle.includes('whenever a creature dies') || oracle.includes('when this creature dies')) {
      timing.push('ON_DEATH');
    }

    return {
      costs,
      effects,
      restrictions,
      targets,
      timing,
      conditions
    };
  }

  /**
   * Internal parser: Derives capabilities supplied by the card.
   * @private
   */
  static _deriveSupplies(oracleTruth, oracle, typeLine, cmc) {
    const supplies = [];

    // 1. Mana Acceleration Supply
    const hasManaEffect = oracleTruth.effects.some(e => e.type === 'ADD_MANA' || e.type === 'LAND_RAMP');
    if (hasManaEffect) {
      const restriction = oracleTruth.restrictions.find(r => r.type === 'MANA_RESTRICTION');
      const domain = restriction ? restriction.allowedUse : 'UNIVERSAL';

      supplies.push({
        capability: 'MANA_ACCELERATION',
        domain, // 'UNIVERSAL' | 'ACTIVATED_ABILITIES_ONLY' | 'INSTANT_OR_SORCERY_ONLY' | 'CREATURE_SPELLS_ONLY' | 'ARTIFACT_SPELLS_ONLY'
        isUniversal: domain === 'UNIVERSAL',
        timing: oracleTruth.timing.includes('INSTANT_SPEED') ? 'INSTANT_SPEED' : 'TAP_ABILITY',
        estimatedTurnOnline: Math.max(1, cmc)
      });
    }

    // 2. Token Generation Supply (Fodder / Swarm)
    if (oracleTruth.effects.some(e => e.type === 'CREATE_TOKEN')) {
      const isSerpentToken = oracle.includes('serpent creature token');
      const isSaprolingToken = oracle.includes('saproling creature token');
      const isGoblinToken = oracle.includes('goblin creature token');
      const isZombieToken = oracle.includes('zombie creature token');

      supplies.push({
        capability: 'TOKEN_GENERATOR',
        tokenSubtype: isSerpentToken ? 'Serpent' : (isSaprolingToken ? 'Saproling' : (isGoblinToken ? 'Goblin' : (isZombieToken ? 'Zombie' : 'Generic'))),
        repeatable: oracleTruth.timing.includes('ON_UPKEEP') || oracleTruth.timing.includes('ON_ATTACK'),
        isFodder: true
      });
    }

    // 3. Card Flow / Draw Supply
    if (oracleTruth.effects.some(e => e.type === 'DRAW_CARDS')) {
      supplies.push({
        capability: 'CARD_FLOW',
        repeatable: oracleTruth.timing.includes('ON_UPKEEP') || oracleTruth.timing.includes('ON_ATTACK') || oracle.includes('whenever you')
      });
    }

    // 4. Counter Spell / Disruption Supply
    if (oracleTruth.effects.some(e => e.type === 'COUNTER_SPELL')) {
      supplies.push({
        capability: 'COUNTER_DISRUPTION',
        timing: 'INSTANT_SPEED'
      });
    }

    // 5. Cheap Removal & Direct Reach Supply
    const spotRemovalEffect = oracleTruth.effects.find(e => e.type === 'SPOT_REMOVAL');
    if (spotRemovalEffect) {
      supplies.push({
        capability: 'CHEAP_REMOVAL',
        timing: oracleTruth.timing.includes('INSTANT_SPEED') ? 'INSTANT_SPEED' : 'SORCERY_SPEED',
        canHitPlayer: !!spotRemovalEffect.canHitPlayer
      });
    }

    if (oracleTruth.effects.some(e => e.type === 'PLAYER_BURN')) {
      supplies.push({
        capability: 'PLAYER_REACH',
        timing: oracleTruth.timing.includes('INSTANT_SPEED') ? 'INSTANT_SPEED' : 'SORCERY_SPEED'
      });
    }

    // 6. Board Sweeper Supply
    if (oracleTruth.effects.some(e => e.type === 'BOARD_SWEEPER')) {
      const isAsymmetric = oracle.includes("that isn't") || oracle.includes("you control");
      supplies.push({
        capability: 'BOARD_SWEEPER',
        isAsymmetric
      });
    }

    // 7. Large Threat / Finisher Supply
    if (typeLine.includes('creature') && (cmc >= 5 || (cmc >= 4 && (oracle.includes('trample') || oracle.includes('flying') || oracle.includes('ward'))))) {
      supplies.push({
        capability: 'FINISHER',
        evasion: oracle.includes('flying') ? 'FLYING' : (oracle.includes('trample') ? 'TRAMPLE' : (oracle.includes("can't be blocked") ? 'UNBLOCKABLE' : 'NONE')),
        resilience: oracle.includes('ward') || oracle.includes('hexproof') || oracle.includes('indestructible')
      });
    }

    // 8. Self Graveyard Enabler (Self-Mill)
    if (oracle.includes('mill') || (oracle.includes('put the top') && oracle.includes('cards of your library into your graveyard')) || oracle.includes('dredge')) {
      supplies.push({
        capability: 'GRAVEYARD_ENABLER',
        isSelfMill: true
      });
    }

    // 9. Counter Generator Supply (+1/+1 counter placement)
    if (oracle.includes('put a +1/+1 counter') || oracle.includes('enters with a +1/+1 counter') || oracle.includes('proliferate')) {
      supplies.push({
        capability: 'COUNTER_GENERATOR',
        counterType: '+1/+1'
      });
    }

    // 10. Land Acceleration & Landfall Payoffs
    if (oracle.includes('search your library for a land') || oracle.includes('search your library for a basic land') || oracle.includes('you may play an additional land') || oracle.includes('put a land card from your hand onto the battlefield') || (oracle.includes('land') && oracle.includes('onto the battlefield tapped'))) {
      supplies.push({
        capability: 'LAND_ACCELERATION',
        timing: oracleTruth.timing.includes('INSTANT_SPEED') ? 'INSTANT_SPEED' : 'SORCERY_SPEED'
      });
    }
    if (oracle.includes('landfall') || oracle.includes('whenever a land enters') || oracle.includes('whenever a land you control enters')) {
      supplies.push({
        capability: 'LANDFALL_PAYOFF',
        timing: 'TRIGGERED'
      });
    }

    // 11. Blink & ETB Value
    if ((oracle.includes('exile target') && oracle.includes('return')) || oracle.includes('flicker') || (oracle.includes('exile') && oracle.includes('return to the battlefield'))) {
      supplies.push({
        capability: 'BLINK_ENABLER',
        timing: oracleTruth.timing.includes('INSTANT_SPEED') ? 'INSTANT_SPEED' : 'SORCERY_SPEED'
      });
    }
    if (typeLine.includes('creature') && (oracle.includes('when ~ enters') || oracle.includes('when this creature enters') || oracle.includes('whenever this creature enters') || oracle.includes('enters the battlefield'))) {
      supplies.push({
        capability: 'ETB_VALUE',
        timing: 'ON_ETB'
      });
    }

    // 12. Lifegain Triggers & Payoffs
    if (oracle.includes('whenever you gain life') || oracle.includes('lifelink') || (oracle.includes('gain') && oracle.includes('life'))) {
      supplies.push({
        capability: 'LIFEGAIN_TRIGGER',
        timing: 'TRIGGERED'
      });
    }
    if (oracle.includes('whenever you gain life, put') || (oracle.includes('as long as you have') && oracle.includes('more than your starting life total'))) {
      supplies.push({
        capability: 'GROWTH_PAYOFF',
        timing: 'TRIGGERED'
      });
    }

    // 13. Reanimation Spells & Looting Enablers
    if (oracle.includes('return target creature card from your graveyard to the battlefield') || oracle.includes('return target permanent card from your graveyard to the battlefield')) {
      supplies.push({
        capability: 'REANIMATION_SPELL',
        timing: oracleTruth.timing.includes('INSTANT_SPEED') ? 'INSTANT_SPEED' : 'SORCERY_SPEED'
      });
    }
    if (oracle.includes('discard a card') || oracle.includes('draw a card, then discard') || (oracle.includes('search your library') && oracle.includes('into your graveyard'))) {
      supplies.push({
        capability: 'LOOTING_DISCARD',
        timing: oracleTruth.timing.includes('INSTANT_SPEED') ? 'INSTANT_SPEED' : 'SORCERY_SPEED'
      });
    }

    return supplies;
  }

  /**
   * Internal parser: Derives operational demands and self-sufficient loops.
   * @private
   */
  static _deriveDemandsAndSelfSupply(oracleTruth, oracle, typeLine, cmc, supplies) {
    const demands = [];
    let selfSupply = { isSelfSufficient: false, internalLoops: [] };

    // --- 1. Artifact Demands ---
    const hasArtifactCondition = oracleTruth.conditions.some(c => c.type === 'REQUIRES_ARTIFACTS');
    const hasAdditionalArtifactSac = (oracle.includes('as an additional cost') || oracle.includes('as an additional cost to cast')) && oracle.includes('sacrifice an artifact');
    const isPureArtifactPayoff = oracle.includes('cast an artifact spell') ||
                                 oracle.includes('cast artifact spells') ||
                                 oracle.includes('artifacts you control have') ||
                                 oracle.includes('affinity for artifacts') ||
                                 oracle.includes('metalcraft') ||
                                 oracle.includes('target artifact') ||
                                 hasAdditionalArtifactSac;

    if (hasArtifactCondition || isPureArtifactPayoff) {
      const isHard = !typeLine.includes('artifact') && (
        oracle.includes('cast an artifact spell') ||
        oracle.includes('cast artifact spells') ||
        oracle.includes('artifacts you control have') ||
        hasAdditionalArtifactSac
      );

      demands.push({
        resource: 'ARTIFACT_CONTROL',
        necessity: isHard ? 'HARD' : 'CONDITIONAL',
        description: isHard ? 'Mandatory artifact control required to cast or activate' : 'Requires artifact density to amplify efficiency (Metalcraft/Affinity)',
        timing: 'IN_PLAY'
      });
    }

    // --- 2. Restricted Mana Consumer Demand (e.g. Omen Hawker) ---
    const manaSupply = supplies.find(s => s.capability === 'MANA_ACCELERATION');
    if (manaSupply && !manaSupply.isUniversal) {
      if (manaSupply.domain === 'ACTIVATED_ABILITIES_ONLY') {
        demands.push({
          resource: 'ACTIVATED_ABILITY_CONSUMER',
          necessity: 'HARD',
          description: 'Restricted mana requires deck permanents with activated abilities.',
          timing: 'SAME_TURN'
        });
      } else if (manaSupply.domain === 'INSTANT_OR_SORCERY_ONLY') {
        demands.push({
          resource: 'INSTANT_OR_SORCERY_CONSUMER',
          necessity: 'HARD',
          description: 'Restricted mana requires instant or sorcery spells to cast.',
          timing: 'SAME_TURN'
        });
      }
    }

    // --- 3. Sacrifice Fodder & Aristocrats Demands ---
    const hasSacCost = oracleTruth.costs.some(c => c.type === 'ADDITIONAL_SACRIFICE');
    const hasSacActivation = oracle.includes('sacrifice a ') || oracle.includes('sacrifice another ') || oracle.includes('sacrifice an ') || oracle.includes('sacrifice target ');
    const isDeathPayoff = oracle.includes('dies') && (oracle.includes('whenever') || oracle.includes('when') || oracle.includes('death'));

    if (hasSacCost || hasSacActivation || isDeathPayoff) {
      const isTokenCreator = supplies.some(s => s.capability === 'TOKEN_GENERATOR');
      
      if (isTokenCreator && (hasSacActivation || isDeathPayoff)) {
        // Self-Supplying engine loop! (e.g. Koma, Slimefoot)
        selfSupply.isSelfSufficient = true;
        selfSupply.internalLoops.push({
          fuel: 'TOKEN_GENERATOR',
          consumer: hasSacActivation ? 'SACRIFICE_ACTIVATION' : 'DEATH_PAYOFF'
        });

        demands.push({
          resource: 'SACRIFICE_FODDER',
          necessity: 'SELF_SUPPLYING',
          description: 'Card generates its own creature tokens to satisfy its sacrifice/death payoff.',
          timing: 'SELF_CONTAINED'
        });
      } else {
        demands.push({
          resource: 'SACRIFICE_FODDER',
          necessity: hasSacCost ? 'HARD' : 'CONDITIONAL',
          description: hasSacCost ? 'Mandatory sacrifice cost to resolve spell' : 'Requires fodder to trigger death/sacrifice value',
          timing: 'IN_PLAY'
        });
      }
    }

    // --- 4. Graveyard Density / Delirium / Dredge Demands ---
    if (oracleTruth.conditions.some(c => c.type === 'GRAVEYARD_THRESHOLD')) {
      const isSelfMiller = supplies.some(s => s.capability === 'GRAVEYARD_ENABLER');
      demands.push({
        resource: 'GRAVEYARD_FUEL',
        necessity: isSelfMiller ? 'SELF_SUPPLYING' : 'CONDITIONAL',
        description: 'Requires graveyard cards/types to unlock Delirium, Threshold, or Descend payoffs.',
        timing: 'IN_GRAVEYARD'
      });
    }

    // --- 5. +1/+1 Counter Demands ---
    if (oracleTruth.conditions.some(c => c.type === 'COUNTER_CONDITION') || oracle.includes('remove a +1/+1 counter')) {
      const isSelfCounterer = supplies.some(s => s.capability === 'COUNTER_GENERATOR');
      demands.push({
        resource: 'COUNTER_INFRASTRUCTURE',
        necessity: isSelfCounterer ? 'SELF_SUPPLYING' : 'CONDITIONAL',
        description: 'Requires +1/+1 counter generation infrastructure on friendly creatures.',
        timing: 'ON_BOARD'
      });
    }

    // --- 6. Opponent Dependent Interaction (e.g. Thieving Skydiver, Spell Pierce) ---
    if (oracle.includes('target artifact an opponent controls') || oracle.includes('gain control of target artifact') || oracle.includes('destroy target artifact or enchantment')) {
      demands.push({
        resource: 'OPPONENT_TARGET_AVAILABILITY',
        necessity: 'OPPONENT_DEPENDENT',
        description: 'Effect value depends on opponent permanent presence.',
        timing: 'OPPONENT_BOARD'
      });
    }

    return { demands, selfSupply };
  }

  /**
   * Internal parser: Derives operational prerequisites for deck-level satisfaction.
   * @private
   */
  static _deriveOperationalPrerequisites(oracleTruth, demands) {
    return {
      hasHardDemands: demands.some(d => d.necessity === 'HARD'),
      hardDemandTypes: demands.filter(d => d.necessity === 'HARD').map(d => d.resource),
      conditionalDemandTypes: demands.filter(d => d.necessity === 'CONDITIONAL').map(d => d.resource),
      isOpponentDependent: demands.some(d => d.necessity === 'OPPONENT_DEPENDENT'),
      isSelfSufficient: demands.some(d => d.necessity === 'SELF_SUPPLYING')
    };
  }

  /**
   * Checks whether a card's supplies are causally compatible with a required WinPath capability role.
   * 
   * @param {Object} contract CardCausalContract
   * @param {string} requiredRole e.g. 'RAMP_ACCELERATION', 'CHEAP_REMOVAL', 'FINISHER', 'CARD_FLOW'
   * @param {Object} [intentContext={}] Archetype/WinPath context
   * @returns {{ isCompatible: boolean, reason: string }}
   */
  static isCausallyCompatibleWithRole(contract, requiredRole, intentContext = {}) {
    if (!contract || !requiredRole) return { isCompatible: false, reason: 'Invalid contract or role' };

    const roleLower = requiredRole.toLowerCase();

    // 1. RAMP_ACCELERATION role check
    if (roleLower.includes('ramp') || roleLower.includes('acceleration') || roleLower.includes('mana_dork')) {
      const manaSupply = contract.supplies.find(s => s.capability === 'MANA_ACCELERATION');
      if (!manaSupply) {
        return { isCompatible: false, reason: 'Card does not supply mana acceleration.' };
      }

      // If the deck's primary WinPath is Creature Stompy / Big Mana and the ramp card is restricted to abilities or spells:
      const deckGoal = (intentContext.tempo || intentContext.archetype || '').toLowerCase();
      const isCreatureRampTarget = deckGoal.includes('ramp') || deckGoal.includes('stompy') || deckGoal.includes('midrange');
      const isSpellslingerTarget = deckGoal.includes('spellslinger') || deckGoal.includes('storm') || deckGoal.includes('prowess');

      if (manaSupply.domain === 'ACTIVATED_ABILITIES_ONLY') {
        if (!deckGoal.includes('ability') && !deckGoal.includes('toolbox')) {
          return {
            isCompatible: false,
            reason: `Mana restricted to activated abilities cannot accelerate spell-casting WinPath (${manaSupply.domain}).`
          };
        }
      }

      if (manaSupply.domain === 'INSTANT_OR_SORCERY_ONLY') {
        if (isCreatureRampTarget && !isSpellslingerTarget) {
          return {
            isCompatible: false,
            reason: `Mana restricted to instants/sorceries cannot accelerate creature-centric Ramp WinPath.`
          };
        }
      }

      if (manaSupply.domain === 'LEGENDARY_SPELLS_ONLY') {
        if (isSpellslingerTarget) {
          return {
            isCompatible: false,
            reason: `Mana restricted to legendary spells cannot accelerate non-legendary instant/sorcery spellslinger WinPath.`
          };
        }
      }

      return { isCompatible: true, reason: `Provides compatible ${manaSupply.domain} mana acceleration.` };
    }

    // 2. CHEAP_REMOVAL role check
    if (roleLower.includes('removal') || roleLower.includes('interaction')) {
      const hasRemoval = contract.supplies.some(s => s.capability === 'CHEAP_REMOVAL' || s.capability === 'COUNTER_DISRUPTION' || s.capability === 'BOARD_SWEEPER');
      if (!hasRemoval) {
        return { isCompatible: false, reason: 'Card does not provide spot removal, board sweep, or counter disruption.' };
      }
      return { isCompatible: true, reason: 'Provides interaction/removal capability.' };
    }

    // 3. FINISHER role check
    if (roleLower.includes('finisher') || roleLower.includes('apex') || roleLower.includes('bomb')) {
      const hasFinisher = contract.supplies.some(s => s.capability === 'FINISHER');
      if (!hasFinisher) {
        return { isCompatible: false, reason: 'Card does not supply high-curve finisher presence or evasion.' };
      }
      return { isCompatible: true, reason: 'Supplies high-impact finisher threat.' };
    }

    // 4. LAND_ACCELERATOR & LANDFALL_PAYOFF role checks
    if (roleLower.includes('land_accelerator') || roleLower.includes('land_acceleration')) {
      const hasLandRamp = contract.supplies.some(s => s.capability === 'LAND_ACCELERATION' || s.capability === 'MANA_ACCELERATION');
      if (!hasLandRamp) {
        return { isCompatible: false, reason: 'Card does not provide land acceleration or mana development.' };
      }
      return { isCompatible: true, reason: 'Supplies land acceleration infrastructure.' };
    }

    if (roleLower.includes('landfall_payoff') || roleLower.includes('landfall')) {
      const hasLandfall = contract.supplies.some(s => s.capability === 'LANDFALL_PAYOFF');
      if (!hasLandfall) {
        return { isCompatible: false, reason: 'Card does not possess Landfall or land-entry triggered payoff.' };
      }
      return { isCompatible: true, reason: 'Supplies Landfall triggered payoff.' };
    }

    // 5. BLINK & ETB role checks
    if (roleLower.includes('blink_enabler') || roleLower.includes('flicker')) {
      const hasBlink = contract.supplies.some(s => s.capability === 'BLINK_ENABLER');
      if (!hasBlink) {
        return { isCompatible: false, reason: 'Card does not supply exile-and-return blink/flicker capability.' };
      }
      return { isCompatible: true, reason: 'Supplies blink/flicker enabler.' };
    }

    if (roleLower.includes('etb_value')) {
      const hasEtb = contract.supplies.some(s => s.capability === 'ETB_VALUE');
      if (!hasEtb) {
        return { isCompatible: false, reason: 'Card is not a creature with an enter-the-battlefield trigger.' };
      }
      return { isCompatible: true, reason: 'Supplies ETB value trigger.' };
    }

    // 6. LIFEGAIN Triggers & Payoffs
    if (roleLower.includes('lifegain_trigger')) {
      const hasLifeTrigger = contract.supplies.some(s => s.capability === 'LIFEGAIN_TRIGGER');
      if (!hasLifeTrigger) {
        return { isCompatible: false, reason: 'Card does not supply lifegain or lifelink triggers.' };
      }
      return { isCompatible: true, reason: 'Supplies lifegain trigger.' };
    }

    if (roleLower.includes('growth_payoff')) {
      const hasPayoff = contract.supplies.some(s => s.capability === 'GROWTH_PAYOFF' || s.capability === 'COUNTER_GENERATOR');
      if (!hasPayoff) {
        return { isCompatible: false, reason: 'Card does not scale or trigger from life gain.' };
      }
      return { isCompatible: true, reason: 'Supplies growth payoff from life gain.' };
    }

    // 7. COUNTER Engines & Payoffs
    if (roleLower.includes('counter_engine') || roleLower.includes('counter_payoff')) {
      const hasCounter = contract.supplies.some(s => s.capability === 'COUNTER_GENERATOR');
      if (!hasCounter) {
        return { isCompatible: false, reason: 'Card does not place or amplify +1/+1 counters.' };
      }
      return { isCompatible: true, reason: 'Supplies +1/+1 counter synergy.' };
    }

    // 8. REANIMATOR & LOOTING
    if (roleLower.includes('reanimation_spell')) {
      const hasReanimate = contract.supplies.some(s => s.capability === 'REANIMATION_SPELL');
      if (!hasReanimate) {
        return { isCompatible: false, reason: 'Card does not return cards from graveyard to battlefield.' };
      }
      return { isCompatible: true, reason: 'Supplies reanimation capability.' };
    }

    if (roleLower.includes('looting_discard')) {
      const hasLooting = contract.supplies.some(s => s.capability === 'LOOTING_DISCARD' || s.capability === 'GRAVEYARD_ENABLER');
      if (!hasLooting) {
        return { isCompatible: false, reason: 'Card does not discard or mill cards to graveyard.' };
      }
      return { isCompatible: true, reason: 'Supplies discard/mill graveyard enabler.' };
    }

    // Default: compatible
    return { isCompatible: true, reason: 'General compatibility verified.' };
  }
}
