import { generateManaBase, calculatePerfectLandCount, calculateVMP } from './deckCalculator.js'; 
import { callAI } from './aiFactory.js';
import { BATTLEBOX_BANLIST, BANLIST_SUBSTITUTIONS, BATTLEBOX_ARCHETYPES, MTG_STRATEGIES, MTG_TRIBES, getIntelligentSubstitution } from '../constants/legacyBattleBox.js';
import { buildCardPool } from './ragService.js';
import { findFuzzyMatchInDB, getCardFromDB } from './cardHydrator.js';

/**
 * Limpia y parsea de forma segura respuestas JSON de la IA que puedan incluir cercas de código de markdown.
 */
function cleanAndParseJSON(str) {
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
    
    // Búsqueda defensiva del primer corchete/llave y el último corchete/llave correspondiente
    const firstBrace = clean.search(/[\{\["']/);
    if (firstBrace !== -1) {
        clean = clean.substring(firstBrace);
    }
    const startChar = clean.charAt(0);
    const endBrace = clean.lastIndexOf(startChar === '{' ? '}' : (startChar === '[' ? ']' : startChar));
    if (endBrace !== -1) {
        clean = clean.substring(0, endBrace + 1);
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
  type: "OBJECT",
  properties: {
    deckName: { type: "STRING", description: "A concise, thematic name for the deck." },
    archetype: { type: "STRING" },
    strategy: { type: "STRING" },
    technical_metrics: {
        type: "OBJECT",
        properties: {
             land_target: { type: "NUMBER", description: "Mathematical target for lands (e.g., 20, 22, 24 depending on curve aggressiveness)" },
             pips_balance: {
                type: "OBJECT",
                description: "Proportion of mana pips required -> E.g., B: 20, W:0, U:10, R:5, G:0",
                properties: { "W": {type:"NUMBER"}, "U": {type:"NUMBER"}, "B": {type:"NUMBER"}, "R": {type:"NUMBER"}, "G": {type:"NUMBER"} }
             }
        }
    },
    spells: {
      type: "ARRAY",
      description: "ARRAY OF SPELLS (Creatures, Sorceries, etc). 0 LANDS HERE. Use OFFICIAL SCRYFALL ENGLISH NAMES ONLY.",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          quantity: { type: "NUMBER", description: "Min 1, Max 4 copies." },
          category: { type: "STRING", description: "Elige entre: Spell, Creature, Sorcery, Instant, Artifact, Enchantment, Planeswalker." },
          cmc: { type: "NUMBER" },
          role: { type: "STRING", description: "Rol estratégico: Debe coincidir exactamente con uno de los roles definidos en el PLANO de construcción." }
        },
        required: ["name", "quantity", "category", "cmc", "role"]
      }
    }
  },
  required: ["deckName", "strategy", "technical_metrics", "spells"]
};

// 2. EL ESQUEMA DE REPOSICIONAMIENTO/AFINAMIENTO DEL COACH
const GEMINI_REFINER_SCHEMA = {
  type: "OBJECT",
  properties: {
    swaps: {
      type: "ARRAY",
      description: "List of strategic card swaps to optimize the deck. Maximum 3 swaps.",
      items: {
        type: "OBJECT",
        properties: {
          replace: { type: "STRING", description: "Name of the card in the current spells list to replace (e.g., 'Elvish Mystic')." },
          with: { type: "STRING", description: "Name of the competitive card from the RAG pool or Modern staples to inject (e.g., 'Noble Hierarch')." },
          reason: { type: "STRING", description: "Tactical explanation of why this swap improves the deck." }
        },
        required: ["replace", "with", "reason"]
      }
    }
  },
  required: ["swaps"]
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

  if (strategyId === 'reanimator') {
    return { 
      totalSpells: 36,
      roles: { reanimation_creature_targets: 8, reanimation_spells: 10, discard_enablers: 10, interaction_and_protection: 8 }
    };
  }

  if (strategyId === 'aristocrats') {
    return {
      totalSpells: 36,
      roles: { sac_fodder_creatures: 12, sac_outlets: 8, blood_artist_payoffs: 8, removal_and_interaction: 8 }
    };
  }

  if (strategyId === 'tokens') {
    return {
      totalSpells: 36,
      roles: { token_creature_generators: 12, team_anthem_buffs: 8, enablers: 8, interaction: 8 }
    };
  }

  if (strategyId === 'spellslinger') {
    const spellRoleName = hasRed ? "burn_spells" : "interaction_and_removal";
    const protectionRoleName = hasBlue ? "protection_counterspells" : (hasBlack ? "hand_disruption_and_discard" : "interaction_or_combat_tricks");
    return {
      totalSpells: 36,
      roles: { prowess_creatures: 10, cheap_cantrips: 12, [spellRoleName]: 8, [protectionRoleName]: 6 }
    };
  }

  if (strategyId === 'blink') {
    return {
      totalSpells: 36,
      roles: { etb_value_creatures: 14, blink_flicker_spells: 10, enablers: 4, interaction: 8 }
    };
  }

  if (strategyId === 'enchantress') {
    return {
      totalSpells: 36,
      roles: { enchantress_creatures: 10, auras_and_enchantments: 16, ramp_enchantments: 4, interaction: 6 }
    };
  }

  if (strategyId === 'landfall') {
    return {
      totalSpells: 36,
      roles: { landfall_creatures: 12, ramp_spells: 12, payoffs: 4, interaction: 8 }
    };
  }

  if (strategyId === 'graveyard') {
    return {
      totalSpells: 36,
      roles: { self_mill_creatures: 12, graveyard_payoffs: 12, enablers: 4, interaction: 8 }
    };
  }

  if (strategyId === 'lifegain') {
    return {
      totalSpells: 36,
      roles: { lifegain_creatures: 12, pridemate_payoffs: 10, enablers: 6, interaction: 8 }
    };
  }

  if (strategyId === 'prison') {
    return {
      totalSpells: 36,
      roles: { stax_artifacts_enchantments: 16, tax_creatures: 8, removal: 8, win_conditions: 4 }
    };
  }

  if (strategyId === 'voltron') {
    return {
      totalSpells: 36,
      roles: { voltron_creature_commanders: 8, auras_and_equipments: 16, protection_spells: 6, interaction: 6 }
    };
  }

  if (strategyId === 'vehicles') {
    return {
      totalSpells: 36,
      roles: { pilots_and_creatures: 14, great_vehicles: 10, removal: 8, enablers: 4 }
    };
  }

  if (archetype === 'aggro') {
    const removalRoleName = hasRed ? "burn_spells" : "interaction_or_combat_tricks";
    return {
      totalSpells: 40,
      roles: { fast_creatures: 22, [removalRoleName]: 10, synergetic_threats: 8 }
    };
  }

  if (archetype === 'tempo') {
    const protectionRoleName = hasBlue ? "protection_counterspells" : (hasBlack ? "discard_and_hand_disruption" : "interaction_or_combat_tricks");
    return {
      totalSpells: 38,
      roles: { cheap_threats: 14, enablers_or_cantrips: 12, [protectionRoleName]: 6, spot_removal: 6 }
    };
  }

  if (archetype === 'midrange') {
    const rampRoleName = hasGreen ? "mana_dorks_or_ramp" : "spot_removal_or_cantrips";
    return {
      totalSpells: 36,
      roles: { value_creatures: 14, synergetic_threats: 8, [rampRoleName]: 6, interaction_and_disruption: 8 }
    };
  }

  if (archetype === 'control') {
    const lacksHardBoardWipes = !hasWhite && !hasBlack;
    const hasTribe = !!(formData?.tribe && formData.tribe !== 'none' && formData.tribe !== 'ninguna');
    
    if (hasTribe) {
      // Control Tribal/Híbrido: más criaturas, menos hechizos puros de control
      const sweepRoleName = lacksHardBoardWipes ? (hasRed ? "damage_sweepers" : "board_bounce_or_sweepers") : "board_wipes";
      const sweepCount = lacksHardBoardWipes ? 2 : 4;
      const removalCount = lacksHardBoardWipes ? 14 : 12;
      return {
        totalSpells: 36,
        roles: { finishers: 10, [sweepRoleName]: sweepCount, counterspells_and_removal: removalCount + 2, card_draw: 8 }
      };
    }
    
    if (lacksHardBoardWipes) {
      const sweepRoleName = hasRed ? "damage_sweepers" : "board_bounce_or_sweepers";
      return {
        totalSpells: 36,
        roles: { finishers: 6, [sweepRoleName]: 2, counterspells_and_removal: 18, card_draw: 10 }
      };
    }
    return {
      totalSpells: 36,
      roles: { finishers: 6, board_wipes: 4, counterspells_and_removal: 16, card_draw: 10 }
    };
  }

  if (archetype === 'prison') {
    return {
      totalSpells: 36,
      roles: { lock_pieces_and_taxes: 12, threat_creatures: 12, removal_and_interaction: 8, utility_artifacts: 4 }
    };
  }

  if (archetype === 'combo') {
    return {
      totalSpells: 38,
      roles: { combo_pieces: 12, tutors: 10, protection_spells: 8, fast_mana_or_enablers: 8 }
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

// Helper para inyectar carta directamente sin forzar reducción de otras cartas (Module Level)
const inyectarCartaDirecta = (cardList, newCard) => {
    const existing = cardList.find(c => c.name.toLowerCase() === newCard.name.toLowerCase());
    if (existing) {
        existing.quantity = Math.min(4, existing.quantity + newCard.quantity);
        return cardList;
    }
    return [...cardList, newCard];
};

// Helper para obtener el límite competitivo estricto de copias de una carta en el mazo
const getMaxAllowedCopies = (cardName, category, cmc, ragPool = []) => {
    const nameLower = cardName.toLowerCase();
    const isBasic = ["plains", "island", "swamp", "mountain", "forest", "wastes", "llanura", "isla", "pantano", "montaña", "bosque", "yermo"].includes(nameLower);
    if (isBasic) return 99;

    // Buscar en el ragPool para obtener metadatos más completos de Scryfall
    const poolCard = ragPool ? ragPool.find(c => c.name.toLowerCase() === nameLower) : null;
    const typeLine = (poolCard?.type_line || category || "").toLowerCase();
    const isPlaneswalker = typeLine.includes("planeswalker") || category?.toLowerCase() === "planeswalker";
    const isLegendary = typeLine.includes("legendary") || isPlaneswalker;
    const cardCmc = poolCard?.mana_value ?? cmc ?? 0;

    // Límite Pro Tour para cartas legendarias:
    // - CMC ≤ 3 (Bowmasters, Thalia, Ragavan): 4 copias — son motores clave que se maximizan
    // - CMC 4 (Sheoldred, Jace TMS): 3 copias — alta presencia pero riesgo de mano cargada
    // - CMC 5+ (Teferi Hero, Koma): 2 copias — finishers que no quieres en multiples early
    if (isLegendary) {
        if (cardCmc >= 5) return 2;
        if (cardCmc >= 4) return 3;
        return 4; // Leyendas baratas son motores Pro Tour a 4x
    }

    // Límite Pro Tour para cartas no legendarias pesadas
    if (cardCmc >= 5) {
        return 3; // Amenazas pesadas no legendarias (ej: Shark Typhoon, Force of Negation): max 3 copias
    }
    if (cardCmc >= 4) {
        return 4; // Hechizos fuertes no legendarios de coste 4 (ej: Supreme Verdict, Cryptic Command): max 4 copias
    }

    // Cantrips e interactores de bajo coste son excelentes para llevar 4 copias
    return 4;
};

// Helper para distribuir copias faltantes o inyectar nuevos staples de forma segura sin exceder los límites competitivos
const distribuirOInyectarHechizosFaltantes = (spellList, targetCount, colors, addLog, ragPool = []) => {
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

            const nameLower = poolCard.name.toLowerCase();
            const existing = adjustedList.find(c => c.name.toLowerCase() === nameLower);
            if (existing) continue;

            const typeLower = poolCard.type_line ? poolCard.type_line.toLowerCase() : "";
            if (typeLower.includes("creature") || typeLower.includes("land")) continue;

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
        const existing = adjustedList.find(c => c.name.toLowerCase() === staple.name.toLowerCase());
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
        "graveyard_payoffs", "cheap_threats"
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
        return mustIncludeNames.some(m => m.toLowerCase() === name.toLowerCase());
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
export function aplicarJuezFinal(deckResult, dnaData, formData, addLog, ragPool = []) {
    let { cards } = deckResult;
    const strategyObj = MTG_STRATEGIES.find(s => s.id === formData?.strategy || s.label === formData?.strategy) || null;
    const strategyId = strategyObj ? strategyObj.id : (formData?.strategy || '');
    const tribeObj = MTG_TRIBES.find(t => t.id === formData?.tribe || t.label === formData?.tribe) || null;
    const tribeId = tribeObj ? tribeObj.id : (formData?.tribe || '');
    const colors = new Set(formData?.colores || []);
    
    const isControl = formData?.archetype === 'control';
    const isTempo = formData?.archetype === 'tempo';
    const isAggro = formData?.archetype === 'aggro';
    const isMidrange = formData?.archetype === 'midrange' || (!isControl && !isTempo && !isAggro);
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
        const existing = list.find(c => c.name.toLowerCase() === newCard.name.toLowerCase());
        if (existing) {
            existing.quantity = Math.min(4, existing.quantity + newCard.quantity);
            return list;
        }
        list.push(newCard);
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
                
                // Buscar reemplazo en el RAG pool que coincida con el tipo (Criatura/Hechizo)
                const replacementPool = ragPool.filter(poolCard => {
                    const poolCardIsCreature = (poolCard.type_line || '').toLowerCase().includes('creature');
                    return poolCardIsCreature === isCreature && poolCard.name.toLowerCase() !== c.name.toLowerCase();
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
                    if (isCreature) {
                        if (colors.has("W")) { replacementName = "Esper Sentinel"; repCmc = 1; repCat = "Creature"; }
                        else if (colors.has("R")) { replacementName = "Ragavan, Nimble Pilferer"; repCmc = 1; repCat = "Creature"; }
                        else if (colors.has("B")) { replacementName = "Orcish Bowmasters"; repCmc = 2; repCat = "Creature"; }
                        else if (colors.has("G")) { replacementName = "Tarmogoyf"; repCmc = 2; repCat = "Creature"; }
                        else if (colors.has("U")) { replacementName = "Delver of Secrets"; repCmc = 1; repCat = "Creature"; }
                        else { replacementName = "Steel Overseer"; repCmc = 2; repCat = "Creature"; }
                    } else {
                        if (colors.has("W")) { replacementName = "Prismatic Ending"; repCmc = 1; repCat = "Sorcery"; }
                        else if (colors.has("R")) { replacementName = "Lightning Bolt"; repCmc = 1; repCat = "Instant"; }
                        else if (colors.has("B")) { replacementName = "Thoughtseize"; repCmc = 1; repCat = "Sorcery"; }
                        else if (colors.has("G")) { replacementName = "Veil of Summer"; repCmc = 1; repCat = "Instant"; }
                        else if (colors.has("U")) { replacementName = "Preordain"; repCmc = 1; repCat = "Sorcery"; }
                        else { replacementName = "Relic of Progenitus"; repCmc = 1; repCat = "Artifact"; }
                    }
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
                (strategyId === 'reanimator' && c.role === "reanimation_creature_targets") ||
                (strategyId === 'ramp' && c.cmc >= 6) ||
                (c.role && (c.role.includes("finisher") || c.role.includes("win_con") || c.role.includes("top_end"))) ||
                (isControl && c.category === 'Creature'); // Control legitima criaturas CMC≥5 como finishers (Koma, Hullbreaker, Toxrill)

            if (!isCheatable) {
                const primaryColor = getCardColorFromPool(c.name)[0] || "B";
                let replacement = "Fatal Push";
                let repCmc = 1;
                let repCat = "Instant";

                if (primaryColor === "W") { replacement = "Esper Sentinel"; repCmc = 1; repCat = "Creature"; }
                else if (primaryColor === "U") { replacement = "Consider"; repCmc = 1; repCat = "Instant"; }
                else if (primaryColor === "R") { replacement = "Lightning Bolt"; repCmc = 1; repCat = "Instant"; }
                else if (primaryColor === "G") { replacement = "Tarmogoyf"; repCmc = 2; repCat = "Creature"; }

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

    let targetThreatPct = 0.55;
    if (isControl) targetThreatPct = hasTribe ? 0.30 : 0.15; // Control decks only need ~5-6 finishers (15%)
    else if (isAggro) targetThreatPct = 0.75;
    else if (isTempo) targetThreatPct = 0.45;

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
                let responseName = "Fatal Push";
                if (colors.has("R")) responseName = "Lightning Bolt";
                else if (colors.has("W")) responseName = "Prismatic Ending";
                else if (colors.has("U")) responseName = "Spell Pierce";

                cards = inyectarCartaDirecta(cards, { name: responseName, quantity: toAddAnswers, category: "Instant", cmc: 1, role: "interaction" });
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
                let threatName = "Tarmogoyf";
                if (colors.has("B")) threatName = "Orcish Bowmasters";
                else if (colors.has("R")) threatName = "Monastery Swiftspear";
                else if (colors.has("W")) threatName = "Esper Sentinel";
                else if (colors.has("U")) threatName = "Delver of Secrets";

                cards = inyectarCartaDirecta(cards, { name: threatName, quantity: toAddThreats, category: "Creature", cmc: 2, role: "threat" });
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
    if (colors.has("U")) {
        const cantripCount = cards.filter(c => ["preordain", "consider", "ponder", "brainstorm"].includes(c.name.toLowerCase())).reduce((sum, s) => sum + s.quantity, 0);
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
    } else {
        const advantageEngines = ["fable of the mirror-breaker", "up the beanstalk", "orcish bowmasters", "esper sentinel", "lead the stampede"];
        const engineCount = cards.filter(c => advantageEngines.some(ae => c.name.toLowerCase().includes(ae))).reduce((sum, s) => sum + s.quantity, 0);
        if (engineCount < 4) {
            let engineName = "Esper Sentinel";
            if (colors.has("R")) engineName = "Fable of the Mirror-Breaker";
            else if (colors.has("G")) engineName = "Up the Beanstalk";
            else if (colors.has("B")) engineName = "Orcish Bowmasters";

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
            let protName = "Spell Pierce";
            if (colors.has("B")) protName = "Thoughtseize";
            else if (colors.has("G")) protName = "Veil of Summer";
            else if (colors.has("W")) protName = "Giver of Runes";

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
        let spellName = "Fatal Push";
        if (colors.has("R")) spellName = "Lightning Bolt";
        else if (colors.has("W")) spellName = "Prismatic Ending";
        else if (colors.has("U")) spellName = "Preordain";

        cards = inyectarCartaDirecta(cards, { name: spellName, quantity: deducted, category: "Instant", cmc: 1, role: "interaction" });
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

    // Count land sources
    const getLandColors = (landName) => {
        const nameLower = landName.toLowerCase();
        const res = [];
        if (nameLower.includes("plains") || nameLower.includes("hallowed fountain") || nameLower.includes("godless shrine") || nameLower.includes("temple garden") || nameLower.includes("sacred foundry") || nameLower.includes("flooded strand") || nameLower.includes("marsh flats") || nameLower.includes("arid mesa") || nameLower.includes("windswept heath") || nameLower.includes("sunbaked canyon") || nameLower.includes("eiganjo")) res.push("W");
        if (nameLower.includes("island") || nameLower.includes("hallowed fountain") || nameLower.includes("watery grave") || nameLower.includes("steam vents") || nameLower.includes("breeding pool") || nameLower.includes("flooded strand") || nameLower.includes("polluted delta") || nameLower.includes("scalding tarn") || nameLower.includes("misty rainforest") || nameLower.includes("fiery islet") || nameLower.includes("otawara")) res.push("U");
        if (nameLower.includes("swamp") || nameLower.includes("watery grave") || nameLower.includes("blood crypt") || nameLower.includes("godless shrine") || nameLower.includes("overgrown tomb") || nameLower.includes("polluted delta") || nameLower.includes("bloodstained mire") || nameLower.includes("marsh flats") || nameLower.includes("verdant catacombs") || nameLower.includes("silent clearing") || nameLower.includes("takenuma")) res.push("B");
        if (nameLower.includes("mountain") || nameLower.includes("blood crypt") || nameLower.includes("steam vents") || nameLower.includes("stomping ground") || nameLower.includes("sacred foundry") || nameLower.includes("bloodstained mire") || nameLower.includes("scalding tarn") || nameLower.includes("wooded foothills") || nameLower.includes("arid mesa") || nameLower.includes("fiery islet") || nameLower.includes("sokenzan")) res.push("R");
        if (nameLower.includes("forest") || nameLower.includes("temple garden") || nameLower.includes("overgrown tomb") || nameLower.includes("stomping ground") || nameLower.includes("breeding pool") || nameLower.includes("windswept heath") || nameLower.includes("verdant catacombs") || nameLower.includes("wooded foothills") || nameLower.includes("misty rainforest") || nameLower.includes("nurturing peatland") || nameLower.includes("boseiju")) res.push("G");
        return res;
    };

    const getSourcesCount = (col) => {
        return cards.filter(c => c.category === 'Land').reduce((sum, land) => {
            const produces = getLandColors(land.name);
            if (produces.includes(col)) return sum + land.quantity;
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

    // === DIMENSIÓN J: SIDEBOARD EXCELLENCE ===
    const sideboardHatePool = {
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
    const genericCandidates = ["Relic of Progenitus", "Damping Sphere", "Pithing Needle", "Tormod's Crypt", "Surgical Extraction", "Engineered Explosives", "Chalice of the Void"];
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
            sideboard.push({
                name: cardName,
                quantity: 1,
                category: ["Rest in Peace", "Stony Silence", "Leyline of the Void", "Blood Moon", "Alpine Moon", "Roiling Vortex"].includes(cardName) ? "Enchantment" :
                           ["Path to Exile", "Spell Pierce", "Aether Gust", "Mystical Dispute", "Hurkyl's Recall", "Collective Brutality", "Fatal Push", "Veil of Summer", "Force of Vigor"].includes(cardName) ? "Instant" :
                           ["Thoughtseize"].includes(cardName) ? "Sorcery" : "Artifact",
                cmc: ["Force of Vigor"].includes(cardName) ? 4 : ["Leyline of the Void", "Rest in Peace", "Blood Moon", "Stony Silence"].includes(cardName) ? 3 : 1
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

    return {
        ...deckResult,
        cards,
        sideboard,
        sideboard_strategy
    };
}
export async function forgeMazoPerfecto(formData, aiConfig, onProgress = () => {}) {
   const logs = [];
   const addLog = (msg) => {
     logs.push(msg);
     console.log(`[Forge Log] ${msg}`);
   };

   const strategyObj = MTG_STRATEGIES.find(s => s.label === formData.strategy || s.id === formData.strategy) || {};
   const strategyId = strategyObj.id || formData.strategy || "";
   const tribeObj = MTG_TRIBES.find(t => t.id === formData.tribe || t.label === formData.tribe) || null;
   const tribeId = tribeObj ? tribeObj.id : formData.tribe || "";

   const blueprint = getDeckBlueprint(formData.archetype, strategyId, formData);
    
   const archetypeObj = BATTLEBOX_ARCHETYPES.find(a => a.id === formData.archetype) || {};
   const tribeLabel = tribeObj ? tribeObj.label : formData.tribe || 'Ninguna';
   const tribeSubtypes = tribeObj && tribeObj.subtypes ? tribeObj.subtypes.join(', ') : formData.tribe || 'Cualquiera';

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

   onProgress('strategist', '⚡ Evaluando Sinapsis Mágicas (Decidiendo estructura no-tierra)...');
   
   let baseIdent_ColorStr = (formData.colores && formData.colores.length>0) ? formData.colores.join(",") : "B,R"; 

   // Curve Profile Logic
   const curveProfile = formData.curveProfile || 'balanced';
   const curveInstructions = {
     blitz: "CURVE DISTRIBUTION TARGET (Blitz): 60% of spell copies at CMC 1, 30% at CMC 2, 10% at CMC 3+. Prioritize ultra-cheap, aggressive spells. Avoid CMC >= 4.",
     aggressive: "CURVE DISTRIBUTION TARGET (Aggressive): 35% of spell copies at CMC 1, 40% at CMC 2, 20% at CMC 3, 5% at CMC 4+. Prioritize cheap, efficient spells. Avoid CMC >= 5.",
     balanced: "CURVE DISTRIBUTION TARGET (Balanced): 20% of spell copies at CMC 1, 30% at CMC 2, 25% at CMC 3, 15% at CMC 4, 10% at CMC 5+. Maintain a solid mid-game presence.",
     heavy: "CURVE DISTRIBUTION TARGET (Heavy): 10% of spell copies at CMC 1, 20% at CMC 2, 25% at CMC 3, 25% at CMC 4, 20% at CMC 5+. Focus on high-impact late-game spells."
   };
   const curveInstructionText = curveInstructions[curveProfile] || curveInstructions.balanced;

   // === LOG 1: BLUEPRINT ACTIVADO ===
   const logBlueprint = `═══ BLUEPRINT ═══\nPlano: ${formData.archetype} + ${strategyId}\n` + 
     Object.entries(blueprint.roles).map(([k, v]) => `  → ${k}: ${v} copias`).join('\n') +
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

   const STRICT_INSTRUCTIONS_PROMPT = `
You are a Pro Tour-level Magic: The Gathering deck engineer. Your task is to fill a ROLE BLUEPRINT with competitively optimal card selections.

BLUEPRINT TO FILL:
${JSON.stringify(blueprint.roles)}
Total spell copies required: ${blueprint.totalSpells}

RULES (follow strictly, in order of priority):

1. CARD SELECTION: Choose cards exclusively from the RAG CARD POOL provided below. Select cards with the highest individual power level, mana efficiency, and synergy with the deck's strategy. Every card must be a real, official MTG card with its correct English Scryfall name.

2. EXACT COPY COUNT: The sum of all spell quantities must equal exactly ${blueprint.totalSpells}. No more, no less.

3. PRO TOUR CONSISTENCY: Competitive decks maximize consistency. Use 4 copies of key cards and 3 copies of strong support cards. A typical Pro Tour deck runs 9-12 unique non-land spells at 3-4 copies each. NEVER produce lists with 15+ unique cards at 1-2 copies. If a role requires 8 copies, use 2 cards at 4x, NOT 4 cards at 2x.

4. CREATURE ROLE ENFORCEMENT: Any role containing "creature" or "targets" in its name (e.g., "prowess_creatures", "reanimation_creature_targets") must be filled exclusively with cards of category "Creature". Never assign Enchantments, Sorceries, or Sagas to creature roles.

5. CONTROL FINISHERS: In Control archetypes, the "finishers" role must contain high-impact win conditions: Planeswalkers (Teferi, Jace), powerful enchantments (Shark Typhoon), or resilient creatures (Murktide Regent). Do NOT use cheap flash creatures (Spell Queller, Vendilion Clique) as finishers.

6. TRIBAL COHERENCE: If a tribe is specified, every creature must belong to that tribe's subtypes.

7. ROLE ASSIGNMENT: Every card's "role" field must exactly match one of the blueprint keys: ${Object.keys(blueprint.roles).join(', ')}. Do not invent new role names.

8. COLOR IDENTITY: Use ONLY cards whose color identity is within [${baseIdent_ColorStr}]. Do not include cards with colors outside this identity.

9. RARITY: ${rarityText}

10. CURVE DISTRIBUTION: ${curveInstructionText}

11. NO FILLER: Do not include generic low-synergy cards. If space remains, add more interaction or enablers that directly support the deck's game plan.
`;

   const contextGen_Prompt = `
DECK CONFIGURATION:
- Archetype: ${archetypeObj.label || 'Midrange'} — ${archetypeObj.description || 'Balanced strategy'}
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
  let genResponseRawJson_Object;
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
  let metricsPIPsStruct  = validResultsStruct.technical_metrics?.pips_balance || { B: 15 , R: 10 }; 

  // === LOG 3: GEMINI RAW (Sanitized) ===
  const logGemini = `═══ GEMINI RAW (Non-Lands) ═══\n${finalSpellsArr.map(s => `  ${s.quantity}x ${s.name} [${s.role}]`).join('\n')}`;
  addLog(logGemini);
  console.log(logGemini); 
  
  // 3. CAZA ACTIVA EXCLUSIVA JAVASCRIPT: PROTECCIÓN DE UX + FILTRO BANLIST BATTLEBOX + REGLAS DE LA CASA.
   const banlistSwaps = [];
   const customBannedLower = parseCustomBanlistString(formData.customBanlist);
   let sanitizedFinals_ArraySpells = finalSpellsArr.map( c =>{ 
        let tempFixedC= { ...c }; 

        // Eliminamos sesgo si "se intentó colar" (Emeritus out) pero todo Investigador/New Card Válido pasa.
        const nameToCheckForBias = tempFixedC.name.toLowerCase(); 
        if(nameToCheckForBias.includes('emeritus of conflict')) {
            addLog(`[Cazador Activo] Emeritus de conflicto interceptado y destruido. Transmutando a Inquisition of Kozilek.`);
            tempFixedC.name = "Inquisition of Kozilek"; 
            tempFixedC.cmc = 1; 
            tempFixedC.category = "Sorcery"; 
        }

        // Banneos Globales oficiales y de la casa (Custom Banlist)
        const nameLower = tempFixedC.name.toLowerCase();
        if (customBannedLower.some(banned => nameLower === banned || nameLower.includes(banned))) {
            const substitution = getIntelligentSubstitution(tempFixedC.name, tempFixedC.role);
            addLog(`[VETO BANLIST DE LA CASA] Carta prohibida por el usuario detectada: "${tempFixedC.name}" (Rol: ${tempFixedC.role || 'no especificado'}). Reemplazada por staple legal: "${substitution}".`);
            banlistSwaps.push({ original: tempFixedC.name, replacement: substitution });
            tempFixedC.name = substitution;
        } else if (BATTLEBOX_BANLIST.includes(tempFixedC.name)) {
            const substitution = getIntelligentSubstitution(tempFixedC.name, tempFixedC.role); 
            addLog(`[VETO BANLIST] Carta prohibida detectada: "${tempFixedC.name}" (Rol: ${tempFixedC.role || 'no especificado'}). Reemplazada por staple legal de rol equivalente: "${substitution}".`);
            banlistSwaps.push({ original: tempFixedC.name, replacement: substitution });
            tempFixedC.name = substitution; 
        }
        
        return tempFixedC;
   }); 

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

  // 3.5. PRO TOUR FINE-TUNING COACH (Refinamiento rápido con timeout estricto de 20s)
  onProgress('assembler', '🏅 Pro Tour Coach optimizando sinergias (máx 20s)...');
  addLog("Iniciando auditoría táctica con el Pro Tour Coach (timeout: 20s)...");
  
  const refinerSystemPrompt = `
Eres un Diseñador de Mazos de Magic: The Gathering de nivel Pro Tour.
Analiza la lista de hechizos actual y sugiere hasta 3 reemplazos quirúrgicos e inteligentes para elevar el nivel de poder del mazo, pulir sinergias cojas y eliminar redundancias subóptimas.

REGLAS ESTRATÉGICAS:
1. Reemplaza únicamente cartas subóptimas o redundantes por verdaderos staples competitivos o cartas que encajen mejor con el arquetipo. Inspecciona rigurosamente la 'Meta' (%) y la 'Sinergia' (Score) de las cartas del RAG Pool para elegir opciones estadísticamente dominantes.
2. Cada reemplazo propuesto sustituirá copias de la carta a eliminar por copias de la carta inyectada de forma equilibrada.
3. Asegura que la carta a inyectar respete los colores de identidad del mazo: [ ${baseIdent_ColorStr} ].
4. Si la tribu requerida es [ ${tribeLabel} ], prioriza que los reemplazos de criaturas pertenezcan a esa tribu.
5. RESPETA LA CURVA DE MANÁ: Un reemplazo no debe alterar drásticamente la curva. Si reemplazas un "finisher" de coste 5-7, la nueva carta DEBE ser también un finisher de alto impacto (coste 4+). No reemplaces win-conditions pesadas por criaturas baratas de tempo.
6. Fundamenta estratégicamente tus reemplazos (campo 'reason') basándote en la eficiencia de maná y las métricas de presencia en torneos de la nueva carta.
`;

  const currentSpellsText = sanitizedFinals_ArraySpells.map(s => `- ${s.quantity}x ${s.name} (CMC: ${s.cmc}, Rol original: ${s.role})`).join('\n');
  
  const refinerContextPrompt = `
CONFIGURACIÓN DE LA BARAJA:
- Formato Objetivo: ${(formData.format || 'MODERN').toUpperCase()}
- Arquetipo: ${archetypeObj.label || 'No declarado'}
- Estrategia: ${strategyObj.label || 'Ninguna'}
- Tribu: ${tribeLabel}
- Colores: [ ${baseIdent_ColorStr} ]

LISTA DE HECHIZOS ACTUAL (A AFINAR):
${currentSpellsText}

POZA DE CARTAS (RAG POOL DISPONIBLE COMO INSPIRACIÓN):
${poolText}

Sujeta tu análisis de swaps bajo el esquema JSON requerido. Devuelve hasta 3 swaps óptimos de la forma {"replace": "Carta vieja", "with": "Carta nueva", "reason": "Razón estratégica"}.
`;

  // Timeout estricto de 20 segundos para el Coach — si no responde, seguimos sin él
  const COACH_TIMEOUT = 20000;
  try {
    const coachPromise = callAI([
        { role: 'system', content: refinerSystemPrompt },
        { role: 'user', content: refinerContextPrompt }
    ], aiConfig, { forceJSON: true, maxTokens: 1000, schema: GEMINI_REFINER_SCHEMA });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Coach timeout (20s) — omitiendo refinamiento')), COACH_TIMEOUT)
    );
    
    const refinerResponse = await Promise.race([coachPromise, timeoutPromise]);
    
    const refinerResult = typeof refinerResponse === 'string' ? cleanAndParseJSON(refinerResponse) : refinerResponse;
    const swaps = refinerResult?.swaps || [];
    
    if (swaps.length > 0) {
        addLog(`[PRO TOUR COACH] Se recibieron ${swaps.length} sugerencias de optimización estratégica:`);
        swaps.forEach(swap => {
            addLog(`   * Swap sugerido: Reemplazar "${swap.replace}" por "${swap.with}". Razón: ${swap.reason}`);
            
            let existingIdx = sanitizedFinals_ArraySpells.findIndex(s => s.name.toLowerCase() === swap.replace.toLowerCase());
            if (existingIdx === -1) {
                // Intento de búsqueda parcial
                existingIdx = sanitizedFinals_ArraySpells.findIndex(s => s.name.toLowerCase().includes(swap.replace.toLowerCase()) || swap.replace.toLowerCase().includes(s.name.toLowerCase()));
            }
            
            if (existingIdx !== -1) {
                const originalCard = sanitizedFinals_ArraySpells[existingIdx];
                const qtyToSwap = originalCard.quantity;
                
                sanitizedFinals_ArraySpells.splice(existingIdx, 1);
                
                const ragCard = ragResult.pool.find(rc => rc.name.toLowerCase() === swap.with.toLowerCase());
                const newCmc = ragCard ? ragCard.mana_value : originalCard.cmc;
                let newCat = originalCard.category;
                if (ragCard) {
                    const typeLower = ragCard.type_line.toLowerCase();
                    if (typeLower.includes("creature")) newCat = "Creature";
                    else if (typeLower.includes("instant")) newCat = "Instant";
                    else if (typeLower.includes("sorcery")) newCat = "Sorcery";
                    else if (typeLower.includes("artifact")) newCat = "Artifact";
                    else if (typeLower.includes("enchantment")) newCat = "Enchantment";
                    else if (typeLower.includes("planeswalker")) newCat = "Planeswalker";
                }
                
                sanitizedFinals_ArraySpells.push({
                    name: swap.with,
                    quantity: qtyToSwap,
                    category: newCat,
                    cmc: newCmc,
                    role: originalCard.role
                });
                
                addLog(`[PRO TOUR COACH] Aplicando swap: ${qtyToSwap}x ${originalCard.name} transmutadas a ${swap.with} (CMC: ${newCmc}, Categoria: ${newCat})`);
            } else {
                addLog(`[PRO TOUR COACH] No se pudo aplicar swap: "${swap.replace}" no existe en el mazo actual.`);
            }
        });
    } else {
        addLog("[PRO TOUR COACH] Auditoría táctica completada. El mazo ya tiene una cohesión perfecta de nivel Pro Tour.");
    }
  } catch (refError) {
    addLog(`[PRO TOUR COACH] Omitiendo afinamiento estratégico (${refError.message}). El mazo base ya es competitivo.`);
  }

  // 4. BALANZA JS INFALIBLE (Cuadratura Exacta hacia el número de hechizos determinado por la Ecuación de Frank Karsten)
  const metricalTargetLnd = calculatePerfectLandCount(sanitizedFinals_ArraySpells, formData);
  let maxRequired = 60 - metricalTargetLnd;
  let countAct = sanitizedFinals_ArraySpells.reduce( (acc , b) => acc+(b.quantity || 1), 0 ); 
  
  // === LOG 5: BALANCE (Target vs Actual) ===
  const logBalance = `═══ BALANCE JS ═══\n  Hechizos Generados: ${countAct} (Requeridos: ${maxRequired})\n  Tierras Meta (Karsten): ${metricalTargetLnd}\n  Diferencial a corregir: ${maxRequired - countAct}`;
  addLog(logBalance);
  console.log(logBalance);
  
  addLog(`Suma inicial de copias de hechizos: ${countAct}. Ecuación Frank Karsten determinó tierras meta: ${metricalTargetLnd}, hechizos requeridos: ${maxRequired}.`);

  if(countAct !== maxRequired && maxRequired > 0) {  
      let gapDifFillMathListArrayFixupJS = maxRequired - countAct;  
      addLog(`Ajustando diferencia matemática de hechizos: ${gapDifFillMathListArrayFixupJS}`);
       if (gapDifFillMathListArrayFixupJS > 0 && sanitizedFinals_ArraySpells.length > 0)  {
            sanitizedFinals_ArraySpells = distribuirOInyectarHechizosFaltantes(sanitizedFinals_ArraySpells, maxRequired, formData?.colores || [], addLog, ragResult.pool);
       } else if (gapDifFillMathListArrayFixupJS < 0) { 
           // Hubo Exceso del Json IA Generator LLm: Reducimos matemáticamente y quitando Cartas de Altos CMCs ! 
           sanitizedFinals_ArraySpells = recortarHechizosExcedentesInteligente(sanitizedFinals_ArraySpells, maxRequired, addLog, mustIncludeNamesList);
       } 
  }
 
 onProgress('judge', '🌐 Trazando Matemática Perfecta del Flujo Natural Generando Pips Lands de JS Puro..'); 
  
  let validCurrentGenUsedStrPipKeysBaseArrayDetected = Object.keys(metricsPIPsStruct).filter(mX => metricsPIPsStruct[mX] > 0);

  // Llamada pura base interna Matemática: Se genera en fracción mileseg exactitud!
  addLog(`Generando lands con pipBalance: ${JSON.stringify(metricsPIPsStruct)} y total lands: ${metricalTargetLnd}`);
  const finalCalculated_RealJsBaseLandsArraysInjectionObjListReady_FromDecCalc =  await generateManaBase(metricsPIPsStruct ,  metricalTargetLnd , validCurrentGenUsedStrPipKeysBaseArrayDetected , formData, sanitizedFinals_ArraySpells );

  // === LOG 6: KARSTEN MATH (Lands) ===
  const logKarsten = `═══ KARSTEN MATH (Tierras inyectadas) ═══\n  Pips Base: ${JSON.stringify(metricsPIPsStruct)}\n${finalCalculated_RealJsBaseLandsArraysInjectionObjListReady_FromDecCalc.map(l => `  ${l.quantity}x ${l.name}`).join('\n')}`;
  addLog(logKarsten);
  console.log(logKarsten);

  // Final Merging y devolver Listo Frontend Render!! 
  validResultsStruct.cards= [ ...sanitizedFinals_ArraySpells , ...finalCalculated_RealJsBaseLandsArraysInjectionObjListReady_FromDecCalc ];
  
  // Aplicar el Juez Final de Estado
  const juezResult = aplicarJuezFinal(validResultsStruct, dnaData, formData, addLog, ragResult.pool);
  validResultsStruct.cards = juezResult.cards;
  validResultsStruct.sideboard = juezResult.sideboard;
  validResultsStruct.sideboard_strategy = juezResult.sideboard_strategy;

  // Re-cálculo matemático de tierras y hechizos final (para que siempre sume exactamente 60)
  const targetLandsCount = metricalTargetLnd;
  const targetSpellsCount = 60 - targetLandsCount;

  let actualLands = validResultsStruct.cards.filter(c => c.category === 'Land');
  let actualSpells = validResultsStruct.cards.filter(c => c.category !== 'Land');

  let actualLandsSum = actualLands.reduce((sum, c) => sum + (c.quantity || 0), 0);
  let actualSpellsSum = actualSpells.reduce((sum, c) => sum + (c.quantity || 0), 0);

  // 1. Ajustar las tierras para que sumen exactamente targetLandsCount
  if (actualLandsSum < targetLandsCount) {
      let missingLands = targetLandsCount - actualLandsSum;
      const basicLand = actualLands.find(l => ["plains", "island", "swamp", "mountain", "forest", "wastes", "llanura", "isla", "pantano", "montaña", "bosque", "yermo"].includes(l.name.toLowerCase()));
      if (basicLand) {
          basicLand.quantity += missingLands;
      } else if (actualLands.length > 0) {
          for (let land of actualLands) {
              if (missingLands <= 0) break;
              if (land.quantity < 4) {
                  const addQty = Math.min(4 - land.quantity, missingLands);
                  land.quantity += addQty;
                  missingLands -= addQty;
              }
          }
          if (missingLands > 0) {
              actualLands[0].quantity += missingLands;
          }
      } else {
          const colors = formData?.colores || [];
          let basicLandName = "Swamp";
          if (colors.includes("W")) basicLandName = "Plains";
          else if (colors.includes("U")) basicLandName = "Island";
          else if (colors.includes("R")) basicLandName = "Mountain";
          else if (colors.includes("G")) basicLandName = "Forest";
          validResultsStruct.cards.push({ name: basicLandName, quantity: missingLands, category: "Land", cmc: 0 });
      }
  } else if (actualLandsSum > targetLandsCount) {
      let excessLands = actualLandsSum - targetLandsCount;
      for (let land of actualLands) {
          if (excessLands <= 0) break;
          let reduction = Math.min(land.quantity - 1, excessLands);
          land.quantity -= reduction;
          excessLands -= reduction;
      }
  }

  // 2. Ajustar los hechizos (spells/creatures) para que sumen exactamente targetSpellsCount
  actualSpells = validResultsStruct.cards.filter(c => c.category !== 'Land');
  actualSpellsSum = actualSpells.reduce((sum, c) => sum + (c.quantity || 0), 0);

  if (actualSpellsSum < targetSpellsCount) {
      const compensatedSpells = distribuirOInyectarHechizosFaltantes(actualSpells, targetSpellsCount, formData?.colores || [], addLog, ragResult.pool);
      const lands = validResultsStruct.cards.filter(c => c.category === 'Land');
      validResultsStruct.cards = [...compensatedSpells, ...lands];
  } else if (actualSpellsSum > targetSpellsCount) {
      actualSpells = recortarHechizosExcedentesInteligente(actualSpells, targetSpellsCount, addLog, mustIncludeNamesList);
      const lands = validResultsStruct.cards.filter(c => c.category === 'Land');
      validResultsStruct.cards = [...actualSpells, ...lands];
  }

  // Filtrar cartas que hayan quedado con cantidad 0
  validResultsStruct.cards = validResultsStruct.cards.filter(c => c.quantity > 0);
  
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
}
