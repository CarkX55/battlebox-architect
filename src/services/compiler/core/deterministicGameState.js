/**
 * src/services/compiler/core/deterministicGameState.js
 * 
 * MTG Deterministic Execution Subset Engine v28.1 (SUPPORTED_RULES_V1).
 * 
 * Implements a pure, deterministic game state model and action execution system.
 * Zero unseeded randomness; all state transitions are mathematical and deterministic.
 */

import { CardCausalContract } from './cardCausalContract.js';
import { extractCanonicalCmc } from './canonicalCardNormalizer.js';

export const SUPPORTED_RULES_V1 = Object.freeze([
  'DRAW',
  'PLAY_LAND',
  'GENERATE_MANA',
  'CAST_SPELL',
  'CREATURE_ENTRY',
  'TRIGGERED_ABILITIES_ETB_DEATH_ATTACK',
  'ATTACK_COMBAT_DAMAGE',
  'LIFE_CHANGES',
  'DESTROY_CREATURE',
  'EXILE_CARD',
  'SACRIFICE_PERMANENT',
  'IMPULSE_DRAW_EXILE_FLOW',
  'BASIC_TARGETING_ANY_CREATURE_PLAYER'
]);

export class DeterministicGameState {
  /**
   * Constructs a new GameState container.
   */
  constructor({
    library = [],
    hand = [],
    battlefield = [],
    graveyard = [],
    exile = [],
    manaPool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
    playerLife = 20,
    opponentLife = 20,
    turn = 1,
    phase = 'BEGINNING',
    landsPlayedThisTurn = 0,
    maxLandsPerTurn = 1,
    unsupportedMechanics = [],
    actionLog = []
  } = {}) {
    this.library = [...library];
    this.hand = [...hand];
    this.battlefield = [...battlefield];
    this.graveyard = [...graveyard];
    this.exile = [...exile];
    this.manaPool = { ...manaPool };
    this.playerLife = playerLife;
    this.opponentLife = opponentLife;
    this.turn = turn;
    this.phase = phase;
    this.landsPlayedThisTurn = landsPlayedThisTurn;
    this.maxLandsPerTurn = maxLandsPerTurn;
    this.unsupportedMechanics = [...unsupportedMechanics];
    this.actionLog = [...actionLog];
  }

  /**
   * Initializes a fresh game state from a list of deck cards.
   * Expands quantities into individual card instances.
   * @param {Array<Object>} deckCards 
   * @param {import('./prng.js').PRNG} prng 
   * @returns {DeterministicGameState}
   */
  static createInitialState(deckCards = [], prng = null) {
    const rawLibrary = [];
    let idCounter = 1;

    for (const entry of deckCards) {
      const cardObj = entry.card || entry;
      const count = Number(entry.quantity || entry.count || 1);
      for (let i = 0; i < count; i++) {
        const contract = CardCausalContract.parse(cardObj);
        rawLibrary.push({
          instanceId: `card_${idCounter++}`,
          name: cardObj.name || 'Unknown',
          card: cardObj,
          contract,
          typeLine: (cardObj.type_line || cardObj.type || '').toLowerCase(),
          cmc: extractCanonicalCmc(cardObj),
          manaCost: cardObj.mana_cost || cardObj.manaCost || '',
          colors: cardObj.colors || [],
          power: Number(cardObj.power || 0),
          toughness: Number(cardObj.toughness || 0),
          isLand: Boolean((cardObj.type_line || cardObj.type || '').toLowerCase().includes('land') || cardObj.role === 'Land')
        });
      }
    }

    const state = new DeterministicGameState({ library: rawLibrary });
    if (prng) {
      state.shuffleLibrary(prng);
    }
    return state;
  }

  /**
   * Shuffles the library deterministically using the provided PRNG.
   * @param {import('./prng.js').PRNG} prng 
   */
  shuffleLibrary(prng) {
    if (!prng) return;
    this.library = prng.shuffle(this.library);
  }

  /**
   * Draws cards from the library to the hand.
   * @param {number} count 
   * @returns {Array<Object>} Drawn cards
   */
  draw(count = 1) {
    const drawn = [];
    for (let i = 0; i < count; i++) {
      if (this.library.length > 0) {
        const card = this.library.shift();
        this.hand.push(card);
        drawn.push(card);
      }
    }
    return drawn;
  }

  /**
   * Evaluates and executes competitive mulligan logic.
   * @param {import('./prng.js').PRNG} prng 
   * @param {number} targetHandSize 
   * @returns {boolean} Whether a mulligan was taken
   */
  executeMulligan(prng, targetHandSize = 7) {
    let handLands = this.hand.filter(c => c.isLand).length;
    const isBadHand = handLands === 0 || handLands >= 6 || (handLands === 1 && !this.hand.some(c => c.cmc === 1 && !c.isLand));
    if (isBadHand && targetHandSize > 4) {
      this.library.push(...this.hand);
      this.hand = [];
      this.shuffleLibrary(prng);
      this.draw(targetHandSize - 1);
      return true;
    }
    return false;
  }

