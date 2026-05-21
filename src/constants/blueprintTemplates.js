// src/constants/blueprintTemplates.js

/**
 * Plantillas Arquitectónicas ("Blueprints") para el BattleBox.
 * Estas plantillas definen la estructura matemática INAMOVIBLE de un mazo de 60 cartas.
 * El motor RAG utilizará estas proporciones para rellenar los huecos.
 */

export const BLUEPRINTS = {
  aggro: {
    id: 'aggro',
    deckSize: 60,
    lands: {
      total: 22, // Fijo, Karsten lo rellenará.
    },
    spells: {
      total: 38,
      distribution: {
        creatures: { min: 20, max: 28 },
        removal_burn: { min: 8, max: 12 },
        card_advantage: { min: 0, max: 4 }
      },
      curve: { // Mana Value (CMC) target distribution
        mv1: { min: 10, max: 14 },
        mv2: { min: 12, max: 16 },
        mv3: { min: 6, max: 10 },
        mv4_plus: { min: 0, max: 4 }
      }
    },
    ragModifiers: {
      boost: ['haste', 'trample', 'deals damage to target', 'prowess'],
      penalty: ['defender', 'enters the battlefield tapped']
    }
  },
  
  tempo: {
    id: 'tempo',
    deckSize: 60,
    lands: { total: 20 },
    spells: {
      total: 40,
      distribution: {
        creatures: { min: 10, max: 14 }, // Pocas criaturas, muy eficientes
        interaction: { min: 14, max: 18 }, // Counters, bounce, removal barato
        card_advantage: { min: 8, max: 12 } // Cantrips (Brainstorm, Ponder)
      },
      curve: {
        mv1: { min: 14, max: 18 },
        mv2: { min: 12, max: 16 },
        mv3: { min: 4, max: 8 },
        mv4_plus: { min: 0, max: 2 }
      }
    },
    ragModifiers: {
      boost: ['flash', 'flying', 'counter target spell', 'return target', 'draw a card'],
      penalty: ['mana pool', 'cost']
    }
  },

  midrange: {
    id: 'midrange',
    deckSize: 60,
    lands: { total: 24 },
    spells: {
      total: 36,
      distribution: {
        creatures: { min: 14, max: 18 },
        removal: { min: 8, max: 12 },
        card_advantage: { min: 6, max: 10 } // Planeswalkers, 2-por-1
      },
      curve: {
        mv1: { min: 6, max: 10 },
        mv2: { min: 10, max: 14 },
        mv3: { min: 8, max: 12 },
        mv4_plus: { min: 4, max: 8 }
      }
    },
    ragModifiers: {
      boost: ['destroy target', 'exile target', 'draw a card', 'deathtouch', 'lifelink'],
      penalty: []
    }
  },

  combo: {
    id: 'combo',
    deckSize: 60,
    lands: { total: 22 },
    spells: {
      total: 38,
      distribution: {
        combo_pieces_and_ramp: { min: 16, max: 20 },
        card_advantage_tutors: { min: 10, max: 14 },
        protection_interaction: { min: 6, max: 10 }
      },
      curve: {
        mv1: { min: 10, max: 14 },
        mv2: { min: 10, max: 14 },
        mv3: { min: 6, max: 10 },
        mv4_plus: { min: 6, max: 10 } // Para los finalizadores
      }
    },
    ragModifiers: {
      boost: ['search your library', 'add', 'draw', 'win the game', 'hexproof'],
      penalty: []
    }
  },

  control: {
    id: 'control',
    deckSize: 60,
    lands: { total: 26 },
    spells: {
      total: 34,
      distribution: {
        finishers: { min: 2, max: 6 }, // Criaturas masivas o Planeswalkers
        mass_removal: { min: 3, max: 6 }, // Limpiamesas (Wrath of God)
        spot_removal_counters: { min: 14, max: 18 },
        card_advantage: { min: 8, max: 12 }
      },
      curve: {
        mv1: { min: 6, max: 10 },
        mv2: { min: 10, max: 14 },
        mv3: { min: 6, max: 10 },
        mv4_plus: { min: 6, max: 10 }
      }
    },
    ragModifiers: {
      boost: ['destroy all', 'counter target', 'draw two', 'planeswalker', 'hexproof'],
      penalty: ['haste']
    }
  },

  prison: {
    id: 'prison',
    deckSize: 60,
    lands: { total: 25 },
    spells: {
      total: 35,
      distribution: {
        stax_pieces: { min: 12, max: 16 }, // Taxing, lock pieces
        removal: { min: 8, max: 12 },
        finishers: { min: 4, max: 8 }
      },
      curve: {
        mv1: { min: 4, max: 8 },
        mv2: { min: 10, max: 14 },
        mv3: { min: 10, max: 14 },
        mv4_plus: { min: 6, max: 10 }
      }
    },
    ragModifiers: {
      boost: ['costs more', 'can\'t attack', 'can\'t cast', 'tax', 'artifact', 'enchantment'],
      penalty: ['haste', 'trample']
    }
  }
};

export const getBlueprint = (archetypeId) => {
  return BLUEPRINTS[archetypeId] || BLUEPRINTS['midrange']; // Midrange as safe fallback
};
