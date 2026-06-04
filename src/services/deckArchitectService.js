import { generateManaBase, calculatePerfectLandCount, calculateVMP, getLandColors } from './deckCalculator.js'; 
import { callAI } from './aiFactory.js';
import { API_ENDPOINTS } from '../config/apiEndpoints.js';
import { BATTLEBOX_BANLIST, BANLIST_SUBSTITUTIONS, BATTLEBOX_ARCHETYPES, MTG_STRATEGIES, MTG_TRIBES, getIntelligentSubstitution, PARASITIC_RULES, COMPETITIVE_ANTI_SYNERGIES, inferStrategyFromArchetype } from '../constants/legacyBattleBox.js';
import { buildCardPool, getDynamicArchetypes } from './ragService.js';
import { findFuzzyMatchInDB, getCardFromDB, hydrateCard } from './cardHydrator.js';
import { generateSideboardGuide } from './sideboardService.js';

/**
 * Limpia y parsea de forma segura respuestas JSON de la IA que puedan incluir cercas de código de markdown.
 */
export function cleanAndParseJSON(str) {
    if (!str) return null;
    let clean = typeof str === 'string' ? str.trim() : str;
    if (typeof clean !== 'string') return clean;

    // Eliminar bloque de código Markdown si existe (```json ... ``` o ``` ... ```)
    if (clean.startsWith("```")) {
        const firstNewLine = clean.indexOf("\n");
        if (firstNewLine !== -1) {
            clean = clean.substring(firstNewLine + 1);
        }
        if (clean.endsWith("```")) {
            clean = clean.substring(0, clean.length - 3).trim();
        }
    }
    
    // Búsqueda defensiva del primer corchete/llave (ignorar comillas previas al JSON de la conversación)
    const firstBrace = clean.search(/[\{\[]/);
    if (firstBrace !== -1) {
        clean = clean.substring(firstBrace);
        const startChar = clean.charAt(0);
        const endChar = startChar === '{' ? '}' : ']';
        const endBrace = clean.lastIndexOf(endChar);
        if (endBrace !== -1) {
            clean = clean.substring(0, endBrace + 1);
        }
    }
    
    return JSON.parse(clean);
}

export function parseUserRulesString(inputStr) {
    if (!inputStr) return [];
    
    const rawTokens = inputStr.split(/[,\n]/);
    const parsedList = [];
    
    for (let token of rawTokens) {
        token = token.trim();
        if (!token) continue;
        
        const match = token.match(/^(\d+)\s*[xX]?\s+(.+)$/) || token.match(/^(\d+)\s*(.+)$/);
        
        let quantity = 1;
        let name = token;
        
        if (match) {
            const parsedQty = parseInt(match[1], 10);
            if (!isNaN(parsedQty) && parsedQty > 0) {
                quantity = Math.min(4, parsedQty);
                name = match[2].trim();
            }
        }
        
        name = name.replace(/[\[\]"']/g, '').trim();
        if (name) {
            parsedList.push({ name, quantity });
        }
    }
    
    return parsedList;
}

export function parseCustomBanlistString(inputStr) {
    const list = parseUserRulesString(inputStr);
    return list.map(item => item.name.toLowerCase());
}



// 1. EL ESQUEMA CERRADO DE GEMINI (Exclusivo para Hechizos, Prohibidas Tierras)
const GEMINI_NONLAND_SCHEMA = {
  type: "object",
  properties: {
    deckName: { type: "string", description: "A concise, thematic name for the deck." },
    archetype: { type: "string" },
    strategy: { type: "string" },
    technical_metrics: {
        type: "object",
        properties: {
             land_target: { type: "number", description: "Mathematical target for lands (e.g., 20, 22, 24 depending on curve aggressiveness)" },
             pips_balance: {
                type: "object",
                description: "Proportion of mana pips required -> E.g., B: 20, W:0, U:10, R:5, G:0",
                properties: { "W": {type:"number"}, "U": {type:"number"}, "B": {type:"number"}, "R": {type:"number"}, "G": {type:"number"} }
             }
        }
    },
    spells: {
      type: "array",
      description: "ARRAY OF SPELLS (Creatures, Sorceries, etc). 0 LANDS HERE. Use OFFICIAL SCRYFALL ENGLISH NAMES ONLY.",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "number", description: "Min 1, Max 4 copies." },
          category: { type: "string", description: "Elige entre: Spell, Creature, Sorcery, Instant, Artifact, Enchantment, Planeswalker." },
          cmc: { type: "number" },
          role: { type: "string", description: "Rol estratégico: Debe coincidir exactamente con uno de los roles definidos en el PLANO de construcción." }
        },
        required: ["name", "quantity", "category", "cmc", "role"]
      }
    },
    utility_lands_recommendations: {
      type: "array",
      description: "List 0 to 4 names of crucial utility or special lands perfect for this specific strategy (e.g., 'Cavern of Souls', 'Mutavault', 'Boseiju, Who Endures'). DO NOT include basics, fetches, or duals.",
      items: { type: "string" }
    }
  },
  required: ["deckName", "strategy", "technical_metrics", "spells", "utility_lands_recommendations"]
};

// 2. EL ESQUEMA DE REPOSICIONAMIENTO Y RELLENO (SUPREME JUDGE)
const GEMINI_SUPREME_JUDGE_SCHEMA = {
  type: "object",
  properties: {
    additions: {
      type: "array",
      description: "List of new cards to add to reach the EXACT required spell count. Total quantities added here MUST exactly equal the requested gap.",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the competitive card from the RAG pool." },
          quantity: { type: "integer", description: "Number of copies to add." },
          reason: { type: "string", description: "Why this card is necessary to fill the gap strategically." }
        },
        required: ["name", "quantity", "reason"]
      }
    },
    swaps: {
      type: "array",
      description: "List of strategic card swaps to optimize the deck and remove functional redundancies (e.g., swapping redundant mana dorks for lords).",
      items: {
        type: "object",
        properties: {
          replace: { type: "string", description: "Name of the card currently in the deck to remove." },
          with: { type: "string", description: "Name of the card from the RAG pool to inject." },
          quantity: { type: "integer", description: "Number of copies to swap." },
          reason: { type: "string", description: "Tactical explanation of why this swap improves functional diversity." }
        },
        required: ["replace", "with", "quantity", "reason"]
      }
    }
  },
  required: ["additions", "swaps"]
};

// 3. EL ESQUEMA DE CONSTRUCCIÓN DINÁMICA DE PLANTILLAS (BLUEPRINT ARCHITECT)
const GEMINI_BLUEPRINT_SCHEMA = {
  type: "object",
  properties: {
    totalSpells: { type: "number", description: "Target total non-land spells, typically 36 to 40 depending on curve." },
    roles: {
      type: "array",
      description: "List of highly specific strategic roles/slots. The sum of all 'quantity' fields MUST exactly equal totalSpells.",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "A highly descriptive, CamelCase or snake_case key for the role, e.g. 'core_tribal_lords', 'premium_finisher', 'early_interaction'." },
          quantity: { type: "number", description: "Exact number of card copies allocated for this role." },
          cmcCategory: { 
            type: "string", 
            description: "Target CMC bracket for this role. MUST be one of: '1', '2', '3', '4', '4+', '5+', 'any'." 
          },
          finisherQuality: { 
            type: "string", 
            description: "Required quality level. Use 'finisher' for high-impact game-ending threats (which should be Legendary or Mythic if possible), or 'standard' for regular utility and support cards." 
          },
          purposeDescription: { type: "string", description: "Clear explanation of what these cards do and how they fit the archetype curve." }
        },
        required: ["name", "quantity", "cmcCategory", "finisherQuality", "purposeDescription"]
      }
    }
  },
  required: ["totalSpells", "roles"]
};

// 3. DICCIONARIO DE ADN ESTRATÉGICO Y CONSTRUCTOR TAXONÓMICO (Synergy Registry)
const ARCHETYPE_DNA = {
  // Estrategias de Modern
  reanimator: {
    prioridad: "Motores de descarte (Enablers) eficientes, efectos de reanimación rápidos (Persist, Goryo's Vengeance, Late to Dinner, Priest of Fell Rites) y payoffs gigantescos de Modern (Archon of Cruelty, Atraxa).",
    estilo: "Estratégico / Combo Reanimador",
    regla_de_oro: "Las criaturas de coste 1-3 DEBEN descartar cartas, buscar en el cementerio o facilitar la reanimación."
  },
  aristocrats: {
    prioridad: "Motores de sacrificio eficientes (Yawgmoth, Thran Physician), disparadores de muerte (Blood Artist, Zulaport Cutthroat) y generadores de fichas sacrificables.",
    estilo: "Sinergia acumulativa / Sacrificio y Combo",
    regla_de_oro: "Las criaturas de coste 1-3 DEBEN poder sacrificarse sin coste, generar fichas al entrar/morir, o drenar vidas cuando muere otra criatura."
  },
  tokens: {
    prioridad: "Generación de fichas masiva en turnos iniciales y payoffs basados en Convoke (Knight-Errant of Eos, Venerated Loxodon).",
    estilo: "Agresivo / Enjambre con Convoke",
    regla_de_oro: "Las criaturas de coste 1-3 DEBEN poner varios cuerpos en mesa o potenciar/aprovechar el número total de criaturas."
  },
  spellslinger: {
    prioridad: "Criaturas baratas con Prowess (Soul-Scar Mage, Monastery Swiftspear), cantrips ágiles e instantáneos de daño e interacción.",
    estilo: "Tempo / Agro-Hechizos",
    regla_de_oro: "Las criaturas deben ser de coste 1-2 y crecer o generar ventajas con cada instantáneo o conjuro que lances."
  },
  blink: {
    prioridad: "Criaturas con efectos potentes al entrar al campo (ETB) abusando de Ephemerate, Soulherder y asistentes de parpadeo.",
    estilo: "Ventaja incremental / Parpadeo (Flicker)",
    regla_de_oro: "Las criaturas de coste 1-3 DEBEN generar valor inmediato (robar, buscar tierras, remover) al entrar al campo."
  },
  enchantress: {
    prioridad: "Bogles evasivos (Slippery Bogle, Gladecover Scout) potenciados por auras de bajo coste (Ethereal Armor, All That Glitters) y motores de robo basados en encantamientos.",
    estilo: "Auras Agresivas / Sinergia de Encantamientos",
    regla_de_oro: "Las criaturas deben tener Antimaleficio (Hexproof) o interactuar con el lanzamiento de encantamientos."
  },
  landfall: {
    prioridad: "Sinergias con la entrada de tierras y fetchlands usando Valakut Exploration, Dryad of the Ilysian Grove u Omnath, Locus of Creation.",
    estilo: "Desarrollo de Tierras / Ventaja de Landfall",
    regla_de_oro: "Las criaturas y hechizos deben disparar ventajas con la entrada de tierras o acelerar su juego."
  },
  graveyard: {
    prioridad: "Explotación del cementerio usando Delirium (Dragon's Rage Channeler, Tarmogoyf) o Dredge y mecánicas de desenterrar.",
    estilo: "Recurso del Cementerio / Delirium",
    regla_de_oro: "Las criaturas de coste 1-3 deben alimentarse del cementerio, poblarlo rápidamente, o ser jugables desde él."
  },
  lifegain: {
    prioridad: "Ganancia de vida pasiva con Soul Sisters (Soul Warden) para inflar criaturas (Ajani's Pridemate) o disparar combos de Heliod, Sun-Crowned.",
    estilo: "Sinergia de Vidas / Combo Heliod",
    regla_de_oro: "Las criaturas e interactores deben disparar sus habilidades al ganar vidas o facilitar la ganancia de vidas."
  },
  prison: {
    prioridad: "Elementales fiscales y de control de mesa que restringen y ralentizan al rival (Thalia, Guardian of Thraben, Damping Sphere, Ghostly Prison).",
    estilo: "Taxes & Soft Lock",
    regla_de_oro: "Las criaturas e interactores de coste bajo deben aplicar impuestos, restringir ataques o entorpecer el maná del rival."
  },
  voltron: {
    prioridad: "Hammer Time! Equipar instantáneamente Colossus Hammer mediante Sigarda's Aid o Puresteel Paladin.",
    estilo: "Equipos Explosivos / Combo Voltron",
    regla_de_oro: "Las criaturas de coste 1-2 deben ser portadores eficientes o buscar/abastecer la unión de equipos gratis."
  },
  vehicles: {
    prioridad: "Vehículos altamente evasivos y eficientes como Smuggler's Copter y tripulación ágil que esquiva limpiamesas.",
    estilo: "Vehículos Agresivos",
    regla_de_oro: "Las criaturas deben tripular con facilidad o beneficiarse del uso y ataque con vehículos."
  },

  // Arquetipos de Base de Modern
  aggro: {
    prioridad: "Curva muy baja. Sinergias agresivas ultra-rápidas como Affinity (Steel Overseer, Patchwork Automaton) o Hardened Scales (Walking Ballista, Arcbound Ravager).",
    estilo: "Agresivo lineal / Affinity / Scales",
    regla_de_oro: "Las criaturas de coste 1-2 DEBEN ser artefactos, tener contadores +1/+1 que se multipliquen, o atacar con prisa/evasión extrema."
  },
  tempo: {
    prioridad: "Murktide Regent, Sprite Dragon y Death's Shadow. Pocas amenazas ágiles protegidas con counterspells y remoción directa.",
    estilo: "Tempo Murktide / Shadow",
    regla_de_oro: "Las criaturas deben ser de coste 1-2, crecer por sí solas en el cementerio o juego, y jugarse con soporte de hechizos reactivos."
  },
  midrange: {
    prioridad: "El valor de Jund o de Omnath. Remoción ultra-eficiente (Lightning Bolt, Fatal Push), disrupción de mano (Thoughtseize) y amenazas resilientes de gran calidad individual.",
    estilo: "Midrange Clásico / Máxima Eficiencia",
    regla_de_oro: "Cada carta de coste 1-3 debe generar una ventaja de cartas de 2-por-1 o remover una amenaza a coste mínimo."
  },
  combo: {
    prioridad: "Ensamblaje del combo de Yawgmoth, Amulet Titan o Creatividad Indómita. Tutores consistentes como Chord of Calling y piezas clave.",
    estilo: "Combo Consistente de Modern",
    regla_de_oro: "Las criaturas de coste 1-3 deben ser tutores, piezas obligatorias del combo o protectores del combo en mesa."
  },
  control: {
    prioridad: "Control absoluto de mesa con Supreme Verdict, Counterspell, y remoción eficiente de Modern, rematando con caminantes (Teferi).",
    estilo: "Azorius / Jeskai Control",
    regla_de_oro: "Las poquísimas criaturas de coste 1-3 deben ser motores de robo interactivos o poseer destello (Flash)."
  },

  // Específicos exigidos de Modern
  affinity: {
    prioridad: "Constructos y Myr (Steel Overseer, Patchwork Automaton) combinados con aceleradores de artefacto y ventajas de robo metálicas.",
    estilo: "Agresivo de Artefactos / Sinergia Affinity",
    regla_de_oro: "Las criaturas de coste 1-3 DEBEN ser criaturas artefacto o dar soporte directo al conteo de artefactos en mesa."
  },
  scales: {
    prioridad: "Contadores +1/+1 con Hardened Scales (Walking Ballista, Arcbound Ravager) escalando amenazas de manera explosiva.",
    estilo: "Agresivo de Sinergia de Contadores",
    regla_de_oro: "Todas las criaturas de coste 1-3 DEBEN interactuar con contadores +1/+1 o multiplicarlos."
  },
  eldrazi_tron: {
    prioridad: "Grandes amenazas incoloras Eldrazi (Thought-Knot Seer, Reality Smasher) aceleradas con tierras de utilidad y Damping Sphere.",
    estilo: "Midrange Incoloro / Ramp / Control",
    regla_de_oro: "Las amenazas e interactores deben ser incoloros o interactuar de forma favorable con tierras de utilidad incoloras."
  },
  tron: {
    prioridad: "Grandes amenazas incoloras Eldrazi (Thought-Knot Seer, Reality Smasher) aceleradas con tierras de utilidad y Damping Sphere.",
    estilo: "Midrange Incoloro / Ramp / Control",
    regla_de_oro: "Las amenazas e interactores deben ser incoloros o interactuar de forma favorable con tierras de utilidad incoloras."
  },
  cascade: {
    prioridad: "Hechizos interactivos de coste 3+ y habilitadores de cascada para asegurar que siempre se revele un payoff de coste 0 (Crashing Footfalls, Living End).",
    estilo: "Combo / Cascada Consistente",
    regla_de_oro: "PROHIBICIÓN ABSOLUTA: No puedes incluir ninguna carta de coste 1 o 2. Toda la interacción debe costar 3 o más, o usar mecánicas alternativas (Split, Elementales)."
  },
  ramp: {
    prioridad: "Aceleradores de maná rápidos (Mana Dorks como Llanowar Elves, Birds of Paradise o hechizos de búsqueda como Farseek, Cultivate) combinados con payoffs masivos e interactivos de coste 5 o más (Primeval Titan, Wurmcoil Engine, Karn).",
    estilo: "Desarrollo y Aceleración / Big Mana",
    regla_de_oro: "Las cartas de coste 1-3 DEBEN acelerar tu maná, buscar tierras o proveer interacción defensiva para sobrevivir hasta lanzar tus amenazas de coste 5+."
  }
};

// Esta función crea el 'Plano' (el JSON de restricciones) dinámicamente con alta adaptabilidad de colores y arquetipos
function getDeckBlueprint(archetype, strategyId, formData) {
  const base = {
    totalSpells: 36,
    roles: { core_creatures: 16, synergetic_threats: 8, enablers: 4, interaction: 8 }
  };

  const colores = formData?.colores || [];
  const hasWhite = colores.includes('W');
  const hasBlack = colores.includes('B');
  const hasRed = colores.includes('R');
  const hasBlue = colores.includes('U');
  const hasGreen = colores.includes('G');
  
  const hasTribe = !!(formData?.tribe && formData.tribe !== 'none' && formData.tribe !== 'ninguna');

  if (strategyId === 'cascade') {
    return {
      totalSpells: 38,
      roles: { cascade_enablers_cmc3: 8, zero_cost_payoffs: 8, interaction_cmc3plus: 10, heavy_finishers_cmc4plus: 4, stabilizers_cmc3plus: 8 }
    };
  }

  if (strategyId === 'tron' || strategyId === 'eldrazi_tron') {
    return {
      totalSpells: 36,
      roles: { artifact_mana_accelerators: 10, colorless_eldrazi_threats: 10, heavy_finishers_planeswalkers: 6, colorless_interaction_and_removal: 10 }
    };
  }

  if (strategyId === 'reanimator') {
    return { 
      totalSpells: 36,
      roles: { reanimation_targets_cmc7plus: 8, reanimation_spells: 10, discard_enablers: 10, interaction_and_protection: 8 }
    };
  }

  if (strategyId === 'aristocrats') {
    return {
      totalSpells: 36,
      roles: { sac_fodder_creatures: 12, sac_outlets: 8, blood_artist_payoffs: 8, top_end_finishers_cmc4plus: 2, interaction: 6 }
    };
  }

  if (strategyId === 'tokens') {
    return {
      totalSpells: 36,
      roles: { early_token_generators: 12, team_anthem_buffs: 8, top_end_finishers_cmc4plus: 4, interaction: 12 }
    };
  }

  if (strategyId === 'spellslinger') {
    const spellRoleName = hasRed ? "burn_spells" : "interaction_and_removal";
    const protectionRoleName = hasBlue ? "protection_counterspells" : (hasBlack ? "hand_disruption_and_discard" : "interaction_or_combat_tricks");
    return {
      totalSpells: 36,
      roles: { early_prowess_creatures: 8, top_end_finishers_cmc4plus: 2, cheap_cantrips: 12, [spellRoleName]: 8, [protectionRoleName]: 6 }
    };
  }

  if (strategyId === 'blink') {
    return {
      totalSpells: 36,
      roles: { early_etb_creatures: 12, top_end_finishers_cmc4plus: 4, blink_flicker_spells: 10, interaction: 10 }
    };
  }

  if (strategyId === 'enchantress') {
    return {
      totalSpells: 36,
      roles: { early_enchantress_creatures: 8, top_end_enchantments_cmc4plus: 4, auras_and_enchantments: 14, ramp_enchantments: 4, interaction: 6 }
    };
  }

  if (strategyId === 'landfall') {
    return {
      totalSpells: 36,
      roles: { early_landfall_creatures: 10, top_end_finishers_cmc4plus: 6, ramp_spells: 12, interaction: 8 }
    };
  }

  if (strategyId === 'graveyard') {
    return {
      totalSpells: 36,
      roles: { self_mill_creatures: 10, top_end_graveyard_payoffs_cmc4plus: 6, graveyard_synergy_spells: 12, interaction: 8 }
    };
  }

  if (strategyId === 'lifegain') {
    return {
      totalSpells: 36,
      roles: { early_lifegain_creatures: 12, pridemate_payoffs: 8, top_end_finishers_cmc4plus: 4, interaction: 12 }
    };
  }

  if (strategyId === 'prison') {
    return {
      totalSpells: 36,
      roles: { stax_artifacts_enchantments: 14, tax_creatures: 8, top_end_finishers_cmc4plus: 4, removal_and_interaction: 10 }
    };
  }

  if (strategyId === 'voltron') {
    return {
      totalSpells: 36,
      roles: { voltron_creature_commanders: 8, auras_and_equipments: 14, top_end_finishers_cmc4plus: 2, protection_and_interaction: 12 }
    };
  }

  if (strategyId === 'vehicles') {
    return {
      totalSpells: 36,
      roles: { early_pilots: 12, great_vehicles: 8, top_end_vehicles_or_finishers_cmc4plus: 4, interaction: 12 }
    };
  }

  if (archetype === 'aggro') {
    const removalRoleName = hasRed ? "burn_spells" : "interaction_or_combat_tricks";
    if (hasTribe) {
      return {
        totalSpells: 40,
        roles: { early_fast_creatures: 20, top_end_finishers_cmc4plus: 2, synergetic_threats: 8, [removalRoleName]: 10 }
      };
    }
    return {
      totalSpells: 40,
      roles: { fast_creatures: 22, [removalRoleName]: 10, synergetic_threats: 8 }
    };
  }

  if (archetype === 'tempo') {
    const protectionRoleName = hasBlue ? "protection_counterspells" : (hasBlack ? "discard_and_hand_disruption" : "interaction_or_combat_tricks");
    if (hasTribe) {
      return {
        totalSpells: 38,
        roles: { early_cheap_threats: 14, top_end_finishers_cmc4plus: 2, enablers_or_cantrips: 10, [protectionRoleName]: 6, spot_removal: 6 }
      };
    }
    return {
      totalSpells: 38,
      roles: { cheap_threats: 14, enablers_or_cantrips: 12, [protectionRoleName]: 6, spot_removal: 6 }
    };
  }

  if (archetype === 'midrange') {
    const rampRoleName = hasGreen ? "mana_dorks_or_ramp" : "spot_removal_or_cantrips";
    return {
      totalSpells: 36,
      roles: { early_value_creatures: 12, top_end_finishers_cmc4plus: 4, synergetic_threats: 8, [rampRoleName]: 4, interaction_and_disruption: 8 }
    };
  }

  if (archetype === 'control') {
    const lacksHardBoardWipes = !hasWhite && !hasBlack;
    
    if (hasTribe) {
      // Control Tribal/Híbrido: más criaturas, menos hechizos puros de control
      const sweepRoleName = lacksHardBoardWipes ? (hasRed ? "damage_sweepers" : "board_bounce_or_sweepers") : "board_wipes";
      const sweepCount = lacksHardBoardWipes ? 2 : 4;
      const removalCount = lacksHardBoardWipes ? 14 : 12;
      return {
        totalSpells: 36,
        roles: { early_creature_defense: 6, top_end_heavy_finishers_cmc4plus: 6, [sweepRoleName]: sweepCount, counterspells_and_removal: removalCount + 2, card_draw: 6 }
      };
    }
    
    if (lacksHardBoardWipes) {
      const sweepRoleName = hasRed ? "damage_sweepers" : "board_bounce_or_sweepers";
      return {
        totalSpells: 36,
        roles: { planeswalkers_or_heavy_finishers_cmc4plus: 6, [sweepRoleName]: 2, counterspells_and_removal: 18, card_draw: 10 }
      };
    }
    return {
      totalSpells: 36,
      roles: { planeswalkers_or_heavy_finishers_cmc4plus: 6, board_wipes: 4, counterspells_and_removal: 16, card_draw: 10 }
    };
  }

  if (archetype === 'prison') {
    return {
      totalSpells: 36,
      roles: { lock_pieces_and_taxes: 12, threat_creatures: 8, top_end_finishers_cmc4plus: 4, removal_and_interaction: 8, utility_artifacts: 4 }
    };
  }

  if (archetype === 'combo') {
    return {
      totalSpells: 38,
      roles: { combo_pieces: 12, top_end_combo_finishers_cmc4plus: 2, tutors: 8, protection_spells: 8, fast_mana_or_enablers: 8 }
    };
  }

  if (archetype === 'ramp') {
    const rampRoleName = hasGreen ? "mana_dorks_and_growth" : "artifact_mana_rocks";
    return {
      totalSpells: 35,
      roles: { [rampRoleName]: 12, massive_finishers_cmc6plus: 8, card_advantage_draw: 7, protection_and_interaction: 8 }
    };
  }

  return base;
}