  /**
   * Plays a land card from hand onto the battlefield.
   * @param {number|string} cardIndexOrName 
   * @returns {boolean} Success
   */
  playLand(cardIndexOrName) {
    if (this.landsPlayedThisTurn >= this.maxLandsPerTurn) return false;

    let index = -1;
    if (typeof cardIndexOrName === 'number') {
      index = cardIndexOrName;
    } else {
      index = this.hand.findIndex(c => c.name.toLowerCase() === cardIndexOrName.toLowerCase() && c.isLand);
    }

    if (index === -1 || !this.hand[index] || !this.hand[index].isLand) {
      return false;
    }

    const landCard = this.hand.splice(index, 1)[0];
    const nameLower = landCard.name.toLowerCase();

    const produces = [];
    if (nameLower.includes('mountain')) produces.push('R');
    if (nameLower.includes('swamp')) produces.push('B');
    if (nameLower.includes('forest')) produces.push('G');
    if (nameLower.includes('island')) produces.push('U');
    if (nameLower.includes('plains')) produces.push('W');
    if (nameLower.includes('crypt') || nameLower.includes('theater') || nameLower.includes('cliffs')) {
      produces.push('B', 'R');
    }
    if (produces.length === 0) produces.push('C');

    const permanent = {
      instanceId: landCard.instanceId,
      name: landCard.name,
      card: landCard.card,
      typeLine: landCard.typeLine,
      isLand: true,
      isCreature: false,
      isTapped: false,
      produces: [...new Set(produces)],
      turnEntered: this.turn
    };

    this.battlefield.push(permanent);
    this.landsPlayedThisTurn += 1;

    this.actionLog.push({
      turn: this.turn,
      phase: this.phase,
      action: 'PLAY_LAND',
      card: landCard.name
    });

    return true;
  }

  /**
   * Untaps all permanents and resets turn-based allowances.
   */
  startNewTurn() {
    this.turn += 1;
    this.phase = 'BEGINNING';
    this.landsPlayedThisTurn = 0;

    for (const p of this.battlefield) {
      p.isTapped = false;
      if (p.isCreature) {
        p.hasSummoningSickness = false;
      }
    }

    this.manaPool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    this.phase = 'MAIN_1';
    this.draw(1);
  }

  /**
   * Computes available untapped mana potential from battlefield.
   * @returns {{ totalAvailable: number, colorCoverage: Object }}
   */
  getAvailableMana() {
    const untappedLands = this.battlefield.filter(p => p.isLand && !p.isTapped);
    const untappedDorks = this.battlefield.filter(p => p.isCreature && !p.isTapped && !p.hasSummoningSickness && p.producesMana);
    const totalSources = untappedLands.length + untappedDorks.length;

    const colorCoverage = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    for (const p of [...untappedLands, ...untappedDorks]) {
      const produces = p.produces || ['C'];
      for (const color of produces) {
        colorCoverage[color] = (colorCoverage[color] || 0) + 1;
      }
    }

    return {
      totalAvailable: totalSources,
      colorCoverage
    };
  }

  /**
   * Checks if a card from hand is castable with current available mana.
   * @param {Object} card 
   * @returns {boolean}
   */
  canCast(card) {
    if (!card || card.isLand) return false;
    const mana = this.getAvailableMana();
    if (mana.totalAvailable < card.cmc) return false;

    const cost = card.manaCost || '';
    const pips = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    if (cost.includes('{W}')) pips.W = (cost.match(/\{W\}/g) || []).length;
    if (cost.includes('{U}')) pips.U = (cost.match(/\{U\}/g) || []).length;
    if (cost.includes('{B}')) pips.B = (cost.match(/\{B\}/g) || []).length;
    if (cost.includes('{R}')) pips.R = (cost.match(/\{R\}/g) || []).length;
    if (cost.includes('{G}')) pips.G = (cost.match(/\{G\}/g) || []).length;

    for (const [color, requiredCount] of Object.entries(pips)) {
      if (requiredCount > 0 && (mana.colorCoverage[color] || 0) < requiredCount) {
        return false;
      }
    }
    return true;
  }

