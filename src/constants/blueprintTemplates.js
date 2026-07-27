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
      boost: ['opponents control', "opponents can't", "can't attack you", "more to cast", "tax", "chalice of the void", "ensnaring bridge", "blood moon", "damping sphere", "pithing needle", "rest in peace", "grafdigger's cage"],
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
  },
  
  discard_rack: {
    id: 'discard_rack',
    deckSize: 60,
    lands: { total: 24 },
    spells: {
      total: 36,
      distribution: {
        discard_spells: { min: 10, max: 14 },
        payoffs: { min: 6, max: 10 },
        removal_interaction: { min: 8, max: 12 },
        card_advantage: { min: 4, max: 8 }
      },
      curve: {
        mv1: { min: 12, max: 16 },
        mv2: { min: 10, max: 14 },
        mv3: { min: 4, max: 8 },
        mv4_plus: { min: 0, max: 4 }
      }
    },
    ragModifiers: {
      boost: ['discard', 'opponent discards', 'the rack', 'shrieking affliction', 'waste not', 'liliana', 'rack'],
      penalty: ['haste', 'trample']
    }
  },

  dredge: {
    id: 'dredge',
    deckSize: 60,
    lands: { total: 19 },
    spells: {
      total: 41,
      distribution: {
        dredgers: { min: 10, max: 14 },
        enablers_draw: { min: 12, max: 16 },
        payoffs: { min: 8, max: 12 },
        interaction: { min: 4, max: 8 }
      },
      curve: {
        mv1: { min: 12, max: 16 },
        mv2: { min: 12, max: 16 },
        mv3: { min: 6, max: 10 },
        mv4_plus: { min: 2, max: 6 }
      }
    },
    ragModifiers: {
      boost: ['dredge', 'put', 'graveyard', 'from your library', 'prized amalgam', 'creature card from your graveyard', 'discard'],
      penalty: ['counter target', 'destroy target planeswalker']
    }
  },

  tribal_aggro: {
    id: 'tribal_aggro',
    deckSize: 60,
    lands: { total: 20 },
    spells: {
      total: 40,
      distribution: {
        lords_and_anthems: { min: 8, max: 12 },
        tribal_core: { min: 16, max: 22 },
        interaction: { min: 4, max: 8 },
        card_advantage: { min: 2, max: 4 }
      },
      curve: {
        mv1: { min: 8, max: 14 },
        mv2: { min: 14, max: 18 },
        mv3: { min: 8, max: 12 },
        mv4_plus: { min: 0, max: 4 }
      }
    },
    ragModifiers: {
      boost: ['lord', 'each other', 'other', 'whenever', 'all', '+1/+1', 'islandwalk', 'merfolk', 'goblin', 'elf', 'sliver', 'knight', 'zombie', 'vampire', 'wizard'],
      penalty: ['defender', 'enters the battlefield tapped', 'sacrifice']
    }
  }
};