/**
 * Selecciona dinámicamente el mejor hechizo de reanimación legal en Modern
 * basado en los colores y las criaturas del mazo.
 */
function getDynamicModernReanimateSpell(cards, formData) {
    const colores = new Set(formData?.colores || []);
    
    // Escaneo de tierras e identidades en el mazo para mayor precisión
    cards.forEach(c => {
        if (c.category === 'Land') {
            const nameLower = c.name.toLowerCase();
            if (nameLower.includes('swamp') || nameLower.includes('crypt') || nameLower.includes('marsh') || nameLower.includes('grave')) colores.add('B');
            if (nameLower.includes('plains') || nameLower.includes('shrine') || nameLower.includes('chapel') || nameLower.includes('foundry')) colores.add('W');
            if (nameLower.includes('mountain') || nameLower.includes('vent') || nameLower.includes('crag') || nameLower.includes('sacred')) colores.add('R');
            if (nameLower.includes('forest') || nameLower.includes('garden') || nameLower.includes('cemetery') || nameLower.includes('stomping')) colores.add('G');
            if (nameLower.includes('island') || nameLower.includes('pool') || nameLower.includes('canal') || nameLower.includes('watery')) colores.add('U');
        }
    });

    const tieneB = colores.has('B');
    const tieneW = colores.has('W');
    const tieneR = colores.has('R');
    const tieneG = colores.has('G');

    const highCmcCreatures = cards.filter(c => c.category === 'Creature' && c.cmc >= 5);
    
    const legendaryTargets = ["atraxa", "kokusho", "griselbrand", "etali", "emrakul", "ulamog", "kozilek", "sheoldred", "elesh norn", "jin-gitaxias", "vorinclex", "goryo"];
    const hasLegendaryTargets = highCmcCreatures.some(c => 
        legendaryTargets.some(leg => c.name.toLowerCase().includes(leg)) || 
        (c.type_line && c.type_line.toLowerCase().includes("legendary"))
    );

    const hasNonLegendaryTargets = highCmcCreatures.some(c => 
        !legendaryTargets.some(leg => c.name.toLowerCase().includes(leg)) && 
        !(c.type_line && c.type_line.toLowerCase().includes("legendary"))
    );

    // Orzhov B/W
    if (tieneB && tieneW) {
        if (hasLegendaryTargets && !hasNonLegendaryTargets) {
            return { name: "Priest of Fell Rites", cmc: 2, category: "Creature" };
        }
        return { name: "Unburial Rites", cmc: 5, category: "Sorcery" };
    }

    // Rakdos legendary reanimator (e.g. Goryo's Vengeance targets)
    if (tieneB && tieneR && hasLegendaryTargets && !hasNonLegendaryTargets) {
        return { name: "Goryo's Vengeance", cmc: 2, category: "Instant" };
    }

    // Mono-White / White-heavy non-Black
    if (tieneW && !tieneB) {
        return { name: "Late to Dinner", cmc: 4, category: "Sorcery" };
    }

    // Golgari B/G
    if (tieneB && tieneG) {
        return { name: "Vigor Mortis", cmc: 4, category: "Sorcery" };
    }

    // Default general cases
    if (hasNonLegendaryTargets || highCmcCreatures.length === 0) {
        return { name: "Persist", cmc: 2, category: "Sorcery" };
    }
  if (hasLegendaryTargets) {
        return { name: "Goryo's Vengeance", cmc: 2, category: "Instant" };
    }

    return { name: "Persist", cmc: 2, category: "Sorcery" };
}

// Helper para obtener el límite competitivo estricto de copias de una carta en el mazo
export const getMaxAllowedCopies = (cardName, category, cmc, ragPool = []) => {
    if (!cardName) return 4;
    const nameLower = cardName.trim().toLowerCase();
    const isBasic = ["plains", "island", "swamp", "mountain", "forest", "wastes", "llanura", "isla", "pantano", "montaña", "bosque", "yermo"].includes(nameLower);
    if (isBasic) return 99;

    // Buscar en el ragPool para obtener metadatos más completos de Scryfall
    const poolCard = ragPool ? ragPool.find(c => c.name.toLowerCase() === nameLower) : null;
    const typeLine = (poolCard?.type_line || category || "").toLowerCase();
    const oracleText = (poolCard?.oracle_text || poolCard?.text || "").toLowerCase();
    const isPlaneswalker = typeLine.includes("planeswalker") || category?.toLowerCase() === "planeswalker";
    const isLegendary = typeLine.includes("legendary") || isPlaneswalker;
    const cardCmc = poolCard?.mana_value ?? cmc ?? 0;

    let limit = 4;

    // 1. Límite Pro Tour para cartas legendarias
    if (isLegendary) {
        if (cardCmc >= 5) limit = 2;
        else if (cardCmc >= 4) limit = 3;
        else limit = 4; // Leyendas baratas son motores Pro Tour a 4x
    } else if (cardCmc >= 5) {
        limit = 3; // Amenazas pesadas no legendarias (ej: Shark Typhoon): max 3 copias
    }

    // 2. DETECTOR DE REDUNDANCIA ESTRATÉGICA (Habilidades pasivas / Keywords no acumulativas en mesa)
    if (oracleText && !isBasic) {
        const hasKeywordGrant = 
            oracleText.includes("have flying") || oracleText.includes("gains flying") || oracleText.includes("gain flying") ||
            oracleText.includes("have haste") || oracleText.includes("gains haste") || oracleText.includes("gain haste") ||
            oracleText.includes("have lifelink") || oracleText.includes("gains lifelink") || oracleText.includes("gain lifelink") ||
            oracleText.includes("have vigilance") || oracleText.includes("gains vigilance") || oracleText.includes("gain vigilance") ||
            oracleText.includes("have deathtouch") || oracleText.includes("gains deathtouch") || oracleText.includes("gain deathtouch") ||
            oracleText.includes("have trample") || oracleText.includes("gains trample") || oracleText.includes("gain trample") ||
            oracleText.includes("have indestructible") || oracleText.includes("gains indestructible") || oracleText.includes("gain indestructible") ||
            oracleText.includes("have first strike") || oracleText.includes("have double strike") ||
            oracleText.includes("have menace") || oracleText.includes("have hexproof") || oracleText.includes("slivercycling");

        const hasNonStackingStaticEffect =
            oracleText.includes("can't cast spells") ||
            oracleText.includes("can't cast more than") ||
            oracleText.includes("an additional land");

        // Solo penalizar si NO tiene efectos acumulativos de estadísticas (+1/+1, +2/+2, etc.) que sí escalan
        const hasCumulativeStats = 
            oracleText.includes("+1/+1") || oracleText.includes("+2/+2") || 
            oracleText.includes("+x/+x") || oracleText.includes("get +") || 
            oracleText.includes("gets +");

        if ((hasKeywordGrant || hasNonStackingStaticEffect) && !hasCumulativeStats) {
            // keywords/efectos baratos (CMC < 3) se capan a 3 copias (alta presencia pero sin atascar el 2do)
            // keywords/efectos medianos/costosos (CMC >= 3) se capan a 2 copias
            const redundancyCap = cardCmc >= 3 ? 2 : 3;
            if (redundancyCap < limit) {
                limit = redundancyCap;
            }
        }
    }

    return limit;
};

export function obtenerMejorCartaDeRemplazo(category, targetCmc, allowedColors, format = 'MODERN', ragPool = [], excludeNames = []) {
    const formatUpper = (format || 'MODERN').toUpperCase();
    const colorsSet = new Set(allowedColors && allowedColors.length > 0 ? allowedColors : ['W', 'U', 'B', 'R', 'G']);
    const excludeSet = new Set(excludeNames.map(n => n.toLowerCase().trim()));
    
    // 1. Intentar buscar en el RAG pool de la baraja (que ya está filtrado por formato)
    if (ragPool && ragPool.length > 0) {
        const candidates = ragPool.filter(c => {
            const nameClean = c.name.toLowerCase().trim();
            if (excludeSet.has(nameClean)) return false;
            
            // Ignorar tierras
            const typeLower = (c.type_line || '').toLowerCase();
            if (typeLower.includes("land")) return false;
            
            // Coincidir categoría
            const isCreature = category === 'Creature';
            const poolIsCreature = typeLower.includes("creature");
            if (isCreature !== poolIsCreature) return false;
            
            // Coincidir identidad de color
            const cardColors = c.colors || [];
            if (cardColors.length > 0 && !cardColors.every(col => colorsSet.has(col))) return false;
            
            return true;
        });
        
        if (candidates.length > 0) {
            // Ordenar por cercanía de CMC y score (calidad del RAG pool)
            candidates.sort((a, b) => {
                const diffA = Math.abs((a.mana_value || 0) - targetCmc);
                const diffB = Math.abs((b.mana_value || 0) - targetCmc);
                if (diffA !== diffB) return diffA - diffB;
                return (b.score || 0) - (a.score || 0);
            });
            
            const best = candidates[0];
            let newCat = category;
            const t = (best.type_line || '').toLowerCase();
            if (t.includes("instant")) newCat = "Instant";
            else if (t.includes("sorcery")) newCat = "Sorcery";
            else if (t.includes("artifact")) newCat = "Artifact";
            else if (t.includes("enchantment")) newCat = "Enchantment";
            else if (t.includes("planeswalker")) newCat = "Planeswalker";
            
            return {
                name: best.name,
                cmc: best.mana_value || targetCmc,
                category: newCat
            };
        }
    }
    
    // 2. Si no hay candidatos en el pool, usar staples estáticos de fallback según formato
    const isStandard = formatUpper === 'STANDARD';
    
    const lists = {
        creature_standard: {
            W: [{ name: "Novice Inspector", cmc: 1, category: "Creature" }, { name: "Thraben Inspector", cmc: 1, category: "Creature" }, { name: "Recruitment Officer", cmc: 1, category: "Creature" }],
            R: [{ name: "Monastery Swiftspear", cmc: 1, category: "Creature" }, { name: "Kumano Faces Kakkazan", cmc: 1, category: "Creature" }, { name: "Slickshot Show-off", cmc: 2, category: "Creature" }],
            B: [{ name: "Deep-Cavern Bat", cmc: 2, category: "Creature" }, { name: "Glint-Sleeve Siphoner", cmc: 2, category: "Creature" }, { name: "Evolved Sleeper", cmc: 1, category: "Creature" }],
            G: [{ name: "Llanowar Elves", cmc: 1, category: "Creature" }, { name: "Elvish Mystic", cmc: 1, category: "Creature" }, { name: "Tough Cookie", cmc: 2, category: "Creature" }],
            U: [{ name: "Spyglass Siren", cmc: 1, category: "Creature" }, { name: "Delver of Secrets", cmc: 1, category: "Creature" }, { name: "Faerie Dreamthief", cmc: 1, category: "Creature" }],
            colorless: [{ name: "Tough Cookie", cmc: 2, category: "Creature" }, { name: "Ornithopter", cmc: 0, category: "Creature" }]
        },
        creature_modern: {
            W: [{ name: "Esper Sentinel", cmc: 1, category: "Creature" }, { name: "Giver of Runes", cmc: 1, category: "Creature" }, { name: "Thalia, Guardian of Thraben", cmc: 2, category: "Creature" }],
            R: [{ name: "Ragavan, Nimble Pilferer", cmc: 1, category: "Creature" }, { name: "Dragon's Rage Channeler", cmc: 1, category: "Creature" }, { name: "Monastery Swiftspear", cmc: 1, category: "Creature" }],
            B: [{ name: "Orcish Bowmasters", cmc: 2, category: "Creature" }, { name: "Dauthi Voidwalker", cmc: 2, category: "Creature" }, { name: "Dark Confidant", cmc: 2, category: "Creature" }],
            G: [{ name: "Tarmogoyf", cmc: 2, category: "Creature" }, { name: "Ignoble Hierarch", cmc: 1, category: "Creature" }, { name: "Noble Hierarch", cmc: 1, category: "Creature" }],
            U: [{ name: "Delver of Secrets", cmc: 1, category: "Creature" }, { name: "Snapcaster Mage", cmc: 2, category: "Creature" }, { name: "Faerie Mastermind", cmc: 2, category: "Creature" }],
            colorless: [{ name: "Steel Overseer", cmc: 2, category: "Creature" }, { name: "Hangarback Walker", cmc: 2, category: "Creature" }, { name: "Walking Ballista", cmc: 0, category: "Creature" }]
        },
        spell_standard: {
            B: [{ name: "Go for the Throat", cmc: 2, category: "Instant" }, { name: "Cut Down", cmc: 1, category: "Instant" }, { name: "Duress", cmc: 1, category: "Sorcery" }],
            R: [{ name: "Play with Fire", cmc: 1, category: "Instant" }, { name: "Lightning Strike", cmc: 2, category: "Instant" }, { name: "Abrade", cmc: 2, category: "Instant" }],
            W: [{ name: "Get Lost", cmc: 2, category: "Instant" }, { name: "Lay Down Arms", cmc: 1, category: "Instant" }, { name: "Ossification", cmc: 2, category: "Enchantment" }],
            U: [{ name: "Sleight of Hand", cmc: 1, category: "Sorcery" }, { name: "Consider", cmc: 1, category: "Instant" }, { name: "Make Disappear", cmc: 2, category: "Instant" }],
            G: [{ name: "Pick Your Poison", cmc: 1, category: "Sorcery" }, { name: "Tear Asunder", cmc: 2, category: "Instant" }, { name: "Audacity", cmc: 1, category: "Enchantment" }],
            colorless: [{ name: "Collector's Vault", cmc: 2, category: "Artifact" }]
        },
        spell_modern: {
            B: [{ name: "Fatal Push", cmc: 1, category: "Instant" }, { name: "Thoughtseize", cmc: 1, category: "Sorcery" }, { name: "Inquisition of Kozilek", cmc: 1, category: "Sorcery" }, { name: "Collective Brutality", cmc: 2, category: "Sorcery" }],
            R: [{ name: "Lightning Bolt", cmc: 1, category: "Instant" }, { name: "Unholy Heat", cmc: 1, category: "Instant" }, { name: "Galvanic Discharge", cmc: 1, category: "Instant" }, { name: "Abrade", cmc: 2, category: "Instant" }],
            W: [{ name: "Prismatic Ending", cmc: 1, category: "Sorcery" }, { name: "Path to Exile", cmc: 1, category: "Instant" }, { name: "Swords to Plowshares", cmc: 1, category: "Instant" }],
            U: [{ name: "Preordain", cmc: 1, category: "Sorcery" }, { name: "Brainstorm", cmc: 1, category: "Instant" }, { name: "Ponder", cmc: 1, category: "Sorcery" }, { name: "Spell Pierce", cmc: 1, category: "Instant" }, { name: "Counterspell", cmc: 2, category: "Instant" }],
            G: [{ name: "Veil of Summer", cmc: 1, category: "Instant" }, { name: "Abundant Growth", cmc: 1, category: "Enchantment" }, { name: "Ancient Stirrings", cmc: 1, category: "Sorcery" }],
            colorless: [{ name: "Relic of Progenitus", cmc: 1, category: "Artifact" }, { name: "Mishra's Bauble", cmc: 0, category: "Artifact" }, { name: "Tormod's Crypt", cmc: 0, category: "Artifact" }]
        }
    };

    const activeListGroup = category === 'Creature'
        ? (isStandard ? lists.creature_standard : lists.creature_modern)
        : (isStandard ? lists.spell_standard : lists.spell_modern);

    const getFallback = (candidatesList) => {
        for (const card of candidatesList) {
            if (!excludeSet.has(card.name.toLowerCase().trim())) {
                return card;
            }
        }
        return null;
    };

    // 1. Intentar colores permitidos en orden
    for (const col of Array.from(colorsSet)) {
        const list = activeListGroup[col];
        if (list) {
            const found = getFallback(list);
            if (found) return found;
        }
    }

    // 2. Intentar incoloro
    if (activeListGroup.colorless) {
        const found = getFallback(activeListGroup.colorless);
        if (found) return found;
    }

    // 3. Intentar cualquier color como último recurso desesperado
    for (const col of ["W", "U", "B", "R", "G"]) {
        const list = activeListGroup[col];
        if (list) {
            const found = getFallback(list);
            if (found) return found;
        }
    }

    // 4. Último recurso absoluto indestructible (para no fallar nunca)
    return { 
        name: category === 'Creature' ? "Ornithopter" : "Relic of Progenitus", 
        cmc: category === 'Creature' ? 0 : 1, 
        category: category === 'Creature' ? "Creature" : "Artifact" 
    };
}

// Helper para inyectar carta directamente sin forzar reducción de otras cartas (Module Level)
const inyectarCartaDirecta = (cardList, newCard, ragPool = []) => {
    if (!newCard.name) return cardList;
    const nameClean = newCard.name.trim();
    const existing = cardList.find(c => c.name.trim().toLowerCase() === nameClean.toLowerCase());
    const maxLimit = getMaxAllowedCopies(nameClean, newCard.category, newCard.cmc, ragPool);
    if (existing) {
        existing.quantity = Math.min(maxLimit, existing.quantity + newCard.quantity);
        return cardList;
    }
    return [...cardList, { ...newCard, name: nameClean, quantity: Math.min(maxLimit, newCard.quantity) }];
};

// Helper para distribuir copias faltantes o inyectar nuevos staples de forma segura sin exceder los límites competitivos
const distribuirOInyectarHechizosFaltantes = (spellList, targetCount, colors, addLog, ragPool = [], formData = null) => {
    let currentCount = spellList.reduce((sum, c) => sum + (c.quantity || 0), 0);
    let gap = targetCount - currentCount;
    if (gap <= 0) return spellList;

    const logMsgInit = `[JUEZ COMPENSACIÓN] Rellenando hueco de hechizos de ${currentCount} a ${targetCount} (Faltan ${gap} copias)`;
    console.log(logMsgInit);
    if (addLog) addLog(logMsgInit);

    let adjustedList = spellList.map(c => ({ ...c }));
    const colorsSet = new Set(colors || []);

    // 1. Intentar subir existentes que tengan menos copias de las permitidas competitivamente
    for (let spell of adjustedList) {
        if (gap <= 0) break;
        
        const maxLimit = getMaxAllowedCopies(spell.name, spell.category, spell.cmc, ragPool);
        if (spell.quantity < maxLimit) {
            const addQty = Math.min(maxLimit - spell.quantity, gap);
            if (addQty > 0) {
                spell.quantity += addQty;
                gap -= addQty;
                const logMsg = `[JUEZ COMPENSACIÓN] Incrementando ${spell.name} en +${addQty} copias (Total: ${spell.quantity} / Límite: ${maxLimit})`;
                console.log(logMsg);
                if (addLog) addLog(logMsg);
            }
        }
    }

    if (gap <= 0) return adjustedList;

    // 2. Si todavía falta, buscar en el RAG pool las mejores cartas no-criatura que coincidan con los colores y no estén en la baraja
    if (ragPool && ragPool.length > 0) {
        const sortedPool = [...ragPool].sort((a, b) => (b.score || 0) - (a.score || 0));
        for (let poolCard of sortedPool) {
            if (gap <= 0) break;

            const nameLower = poolCard.name.trim().toLowerCase();
            
            // Excluir cartas de odio estrecho de banquillo del mazo principal
            const narrowHateCards = ["rest in peace", "surgical extraction", "leyline of the void", "tormod's crypt", "grafdigger's cage", "stony silence"];
            if (narrowHateCards.includes(nameLower)) continue;

            const existing = adjustedList.find(c => c.name.trim().toLowerCase() === nameLower);
            if (existing) continue;

            const typeLower = poolCard.type_line ? poolCard.type_line.toLowerCase() : "";
            if (typeLower.includes("land")) continue;
            
            // Si es criatura, solo permitirla si coincide con la tribu (para evitar llenar de criaturas genéricas un mazo falto de hechizos)
            const hasTribe = formData?.tribe && formData.tribe !== 'none' && formData.tribe !== 'ninguna';
            let isTribalMatch = false;
            if (hasTribe && typeLower.includes("creature")) {
                 const activeTribalSubtypes = MTG_TRIBES.find(t => t.id === formData.tribe)?.subtypes || [];
                 isTribalMatch = activeTribalSubtypes.some(sub => typeLower.includes(sub));
            }
            if (typeLower.includes("creature") && !isTribalMatch) continue;

            const matchColors = !poolCard.colors || poolCard.colors.length === 0 || poolCard.colors.every(col => colorsSet.has(col));
            if (!matchColors) continue;

            // Determinar categoría
            let newCat = "Instant";
            if (typeLower.includes("sorcery")) newCat = "Sorcery";
            else if (typeLower.includes("artifact")) newCat = "Artifact";
            else if (typeLower.includes("enchantment")) newCat = "Enchantment";
            else if (typeLower.includes("planeswalker")) newCat = "Planeswalker";

            const cardCmc = poolCard.mana_value || 0;
            const maxLimit = getMaxAllowedCopies(poolCard.name, newCat, cardCmc, ragPool);
            const addQty = Math.min(maxLimit, gap);

            if (addQty > 0) {
                adjustedList.push({
                    name: poolCard.name,
                    quantity: addQty,
                    category: newCat,
                    cmc: cardCmc,
                    role: poolCard.role || "enablers"
                });
                gap -= addQty;

                const logMsg = `[JUEZ COMPENSACIÓN] Inyectando del pool RAG de élite: ${addQty}x ${poolCard.name} (CMC: ${cardCmc}, Límite: ${maxLimit})`;
                console.log(logMsg);
                if (addLog) addLog(logMsg);
            }
        }
    }

    if (gap <= 0) return adjustedList;

    // 3. Si todavía falta, inyectar nuevos staples estáticos clásicos como fallback de seguridad
    const staplePool = [];
    if (colorsSet.has("U")) {
        staplePool.push({ name: "Consider", category: "Instant", cmc: 1, role: "enablers" });
        staplePool.push({ name: "Preordain", category: "Sorcery", cmc: 1, role: "enablers" });
        staplePool.push({ name: "Counterspell", category: "Instant", cmc: 2, role: "removal_and_interaction" });
    }
    if (colorsSet.has("G")) {
        staplePool.push({ name: "Abundant Growth", category: "Enchantment", cmc: 1, role: "enablers" });
        staplePool.push({ name: "Once Upon a Time", category: "Instant", cmc: 2, role: "enablers" });
    }
    if (colorsSet.has("R")) {
        staplePool.push({ name: "Lightning Bolt", category: "Instant", cmc: 1, role: "removal_and_interaction" });
        staplePool.push({ name: "Abrade", category: "Instant", cmc: 2, role: "removal_and_interaction" });
    }
    if (colorsSet.has("B")) {
        staplePool.push({ name: "Fatal Push", category: "Instant", cmc: 1, role: "removal_and_interaction" });
        staplePool.push({ name: "Inquisition of Kozilek", category: "Sorcery", cmc: 1, role: "removal_and_interaction" });
    }
    if (colorsSet.has("W")) {
        staplePool.push({ name: "Path to Exile", category: "Instant", cmc: 1, role: "removal_and_interaction" });
        staplePool.push({ name: "Prismatic Ending", category: "Sorcery", cmc: 1, role: "removal_and_interaction" });
    }
    
    // Universales
    staplePool.push({ name: "Mishra's Bauble", category: "Artifact", cmc: 0, role: "enablers" });
    staplePool.push({ name: "Relic of Progenitus", category: "Artifact", cmc: 1, role: "removal_and_interaction" });

    for (let staple of staplePool) {
        if (gap <= 0) break;
        const existing = adjustedList.find(c => c.name.trim().toLowerCase() === staple.name.trim().toLowerCase());
        if (existing) continue;

        const maxLimit = getMaxAllowedCopies(staple.name, staple.category, staple.cmc, ragPool);
        const addQty = Math.min(maxLimit, gap);
        if (addQty > 0) {
            adjustedList.push({ ...staple, quantity: addQty });
            gap -= addQty;
            const logMsg = `[JUEZ COMPENSACIÓN] Inyectando nuevo staple de relleno estático: ${addQty}x ${staple.name}`;
            console.log(logMsg);
            if (addLog) addLog(logMsg);
        }
    }

    // 4. Salvaguarda final extrema si todo falla: añadir a la primera carta que permita más copias
    if (gap > 0) {
        for (let spell of adjustedList) {
            if (gap <= 0) break;
            const maxLimit = getMaxAllowedCopies(spell.name, spell.category, spell.cmc, ragPool);
            if (spell.quantity < maxLimit) {
                const addQty = Math.min(maxLimit - spell.quantity, gap);
                spell.quantity += addQty;
                gap -= addQty;
                const logMsg = `[JUEZ COMPENSACIÓN] ADVERTENCIA: Forzando +${addQty} copias extra en ${spell.name} (Límite: ${maxLimit}) para cerrar brecha.`;
                console.log(logMsg);
                if (addLog) addLog(logMsg);
            }
        }
    }

    // 5. Salvaguarda desesperada final (ignora límites si es absolutamente necesario para sumar 60)
    if (gap > 0 && adjustedList.length > 0) {
        adjustedList[0].quantity += gap;
        const logMsg = `[JUEZ COMPENSACIÓN] ALERTA CRÍTICA: Forzando límite de 4 con +${gap} copias extra en ${adjustedList[0].name} para completar 60 cartas.`;
        console.log(logMsg);
        if (addLog) addLog(logMsg);
    }

    return adjustedList;
};;