  /**
   * Casts a spell from hand onto battlefield or graveyard, tapping necessary mana sources.
   * @param {number} handIndex 
   * @param {Object} options 
   * @returns {boolean} Success
   */
  castSpell(handIndex, options = {}) {
    if (handIndex < 0 || handIndex >= this.hand.length) return false;
    const card = this.hand[handIndex];
    if (!this.canCast(card)) return false;

    let manaToPay = card.cmc;
    const untappedPerms = this.battlefield.filter(p => (p.isLand || (p.isCreature && p.producesMana && !p.hasSummoningSickness)) && !p.isTapped);
    
    for (const p of untappedPerms) {
      if (manaToPay <= 0) break;
      p.isTapped = true;
      manaToPay -= 1;
    }

    this.hand.splice(handIndex, 1);

    const isCreature = card.typeLine.includes('creature');
    const isInstantOrSorcery = card.typeLine.includes('instant') || card.typeLine.includes('sorcery');
    const isEnchantment = card.typeLine.includes('enchantment');
    const oracle = (card.card.oracle_text || card.card.oracleText || '').toLowerCase();

    if (isCreature) {
      const hasHaste = oracle.includes('haste');
      const isManaDork = oracle.includes('add {') || oracle.includes('adds {') || oracle.includes('{t}: add');

      const perm = {
        instanceId: card.instanceId,
        name: card.name,
        card: card.card,
        typeLine: card.typeLine,
        isLand: false,
        isCreature: true,
        isTapped: false,
        hasSummoningSickness: !hasHaste,
        hasHaste,
        power: card.power,
        toughness: card.toughness,
        producesMana: isManaDork,
        produces: isManaDork ? (card.colors.length > 0 ? card.colors : ['G']) : [],
        turnEntered: this.turn
      };

      this.battlefield.push(perm);

      this.actionLog.push({
        turn: this.turn,
        phase: this.phase,
        action: 'CAST_CREATURE',
        card: card.name,
        power: perm.power,
        hasHaste
      });

      if (oracle.includes('deals 2 damage to target player') || oracle.includes('deals 2 damage to any target') || oracle.includes('deals 2 damage')) {
        this.dealDamageToOpponent(2, card.name);
      }
    } else if (isInstantOrSorcery) {
      this.graveyard.push(card);

      if (oracle.includes('deals 3 damage')) {
        this.dealDamageToOpponent(3, card.name);
      } else if (oracle.includes('deals 2 damage')) {
        this.dealDamageToOpponent(2, card.name);
      } else if (oracle.includes('deals 4 damage') || oracle.includes('deals 5 damage')) {
        this.dealDamageToOpponent(4, card.name);
      }

      if (oracle.includes('exile the top two') || oracle.includes('draw two cards')) {
        this.draw(2);
      } else if (oracle.includes('draw a card') || oracle.includes('draws a card') || oracle.includes('exile the top card')) {
        this.draw(1);
      }

      this.actionLog.push({
        turn: this.turn,
        phase: this.phase,
        action: 'CAST_SPELL',
        card: card.name
      });
    } else if (isEnchantment) {
      this.battlefield.push({
        instanceId: card.instanceId,
        name: card.name,
        card: card.card,
        typeLine: card.typeLine,
        isLand: false,
        isCreature: false,
        isTapped: false,
        turnEntered: this.turn
      });
      if (oracle.includes('deals 1 damage')) {
        this.dealDamageToOpponent(1, card.name);
      }
    }

    return true;
  }

  /**
   * Destroys a permanent on battlefield and triggers death flow payoffs.
   * @param {number} permanentIndex 
   */
  destroyPermanent(permanentIndex) {
    if (permanentIndex < 0 || permanentIndex >= this.battlefield.length) return null;
    const destroyed = this.battlefield.splice(permanentIndex, 1)[0];
    this.graveyard.push(destroyed);

    // Check for Hordemaster / Death triggers
    const oText = (destroyed.card?.oracle_text || destroyed.card?.oracleText || '').toLowerCase();
    if (oText.includes('dies, exile') || oText.includes('dies, you may play')) {
      this.draw(1); // impulse access flow
    }
    return destroyed;
  }

