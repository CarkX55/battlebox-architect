/**
 * CompetitiveEncyclopedia.js
 * Competitive Engine & Card Knowledge Encyclopedia.
 * Encapsulates expert domain insights beyond Oracle text:
 * Strengths, Weaknesses, Meta Vulnerabilities, Synergy Enablers, Bad Matchups, and Sideboard Strategies.
 */

export const ENGINE_ENCYCLOPEDIA = Object.freeze({
  YAWGMOTH: {
    id: 'eng_yawgmoth',
    name: 'Yawgmoth Undying Combo Engine',
    strengths: ['Infinite Life Drain', 'Card Draw Machine', 'Board Control'],
    weaknesses: ['Graveyard Hate (Leyline of the Void / Rest in Peace)', 'Fast Combo'],
    keySynergies: ['Young Wolf', 'Strangleroot Geist', 'Blood Artist']
  },
  AMULET_TITAN: {
    id: 'eng_amulet_titan',
    name: 'Amulet Titan Primeval Ramp Engine',
    strengths: ['Turn 2 Primeval Titan Haste Lethal', 'Toolbox Lands'],
    weaknesses: ['Blood Moon', 'Disenchant effects on Amulet of Vigor'],
    keySynergies: ['Amulet of Vigor', 'Primeval Titan', 'Summoner\'s Pact']
  },
  MURKTIDE: {
    id: 'eng_murktide',
    name: 'Izzet Murktide Tempo Engine',
    strengths: ['Efficient Countermagic', 'Huge 2-drop Threat', 'Cantrip Consistency'],
    weaknesses: ['Graveyard Hate', 'Solitude / Exile Removal'],
    keySynergies: ['Dragon\'s Rage Channeler', 'Expressive Iteration', 'Counterspell']
  }
});

export const CARD_ENCYCLOPEDIA = Object.freeze({
  'Llanowar Elves': {
    cardName: 'Llanowar Elves',
    expertInsight: 'Enables T2 3-CMC explosive curves. Terrible topdeck late game. Vulnerable to Orcish Bowmasters & Fatal Push. Synergizes with Nykthos devotion.'
  },
  'Collected Company': {
    cardName: 'Collected Company',
    expertInsight: 'Requires 28+ creatures of CMC <= 3 with immediate ETB or Flash impact. Value collapses if hit creatures lack card advantage or tempo generation.'
  }
});

export class CompetitiveEncyclopedia {
  static getEngineInsight(engineId) {
    return ENGINE_ENCYCLOPEDIA[engineId] || null;
  }

  static getCardInsight(cardName) {
    return CARD_ENCYCLOPEDIA[cardName] || {
      cardName,
      expertInsight: 'Standard competitive card asset.'
    };
  }
}