/**
 * Retorna true si el rol de la carta es estratégico/sagrado y no debe ser recortado a la ligera.
 */
function esRolProtegido(role) {
    if (!role) return false;
    const r = role.toLowerCase();
    const protectedRoles = [
        "finishers", "win_conditions", "combo_pieces", "lock_pieces_and_taxes", 
        "stax_artifacts_enchantments", "tax_creatures", "reanimation_creature_targets", 
        "pridemate_payoffs", "voltron_creature_commanders", "great_vehicles", 
        "landfall_creatures", "prowess_creatures", "value_creatures", 
        "synergetic_threats", "fast_creatures", "tutors", "blood_artist_payoffs",
        "team_anthem_buffs", "etb_value_creatures", "auras_and_enchantments",
        "graveyard_payoffs", "cheap_threats", "cascade_enablers", "cascade_payoffs",
        "burn_spells", "urza_lands", "discard_enablers", "artifact_lands"
    ];
    if (protectedRoles.includes(r)) return true;
    if (r.includes("finisher") || r.includes("win_cond") || r.includes("combo_piece")) return true;
    return false;
}

/**
 * Calcula la prioridad de recorte para una carta dada.
 * Mayor valor = Más seguro de recortar. 0 = Intocable.
 */
function obtenerPrioridadDeRecorte(card) {
    if (esRolProtegido(card.role)) {
        return 0; // SAGRADA - NUNCA RECORTAR
    }
    
    const nameLower = card.name.toLowerCase();

    // Excepciones explícitas de arquetipos Pro Tour (Burn, Tron, Graveyard, Affinity)
    const intocables = [
        "urza's tower", "urza's power plant", "urza's mine", "urza's saga", "darksteel citadel",
        "lava spike", "skewer the critics", "rift bolt", "boros charm", "goblin guide", "monastery swiftspear",
        "faithless looting", "cathartic reunion", "thrill of possibility", "stinkweed imp", "golgari grave-troll"
    ];
    if (intocables.some(inv => nameLower === inv)) {
        return 0; // SAGRADA - NUNCA RECORTAR
    }
    
    // Tier-1 Sacred Interaction Staples that must NEVER be cut below 3 copies unless absolutely forced
    const sacredStaples = [
        "counterspell", "force of will", "force of negation", "supreme verdict", "brainstorm", 
        "lightning bolt", "swords to plowshares", "thoughtseize", "fatal push", "path to exile", "prismatic ending"
    ];
    const isSacredStaple = sacredStaples.some(st => nameLower.includes(st));

    // Identify if the card is legendary
    const legendaryKeywords = [
        "atraxa", "griselbrand", "yawgmoth", "urza", "mishra", "teferi", "jace", "gideon", "bolas", "sylex", "emperor"
    ];
    const isLegendary = legendaryKeywords.some(kw => nameLower.includes(kw)) || (card.type_line && card.type_line.toLowerCase().includes("legendary"));

    const interactionKeywords = [
        "push", "bolt", "ending", "path", "leak", "pierce", "counterspell", "abrade", "drown",
        "heat", "binding", "verdict", "disrupt", "inquisition", "seize", "duress", "shards", "relic", "march", "sylex"
    ];
    const isInteraction = interactionKeywords.some(kw => nameLower.includes(kw)) || 
                          ["removal", "interaction", "removal_and_interaction", "spot_removal", "counterspells_and_removal", "board_wipes"].includes(card.role);

    const cantripKeywords = ["consider", "preordain", "looting", "visions", "bauble", "growth", "iteration", "draw", "opt"];
    const isCantrip = cantripKeywords.some(kw => nameLower.includes(kw)) || ["enablers", "enablers_or_cantrips", "card_draw"].includes(card.role);

    // 1. Legendarias redundantes o artefactos legendarios no-criatura (ej. Urza's Sylex, planeswalkers redundantes) - priorizar recortar si cantidad > 2
    if (isLegendary && card.quantity > 2) {
        return 50; 
    }

    // 2. Utilidad genérica / cartas que no son interacción ni robo y tienen cantidad > 2
    if (!isInteraction && !isCantrip && card.quantity > 2) {
        return 45;
    }

    // 3. Cantrips redundantes (cantidad > 3)
    if (isCantrip && card.quantity > 3) {
        return 40;
    }

    // 4. Interacción común redundante (cantidad > 3) - no sagrada
    if (isInteraction && !isSacredStaple && card.quantity > 3) {
        return 35;
    }

    // 5. Cantrips / Robo a 3 copias (cantidad > 2)
    if (isCantrip && card.quantity > 2) {
        return 30;
    }

    // 6. Interacción a 3 copias (cantidad > 2) - no sagrada
    if (isInteraction && !isSacredStaple && card.quantity > 2) {
        return 25;
    }

    // 7. Staples sagrados a más de 3 copias (cantidad > 3)
    if (isSacredStaple && card.quantity > 3) {
        return 20;
    }

    // 8. Copias genéricas generales > 1
    if (card.quantity > 1) {
        return 15;
    }

    return 10; // Último recurso
}

/**
 * Recorta de forma inteligente y progresiva el exceso de copias de hechizos,
 * protegiendo los roles estratégicos y registrando todo en el oráculo.
 */
function recortarHechizosExcedentesInteligente(spells, targetSpellsCount, addLog, mustIncludeNames = []) {
    let actualSum = spells.reduce((sum, c) => sum + (c.quantity || 0), 0);
    let excess = actualSum - targetSpellsCount;
    if (excess <= 0) return spells;
    
    const logMsgInit = `[JUEZ RECORTE INTELIGENTE] Iniciando recorte prioritario de ${actualSum} a ${targetSpellsCount} copias (Exceso de ${excess} copias)`;
    console.log(logMsgInit);
    if (addLog) addLog(logMsgInit);
    
    const isMustInclude = (name) => {
        if (!name) return false;
        return mustIncludeNames.some(m => m.trim().toLowerCase() === name.trim().toLowerCase());
    };
    
    const pases = [
        { minQtyAllowed: 2, label: "Remoción legendaria/Redundante alta", select: (c) => obtenerPrioridadDeRecorte(c) >= 45 },
        { minQtyAllowed: 2, label: "Cantrips/Robo/Utilidad redundante", select: (c) => {
            const p = obtenerPrioridadDeRecorte(c);
            return p >= 30 && p < 45;
        }},
        { minQtyAllowed: 2, label: "Interacción común redundante", select: (c) => {
            const p = obtenerPrioridadDeRecorte(c);
            return p >= 25 && p < 30;
        }},
        { minQtyAllowed: 1, label: "Staples sagrados y ajustes secundarios", select: (c) => {
            const p = obtenerPrioridadDeRecorte(c);
            return p >= 15 && p < 25;
        }},
        { minQtyAllowed: 1, label: "Último recurso", select: (c) => obtenerPrioridadDeRecorte(c) < 15 }
    ];
    
    for (let pase of pases) {
        if (excess <= 0) break;
        
        let candidates = spells.filter(c => pase.select(c) && c.quantity > pase.minQtyAllowed && !isMustInclude(c.name));
        candidates.sort((a, b) => b.cmc - a.cmc);
        
        for (let cand of candidates) {
            if (excess <= 0) break;
            const toReduce = Math.min(cand.quantity - pase.minQtyAllowed, excess);
            if (toReduce > 0) {
                cand.quantity -= toReduce;
                excess -= toReduce;
                const logMsg = `[JUEZ RECORTE INTELIGENTE] (Rol: ${cand.role}) Reduciendo ${toReduce} copias de la carta genérica "${cand.name}" (${pase.label}). Restante: ${cand.quantity}x`;
                console.log(logMsg);
                if (addLog) addLog(logMsg);
            }
        }
    }
    
    // Si aún hay exceso, recortar de roles protegidos bajando de 4 a 2 copias como máximo extremo
    if (excess > 0) {
        const logWarning = `[JUEZ RECORTE INTELIGENTE] ADVERTENCIA: Se requirieron recortes adicionales sobre roles protegidos para ajustar a los límites matemáticos estrictos de 60 cartas.`;
        console.warn(logWarning);
        if (addLog) addLog(logWarning);
        
        let protectedCandidates = spells.filter(c => esRolProtegido(c.role) && c.quantity > 2 && !isMustInclude(c.name));
        protectedCandidates.sort((a, b) => b.cmc - a.cmc);
        
        for (let cand of protectedCandidates) {
            if (excess <= 0) break;
            const toReduce = Math.min(cand.quantity - 2, excess);
            if (toReduce > 0) {
                cand.quantity -= toReduce;
                excess -= toReduce;
                const logMsg = `[JUEZ RECORTE INTELIGENTE] Recorte excepcional de seguridad: Reduciendo ${toReduce} copias de la carta sagrada "${cand.name}" (Rol: ${cand.role}) de 4x a ${cand.quantity}x.`;
                console.log(logMsg);
                if (addLog) addLog(logMsg);
            }
        }
    }
    
    // Si a pesar de todo sigue habiendo exceso, recortar cualquier cosa que tenga cantidad > 1
    if (excess > 0) {
        for (let spell of spells) {
            if (excess <= 0) break;
            if (isMustInclude(spell.name)) continue; // No tocar las obligatorias
            if (spell.quantity > 1) {
                let toReduce = Math.min(spell.quantity - 1, excess);
                spell.quantity -= toReduce;
                excess -= toReduce;
                const logMsg = `[JUEZ RECORTE INTELIGENTE] Recorte forzado extremo: Reduciendo ${toReduce} copias de "${spell.name}" a 1 copia.`;
                console.log(logMsg);
                if (addLog) addLog(logMsg);
            }
        }
    }
    return spells;
}

/**
 * PASO 4: Juez de Estado Final
 * Esta función asegura que antes de mostrar el mazo al usuario,
 * se cumplan los mínimos de estrategia y haya criaturas válidas.
 */