  /**
   * Executes combat attack phase: attacks with all eligible creatures.
   * @returns {{ attackersCount: number, totalDamageDealt: number }}
   */
  executeCombatPhase(opponentBlockers = null) {
    this.phase = 'COMBAT';
    const attackers = this.battlefield.filter(p => p.isCreature && !p.isTapped && (!p.hasSummoningSickness || p.hasHaste) && p.power > 0);
    
    let globalPowerBonus = 0;
    for (const p of this.battlefield) {
      const oText = (p.card?.oracle_text || p.card?.oracleText || '').toLowerCase();
      if (oText.includes('other ') && oText.includes('you control get +1/+1')) {
        globalPowerBonus += 1;
      }
      if (oText.includes('battle cry')) {
        globalPowerBonus += 1;
      }
    }

    // Default tactical opponent blocker model:
    // Turn 1: 0 blockers
    // Turn 2: 1 ground blocker (1/2)
    // Turn 3: 1 ground blocker (2/2)
    // Turn 4+: 1 ground blocker (2/3)
    let blockers = Array.isArray(opponentBlockers) ? [...opponentBlockers] : [];
    if (opponentBlockers === null) {
      if (this.turn === 2) {
        blockers = [{ power: 1, toughness: 2, hasFlying: false, id: 'blocker_t2' }];
      } else if (this.turn === 3) {
        blockers = [{ power: 2, toughness: 2, hasFlying: false, id: 'blocker_t3' }];
      } else if (this.turn >= 4) {
        blockers = [{ power: 2, toughness: 3, hasFlying: false, id: 'blocker_t4' }];
      }
    }

    let totalDamage = 0;
    let blockedCount = 0;

    for (const attacker of attackers) {
      attacker.isTapped = true;
      const effectivePower = attacker.power + globalPowerBonus;
      const oText = (attacker.card?.oracle_text || attacker.card?.oracleText || '').toLowerCase();
      const hasFlying = oText.includes('flying');
      const hasTrample = oText.includes('trample');
      const isUnblockable = oText.includes("can't be blocked");

      // Check if eligible blocker exists
      const blockerIdx = blockers.findIndex(b => {
        if (isUnblockable) return false;
        if (hasFlying && !b.hasFlying && !b.hasReach) return false;
        return true;
      });

      if (blockerIdx !== -1) {
        // Blocked by opponent creature
        blockedCount++;
        const blocker = blockers.splice(blockerIdx, 1)[0];
        if (hasTrample) {
          // Trample pushes excess damage through
          const excess = Math.max(0, effectivePower - blocker.toughness);
          totalDamage += excess;
        }
      } else {
        // Unblocked
        totalDamage += effectivePower;
      }
    }

    if (totalDamage > 0) {
      this.dealDamageToOpponent(totalDamage, 'COMBAT_ATTACK');
    }

    this.actionLog.push({
      turn: this.turn,
      phase: 'COMBAT',
      action: 'ATTACK',
      attackersCount: attackers.length,
      blockedCount,
      damageDealt: totalDamage,
      opponentLifeRemaining: this.opponentLife
    });

    return {
      attackersCount: attackers.length,
      blockedCount,
      totalDamageDealt: totalDamage
    };
  }

  /**
   * Deals direct or combat damage to opponent.
   * @param {number} amount 
   * @param {string} sourceName 
   */
  dealDamageToOpponent(amount, sourceName = 'UNKNOWN') {
    this.opponentLife = Math.max(0, this.opponentLife - amount);
  }

  /**
   * Executes an adversarial board sweeper (Wrath) on current turn, wiping creatures.
   * @param {string} reason 
   * @returns {{ wipedCount: number }}
   */
  executeAdversarialSweeper(reason = 'ADVERSARIAL_WRATH') {
    const creatures = this.battlefield.filter(p => p.isCreature);
    this.battlefield = this.battlefield.filter(p => !p.isCreature);

    for (const c of creatures) {
      this.graveyard.push(c);
      const oText = (c.card?.oracle_text || c.card?.oracleText || '').toLowerCase();
      if (oText.includes('dies, exile') || oText.includes('dies, you may play')) {
        this.draw(1);
      }
    }

    this.actionLog.push({
      turn: this.turn,
      phase: this.phase,
      action: 'ADVERSARIAL_SWEEPER',
      wipedCreaturesCount: creatures.length,
      reason
    });

    return { wipedCount: creatures.length };
  }

  /**
   * Checks if victory condition (lethal) has been achieved.
   * @returns {boolean}
   */
  isLethal() {
    return this.opponentLife <= 0;
  }

  /**
   * Creates an exact deep clone of the game state for counterfactual branching.
   * @returns {DeterministicGameState}
   */
  clone() {
    return new DeterministicGameState({
      library: this.library.map(c => ({ ...c })),
      hand: this.hand.map(c => ({ ...c })),
      battlefield: this.battlefield.map(p => ({ ...p })),
      graveyard: this.graveyard.map(c => ({ ...c })),
      exile: this.exile.map(c => ({ ...c })),
      manaPool: { ...this.manaPool },
      playerLife: this.playerLife,
      opponentLife: this.opponentLife,
      turn: this.turn,
      phase: this.phase,
      landsPlayedThisTurn: this.landsPlayedThisTurn,
      maxLandsPerTurn: this.maxLandsPerTurn,
      unsupportedMechanics: [...this.unsupportedMechanics],
      actionLog: [...this.actionLog]
    });
  }
}
