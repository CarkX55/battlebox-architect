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

import { IdentityFirewall } from './identityFirewall.js';
import { extractCanonicalCmc } from './canonicalCardNormalizer.js';

export class CardCausalContract {
  /**
   * Parses a raw MTG card object into a full CardCausalContract.
   * @param {Object} card 
   * @returns {Object} CardCausalContract
   */
  static parse(card) {
    if (!card) return null;

    const faces = Array.isArray(card.card_faces) ? card.card_faces : [];
    let oracleRaw = card.oracle_text || card.oracleText || '';
    let typeLineRaw = card.type_line || card.typeLine || '';
    let power = card.power !== undefined ? String(card.power) : '';
    let toughness = card.toughness !== undefined ? String(card.toughness) : '';
    let manaCost = card.mana_cost || card.manaCost || '';
    let colors = Array.isArray(card.colors) ? card.colors : [];

    // Extract rich attributes from card_faces for DFCs (Transform/MDFC)
    if (faces.length > 0) {
      if (!oracleRaw) {
        oracleRaw = faces.map(f => f.oracle_text || f.oracleText || '').filter(Boolean).join('\n//\n');
      }
      if (!typeLineRaw) {
        typeLineRaw = faces.map(f => f.type_line || f.typeLine || '').filter(Boolean).join(' // ');
      }
      if (!power && faces[0]?.power !== undefined) {
        power = String(faces[0].power);
      }
      if (!toughness && faces[0]?.toughness !== undefined) {
        toughness = String(faces[0].toughness);
      }
      if (!manaCost && faces[0]?.mana_cost) {
        manaCost = faces[0].mana_cost;
      }
      if (colors.length === 0) {
        const faceColors = new Set();
        faces.forEach(f => (f.colors || []).forEach(c => faceColors.add(c)));
        if (faceColors.size > 0) {
          colors = Array.from(faceColors);
        } else if (Array.isArray(card.color_identity)) {
          colors = card.color_identity;
        }
      }
    }

    const oracle = oracleRaw.toLowerCase();
    const typeLine = typeLineRaw.toLowerCase();
    const name = card.name || 'Unknown';
    const cmc = extractCanonicalCmc(card);
    const colorIdentity = Array.isArray(card.color_identity) ? card.color_identity : colors;

    // 1. Oracle Truth Extraction
    const oracleTruth = this._extractOracleTruth(oracle, typeLine, cmc);

    // 2. Derived Capabilities: Supplies
    const supplies = this._deriveSupplies(oracleTruth, oracle, typeLine, cmc);

    // 2b. High-Resolution Proof Capabilities (v26.1 Causal Selection Core)
    const interactionProof = this._deriveInteractionProof(oracleTruth, oracle, typeLine, cmc);
    const resourceAccessChains = this._deriveResourceAccessChains(oracleTruth, oracle, typeLine, cmc);

    // 3. Derived Capabilities: Demands & Self-Supply
    const { demands, selfSupply } = this._deriveDemandsAndSelfSupply(oracleTruth, oracle, typeLine, cmc, supplies);

    // 4. Derived Capabilities: Operational Prerequisites
    const operationalPrerequisites = this._deriveOperationalPrerequisites(oracleTruth, demands);

    // 5. Derived Capabilities: Execution Modes & Effective Mana Demand
    const { executionModes, effectiveManaDemand } = this._deriveExecutionModesAndManaDemand(oracleRaw, oracle, typeLine, cmc, manaCost, supplies);

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
        isLegendary: typeLine.includes('legendary'),
        isTribal: typeLine.includes('tribal'),
        card_faces: faces,
        rawCard: card
      }),
      oracleTruth: Object.freeze(oracleTruth),
      supplies: Object.freeze(supplies),
      interactionProof: Object.freeze(interactionProof),
      resourceAccessChains: Object.freeze(resourceAccessChains),
      demands: Object.freeze(demands),
      selfSupply: Object.freeze(selfSupply),
      operationalPrerequisites: Object.freeze(operationalPrerequisites),
      executionModes: Object.freeze(executionModes),
      effectiveManaDemand: Object.freeze(effectiveManaDemand)
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
    const isRenownOrDeathTrigger = oracle.includes('renown') || oracle.includes('when this creature dies') || oracle.includes('sacrifice this creature');
    if (!isRenownOrDeathTrigger && (oracle.includes('{t}: add') || oracle.includes('{t}: put') || oracle.includes('add {') || oracle.includes('adds {'))) {
      effects.push({ type: 'ADD_MANA', isTriggered: !oracle.includes('{t}: add') });
    }
    // Land Search Ramp
    if (/search your library for.*land/i.test(oracle) || /put.*land.*battlefield/i.test(oracle) || /(?:if\s+(?:it's\s+a\s+)?land,?\s+put\s+onto\s+battlefield)/i.test(oracle)) {
      effects.push({ type: 'LAND_RAMP' });
    }
    // Token Generation
    if (/create\s+(?:a|an|two|three|four|\d+|x|that many|.*token)/i.test(oracle)) {
      effects.push({ type: 'CREATE_TOKEN' });
    }
    // Card Advantage / Draw
    if (/draws?\s+(?:a|two|three|four|\d+|x)\s+card/i.test(oracle) || /look at (?:the )?top card/i.test(oracle)) {
      effects.push({ type: 'DRAW_CARDS' });
    }
    // Counter Spell
    if (oracle.includes('counter target spell') || oracle.includes('counter target noncreature spell') || oracle.includes('counter target creature spell')) {
      effects.push({ type: 'COUNTER_SPELL' });
    }
    // Removal & Burn (Destroy / Exile / -N/-N / Damage)
    const isDamageEffect = (oracle.includes('deals ') && oracle.includes('damage')) || oracle.includes('deal damage');
    const isGraveyardTarget = oracle.includes('from a graveyard') || 
      oracle.includes('from their graveyard') || 
      oracle.includes('from any graveyard') || 
      oracle.includes('in a graveyard') || 
      oracle.includes('cards from all graveyards') || 
      oracle.includes('exile all graveyards') || 
      oracle.includes('target player\'s graveyard') || 
      oracle.includes('target card from a graveyard') || 
      oracle.includes('target card in a graveyard');

    const isDestroyOrExile = (oracle.includes('destroy target') || oracle.includes('exile target') || oracle.includes('destroy all') || oracle.includes('exile all')) && !isGraveyardTarget;

    if (isGraveyardTarget && (oracle.includes('exile') || oracle.includes('remove'))) {
      effects.push({ type: 'GRAVEYARD_HATE' });
    }

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
    const subtypeConditionMatch = oracle.match(/(?:as long as you control|if you control)\s+(?:a|an|another)\s+([a-z\-]+)/i);
    if (subtypeConditionMatch) {
      const requiredSubtype = subtypeConditionMatch[1].toLowerCase().trim();
      const KNOWN_MTG_SUBTYPES = new Set([
        'cleric', 'rogue', 'warrior', 'wizard', 'shaman', 'druid', 'knight', 'soldier', 'assassin', 'warlock', 'monk', 'archer', 'artificer',
        'goblin', 'elf', 'vampire', 'zombie', 'dragon', 'angel', 'demon', 'dinosaur', 'beast', 'hydra', 'elemental', 'spirit', 'faerie',
        'sliver', 'merfolk', 'human', 'werewolf', 'wolf', 'cat', 'dog', 'hound', 'bird', 'lizard', 'mouse', 'rabbit', 'bat', 'otter', 'frog',
        'turtle', 'crab', 'golem', 'treefolk', 'spider', 'snake', 'naga', 'ooze', 'giant', 'eldrazi', 'ninja', 'pirate', 'wall'
      ]);
      if (KNOWN_MTG_SUBTYPES.has(requiredSubtype)) {
        conditions.push({
          type: 'SUBTYPE_CONDITION',
          requiredSubtype,
          source: 'ORACLE_CONDITION'
        });
      }
    }
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
      const isDelayedOrConditional = oracle.includes('renown') || oracle.includes('when this creature dies');

      if (!isDelayedOrConditional) {
        supplies.push({
          capability: 'MANA_ACCELERATION',
          domain, // 'UNIVERSAL' | 'ACTIVATED_ABILITIES_ONLY' | 'INSTANT_OR_SORCERY_ONLY' | 'CREATURE_SPELLS_ONLY' | 'ARTIFACT_SPELLS_ONLY'
          isUniversal: domain === 'UNIVERSAL',
          timing: oracleTruth.timing.includes('INSTANT_SPEED') ? 'INSTANT_SPEED' : 'TAP_ABILITY',
          estimatedTurnOnline: Math.max(1, cmc)
        });
      }
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
    const isSlowArtifactRemoval = (typeLine.includes('artifact') || typeLine.includes('enchantment')) &&
      !typeLine.includes('creature') &&
      /\{[2-9wubrg]\}[,\s]*\{t\}/i.test(oracle);

    if (spotRemovalEffect && !isSlowArtifactRemoval) {
      supplies.push({
        capability: 'CHEAP_REMOVAL',
        timing: oracleTruth.timing.includes('INSTANT_SPEED') ? 'INSTANT_SPEED' : 'SORCERY_SPEED',
        canHitPlayer: !!spotRemovalEffect.canHitPlayer
      });
    }

    if (oracleTruth.effects.some(e => e.type === 'PLAYER_BURN') && !isSlowArtifactRemoval) {
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
    const isPlaneswalker = typeLine.includes('planeswalker');
    const isBigCreature = typeLine.includes('creature') && (
      cmc >= 5 || 
      (cmc >= 4 && (oracle.includes('trample') || oracle.includes('flying') || oracle.includes('ward') || oracle.includes('haste') || oracle.includes('flash')))
    );
    const isGameEndingPermanent = (typeLine.includes('enchantment') || typeLine.includes('artifact')) && (
      oracle.includes('shark creature token') || 
      oracle.includes('demon creature token') || 
      oracle.includes('dragon creature token') || 
      oracle.includes('whenever you cast a noncreature spell')
    );

    if (isPlaneswalker || isBigCreature || isGameEndingPermanent) {
      supplies.push({
        capability: 'FINISHER',
        isPlaneswalker,
        evasion: oracle.includes('flying') ? 'FLYING' : (oracle.includes('trample') ? 'TRAMPLE' : (oracle.includes("can't be blocked") ? 'UNBLOCKABLE' : 'NONE')),
        resilience: isPlaneswalker || oracle.includes('ward') || oracle.includes('hexproof') || oracle.includes('indestructible') || oracle.includes('flash')
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
    if (/search your library for.*land/i.test(oracle) || /play (?:an |additional )land/i.test(oracle) || /put.*land.*battlefield/i.test(oracle) || /(?:if\s+(?:it's\s+a\s+)?land,?\s+put\s+onto\s+battlefield)/i.test(oracle) || oracle.includes('onto the battlefield tapped')) {
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
    // 14. Sacrifice Outlet & Death Payoff Supplies
    const hasSacOutletText = oracle.includes('sacrifice a ') || oracle.includes('sacrifice another ') || oracle.includes('sacrifice an artifact') || oracle.includes('sacrifice a permanent');
    if (hasSacOutletText && oracle.includes(':')) {
      supplies.push({
        capability: 'SACRIFICE_OUTLET',
        timing: oracleTruth.timing.includes('INSTANT_SPEED') ? 'INSTANT_SPEED' : 'ACTIVATED'
      });
    }

    const hasDeathPayoffText = (oracle.includes('dies') || oracle.includes('is put into a graveyard')) && (oracle.includes('whenever') || oracle.includes('when'));
    if (hasDeathPayoffText) {
      supplies.push({
        capability: 'DEATH_PAYOFF',
        timing: 'TRIGGERED'
      });
    }

    // 15. Tribal Lord & Stat Buff Supply (Permanents only)
    const isBuffPermanent = typeLine.includes('creature') || typeLine.includes('enchantment') || typeLine.includes('artifact');
    if (isBuffPermanent && (oracle.includes('creatures you control get +') || (oracle.includes('other ') && oracle.includes('you control get +')))) {
      supplies.push({
        capability: 'TRIBAL_LORD',
        timing: 'STATIC'
      });
    }

    // 16. State Transition & Day/Night Transformation (v29.3)
    if (oracle.includes('daybound') || oracle.includes('nightbound') || oracle.includes('it becomes day') || oracle.includes('it becomes night')) {
      supplies.push({
        capability: 'DAYBOUND_NIGHTBOUND',
        timing: 'STATIC_OR_TRIGGERED'
      });
    }
    if (oracle.includes('as long as it\'s night') || oracle.includes('if it\'s night') || oracle.includes('whenever a werewolf you control transforms') || oracle.includes('whenever a permanent you control transforms')) {
      supplies.push({
        capability: 'NIGHT_PAYOFF',
        timing: 'TRIGGERED'
      });
    }
    if ((oracle.includes('it becomes night') || oracle.includes('it becomes day')) && (oracle.includes('whenever') || oracle.includes('{t}:') || oracle.includes('beginning of your upkeep'))) {
      supplies.push({
        capability: 'STATE_TRANSITION_CONTROLLER',
        timing: 'TRIGGERED_OR_ACTIVATED'
      });
    }

    return supplies;
  }

  /**
   * Internal parser: Derives structured interaction proof capabilities (v26.1).
   * @private
   */
  static _deriveInteractionProof(oracleTruth, oracle, typeLine, cmc, targets = []) {
    const isInstant = typeLine.includes('instant') || oracle.includes('flash');
    const isSorcery = typeLine.includes('sorcery');
    const isCreature = typeLine.includes('creature');
    const isGraveyardTarget = oracle.includes('from a graveyard') || 
      oracle.includes('from their graveyard') || 
      oracle.includes('from any graveyard') || 
      oracle.includes('in a graveyard') || 
      oracle.includes('cards from all graveyards') || 
      oracle.includes('exile all graveyards') || 
      oracle.includes('target player\'s graveyard') || 
      oracle.includes('target card from a graveyard') || 
      oracle.includes('target card in a graveyard');

    const isConditionalDamageDestroy = oracle.includes('was dealt damage this turn') || 
      oracle.includes('with damage on it') || 
      oracle.includes('that was dealt damage') || 
      oracle.includes('that took damage');

    const isDestroyOrExile = (oracle.includes('destroy target') || oracle.includes('exile target') || oracle.includes('destroy all') || oracle.includes('exile all')) && !isGraveyardTarget && !isConditionalDamageDestroy;
    const isCounter = oracleTruth.effects.some(e => e.type === 'COUNTER_SPELL') || oracle.includes('counter target');
    const isBounce = (oracle.includes('return target') || oracle.includes('return each')) && (oracle.includes('to its owner') || oracle.includes('to their owner'));
    const isDamageEffect = (oracle.includes('deals ') && oracle.includes('damage')) || oracle.includes('deal damage');
    const isFightOrBite = oracle.includes('fights target') || oracle.includes('deals damage equal to its power') || oracle.includes("deals damage equal to that creature's power") || oracle.includes('fights another target');

    // 1. Timing Window
    let timingWindow = 'SORCERY_SPEED';
    if (isInstant) {
      timingWindow = 'INSTANT_SPEED';
    } else if (oracle.includes('when this creature dies') || oracle.includes('when ~ dies') || (oracle.includes('dies') && isDamageEffect && isCreature)) {
      timingWindow = 'DEATH_TRIGGER_CONDITIONAL';
    } else if (oracle.includes('whenever this creature attacks') || oracle.includes('whenever ~ attacks')) {
      timingWindow = 'ATTACK_TRIGGER';
    } else if (oracle.includes('at the beginning of your upkeep') || oracle.includes('at the beginning of each upkeep')) {
      timingWindow = 'UPKEEP_TRIGGER';
    } else if (oracle.includes(':') && isCreature) {
      timingWindow = 'ACTIVATED_ABILITY';
    }

    // 2. Target Scope
    let targetScope = 'NONE';
    if (oracle.includes('to any target') || (oracle.includes('target') && oracle.includes('any target'))) {
      targetScope = 'ANY_TARGET';
    } else if (oracle.includes('target nonland permanent') || oracle.includes('target permanent')) {
      targetScope = 'NONLAND_PERMANENT';
    } else if (oracle.includes('target creature or planeswalker')) {
      targetScope = 'CREATURE_OR_PLANESWALKER';
    } else if (oracle.includes('target creature') && !isConditionalDamageDestroy) {
      targetScope = 'TARGET_CREATURE';
    } else if (oracle.includes('target artifact') || oracle.includes('target enchantment') || oracle.includes('attacking creature') || oracle.includes('tapped creature') || isConditionalDamageDestroy) {
      targetScope = 'NARROW_CONDITIONAL';
    } else if (isCounter) {
      targetScope = 'TARGET_SPELL';
    } else if (isGraveyardTarget) {
      targetScope = 'GRAVEYARD_TARGET';
    }

    // 3. Conditionality
    let conditionality = 'UNCONDITIONAL';
    if (timingWindow === 'DEATH_TRIGGER_CONDITIONAL' || oracle.includes('flip a coin') || oracle.includes('attacking creature without flying') || isConditionalDamageDestroy) {
      conditionality = 'HIGHLY_CONDITIONAL';
    } else if (oracle.includes('if revolt') || oracle.includes('revolt —') || oracle.includes('landfall') || oracle.includes('delirium') || oracle.includes('threshold') || oracle.includes('bargain')) {
      conditionality = 'CONDITIONALLY_RELIABLE';
    }

    // 4. Damage Potency
    let damagePotency = 0;
    if (isConditionalDamageDestroy) {
      damagePotency = 2.0; // Narrow situational conditional destroy
    } else if (isDestroyOrExile || isCounter) {
      damagePotency = 5;
    } else if (isFightOrBite) {
      damagePotency = 4.5;
    } else if (isDamageEffect) {
      if (oracle.includes('deals 1 damage') || oracle.includes('deal 1 damage')) {
        damagePotency = 1;
      } else if (oracle.includes('deals 2 damage') || oracle.includes('deal 2 damage')) {
        damagePotency = 2;
      } else if (oracle.includes('deals 3 damage') || oracle.includes('deal 3 damage')) {
        damagePotency = 3;
      } else if (oracle.includes('deals 4 damage') || oracle.includes('deal 4 damage')) {
        damagePotency = 4;
      } else if (oracle.includes('deals 5 damage') || oracle.includes('deals 6 damage') || oracle.includes('deals x damage') || oracle.includes('deal x damage')) {
        damagePotency = 4.5;
      } else {
        damagePotency = 2.5;
      }
    }

    // 5. Effect Scope
    let effectScope = 'NONE';
    if (isConditionalDamageDestroy) {
      effectScope = 'CONDITIONAL_REMOVAL';
    } else if (isCounter) {
      effectScope = 'COUNTER_SPELL';
    } else if (isDestroyOrExile || isFightOrBite) {
      effectScope = 'HARD_REMOVAL';
    } else if (isBounce) {
      effectScope = 'BOUNCE_TEMPO';
    } else if (isGraveyardTarget) {
      effectScope = 'GRAVEYARD_HATE';
    } else if (isDamageEffect) {
      if ((timingWindow === 'DEATH_TRIGGER_CONDITIONAL' && isCreature) || (damagePotency <= 1 && cmc >= 2)) {
        effectScope = 'INCIDENTAL_PING';
      } else {
        effectScope = 'DAMAGE_REMOVAL';
      }
    }

    // Effective mana cost for activation-based interaction
    let effectiveCmc = cmc;
    const actMatch = oracle.match(/\{(\d+)\}[^:]*:/);
    if (actMatch && (typeLine.includes('artifact') || typeLine.includes('enchantment') || typeLine.includes('creature'))) {
      const actCost = parseInt(actMatch[1], 10);
      if (!isNaN(actCost)) {
        effectiveCmc = cmc + actCost;
      }
    }

    const isDirectInteraction = (effectScope === 'HARD_REMOVAL' || effectScope === 'DAMAGE_REMOVAL' || effectScope === 'COUNTER_SPELL' || effectScope === 'BOUNCE_TEMPO') &&
      conditionality !== 'HIGHLY_CONDITIONAL' &&
      timingWindow !== 'DEATH_TRIGGER_CONDITIONAL' &&
      effectScope !== 'INCIDENTAL_PING' &&
      effectiveCmc <= 6;

    return {
      effectScope,
      timingWindow,
      targetScope,
      conditionality,
      isDirectInteraction,
      damagePotency,
      manaCost: effectiveCmc
    };
  }

  /**
   * Internal parser: Derives compositional resource access chains (v26.1).
   * @private
   */
  static _deriveResourceAccessChains(oracleTruth, oracle, typeLine, cmc) {
    const chains = [];

    // Impulse Draw
    if ((oracle.includes('exile the top') || oracle.includes('exile top')) && 
        (oracle.includes('you may play') || oracle.includes('you may cast') || oracle.includes('until the end of your next turn') || oracle.includes('until end of turn'))) {
      chains.push('IMPULSE_DRAW');
    }

    // Death-Triggered Resource Access
    if ((oracle.includes('dies') || oracle.includes('is put into a graveyard')) && 
        (oracle.includes('draw') || oracle.includes('exile the top') || oracle.includes('look at the top'))) {
      chains.push('DEATH_TRIGGERED_FLOW');
    }

    // Combat Damage Flow
    if (oracle.includes('deals combat damage') && (oracle.includes('draw') || oracle.includes('exile the top'))) {
      chains.push('COMBAT_DAMAGE_FLOW');
    }

    // Upkeep / End Step Flow
    if ((oracle.includes('beginning of your upkeep') || oracle.includes('beginning of your end step')) && 
        (oracle.includes('draw') || oracle.includes('look at the top') || oracle.includes('investigate'))) {
      chains.push('UPKEEP_FLOW');
    }

    // Raw Card Draw
    if (oracleTruth.effects.some(e => e.type === 'DRAW_CARDS') || oracle.includes('draw a card') || oracle.includes('draw two cards') || oracle.includes('draws a card')) {
      chains.push('RAW_DRAW');
    }

    const isCompositionalFlow = chains.includes('IMPULSE_DRAW') || chains.includes('DEATH_TRIGGERED_FLOW') || chains.includes('COMBAT_DAMAGE_FLOW') || chains.includes('UPKEEP_FLOW');

    return {
      chains,
      isCompositionalFlow,
      hasResourceFlow: chains.length > 0
    };
  }

  /**
   * Extracts typed tribal contribution vector for a target tribe (v26.1).
   */
  static extractTribalContribution(card, targetTribe = '') {
    if (!card) return { isMember: false, isEnabler: false, isAmplifier: false, isEngine: false, isPayoff: false };
    const rawTribe = targetTribe ? String(targetTribe).toLowerCase().trim() : '';
    if (!rawTribe || rawTribe === 'none' || rawTribe === 'universal' || rawTribe === 'general') {
      return { isMember: false, isEnabler: false, isAmplifier: false, isEngine: false, isPayoff: false };
    }

    const faces = Array.isArray(card.card_faces) ? card.card_faces : [];
    let typeLine = (card.type_line || card.typeLine || card.type || '').toLowerCase();
    let oracle = (card.oracle_text || card.oracleText || card.text || '').toLowerCase();

    if (faces.length > 0) {
      if (!typeLine) typeLine = faces.map(f => f.type_line || f.typeLine || '').filter(Boolean).join(' // ').toLowerCase();
      if (!oracle) oracle = faces.map(f => f.oracle_text || f.oracleText || '').filter(Boolean).join('\n//\n').toLowerCase();
    }

    const hasExactSubtype = (sub) => {
      const regex = new RegExp(`\\b${sub}\\b`, 'i');
      if (regex.test(typeLine)) return true;
      return faces.some(f => regex.test((f.type_line || '').toLowerCase()));
    };

    const isChangeling = oracle.includes('changeling') && !oracle.includes('lose all abilities');

    let isMember = false;
    if (rawTribe === 'werewolf' || rawTribe === 'werewolves') {
      isMember = hasExactSubtype('werewolf') || 
        (typeLine.includes('creature') && (oracle.includes('daybound') || oracle.includes('nightbound'))) || 
        isChangeling;
    } else if (rawTribe === 'wolf' || rawTribe === 'wolves') {
      isMember = (hasExactSubtype('wolf') && !hasExactSubtype('werewolf')) || isChangeling;
    } else {
      isMember = hasExactSubtype(rawTribe) || isChangeling;
    }
    
    // Amplifier: +X/+X, Haste, Trample, Battle Cry, Anthem, Deathtouch/Keywords to tribe
    const isAmplifier = (
      oracle.includes('other ' + rawTribe) || 
      oracle.includes('and other ' + rawTribe) ||
      oracle.includes(rawTribe + 's you control get +') || 
      oracle.includes(rawTribe + ' you control get +') || 
      oracle.includes(rawTribe + ' creatures you control get +') ||
      (rawTribe === 'werewolf' && (oracle.includes('wolves and werewolves you control get +') || (oracle.includes('as long as it\'s night') && oracle.includes('get +')))) ||
      oracle.includes('creatures you control get +') ||
      oracle.includes('battle cry') ||
      (oracle.includes(rawTribe) && (oracle.includes('have haste') || oracle.includes('gain haste') || oracle.includes('gain trample') || oracle.includes('have menace') || oracle.includes('have deathtouch') || oracle.includes('gain deathtouch')))
    );

    // Engine: Generates cards, resources, reanimation or recurring bodies specifically tied to tribe or state
    const isEngine = (
      ((oracle.includes(rawTribe) || (oracle.includes('another creature you control') && isMember)) && 
      (oracle.includes('whenever') || oracle.includes('when') || oracle.includes('once during each of your turns')) && 
      (oracle.includes('dies') || oracle.includes('attacks') || oracle.includes('enters') || oracle.includes('from your graveyard')) && 
      (oracle.includes('draw') || oracle.includes('exile the top') || oracle.includes('create a ' + rawTribe) || oracle.includes('create ' + rawTribe) || oracle.includes('cast a ' + rawTribe) || oracle.includes('cast ' + rawTribe) || oracle.includes('return this card from your graveyard') || oracle.includes('return it to the battlefield'))) ||
      (rawTribe === 'werewolf' && (oracle.includes('whenever a wolf or werewolf you control deals combat damage to a player, draw') || oracle.includes('it becomes night') || oracle.includes('daybound') && oracle.includes('draw')))
    );

    // Enabler: Abarata costes o genera maná para la tribu
    const isEnabler = (
      oracle.includes(rawTribe + ' spells you cast cost') || 
      oracle.includes('spend this mana only to cast ' + rawTribe) || 
      oracle.includes('create a ' + rawTribe) ||
      oracle.includes('create two ' + rawTribe)
    );

    // Payoff: Escala por la cantidad de miembros de la tribu o daño devastador / Nightbound
    const isPayoff = (
      oracle.includes('for each ' + rawTribe) || 
      oracle.includes('equal to the number of ' + rawTribe) ||
      oracle.includes('number of ' + rawTribe + 's you control') ||
      oracle.includes('loses half their life') ||
      oracle.includes('deals combat damage to a player, that player loses') ||
      (rawTribe === 'werewolf' && (oracle.includes('as long as it\'s night') || oracle.includes('if it\'s night') || oracle.includes('three or more wolves and/or werewolves')))
    );

    return {
      isMember,
      isEnabler,
      isAmplifier,
      isEngine,
      isPayoff
    };
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

    // --- 7. Subtype Control Demands (e.g. Relic Vial requiring a Cleric) ---
    const subtypeCondition = oracleTruth.conditions.find(c => c.type === 'SUBTYPE_CONDITION');
    if (subtypeCondition) {
      const isSubtypeInType = typeLine.includes(subtypeCondition.requiredSubtype);
      demands.push({
        resource: 'SUBTYPE_CONTROL',
        requiredSubtype: subtypeCondition.requiredSubtype,
        necessity: isSubtypeInType ? 'SELF_SUPPLYING' : 'HARD',
        earliestRelevantTurn: Math.max(1, cmc),
        latestUsefulTurn: Math.max(5, cmc + 2),
        description: `Requires controlling a ${subtypeCondition.requiredSubtype} to unlock triggered payoff.`,
        timing: 'ON_BOARD'
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
      const isCreatureRampTarget = deckGoal.includes('ramp') || deckGoal.includes('stompy') || deckGoal.includes('midrange') || (intentContext.primaryTribe && intentContext.primaryTribe !== 'none');
      const isSpellslingerTarget = deckGoal.includes('spellslinger') || deckGoal.includes('storm') || deckGoal.includes('prowess');

      // Symmetrical damage spells cannot act as Ramp Acceleration in creature-based decks
      const oracle = (contract.cardIdentity?.oracleText || '').toLowerCase();
      const isSymmetricalDamage = (oracle.includes('deals 1 damage to each creature') || oracle.includes('deals 2 damage to each creature') || oracle.includes('deals 3 damage to each creature') || oracle.includes('damage to each creature without')) && !oracle.includes('opponents control') && !oracle.includes("you don't control");
      if (isSymmetricalDamage && isCreatureRampTarget) {
        return {
          isCompatible: false,
          reason: 'FAILS_ROLE_PROOF: Symmetrical creature damage spell damages friendly creatures and undermines creature-centric Ramp WinPath.'
        };
      }

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

    // 2. COUNTER_DISRUPTION / COUNTERSPELL_SUITE
    if (roleLower.includes('counter') || roleLower.includes('disruption')) {
      const oracle = (contract.cardIdentity?.oracleText || '').toLowerCase();
      const isCounter = contract.supplies.some(s => s.capability === 'COUNTER_DISRUPTION') ||
        (contract.interactionProof && contract.interactionProof.effectScope === 'COUNTER_SPELL') ||
        oracle.includes('counter target');
      if (!isCounter) {
        return { isCompatible: false, reason: 'FAILS_ROLE_PROOF: Card does not provide counterspell disruption.' };
      }
      return { isCompatible: true, reason: 'Supplies counterspell disruption.' };
    }

    // 2b. BOARD_SWEEPER / SWEEPER / MASS_REMOVAL
    if (roleLower.includes('sweeper') || roleLower.includes('board_wipe') || roleLower.includes('mass_removal')) {
      const oracle = (contract.cardIdentity?.oracleText || '').toLowerCase();
      const isGraveyardTarget = oracle.includes('from a graveyard') || oracle.includes('all graveyards');
      const hasSweeper = (contract.supplies.some(s => s.capability === 'BOARD_SWEEPER') ||
        oracle.includes('destroy all') || oracle.includes('exile all') ||
        (oracle.includes('damage to each creature') && !oracle.includes('deals 1 damage')) ||
        (oracle.includes('return each creature') && oracle.includes('to its owner\'s hand'))) &&
        (!isGraveyardTarget || oracle.includes('creature') || oracle.includes('permanent'));

      if (!hasSweeper) {
        return { isCompatible: false, reason: 'FAILS_ROLE_PROOF: Card does not provide a board sweeper effect.' };
      }
      return { isCompatible: true, reason: 'Supplies board sweeper effect.' };
    }

    // 2c. CHEAP_REMOVAL / SPOT_REMOVAL / INTERACTION
    if (roleLower.includes('removal') || roleLower.includes('interaction') || roleLower.includes('cheap_removal')) {
      const proof = contract.interactionProof;
      if (proof) {
        if (proof.effectScope === 'COUNTER_SPELL') {
          return {
            isCompatible: false,
            reason: 'FAILS_ROLE_PROOF: Counterspells belong in COUNTER_DISRUPTION, not battlefield SPOT_REMOVAL.'
          };
        }
        if (proof.effectScope === 'GRAVEYARD_HATE' || proof.effectScope === 'INCIDENTAL_PING' || proof.timingWindow === 'DEATH_TRIGGER_CONDITIONAL' || proof.conditionality === 'HIGHLY_CONDITIONAL') {
          return {
            isCompatible: false,
            reason: 'FAILS_ROLE_PROOF: Incidental ping, death trigger, or graveyard hate cannot execute reliable threat removal.'
          };
        }
        if (proof.isDirectInteraction && proof.effectScope !== 'GRAVEYARD_HATE') {
          return { isCompatible: true, reason: `Provides direct ${proof.effectScope} at ${proof.timingWindow} timing.` };
        }
      }
      const hasRemoval = contract.supplies.some(s => s.capability === 'CHEAP_REMOVAL');
      if (!hasRemoval) {
        return { isCompatible: false, reason: 'Card does not provide spot removal.' };
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

    // 9. SACRIFICE_OUTLET & DEATH_PAYOFF & TRIBAL_LORD
    if (roleLower.includes('sacrifice_outlet') || roleLower.includes('sac_outlet')) {
      const hasSac = contract.supplies.some(s => s.capability === 'SACRIFICE_OUTLET');
      if (!hasSac) {
        return { isCompatible: false, reason: 'Card does not provide a sacrifice outlet activation.' };
      }
      return { isCompatible: true, reason: 'Supplies sacrifice outlet capability.' };
    }

    if (roleLower.includes('death_payoff')) {
      const hasDeath = contract.supplies.some(s => s.capability === 'DEATH_PAYOFF');
      if (!hasDeath) {
        return { isCompatible: false, reason: 'Card does not trigger on creature death or sacrifice.' };
      }
      return { isCompatible: true, reason: 'Supplies death payoff capability.' };
    }

    if (roleLower.includes('recursive_fodder') || roleLower.includes('fodder')) {
      const hasFodder = contract.supplies.some(s => s.capability === 'TOKEN_GENERATOR') || contract.cardIdentity.isCreature;
      if (!hasFodder) {
        return { isCompatible: false, reason: 'Card does not provide creature presence or token generation.' };
      }
      return { isCompatible: true, reason: 'Supplies creature fodder capability.' };
    }

    if (roleLower.includes('amplify') || roleLower.includes('lord') || roleLower.includes('force_multiplier') || roleLower.includes('board_amplifier')) {
      const hasLord = contract.supplies.some(s => s.capability === 'TRIBAL_LORD');
      const oracle = (contract.cardIdentity?.oracleText || '').toLowerCase();
      const hasBoardAmp = hasLord || 
        oracle.includes('creatures you control get +') || 
        oracle.includes('other creatures you control get +') ||
        oracle.includes('other goblins you control get +') ||
        oracle.includes('other elves you control get +') ||
        oracle.includes('other vampires you control get +') ||
        oracle.includes('other zombies you control get +') ||
        oracle.includes('battle cry') ||
        (oracle.includes('you control get +') && oracle.includes('/+'));

      if (!hasBoardAmp) {
        return { isCompatible: false, reason: 'FAILS_ROLE_PROOF: Card does not amplify or multiply board pressure across multiple creatures.' };
      }
      return { isCompatible: true, reason: 'Supplies board pressure amplification.' };
    }

    if (roleLower.includes('draw') || roleLower.includes('card_flow') || roleLower.includes('flow') || roleLower.includes('advantage')) {
      const typeLine = (contract.cardIdentity?.typeLine || '').toLowerCase();
      const oracle = (contract.cardIdentity?.oracleText || '').toLowerCase();
      const isAura = typeLine.includes('aura') || typeLine.includes('enchantment — aura');
      const isCombatDependent = oracle.includes('combat damage to a player') || oracle.includes("if you didn't attack");
      const isControl = (intentContext.tempo || intentContext.archetype || '').toLowerCase().includes('control') || (intentContext.tempo || '').toLowerCase().includes('reactive');

      if (isAura && isCombatDependent && isControl) {
        return {
          isCompatible: false,
          reason: 'FAILS_ROLE_PROOF: Combat-dependent Aura (e.g. Curious Obsession) requires aggressive creature curve, invalid for Control.'
        };
      }

      const flow = contract.resourceAccessChains;
      const hasRawDraw = contract.supplies.some(s => s.capability === 'CARD_FLOW');
      if (flow && (flow.isCompositionalFlow || flow.hasResourceFlow)) {
        return { isCompatible: true, reason: `Supplies compositional resource flow via [${flow.chains.join(', ')}].` };
      }
      if (hasRawDraw) {
        return { isCompatible: true, reason: 'Supplies standard card flow/draw capability.' };
      }
      return { isCompatible: false, reason: 'FAILS_ROLE_PROOF: Card does not supply card flow, impulse draw, or recurring resource access.' };
    }

    // 10. TRIBAL_DENSITY (Strict on-tribe creature requirement)
    if (roleLower.includes('tribal_density') || roleLower.includes('tribal')) {
      const typeLine = (contract.cardIdentity?.typeLine || '').toLowerCase();
      const oracle = (contract.cardIdentity?.oracleText || '').toLowerCase();
      const isVehicle = typeLine.includes('vehicle');
      const isLand = typeLine.includes('land') && !typeLine.includes('creature');
      const isCreature = (contract.cardIdentity?.isCreature || typeLine.includes('creature')) && !isVehicle && !isLand;
      const primaryTribe = intentContext?.primaryTribe || '';

      if (!isCreature && !oracle.includes('create a token') && !oracle.includes('create a') && !oracle.includes('token')) {
        return {
          isCompatible: false,
          reason: 'FAILS_ROLE_PROOF: Non-creature spell cannot fulfill TRIBAL_DENSITY slot.'
        };
      }

      if (primaryTribe && primaryTribe !== 'none') {
        const cardObj = {
          name: contract.cardIdentity?.name || '',
          type_line: contract.cardIdentity?.typeLine || '',
          oracle_text: contract.cardIdentity?.oracleText || ''
        };
        const isMatch = IdentityFirewall.isMatchingTribe(cardObj, primaryTribe);
        if (!isMatch) {
          return {
            isCompatible: false,
            reason: `FAILS_ROLE_PROOF: Card "${contract.cardIdentity?.name}" does not match required tribe [${intentContext.primaryTribe}].`
          };
        }
      }
      return { isCompatible: true, reason: 'Supplies on-tribe creature density.' };
    }

    // Default: compatible
    return { isCompatible: true, reason: 'General compatibility verified.' };
  }

  /**
   * Internal parser: Extracts structured execution modes and contextual effective mana demand.
   * @private
   */
  static _deriveExecutionModesAndManaDemand(oracleRaw, oracle, typeLine, cmc, manaCost, supplies = []) {
    const modes = [];
    const isInstantSpeed = typeLine.includes('instant') || oracle.includes('flash');
    const isCreature = typeLine.includes('creature');
    const isLand = typeLine.includes('land');

    // Detect X-Cost in casting cost or oracle text
    const isXCost = manaCost.includes('{X}') || manaCost.includes('{x}') || (oracle.includes('{x}') && (oracle.includes('enters with x') || oracle.includes('deals x damage') || oracle.includes('equal to x')));
    let effectiveOperationalCmc = cmc;
    let xEarliestExecutableTurn = Math.max(1, cmc);

    if (isXCost) {
      // In MTG, an X-cost card requires mana investment (X >= 2) to be cast as a functional threat/spell
      effectiveOperationalCmc = isCreature ? Math.max(4, cmc + 2) : Math.max(4, cmc + 2);
      xEarliestExecutableTurn = Math.max(3, cmc + 2);
      modes.push({
        modeId: 'X_SCALABLE_CAST',
        effectiveDemand: effectiveOperationalCmc,
        timing: isInstantSpeed ? 'INSTANT_SPEED' : 'SORCERY_SPEED',
        purpose: isCreature ? 'SCALABLE_FINISHER' : 'SCALABLE_SPELL',
        restrictions: [],
        earliestExecutableTurn: xEarliestExecutableTurn
      });
    }

    // 1. Primary Cast Mode
    modes.push({
      modeId: 'PRIMARY_CAST',
      effectiveDemand: isXCost ? effectiveOperationalCmc : cmc,
      timing: isInstantSpeed ? 'INSTANT_SPEED' : 'SORCERY_SPEED',
      purpose: isCreature ? 'BOARD_PRESENCE' : (isLand ? 'MANA_BASE' : 'SPELL_EFFECT'),
      restrictions: [],
      earliestExecutableTurn: isXCost ? xEarliestExecutableTurn : Math.max(1, cmc)
    });

    // 2. Alternative Execution Modes (Zero hardcoded names, pure oracle syntax)
    // Cycling (e.g. Cycling {1}, Cycling {2}, Cycling {X}{1}{U})
    if (oracle.includes('cycling {') || oracle.includes('cycling—{')) {
      const match = oracle.match(/cycling[—\s]*\{([0-9wubrgcx]+)\}/i);
      let cyclingCost = 2; // Default cycling cost in MTG if parse fails
      if (match && match[1]) {
        const costStr = match[1].toLowerCase();
        const numMatch = costStr.match(/[0-9]+/);
        cyclingCost = numMatch ? Number(numMatch[0]) : 1;
      }
      modes.push({
        modeId: 'CYCLING',
        effectiveDemand: cyclingCost,
        timing: 'INSTANT_SPEED',
        purpose: 'CARD_VELOCITY',
        restrictions: [],
        earliestExecutableTurn: cyclingCost
      });
    }

    // Adventure (e.g. Brazen Borrower / Petty Theft, Bonecrusher Giant / Stomp)
    if (typeLine.includes('adventure') || oracle.includes('adventure') || oracle.includes('cast as an adventure')) {
      // Adventures allow early interaction / card advantage on lower curve
      const adventureCost = Math.min(2, Math.max(1, cmc - 2));
      modes.push({
        modeId: 'ADVENTURE',
        effectiveDemand: adventureCost,
        timing: 'INSTANT_SPEED',
        purpose: 'EARLY_INTERACTION_OR_CREATURE',
        restrictions: [],
        earliestExecutableTurn: adventureCost
      });
    }

    // Evoke
    if (oracle.includes('evoke {') || oracle.includes('evoke—{')) {
      const match = oracle.match(/evoke[—\s]*\{([0-9wubrgcx]+)\}/i);
      let evokeCost = Math.max(1, cmc - 2);
      if (match && match[1]) {
        const numMatch = match[1].match(/[0-9]+/);
        if (numMatch) evokeCost = Number(numMatch[0]);
      }
      modes.push({
        modeId: 'EVOKE',
        effectiveDemand: evokeCost,
        timing: 'SORCERY_SPEED',
        purpose: 'ETB_EFFECT',
        restrictions: [],
        earliestExecutableTurn: evokeCost
      });
    }

    // Prototype
    if (oracle.includes('prototype {') || oracle.includes('prototype — {')) {
      const protoCost = Math.max(1, Math.min(3, cmc - 3));
      modes.push({
        modeId: 'PROTOTYPE',
        effectiveDemand: protoCost,
        timing: 'SORCERY_SPEED',
        purpose: 'EARLY_CREATURE_CURVE',
        restrictions: [],
        earliestExecutableTurn: protoCost
      });
    }

    // Channel
    if (oracle.includes('channel — {') || oracle.includes('channel —')) {
      const channelCost = Math.max(1, cmc - 2);
      modes.push({
        modeId: 'CHANNEL',
        effectiveDemand: channelCost,
        timing: 'INSTANT_SPEED',
        purpose: 'INTERACTION_OR_ACCELERATION',
        restrictions: [],
        earliestExecutableTurn: channelCost
      });
    }

    // Foretell
    if (oracle.includes('foretell {') || oracle.includes('foretell—{')) {
      modes.push({
        modeId: 'FORETELL',
        effectiveDemand: 2,
        timing: 'SPECIAL_ACTION',
        purpose: 'COST_DISTRIBUTION',
        restrictions: [],
        earliestExecutableTurn: 2
      });
    }

    // Modal / Spree (e.g. Three Steps Ahead, Choose one or more)
    if (oracle.includes('spree') || oracle.includes('choose one or more')) {
      modes.push({
        modeId: 'MODAL_SPREE',
        effectiveDemand: Math.max(1, cmc),
        timing: isInstantSpeed ? 'INSTANT_SPEED' : 'SORCERY_SPEED',
        purpose: 'VERSATILE_INTERACTION',
        restrictions: [],
        earliestExecutableTurn: Math.max(1, cmc)
      });
    }

    // Affinity / Delve / Convoke
    if (oracle.includes('affinity for artifacts') || oracle.includes('delve') || oracle.includes('convoke') || oracle.includes('improvise')) {
      modes.push({
        modeId: 'COST_REDUCTION',
        effectiveDemand: Math.max(1, cmc - 3),
        timing: isInstantSpeed ? 'INSTANT_SPEED' : 'SORCERY_SPEED',
        purpose: 'DISCOUNTED_EXECUTION',
        restrictions: [],
        earliestExecutableTurn: Math.max(1, cmc - 3)
      });
    }

    const hasEarlyInteractionAlternative = modes.some(m => m.modeId !== 'PRIMARY_CAST' && m.effectiveDemand <= 2);
    const minExecutableTurn = isXCost && !hasEarlyInteractionAlternative
      ? xEarliestExecutableTurn
      : Math.min(...modes.map(m => m.earliestExecutableTurn));

    const effectiveManaDemand = {
      primaryDemand: isXCost ? effectiveOperationalCmc : cmc,
      effectiveOperationalCmc,
      isXCost,
      earliestExecutableTurn: minExecutableTurn,
      hasEarlyInteractionAlternative,
      modes,
      latestUsefulTurn: isCreature && cmc <= 2 && !isXCost ? 6 : 10,
      earliestUsefulTurnByWinPath: (winPathNodes = []) => {
        if (hasEarlyInteractionAlternative) return minExecutableTurn;
        if (isXCost) return xEarliestExecutableTurn;
        if (isCreature && cmc >= 5) return Math.max(5, cmc);
        return minExecutableTurn;
      }
    };

    return {
      executionModes: modes,
      effectiveManaDemand
    };
  }
}