export async function aplicarJuezFinal(deckResult, dnaData, formData, addLog, ragPool = [], preserveLands = false, spellAuditOnly = false) {
    let { cards } = deckResult;
    const strategyObj = MTG_STRATEGIES.find(s => s.id === formData?.strategy || s.label === formData?.strategy) || null;
    let strategyId = strategyObj ? strategyObj.id : (formData?.strategy || '');
    strategyId = inferStrategyFromArchetype(formData?.archetype, strategyId);
    const tribeObj = MTG_TRIBES.find(t => t.id === formData?.tribe || t.label === formData?.tribe) || null;
    const tribeId = tribeObj ? tribeObj.id : (formData?.tribe || '');
    const colors = new Set(formData?.colores || []);
    
    const archLower = (formData?.archetype || '').toLowerCase();
    const strategyLower = (formData?.strategy || '').toLowerCase();
    const fullDesc = `${archLower} ${strategyLower}`;

    const isControl = fullDesc.includes('control');
    const isTempo = fullDesc.includes('tempo');
    const isAggro = fullDesc.includes('aggro') || fullDesc.includes('burn') || fullDesc.includes('red deck wins');
    const isCombo = fullDesc.includes('combo') || fullDesc.includes('storm') || fullDesc.includes('reanimator') || fullDesc.includes('dredge') || fullDesc.includes('creativity');
    const isMidrange = fullDesc.includes('midrange') || (!isControl && !isTempo && !isAggro && !isCombo);
    const hasTribe = !!(tribeId && tribeId !== 'none' && tribeId !== 'ninguna');
    
    // 0. LOCAL HELPER FUNCTIONS
    const esRolProtegido = (r) => {
        if (!r) return false;
        const protectedRoles = [
            "combo_enabler", "combo_pieces", "combo_enablers", "reanimation_spells", "reanimation_creature_targets",
            "team_anthem_buffs", "etb_value_creatures", "auras_and_enchantments",
            "graveyard_payoffs", "cheap_threats"
        ];
        if (protectedRoles.includes(r)) return true;
        if (r.includes("finisher") || r.includes("win_cond") || r.includes("combo_piece")) return true;
        return false;
    };

    const inyectarCartaDirecta = (list, newCard) => {
        if (!newCard.name) return list;
        const nameClean = newCard.name.trim();
        const existing = list.find(c => c.name.trim().toLowerCase() === nameClean.toLowerCase());
        const maxLimit = getMaxAllowedCopies(nameClean, newCard.category, newCard.cmc, ragPool);
        if (existing) {
            existing.quantity = Math.min(maxLimit, existing.quantity + newCard.quantity);
            return list;
        }
        list.push({ ...newCard, name: nameClean, quantity: Math.min(maxLimit, newCard.quantity) });
        return list;
    };

    const removerCarta = (list, cardName, qty = 99) => {
        const existingIdx = list.findIndex(c => c.name.toLowerCase() === cardName.toLowerCase());
        if (existingIdx !== -1) {
            const card = list[existingIdx];
            if (card.quantity <= qty) {
                list.splice(existingIdx, 1);
            } else {
                card.quantity -= qty;
            }
        }
        return list;
    };

    const getCappedCardsList = () => {
        const list = [];
        cards.forEach(existCard => {
            const limit = getMaxAllowedCopies(existCard.name, existCard.category, existCard.cmc, ragPool);
            if (existCard.quantity >= limit) {
                list.push(existCard.name.toLowerCase());
            }
        });
        return list;
    };

    // =========================================================================
    // ⚔️ EL CUERPO SUPREMO DE LEYES DEL PRO TOUR (AUDITORÍA DE INCOMPATIBILIDADES)
    // =========================================================================
    
    // A. EXCLUSIÓN DE CARTAS DE ODIO ESTRECHO DEL MAINDECK AL SIDEBOARD
    const narrowHateCards = ["rest in peace", "surgical extraction", "leyline of the void", "tormod's crypt", "grafdigger's cage", "stony silence"];
    let hateCardsFound = [];
    cards = cards.filter(c => {
        if (c.category !== 'Land' && narrowHateCards.includes(c.name.toLowerCase())) {
            hateCardsFound.push(c);
            return false; // Quitar del Maindeck
        }
        return true;
    });

    if (hateCardsFound.length > 0) {
        const totalHateQty = hateCardsFound.reduce((sum, h) => sum + h.quantity, 0);
        const logHate = `[JUEZ PRO TOUR] Odio estrecho en Maindeck detectado (${hateCardsFound.map(h => `${h.quantity}x ${h.name}`).join(', ')}). Moviéndolo al Sideboard dinámicamente y rellenando con interacción genérica.`;
        console.log(logHate);
        if (addLog) addLog(logHate);

        // Rellenar con interacción genérica
        const excludeHate = [...narrowHateCards];
        cards.forEach(existCard => {
            const limit = getMaxAllowedCopies(existCard.name, existCard.category, existCard.cmc, ragPool);
            if (existCard.quantity >= limit) {
                excludeHate.push(existCard.name.toLowerCase());
            }
        });
        const rep = obtenerMejorCartaDeRemplazo("Instant", 1, Array.from(colors), formData?.format, ragPool, excludeHate);
        cards = inyectarCartaDirecta(cards, { name: rep.name, quantity: totalHateQty, category: rep.category, cmc: rep.cmc, role: "interaction" }, ragPool);
    }

    // B. COMPATIBILIDAD DE STONEFORGE MYSTIC
    const hasStoneforge = cards.some(c => c.name.toLowerCase() === "stoneforge mystic");
    if (hasStoneforge) {
        const equipments = ["sword of fire and ice", "shadowspear", "batterskull", "kaldra compleat", "colossus hammer", "sword of feast and famine"];
        const hasEquip = cards.some(c => equipments.includes(c.name.toLowerCase()));
        if (!hasEquip) {
            const logStone = `[JUEZ PRO TOUR] Stoneforge Mystic detectada sin equipos en Maindeck. Inyectando suite de equipos obligatorios para evitar carta muerta.`;
            console.log(logStone);
            if (addLog) addLog(logStone);

            cards = inyectarCartaDirecta(cards, { name: "Sword of Fire and Ice", quantity: 1, category: "Artifact", cmc: 3, role: "equipment" });
            cards = inyectarCartaDirecta(cards, { name: "Shadowspear", quantity: 1, category: "Artifact", cmc: 1, role: "equipment" });
            
            let purgedCount = 0;
            const highCmcThreats = cards.filter(c => c.category !== 'Land' && c.cmc >= 3 && !esRolProtegido(c.role) && c.quantity > 1);
            for (let tc of highCmcThreats) {
                if (purgedCount >= 2) break;
                tc.quantity -= 1;
                purgedCount += 1;
            }
        }
    }

    // C. COMPATIBILIDAD DE REANIMATOR CON PERSIST
    const hasPersist = cards.some(c => c.name.toLowerCase() === "persist");
    if (hasPersist && strategyId === 'reanimator') {
        const giants = cards.filter(c => c.category === 'Creature' && c.cmc >= 6);
        const hasNonLegendaryGiant = giants.some(c => !["atraxa, grand unifier", "griselbrand", "sheoldred, the apocalypse", "koma, cosmos serpent"].includes(c.name.toLowerCase()));
        if (!hasNonLegendaryGiant) {
            const logPersist = `[JUEZ PRO TOUR] El mazo usa "Persist" (solo reanima NO-legendarias) pero solo tiene payoffs legendarios. Inyectando "Archon of Cruelty" para asegurar consistencia del combo.`;
            console.log(logPersist);
            if (addLog) addLog(logPersist);

            cards = inyectarCartaDirecta(cards, { name: "Archon of Cruelty", quantity: 2, category: "Creature", cmc: 8, role: "reanimation_creature_targets" });
            
            let purgedLegendaries = 0;
            const legendaries = cards.filter(c => c.category === 'Creature' && c.cmc >= 6 && c.name.toLowerCase() !== "archon of cruelty");
            for (let leg of legendaries) {
                if (purgedLegendaries >= 2) break;
                const take = Math.min(leg.quantity, 2 - purgedLegendaries);
                leg.quantity -= take;
                purgedLegendaries += take;
            }
            cards = cards.filter(c => c.quantity > 0);
        }
    }

    // === REGLA H: VETO A CRIATURAS GIGANTES INCASTEABLES (UNCASTABLE CREATURES) ===
    const allowedHeavyStrategies = ['reanimator', 'ramp', 'tron', 'landfall'];
    const isHeavyStrategy = allowedHeavyStrategies.includes(strategyId) ||
                            allowedHeavyStrategies.some(s => archLower.includes(s)) ||
                            (tribeId && tribeId !== 'none' && tribeId !== 'ninguna' && ['sea_monsters', 'eldrazi', 'dragons', 'dinosaurs'].includes(tribeId.toLowerCase()));
    
    if (!isHeavyStrategy) {
        const mustIncludeNamesList = parseUserRulesString(formData?.mustInclude || '').map(item => item.name.toLowerCase());
        
        // Encontrar criaturas de CMC >= 6 que no sean must-includes
        const uncastables = cards.filter(c => c.category === 'Creature' && c.cmc >= 6 && !mustIncludeNamesList.includes(c.name.toLowerCase()) && c.role !== 'must-include');
        
        for (const c of uncastables) {
            const qty = c.quantity;
            const logUncastable = `[JUEZ PRO TOUR] Veto de Criatura Gigante: Criatura pesada incasteable "${c.name}" (CMC ${c.cmc}) interceptada en estrategia "${strategyId || 'desconocida'}". Transmutando a staple eficiente de coste bajo/medio.`;
            console.log(logUncastable);
            if (addLog) addLog(logUncastable);
            
            // Remover la criatura incasteable
            cards = removerCarta(cards, c.name, qty);
            
            // Excluir de la búsqueda el propio nombre y cualquier carta que ya esté al máximo
            const excludeNames = [c.name.toLowerCase(), ...getCappedCardsList()];
            
            // Decidir si reemplazamos por un hechizo reactivo (Instant) de coste 1-2 o criatura de coste 2-3
            const replacementCategory = Math.random() > 0.5 ? "Creature" : "Instant";
            const targetCmc = replacementCategory === "Creature" ? 2 : 1;
            
            const rep = obtenerMejorCartaDeRemplazo(replacementCategory, targetCmc, Array.from(colors), formData?.format, ragPool, excludeNames);
            cards = inyectarCartaDirecta(cards, {
                name: rep.name,
                quantity: qty,
                category: rep.category,
                cmc: rep.cmc,
                role: "utility"
            });
        }
    }

    // D. COMPATIBILIDAD DE DELIRIO CON MISHRA'S BAUBLE
    const hasDelirium = cards.some(c => c.name.toLowerCase() === "dragon's rage channeler" || c.name.toLowerCase() === "tarmogoyf");
    if (hasDelirium && (strategyId === 'graveyard' || strategyId === 'delirium')) {
        const hasBauble = cards.some(c => c.name.toLowerCase() === "mishra's bauble");
        if (!hasBauble) {
            const logDelirium = `[JUEZ PRO TOUR] Mazo de Delirium detectado sin Mishra's Bauble. Inyectando 4x Mishra's Bauble para acelerar cementerio gratis.`;
            console.log(logDelirium);
            if (addLog) addLog(logDelirium);

            cards = inyectarCartaDirecta(cards, { name: "Mishra's Bauble", quantity: 4, category: "Artifact", cmc: 0, role: "delirium_enabler" });

            let purgedCount = 0;
            const lowPrioritySpells = cards.filter(c => c.category !== 'Land' && c.cmc >= 2 && !esRolProtegido(c.role) && c.quantity > 1);
            for (let lp of lowPrioritySpells) {
                if (purgedCount >= 4) break;
                const take = Math.min(lp.quantity - 1, 4 - purgedCount);
                lp.quantity -= take;
                purgedCount += take;
            }
            cards = cards.filter(c => c.quantity > 0);
        }
    }

    // E. AUDITORÍA DE ANTI-SINERGIAS COMPETITIVAS (COMPETITIVE_ANTI_SYNERGIES)
    COMPETITIVE_ANTI_SYNERGIES.forEach(anti => {
        const hasCard = cards.some(c => c.name.toLowerCase() === anti.card.toLowerCase());
        const hasConflict = strategyId.toLowerCase() === anti.strategy.toLowerCase() || 
                            (formData?.archetype || '').toLowerCase().includes(anti.strategy.toLowerCase());
        
        if (hasCard && hasConflict) {
            const existingIdx = cards.findIndex(c => c.name.toLowerCase() === anti.card.toLowerCase());
            if (existingIdx !== -1) {
                const qty = cards[existingIdx].quantity;
                const logAnti = `[JUEZ PRO TOUR] Veto de Antisinersia: Interceptada "${anti.card}" en estrategia "${anti.strategy}". Motivo: ${anti.reason}. Reemplazada por "${anti.replacement}".`;
                console.log(logAnti);
                if (addLog) addLog(logAnti);

                cards.splice(existingIdx, 1);
                cards = inyectarCartaDirecta(cards, { name: anti.replacement, quantity: qty, category: "Creature", cmc: 2, role: "synergy_fix" });
            }
        }
    });

    // F. SOPORTE DE DOMAIN PARA LEYLINE BINDING
    const hasLeylineBinding = cards.some(c => c.name.toLowerCase() === "leyline binding");
    if (hasLeylineBinding && colors.size >= 2 && !spellAuditOnly && !preserveLands) {
        const triomes = ["Raffine's Tower", "Xander's Lounge", "Ziatora's Proving Ground", "Jetmir's Garden", "Spara's Headquarters", "Indatha Triome", "Ketria Triome", "Raugrin Triome", "Savai Triome", "Zagoth Triome"];
        const hasTriome = cards.some(c => c.category === 'Land' && triomes.includes(c.name));
        if (!hasTriome) {
            const complementTriome = colors.has("W") && colors.has("U") && colors.has("B") ? "Ziatora's Proving Ground" : "Spara's Headquarters";
            const logDomain = `[JUEZ PRO TOUR] Leyline Binding detectado sin Trioma de soporte. Inyectando 1x "${complementTriome}" para acelerar el Domain.`;
            console.log(logDomain);
            if (addLog) addLog(logDomain);

            const basicLandsList = cards.filter(c => c.category === 'Land' && ["plains", "island", "swamp", "mountain", "forest"].includes(c.name.toLowerCase()));
            if (basicLandsList.length > 0) {
                basicLandsList[0].quantity -= 1;
                cards.push({ name: complementTriome, quantity: 1, category: "Land", type_line: "Land — Triome", color_identity: ["G", "W", "U"] });
            }
            cards = cards.filter(c => c.quantity > 0);
        }
    }

    // G. PROTECCIÓN CONTRA BLOOD MOON EN MAZOS MULTICOLORES (3+ COLORES)
    if (colors.size >= 3 && !hasTribe && (formData?.format || '').toUpperCase() !== 'STANDARD' && !spellAuditOnly && !preserveLands) {
        const basicLands = cards.filter(c => c.category === 'Land' && ["plains", "island", "swamp", "mountain", "forest"].includes(c.name.toLowerCase()));
        const uniqueBasics = new Set(basicLands.map(b => b.name.toLowerCase()));
        
        let basicsToAdd = [];
        if (colors.has("G") && !uniqueBasics.has("forest")) basicsToAdd.push("Forest");
        if (colors.has("U") && !uniqueBasics.has("island")) basicsToAdd.push("Island");
        if (colors.has("B") && !uniqueBasics.has("swamp")) basicsToAdd.push("Swamp");

        if (basicsToAdd.length > 0) {
            const logMoon = `[JUEZ PRO TOUR] Mazo de 3+ colores vulnerable a Blood Moon. Inyectando tierras básicas críticas: ${basicsToAdd.join(', ')}.`;
            console.log(logMoon);
            if (addLog) addLog(logMoon);

            basicsToAdd.forEach(basicName => {
                const duals = cards.filter(c => c.category === 'Land' && !["plains", "island", "swamp", "mountain", "forest"].includes(c.name.toLowerCase()) && c.quantity > 1);
                if (duals.length > 0) {
                    duals[0].quantity -= 1;
                    cards = inyectarCartaDirecta(cards, { name: basicName, quantity: 1, category: "Land", cmc: 0 });
                }
            });
            cards = cards.filter(c => c.quantity > 0);
        }
    }

    const obtenerColorDeCarta = (cardName) => {
        const nameLower = cardName.toLowerCase();
        const blackStaples = ["grief", "fatal push", "thoughtseize", "inquisition", "orcish bowmasters", "reanimat", "persist", "not dead after all", "archon of cruelty", "sheoldred", "drown in the loch", "blood artist", "zulaport", "yawgmoth", "takenuma", "damnation", "go for the throat", "dismember"];
        const blueStaples = ["subtlety", "counterspell", "spell pierce", "mana leak", "consider", "preordain", "brainstorm", "ponder", "murktide regent", "tidebinder mage", "brazen borrower", "otawara", "lorien revealed", "expressive iteration", "archmage's charm", "cryptic command"];
        const redStaples = ["fury", "lightning bolt", "unholy heat", "dragon's rage channeler", "ragavan", "fable of the mirror-breaker", "sokenzan", "expressive iteration", "goblin", "shaman", "pyromancer", "wrenn and six"];
        const greenStaples = ["endurance", "tarmogoyf", "hardened scales", "boseiju", "dryad of the ilysian grove", "primeval titan", "amulet of vigor", "summoner's pact", "noble hierarch", "ignoble hierarch", "birds of paradise", "llanowar elves", "elvish", "veil of summer", "haywire mite", "up the beanstalk", "lead the stampede"];
        const whiteStaples = ["solitude", "swords to plowshares", "path to exile", "prismatic ending", "supreme verdict", "esper sentinel", "thalia", "eiganjo", "ephemerate", "stoneforge mystic", "colossus hammer", "sigarda's aid", "puresteel paladin", "soul warden", "soul's attendant", "drannith magistrate", "archon of emeria", "surge of salvation"];
        
        if (blackStaples.some(st => nameLower.includes(st))) return "B";
        if (blueStaples.some(st => nameLower.includes(st))) return "U";
        if (redStaples.some(st => nameLower.includes(st))) return "R";
        if (greenStaples.some(st => nameLower.includes(st))) return "G";
        if (whiteStaples.some(st => nameLower.includes(st))) return "W";
        return null;
    };

    const getCardColorFromPool = (cardName) => {
        const fromPool = ragPool.find(c => c.name.toLowerCase() === cardName.toLowerCase());
        if (fromPool && fromPool.colors) {
            return fromPool.colors;
        }
        const guessed = obtenerColorDeCarta(cardName);
        return guessed ? [guessed] : [];
    };

    const getDynamicModernReanimateSpell = () => {
        if (colors.has("B") && colors.has("W")) {
            return { name: "Priest of Fell Rites", cmc: 2, category: "Creature" };
        }
        if (colors.has("B")) {
            return { name: "Persist", cmc: 2, category: "Sorcery" };
        }
        if (colors.has("W")) {
            return { name: "Late to Dinner", cmc: 4, category: "Sorcery" };
        }
        return { name: "Persist", cmc: 2, category: "Sorcery" };
    };

    const logMsg = `[JUEZ FINAL] Iniciando auditoría bajo 12 Dimensiones Pro Tour.`;
    console.log(logMsg);
    if (addLog) addLog(logMsg);

    // 0.5. Reemplazar cualquier carta de reanimación Legacy no permitida en Modern de forma dinámica
    const reanimateLegacyNames = ["animate dead", "exhume", "reanimate", "necromancy", "dance of the dead", "dread return"];
    cards = cards.map(c => {
        if (reanimateLegacyNames.includes(c.name.toLowerCase())) {
            const dynamicReanimator = getDynamicModernReanimateSpell();
            const logMsgSub = `⚠️ Juez: Carta legacy "${c.name}" interceptada. Transmutando a Modern: "${dynamicReanimator.name}"`;
            console.warn(logMsgSub);
            if (addLog) addLog(logMsgSub);
            return {
                ...c,
                name: dynamicReanimator.name,
                cmc: dynamicReanimator.cmc,
                category: dynamicReanimator.category,
                role: "reanimation_spells"
            };
        }
        return c;
    });

    // =========================================================================
    // ⚔️ TACTICAL OPTIMIZATION: SEA MONSTERS (TERRORES MARINOS)
    // =========================================================================
    if (tribeId === 'sea_monsters' || formData?.tribe === 'sea_monsters') {
        const logSea = `[JUEZ SEA MONSTERS] Iniciando optimización dedicada para Terrores Marinos (Simic Control/Ramp).`;
        console.log(logSea);
        if (addLog) addLog(logSea);

        // 1. Clasificar criaturas y hechizos del main deck
        let nonLands = cards.filter(c => c.category !== 'Land');
        let finishers = nonLands.filter(c => c.category === 'Creature' && c.cmc >= 5);
        let earlyAction = nonLands.filter(c => c.cmc <= 2);

        let finishersCount = finishers.reduce((sum, c) => sum + c.quantity, 0);
        let earlyActionCount = earlyAction.reduce((sum, c) => sum + c.quantity, 0);

        const logState = `[JUEZ SEA MONSTERS] Estado inicial: ${finishersCount}x Finishers pesados (CMC >= 5), ${earlyActionCount}x Acciones tempranas (CMC <= 2).`;
        console.log(logState);
        if (addLog) addLog(logState);

        // 2. Control estricto de finishers (Cap a 8 finishers en total en Maindeck)
        const MAX_FINISHERS = 8;
        if (finishersCount > MAX_FINISHERS) {
            let excess = finishersCount - MAX_FINISHERS;
            const logExcess = `[JUEZ SEA MONSTERS] Exceso de finishers detectado (${finishersCount}/${MAX_FINISHERS}). Prunando ${excess} copias...`;
            console.log(logExcess);
            if (addLog) addLog(logExcess);

            // Ordenar finishers por CMC descendente para podar los más pesados primero
            finishers.sort((a, b) => b.cmc - a.cmc);

            for (let f of finishers) {
                if (excess <= 0) break;
                // Dejar siempre al menos 1 copia para no borrar la carta por completo si es de 1x
                const canReduce = Math.max(0, f.quantity - 1);
                if (canReduce > 0) {
                    const reduce = Math.min(canReduce, excess);
                    f.quantity -= reduce;
                    excess -= reduce;
                    const logRed = `   * Reduciendo ${reduce}x "${f.name}" (Queda: ${f.quantity}x)`;
                    console.log(logRed);
                    if (addLog) addLog(logRed);
                }
            }

            // Si aún hay exceso, permitimos reducir a 0 si es necesario
            if (excess > 0) {
                for (let f of finishers) {
                    if (excess <= 0) break;
                    if (f.quantity > 0) {
                        const reduce = Math.min(f.quantity, excess);
                        f.quantity -= reduce;
                        excess -= reduce;
                        const logDel = `   * Podando por completo ${reduce}x "${f.name}" para estabilizar curva`;
                        console.log(logDel);
                        if (addLog) addLog(logDel);
                    }
                }
            }

            // Quitar del mazo las cartas que quedaron en cantidad 0
            cards = cards.filter(c => c.quantity > 0);
        }

        // 3. Forzar un mínimo de early-game accelerators / interaction (Mínimo 10 cartas de CMC <= 2)
        const MIN_EARLY_ACTION = 10;
        // Recalcular early action tras la poda
        nonLands = cards.filter(c => c.category !== 'Land');
        earlyAction = nonLands.filter(c => c.cmc <= 2);
        earlyActionCount = earlyAction.reduce((sum, c) => sum + c.quantity, 0);

        if (earlyActionCount < MIN_EARLY_ACTION) {
            const gap = MIN_EARLY_ACTION - earlyActionCount;
            const logGap = `[JUEZ SEA MONSTERS] Déficit de early action (${earlyActionCount}/${MIN_EARLY_ACTION}). Inyectando ${gap} aceleradores/cantrips.`;
            console.log(logGap);
            if (addLog) addLog(logGap);

            // Decidir qué inyectar según colores disponibles
            let rampCard = { name: "Llanowar Elves", cmc: 1, category: "Creature", role: "ramp" };
            let controlCard = { name: "Counterspell", cmc: 2, category: "Instant", role: "interaction" };

            if (colors.has("G") && colors.has("U")) {
                rampCard = { name: "Growth Spiral", cmc: 2, category: "Instant", role: "ramp" };
            } else if (colors.has("G")) {
                rampCard = { name: "Birds of Paradise", cmc: 1, category: "Creature", role: "ramp" };
            } else if (colors.has("U")) {
                rampCard = { name: "Preordain", cmc: 1, category: "Sorcery", role: "cantrip" };
            }

            // Inyectar el gap repartido
            const halfGap = Math.ceil(gap / 2);
            const secondHalf = gap - halfGap;

            cards = inyectarCartaDirecta(cards, { ...rampCard, quantity: halfGap });
            cards = inyectarCartaDirecta(cards, { ...controlCard, quantity: secondHalf });

            const logInj = `   * Inyectados exitosamente: ${halfGap}x "${rampCard.name}" y ${secondHalf}x "${controlCard.name}".`;
            console.log(logInj);
            if (addLog) addLog(logInj);
        }
    }

    // 0.7. ESTRICTO CONTROL DE IDENTIDAD DE COLOR (PRO TOUR DIMENSIÓN C)
    if (colors.size > 0) {
        const logColorStart = `[JUEZ COLOR] Validando identidad de color de los hechizos contra: [${Array.from(colors).join(", ")}]`;
        console.log(logColorStart);
        if (addLog) addLog(logColorStart);

        cards = cards.map(c => {
            if (c.category === 'Land') return c;

            // Determinar colores
            const cardColors = getCardColorFromPool(c.name);
            const isColorless = cardColors.length === 0;
            
            // Si la carta tiene colores, verificar que todos estén en allowed colors
            const hasOffColor = !isColorless && cardColors.some(col => !colors.has(col));
            
            // También comprobar si la carta no está en el RAG pool y no está en nuestra lista de staples conocidos de este color
            const inPool = ragPool.some(p => p.name.toLowerCase() === c.name.toLowerCase());
            const isKnownStaple = obtenerColorDeCarta(c.name) !== null;
            
            // Si no está en el RAG pool y no es un staple conocido, es una posible alucinación fuera de color.
            // Para evitar falsos positivos con cartas incoloras o de utilidad genérica, permitimos cartas si no tienen color conocido.
            const isInvalid = hasOffColor || (!inPool && !isKnownStaple && !isColorless);

            if (isInvalid) {
                const isCreature = c.category === 'Creature';
                
                // Buscar reemplazo en el RAG pool que coincida con el tipo (Criatura/Hechizo) y NO sea Emeritus
                const replacementPool = ragPool.filter(poolCard => {
                    const poolCardIsCreature = (poolCard.type_line || '').toLowerCase().includes('creature');
                    const isEmeritus = poolCard.name.toLowerCase().includes('emeritus');
                    
                    if (isEmeritus) return false;
                    
                    let tribalMatchValid = true;
                    if (isCreature && poolCardIsCreature && hasTribe) {
                        const typeLower = (poolCard.type_line || '').toLowerCase();
                        const activeTribalSubtypes = MTG_TRIBES.find(t => t.id === tribeId)?.subtypes || [];
                        tribalMatchValid = activeTribalSubtypes.some(sub => typeLower.includes(sub));
                    }

                    return poolCardIsCreature === isCreature && 
                           poolCard.name.toLowerCase() !== c.name.toLowerCase() && 
                           tribalMatchValid;
                });
                
                // Ordenar por cercanía de CMC y score RAG
                replacementPool.sort((a, b) => {
                    const diffA = Math.abs((a.mana_value || 0) - c.cmc);
                    const diffB = Math.abs((b.mana_value || 0) - c.cmc);
                    if (diffA !== diffB) return diffA - diffB;
                    return (b.score || 0) - (a.score || 0);
                });
                
                let replacementName = "";
                let repCmc = c.cmc;
                let repCat = c.category;
                
                if (replacementPool.length > 0) {
                    const repCard = replacementPool[0];
                    replacementName = repCard.name;
                    repCmc = repCard.mana_value || c.cmc;
                    repCat = repCard.type_line ? repCard.type_line.split('—')[0].trim() : c.category;
                } else {
                    // Fallbacks directos si el pool RAG está vacío o no coincide
                    const rep = obtenerMejorCartaDeRemplazo(isCreature ? "Creature" : "Instant", c.cmc, Array.from(colors), formData?.format, [], [c.name]);
                    replacementName = rep.name;
                    repCmc = rep.cmc;
                    repCat = rep.category;
                }
                
                const logMsgColors = `⚠️ [JUEZ COLOR] Interceptada carta inválida/off-color "${c.name}" (Colores conocidos: [${cardColors.join(",")}]). Transmutando a "${replacementName}" (${repCat}, CMC ${repCmc})`;
                console.warn(logMsgColors);
                if (addLog) addLog(logMsgColors);
                
                return {
                    ...c,
                    name: replacementName,
                    cmc: repCmc,
                    category: repCat
                };
            }
            return c;
        });
    }
    // 0.8. INTEGRIDAD TRIBAL (PUREZA DINÁMICA)
    if (hasTribe) {
        let purityLevel = 'standard';
        const tribeLower = tribeId.toLowerCase();
        if (tribeLower.includes('sliver')) {
            purityLevel = 'strict';
        } else if (strategyId === 'ramp' || strategyId === 'reanimator' || strategyId === 'combo') {
            purityLevel = 'hybrid';
        }

        const activeTribalSubtypes = tribeObj?.subtypes ? tribeObj.subtypes.map(s => s.toLowerCase()) : [];
        
        const logTribalStart = `[JUEZ TRIBAL] Iniciando auditoría tribal. Nivel de pureza dinámico: ${purityLevel.toUpperCase()}`;
        console.log(logTribalStart);
        if (addLog) addLog(logTribalStart);

        cards = cards.map(c => {
            if (c.category !== 'Creature') return c; // Solo validamos criaturas
            
            const poolCard = ragPool.find(p => p.name.toLowerCase() === c.name.toLowerCase());
            let typeLine = poolCard && poolCard.type_line ? poolCard.type_line.toLowerCase() : '';
            let oracleText = poolCard && poolCard.oracle_text ? poolCard.oracle_text.toLowerCase() : '';
            
            // Alucinación o carta no indexada
            if (!poolCard) {
                typeLine = ''; // Fuerza evaluación como no-tribal
            }

            const hasTribalSubtype = activeTribalSubtypes.some(sub => typeLine.includes(sub)) || typeLine.includes('changeling') || typeLine.includes('shapeshifter');
            
            let isInvalid = false;
            let invalidReason = '';

            const isEmeritus = c.name.toLowerCase().includes('emeritus');

            if (isEmeritus && purityLevel === 'strict') {
                 isInvalid = true;
                 invalidReason = 'Rechazo directo de Emeritus en mazo puro';
            } else if (!hasTribalSubtype) {
                if (purityLevel === 'strict') {
                    isInvalid = true;
                    invalidReason = 'Pureza estricta exige 100% de la tribu';
                } else if (purityLevel === 'hybrid') {
                    const cmc = c.cmc || 0;
                    const isDork = cmc <= 2 && oracleText.includes('add ');
                    const isGiantPayoff = cmc >= 6;
                    if (!isDork && !isGiantPayoff) {
                        isInvalid = true;
                        invalidReason = 'Intruso de coste medio en pureza híbrida';
                    }
                }
            }

            if (isInvalid) {
                // Reemplazar la carta por un equivalente de la tribu o hechizo interactivo
                const cardColors = getCardColorFromPool(c.name);
                
                // Buscar reemplazo TRIBAL en el RAG pool
                const replacementPool = ragPool.filter(pCard => {
                    const pTypeLower = (pCard.type_line || '').toLowerCase();
                    const isPCreature = pTypeLower.includes('creature');
                    const hasPSubtype = activeTribalSubtypes.some(sub => pTypeLower.includes(sub)) || pTypeLower.includes('changeling') || pTypeLower.includes('shapeshifter');
                    const pIsEmeritus = pCard.name.toLowerCase().includes('emeritus');
                    
                    // Asegurarnos de que el reemplazo comparte al menos un color con la original (o la original es incolora)
                    const pColors = pCard.colors || [];
                    const matchesColor = cardColors.length === 0 || cardColors.some(col => pColors.includes(col)) || pColors.length === 0;

                    return isPCreature && hasPSubtype && !pIsEmeritus && pCard.name.toLowerCase() !== c.name.toLowerCase() && matchesColor;
                });

                // Ordenar por cercanía de CMC y score
                replacementPool.sort((a, b) => {
                    const diffA = Math.abs((a.mana_value || 0) - c.cmc);
                    const diffB = Math.abs((b.mana_value || 0) - c.cmc);
                    if (diffA !== diffB) return diffA - diffB;
                    return (b.score || 0) - (a.score || 0);
                });

                let replacementName = "";
                let repCmc = c.cmc;
                let repCat = "Creature";

                if (replacementPool.length > 0) {
                    replacementName = replacementPool[0].name;
                    repCmc = replacementPool[0].mana_value || c.cmc;
                } else {
                    // Si no hay reemplazo tribal válido, usar un hechizo interactivo de la identidad de color permitida
                    const rep = obtenerMejorCartaDeRemplazo("Instant", 1, Array.from(colors), formData?.format, [], [c.name]);
                    replacementName = rep.name;
                    repCmc = rep.cmc;
                    repCat = rep.category;
                }

                const logMsgTribal = `🛡️ [JUEZ TRIBAL] ${invalidReason}: Criatura intrusa "${c.name}" (o alucinación) transmutada a "${replacementName}" (${repCat}, CMC ${repCmc})`;
                console.warn(logMsgTribal);
                if (addLog) addLog(logMsgTribal);

                return {
                    ...c,
                    name: replacementName,
                    cmc: repCmc,
                    category: repCat
                };
            }

            return c;
        });
    }

    // === DIMENSIÓN K: EVOKE PITCH MATH ===
    const evokeElementals = {
        "grief": { color: "B", fallbacks: ["Thoughtseize", "Fatal Push"] },
        "solitude": { color: "W", fallbacks: ["Path to Exile", "Prismatic Ending"] },
        "fury": { color: "R", fallbacks: ["Lightning Bolt", "Unholy Heat"] },
        "subtlety": { color: "U", fallbacks: ["Spell Pierce", "Counterspell"] },
        "endurance": { color: "G", fallbacks: ["Veil of Summer", "Tarmogoyf"] }
    };

    cards = cards.map(c => {
        const nameLower = c.name.toLowerCase();
        if (evokeElementals[nameLower]) {
            const config = evokeElementals[nameLower];
            // Contar otras cartas de ese color
            const otherColorSpells = cards.filter(other => {
                if (other.name.toLowerCase() === nameLower) return false;
                if (other.category === 'Land') return false;
                const otherColors = getCardColorFromPool(other.name);
                return otherColors.includes(config.color);
            });
            const otherCount = otherColorSpells.reduce((sum, s) => sum + s.quantity, 0);
            if (otherCount < 14) {
                const fallbackName = config.fallbacks[0];
                const logMsgK = `[DIMENSIÓN K] Evoke Pitch Deficit: "${c.name}" requiere >=14 otras cartas ${config.color} (actual: ${otherCount}). Transmutando a "${fallbackName}"`;
                console.log(logMsgK);
                if (addLog) addLog(logMsgK);
                return {
                    ...c,
                    name: fallbackName,
                    cmc: 1,
                    category: fallbackName === "Thoughtseize" ? "Sorcery" : "Instant",
                    role: "interaction"
                };
            }
        }
        return c;
    });

    // === DIMENSIÓN F: CASTING COST EFFICIENCY ===
    cards = cards.map(c => {
        if (c.category !== 'Land' && c.cmc >= 5) {
            const nameLower = c.name.toLowerCase();
            const cheatableKeywords = [
                "murktide", "grief", "solitude", "fury", "subtlety", "endurance",
                "sojourner", "myr enforcer", "frogmite", "binding", "kaldra", "batterskull",
                "archon of cruelty", "atraxa", "griselbrand", "primeval titan", "wurmcoil engine", "ulamog", "kozilek", "emrakul", "force of will", "force of negation"
            ];
            const isCheatable = cheatableKeywords.some(kw => nameLower.includes(kw)) ||
                (strategyId === 'reanimator') ||
                (strategyId === 'graveyard') ||
                (strategyId === 'ramp' && c.cmc >= 6) ||
                (c.role && (c.role.includes("finisher") || c.role.includes("win_con") || c.role.includes("top_end"))) ||
                (isControl && c.category === 'Creature'); // Control legitima criaturas CMC≥5 como finishers (Koma, Hullbreaker, Toxrill)

            if (!isCheatable) {
                const primaryColor = getCardColorFromPool(c.name)[0] || "B";
                const rep = obtenerMejorCartaDeRemplazo("Instant", 1, [primaryColor], formData?.format, ragPool, [c.name]);
                let replacement = rep.name;
                let repCmc = rep.cmc;
                let repCat = rep.category;

                const logMsgF = `[DIMENSIÓN F] Purga de Coste Pesado Subóptimo: "${c.name}" (CMC ${c.cmc}) no es trampeable. Transmutando a "${replacement}" (CMC ${repCmc})`;
                console.log(logMsgF);
                if (addLog) addLog(logMsgF);
                return {
                    ...c,
                    name: replacement,
                    cmc: repCmc,
                    category: repCat,
                    role: "utility"
                };
            }
        }
        return c;
    });

    // === DIMENSIÓN B: THREAT-TO-ANSWER RATIOS ===
    const clasificarSpell = (c) => {
        const role = (c.role || '').toLowerCase();
        if (role.includes('threat') || role.includes('win_con') || role.includes('finisher')) return 'Threat';
        if (role.includes('removal') || role.includes('counterspell') || role.includes('board_wipe') || role.includes('interaction') || role.includes('answer') || role.includes('draw') || role.includes('cantrip') || role.includes('utility')) return 'Answer';
        
        const cat = c.category;
        const name = c.name.toLowerCase();
        if (cat === 'Creature' || cat === 'Planeswalker') return 'Threat';
        if (name.includes("colossus hammer") || name.includes("kaldra compleat") || name.includes("batterskull") || name.includes("shark typhoon")) return 'Threat';
        
        return 'Answer';
    };

    let nonLands = cards.filter(c => c.category !== 'Land');
    let totalSpellsQty = nonLands.reduce((sum, c) => sum + c.quantity, 0);

    let targetThreatPct = 0.55; // Default Midrange
    if (isControl) targetThreatPct = hasTribe ? 0.30 : 0.15; // Control decks only need ~5-6 finishers (15%)
    else if (isCombo) targetThreatPct = 0.20; // Combo needs mostly combo pieces and interaction, not generic threats
    else if (isAggro) targetThreatPct = 0.70; // Aggro needs ~70% threats
    else if (isTempo) targetThreatPct = 0.45; // Tempo is right down the middle
    else if (isMidrange) targetThreatPct = 0.55;

    let threatsQty = nonLands.filter(c => clasificarSpell(c) === 'Threat').reduce((sum, c) => sum + c.quantity, 0);
    let answersQty = totalSpellsQty - threatsQty;
    let currentThreatPct = threatsQty / totalSpellsQty;

    const diffB = currentThreatPct - targetThreatPct;
    if (Math.abs(diffB) > 0.08) {
        const logMsgB = `[DIMENSIÓN B] Ratio Desviado: Threat Pct es ${(currentThreatPct * 100).toFixed(1)}% (Objetivo: ${(targetThreatPct * 100).toFixed(0)}%). Ajustando...`;
        console.log(logMsgB);
        if (addLog) addLog(logMsgB);

        if (diffB > 0) {
            // Demasiadas amenazas, inyectar respuestas
            let toReplace = Math.round(diffB * totalSpellsQty);
            const coreEnablers = ["stoneforge", "yawgmoth", "titan", "grief", "solitude", "fury", "scales", "automaton", "ravager"];
            const threatsToReduce = cards.filter(c => c.category !== 'Land' && clasificarSpell(c) === 'Threat' && !esRolProtegido(c.role) && !coreEnablers.some(ce => c.name.toLowerCase().includes(ce)) && c.quantity > 1);
            threatsToReduce.sort((a, b) => b.cmc - a.cmc);

            for (let thr of threatsToReduce) {
                if (toReplace <= 0) break;
                // Allow reducing to 0 to avoid loose 1-off cards
                const reduce = Math.min(thr.quantity, toReplace);
                thr.quantity -= reduce;
                toReplace -= reduce;
            }

            // Aumentar copias de respuestas existentes primero
            let toAddAnswers = Math.round(diffB * totalSpellsQty) - toReplace;
            let existingAnswers = cards.filter(c => c.category !== 'Land' && clasificarSpell(c) === 'Answer');
            existingAnswers.sort((a, b) => b.quantity - a.quantity);
            
            for (let ans of existingAnswers) {
                if (toAddAnswers <= 0) break;
                const canAdd = 4 - ans.quantity;
                if (canAdd > 0) {
                    const add = Math.min(canAdd, toAddAnswers);
                    ans.quantity += add;
                    toAddAnswers -= add;
                }
            }

            // Inyectar respuestas genéricas solo si aún faltan
            if (toAddAnswers > 0) {
                const rep = obtenerMejorCartaDeRemplazo("Instant", 1, Array.from(colors), formData?.format, ragPool, getCappedCardsList());
                cards = inyectarCartaDirecta(cards, { name: rep.name, quantity: toAddAnswers, category: rep.category, cmc: rep.cmc, role: "interaction" }, ragPool);
            }
        } else {
            // Demasiadas respuestas, inyectar amenazas
            let toReplace = Math.round(Math.abs(diffB) * totalSpellsQty);
            const answersToReduce = cards.filter(c => c.category !== 'Land' && clasificarSpell(c) === 'Answer' && c.quantity > 1);
            answersToReduce.sort((a, b) => b.cmc - a.cmc);

            for (let ans of answersToReduce) {
                if (toReplace <= 0) break;
                // Allow reducing to 0 to avoid loose 1-off cards
                const reduce = Math.min(ans.quantity, toReplace);
                ans.quantity -= reduce;
                toReplace -= reduce;
            }

            // Aumentar copias de amenazas existentes primero (respeta sinergias/tribus)
            let toAddThreats = Math.round(Math.abs(diffB) * totalSpellsQty) - toReplace;
            let existingThreats = cards.filter(c => c.category !== 'Land' && clasificarSpell(c) === 'Threat');
            existingThreats.sort((a, b) => b.quantity - a.quantity);
            
            for (let thr of existingThreats) {
                if (toAddThreats <= 0) break;
                const canAdd = 4 - thr.quantity;
                if (canAdd > 0) {
                    const add = Math.min(canAdd, toAddThreats);
                    thr.quantity += add;
                    toAddThreats -= add;
                }
            }

            // Pro Tour Fix: Solo inyectar amenazas genéricas si el mazo tiene menos de 4 amenazas únicas
            // Si ya tiene suficiente variedad de amenazas, es mejor subir copias de las existentes
            const uniqueThreatsInDeck = cards.filter(c => c.category !== 'Land' && clasificarSpell(c) === 'Threat');
            if (toAddThreats > 0 && uniqueThreatsInDeck.length < 4 && !hasTribe) {
                const rep = obtenerMejorCartaDeRemplazo("Creature", 2, Array.from(colors), formData?.format, ragPool, getCappedCardsList());
                cards = inyectarCartaDirecta(cards, { name: rep.name, quantity: toAddThreats, category: rep.category, cmc: rep.cmc, role: "threat" }, ragPool);
            } else if (toAddThreats > 0) {
                // Subir copias de amenazas existentes a 4x en vez de inyectar genéricas fuera de sinergia
                for (let thr of uniqueThreatsInDeck) {
                    if (toAddThreats <= 0) break;
                    const canAdd = 4 - thr.quantity;
                    if (canAdd > 0) {
                        const add = Math.min(canAdd, toAddThreats);
                        thr.quantity += add;
                        toAddThreats -= add;
                    }
                }
            }
        }
    }

    // === DIMENSIÓN C: VELOCITY ===
    const isCascadeDeck = strategyId === 'cascade' || formData.arquetipo?.toLowerCase().includes("cascade") || formData.arquetipo?.toLowerCase().includes("living end") || formData.arquetipo?.toLowerCase().includes("crashing footfalls");

    if (isCascadeDeck) {
        const logMsgC = `[DIMENSIÓN C] Velocity Bypass: Mazo Cascade detectado. Evitando inyección de cantrips de coste 1.`;
        console.log(logMsgC);
        if (addLog) addLog(logMsgC);
    } else if (colors.has("U") && (isControl || isCombo || isTempo) && !hasTribe) {
        const cantripCount = cards.filter(c => ["preordain", "consider", "ponder", "brainstorm", "opt", "serum visions"].includes(c.name.toLowerCase())).reduce((sum, s) => sum + s.quantity, 0);
        if (cantripCount < 4) {
            const gap = 4 - cantripCount;
            const logMsgC = `[DIMENSIÓN C] Velocity Deficit (Blue): Solo ${cantripCount} cantrips en mazo Azul. Inyectando 4x "Preordain".`;
            console.log(logMsgC);
            if (addLog) addLog(logMsgC);
            // Reemplazar de cartas no esenciales
            const nonEs = cards.filter(c => c.category !== 'Land' && !esRolProtegido(c.role) && c.quantity > 1);
            let needed = gap;
            for (let c of nonEs) {
                if (needed <= 0) break;
                const take = Math.min(c.quantity, needed);
                c.quantity -= take;
                needed -= take;
            }
            cards = inyectarCartaDirecta(cards, { name: "Preordain", quantity: gap - needed, category: "Sorcery", cmc: 1, role: "cantrip" });
        }
    } else if (!hasTribe && !isCascadeDeck && isMidrange) { // PRO TOUR TRIBAL FIX: No inyectar motores genéricos en mazos tribales puros ni en Aggro puro
        const advantageEngines = ["fable of the mirror-breaker", "up the beanstalk", "orcish bowmasters", "esper sentinel", "lead the stampede", "the one ring"];
        const engineCount = cards.filter(c => advantageEngines.some(ae => c.name.toLowerCase().includes(ae))).reduce((sum, s) => sum + s.quantity, 0);
        if (engineCount < 4) {
            const rep = obtenerMejorCartaDeRemplazo("Creature", 2, Array.from(colors), formData?.format, ragPool);
            let engineName = rep.name;

            const logMsgC = `[DIMENSIÓN C] Velocity Deficit (Non-Blue): Solo ${engineCount} ventaja. Inyectando 4x "${engineName}".`;
            console.log(logMsgC);
            if (addLog) addLog(logMsgC);

            const nonEs = cards.filter(c => c.category !== 'Land' && !esRolProtegido(c.role) && c.quantity > 1);
            let needed = 4 - engineCount;
            for (let c of nonEs) {
                if (needed <= 0) break;
                const take = Math.min(c.quantity, needed);
                c.quantity -= take;
                needed -= take;
            }
            cards = inyectarCartaDirecta(cards, { name: engineName, quantity: 4 - engineCount - needed, category: engineName.includes("Fable") ? "Enchantment" : "Creature", cmc: engineName.includes("Fable") ? 3 : 1, role: "engine" });
        }
    }

    // === DIMENSIÓN D: PLAN B RESILIENCY ===
    const isLinearCombo = ['reanimator', 'scales', 'affinity', 'ramp'].includes(strategyId);
    if (isLinearCombo) {
        const protectionNames = ["thoughtseize", "inquisition of kozilek", "veil of summer", "haywire mite", "spell pierce", "surge of salvation", "giver of runes"];
        const protCount = cards.filter(c => protectionNames.some(pn => c.name.toLowerCase().includes(pn))).reduce((sum, s) => sum + s.quantity, 0);
        if (protCount < 4) {
            const rep = obtenerMejorCartaDeRemplazo("Instant", 1, Array.from(colors), formData?.format, ragPool);
            let protName = rep.name;

            const logMsgD = `[DIMENSIÓN D] Plan B Resiliency: Mazo combo/lineal requiere protección. Inyectando 4x "${protName}" para contrarrestar hate.`;
            console.log(logMsgD);
            if (addLog) addLog(logMsgD);

            const nonEs = cards.filter(c => c.category !== 'Land' && !esRolProtegido(c.role) && c.quantity > 1);
            let needed = 4 - protCount;
            for (let c of nonEs) {
                if (needed <= 0) break;
                const take = Math.min(c.quantity, needed);
                c.quantity -= take;
                needed -= take;
            }
            cards = inyectarCartaDirecta(cards, { name: protName, quantity: 4 - protCount - needed, category: protName === "Thoughtseize" ? "Sorcery" : "Instant", cmc: 1, role: "protection" });
        }
    }

    // === DIMENSIÓN E: INTERACTION PARTITIONING ===
    if (isControl) {
        const counters = cards.filter(c => c.name.toLowerCase().includes("counter") || c.name.toLowerCase().includes("pierce") || c.name.toLowerCase().includes("leak")).reduce((sum, s) => sum + s.quantity, 0);
        const sweepers = cards.filter(c => c.name.toLowerCase().includes("verdict") || c.name.toLowerCase().includes("depopulate") || c.name.toLowerCase().includes("wrath")).reduce((sum, s) => sum + s.quantity, 0);
        if (counters === 0 && colors.has("U")) {
            cards = inyectarCartaDirecta(cards, { name: "Counterspell", quantity: 2, category: "Instant", cmc: 2, role: "interaction" });
        }
        if (sweepers === 0 && colors.has("W")) {
            cards = inyectarCartaDirecta(cards, { name: "Supreme Verdict", quantity: 2, category: "Sorcery", cmc: 4, role: "interaction" });
        }
    }

    // === DIMENSIÓN H: THREAT + DISRUPT ===
    cards = cards.map(c => {
        if (c.category === 'Creature' && !esRolProtegido(c.role) && c.quantity > 2) {
            const nameLower = c.name.toLowerCase();
            if (nameLower.includes("doom traveler") || nameLower.includes("savannah lions")) {
                if (colors.has("W")) return { ...c, name: "Solitude", cmc: 5, category: "Creature", role: "hybrid" };
            }
            if (nameLower.includes("borderland marauder") || nameLower.includes("goblin piker")) {
                if (colors.has("R")) return { ...c, name: "Fury", cmc: 5, category: "Creature", role: "hybrid" };
            }
        }
        return c;
    });

    // === DIMENSIÓN I: LINEAR DENSITY VS DILUTION ===
    const isHyperLinear = ['affinity', 'scales'].includes(strategyId);
    if (isHyperLinear) {
        const interactiveCards = cards.filter(c => clasificarSpell(c) === 'Answer');
        const totalInt = interactiveCards.reduce((sum, c) => sum + c.quantity, 0);
        if (totalInt > 4) {
            const gap = totalInt - 4;
            const logMsgI = `[DIMENSIÓN I] Dilution Deficit: Mazo hiperlineal tiene ${totalInt} respuestas (máximo aconsejable 4). Diluyendo interactivos sobrantes...`;
            console.log(logMsgI);
            if (addLog) addLog(logMsgI);

            let removed = 0;
            for (let intC of interactiveCards) {
                if (removed >= gap) break;
                const take = Math.min(intC.quantity, gap - removed);
                intC.quantity -= take;
                removed += take;
            }

            let synergyName = "Hardened Scales";
            if (strategyId === 'affinity') synergyName = "Patchwork Automaton";

            cards = inyectarCartaDirecta(cards, { name: synergyName, quantity: removed, category: synergyName.includes("Scales") ? "Enchantment" : "Creature", cmc: synergyName.includes("Scales") ? 1 : 2, role: "synergy" });
        }
    }

    if (spellAuditOnly) {
        // Final unique deduplication of spells
        const uniqueCards = [];
        cards.forEach(c => {
            if (c.quantity <= 0) return; // Cleanup cards that were fully removed
            const existing = uniqueCards.find(uc => uc.name.toLowerCase() === c.name.toLowerCase());
            if (existing) {
                const isBasic = ["plains", "island", "swamp", "mountain", "forest", "wastes", "llanura", "isla", "pantano", "montaña", "bosque", "yermo"].includes(c.name.toLowerCase());
                existing.quantity = isBasic ? (existing.quantity + c.quantity) : Math.min(4, existing.quantity + c.quantity);
            } else {
                uniqueCards.push(c);
            }
        });
        return {
            ...deckResult,
            cards: uniqueCards
        };
    }

    if (!preserveLands) {
        // === DIMENSIÓN G: UTILITY LANDS & MDFCS ===
    const legendChannelLands = [
        { name: "Boseiju, Who Endures", color: "G", cmc: 0, category: "Land" },
        { name: "Otawara, Soaring City", color: "U", cmc: 0, category: "Land" },
        { name: "Takenuma, Abandoned Mire", color: "B", cmc: 0, category: "Land" },
        { name: "Eiganjo, Seat of the Empire", color: "W", cmc: 0, category: "Land" },
        { name: "Sokenzan, Crucible of Defiance", color: "R", cmc: 0, category: "Land" }
    ];

    legendChannelLands.forEach(l => {
        if (colors.has(l.color)) {
            // Verificar si ya existe
            if (!cards.some(c => c.name.toLowerCase() === l.name.toLowerCase())) {
                // Reemplazar un basic land correspondiente
                let basicName = "Plains";
                if (l.color === "G") basicName = "Forest";
                else if (l.color === "U") basicName = "Island";
                else if (l.color === "B") basicName = "Swamp";
                else if (l.color === "R") basicName = "Mountain";

                const basicLandIdx = cards.findIndex(c => c.category === 'Land' && c.name.toLowerCase() === basicName.toLowerCase() && c.quantity > 1);
                if (basicLandIdx !== -1) {
                    cards[basicLandIdx].quantity -= 1;
                    cards.push({ ...l, quantity: 1 });
                    const logMsgG = `[DIMENSIÓN G] Utility Lands: Reemplazado 1x "${basicName}" con 1x "${l.name}" (Legendary Channel Land)`;
                    console.log(logMsgG);
                    if (addLog) addLog(logMsgG);
                }
            }
        }
    });

    // === DIMENSIÓN L: SPELL-LAND DUALITY & MDFCS ===
    const mdfcAndCyclers = ["malakir rebirth", "bala ged recovery", "shatterskull smashing", "agadeem's awakening", "sejiri shelter", "lorien revealed"];
    const mdfcCount = cards.filter(c => mdfcAndCyclers.some(mac => c.name.toLowerCase().includes(mac))).reduce((sum, s) => sum + s.quantity, 0);
    if (mdfcCount >= 2) {
        const landsToDeduct = Math.floor(mdfcCount / 2);
        const logMsgL = `[DIMENSIÓN L] Spell-Land Duality: Encontradas ${mdfcCount} MDFC/Cicladora. Deduciendo ${landsToDeduct} tierras de la base para añadir hechizos eficientes.`;
        console.log(logMsgL);
        if (addLog) addLog(logMsgL);

        // Deduct lands
        let deducted = 0;
        const basicLands = cards.filter(c => c.category === 'Land' && ["plains", "island", "swamp", "mountain", "forest"].includes(c.name.toLowerCase()));
        for (let bl of basicLands) {
            if (deducted >= landsToDeduct) break;
            const take = Math.min(bl.quantity - 1, landsToDeduct - deducted);
            bl.quantity -= take;
            deducted += take;
        }

        // Add spells
        const excludeNamesL = getCappedCardsList();

        const rep = obtenerMejorCartaDeRemplazo("Instant", 1, Array.from(colors), formData?.format, ragPool, excludeNamesL);
        let spellName = rep.name;

        cards = inyectarCartaDirecta(cards, { name: spellName, quantity: deducted, category: rep.category, cmc: rep.cmc, role: "interaction" }, ragPool);
    }

    // === EXCEPCIÓN TRON: INYECCIÓN OBLIGATORIA DE TIERRAS DE URZA ===
    const isTronDeck = strategyId === 'tron' || formData?.arquetipo?.toLowerCase().includes("tron");
    if (isTronDeck) {
        const urzaLands = ["Urza's Tower", "Urza's Power Plant", "Urza's Mine"];
        let injectedUrza = 0;
        urzaLands.forEach(uName => {
            const existing = cards.find(c => c.name.toLowerCase() === uName.toLowerCase());
            if (existing) {
                if (existing.quantity < 4) {
                    injectedUrza += (4 - existing.quantity);
                    existing.quantity = 4;
                }
            } else {
                injectedUrza += 4;
                cards.push({ name: uName, quantity: 4, category: "Land", cmc: 0, role: "urza_lands" });
            }
        });
        
        if (injectedUrza > 0) {
            // Deduct from other lands to make space
            let otherLands = cards.filter(c => c.category === 'Land' && !urzaLands.map(u => u.toLowerCase()).includes(c.name.toLowerCase()));
            let removed = 0;
            for (let l of otherLands) {
                if (removed >= injectedUrza) break;
                const take = Math.min(l.quantity, injectedUrza - removed);
                l.quantity -= take;
                removed += take;
            }
            cards = cards.filter(c => c.quantity > 0);
            
            const logMsgTron = `[JUEZ TRON] Excepción Tron: Forzando 12 Urza Lands. Reemplazadas ${injectedUrza} tierras genéricas para hacer espacio.`;
            console.log(logMsgTron);
            if (addLog) addLog(logMsgTron);
        }
    }

    // === DIMENSIÓN A: KARSTEN CURVES & SOURCES ===
    let colorT1Requirements = {};
    let colorT2DoublePips = {};

    cards.forEach(c => {
        if (c.category !== 'Land') {
            const nameLower = c.name.toLowerCase();
            const colorsSp = getCardColorFromPool(c.name);
            colorsSp.forEach(col => {
                if (c.cmc === 1) colorT1Requirements[col] = true;
                const isDoublePip = ["counterspell", "eidolon of the great revel", "liliana of the veil", "hymn to tourach", "archmage's charm", "cryptic command", "supreme verdict"].includes(nameLower);
                if (isDoublePip) colorT2DoublePips[col] = true;
            });
        }
    });

    // Count land sources - using imported getLandColors

    const getSourcesCount = (col) => {
        const hasNonCreature = cards.filter(c => c.category !== 'Land' && !c.category.toLowerCase().includes('creature')).some(c => {
            const colorsSp = getCardColorFromPool(c.name);
            return colorsSp.includes(col);
        });

        return cards.filter(c => c.category === 'Land').reduce((sum, land) => {
            const produces = getLandColors(land.name);
            if (produces.includes(col)) {
                // Si la tierra es tribal (Cavern of Souls, Secluded Courtyard, Unclaimed Territory)
                // y el mazo tiene hechizos no-criatura de ese color, no cuenta como fuente coloreada para ese color
                const landNameLower = land.name.toLowerCase();
                const isTribalLand = ["cavern of souls", "secluded courtyard", "unclaimed territory"].some(tl => landNameLower.includes(tl));
                if (isTribalLand && hasNonCreature) {
                    return sum; // No cuenta como fuente de color normal
                }
                return sum + land.quantity;
            }
            return sum;
        }, 0);
    };

    colors.forEach(col => {
        const t1Needed = colorT1Requirements[col] ? 14 : 0;
        const t2Needed = colorT2DoublePips[col] ? 20 : 0;
        const targetSources = Math.max(t1Needed, t2Needed);
        if (targetSources > 0) {
            const actualSources = getSourcesCount(col);
            if (actualSources < targetSources) {
                const deficit = targetSources - actualSources;
                const logMsgA = `[DIMENSIÓN A] Karsten Mana Deficit for ${col}: Requiere ${targetSources} fuentes (actual: ${actualSources}). Defecto de ${deficit}. Convirtiendo tierras...`;
                console.log(logMsgA);
                if (addLog) addLog(logMsgA);

                // Convertir tierras de surplus a deficit
                if (colors.size >= 3 || hasTribe) {
                    const logMsgBypass = `[DIMENSIÓN A] Karsten Swap Bypass: Mazo multicolor (3+ colores) o tribal detectado. Evitando conversión automática de tierras básicas.`;
                    console.log(logMsgBypass);
                    if (addLog) addLog(logMsgBypass);
                    return;
                }

                let converted = 0;
                const otherColors = Array.from(colors).filter(x => x !== col);
                for (let other of otherColors) {
                    if (converted >= deficit) break;
                    const otherSources = getSourcesCount(other);
                    if (otherSources > 14) {
                        const surplus = otherSources - 14;
                        const qtyToConvert = Math.min(surplus, deficit - converted);
                        if (qtyToConvert > 0) {
                            let otherBasicName = "Island";
                            if (other === "W") otherBasicName = "Plains";
                            else if (other === "B") otherBasicName = "Swamp";
                            else if (other === "R") otherBasicName = "Mountain";
                            else if (other === "G") otherBasicName = "Forest";

                            let colBasicName = "Island";
                            if (col === "W") colBasicName = "Plains";
                            else if (col === "B") colBasicName = "Swamp";
                            else if (col === "R") colBasicName = "Mountain";
                            else if (col === "G") colBasicName = "Forest";

                            const otherBasicLand = cards.find(c => c.category === 'Land' && c.name.toLowerCase() === otherBasicName.toLowerCase() && c.quantity > qtyToConvert);
                            if (otherBasicLand) {
                                otherBasicLand.quantity -= qtyToConvert;
                                cards = inyectarCartaDirecta(cards, { name: colBasicName, quantity: qtyToConvert, category: "Land", cmc: 0 });
                                converted += qtyToConvert;
                                const logMsgConv = `[DIMENSIÓN A] Swapped ${qtyToConvert}x "${otherBasicName}" -> "${colBasicName}" mathematically.`;
                                console.log(logMsgConv);
                                if (addLog) addLog(logMsgConv);
                            }
                        }
                    }
                }
            }
        }
    });
    }

    // === DIMENSIÓN J: SIDEBOARD EXCELLENCE ===
    const isStandard = (formData?.format || '').toUpperCase() === 'STANDARD';

    const sideboardHatePool = isStandard ? {
        "W": ["Temporary Lockdown", "Get Lost", "Destroy Evil", "Loran of the Third Path"],
        "U": ["Negate", "Disdainful Stroke", "Tishana's Tidebinder", "Change the Equation"],
        "B": ["Duress", "Graveyard Trespasser", "Cut Down", "Glistening Deluge"],
        "R": ["Lithomantic Barrage", "Brotherhood's End", "Roiling Vortex", "End the Festivities"],
        "G": ["Pick Your Poison", "Tranquil Frillback", "Obstinate Baloth", "Haywire Mite"]
    } : {
        "W": ["Rest in Peace", "Stony Silence", "Surge of Salvation", "Path to Exile"],
        "U": ["Spell Pierce", "Aether Gust", "Mystical Dispute", "Hurkyl's Recall"],
        "B": ["Leyline of the Void", "Thoughtseize", "Collective Brutality", "Fatal Push"],
        "R": ["Blood Moon", "Alpine Moon", "Smash to Smithereens", "Roiling Vortex"],
        "G": ["Veil of Summer", "Haywire Mite", "Force of Vigor", "Collector Ouphe"]
    };

    let sideCandidates = [];
    colors.forEach(col => {
        if (sideboardHatePool[col]) {
            sideboardHatePool[col].forEach(name => sideCandidates.push(name));
        }
    });

    // Fix: Asegurar suficientes cartas en candidates para no generar infinite loop y permitir playsets
    const genericCandidates = isStandard ? 
        ["Soul-Guide Lantern", "Pithing Needle", "The Stone Brain", "Unlicensed Hearse", "Urabrask's Forge"] :
        ["Relic of Progenitus", "Damping Sphere", "Pithing Needle", "Tormod's Crypt", "Surgical Extraction", "Engineered Explosives", "Chalice of the Void"];

    const getSideboardCardDetails = (name) => {
        const n = name.toLowerCase();
        
        // CMCs
        const cmcMap = {
            // standard
            "temporary lockdown": 3, "get lost": 2, "destroy evil": 2, "loran of the third path": 3,
            "negate": 2, "disdainful stroke": 2, "tishana's tidebinder": 3, "change the equation": 2,
            "duress": 1, "graveyard trespasser": 3, "cut down": 1, "glistening deluge": 3,
            "lithomantic barrage": 1, "brotherhood's end": 3, "roiling vortex": 2, "end the festivities": 1,
            "pick your poison": 1, "tranquil frillback": 3, "obstinate baloth": 4, "haywire mite": 1,
            "soul-guide lantern": 1, "the stone brain": 2, "unlicensed hearse": 2, "urabrask's forge": 3,
            // modern/legacy
            "rest in peace": 2, "stony silence": 2, "surge of salvation": 1, "path to exile": 1,
            "spell pierce": 1, "aether gust": 2, "mystical dispute": 3, "hurkyl's recall": 2,
            "leyline of the void": 4, "thoughtseize": 1, "collective brutality": 2, "fatal push": 1,
            "blood moon": 3, "alpine moon": 1, "smash to smithereens": 2,
            "veil of summer": 1, "force of vigor": 4, "collector ouphe": 2,
            "relic of progenitus": 1, "damping sphere": 2, "pithing needle": 1, "tormod's crypt": 0,
            "surgical extraction": 1, "engineered explosives": 0, "chalice of the void": 0
        };

        // Categories
        const enchantments = ["rest in peace", "stony silence", "leyline of the void", "blood moon", "alpine moon", "roiling vortex", "temporary lockdown"];
        const creatures = ["loran of the third path", "tishana's tidebinder", "graveyard trespasser", "tranquil frillback", "obstinate baloth", "haywire mite", "collector ouphe", "esper sentinel", "ragavan, nimble pilferer", "orcish bowmasters", "tarmogoyf", "delver of secrets", "steel overseer"];
        const sorceries = ["thoughtseize", "collective brutality", "glistening deluge", "lithomantic barrage", "brotherhood's end", "end the festivities", "pick your poison", "prismatic ending", "preordain"];
        const artifacts = ["relic of progenitus", "damping sphere", "pithing needle", "tormod's crypt", "surgical extraction", "engineered explosives", "chalice of the void", "soul-guide lantern", "the stone brain", "unlicensed hearse", "urabrask's forge"];
        
        let cat = "Instant";
        if (enchantments.includes(n)) cat = "Enchantment";
        else if (creatures.includes(n)) cat = "Creature";
        else if (sorceries.includes(n)) cat = "Sorcery";
        else if (artifacts.includes(n)) cat = "Artifact";

        return {
            category: cat,
            cmc: cmcMap[n] !== undefined ? cmcMap[n] : 2
        };
    };
    sideCandidates = [...new Set([...sideCandidates, ...genericCandidates])];

    let sideboard = [];
    let sideCount = 0;

    // Detectar "Colores Huérfanos" (Pedido por el usuario, pero sin tierras generadas en Maindeck porque la IA no escogió cartas de ese color)
    const maindeckLands = cards.filter(c => c.category === 'Land');
    const orphanColors = [];
    colors.forEach(col => {
        if (col === 'C' || col === '') return;
        const hasSource = maindeckLands.some(l => l.color_identity && l.color_identity.includes(col));
        if (!hasSource) orphanColors.push(col);
    });

    if (orphanColors.length > 0) {
        const shockMap = {
            'UW': 'Hallowed Fountain', 'BW': 'Godless Shrine', 'RW': 'Sacred Foundry', 'GW': 'Temple Garden',
            'BU': 'Watery Grave', 'RU': 'Steam Vents', 'GU': 'Breeding Pool', 'BR': 'Blood Crypt',
            'BG': 'Overgrown Tomb', 'GR': 'Stomping Ground'
        };
        const mainColors = Array.from(colors).filter(c => !orphanColors.includes(c) && c !== 'C' && c !== '');
        const mainColor = mainColors.length > 0 ? mainColors[0] : 'W';
        
        orphanColors.forEach(col => {
            if (sideCount >= 13) return; // Dejar espacio para al menos algunas cartas de odio
            const pairKey = [mainColor, col].sort().join('');
            const landName = shockMap[pairKey] || "City of Brass";
            sideboard.push({
                name: landName,
                quantity: 2,
                category: "Land",
                type_line: "Land — Sideboard Fixer",
                cmc: 0,
                color_identity: [mainColor, col]
            });
            sideCount += 2;
            const logOrphan = `[DIMENSIÓN J] Color Huérfano Detectado (${col}). Inyectando 2x ${landName} en Banquillo.`;
            console.log(logOrphan);
            if (addLog) addLog(logOrphan);
        });
    }

    // === MTG PRO: Matchup Land Swaps ===
    // Inyectar tierras situacionales para cambiar la textura de la base de maná contra Aggro o Control
    const mtgProLandSwaps = [];
    if (sideCount <= 13) {
        // Contra Aggro: Radiant Fountain para estabilizar vidas y evitar shocklands
        sideboard.push({
            name: "Radiant Fountain",
            quantity: 1,
            category: "Land",
            type_line: "Land — Anti-Aggro",
            cmc: 0,
            color_identity: []
        });
        sideCount += 1;
        mtgProLandSwaps.push({ name: "Radiant Fountain", type: 'Anti-Aggro' });

        // Contra Control: Tierra utilitaria para grindear sin perder ventaja de cartas
        const mainColors = Array.from(colors).filter(c => c !== 'C' && c !== '');
        const pColor = mainColors.length > 0 ? mainColors[0] : 'C';
        const antiControlLand = isStandard ? 
            ((pColor === 'W') ? "Eiganjo, Seat of the Empire" :
             (pColor === 'U') ? "Otawara, Soaring City" :
             (pColor === 'B') ? "Takenuma, Abandoned Mire" :
             (pColor === 'R') ? "Sokenzan, Crucible of Defiance" :
             (pColor === 'G') ? "Boseiju, Who Endures" : "Mirrex") :
            ((pColor === 'W') ? "Castle Ardenvale" :
             (pColor === 'U') ? "Castle Vantress" :
             (pColor === 'B') ? "Castle Locthwain" :
             (pColor === 'R') ? "Den of the Bugbear" :
             (pColor === 'G') ? "Lair of the Hydra" : "Mutavault");
        
        sideboard.push({
            name: antiControlLand,
            quantity: 1,
            category: "Land",
            type_line: "Land — Utility/Manland",
            cmc: 0,
            color_identity: [pColor]
        });
        sideCount += 1;
        mtgProLandSwaps.push({ name: antiControlLand, type: 'Anti-Control' });
        
        const logProSwaps = `[DIMENSIÓN J] MTG Pro Land Swaps inyectados: Radiant Fountain (Aggro), ${antiControlLand} (Control).`;
        console.log(logProSwaps);
        if (addLog) addLog(logProSwaps);
    }

    let candIdx = 0;
    let loopProtect = 0;
    while (sideCount < 15 && loopProtect < 1000) {
        loopProtect++;
        const cardName = sideCandidates[candIdx % sideCandidates.length];
        const existing = sideboard.find(c => c.name === cardName);
        if (existing) {
            if (existing.quantity < 4) { // Permitir playset de sideboard
                existing.quantity += 1;
                sideCount += 1;
            }
        } else {
            const details = getSideboardCardDetails(cardName);
            sideboard.push({
                name: cardName,
                quantity: 1,
                category: details.category,
                cmc: details.cmc
            });
            sideCount += 1;
        }
        candIdx += 1;
    }

    // Sideboard Strategy Description: Per-Matchup Pip Simulation
    let sideboard_strategy = `Guía Táctica de Banquilleo Modern Pro Tour (Simulación de Pips por Matchup):\n`;
    
    const colorForCard = {};
    Object.keys(sideboardHatePool).forEach(col => {
        sideboardHatePool[col].forEach(cardName => { colorForCard[cardName] = col; });
    });
    genericCandidates.forEach(name => { colorForCard[name] = 'C'; });

    const matchups = {
        "Graveyard (Living End, Reanimator)": ["Rest in Peace", "Leyline of the Void", "Relic of Progenitus", "Tormod's Crypt", "Surgical Extraction"],
        "Artifacts/Scales (Affinity, Tron)": ["Stony Silence", "Force of Vigor", "Collector Ouphe", "Smash to Smithereens", "Haywire Mite"],
        "Big Mana (Tron, Amulet Titan)": ["Blood Moon", "Alpine Moon", "Damping Sphere"],
        "Control/Disrupción (Midrange/Control)": ["Veil of Summer", "Surge of Salvation", "Chalice of the Void"],
        "Interactivo (Aggro, Tempo)": ["Path to Exile", "Spell Pierce", "Aether Gust", "Mystical Dispute", "Hurkyl's Recall", "Collective Brutality", "Fatal Push", "Roiling Vortex", "Thoughtseize", "Engineered Explosives", "Pithing Needle"]
    };

    const sideboardLands = sideboard.filter(c => c.category === "Land");

    Object.keys(matchups).forEach(matchupName => {
        const relevantCardNames = matchups[matchupName];
        const cardsIN = sideboard.filter(c => relevantCardNames.includes(c.name));
        
        if (cardsIN.length > 0) {
            let inString = cardsIN.map(c => `+${c.quantity}x ${c.name}`).join(", ");
            let requiredColors = new Set();
            cardsIN.forEach(c => {
                const col = colorForCard[c.name];
                if (col && col !== 'C') requiredColors.add(col);
            });

            let landsToSubIn = [];
            let totalLandsToSubOut = 0;
            requiredColors.forEach(col => {
                if (orphanColors.includes(col)) {
                    // Find the sideboard lands that provide this orphan color
                    sideboardLands.forEach(l => {
                        if (l.color_identity && l.color_identity.includes(col)) {
                            landsToSubIn.push(`+${l.quantity}x ${l.name}`);
                            totalLandsToSubOut += l.quantity;
                        }
                    });
                }
            });

            // Remove duplicates from landsToSubIn (in case multiple hate cards of same orphan color)
            landsToSubIn = [...new Set(landsToSubIn)];

            const spellsCountOut = cardsIN.reduce((sum, c) => sum + c.quantity, 0);

            if (landsToSubIn.length > 0) {
                inString += `, ` + landsToSubIn.join(", ");
                sideboard_strategy += `- Contra ${matchupName}:\n  IN: ${inString}\n  OUT: -${spellsCountOut}x cartas lentas del main, -${totalLandsToSubOut}x Tierras Básicas (Reajuste de Pips simulado para el splash).\n`;
            } else {
                sideboard_strategy += `- Contra ${matchupName}:\n  IN: ${inString}\n  OUT: -${spellsCountOut}x cartas lentas/ineficaces.\n`;
            }
        }
    });

    if (mtgProLandSwaps.length > 0) {
        sideboard_strategy += `\n=== MTG PRO LAND SWAPS ===\n`;
        const aggroL = mtgProLandSwaps.find(l => l.type === 'Anti-Aggro')?.name;
        const ctrlL = mtgProLandSwaps.find(l => l.type === 'Anti-Control')?.name;
        
        if (aggroL) {
            sideboard_strategy += `- Contra Aggro (Burn, Blitz, Zoo):\n  IN: +1x ${aggroL}.\n  OUT: -1x Tierra dolorosa (Shockland/Painland) para estabilizar vidas.\n`;
        }
        if (ctrlL) {
            sideboard_strategy += `- Contra Control/Midrange (Grindy Mirrors):\n  IN: +1x ${ctrlL}.\n  OUT: -1x Tierra básica o Fastland para maximizar el valor de la mesa en el lategame.\n`;
        }
    }

    const logMsgJ = `[DIMENSIÓN J] Sideboard generado con éxito (exactamente 15 cartas).`;
    console.log(logMsgJ);
    if (addLog) addLog(logMsgJ);

    // Final unique deduplication
    const uniqueCards = [];
    cards.forEach(c => {
        if (c.quantity <= 0) return; // Cleanup cards that were fully removed
        const existing = uniqueCards.find(uc => uc.name.toLowerCase() === c.name.toLowerCase());
        if (existing) {
            const isBasic = ["plains", "island", "swamp", "mountain", "forest", "wastes", "llanura", "isla", "pantano", "montaña", "bosque", "yermo"].includes(c.name.toLowerCase());
            existing.quantity = isBasic ? (existing.quantity + c.quantity) : Math.min(4, existing.quantity + c.quantity);
        } else {
            uniqueCards.push(c);
        }
    });
    cards = uniqueCards;

    // Generar la guía simétrica interactiva de banquillo
    const sideboard_guide = generateSideboardGuide(cards, sideboard);

    return {
        ...deckResult,
        cards,
        sideboard,
        sideboard_strategy,
        sideboard_guide
    };
}
const CRITICAL_SYNERGY_RULES = {
  reanimator: {
    name: "Reanimator (Persist / Goryo's)",
    rules: [
      "Si el mazo contiene cartas de reanimación baratas (como Unearth o Claim // Fame), éstas SOLO pueden revivir criaturas de coste 3 o menos. Asegúrate de tener criaturas útiles de coste <= 3 en el mazo principal (ej. Priest of Fell Rites, Stitcher's Supplier, etc.).",
      "Si el mazo tiene criaturas gigantes de coste 5+ o legendarias (como Archon of Cruelty, Kokusho, o demonios grandes) para reanimar, DEBES usar hechizos de reanimación sin restricciones de coste, tales como: Persist (solo criaturas no legendarias), Exhume, Animate Dead, Necromancy, Late to Dinner, o Unburial Rites. NUNCA uses Unearth o Claim // Fame si tus únicos objetivos de reanimación son criaturas gigantes.",
      "Para que la reanimación funcione, DEBES incluir descartadores eficientes en los primeros turnos (Faithless Looting, Cathartic Reunion, Thrill of Possibility, Bitter Reunion, Collector's Vault) para enviar las amenazas al cementerio antes de revivirlas."
    ]
  },
  aristocrats: {
    name: "Aristocrats (Yawgmoth Sacrifice)",
    rules: [
      "Debes mantener un equilibrio de 3 componentes clave: 1. Criaturas sacrificables/fichas (carrion feeder, gravecrawler, reassembling skeleton, bloodghast); 2. Motores de sacrificio sin coste de maná (Viscera Seer, Yawgmoth, Woe Strider, Goblin Bombardment, Carrion Feeder); 3. Beneficiadores de muerte/drenaje (Blood Artist, Zulaport Cutthroat, Cruel Celebrant, Bastion of Remembrance).",
      "No incluyas motores de sacrificio si no tienes generadores de fichas/criaturas recurrentes, ni drenadores si no tienes cómo sacrificar de forma gratuita."
    ]
  },
  voltron: {
    name: "Voltron (Hammer Time)",
    rules: [
      "Si incluyes Colossus Hammer u otros equipamientos masivos con costes de equipar altísimos, es obligatorio incluir cartas que los equipen gratis (Sigarda's Aid, Puresteel Paladin) o criaturas que se equipen solas (Kazuul's Toll Collector, Kemba's Outfitter). De lo contrario, los equipamientos serán inservibles."
    ]
  },
  tron: {
    name: "Big Mana (Tron)",
    rules: [
      "Si incluyes amenazas incoloras gigantes de coste 6+ (Karn Liberated, Wurmcoil Engine, Ulamog), la base de tierras debe incluir obligatoriamente el trío de Urza (Urza's Mine, Urza's Power Plant, Urza's Tower) y cartas de búsqueda/estabilización (Expedition Map, Sylvan Scrying, Ancient Stirrings)."
    ]
  },
  spellslinger: {
    name: "Spellslinger (Prowess & Murktide)",
    rules: [
      "Mantén un alto número de instantáneos y conjuros baratos (coste 1-2) para disparar Prowess y alimentar el cementerio para Murktide Regent. Evita criaturas lentas que no se beneficien de lanzar hechizos."
    ]
  },
  blink: {
    name: "Blink / Flicker (Ephemerate Sinergia)",
    rules: [
      "Asegúrate de que tus criaturas tengan potentes efectos al entrar al campo de batalla (ETB) como Stonehorn Dignitary, Coiling Oracle, Eternal Witness, Mulldrifter. No pongas hechizos de parpadeo (Ephemerate, Soulherder) si tus criaturas solo tienen habilidades estáticas."
    ]
  }
};