export const getBlueprint = (archetypeId, hasTribe = false) => {
  if (hasTribe) {
    const idLower = (archetypeId || '').toLowerCase();
    const isSpecialArchetype = ['control', 'combo', 'prison', 'storm', 'cascade', 'reanimator'].includes(idLower);
    if (!isSpecialArchetype) {
      return BLUEPRINTS['tribal_aggro'];
    }
  }

  if (!archetypeId) return BLUEPRINTS['midrange'];
  const idLower = archetypeId.toLowerCase();
  
  // Buscar coincidencia exacta primero
  if (BLUEPRINTS[idLower]) {
    return BLUEPRINTS[idLower];
  }
  
  // Heurísticas inteligentes para arquetipos dinámicos
  if (idLower.includes('discard') || idLower.includes('rack') || idLower.includes('8-rack')) {
    return BLUEPRINTS['discard_rack'];
  }
  if (idLower.includes('dredge') || idLower.includes('self-mill') || idLower.includes('dredging')) {
    return BLUEPRINTS['dredge'];
  }
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

export const getFormatAdjustedBlueprint = (archetypeId, format = 'MODERN', hasTribe = false) => {
  const baseBlueprint = getBlueprint(archetypeId, hasTribe);
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

// 🏛️ LA ARQUITECTURA DE DOS CAPAS (Macro + Micro)

// CAPA 1: ARQUETIPOS MADRE (Fija Tierras, Curva y Contenedores Macro)
export const ARCHETYPE_BASE = {
  aggro: {
    id: 'aggro',
    label: 'Aggro',
    landCount: 22,
    totalSpells: 38,
    curveProfile: 'low',
    roles: {
      one_drop_beaters: 12,
      two_drop_synergies: 12,
      reach_and_burn: 8,
      finisher_top_end: 4,
      utility_or_tricks: 2
    }
  },
  tempo: {
    id: 'tempo',
    label: 'Tempo',
    landCount: 20,
    totalSpells: 40,
    curveProfile: 'low_interaction',
    roles: {
      evasive_cheap_threats: 12,
      cantrips_and_scry: 12,
      bounce_and_soft_removal: 10,
      protection_counterspells: 6
    }
  },
  midrange: {
    id: 'midrange',
    label: 'Midrange',
    landCount: 24,
    totalSpells: 36,
    curveProfile: 'balanced',
    roles: {
      early_value_creatures: 12,
      threats_cmc3_4: 8,
      versatile_removal: 8,
      card_advantage_engines: 8
    }
  },
  control: {
    id: 'control',
    label: 'Control',
    landCount: 26,
    totalSpells: 34,
    curveProfile: 'high_control',
    roles: {
      cheap_spot_removal: 8,
      board_sweepers: 4,
      counterspells: 10,
      card_draw_engines: 8,
      finisher_win_condition: 4
    }
  },
  ramp: {
    id: 'ramp',
    label: 'Ramp',
    landCount: 24,
    totalSpells: 36,
    curveProfile: 'ramp_escalation',
    roles: {
      early_mana_dorks: 6,
      land_ramp_spells: 6,
      massive_finishers_cmc5plus: 8,
      card_advantage_draw: 8,
      protection_and_interaction: 8
    }
  },
  combo: {
    id: 'combo',
    label: 'Combo',
    landCount: 22,
    totalSpells: 38,
    curveProfile: 'combo_assembly',
    roles: {
      combo_pieces: 12,
      tutors_and_enablers: 10,
      protection_spells: 8,
      fast_mana_or_cantrips: 8
    }
  },
  prison: {
    id: 'prison',
    label: 'Taxes & Lock',
    landCount: 25,
    totalSpells: 35,
    curveProfile: 'stax_tax',
    roles: {
      tax_lock_pieces: 12,
      threat_creatures: 8,
      utility_artifacts: 5,
      removal_and_disruption: 6,
      finishers: 4
    }
  }
};

// CAPA 2: MODIFICADORES ESTRATÉGICOS (Mecánicas Micro que "secuestran" o inyectan contenedores)
export const STRATEGY_MODIFIERS = {
  aristocrats: {
    id: 'aristocrats',
    label: 'Aristócratas / Sacrificio',
    override: {
      one_drop_beaters: { name: 'sac_fodder_creatures', quantity: 12 },
      early_value_creatures: { name: 'sac_fodder_creatures', quantity: 12 },
      reach_and_burn: { name: 'drain_payoffs', quantity: 8 },
      versatile_removal: { name: 'free_sac_outlets', quantity: 6 },
      utility_or_tricks: { name: 'recursion_and_value', quantity: 4 }
    }
  },
  reanimator: {
    id: 'reanimator',
    label: 'Reanimador / Graveyard',
    override: {
      massive_finishers_cmc5plus: { name: 'reanimation_targets_cmc7plus', quantity: 8 },
      finisher_win_condition: { name: 'reanimation_targets_cmc7plus', quantity: 6 },
      early_value_creatures: { name: 'entomb_discard_enablers', quantity: 10 },
      early_mana_dorks: { name: 'entomb_discard_enablers', quantity: 6 },
      card_advantage_engines: { name: 'reanimation_spells', quantity: 8 },
      card_draw_engines: { name: 'reanimation_spells', quantity: 8 }
    }
  },
  spellslinger: {
    id: 'spellslinger',
    label: 'Spellslinger / Prowess',
    override: {
      one_drop_beaters: { name: 'spellslinger_payoffs', quantity: 8 },
      evasive_cheap_threats: { name: 'spellslinger_payoffs', quantity: 8 },
      reach_and_burn: { name: 'cheap_cantrips_and_rituals', quantity: 12 },
      bounce_and_soft_removal: { name: 'cheap_cantrips_and_rituals', quantity: 10 }
    }
  },
  tokens: {
    id: 'tokens',
    label: 'Tokens / Enjambre',
    override: {
      early_value_creatures: { name: 'token_generators_cheap', quantity: 12 },
      two_drop_synergies: { name: 'token_generators_cheap', quantity: 12 },
      card_advantage_engines: { name: 'anthem_buffs_and_lords', quantity: 8 },
      finisher_top_end: { name: 'board_wide_finishers', quantity: 4 }
    }
  },
  blink: {
    id: 'blink',
    label: 'Blink / Flicker ETB',
    override: {
      early_value_creatures: { name: 'etb_value_creatures', quantity: 12 },
      threats_cmc3_4: { name: 'etb_threats_and_disruption', quantity: 8 },
      versatile_removal: { name: 'flicker_and_blink_spells', quantity: 8 }
    }
  },
  landfall: {
    id: 'landfall',
    label: 'Landfall / Tierras',
    override: {
      land_ramp_spells: { name: 'landfall_ramp_enablers', quantity: 8 },
      massive_finishers_cmc5plus: { name: 'landfall_payoffs_and_finishers', quantity: 8 }
    }
  },
  voltron: {
    id: 'voltron',
    label: 'Voltron / Auras & Equipos',
    override: {
      two_drop_synergies: { name: 'equipment_and_aura_payloads', quantity: 12 },
      reach_and_burn: { name: 'voltron_enablers_and_tutors', quantity: 8 }
    }
  },
  storm: {
    id: 'storm',
    label: 'Storm / Tormenta',
    override: {
      combo_pieces: { name: 'mana_rituals_and_reducers', quantity: 14 },
      tutors_and_enablers: { name: 'storm_finishers', quantity: 4 }
    }
  },
  cascade: {
    id: 'cascade',
    label: 'Cascade / Cascada',
    override: {
      combo_pieces: { name: 'cascade_enablers_cmc3', quantity: 8 },
      fast_mana_or_cantrips: { name: 'zero_cost_cascade_payoffs', quantity: 8 }
    }
  },
  affinity: {
    id: 'affinity',
    label: 'Affinity / Metalcraft',
    override: {
      one_drop_beaters: { name: 'artifact_enablers_cmc0_1', quantity: 12 },
      two_drop_synergies: { name: 'affinity_payoffs_and_lords', quantity: 10 }
    }
  },
  ninjutsu: {
    id: 'ninjutsu',
    label: 'Ninjutsu / Infiltración',
    override: {
      evasive_cheap_threats: { name: 'evasive_unblockable_enablers', quantity: 10 },
      cantrips_and_scry: { name: 'ninja_payloads_and_draw', quantity: 10 },
      bounce_and_soft_removal: { name: 'tempo_removal_and_disruption', quantity: 8 }
    }
  },
  defender: {
    id: 'defender',
    label: 'Defensores / Ataque de Resistencia',
    override: {
      tax_lock_pieces: { name: 'defender_walls_high_toughness', quantity: 12 },
      threat_creatures: { name: 'toughness_combat_enablers', quantity: 6 },
      utility_artifacts: { name: 'mana_walls_and_ramp', quantity: 6 }
    }
  },
  eldrazi_tron: {
    id: 'eldrazi_tron',
    label: 'Eldrazi Tron / Incoloro',
    override: {
      early_mana_dorks: { name: 'colorless_sol_lands_and_map', quantity: 8 },
      massive_finishers_cmc5plus: { name: 'eldrazi_titans_and_smashers', quantity: 10 },
      protection_and_interaction: { name: 'stax_trinkets_and_chalice', quantity: 6 }
    }
  },
  discard_rack: {
    id: 'discard_rack',
    label: 'Discard & Rack / Desgaste',
    override: {
      early_value_creatures: { name: 'targeted_discard_spells', quantity: 12 },
      threats_cmc3_4: { name: 'rack_and_affliction_payoffs', quantity: 8 },
      versatile_removal: { name: 'cheap_removal_and_liliana', quantity: 8 }
    }
  },
  dredge: {
    id: 'dredge',
    label: 'Dredge / Cementerio',
    override: {
      early_value_creatures: { name: 'dredgers_and_mill_enablers', quantity: 12 },
      threats_cmc3_4: { name: 'graveyard_recursion_payoffs', quantity: 10 },
      card_advantage_engines: { name: 'draw_discard_catalysts', quantity: 8 }
    }
  },
  slivers: {
    id: 'slivers',
    label: 'Slivers / Fectidios',
    override: {
      one_drop_beaters: { name: 'cheap_mana_and_evasion_slivers', quantity: 10 },
      two_drop_synergies: { name: 'sliver_lords_and_buffs', quantity: 12 },
      reach_and_burn: { name: 'removal_and_utility_slivers', quantity: 6 }
    }
  },
  enrage: {
    id: 'enrage',
    label: 'Enrage / Furia Jurásica',
    override: {
      early_mana_dorks: { name: 'dinosaur_cost_reducers', quantity: 6 },
      massive_finishers_cmc5plus: { name: 'apex_dinosaurs_and_enrage', quantity: 10 },
      protection_and_interaction: { name: 'self_damage_enablers', quantity: 6 }
    }
  }
};

/**
 * Compone un Blueprint de Dos Capas (Macro-Arquetipo Base + Modificador Estratégico Micro).
 */
export function composeTwoLayerBlueprint(archetypeKey, strategyKey, formData = {}) {
  const archKey = (archetypeKey || 'midrange').toLowerCase();
  const stratKey = (strategyKey || '').toLowerCase();

  const baseArch = ARCHETYPE_BASE[archKey] || ARCHETYPE_BASE.midrange;
  const baseRoles = { ...baseArch.roles };
  let totalSpells = baseArch.totalSpells || 36;

  const modifier = STRATEGY_MODIFIERS[stratKey];
  if (modifier && modifier.override) {
    Object.entries(modifier.override).forEach(([targetRoleKey, newRoleConfig]) => {
      if (baseRoles[targetRoleKey] !== undefined) {
        delete baseRoles[targetRoleKey];
        baseRoles[newRoleConfig.name] = newRoleConfig.quantity;
      } else {
        baseRoles[newRoleConfig.name] = newRoleConfig.quantity;
      }
    });
  }

  // Normalización proporcional para garantizar que la suma total sea exactamente totalSpells
  let currentSum = Object.values(baseRoles).reduce((a, b) => a + Number(b), 0);
  if (currentSum !== totalSpells) {
    const factor = totalSpells / currentSum;
    let normalizedSum = 0;
    const keys = Object.keys(baseRoles);
    keys.forEach((k, idx) => {
      if (idx === keys.length - 1) {
        baseRoles[k] = Math.max(1, totalSpells - normalizedSum);
      } else {
        baseRoles[k] = Math.max(1, Math.round(baseRoles[k] * factor));
        normalizedSum += baseRoles[k];
      }
    });
  }

  return {
    archetype: baseArch.id,
    strategy: stratKey,
    totalSpells,
    landCount: baseArch.landCount,
    roles: baseRoles
  };
}
