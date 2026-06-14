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
  },

  ramp: {
    id: 'ramp',
    deckSize: 60,
    lands: { total: 25 },
    spells: {
      total: 35,
      distribution: {
        ramp_spells: { min: 10, max: 14 }, // Aceleradores (dorks, rocks, ramp lands)
        payoffs: { min: 6, max: 10 }, // Amenazas gigantes (CMC 5+)
        utility_interaction: { min: 8, max: 12 }, // Interacción y cantrips
        card_advantage: { min: 4, max: 8 } // Robo y motores
      },
      curve: {
        mv1: { min: 8, max: 12 },
        mv2: { min: 8, max: 12 },
        mv3: { min: 4, max: 8 },
        mv4_plus: { min: 8, max: 12 } // Alto número de costes altos
      }
    },
    ragModifiers: {
      boost: ['search your library for a land card', 'add', 'mana', 'put onto the battlefield', 'trample', 'vigilance', 'reach'],
      penalty: []
    }
  },
  
  storm: {
    id: 'storm',
    deckSize: 60,
    lands: { total: 17 },
    spells: {
      total: 43,
      distribution: {
        cost_reducers: { min: 4, max: 8 },
        rituals: { min: 8, max: 12 },
        cantrips_draw: { min: 12, max: 16 },
        storm_finishers: { min: 2, max: 4 },
        protection: { min: 2, max: 4 }
      },
      curve: {
        mv1: { min: 16, max: 22 },
        mv2: { min: 14, max: 18 },
        mv3: { min: 4, max: 8 },
        mv4_plus: { min: 0, max: 2 }
      }
    },
    ragModifiers: {
      boost: ['storm', 'add {r}', 'add {u}', 'ritual', 'draw a card', 'scry', 'cost', 'less to cast', 'untap'],
      penalty: ['defender', 'enters the battlefield tapped', 'graveyard']
    }
  }
};

export const getBlueprint = (archetypeId) => {
  if (!archetypeId) return BLUEPRINTS['midrange'];
  const idLower = archetypeId.toLowerCase();
  
  // Buscar coincidencia exacta primero
  if (BLUEPRINTS[idLower]) {
    return BLUEPRINTS[idLower];
  }
  
  // Heurísticas inteligentes para arquetipos dinámicos
  if (idLower.includes('storm') || idLower.includes('grapeshot') || idLower.includes('past in flames') || idLower.includes('ruby storm')) {
    return BLUEPRINTS['storm'];
  }
  if (idLower.includes('aggro') || idLower.includes('burn') || idLower.includes('affinity') || idLower.includes('prowess') || idLower.includes('scales') || idLower.includes('sligh')) {
    return BLUEPRINTS['aggro'];
  }
  if (idLower.includes('delver') || idLower.includes('shadow') || idLower.includes('tempo') || idLower.includes('merfolk') || idLower.includes('rogue')) {
    return BLUEPRINTS['tempo'];
  }
  if (idLower.includes('prison') || idLower.includes('stax')) {
    return BLUEPRINTS['prison'];
  }
  if (idLower.includes('control') || idLower.includes('miracles') || idLower.includes('taxes')) {
    return BLUEPRINTS['control'];
  }
  if (idLower.includes('combo') || idLower.includes('creativity') || idLower.includes('reanimator') || idLower.includes('titan') || idLower.includes('belcher')) {
    return BLUEPRINTS['combo'];
  }
  if (idLower.includes('ramp') || idLower.includes('tron') || idLower.includes('amulet') || idLower.includes('valakut')) {
    return BLUEPRINTS['ramp'];
  }
  
  return BLUEPRINTS['midrange']; // Midrange as safe fallback
};

export const FORMAT_CURVE_MODIFIERS = {
  LEGACY: {
    // Legacy: curvas extremadamente bajas, payoffs de 1-2 mana
    aggroCurveShift: -1,     // Baja la curva target de aggro en 1 CMC
    controlFinisherCap: 4,   // Los finishers de control no pasan de CMC 4
    midrangeTopEnd: 4,       // Midrange topa en 4 raramente llega a 5
    comboSpeedTarget: 2,     // Los combos se ejecutan en turno 2-3
    maxViableCMC: 5          // Nada por encima de CMC 5 es viable de forma consistente
  },
  MODERN: {
    aggroCurveShift: 0,      // Base (sin modificar)
    controlFinisherCap: 6,
    midrangeTopEnd: 5,
    comboSpeedTarget: 3,
    maxViableCMC: 7
  },
  PIONEER: {
    aggroCurveShift: 0,
    controlFinisherCap: 5,
    midrangeTopEnd: 5,
    comboSpeedTarget: 4,
    maxViableCMC: 7
  },
  STANDARD: {
    aggroCurveShift: 0,
    controlFinisherCap: 6,   // En Standard los finishers son más caros
    midrangeTopEnd: 6,
    comboSpeedTarget: 5,     // Los combos son más lentos en Standard
    maxViableCMC: 8          // Hay payoffs de CMC 7-8 que son jugables en Standard
  }
};

export const getFormatAdjustedBlueprint = (archetypeId, format = 'MODERN') => {
  const baseBlueprint = getBlueprint(archetypeId);
  const formatKey = (format || 'MODERN').toUpperCase();
  const modifier = FORMAT_CURVE_MODIFIERS[formatKey] || FORMAT_CURVE_MODIFIERS.MODERN;
  
  // Crear una copia profunda para no mutar el original
  const adjusted = JSON.parse(JSON.stringify(baseBlueprint));
  
  // Aplicar modificadores de curva
  if (adjusted.spells?.curve) {
    const curve = adjusted.spells.curve;
    
    // En Legacy, comprimir la curva hacia abajo
    if (modifier.aggroCurveShift < 0) {
      if (curve.mv1) {
        curve.mv1.min += 2;
        curve.mv1.max += 2;
      }
      if (curve.mv4_plus) {
        curve.mv4_plus.max = Math.min(curve.mv4_plus.max, 2);
      }
    }
    
    // En Standard, expandir el techo de CMC viable
    if (formatKey === 'STANDARD' && curve.mv4_plus) {
      curve.mv4_plus.max = Math.min(curve.mv4_plus.max + 2, 12);
    }
  }
  
  // Añadir metadatos del formato
  adjusted.formatModifier = modifier;
  adjusted.format = formatKey;
  
  return adjusted;
};