function getStrategySynergyPrompt(strategyId) {
  const normalized = (strategyId || '').toLowerCase();
  const ruleObj = CRITICAL_SYNERGY_RULES[normalized];
  if (!ruleObj) return "";
  
  return `
=== CRITICAL MECHANICAL SYNERGY RULES FOR ${ruleObj.name.toUpperCase()} ===
${ruleObj.rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}
==========================================================================
`;
}

function performMechanicalAuditory(deckSpells, strategyId) {
  const normalized = (strategyId || '').toLowerCase();
  let alerts = [];
  
  if (normalized === 'reanimator') {
    const hasRestrictiveReanimators = deckSpells.some(s => ['unearth', 'claim // fame', 'claim/fame', 'claim'].includes(s.name.toLowerCase()));
    const giantCreatures = deckSpells.filter(s => s.category === 'Creature' && s.cmc >= 4);
    const hasGeneralReanimators = deckSpells.some(s => ['persist', 'exhume', 'animate dead', 'necromancy', 'unburial rites', 'late to dinner', 'goryo\'s vengeance', 'dread return'].includes(s.name.toLowerCase()));
    
    if (hasRestrictiveReanimators && giantCreatures.length > 0 && !hasGeneralReanimators) {
      alerts.push(`CRITICAL WARNING: El mazo tiene criaturas gigantes para reanimar (como ${giantCreatures.slice(0, 2).map(c => c.name).join(', ')}) pero solo tiene hechizos de reanimación restrictivos de coste bajo (como Unearth). ¡ESTO ES INCOMPATIBLE! Debes usar 'swaps' para reemplazar los hechizos restrictivos por hechizos de reanimación universales como: Persist, Exhume, Animate Dead, Necromancy, o Late to Dinner.`);
    }
    
    const discardOutlets = deckSpells.filter(s => ['faithless looting', 'cathartic reunion', 'thrill of possibility', 'bitter reunion', 'collector\'s vault', 'stitcher\'s supplier', 'putrid imp'].includes(s.name.toLowerCase()));
    if (discardOutlets.length === 0) {
      alerts.push(`WARNING: El mazo es de tipo Reanimator pero no contiene suficientes facilitadores para descartar cartas en el cementerio (como Faithless Looting o Cathartic Reunion). Debes añadir al menos 4 descartadores eficientes.`);
    }
  } else if (normalized === 'aristocrats') {
    const sacrificeOutlets = deckSpells.filter(s => ['viscera seer', 'yawgmoth, thran physician', 'yawgmoth', 'woe strider', 'goblin bombardment', 'carrion feeder'].includes(s.name.toLowerCase()));
    const fodder = deckSpells.filter(s => ['bloodghast', 'reassembling skeleton', 'gravecrawler', 'carrion feeder'].includes(s.name.toLowerCase()) || s.name.toLowerCase().includes('token') || s.name.toLowerCase().includes('sliver'));
    const payoff = deckSpells.filter(s => ['blood artist', 'zulaport cutthroat', 'cruel celebrant', 'bastion of remembrance'].includes(s.name.toLowerCase()));
    
    if (sacrificeOutlets.length === 0 && payoff.length > 0) {
      alerts.push(`WARNING: Mazo Aristocrat detectado con drenadores de vidas pero sin motores de sacrificio gratuitos (como Viscera Seer o Yawgmoth). Añade motores de sacrificio gratis.`);
    }
  } else if (normalized === 'voltron') {
    const hasHammer = deckSpells.some(s => s.name.toLowerCase() === 'colossus hammer');
    const hasCheats = deckSpells.some(s => ['sigarda\'s aid', 'puresteel paladin', 'stoneforge mystic', 'kemba\'s outfitter'].includes(s.name.toLowerCase()));
    if (hasHammer && !hasCheats) {
      alerts.push(`CRITICAL WARNING: El mazo tiene 'Colossus Hammer' pero carece de facilitadores de equipamiento gratuito (como Sigarda's Aid o Puresteel Paladin). Reemplaza cartas para incluirlos o remueve el martillo.`);
    }
  }
  
  if (alerts.length > 0) {
    return `
=== PROGRAMMATIC MECHANICAL AUDIT ALERTS ===
${alerts.map(a => `[ALERTA DE SEGURIDAD] ${a}`).join('\n')}
=============================================
`;
  }
  return "";
}

export async function forgeMazoPerfecto(formData, aiConfig, onProgress = () => {}) {
   const logs = [];
   const addLog = (msg) => {
     logs.push(msg);
     console.log(`[Forge Log] ${msg}`);
   };

   let STRICT_INSTRUCTIONS_PROMPT = "";
   let contextGen_Prompt = "";
   let genResponseRawJson_Object = "";

   try {
     const strategyObj = MTG_STRATEGIES.find(s => s.label === formData.strategy || s.id === formData.strategy) || {};
     let strategyId = strategyObj.id || formData.strategy || "";
     strategyId = inferStrategyFromArchetype(formData.archetype, strategyId);
     let archetypeObj = BATTLEBOX_ARCHETYPES.find(a => a.id === formData.archetype);
    if (!archetypeObj) {
      const dynamicArchs = await getDynamicArchetypes();
      const match = dynamicArchs.find(a => a.value === formData.archetype);
      if (match) {
        archetypeObj = {
          id: match.value,
          label: match.label,
          recommendedColors: match.recommendedColors,
          speed: match.speed,
          winTurn: match.winTurn,
          description: match.description
        };
      }
    }
    if (!archetypeObj) archetypeObj = {};
   const tribeObj = MTG_TRIBES.find(t => t.id === formData.tribe || t.label === formData.tribe) || null;
   const tribeId = tribeObj ? tribeObj.id : formData.tribe || "";

   const tribeLabel = tribeObj ? tribeObj.label : formData.tribe || 'Ninguna';
   const tribeSubtypes = tribeObj && tribeObj.subtypes ? tribeObj.subtypes.join(', ') : formData.tribe || 'Cualquiera';

   let baseIdent_ColorStr = (formData.colores && formData.colores.length>0) ? formData.colores.join(",") : "B,R"; 

   const dnaData = ARCHETYPE_DNA[strategyId] || ARCHETYPE_DNA[formData.archetype] || {
     prioridad: "Eficiencia, consistencia en la curva, sinergias de juego justo y ventaja de cartas.",
     estilo: "General / Tradicional",
     regla_de_oro: "Prioriza cartas con buen valor individual y sinergias directas con el resto de tus amenazas."
   };

   addLog(`Iniciando invocación de mazo con arquetipo taxonómico: ${formData.archetype || 'midrange'} y estrategia ${strategyId}`);
   
   onProgress('strategist', '🔍 Oráculo RAG escaneando biblioteca (filtrando élite)...');
   const ragResult = await buildCardPool(formData);
   const poolText = ragResult.pool.map(c => `- ${c.name} (CMC: ${c.mana_value}, Tipo: ${c.type_line}, Meta: ${c.metaPercent}%, Sinergia: ${c.score})`).join('\n');
   addLog(`RAG pool seleccionado con ${ragResult.pool.length} cartas.`);

   // Curve Profile Logic
   const curveProfile = formData.curveProfile || 'balanced';

   onProgress('strategist', '🏗️ Arquitecto de Plantillas (IA) diseñando Blueprint a medida...');
   const blueprintPrompt = `
Eres el "Blueprint Architect" del Pro Tour de Magic.
Diseña el plano estructural perfecto y a medida para este mazo.
- Archetype: ${formData.archetype || 'Midrange'}
- Strategy: ${strategyObj.label || strategyId || 'General'}
- Tribe: ${tribeLabel} (Subtypes: ${tribeSubtypes})
- Colors: [${baseIdent_ColorStr}]
- Curve: ${curveProfile}

${getStrategySynergyPrompt(strategyId)}

Define las cantidades exactas de cartas para cada rol estratégico clave en una estructura basada en objetos. Cada rol DEBE detallar:
- name: Nombre corto descriptivo del rol (ej: "early_interaction", "core_tribal_lords", "premium_finisher").
- quantity: Cantidad de copias de cartas asignadas a este rol.
- cmcCategory: El rango de coste objetivo, que debe ser uno de: "1", "2", "3", "4", "4+", "5+", "any".
- finisherQuality: "finisher" para cartas que actúan como rematadores premium de la partida (que idealmente deberían ser legendarias o míticas de alto impacto) o "standard" para cartas de soporte común.
- purposeDescription: Propósito del rol y cómo se adapta a la curva y estrategia seleccionada.

La suma de las cantidades de todos los roles debe ser exactamente igual a totalSpells (típicamente entre 36 y 40). NUNCA incluyas tierras.
`;

    let blueprint = { 
      totalSpells: 36, 
      roles: [
        { name: "core_cards", quantity: 16, cmcCategory: "any", finisherQuality: "standard", purposeDescription: "Core cards for the strategy" },
        { name: "premium_finishers", quantity: 4, cmcCategory: "4+", finisherQuality: "finisher", purposeDescription: "Game-ending finishers" },
        { name: "interaction", quantity: 8, cmcCategory: "1", finisherQuality: "standard", purposeDescription: "Early interaction and removal" },
        { name: "synergy_support", quantity: 8, cmcCategory: "2", finisherQuality: "standard", purposeDescription: "Synergistic helpers" }
      ] 
    }; // Fallback
   try {
       const bpResponse = await callAI([
           { role: 'system', content: 'Crea el plano (Blueprint) estructural óptimo en JSON puro.' },
           { role: 'user', content: blueprintPrompt }
       ], aiConfig, { forceJSON: true, maxTokens: 800, schema: GEMINI_BLUEPRINT_SCHEMA });
       blueprint = typeof bpResponse === 'string' ? cleanAndParseJSON(bpResponse) : bpResponse;
       addLog(`[BLUEPRINT AI] Dinámico Generado: Total ${blueprint.totalSpells} hechizos.`);
   } catch(err) {
       addLog(`[BLUEPRINT AI] Error generando Blueprint Dinámico, usando Fallback: ${err.message}`);
   }

   onProgress('strategist', '⚡ Evaluando Sinapsis Mágicas (Decidiendo estructura no-tierra)...');

   const curveInstructions = {
     blitz: "CURVE DISTRIBUTION TARGET (Blitz): 60% of spell copies at CMC 1, 30% at CMC 2, 10% at CMC 3+. Prioritize ultra-cheap, aggressive spells. Avoid CMC >= 4 unless it is a vital tribal or combo finisher.",
     aggressive: "CURVE DISTRIBUTION TARGET (Aggressive): 35% of spell copies at CMC 1, 40% at CMC 2, 20% at CMC 3, 5% at CMC 4+. Prioritize cheap, efficient spells. Avoid CMC >= 5 unless it is a vital tribal or combo finisher.",
     balanced: "CURVE DISTRIBUTION TARGET (Balanced): 20% of spell copies at CMC 1, 30% at CMC 2, 25% at CMC 3, 15% at CMC 4, 10% at CMC 5+. Maintain a solid mid-game presence.",
     heavy: "CURVE DISTRIBUTION TARGET (Heavy): 10% of spell copies at CMC 1, 20% at CMC 2, 25% at CMC 3, 25% at CMC 4, 20% at CMC 5+. Focus on high-impact late-game spells."
   };
   const curveInstructionText = curveInstructions[curveProfile] || curveInstructions.balanced;

   // === LOG 1: BLUEPRINT ACTIVADO ===
   const logBlueprint = `═══ BLUEPRINT ═══\nPlano: ${formData.archetype} + ${strategyId}\n` + 
      blueprint.roles.map(r => `  → ${r.name}: ${r.quantity} copias (CMC: ${r.cmcCategory}, Quality: ${r.finisherQuality})`).join('\n') +
      `\n  → Total hechizos: ${blueprint.totalSpells} | Curva: ${curveProfile}`;
   addLog(logBlueprint);
   console.log(logBlueprint);

   // === LOG 2: RAG POOL SUMMARY ===
   const top10 = ragResult.pool.slice(0, 10).map((c, i) => `  ${i+1}. ${c.name} (CMC:${c.mana_value}, Score:${c.score})`).join('\n');
   const cmcDist = ragResult.pool.reduce((acc, c) => {
      const cmc = Math.min(Math.floor(c.mana_value || 0), 5);
      acc[cmc] = (acc[cmc] || 0) + 1;
      return acc;
   }, {});
   const logRag = `═══ RAG POOL (Top 10) ═══\n${top10}\n  Distribución: CMC1→${cmcDist[1]||0} | CMC2→${cmcDist[2]||0} | CMC3→${cmcDist[3]||0} | CMC4→${cmcDist[4]||0} | CMC5+→${cmcDist[5]||0}`;
   addLog(logRag);
   console.log(logRag);

   const rarityConstraints = {
     pauper: "ABSOLUTE RARITY RESTRICTION: Only use 'common' rarity cards. Under no circumstances use uncommons, rares, or mythics.",
     artisan: "ABSOLUTE RARITY RESTRICTION: Only use 'common' or 'uncommon' rarity cards. Under no circumstances use rares or mythics.",
     'high-power': "NO RARITY RESTRICTION: You have total freedom to use the most powerful cards available, including rares and mythics.",
     standard: "STANDARD RARITY RESTRICTION: Balanced approach."
   };
   const activeRarityMode = formData.rarityMode || (aiConfig && aiConfig.rarityMode) || 'high-power';
   const rarityText = rarityConstraints[activeRarityMode] || rarityConstraints['high-power'];

     const roleNamesList = blueprint.roles.map(r => r.name);

      STRICT_INSTRUCTIONS_PROMPT = `
  You are a Pro Tour-level Magic: The Gathering deck engineer. Your task is to fill a ROLE BLUEPRINT with competitively optimal card selections.

  BLUEPRINT TO FILL:
  ${JSON.stringify(blueprint.roles, null, 2)}
  Total spell copies required: ${blueprint.totalSpells}

  ${getStrategySynergyPrompt(strategyId)}

  RULES (follow strictly, in order of priority):

  1. CARD SELECTION: Choose cards exclusively from the RAG CARD POOL provided below. Select cards with the highest individual power level, mana efficiency, and synergy with the deck's strategy. Every card must be a real, official MTG card with its correct English Scryfall name.

  2. EXACT COPY COUNT: The sum of all spell quantities must equal exactly ${blueprint.totalSpells}. No more, no less.

  3. STRICT FUNCTIONAL DIVERSITY (NO REDUNDANT UTILITIES): If a tribe or archetype has multiple cards that perform the EXACT SAME utility (e.g., "Gemhide Sliver" and "Manaweft Sliver" both tap for mana), CHOOSE ONLY ONE as a 4-of, and DO NOT include the other. Use the remaining slots for ENTIRELY DIFFERENT utilities (e.g., evasion, removal, lords). Never put 6-8 copies of identical functional utilities.

  4. PRO TOUR CONSISTENCY: Use exactly 4 copies for your core cards, and 2-3 copies for secondary cards. NEVER produce lists with 15+ unique cards at 1-2 copies. MAXIMUM 4 COPIES: Under NO circumstances can a single card exceed 4 copies. For Legendary cards or cards with CMC>=4, use a maximum of 2 or 3 copies to avoid bricking hands.

  5. CREATURE ROLE ENFORCEMENT: Any role containing "creature" or "targets" in its name must be filled exclusively with cards of category "Creature". Never assign Enchantments, Sorceries, or Sagas to creature roles.

  6. ARCHETYPE-SPECIFIC FINISHERS: Roles marked with finisherQuality: "finisher" MUST contain high-impact game-ending threats. For example, control finishers (e.g., Teferi, Murktide Regent) or tribal/archetype powerhouses. These cards should have premium rarity (Rare/Mythic) and be legendary where appropriate.

  7. TRIBAL COHERENCE: If a tribe is specified, every creature must belong to that tribe's subtypes.

  8. ROLE ASSIGNMENT: Every card's "role" field must exactly match one of the blueprint names: ${roleNamesList.join(', ')}. Do not invent new role names.

  9. COLOR IDENTITY: Use ONLY cards whose color identity is within [${baseIdent_ColorStr}].

  10. RARITY: ${rarityText}

  11. CURVE DISTRIBUTION: ${curveInstructionText}

  12. CORE FIRST: Select your core synergies, tribal Lords, and top-end payoffs first. Ensure you allocate slots for these crucial pieces before filling the deck with early game interaction.

  13. UTILITY LANDS RECOMMENDATIONS: Recommend a MAXIMUM of 1 or 2 unique top-tier utility lands (like Mutavault, Cavern of Souls, Boseiju) that are PERFECT for this exact strategy. Total utility land copies MUST NOT exceed 4 (e.g., 4x Cavern of Souls, or 2x Mutavault and 1x Boseiju). Do NOT recommend too many special lands; colored mana sources for the curve are strictly more important.
  `;

     contextGen_Prompt = `
  DECK CONFIGURATION:
  - Archetype: ${formData.archetype || 'Midrange'}
  - Strategy: ${strategyObj.label || 'General'} — ${strategyObj.mechanics || 'Efficient staples'}
  - Tribe: ${tribeLabel} (Scryfall subtypes: ${tribeSubtypes})
  - Colors: [${baseIdent_ColorStr}]
  - Curve Profile: ${curveProfile}

  STRATEGIC DNA:
  - Priority: ${dnaData.prioridad}
  - Style: ${dnaData.estilo}
  - Golden Rule: ${dnaData.regla_de_oro}

  === RAG CARD POOL (MANDATORY SOURCE) ===
  Select cards primarily from this pre-filtered competitive pool:
  ${poolText}
  ========================================

  ${formData.prompt ? `ADDITIONAL USER INSTRUCTIONS:\n${formData.prompt}` : ''}
  `; 
    
    addLog("Llamando a la API de Gemini con responseSchema...");
    onProgress('assembler', '🤖 Invocando Gemini para diseño del mazo...');
    
    try {
        genResponseRawJson_Object = await callAI([
            { role: 'system', content: STRICT_INSTRUCTIONS_PROMPT },
            { role: 'user', content: contextGen_Prompt }
        ], aiConfig, { 
          forceJSON: true, maxTokens: 6000, schema: GEMINI_NONLAND_SCHEMA,
          onRetry: (attempt, delay, status) => {
            onProgress('assembler', `⏳ Gemini saturado (${status}). Reintento ${attempt}... esperando ${Math.round(delay/1000)}s`);
            addLog(`[Retry] Intento ${attempt}, delay ${Math.round(delay/1000)}s, status: ${status}`);
          }
        });
      } catch (error) {
        addLog(`Error en la llamada de IA: ${error.message}`);
        error.generationLogs = {
          logs: logs,
          systemPrompt: STRICT_INSTRUCTIONS_PROMPT,
          contextPrompt: contextGen_Prompt,
          rawResponse: ""
        };
        throw error;
      }


  addLog("Respuesta de la API recibida exitosamente.");
  onProgress('assembler', '✅ Blueprint creado, Analizando Purgas IA e inyectando Matemática Karstiana de lands...');
  
  let validResultsStruct = typeof genResponseRawJson_Object === 'string' ? cleanAndParseJSON(genResponseRawJson_Object) : genResponseRawJson_Object; 
  let finalSpellsArr = validResultsStruct.spells || []; 

  // Pre-validation Card Hydration via IndexedDB / Scryfall
  onProgress('assembler', '💧 Hidratando metadatos reales de cartas desde la biblioteca/Scryfall...');
  addLog(`[HIDRATACIÓN PRE-VALIDACIÓN] Iniciando hidratación de ${finalSpellsArr.length} hechizos.`);
  
  let hydratedSpells = [];
  for (let i = 0; i < finalSpellsArr.length; i++) {
      const spell = finalSpellsArr[i];
      try {
          const hCard = await hydrateCard(spell, activeRarityMode);
          hydratedSpells.push({
              name: hCard.name || spell.name,
              quantity: spell.quantity, // maintain proposed quantity
              category: hCard.category || spell.category || "Spell",
              cmc: hCard.mana_value !== undefined ? hCard.mana_value : (hCard.cmc !== undefined ? hCard.cmc : (spell.cmc !== undefined ? spell.cmc : 3)),
              role: spell.role || "utility",
              mana_cost: hCard.mana_cost || spell.mana_cost || '',
              type_line: hCard.type_line || spell.type_line || ''
          });
          addLog(`[HIDRATACIÓN] Hidratada con éxito: "${spell.name}" -> "${hCard.name}" (CMC real: ${hCard.mana_value !== undefined ? hCard.mana_value : hCard.cmc})`);
      } catch (err) {
          addLog(`[HIDRATACIÓN WARNING] Error al hidratar "${spell.name}": ${err.message}. Usando datos de Gemini.`);
          hydratedSpells.push(spell);
      }
  }
  finalSpellsArr = hydratedSpells; 
  let metricsPIPsStruct  = validResultsStruct.technical_metrics?.pips_balance || { B: 15 , R: 10 }; 

  // === LOG 3: GEMINI RAW (Sanitized) ===
  const logGemini = `═══ GEMINI RAW (Non-Lands) ═══\n${finalSpellsArr.map(s => `  ${s.quantity}x ${s.name} [${s.role}]`).join('\n')}`;
  addLog(logGemini);
  console.log(logGemini); 

  const banlistSwaps = [];
  const customBannedLower = parseCustomBanlistString(formData.customBanlist);
  let sanitizedFinals_ArraySpells = [];

  for (const c of finalSpellsArr) {
      let tempFixedC = { ...c }; 
      let nameLower = tempFixedC.name.toLowerCase();

      // Banneos Globales oficiales y de la casa (Custom Banlist)
      if (customBannedLower.some(banned => nameLower === banned || nameLower.includes(banned))) {
          const substitution = getIntelligentSubstitution(tempFixedC.name, tempFixedC.role);
          addLog(`[VETO BANLIST DE LA CASA] Carta prohibida por el usuario detectada: "${tempFixedC.name}" (Rol: ${tempFixedC.role || 'no especificado'}). Reemplazada por staple legal: "${substitution}".`);
          banlistSwaps.push({ original: tempFixedC.name, replacement: substitution });
          tempFixedC.name = substitution;
          nameLower = substitution.toLowerCase();
      } else if (BATTLEBOX_BANLIST.includes(tempFixedC.name)) {
          const substitution = getIntelligentSubstitution(tempFixedC.name, tempFixedC.role); 
          addLog(`[VETO BANLIST] Carta prohibida detectada: "${tempFixedC.name}" (Rol: ${tempFixedC.role || 'no especificado'}). Reemplazada por staple legal de rol equivalente: "${substitution}".`);
          banlistSwaps.push({ original: tempFixedC.name, replacement: substitution });
          tempFixedC.name = substitution; 
          nameLower = substitution.toLowerCase();
      }

      // --- JUEZ PARASITARIO REACTIVO ---
      const matchedName = await findFuzzyMatchInDB(tempFixedC.name);
      const cardMetadata = matchedName ? await getCardFromDB(matchedName) : null;
      
      if (cardMetadata) {
          const typeLine = (cardMetadata.type_line || '').toLowerCase();
          const oracleText = (cardMetadata.oracle_text || '').toLowerCase();
          const combinedText = `${cardMetadata.name.toLowerCase()} | ${typeLine} | ${oracleText}`;
          
          let isParasitic = false;
          let parasiticReason = '';
          for (const rule of PARASITIC_RULES) {
              if (rule.regex.test(combinedText)) {
                  if (!rule.allowed(formData)) {
                      isParasitic = true;
                      parasiticReason = rule.message;
                      break;
                  }
              }
          }
          
          if (isParasitic) {
              const substitution = getIntelligentSubstitution(tempFixedC.name, tempFixedC.role);
              addLog(`[JUEZ PARASITARIO REACTIVO] Carta "${tempFixedC.name}" detectada como parasitaria (${parasiticReason}). Transmutada inteligentemente por: "${substitution}".`);
              banlistSwaps.push({ original: tempFixedC.name, replacement: `${substitution} (Poda Parasitaria)` });
              tempFixedC.name = substitution;
              nameLower = substitution.toLowerCase();
          }
      }

      // HARD CAP: Truncado estricto matemático
      const maxLimit = getMaxAllowedCopies(tempFixedC.name, tempFixedC.category, tempFixedC.cmc, ragResult.pool);
      if (tempFixedC.quantity > maxLimit) {
          addLog(`[HARD CAP JS] Alucinación detectada: Reduciendo "${tempFixedC.name}" de ${tempFixedC.quantity}x a ${maxLimit}x.`);
          tempFixedC.quantity = maxLimit;
      }
      
      sanitizedFinals_ArraySpells.push(tempFixedC);
  }

   // 3.2. PROCESADO DE MUST-INCLUDE (Reglas de la Casa)
   const resolvedMustInclude = [];
   if (formData.mustInclude) {
       addLog(`[REGLAS DE LA CASA] Analizando lista de inclusión obligatoria: "${formData.mustInclude}"...`);
       const parsedMusts = parseUserRulesString(formData.mustInclude);
       for (const item of parsedMusts) {
           addLog(`[REGLAS DE LA CASA] Buscando coincidencia difusa para "${item.name}"...`);
           const matchedName = await findFuzzyMatchInDB(item.name);
           if (matchedName) {
               const fullCard = await getCardFromDB(matchedName);
               if (fullCard) {
                   const typeLower = (fullCard.type_line || '').toLowerCase();
                   let cat = "Creature";
                   if (typeLower.includes("instant")) cat = "Instant";
                   else if (typeLower.includes("sorcery")) cat = "Sorcery";
                   else if (typeLower.includes("artifact")) cat = "Artifact";
                   else if (typeLower.includes("enchantment")) cat = "Enchantment";
                   else if (typeLower.includes("planeswalker")) cat = "Planeswalker";
                   
                   resolvedMustInclude.push({
                       name: fullCard.name,
                       quantity: item.quantity,
                       category: cat,
                       cmc: fullCard.mana_value || 0,
                       role: "must-include"
                   });
                   addLog(`[REGLAS DE LA CASA] Carta obligatoria resuelta con éxito: "${fullCard.name}" con cantidad ${item.quantity}x.`);
               } else {
                   addLog(`[REGLAS DE LA CASA] ADVERTENCIA: No se pudo obtener la carta "${matchedName}" de la base de datos.`);
               }
           } else {
               resolvedMustInclude.push({
                   name: item.name,
                   quantity: item.quantity,
                   category: "Sorcery",
                   cmc: 2,
                   role: "must-include"
               });
               addLog(`[REGLAS DE LA CASA] ADVERTENCIA: No se encontró coincidencia en DB para "${item.name}". Añadiendo con metadatos genéricos.`);
           }
       }
   }

   // Enforzar e Inyectar los Must-Inclusions
   const mustIncludeNamesList = resolvedMustInclude.map(m => m.name.toLowerCase());
   for (const mustCard of resolvedMustInclude) {
       const existing = sanitizedFinals_ArraySpells.find(s => s.name.toLowerCase() === mustCard.name.toLowerCase());
       if (existing) {
           if (existing.quantity < mustCard.quantity) {
               addLog(`[REGLAS DE LA CASA] Aumentando cantidad de la obligatoria "${existing.name}" de ${existing.quantity}x a ${mustCard.quantity}x.`);
               existing.quantity = mustCard.quantity;
           }
       } else {
           addLog(`[REGLAS DE LA CASA] Inyectando carta obligatoria no generada originalmente: ${mustCard.quantity}x "${mustCard.name}"`);
           sanitizedFinals_ArraySpells.push(mustCard);
       }
   }

   // === LOG 4: JUEZ DELTA (Banlist & Must-Include) ===
   const logDelta = `═══ JUEZ DELTA ═══\n` +
     (banlistSwaps.length > 0 ? `  Swaps Banlist:\n${banlistSwaps.map(s => `    - ${s.original} → ${s.replacement}`).join('\n')}\n` : '  Swaps Banlist: Ninguno\n') +
     (resolvedMustInclude.length > 0 ? `  Must-Includes inyectados/ajustados:\n${resolvedMustInclude.map(s => `    - ${s.quantity}x ${s.name}`).join('\n')}` : '  Must-Includes: Ninguno');
   addLog(logDelta);
   console.log(logDelta);

  // 3.5. THE SUPREME JUDGE AI (Relleno de Huecos y Arreglo de Redundancias)
  const hasYorion = sanitizedFinals_ArraySpells.some(s => s.name.toLowerCase().includes("yorion, sky nomad")) || (formData?.companero && formData.companero.toLowerCase().includes("yorion"));
  const deckSize = hasYorion ? 80 : 60;
  
  let metricalTargetLnd = calculatePerfectLandCount(sanitizedFinals_ArraySpells, formData, hasYorion);
  let maxRequired = deckSize - metricalTargetLnd;
  let countAct = sanitizedFinals_ArraySpells.reduce( (acc , b) => acc+(b.quantity || 1), 0 ); 
  let gap = maxRequired - countAct;

  const logBalance = `═══ BALANCE PRE-JUEZ ═══\n  Hechizos Actuales: ${countAct} (Requeridos: ${maxRequired})\n  Tierras Meta (Karsten): ${metricalTargetLnd}\n  Diferencial a corregir: ${gap}`;
  addLog(logBalance);
  console.log(logBalance);

  if (gap !== 0 || sanitizedFinals_ArraySpells.length > 0) { // Siempre llamamos al Juez
      onProgress('assembler', '⚖️ Juez Supremo corrigiendo matemáticas y redundancias (máx 25s)...');
      addLog("Iniciando auditoría del Juez Supremo (timeout: 25s)...");

      const mechanicalAlerts = performMechanicalAuditory(sanitizedFinals_ArraySpells, strategyId);

      const judgeSystemPrompt = `
Eres el Juez Supremo del Pro Tour de Magic: The Gathering.
Tu trabajo es arreglar cualquier error matemático del constructor previo y eliminar redundancias funcionales perjudiciales.

${getStrategySynergyPrompt(strategyId)}
${mechanicalAlerts}

REGLAS ESTRATÉGICAS:
1. EL MAZO DEBE TENER EXACTAMENTE ${maxRequired} CARTAS EN TOTAL. Actualmente tiene ${countAct} cartas. Te faltan o sobran ${gap} cartas.
2. Si te faltan cartas (gap > 0), añade EXACTAMENTE esa cantidad usando el esquema 'additions'. Prioriza staples verdaderos del RAG pool.
3. Si te sobran cartas (gap < 0), indica en 'swaps' que reemplazas copias de una carta por nada (borrado).
4. REDUNDANCIA FUNCIONAL Y COHERENCIA MECÁNICA: Revisa meticulosamente las sinergias. Si el mazo tiene hechizos de reanimación incompatibles con las criaturas grandes (por ejemplo, Unearth para criaturas de coste > 3), DEBES usar 'swaps' para reemplazar esos hechizos (ej. cambiar Unearth por Persist, Late to Dinner o Exhume) o cambiar las criaturas por criaturas elegibles de coste <=3.
5. RESPETA LA IDENTIDAD: Manten los colores requeridos [ ${baseIdent_ColorStr} ] y la tribu [ ${tribeLabel} ].
6. SIN DEVALUACIÓN NI ALUCINACIÓN DE CMC: Los valores de coste de maná (CMC) de las cartas indicados en la lista y en el RAG pool son 100% correctos y reales. NUNCA asumas costes de maná distintos a los listados (por ejemplo, no consideres que 'Sidisi, Regent of the Mire' es coste 5 si se indica que es coste 2). Confía ciegamente en la matemática de costes suministrada.
7. CONTEXTUALIZACIÓN TRIBAL DE LA REGLA DE ORO: Si hay una tribu activa ("${tribeLabel}" !== "Ninguna" y "${tribeLabel}" !== "none"), la Regla de Oro sobre las cartas de coste 1-3 de tu estrategia se flexibiliza. Se permite y promueve que las criaturas de coste 1-3 sean habilitadores, lords o motores tribales directos (en lugar de ser interactores defensivos reactivos), incluso si el arquetipo es Control o Midrange. La sinergia y coherencia tribal de coste bajo es prioritaria.
`;

      const currentSpellsText = sanitizedFinals_ArraySpells.map(s => `- ${s.quantity}x ${s.name} (CMC: ${s.cmc}, Rol: ${s.role})`).join('\n');
      
      const judgeContextPrompt = `
CONFIGURACIÓN DE LA BARAJA:
- Formato Objetivo: ${(formData.format || 'MODERN').toUpperCase()}
- Arquetipo: ${archetypeObj.label || 'No declarado'}
- Estrategia: ${strategyObj.label || 'Ninguna'}
- Tribu: ${tribeLabel}

LISTA DE HECHIZOS ACTUAL (${countAct} cartas - Necesitas llegar a ${maxRequired}):
${currentSpellsText}

POZA DE CARTAS (RAG POOL - Úsalas para 'additions' o 'swaps'):
${poolText}

Analiza profundamente el mazo. Devuelve el JSON requerido con 'additions' (para cubrir el hueco de ${gap} cartas con suma precisión matemática) y 'swaps' (para arreglar las redundancias). Si gap es 0, 'additions' puede ir vacío.
`;

      const JUDGE_TIMEOUT = 25000;
      try {
        const judgePromise = callAI([
            { role: 'system', content: judgeSystemPrompt },
            { role: 'user', content: judgeContextPrompt }
        ], aiConfig, { forceJSON: true, maxTokens: 1500, schema: GEMINI_SUPREME_JUDGE_SCHEMA });
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Judge timeout (25s) — fallback a JS matemático')), JUDGE_TIMEOUT)
        );
        
        const judgeResponse = await Promise.race([judgePromise, timeoutPromise]);
        const judgeResult = typeof judgeResponse === 'string' ? cleanAndParseJSON(judgeResponse) : judgeResponse;
        
        const additions = judgeResult?.additions || [];
        const swaps = judgeResult?.swaps || [];

        // 1. Aplicar Swaps
        if (swaps.length > 0) {
            addLog(`[JUEZ SUPREMO] Aplicando ${swaps.length} arreglos de redundancia funcional:`);
            swaps.forEach(swap => {
                // Búsqueda difusa para el nombre a reemplazar
                let existingIdx = sanitizedFinals_ArraySpells.findIndex(s => s.name.toLowerCase().includes(swap.replace.toLowerCase()) || swap.replace.toLowerCase().includes(s.name.toLowerCase()));
                if (existingIdx !== -1) {
                    const originalCard = sanitizedFinals_ArraySpells[existingIdx];
                    const swapQty = Math.min(swap.quantity, originalCard.quantity);
                    originalCard.quantity -= swapQty;
                    addLog(`   * Swap: Quitados ${swapQty}x de "${originalCard.name}". Razón: ${swap.reason}`);
                    
                    if (originalCard.quantity <= 0) sanitizedFinals_ArraySpells.splice(existingIdx, 1);
                    
                    if (swap.with && swap.with.trim() !== "" && swap.with.toLowerCase() !== "none" && swap.with.toLowerCase() !== "null") {
                        const ragCard = ragResult.pool.find(rc => rc.name.toLowerCase().includes(swap.with.toLowerCase()) || swap.with.toLowerCase().includes(rc.name.toLowerCase()));
                        const newCmc = ragCard ? ragCard.mana_value : originalCard.cmc;
                        let newCat = "Creature";
                        if (ragCard) {
                             const t = ragCard.type_line.toLowerCase();
                             if (t.includes("instant")) newCat = "Instant";
                             else if (t.includes("sorcery")) newCat = "Sorcery";
                             else if (t.includes("artifact")) newCat = "Artifact";
                             else if (t.includes("enchantment")) newCat = "Enchantment";
                             else if (t.includes("planeswalker")) newCat = "Planeswalker";
                        }
                        sanitizedFinals_ArraySpells.push({
                            name: swap.with,
                            quantity: swapQty,
                            category: newCat,
                            cmc: newCmc,
                            role: "judge-swap"
                        });
                        addLog(`   * Swap: Añadidos ${swapQty}x de "${swap.with}".`);
                    }
                }
            });
        }

        // 2. Re-calcular gap por si los swaps no fueron un 1 a 1 perfecto
        let currentCount = sanitizedFinals_ArraySpells.reduce((acc, b) => acc + (b.quantity || 1), 0);
        let newGap = maxRequired - currentCount;

        // 3. Aplicar Additions
        if (additions.length > 0 && newGap > 0) {
            addLog(`[JUEZ SUPREMO] Añadiendo cartas para cubrir el déficit de ${newGap} cartas:`);
            additions.forEach(add => {
                if (newGap <= 0) return; // Límite estricto
                const addQty = Math.min(add.quantity, newGap);
                if (addQty <= 0) return;
                
                const ragCard = ragResult.pool.find(rc => rc.name.toLowerCase().includes(add.name.toLowerCase()) || add.name.toLowerCase().includes(rc.name.toLowerCase()));
                let newCat = "Creature";
                let newCmc = 2;
                if (ragCard) {
                     newCmc = ragCard.mana_value;
                     const t = ragCard.type_line.toLowerCase();
                     if (t.includes("instant")) newCat = "Instant";
                     else if (t.includes("sorcery")) newCat = "Sorcery";
                     else if (t.includes("artifact")) newCat = "Artifact";
                     else if (t.includes("enchantment")) newCat = "Enchantment";
                     else if (t.includes("planeswalker")) newCat = "Planeswalker";
                }
                
                sanitizedFinals_ArraySpells.push({
                    name: add.name,
                    quantity: addQty,
                    category: newCat,
                    cmc: newCmc,
                    role: "judge-addition"
                });
                newGap -= addQty;
                addLog(`   * Añadido: ${addQty}x "${add.name}". Razón: ${add.reason}`);
            });
        }
        
        addLog("[JUEZ SUPREMO] Veredicto táctico aplicado con éxito.");

      } catch (err) {
        addLog(`[JUEZ SUPREMO] Omitido (${err.message}). Activando paracaídas matemático JS...`);
      }

      // 4. FASE 1: AUDITORÍA DE HECHIZOS (Spell Audit Only)
      addLog("[FASE 1] Ejecutando Auditoría de Hechizos...");
      const spellAuditResult = await aplicarJuezFinal(
          { cards: sanitizedFinals_ArraySpells },
          dnaData,
          formData,
          addLog,
          ragResult.pool,
          true, // preserveLands
          true  // spellAuditOnly
      );
      sanitizedFinals_ArraySpells = spellAuditResult.cards;

      // PARACAÍDAS JS FINAL (Infalibilidad Matemática sobre Hechizos)
      const metricalTargetLnd_local = calculatePerfectLandCount(sanitizedFinals_ArraySpells, formData, hasYorion);
      let targetSpellsCount = deckSize - metricalTargetLnd_local;
      let finalCheckCount = sanitizedFinals_ArraySpells.reduce((acc, b) => acc + (b.quantity || 1), 0);
      let finalGap = targetSpellsCount - finalCheckCount;
      if (finalGap > 0) {
          addLog(`[PARACAÍDAS JS] El Juez de Hechizos se quedó corto por ${finalGap} cartas. Forzando relleno matemático.`);
          sanitizedFinals_ArraySpells = distribuirOInyectarHechizosFaltantes(sanitizedFinals_ArraySpells, targetSpellsCount, formData?.colores || [], addLog, ragResult.pool, formData);
      } else if (finalGap < 0) {
          addLog(`[PARACAÍDAS JS] El Juez de Hechizos se pasó por ${Math.abs(finalGap)} cartas. Forzando recorte matemático.`);
          sanitizedFinals_ArraySpells = recortarHechizosExcedentesInteligente(sanitizedFinals_ArraySpells, targetSpellsCount, addLog, mustIncludeNamesList);
      }
  } else {
      // Si no hay Juez Supremo, aún necesitamos calcular variables
      const metricalTargetLnd_local = calculatePerfectLandCount(sanitizedFinals_ArraySpells, formData, hasYorion);
      let targetSpellsCount = deckSize - metricalTargetLnd_local;
      let finalCheckCount = sanitizedFinals_ArraySpells.reduce((acc, b) => acc + (b.quantity || 1), 0);
      let finalGap = targetSpellsCount - finalCheckCount;
      if (finalGap > 0) {
          sanitizedFinals_ArraySpells = distribuirOInyectarHechizosFaltantes(sanitizedFinals_ArraySpells, targetSpellsCount, formData?.colores || [], addLog, ragResult.pool, formData);
      } else if (finalGap < 0) {
          sanitizedFinals_ArraySpells = recortarHechizosExcedentesInteligente(sanitizedFinals_ArraySpells, targetSpellsCount, addLog, mustIncludeNamesList);
      }
  }

  // Ahora recalculamos pips reales con la lista final de hechizos sanitizada
  metricalTargetLnd = calculatePerfectLandCount(sanitizedFinals_ArraySpells, formData, hasYorion);
 
  // === AUDITORÍA DETERMINISTA DE PIPS REALES ===
  let recalculatedPips = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  sanitizedFinals_ArraySpells.forEach(card => {
      const poolCard = (ragResult?.pool || []).find(c => c.name.trim().toLowerCase() === card.name.trim().toLowerCase()) || {};
      let cost = poolCard.mana_cost || card.mana_cost || '';
      if (poolCard.card_faces && poolCard.card_faces[0] && typeof poolCard.card_faces[0].mana_cost === 'string') {
          cost = poolCard.card_faces[0].mana_cost;
      } else if (card.card_faces && card.card_faces[0] && typeof card.card_faces[0].mana_cost === 'string') {
          cost = card.card_faces[0].mana_cost;
      }
      const qty = Number(card.quantity || 1);
      
      let hasPips = false;
      if (cost.includes('{W}')) { recalculatedPips.W += (cost.match(/\{W\}/g) || []).length * qty; hasPips = true; }
      if (cost.includes('{U}')) { recalculatedPips.U += (cost.match(/\{U\}/g) || []).length * qty; hasPips = true; }
      if (cost.includes('{B}')) { recalculatedPips.B += (cost.match(/\{B\}/g) || []).length * qty; hasPips = true; }
      if (cost.includes('{R}')) { recalculatedPips.R += (cost.match(/\{R\}/g) || []).length * qty; hasPips = true; }
      if (cost.includes('{G}')) { recalculatedPips.G += (cost.match(/\{G\}/g) || []).length * qty; hasPips = true; }

      // Fallback si no hay pips explícitos en coste
      if (!hasPips) {
          let cardColors = poolCard.colors || poolCard.color_identity || card.colors || card.color_identity || [];
          if (typeof cardColors === 'string') cardColors = [cardColors];
          cardColors.forEach(col => {
              const upperCol = String(col).toUpperCase();
              if (recalculatedPips[upperCol] !== undefined) {
                  recalculatedPips[upperCol] += 1 * qty;
              }
          });
      }
  });

  // Sobrescribir pips_balance en metricsPIPsStruct con los pips deterministas reales recalculados
  Object.keys(recalculatedPips).forEach(color => {
      metricsPIPsStruct[color] = recalculatedPips[color];
  });
 
  onProgress('judge', '🌐 Trazando Matemática Perfecta del Flujo Natural Generando Pips Lands de JS Puro..'); 
  
  const requestedColorsSet = new Set(formData?.colores || []);
  let validCurrentGenUsedStrPipKeysBaseArrayDetected = Object.keys(metricsPIPsStruct).filter(mX => metricsPIPsStruct[mX] > 0 || requestedColorsSet.has(mX));

  // Llamada pura base interna Matemática: Se genera en fracción mileseg exactitud!
  const aiUtilityLands = validResultsStruct.utility_lands_recommendations || [];
  addLog(`Generando lands con pipBalance: ${JSON.stringify(metricsPIPsStruct)} y total lands: ${metricalTargetLnd}, utility recomendadas: ${aiUtilityLands.join(', ')}`);
  const finalCalculated_RealJsBaseLandsArraysInjectionObjListReady_FromDecCalc = await generateManaBase(metricsPIPsStruct, metricalTargetLnd, validCurrentGenUsedStrPipKeysBaseArrayDetected, formData, sanitizedFinals_ArraySpells, aiUtilityLands);

  // === LOG 6: KARSTEN MATH (Lands) ===
  const logKarsten = `═══ KARSTEN MATH (Tierras inyectadas) ═══\n  Pips Base: ${JSON.stringify(metricsPIPsStruct)}\n${finalCalculated_RealJsBaseLandsArraysInjectionObjListReady_FromDecCalc.map(l => `  ${l.quantity}x ${l.name}`).join('\n')}`;
  addLog(logKarsten);
  console.log(logKarsten);

  // Final Merging
  validResultsStruct.cards = [ ...sanitizedFinals_ArraySpells, ...finalCalculated_RealJsBaseLandsArraysInjectionObjListReady_FromDecCalc ];

  // FASE 2: AUDITORÍA DE TIERRAS Y SIDEBOARD (aplicarJuezFinal con preserveLands=false, spellAuditOnly=false)
  addLog("[FASE 2] Ejecutando Auditoría de Tierras y Sideboard...");
  const finalJuezResult = await aplicarJuezFinal(validResultsStruct, dnaData, formData, addLog, ragResult.pool, false, false);
  validResultsStruct.cards = finalJuezResult.cards;
  validResultsStruct.sideboard = finalJuezResult.sideboard;
  validResultsStruct.sideboard_strategy = finalJuezResult.sideboard_strategy;

  // =========================================================================
  // ⚔️ SANITIZACIÓN Y CONSOLIDACIÓN SUPREMA FINAL (EL JUEZ INVICTO)
  // =========================================================================
  addLog("[JUEZ SUPREMO] Iniciando capa de consolidación y control de caps definitivos...");

  // 1. Limpieza inicial: eliminar nulos/vacíos y trimar nombres
  let rawCards = (validResultsStruct.cards || []).filter(c => c && c.name && c.quantity > 0);
  
  // 2. Agrupación y Sumarización Caso-Insensible Estricta
  const consolidatedMap = new Map();
  for (const card of rawCards) {
      const nameClean = card.name.trim();
      const key = nameClean.toLowerCase();
      if (consolidatedMap.has(key)) {
          const existing = consolidatedMap.get(key);
          existing.quantity += card.quantity;
          // Preservar la categoría o rol si el anterior no lo tenía
          if (!existing.role && card.role) existing.role = card.role;
          if (!existing.category && card.category) existing.category = card.category;
          if ((existing.cmc === undefined || existing.cmc === null) && card.cmc !== undefined) existing.cmc = card.cmc;
      } else {
          consolidatedMap.set(key, {
              ...card,
              name: nameClean // Nombre sanitizado
          });
      }
  }

  let consolidatedList = Array.from(consolidatedMap.values());

  // 3. Aplicar de nuevo getMaxAllowedCopies sobre cada entrada única consolidada
  for (const card of consolidatedList) {
      const cap = getMaxAllowedCopies(card.name, card.category, card.cmc, ragResult.pool);
      if (card.quantity > cap) {
          addLog(`[CONSOLIDACIÓN SUPREMA] Redundancia crítica detectada en "${card.name}": ${card.quantity} copias exceden el límite Pro Tour de ${cap}. Capando a ${cap} copias.`);
          card.quantity = cap;
      }
  }

  // 4. Separar Hechizos y Tierras para forzar exactitud matemática
  const targetLandsCount = metricalTargetLnd;
  const targetSpellsCount = deckSize - targetLandsCount;

  let finalSpells = consolidatedList.filter(c => c.category !== 'Land');
  let finalLands = consolidatedList.filter(c => c.category === 'Land');

  let finalSpellsSum = finalSpells.reduce((sum, c) => sum + (c.quantity || 0), 0);
  let finalLandsSum = finalLands.reduce((sum, c) => sum + (c.quantity || 0), 0);

  // Ajustar Hechizos
  if (finalSpellsSum < targetSpellsCount) {
      addLog(`[CONSOLIDACIÓN SUPREMA] Déficit en hechizos (${finalSpellsSum}/${targetSpellsCount}). Inyectando compensación inteligente...`);
      finalSpells = distribuirOInyectarHechizosFaltantes(finalSpells, targetSpellsCount, formData?.colores || [], addLog, ragResult.pool, formData);
  } else if (finalSpellsSum > targetSpellsCount) {
      addLog(`[CONSOLIDACIÓN SUPREMA] Exceso en hechizos (${finalSpellsSum}/${targetSpellsCount}). Recortando de forma táctica...`);
      finalSpells = recortarHechizosExcedentesInteligente(finalSpells, targetSpellsCount, addLog, mustIncludeNamesList);
  }

  // Ajustar Tierras
  if (finalLandsSum < targetLandsCount) {
      let missing = targetLandsCount - finalLandsSum;
      addLog(`[CONSOLIDACIÓN SUPREMA] Déficit en tierras (${finalLandsSum}/${targetLandsCount}). Añadiendo ${missing} tierras básicas...`);
      const basicLand = finalLands.find(l => ["plains", "island", "swamp", "mountain", "forest", "wastes", "llanura", "isla", "pantano", "montaña", "bosque", "yermo"].includes(l.name.toLowerCase()));
      if (basicLand) {
          basicLand.quantity += missing;
      } else {
          const colors = formData?.colores || [];
          let basicLandName = "Swamp";
          if (colors.includes("W")) basicLandName = "Plains";
          else if (colors.includes("U")) basicLandName = "Island";
          else if (colors.includes("R")) basicLandName = "Mountain";
          else if (colors.includes("G")) basicLandName = "Forest";
          finalLands.push({ name: basicLandName, quantity: missing, category: "Land", cmc: 0 });
      }
  } else if (finalLandsSum > targetLandsCount) {
      let excess = finalLandsSum - targetLandsCount;
      addLog(`[CONSOLIDACIÓN SUPREMA] Exceso en tierras (${finalLandsSum}/${targetLandsCount}). Reduciendo ${excess} tierras...`);
      // Primer pase: reducir copias extra (respetando al menos 1)
      for (let land of finalLands) {
          if (excess <= 0) break;
          let reduction = Math.min(land.quantity - 1, excess);
          if (reduction > 0) {
              land.quantity -= reduction;
              excess -= reduction;
          }
      }
      
      // Segundo pase: si aún sobran, borrar tierras por completo (empezando por básicas)
      if (excess > 0) {
          finalLands.sort((a, b) => {
              const isBasicA = ["plains", "island", "swamp", "mountain", "forest", "wastes"].includes(a.name.toLowerCase());
              const isBasicB = ["plains", "island", "swamp", "mountain", "forest", "wastes"].includes(b.name.toLowerCase());
              return isBasicA === isBasicB ? 0 : isBasicA ? -1 : 1;
          });
          
          for (let land of finalLands) {
              if (excess <= 0) break;
              if (land.quantity > 0) {
                  let reduction = Math.min(land.quantity, excess);
                  land.quantity -= reduction;
                  excess -= reduction;
              }
          }
      }
  }

  // 5. Re-consolidar y filtrar nulos/ceros por última vez
  validResultsStruct.cards = [...finalSpells, ...finalLands].filter(c => c && c.quantity > 0);
  const finalTotal = validResultsStruct.cards.reduce((sum, c) => sum + c.quantity, 0);
  addLog(`[CONSOLIDACIÓN SUPREMA] Mazo verificado con éxito. Total absoluto de cartas: ${finalTotal}/${deckSize}.`);
    
    // Filtrar cartas que hayan quedado con cantidad 0
    validResultsStruct.cards = validResultsStruct.cards.filter(c => c.quantity > 0);
    
    // === DETERMINISTIC HYPERGEOMETRIC VALIDATION API (POST /api/alg) ===
    let validationEngine = 'local';
    let validationData = null;
    try {
        const apiEndpoint = API_ENDPOINTS.VALIDATION.API_ALG;
        addLog(`[HYPERGEOMETRIC API] Enviando mazo para validación determinista a ${apiEndpoint}...`);
        
        onProgress('validate', '📊 Validando base de maná con el Motor Hipergeométrico...');
        
        const payload = {
            deck: validResultsStruct.cards.map(c => ({
                name: c.name,
                quantity: c.quantity,
                category: c.category || (((c.type_line || '').toLowerCase().includes('land') || ['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes', 'llanura', 'isla', 'pantano', 'montaña', 'bosque', 'yermo'].includes(c.name.toLowerCase())) ? 'Land' : 'Spell'),
                cmc: c.mana_value || c.cmc || 0
            })),
            metadata: {
                archetype: formData?.archetype || 'midrange',
                strategy: formData?.strategy || '',
                format: formData?.format || 'MODERN',
                colores: formData?.colores || []
            }
        };

        const fetchPromise = fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(API_ENDPOINTS.SPICERACK.API_KEY ? { 'Authorization': `Bearer ${API_ENDPOINTS.SPICERACK.API_KEY}` } : {})
            },
            body: JSON.stringify(payload)
        }).then(async res => {
            if (!res.ok) {
                throw new Error(`HTTP Error ${res.status}`);
            }
            return res.json();
        });

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout de 3000ms excedido')), 3000);
        });

        validationData = await Promise.race([fetchPromise, timeoutPromise]);
        validationEngine = 'hypergeometric';
        addLog(`[HYPERGEOMETRIC API] Validación determinista completada exitosamente vía Spicerack.`);
        
        // Inyectar recomendaciones de optimización adicionales si están presentes en la respuesta
        if (validationData?.recommendations && Array.isArray(validationData.recommendations)) {
            addLog(`[HYPERGEOMETRIC API] Añadiendo recomendaciones de optimización del motor.`);
            if (!validResultsStruct.recommendations) {
                validResultsStruct.recommendations = [];
            }
            const cleanRecs = validationData.recommendations.map(r => {
                if (typeof r === 'string') return { title: 'Optimización de Maná', description: r };
                return { title: r.title || 'Optimización de Maná', description: r.description || '' };
            });
            validResultsStruct.recommendations = [
                ...validResultsStruct.recommendations,
                ...cleanRecs
            ];
        }
    } catch (err) {
        addLog(`[HYPERGEOMETRIC API] ⚠️ Error en API o Timeout (${err.message}). Activando paracaídas de heurísticas locales...`);
        validationEngine = 'local';
    }

    validResultsStruct.validationEngine = validationEngine;
    validResultsStruct.validationData = validationData;

    // Agregar logs detallados al metadata para el Oráculo
    validResultsStruct.banlistSwaps = banlistSwaps;
    validResultsStruct.generationLogs = {
      logs: logs,
      systemPrompt: STRICT_INSTRUCTIONS_PROMPT,
      contextPrompt: contextGen_Prompt,
      rawResponse: typeof genResponseRawJson_Object === 'string' ? genResponseRawJson_Object : JSON.stringify(genResponseRawJson_Object)
    };

    onProgress('done', '🎉 Forja Kitchen Table Generada Exitosamente.');
    addLog("Proceso de forjado completado con éxito.");
    return validResultsStruct; 
  } catch (error) {
    addLog(`[ERROR CRÍTICO PIPELINE] ${error.message}`);
    if (error.stack) {
      addLog(error.stack);
    }
    if (!error.generationLogs) {
      error.generationLogs = {
        logs: logs,
        systemPrompt: STRICT_INSTRUCTIONS_PROMPT || '',
        contextPrompt: contextGen_Prompt || '',
        rawResponse: typeof genResponseRawJson_Object === 'string' ? genResponseRawJson_Object : JSON.stringify(genResponseRawJson_Object || ''),
        error: error.message,
        stack: error.stack
      };
    } else {
      error.generationLogs.error = error.message;
      error.generationLogs.stack = error.stack;
    }
    throw error;
  }
}
