import { isLand, generateManaBase, calculatePerfectLandCount, calculateVMP, getLandColors, isBasicLand, isColoredBasicLand, deckNeedsSnowLands, isLandFormatLegal, BASIC_LANDS_BY_COLOR } from './deckCalculator.js';
 
import { CURVE_BOUNDS, calculateRealTimeVMPWarning, evaluateDeckHealthFast } from './deckAuditorService.js';
import { internalSynergyAudit } from './auditService.js';
import { callAI, buildAgenticPhasePrompt, GEMINI_PHASE_SCHEMA, DECK_BUILDER_TOOLS } from './aiFactory.js';
import { API_ENDPOINTS } from '../config/apiEndpoints.js';
import { BATTLEBOX_VETOS, BANLIST_SUBSTITUTIONS, BATTLEBOX_ARCHETYPES, MTG_STRATEGIES, MTG_TRIBES, getIntelligentSubstitution, PARASITIC_RULES, COMPETITIVE_ANTI_SYNERGIES, inferStrategyFromArchetype, MICRO_SYNERGIES_GRAPH, CONTEXTUAL_DEPENDENCIES } from '../constants/legacyBattleBox.js';
import { buildCardPool, getDynamicArchetypes } from './ragService.js';
import { extractActivationSignals } from './synergyActivationEngine.js';
import { findFuzzyMatchInDB, getCardFromDB, hydrateCard } from './cardHydrator.js';
import { generateSideboardGuide } from './sideboardService.js';
import { isCardLegalForBattleBox, isUniversesBeyondOrCustom } from '../utils/legalityCheck.js';

import { injectCorePackage } from '../constants/corePackages.js';
import { getAllCards } from './dbIngestor.js';
import { FORMAT_CURVE_MODIFIERS, composeTwoLayerBlueprint } from '../constants/blueprintTemplates.js';
import { createDeckDNA60 } from '../constants/deckDNA.js';
import { buildDeckSkeletonAndSlots } from './slotFillingEngine.js';
import { scoreAndRankCandidatePool } from './cardScoringEngine.js';
import { calculateGraphCohesion } from './semanticGraphService.js';
import { generateAbstractStrategyPlan } from './strategyReasoningEngine.js';
import { executeIterativeOptimizationLoop } from './deckOptimizerService.js';
import { 
  logDeckSnapshot, 
  computeDeckDiff, 
  auditBlueprintInvariants, 
  trackDeckEntries, 
  trackObjectReference,
  applyTrackedDeckChange
} from './deckAuditTrackerService.js';
import { 
  DeckOperationExecutor, 
  validateBlueprintCompliance, 
  validateRoleCompatibility, 
  getCardRoleMetadata, 
  calculateMultiDimensionalStrategyScore,
  esValidaParaRol,
  purgaDeInvalidos,
  hardEnforceInteraction,
  BLACK_LISTED_CARD_NAMES,
  obtenerCartaSegura
} from './deckContractEngine.js';





let cachedAllCards = [];

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

    // Eliminar comas flotantes / comas terminales (trailing commas)
    clean = clean.replace(/,\s*([\}\]])/g, '$1');
    
    try {
        return JSON.parse(clean);
    } catch (e) {
        // AUTO-REPARACIÓN DE JSON LLM TRUNCADO / MAL FORMATEADO
        try {
            let repaired = clean.replace(/[\u0000-\u001F]+/g, ' ');
            
            // Si quedó truncado en comillas impares, cerrarla
            let openQuotes = 0;
            for (let i = 0; i < repaired.length; i++) {
                if (repaired[i] === '"' && (i === 0 || repaired[i-1] !== '\\')) openQuotes++;
            }
            if (openQuotes % 2 !== 0) repaired += '"';
            
            // Quitar comas terminales
            repaired = repaired.replace(/,\s*$/g, '').replace(/,\s*([\}\]])/g, '$1');

            // Balancear llaves y corchetes abiertos
            const stack = [];
            let inString = false;
            for (let i = 0; i < repaired.length; i++) {
                const ch = repaired[i];
                if (ch === '"' && (i === 0 || repaired[i-1] !== '\\')) {
                    inString = !inString;
                } else if (!inString) {
                    if (ch === '{' || ch === '[') stack.push(ch === '{' ? '}' : ']');
                    else if (ch === '}' || ch === ']') {
                        if (stack.length > 0 && stack[stack.length - 1] === ch) stack.pop();
                    }
                }
            }
            while (stack.length > 0) repaired += stack.pop();

            return JSON.parse(repaired);
        } catch (e2) {
            console.warn('[cleanAndParseJSON] Fallo al auto-reparar JSON de la IA:', e2.message);
            throw e;
        }
    }
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
    ranked_cards: {
      type: "array",
      description: "Ranked list of candidate spells for each role defined in the Blueprint. Do NOT specify quantities. Just list the cards in order of priority (lower priority number means higher recommendation). Mark cards as 'toolbox' if they are situational tutoring targets.",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          role: { type: "string", description: "Strategic role from the Blueprint." },
          priority: { type: "number", description: "Rank index (1 is best, then 2, 3, etc.)" },
          toolbox: { type: "boolean", description: "Set to true if this card is a situational utility/silver-bullet target." }
        },
        required: ["name", "role", "priority", "toolbox"]
      }
    },
    utility_lands_recommendations: {
      type: "array",
      description: "List 0 to 4 names of crucial utility or special lands perfect for this specific strategy. DO NOT include basics, fetches, or duals.",
      items: { type: "string" }
    }
  },
  required: ["deckName", "strategy", "technical_metrics", "ranked_cards", "utility_lands_recommendations"]
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
    deckName: { type: "string", description: "A creative, concise, and thematic name for the deck in Spanish, tailored to the selected strategy/tribe (e.g., 'Marea del Olvido' for Sea Monsters, 'Forja de Acero' for Affinity)." },
    lore: { type: "string", description: "A brief, flavor-filled 1-sentence background story or lore description for this deck in Spanish." },
    totalSpells: { type: "number", description: "Target total non-land spells, typically 36 to 40 depending on curve." },
    strategy: { type: "string", description: "A concise, 1-2 sentence description of the overall gameplan and strategy of the deck in Spanish." },
    mulligan: { type: "string", description: "A concise, 1-2 sentence description of the ideal starting hand and mulligan rules in Spanish." },
    suggestedCommanders: {
      type: "array",
      description: "Only for COMMANDER format: list of exactly 3 suggested legendary creatures that would make great commanders for this deck.",
      items: { type: "string" }
    },
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
          purposeDescription: { type: "string", description: "Clear explanation of what these cards do and how they fit the archetype curve." },
          search_query: { 
            type: "string", 
            description: "The ideal Scryfall query to find cards for this role. Always use parentheses when mixing AND and OR logic (e.g. 'o:landfall (o:token or o:draw)'). Do not combine incompatible terms directly (use '(o:damage or o:destroy)' instead of 'o:damage o:destroy' for removal). Focus purely on mechanics and mechanics-based keywords. Do not include format filters like 'f:modern' or 'f:standard' as the app appends them automatically." 
          }
        },
        required: ["name", "quantity", "cmcCategory", "finisherQuality", "purposeDescription", "search_query"]
      }
    }
  },
  required: ["deckName", "lore", "totalSpells", "strategy", "mulligan", "roles"]
};

// Schema para la Fase 4: Optimización y Auto-Crítica de Mazos (Pro Tour Deck Optimizer)
const OPTIMIZATION_SCHEMA = {
  type: "object",
  properties: {
    reasoning: { type: "string", description: "Breve explicación en español de qué problemas se detectaron y cómo se corrigieron." },
    optimized_cards: {
      type: "array",
      description: "Lista completa y definitiva de los hechizos del mazo después de realizar las correcciones y swaps.",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "integer" },
          role: { type: "string" }
        },
        required: ["name", "quantity", "role"]
      }
    }
  },
  required: ["reasoning", "optimized_cards"]
};


// 3. DICCIONARIO DE ADN ESTRATÉGICO Y CONSTRUCTOR TAXONÓMICO (Synergy Registry)
export const ARCHETYPE_DNA = {
  // Estrategias de Modern
  reanimator: {
    prioridad: "Motores de descarte (Enablers) eficientes, efectos de reanimación rápidos (Persist, Goryo's Vengeance, Late to Dinner, Priest of Fell Rites) y payoffs gigantescos de Modern (Archon of Cruelty, Atraxa).",
    estilo: "ESTRATÉGICO / Combo Reanimador",
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
    prioridad: "Explotación del cementerio usando Delirium (Dragon's Rage Channeler, Tarmogoyf) o Dredge y mecÚNICAS de desenterrar.",
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
    regla_de_oro: "Las criaturas e interactores de coste bajo deben aplicar impuestos, restringir ataques o entorpecer el MANÁ del rival."
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
  storm: {
    prioridad: "Encadenar múltiples rituales de MANÁ (Desperate Ritual, Pyretic Ritual, Manamorphose), reductores de coste (Ruby Medallion, Ral, Monsoon Mage, Baral) y motores de robo/cantrips rápidos para finalizar con un hechizo de tormenta (Grapeshot).",
    estilo: "Combo / Tormenta (Storm Combo)",
    regla_de_oro: "Las criaturas de coste 1-3 DEBEN ser reductores de coste o facilitadores de combo. Los hechizos deben ser rituales rápidos, cantrips de bajo coste o finalizadores con Tormenta."
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
    regla_de_oro: "PROHIBICIÓN ABSOLUTA: No puedes incluir ninguna carta de coste 1 o 2. Toda la interacción debe costar 3 o más, o usar mecÚNICAS alternativas (Split, Elementales)."
  },
  ramp: {
    prioridad: "Aceleradores de MANÁ rápidos (Mana Dorks como Llanowar Elves, Birds of Paradise o hechizos de búsqueda como Farseek, Cultivate) combinados con payoffs masivos e interactivos de coste 5 o más (Primeval Titan, Wurmcoil Engine, Karn).",
    estilo: "Desarrollo y Aceleración / Big Mana",
    regla_de_oro: "Las cartas de coste 1-3 DEBEN acelerar tu MANÁ, buscar tierras o proveer interacción defensiva para sobrevivir hasta lanzar tus amenazas de coste 5+."
  },
  ninjutsu: {
    prioridad: "Atacar con criaturas evasivas baratas (Ornithopter, Changeling Outcast) y regresarlas a la mano para jugar Ninjas mediante la habilidad de Ninjutsu, abusando de robos.",
    estilo: "Ninjutsu / Tempo",
    regla_de_oro: "Las criaturas de coste 1-2 deben tener evasión (volar, imbloqueable) o destello para habilitar el ninjutsu."
  },
  faeries: {
    prioridad: "Jugar un juego tempo-reactivo mediante hadas con destello (Spellstutter Sprite) apoyadas en Bitterblossom y contrahechizos eficientes.",
    estilo: "Faeries Flash / Tempo",
    regla_de_oro: "Las criaturas deben ser hadas (Faerie) con destello o volar, que interactúen con los hechizos del rival en su turno."
  },
  dragons: {
    prioridad: "Rampa e inyección acelerada de dragones míticos potentes con prisa mediante reductores de coste (Dragonlord's Servant).",
    estilo: "Dragons Aggro-Midrange / Big Mana",
    regla_de_oro: "Las criaturas de coste 4+ deben ser dragones voladores masivos que impacten la mesa al entrar."
  },
  dinosaurs: {
    prioridad: "Lanzar dinosaurios masivos y disparar habilidades de enfurecer (Enrage) mediante efectos de daño global leve.",
    estilo: "Dinosaurios Midrange / Stompy",
    regla_de_oro: "Las criaturas deben ser dinosaurios o aceleradores de tierras, y los hechizos interactivos deben poder infligir daño directo."
  },
  angels: {
    prioridad: "Invocar ángeles de coste medio que vuelen, ganen vidas masivas y escalen la mesa mediante Giada y Righteous Valkyrie.",
    estilo: "Angels Midrange / Lifegain",
    regla_de_oro: "Las criaturas deben ser ángeles o Soul Sisters que ganen vida, y potenciar a tus criaturas voladoras."
  },
  pirates: {
    prioridad: "Atacar rápido con piratas evasivos, generar fichas de Tesoro y robar recursos mediante Ragavan, Malcolm y Breeches.",
    estilo: "Piratas Tempo / Aggro",
    regla_de_oro: "Las criaturas deben ser piratas de coste 1-3 que generen tesoros, tengan prisa o evasión."
  },
  druids_shaman: {
    prioridad: "Aggro tribal rápido de chamanes potenciados por Rage Forger, o rampa explosiva de druidas de maná.",
    estilo: "Chamanes Aggro / Druidas Ramp",
    regla_de_oro: "Las criaturas de coste 1-3 deben ser druidas o chamanes que aceleren el maná o tengan contadores +1/+1."
  },
  discard_rack: {
    prioridad: "Destrucción sistemática de la mano rival mediante descartadores repetitivos para infligir daño sostenido con The Rack y Shrieking Affliction.",
    estilo: "8-Rack Control / Disrupción",
    regla_de_oro: "Los hechizos deben forzar al oponente a descartar cartas a coste bajo, y el mazo debe tener payoffs pasivos de daño por cartas en mano."
  },
  dredge: {
    prioridad: "Llenar el cementerio de forma masiva usando la mecánica de dragar (Dredge) para invocar gratis a Prized Amalgam y Narcomoeba.",
    estilo: "Dredge / Cementerio Combo",
    regla_de_oro: "Las cartas con Dragar deben poder ir al cementerio rápidamente mediante cantrips o descartadores eficientes."
  }
};

// Esta función crea el 'Plano' (el JSON de restricciones) usando la Arquitectura de Dos Capas
function getDeckBlueprint(archetype, strategyId, formData) {
  const composed = composeTwoLayerBlueprint(archetype, strategyId, formData);
  let totalSpells = composed.totalSpells;
  let roles = { ...composed.roles };

  const hasTribe = !!(formData?.tribe && formData.tribe !== 'none' && formData.tribe !== 'ninguna');
  const isSpecialArchetype = ['control', 'combo', 'prison', 'storm', 'cascade', 'reanimator'].includes(archetype?.toLowerCase()) || ['control', 'combo', 'prison', 'storm', 'cascade', 'reanimator'].includes(strategyId?.toLowerCase());
  
  if (hasTribe && !isSpecialArchetype) {
    totalSpells = 40;
    roles = {
      lords_and_anthems: 10,
      tribal_core_creatures: 20,
      interaction_spells: 6,
      card_advantage_draw: 4
    };
  }

  return {
    totalSpells,
    roles
  };
}

export function generateThematicFallbackName(formData) {
  const prompt = (formData?.prompt || '').toLowerCase().trim();
  const tribe = (formData?.tribe || '').toLowerCase().trim();
  const colors = formData?.colores || [];
  const archetype = (formData?.archetype || 'Midrange').toLowerCase().trim();
  const strategy = (formData?.strategy || '').toLowerCase().trim();

  // 1. Detectar temática por Raza / Tribu
  if (tribe && tribe !== 'none' && tribe !== 'ninguna') {
    const tribeNames = {
      elves: "Comunidad del Bosque Susurrante",
      goblins: "Horda de Asalto Trasgo",
      merfolk: "Guardianes de la Fosa de Coral",
      slivers: "Mente de Colmena Evolutiva",
      ninjas: "Sombras del Clan Oculto",
      faeries: "Travesura en el Valle de las Hadas",
      zombies: "Alzamiento de la Horda Putrefacta",
      spirits: "Corte de los Espíritus Olvidados",
      humans: "Bastión de la Vanguardia Humana",
      dragons: "Señores del Vuelo del Dragón",
      dinosaurs: "Cazadores del Valle Jurásico",
      vampires: "Corte de Sangre y Ceniza",
      angels: "Resplandor del Coro Celestial",
      demons: "Legión del Abismo Infernal",
      cats: "Orgullo de la Sabana Dorada",
      elementals: "Fuerza de la Sinergia Elemental",
      wizards: "Cónclave de los Magos del Saber"
    };
    if (tribeNames[tribe]) return tribeNames[tribe];
    
    const cleanTribe = tribe.charAt(0).toUpperCase() + tribe.slice(1);
    return `Alianza de la Tribu ${cleanTribe}`;
  }

  // 2. Detectar temática por palabras clave en el prompt del usuario
  if (prompt) {
    if (prompt.includes('monster') || prompt.includes('sea') || prompt.includes('kraken') || prompt.includes('leviat') || prompt.includes('pulpo') || prompt.includes('marino')) {
      return "Furia de las Profundidades Marinas";
    }
    if (prompt.includes('phoenix') || prompt.includes('fénix')) {
      return "Resurgir del Fénix de Arco";
    }
    if (prompt.includes('death') || prompt.includes('shadow') || prompt.includes('sombra')) {
      return "Acecho de la Sombra Inmortal";
    }
    if (prompt.includes('ramp') || prompt.includes('big') || prompt.includes('titan') || prompt.includes('tron')) {
      return "Forja de Titanes Ancestrales";
    }
    if (prompt.includes('artifact') || prompt.includes('metal') || prompt.includes('affinity') || prompt.includes('scales')) {
      return "Ensamblaje del Acero Viviente";
    }
    if (prompt.includes('burn') || prompt.includes('spark') || prompt.includes('fuego') || prompt.includes('rayo')) {
      return "Chispa de la Cólera Ígnea";
    }
    if (prompt.includes('discard') || prompt.includes('descarte') || prompt.includes('waste') || prompt.includes('rack')) {
      return "Suplicio de la Mente Vacía";
    }
    if (prompt.includes('graveyard') || prompt.includes('reanimat') || prompt.includes('cementerio') || prompt.includes('dredge')) {
      return "Llamada del Cementerio Profanado";
    }
    if (prompt.includes('blink') || prompt.includes('flicker') || prompt.includes('parpadeo')) {
      return "Destello del Reino Celestial";
    }
    if (prompt.includes('token') || prompt.includes('enjambre') || prompt.includes('swarm')) {
      return "Crecimiento del Enjambre Infinito";
    }
  }

  // 3. Sabor por combinaciones de colores
  const colorNames = {
    'W': 'del Sol Naciente',
    'U': 'de la Marea Eterna',
    'B': 'de las Sombras Abisales',
    'R': 'de la Llama Viva',
    'G': 'del Bosque Ancestral',
    'WU': 'del Cielomanto',
    'UB': 'de la Intriga Oculta',
    'BR': 'del Caos Sangriento',
    'RG': 'de la Furia Salvaje',
    'GW': 'del Pacto de las Hojas',
    'WB': 'del Alba Sombría',
    'UR': 'de la Tormenta Eléctrica',
    'BG': 'del Ciclo de la Putrefacción',
    'RW': 'de la Cruzada Sagrada',
    'GU': 'de la Evolución Genética',
    'WUB': 'de la Esfera de Esper',
    'UBR': 'del Trono de Grixis',
    'BRG': 'de las Tierras de Jund',
    'RGW': 'del Dominio de Naya',
    'GWU': 'del Reino de Bant',
    'WUR': 'de la Iluminación de Jeskai',
    'UBG': 'del Néctar de Sultai',
    'BRW': 'de la Horda de Mardu',
    'RGU': 'de las Fronteras de Temur',
    'GWB': 'del Círculo de Abzan'
  };

  const sortedColorsKey = [...colors].sort().join('');
  const suffix = colorNames[sortedColorsKey] || 'del Nexo de Maná';

  const archNames = {
    'aggro': 'Asalto Rápido',
    'aggro-puro': 'Embestida Letal',
    'aggro-sinergico': 'Sinergia Veloz',
    'midrange': 'Equilibrio de Poder',
    'control': 'Dominio Absoluto',
    'tempo': 'Ritmo Interrumpido',
    'ramp': 'Canalización Ancestral',
    'combo': 'Fórmula de Victoria'
  };

  const prefix = archNames[archetype] || 'Ecosistema';

  return `${prefix} ${suffix}`;
}

export function generateThematicFallbackLore(deckName, formData) {
  const tribe = (formData?.tribe || '').toLowerCase().trim();
  const archetype = (formData?.archetype || 'Midrange').toLowerCase().trim();
  const colors = formData?.colores || [];

  const colorStr = colors.length > 0 ? colors.join('-') : 'sin color';
  
  if (tribe && tribe !== 'none' && tribe !== 'ninguna') {
    return `Un mazo histórico que reúne a los mejores combatientes de la tribu ${tribe} en una sinergia devastadora.`;
  }
  
  return `Una baraja de estilo ${archetype} que canaliza las fuerzas de ${colorStr} para establecer un control y ventaja incuestionable en el campo de batalla.`;
}

/**
 * Genera una search_query de Scryfall específica según el nombre del rol, arquetipo, estrategia y colores.
 * Reemplaza la query genérica 't:creature or t:instant or t:sorcery' del fallback.
 */
function getFallbackSearchQuery(roleName, archetype, strategyId, colors = []) {
  const arch = (archetype || '').toLowerCase();
  const strat = (strategyId || '').toLowerCase();
  const role = (roleName || '').toLowerCase();
  const hasG = colors.includes('G');
  const hasB = colors.includes('B');
  const hasR = colors.includes('R');
  const hasU = colors.includes('U');
  const hasW = colors.includes('W');

  // --- REGLAS POR ROL (prioridad más alta) ---
  if (role.includes('finisher') || role.includes('payoff') || role.includes('win_cond') || role.includes('threat') || role.includes('amenaza')) {
    if (strat.includes('landfall') || arch.includes('landfall'))
      return 'o:landfall type:creature mv>=4';
    if (strat.includes('reanimator') || strat.includes('reanimate'))
      return 'type:creature mv>=6 (o:haste or o:trample or o:flying)';
    if (strat.includes('ramp') || arch.includes('ramp'))
      return 'type:creature mv>=5 (o:trample or o:haste or o:flying)';
    if (arch.includes('control'))
      return 'type:creature mv>=4 (o:flying or o:indestructible or o:ward)';
    if (arch.includes('aggro'))
      return 'type:creature mv<=3 (o:haste or o:trample or pow>=3)';
    return 'type:creature mv>=4 (o:trample or o:haste or o:flying or o:enters)';
  }

  if (role.includes('removal') || role.includes('interaction') || role.includes('remocion') || role.includes('remoción')) {
    if (hasB && hasR) return '(type:instant or type:sorcery) (o:destroy or o:exile or o:damage) mv<=3';
    if (hasB)  return 'type:instant (o:destroy or o:exile) mv<=3';
    if (hasR)  return 'type:instant o:damage mv<=4';
    if (hasW)  return 'type:instant (o:exile or o:destroy) mv<=3';
    return '(type:instant or type:sorcery) (o:destroy or o:exile or o:damage) mv<=3';
  }

  if (role.includes('land_ramp') || role.includes('land_search')) {
    return '(type:sorcery or type:instant) (o:search o:library o:land) mv<=3';
  }

  if (role.includes('dork')) {
    return 'type:creature (o:add or o:mana) mv<=2';
  }

  if (role.includes('sac_fodder')) {
    return 'type:creature mv<=2 (o:dies or o:sacrifice or o:token)';
  }

  if (role.includes('drain_payoff') || role.includes('blood_artist')) {
    return '(o:whenever a creature dies or o:whenever you sacrifice) (o:loses life or o:gain life or o:drain) mv<=3';
  }

  if (role.includes('reanimation_target')) {
    return 'type:creature mv>=6 (o:enters or o:flying or o:trample or o:haste)';
  }

  if (role.includes('entomb') || role.includes('discard_enabler')) {
    return '(type:creature or type:sorcery or type:instant) (o:discard or o:mill or o:put into your graveyard) mv<=2';
  }

  if (role.includes('cantrip') || role.includes('ritual')) {
    return '(type:instant or type:sorcery) (o:draw or o:add {r} or o:add {u}) mv<=2';
  }

  if (role.includes('ramp') || role.includes('acceleration') || role.includes('mana') || role.includes('rampa')) {
    if (hasG) return '(type:creature or type:sorcery) (o:search o:library o:land or o:add) mv<=3';
    return '(type:artifact or type:sorcery) (o:add or o:search o:library o:land) mv<=3';
  }

  if (role.includes('draw') || role.includes('value') || role.includes('engine') || role.includes('motor') || role.includes('robo')) {
    if (hasU) return '(type:creature or type:instant or type:sorcery) (o:draw or o:scry) mv<=4';
    return '(type:creature or type:sorcery) (o:draw or o:look at the top) mv<=4';
  }

  if (role.includes('disrupt') || role.includes('discard') || role.includes('hand') || role.includes('mano') || role.includes('descarte')) {
    if (hasB) return '(type:sorcery or type:instant) (o:discard or o:reveals) mv<=2';
    if (hasU) return 'type:instant o:counter mv<=3';
    return '(type:sorcery or type:instant) (o:discard or o:counter) mv<=3';
  }

  if (role.includes('counter') || role.includes('counterspell') || role.includes('contrahechizo')) {
    return 'type:instant o:counter o:spell mv<=3';
  }

  if (role.includes('sweeper') || role.includes('boardwipe') || role.includes('limpiamesas')) {
    if (hasW) return '(type:sorcery or type:instant) o:destroy o:all mv<=5';
    if (hasB) return '(type:sorcery or type:instant) (o:destroy or o:exile) o:each mv<=5';
    return '(type:sorcery or type:instant) (o:destroy or o:deal) o:each mv<=5';
  }

  if (role.includes('early') || role.includes('one_drop') || role.includes('two_drop') || role.includes('temprana') || role.includes('criatura') && role.includes('1')) {
    if (arch.includes('aggro') || strat.includes('aggro'))
      return 'type:creature mv<=2 (o:haste or o:first or pow>=2)';
    return 'type:creature mv<=2 (o:draw or o:enters or pow>=2)';
  }

  if (role.includes('token') || role.includes('token')) {
    return '(type:creature or type:sorcery or type:instant) o:create o:token mv<=4';
  }

  if (role.includes('protection') || role.includes('proteccion') || role.includes('protección')) {
    if (hasW) return '(type:instant) (o:protection or o:indestructible or o:return) mv<=2';
    if (hasU) return 'type:instant (o:counter or o:hexproof) mv<=3';
    return 'type:instant (o:protection or o:indestructible) mv<=3';
  }

  // --- FALLBACK FINAL POR ARQUETIPO ---
  const archetypeDefaultQuery = {
    aggro:    'type:creature mv<=3 (o:haste or o:first or o:trample or pow>=2)',
    tempo:    'type:creature mv<=3 (o:flying or o:hexproof or o:ward)',
    midrange: 'type:creature mv<=4 (o:enters or o:draw or o:destroy or o:lifelink)',
    control:  'type:instant (o:counter or o:destroy or o:draw)',
    ramp:     '(type:creature or type:sorcery) (o:search o:land or o:add)',
    combo:    'type:creature (o:enters or o:dies or o:sacrifice or o:whenever)',
    prison:   'type:creature (o:cost or o:can\'t or o:enter)',
  };

  return archetypeDefaultQuery[arch] || 'type:creature (o:enters or o:draw or o:destroy or pow>=2)';
}

export function getStrategyFallbackBlueprint(archetype, strategyId, formData) {
  const rawBlueprint = getDeckBlueprint(archetype, strategyId, formData);
  const dnaKey = strategyId || archetype || 'midrange';
  const dnaData = ARCHETYPE_DNA[dnaKey] || ARCHETYPE_DNA[archetype] || {
    prioridad: "Prioriza cartas con buen valor individual y sinergias directas con el resto de tus amenazas."
  };

  const rolesArray = Object.entries(rawBlueprint.roles).map(([roleName, quantity]) => {
    let cmcCategory = "any";
    let finisherQuality = "standard";
    const lowerRole = roleName.toLowerCase();
    
    if (lowerRole.includes("cmc1")) cmcCategory = "1";
    else if (lowerRole.includes("cmc2")) cmcCategory = "2";
    else if (lowerRole.includes("cmc3")) cmcCategory = "3";
    else if (lowerRole.includes("cmc4")) cmcCategory = "4+";
    else if (lowerRole.includes("cmc5")) cmcCategory = "5+";
    else if (lowerRole.includes("cmc6")) cmcCategory = "5+";
    else if (lowerRole.includes("cmc7")) cmcCategory = "5+";
    
    if (lowerRole.includes("finisher") || lowerRole.includes("payoff") || lowerRole.includes("win_cond")) {
      finisherQuality = "finisher";
      if (cmcCategory === "any") cmcCategory = "4+";
    }
    
    return {
      name: roleName,
      quantity: quantity,
      cmcCategory: cmcCategory,
      finisherQuality: finisherQuality,
      purposeDescription: `Fallback role for ${roleName} in ${strategyId || archetype}`,
      search_query: getFallbackSearchQuery(roleName, archetype, strategyId, formData?.colores || [])
    };
  });
  
  const deckName = generateThematicFallbackName(formData);
  const lore = generateThematicFallbackLore(deckName, formData);

  return {
    deckName,
    lore,
    totalSpells: rawBlueprint.totalSpells,
    strategy: dnaData.prioridad || "",
    mulligan: "Conserva manos con al menos 2-3 tierras de tus colores y una curva activa en los primeros turnos.",
    roles: rolesArray
  };
}

/**
 * Selecciona DINÁMICAmente el mejor hechizo de reanimación legal en Modern
 * basado en los colores y las criaturas del mazo.
 */
function getDynamicModernReanimateSpell(cards, formData) {
    const colores = new Set(formData?.colores || []);
    
    // Escaneo de tierras e identidades en el mazo para mayor precisión
    cards.forEach(c => {
        if (c && c.category === 'Land' && typeof c.name === 'string') {
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
        c && typeof c.name === 'string' && (
        legendaryTargets.some(leg => c.name.toLowerCase().includes(leg)) || 
        (c.type_line && c.type_line.toLowerCase().includes("legendary")))
    );

    const hasNonLegendaryTargets = highCmcCreatures.some(c => 
        c && typeof c.name === 'string' && (
        !legendaryTargets.some(leg => c.name.toLowerCase().includes(leg)) && 
        !(c.type_line && c.type_line.toLowerCase().includes("legendary")))
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
export const getMaxAllowedCopies = (cardName, category, cmc, ragPool = [], formData = null) => {
    if (!cardName) return 4;
    const nameLower = cardName.trim().toLowerCase();
    const isBasic = isBasicLand(nameLower);
    if (isBasic) return 99;

    // Singleton check
    if (formData && (formData.singleton || formData.deckSize === 100)) {
        return 1;
    }

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

        // EXCEPCIÓN TRIBAL: En tribus como Slivers, queremos la máxima redundancia posible para asegurar robar el efecto clave, aunque no se acumule.
        const isTribalBypass = typeLine.includes("sliver") || typeLine.includes("elf") || typeLine.includes("goblin") || typeLine.includes("merfolk");

        if ((hasKeywordGrant || hasNonStackingStaticEffect) && !hasCumulativeStats && !isTribalBypass) {
            // keywords/efectos baratos (CMC < 3) se capan a 3 copias (alta presencia pero sin atascar el 2do)
            // keywords/efectos medianos/costosos (CMC >= 3) se capan a 2 copias
            const redundancyCap = cardCmc >= 3 ? 2 : 3;
            if (redundancyCap < limit) {
                limit = redundancyCap;
            }
        }
    }

    if (formData && formData.maxCopies !== undefined) {
        limit = Math.min(limit, formData.maxCopies);
    }

    return limit;
};

export function getProCopiesForCard(card, role, ragPool = [], formData = null) {
  if (!card) return 4;
  const nameLower = (card.name || '').trim().toLowerCase();
  
  // Basic lands
  const isBasic = isBasicLand(nameLower);
  if (isBasic) return 99;

  const poolCard = ragPool ? ragPool.find(c => c.name.toLowerCase() === nameLower) : null;
  const typeLine = ((poolCard?.type_line || card.type_line || card.category || "")).toLowerCase();
  const oracleText = ((poolCard?.oracle_text || poolCard?.text || "")).toLowerCase();
  const cmc = poolCard?.mana_value ?? card.mana_value ?? card.cmc ?? 2;
  const isLegendary = typeLine.includes("legendary") || typeLine.includes("planeswalker") || card.category?.toLowerCase() === "planeswalker";
  const isCreature = typeLine.includes("creature");
  const isInstantOrSorcery = typeLine.includes("instant") || typeLine.includes("sorcery");

  // Si es una pieza clave inyectable del Core o Must Include, priorizar 4 copias
  if (card.isCore || card.isMustInclude) return 4;

  const playstyle = (formData?.playstyle || 'balanced').toLowerCase();

  // Si el estilo es Lineal y NO es una carta legendaria o básica, intentamos meter 4 copias
  if (playstyle === 'linear' && !isLegendary && !isBasic) {
    return Math.min(4, getMaxAllowedCopies(card.name, typeLine, cmc, ragPool));
  }

  // Si el estilo es Adaptativo y no es una carta básica, ni del Core inyectable/Firma obligatorio:
  if (playstyle === 'adaptive' && !card.isCore && !card.isMustInclude && !isBasic) {
    if (isLegendary) return 1;
    if (cmc >= 3) return 1;
    const isCantripCard = cmc <= 1 && (oracleText.includes("draw a card") || oracleText.includes("look at the top") || oracleText.includes("scry") || nameLower === "mishra's bauble");
    const isCheapInteractCard = isInstantOrSorcery && cmc <= 2 && (
      oracleText.includes("destroy") || oracleText.includes("damage") || oracleText.includes("counter") || 
      oracleText.includes("exile") || oracleText.includes("discard") || nameLower.includes("bolt") || nameLower.includes("push") || nameLower.includes("leak")
    );
    if (cmc <= 2 && !isCantripCard && !isCheapInteractCard) return 2;
  }

  const roleLower = (role?.name || role || '').toLowerCase();
  const isTutorRole = roleLower.includes('tutor') || roleLower.includes('wish');
  const isToolboxTargetRole = roleLower.includes('toolbox') || roleLower.includes('silver_bullet') || card.toolbox;
  const isToolboxStrategy = (formData?.strategy || '').toLowerCase().includes('toolbox') || (formData?.archetype || '').toLowerCase().includes('toolbox');

  // 0. Sinergias Ocultas (Spice / Innovación)
  if (poolCard?.isHiddenSynergy || card.isHiddenSynergy) {
    return (isLegendary || cmc >= 4) ? 1 : 2;
  }

  // --- NUEVO FASE 2: CANTIDAD DE COPIAS CONTEXTUAL POR ARQUETIPO (Problema 4) ---
  const archLower = (formData?.archetype || '').toLowerCase();
  const strategyLower = (formData?.strategy || '').toLowerCase();
  
  // A. Mazos de Combo: Consistencia extrema para piezas clave del combo
  const isCombo = archLower.includes('combo') || ['storm', 'reanimator', 'cascade', 'creativity', 'yawgmoth', 'amulet_titan'].includes(strategyLower);
  if (isCombo) {
    const isComboPiece = roleLower.includes('combo') || roleLower.includes('piece') || roleLower.includes('engine') || roleLower.includes('target') || roleLower.includes('payoff') || roleLower.includes('anchor');
    if (isComboPiece) {
      return isLegendary && cmc >= 5 ? 3 : 4; // Asegurar 3-4 copias
    }
  }

  // B. Mazos de Control: Evitar atascos de finishers caros en mano inicial
  const isControl = archLower.includes('control') || ['control', 'prison', 'taxes'].includes(strategyLower);
  if (isControl) {
    if (cmc >= 4 && (roleLower.includes('finisher') || roleLower.includes('win_cond') || roleLower.includes('threat'))) {
      return isLegendary ? 1 : 2; // Finishers pesados control: legendarios 1x, no-legendarios 2x
    }
  }

  // 1. Toolbox / Silver Bullets
  // Si la estrategia es Toolbox (o el rol es explícitamente silver bullet), forzamos 1 copia para la bala de plata
  if (isToolboxTargetRole || (isToolboxStrategy && !isTutorRole && !isBasic && !card.isCore)) {
    // Los tutores (motores) como Eldritch Evolution o Chord van a 4 copias, pero los targets (incluso artefactos/encantamientos) van a 1.
    if (!isTutorRole) {
        return 1;
    }
  }

  // Los Tutores Core en un mazo Toolbox suelen ir a 4 copias para la consistencia
  if (isTutorRole && isToolboxStrategy) {
      return 4;
  }

  // 2. Cantrips (CMC <= 1, draw or filter effects)
  const isCantrip = cmc <= 1 && (oracleText.includes("draw a card") || oracleText.includes("look at the top") || oracleText.includes("scry") || nameLower === "mishra's bauble");
  if (isCantrip && !isLegendary) {
    return 4;
  }

  // 3. Interacción barata (CMC 1-2, instant/sorcery de remoción o counter)
  const isCheapInteraction = isInstantOrSorcery && cmc <= 2 && (
    oracleText.includes("destroy") || oracleText.includes("damage") || oracleText.includes("counter") || 
    oracleText.includes("exile") || oracleText.includes("discard") || nameLower.includes("bolt") || nameLower.includes("push") || nameLower.includes("leak")
  );
  if (isCheapInteraction) {
    return 4;
  }

  // 4. Criaturas legendarias
  if (isLegendary && isCreature) {
    if (cmc >= 5) return 2; // Finishers legendarios
    if (cmc >= 4) return 2; // Midrange legendario
    return 3; // Criaturas legendarias baratas de soporte (ej: Thalia, Ragavan)
  }

  // 5. Planeswalkers
  const isPlaneswalker = typeLine.includes("planeswalker") || card.category?.toLowerCase() === "planeswalker";
  if (isPlaneswalker) {
    if (cmc >= 5) return 2;
    return 3;
  }

  // 6. Finishers pesados no-legendarios (CMC >= 5)
  if (cmc >= 5) {
    return 2;
  }

  // 7. Criaturas no-legendarias baratas/medianas (CMC <= 3)
  if (isCreature && cmc <= 3) {
    return 4;
  }

  // 8. Amenazas CMC 4 no-legendarias
  if (cmc === 4) {
    return 3;
  }

  // Fallback por defecto
  const proCopies = 4;
  return Math.min(proCopies, getMaxAllowedCopies(card.name, typeLine, cmc, ragPool));
}

export function getFunctionalScore(card, originalRole, originalName) {
    let score = 0;
    const oText = (card.oracle_text || card.text || '').toLowerCase();
    const typeLower = (card.type_line || card.type || '').toLowerCase();
    const nameLower = (card.name || '').toLowerCase();
    const isCreature = typeLower.includes('creature');
    
    const roleLower = (originalRole || '').toLowerCase();
    const origNameLower = (originalName || '').toLowerCase();
    
    // Determinar si buscamos Rampa / Tutor de Tierras
    const isLookingForRamp = roleLower.includes('tutor_tierras') || 
                             roleLower.includes('ramp') || 
                             roleLower.includes('growth') || 
                             roleLower.includes('dork') || 
                             roleLower.includes('rocks') || 
                             origNameLower.includes('cultivate') || 
                             origNameLower.includes('birds of paradise') || 
                             origNameLower.includes('llanowar elves') ||
                             origNameLower.includes('elves');
                             
    // Determinar si buscamos Robo / Ventaja de cartas
    const isLookingForDraw = roleLower.includes('draw') || 
                             roleLower.includes('advantage') || 
                             roleLower.includes('cantrip') || 
                             origNameLower.includes('harmonize') || 
                             origNameLower.includes('whisper');
                             
    // Determinar si buscamos Remoción / Board Wipe / Interacción / Counter
    const isLookingForRemoval = roleLower.includes('removal') || 
                                 roleLower.includes('wipe') || 
                                 roleLower.includes('sweeper') || 
                                 roleLower.includes('counter') || 
                                 roleLower.includes('interaction') || 
                                 origNameLower.includes('push') || 
                                 origNameLower.includes('counterspell');
                                 
    // Determinar si buscamos Finisher / Amenaza
    const isLookingForFinisher = roleLower.includes('finisher') || 
                                 roleLower.includes('threat') || 
                                 roleLower.includes('win_cond') ||
                                 (isCreature && (card.mana_value || card.cmc || 0) >= 5);

    if (isLookingForRamp) {
        if (oText.includes('search your library for') && oText.includes('land')) score += 500;
        if (oText.includes('add ') && oText.includes('mana')) score += 400;
        if (oText.includes('{t}: add')) score += 400;
        if (typeLower.includes('creature') && (oText.includes('add') || oText.includes('mana'))) score += 300;
    }
    if (isLookingForDraw) {
        if (oText.includes('draw') && oText.includes('card')) score += 500;
        if (oText.includes('look at the top')) score += 300;
    }
    if (isLookingForRemoval) {
        if (oText.includes('destroy') || oText.includes('exile') || oText.includes('counter target') || oText.includes('damage to target creature')) score += 500;
        if (oText.includes('deals ') && oText.includes('damage')) score += 200;
    }
    if (isLookingForFinisher) {
        if (isCreature && (card.mana_value || card.cmc || card.mana_cost || 0) >= 5) score += 400;
        if (typeLower.includes('planeswalker')) score += 300;
        if (oText.includes('trample') || oText.includes('flying') || oText.includes('haste') || oText.includes('indestructible')) score += 100;
    }
    return score;
}

export function obtenerMejorCartaDeRemplazo(category, targetCmc, allowedColors, format = 'MODERN', ragPool = [], excludeNames = [], allCards = [], originalCardName = '', role = '') {
    const formatUpper = (format || 'MODERN').toUpperCase();
    const formatKey = formatUpper.toLowerCase();
    const colorsSet = new Set(allowedColors && allowedColors.length > 0 ? allowedColors : ['W', 'U', 'B', 'R', 'G']);
    const excludeSet = new Set((excludeNames || []).filter(n => typeof n === 'string').map(n => n.toLowerCase().trim()));
    
    // Fall back to module-cached cards if allCards is empty or omitted
    const dbCards = (allCards && allCards.length > 0) ? allCards : cachedAllCards;
    
    // 1. Intentar buscar en el RAG pool de la baraja (verificando legalidad real y descartando custom cards si no se permiten)
    if (ragPool && ragPool.length > 0) {
        const candidates = ragPool.filter(c => {
            if (!c || typeof c.name !== 'string') return false;
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
            
            // Verificar legalidad del formato si dbCards está disponible
            if (dbCards && dbCards.length > 0) {
                const isLegal = checkCardFormatLegality(c.name, formatUpper, false);
                if (!isLegal) return false;
            }
            
            return true;
        });
        
        if (candidates.length > 0) {
            // Ordenar por funcionalidad, cercanía de CMC y score
            candidates.sort((a, b) => {
                const scoreA = getFunctionalScore(a, role, originalCardName);
                const scoreB = getFunctionalScore(b, role, originalCardName);
                if (scoreA !== scoreB) return scoreB - scoreA;

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

    // 2. Si no hay candidatos válidos en el pool, y tenemos dbCards, buscar en toda la base de datos
    if (dbCards && dbCards.length > 0) {
        const dbCandidates = dbCards.filter(c => {
            if (!c || typeof c.name !== 'string') return false;
            const nameClean = c.name.toLowerCase().trim();
            if (excludeSet.has(nameClean)) return false;
            
            const typeLower = (c.type_line || '').toLowerCase();
            if (typeLower.includes("land")) return false;
            
            // Coincidir categoría
            const isCreature = category === 'Creature';
            const cardIsCreature = typeLower.includes("creature");
            if (isCreature !== cardIsCreature) return false;
            
            // Coincidir identidad de color
            const cardColors = c.colors || [];
            if (cardColors.length > 0 && !cardColors.every(col => colorsSet.has(col))) return false;
            
            // Verificar formato y custom usando nuestro helper central
            return checkCardFormatLegality(c.name, formatUpper, false);
        });
        
        if (dbCandidates.length > 0) {
            // Ordenar por funcionalidad, cercanía de CMC, etc.
            dbCandidates.sort((a, b) => {
                const scoreA = getFunctionalScore(a, role, originalCardName);
                const scoreB = getFunctionalScore(b, role, originalCardName);
                if (scoreA !== scoreB) return scoreB - scoreA;
                
                const diffA = Math.abs((a.mana_value || a.cmc || 0) - targetCmc);
                const diffB = Math.abs((b.mana_value || b.cmc || 0) - targetCmc);
                if (diffA !== diffB) return diffA - diffB;
                
                return a.name.localeCompare(b.name);
            });
            
            const best = dbCandidates[0];
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
    
    // 3. Si no hay candidatos en el pool ni en la base de datos, usar staples estáticos de fallback según formato
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
const distribuirOInyectarHechizosFaltantes = (spellList, targetCount, colors, addLog, ragPool = [], formData = null, blueprint = null) => {
    let currentCount = spellList.reduce((sum, c) => sum + (c.quantity || 0), 0);
    let gap = targetCount - currentCount;
    if (gap <= 0) return spellList;

    const logMsgInit = `[JUEZ COMPENSACIÓN] Rellenando hueco de hechizos de ${currentCount} a ${targetCount} (Faltan ${gap} copias)`;
    console.log(logMsgInit);
    if (addLog) addLog(logMsgInit);

    let adjustedList = spellList.map(c => ({ ...c }));
    const colorsSet = new Set(colors || []);

    // Calcular déficit por rol del Blueprint
    const roleDeficits = new Map();
    if (blueprint && Array.isArray(blueprint.roles)) {
        blueprint.roles.forEach(r => {
            const roleNameLower = (r.name || '').toLowerCase();
            const currentRoleCount = adjustedList.filter(c => {
                const cRoleLower = (c.role || '').toLowerCase();
                return cRoleLower.includes(roleNameLower) || roleNameLower.includes(cRoleLower);
            }).reduce((sum, c) => sum + c.quantity, 0);
            const deficit = r.quantity - currentRoleCount;
            if (deficit > 0) {
                roleDeficits.set(roleNameLower, deficit);
            }
        });
    }

    // 1. Prioridad Absoluta: Incrementar hechizos pertenecientes a roles DEFICITARIOS
    for (let spell of adjustedList) {
        if (gap <= 0) break;
        const spellRoleLower = (spell.role || '').toLowerCase();
        const hasDeficit = Array.from(roleDeficits.keys()).some(defKey => spellRoleLower.includes(defKey) || defKey.includes(spellRoleLower));

        if (hasDeficit) {
            const maxLimit = getMaxAllowedCopies(spell.name, spell.category, spell.cmc, ragPool);
            if (spell.quantity < maxLimit) {
                const addQty = Math.min(maxLimit - spell.quantity, gap);
                if (addQty > 0) {
                    spell.quantity += addQty;
                    gap -= addQty;
                    const logMsg = `[JUEZ COMPENSACIÓN ROL] Incrementando ${spell.name} (${spell.role}) en +${addQty} copias por déficit de rol (Total: ${spell.quantity} / Límite: ${maxLimit})`;
                    console.log(logMsg);
                    if (addLog) addLog(logMsg);
                }
            }
        }
    }

    if (gap <= 0) return adjustedList;

    // 1b. Si aún falta maná/aceleración y el rol ramp tiene déficit, inyectar dorks de maná del RAG pool
    if (ragPool && ragPool.length > 0 && roleDeficits.has('mana_dorks_and_growth') || roleDeficits.has('ramp')) {
        const dorkCandidates = ragPool.filter(p => {
            const oracle = (p.oracle_text || '').toLowerCase();
            const cmc = p.mana_value || p.cmc || 0;
            return cmc <= 2 && (oracle.includes('add ') || oracle.includes('search your library for a land'));
        });

        for (let dork of dorkCandidates) {
            if (gap <= 0) break;
            const existing = adjustedList.find(c => c.name.trim().toLowerCase() === dork.name.trim().toLowerCase());
            if (existing) continue;

            const maxLimit = getMaxAllowedCopies(dork.name, 'Creature', dork.mana_value || 1, ragPool);
            const addQty = Math.min(maxLimit, gap);
            if (addQty > 0) {
                adjustedList.push({
                    name: dork.name,
                    quantity: addQty,
                    category: 'Creature',
                    cmc: dork.mana_value || 1,
                    role: 'mana_dorks_and_growth'
                });
                gap -= addQty;
                addLog(`[JUEZ COMPENSACIÓN RAMP] Inyectando dork de maná por déficit de Blueprint: ${addQty}x ${dork.name}`);
            }
        }
    }

    if (gap <= 0) return adjustedList;

    // 2. Si todavía falta, buscar en el RAG pool las mejores cartas que coincidan con los roles con déficit
    if (ragPool && ragPool.length > 0) {
        const sortedPool = [...ragPool].sort((a, b) => {
            const roleA = (a.role || '').toLowerCase();
            const roleB = (b.role || '').toLowerCase();
            const defA = Array.from(roleDeficits.keys()).some(k => roleA.includes(k)) ? 10 : 0;
            const defB = Array.from(roleDeficits.keys()).some(k => roleB.includes(k)) ? 10 : 0;
            if (defA !== defB) return defB - defA;
            return (b.score || 0) - (a.score || 0);
        });
        for (let poolCard of sortedPool) {
            if (gap <= 0) break;

            const nameLower = poolCard.name.trim().toLowerCase();
            const narrowHateCards = ["rest in peace", "surgical extraction", "leyline of the void", "tormod's crypt", "grafdigger's cage", "stony silence"];
            if (narrowHateCards.includes(nameLower)) continue;

            const existing = adjustedList.find(c => c.name.trim().toLowerCase() === nameLower);
            if (existing) continue;

            const typeLower = poolCard.type_line ? poolCard.type_line.toLowerCase() : "";
            if (typeLower.includes("land")) continue;

            const matchColors = !poolCard.colors || poolCard.colors.length === 0 || poolCard.colors.every(col => colorsSet.has(col));
            if (!matchColors) continue;

            let newCat = typeLower.includes("creature") ? "Creature" : (typeLower.includes("sorcery") ? "Sorcery" : (typeLower.includes("artifact") ? "Artifact" : "Instant"));
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

                const logMsg = `[JUEZ COMPENSACIÓN] Inyectando del pool RAG: ${addQty}x ${poolCard.name} (CMC: ${cardCmc}, Límite: ${maxLimit})`;
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
};


/**
 * Retorna true si el rol de la carta es ESTRATÉGICO/sagrado y no debe ser recortado a la ligera.
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

    const coreThreatKeywords = ["core", "finisher", "payoff", "engine", "threat", "lord", "aggro", "creature", "acceleration", "enabler", "tribal", "generator", "token", "sliver", "elf", "goblin", "merfolk", "zombie", "vampire", "spirit"];
    const isCoreThreat = coreThreatKeywords.some(kw => (card.role || '').toLowerCase().includes(kw)) || ["early_tribal_acceleration", "tribal_utility_enablers", "core_tribal_lords", "premium_tribal_finishers"].includes(card.role);

    // 1. Legendarias redundantes o artefactos legendarios no-criatura (ej. Urza's Sylex, planeswalkers redundantes) - priorizar recortar si cantidad > 2
    if (isLegendary && card.quantity > 2) {
        return 50; 
    }

    // 2. Utilidad genérica / cartas que no son interacción ni robo ni amenaza central y tienen cantidad > 2
    if (!isInteraction && !isCantrip && !isCoreThreat && card.quantity > 2) {
        return 45;
    }

    // 2.5 Amenazas centrales genéricas redundantes (ej. más de 3 copias, bajar a 3 si hace falta)
    if (isCoreThreat && card.quantity > 3) {
        return 22; // Prioridad baja, solo si es estrictamente necesario
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
 * protegiendo los roles ESTRATÉGICOs y registrando todo en el oráculo.
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

export function checkCardFormatLegality(cardName, format = 'MODERN', allowCustomCards = false) {
    if (!cardName) return false;
    const nameLower = cardName.toLowerCase().trim();
    
    // Preferir impresiones oficiales del Universo MTG Principal si allowCustomCards es false
    let dbCard = cachedAllCards.find(ac => {
        if (!ac || !ac.name) return false;
        if (ac.name.toLowerCase().trim() !== nameLower) return false;
        if (ac.layout === 'token' || ac.layout === 'art_series' || ac.layout === 'emblem') return false;
        if (!allowCustomCards && isUniversesBeyondOrCustom(ac)) return false;
        return true;
    });
    
    if (!dbCard) {
        dbCard = cachedAllCards.find(ac => ac && ac.name && ac.name.toLowerCase().trim() === nameLower);
    }
    
    if (!dbCard) return false;
    
    const selectedFormat = format.toLowerCase();
    const isLegal = dbCard.legalities && dbCard.legalities[selectedFormat] === 'legal';
    const isCustom = isUniversesBeyondOrCustom(dbCard);
    
    return isLegal && (allowCustomCards || !isCustom);
}


/**
 * PASO 4: Juez de Estado Final
 * Esta función asegura que antes de mostrar el mazo al usuario,
 * se cumplan los mínimos de estrategia y haya criaturas válidas.
 */
export async function aplicarJuezFinal(deckResult, dnaData, formData, addLog, ragPool = [], preserveLands = false, spellAuditOnly = false, preserveSpells = false, blueprint = null) {
    let { cards } = deckResult;
    cards = (cards || []).filter(c => c && typeof c.name === 'string');
    if (!cachedAllCards || cachedAllCards.length === 0) {
        cachedAllCards = await getAllCards();
    }
    const strategyObj = MTG_STRATEGIES.find(s => s.id === formData?.strategy || s.label === formData?.strategy) || null;
    let strategyId = strategyObj ? strategyObj.id : (formData?.strategy || '');
    strategyId = inferStrategyFromArchetype(formData?.archetype, strategyId, formData?.prompt);
    const tribeObj = MTG_TRIBES.find(t => t.id === formData?.tribe || t.label === formData?.tribe) || null;
    const tribeId = tribeObj ? tribeObj.id : (formData?.tribe || '');
    const colors = new Set(formData?.colores || []);
    const customSets = [
        'tla', 'atla', 'ttla', 'tle', 'jtla', 'atle', 'ftla', 'ttle',
        'fin', 'afic', 'afin', 'fic', 'tfin', 'tfic',
        'tmt', 'atmt', 'tmc', 'ftmc', 'ttmc', 'ttmt',
        'spm', 'aspm', 'spe', 'tspm',
        'psdg', 'pspl'
    ];
    
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
        const roleLower = String(r).toLowerCase();
        if (blueprint && Array.isArray(blueprint.roles)) {
            const isBlueprintRole = blueprint.roles.some(bRole => 
                (bRole.name || '').toLowerCase().includes(roleLower) || 
                roleLower.includes((bRole.name || '').toLowerCase())
            );
            if (isBlueprintRole) return true;
        }
        const protectedRoles = [
            "combo_enabler", "combo_pieces", "combo_enablers", "reanimation_spells", "reanimation_creature_targets",
            "team_anthem_buffs", "etb_value_creatures", "auras_and_enchantments",
            "graveyard_payoffs", "cheap_threats", "mana_dorks_and_growth", "ramp", "mana_dork"
        ];
        if (protectedRoles.includes(roleLower)) return true;
        if (roleLower.includes("finisher") || roleLower.includes("win_cond") || roleLower.includes("combo_piece") || roleLower.includes("ramp")) return true;
        return false;
    };


    const isCardFormatLegal = (cardName) => {
        return checkCardFormatLegality(cardName, formData?.format || 'MODERN', !!formData?.allowCustomCards);
    };

    const inyectarCartaDirecta = (list, newCard) => {
        if (!newCard.name) return list;
        let nameClean = newCard.name.trim();
        
        // Verificar legalidad del formato (Problema 6)
        if (!isCardFormatLegal(nameClean)) {
            const allowedColors = formData?.colores || [];
            const allowCustomCards = !!formData?.allowCustomCards;
            let intelligentUsed = false;
            const replacementName = getIntelligentSubstitution(nameClean, newCard.role);
            if (replacementName && replacementName !== nameClean) {
                const repCard = cachedAllCards.find(ac => ac && ac.name && ac.name.toLowerCase() === replacementName.toLowerCase());
                if (repCard) {
                    const selectedFormat = (formData?.format || 'MODERN').toLowerCase();
                    const repLegal = repCard.legalities && repCard.legalities[selectedFormat] === 'legal';
                    const repCustom = repCard.set && (customSets.includes(repCard.set.toLowerCase()) || repCard.set.toLowerCase().includes('custom'));
                    const colorsSet = new Set(allowedColors && allowedColors.length > 0 ? allowedColors : ['W', 'U', 'B', 'R', 'G']);
                    const cardColors = repCard.colors || [];
                    const isColorCompatible = cardColors.length === 0 || cardColors.every(col => colorsSet.has(col));
                    
                    if (repLegal && (allowCustomCards || !repCustom) && isColorCompatible) {
                        addLog(`[JUEZ LEGALIDAD] "${nameClean}" no es legal en el formato ${formData?.format}. Reemplazo inteligente encontrado: "${repCard.name}"`);
                        nameClean = repCard.name;
                        newCard.cmc = repCard.mana_value || repCard.cmc || 2;
                        newCard.category = repCard.type_line?.toLowerCase().includes('creature') ? 'Creature' : (repCard.type_line?.toLowerCase().includes('instant') ? 'Instant' : 'Spell');
                        intelligentUsed = true;
                    }
                }
            }
            
            if (!intelligentUsed) {
                const rep = obtenerMejorCartaDeRemplazo(newCard.category, newCard.cmc, allowedColors, formData?.format, ragPool, [nameClean.toLowerCase()]);
                if (rep && rep.name) {
                    addLog(`[JUEZ LEGALIDAD] "${nameClean}" no es legal en el formato ${formData?.format}. Reemplazando por "${rep.name}" (CMC ${rep.cmc}, ${rep.category}).`);
                    nameClean = rep.name;
                    newCard.cmc = rep.cmc;
                    newCard.category = rep.category;
                } else {
                    addLog(`[JUEZ LEGALIDAD] Advertencia: No se encontró reemplazo legal para "${nameClean}" en el formato ${formData?.format}. Omisión de INYECCIÓN.`);
                    return list;
                }
            }
        }

        const existing = list.find(c => c && typeof c.name === 'string' && c.name.trim().toLowerCase() === nameClean.toLowerCase());
        const maxLimit = getMaxAllowedCopies(nameClean, newCard.category, newCard.cmc, ragPool);
        if (existing) {
            existing.quantity = Math.min(maxLimit, existing.quantity + newCard.quantity);
            return list;
        }
        list.push({ ...newCard, name: nameClean, quantity: Math.min(maxLimit, newCard.quantity) });
        return list;
    };

    const removerCarta = (list, cardName, qty = 99) => {
        if (!cardName) return list;
        const existingIdx = list.findIndex(c => c && typeof c.name === 'string' && c.name.toLowerCase() === cardName.toLowerCase());
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
            if (existCard && typeof existCard.name === 'string') {
                const limit = getMaxAllowedCopies(existCard.name, existCard.category, existCard.cmc, ragPool);
                if (existCard.quantity >= limit) {
                    list.push(existCard.name.toLowerCase());
                }
            }
        });
        return list;
    };

    // =========================================================================
    // ⚔️ EL CUERPO SUPREMO DE LEYES DEL PRO TOUR (AUDITORÁ A DE INCOMPATIBILIDADES)
    // =========================================================================
    
    if (!preserveSpells) {
        // Veto de Cartas Personalizadas del Usuario (Oracle Tuner)
        if (formData?.vetoedCards) {
            const userVetoedList = Array.isArray(formData.vetoedCards)
                ? formData.vetoedCards.map(c => (typeof c === 'string' ? c : c.name || '').trim().toLowerCase())
                : String(formData.vetoedCards).split(',').map(s => s.trim().toLowerCase());
                
            let originalLength = cards.length;
            cards = cards.filter(c => {
                if (c && c.name && typeof c.name === 'string') {
                    const nameLower = c.name.toLowerCase();
                    const isVetoed = userVetoedList.includes(nameLower);
                    if (isVetoed) {
                        addLog(`[JUEZ VETO] Carta "${c.name}" vetada por el usuario. Removiendo del mazo y reemplazándola.`);
                        return false;
                    }
                }
                return true;
            });
            
            let removedCount = originalLength - cards.length;
            if (removedCount > 0) {
                // Rellenar con mejores reemplazos del RAG
                const excludeNames = [...userVetoedList, ...getCappedCardsList()];
                const rep = obtenerMejorCartaDeRemplazo("Instant", 1, Array.from(colors), formData?.format, ragPool, excludeNames);
                cards = inyectarCartaDirecta(cards, {
                    name: rep.name,
                    quantity: removedCount,
                    category: rep.category,
                    cmc: rep.cmc,
                    role: "utility"
                }, ragPool);
            }
        }

        // A. EXCLUSIÓN DE CARTAS DE ODIO ESTRECHO DEL MAINDECK AL SIDEBOARD
        const narrowHateCards = ["rest in peace", "surgical extraction", "leyline of the void", "tormod's crypt", "grafdigger's cage", "stony silence"];
        let hateCardsFound = [];
        cards = cards.filter(c => {
            if (c && c.name && typeof c.name === 'string' && c.category !== 'Land' && narrowHateCards.includes(c.name.toLowerCase())) {
                hateCardsFound.push(c);
                return false; // Quitar del Maindeck
            }
            return true;
        });

        if (hateCardsFound.length > 0) {
            const totalHateQty = hateCardsFound.reduce((sum, h) => sum + h.quantity, 0);
            const logHate = `[JUEZ PRO TOUR] Odio estrecho en Maindeck detectado (${hateCardsFound.map(h => `${h.quantity}x ${h.name}`).join(', ')}). Moviéndolo al Sideboard DINÁMICAmente y rellenando con interacción genérica.`;
            console.log(logHate);
            if (addLog) addLog(logHate);

            // Rellenar con interacción genérica
            const excludeHate = [...narrowHateCards];
            cards.forEach(existCard => {
                if (existCard && typeof existCard.name === 'string') {
                    const limit = getMaxAllowedCopies(existCard.name, existCard.category, existCard.cmc, ragPool);
                    if (existCard.quantity >= limit) {
                        excludeHate.push(existCard.name.toLowerCase());
                    }
                }
            });
            const rep = obtenerMejorCartaDeRemplazo("Instant", 1, Array.from(colors), formData?.format, ragPool, excludeHate);
            cards = inyectarCartaDirecta(cards, { name: rep.name, quantity: totalHateQty, category: rep.category, cmc: rep.cmc, role: "interaction" }, ragPool);
        }

        // B. COMPATIBILIDAD DE STONEFORGE MYSTIC
        const hasStoneforge = cards.some(c => c && typeof c.name === 'string' && c.name.toLowerCase() === "stoneforge mystic");
        if (hasStoneforge) {
            const equipments = ["sword of fire and ice", "shadowspear", "batterskull", "kaldra compleat", "colossus hammer", "sword of feast and famine"];
            const hasEquip = cards.some(c => c && typeof c.name === 'string' && equipments.includes(c.name.toLowerCase()));
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
        const hasPersist = cards.some(c => c && typeof c.name === 'string' && c.name.toLowerCase() === "persist");
        if (hasPersist && strategyId === 'reanimator') {
            const giants = cards.filter(c => c && c.category === 'Creature' && c.cmc >= 6);
            const hasNonLegendaryGiant = giants.some(c => c && typeof c.name === 'string' && !["atraxa, grand unifier", "griselbrand", "sheoldred, the apocalypse", "koma, cosmos serpent"].includes(c.name.toLowerCase()));
            if (!hasNonLegendaryGiant) {
                const logPersist = `[JUEZ PRO TOUR] El mazo usa "Persist" (solo reanima NO-legendarias) pero solo tiene payoffs legendarios. Inyectando "Archon of Cruelty" para asegurar consistencia del combo.`;
                console.log(logPersist);
                if (addLog) addLog(logPersist);

                cards = inyectarCartaDirecta(cards, { name: "Archon of Cruelty", quantity: 2, category: "Creature", cmc: 8, role: "reanimation_creature_targets" });
                
                let purgedLegendaries = 0;
                const legendaries = cards.filter(c => c && c.category === 'Creature' && c.cmc >= 6 && c.name && typeof c.name === 'string' && c.name.toLowerCase() !== "archon of cruelty");
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
        const allowedHeavyStrategies = ['reanimator', 'ramp', 'tron', 'landfall', 'toolbox'];
        const isHeavyStrategy = allowedHeavyStrategies.includes(strategyId) ||
                                allowedHeavyStrategies.some(s => archLower.includes(s)) ||
                                (tribeId && typeof tribeId === 'string' && tribeId !== 'none' && tribeId !== 'ninguna' && ['sea_monsters', 'eldrazi', 'dragons', 'dinosaurs'].includes(tribeId.toLowerCase()));
        
        if (!isHeavyStrategy) {
            const mustIncludeNamesList = parseUserRulesString(formData?.mustInclude || '').filter(item => item && typeof item.name === 'string').map(item => item.name.toLowerCase());
            
            // Cargar base de datos para comprobar palabras clave y evitar vetar cartas con costes alternativos
            const allCards = await getAllCards();
            
            // Encontrar criaturas de CMC >= 6 que no sean must-includes
            const uncastables = cards.filter(c => {
                if (!c || c.category !== 'Creature' || c.cmc < 6 || !c.name || typeof c.name !== 'string') return false;
                if (mustIncludeNamesList.includes(c.name.toLowerCase()) || c.role === 'must-include') return false;
                
                // Buscar si tiene delve, affinity, convoke, evoke o ninjutsu
                const dbCard = allCards.find(ac => ac.name.toLowerCase() === c.name.toLowerCase());
                if (dbCard) {
                    const textLower = (dbCard.oracle_text || '').toLowerCase();
                    const typeLower = (dbCard.type_line || '').toLowerCase();
                    if (textLower.includes('delve') || 
                        textLower.includes('affinity') || 
                        textLower.includes('convoke') || 
                        textLower.includes('evoke') || 
                        textLower.includes('ninjutsu') ||
                        textLower.includes('emerge') ||
                        textLower.includes('prototype') ||
                        textLower.includes('undisturbed') ||
                        textLower.includes('rather than pay') ||
                        typeLower.includes('avatar') ||
                        c.name.toLowerCase() === 'scion of draco'
                    ) {
                        return false; // Excluir de la lista de vetadas (bypass)
                    }
                }
                return true;
            });
            
            const isControlOrMidrange = strategyId === 'control' || archLower.includes('control') || strategyId === 'midrange' || archLower.includes('midrange');
            const isPrison = strategyId === 'prison' || archLower.includes('prison') || strategyId === 'stax' || archLower.includes('stax') || strategyId === 'taxes' || archLower.includes('taxes');
            let allowedHeavyCopies = isPrison ? 4 : (isControlOrMidrange ? 2 : 0);
            
            for (const c of uncastables) {
                const qty = c.quantity;
                let keepQty = 0;
                if (allowedHeavyCopies > 0) {
                    keepQty = Math.min(qty, allowedHeavyCopies);
                    allowedHeavyCopies -= keepQty;
                }
                
                const vetoQty = qty - keepQty;
                if (vetoQty > 0) {
                    const logUncastable = `[JUEZ PRO TOUR] Veto de Criatura Gigante: ${vetoQty} de ${qty} copias de la criatura pesada incasteable "${c.name}" (CMC ${c.cmc}) interceptada en estrategia "${strategyId || 'desconocida'}". Transmutando a staple eficiente de coste bajo/medio.`;
                    console.log(logUncastable);
                    if (addLog) addLog(logUncastable);
                    
                    // Reducir la cantidad de la criatura pesada en el mazo o removerla si queda en 0
                    if (keepQty > 0) {
                        const idx = cards.findIndex(card => card && typeof card.name === 'string' && card.name.toLowerCase() === c.name.toLowerCase());
                        if (idx !== -1) {
                            cards[idx].quantity = keepQty;
                        }
                    } else {
                        cards = removerCarta(cards, c.name, vetoQty);
                    }
                    
                    // Excluir de la búsqueda el propio nombre y cualquier carta que ya esté al máximo
                    const excludeNames = [c.name.toLowerCase(), ...getCappedCardsList()];
                    
                    // Decidir si reemplazamos por un hechizo reactivo (Instant) de coste 1-2 o criatura de coste 2-3
                    const replacementCategory = Math.random() > 0.5 ? "Creature" : "Instant";
                    const targetCmc = replacementCategory === "Creature" ? 2 : 1;
                    
                    const rep = obtenerMejorCartaDeRemplazo(replacementCategory, targetCmc, Array.from(colors), formData?.format, ragPool, excludeNames);
                    cards = inyectarCartaDirecta(cards, {
                        name: rep.name,
                        quantity: vetoQty,
                        category: rep.category,
                        cmc: rep.cmc,
                        role: "utility"
                    });
                }
            }
        }

        // D. COMPATIBILIDAD DE DELIRIO CON MISHRA'S BAUBLE
        const hasDelirium = cards.some(c => c && typeof c.name === 'string' && (c.name.toLowerCase() === "dragon's rage channeler" || c.name.toLowerCase() === "tarmogoyf"));
        if (hasDelirium && (strategyId === 'graveyard' || strategyId === 'delirium')) {
            const hasBauble = cards.some(c => c && typeof c.name === 'string' && c.name.toLowerCase() === "mishra's bauble");
            if (!hasBauble) {
                const logDelirium = `[JUEZ PRO TOUR] Mazo de Delirium detectado sin Mishra's Bauble. Inyectando 4x Mishra's Bauble para acelerar cementerio gratis.`;
                console.log(logDelirium);
                if (addLog) addLog(logDelirium);

                cards = inyectarCartaDirecta(cards, { name: "Mishra's Bauble", quantity: 4, category: "Artifact", cmc: 0, role: "delirium_enabler" });

                let purgedCount = 0;
                const lowPrioritySpells = cards.filter(c => c && c.category !== 'Land' && c.cmc >= 2 && !esRolProtegido(c.role) && c.quantity > 1);
                for (let lp of lowPrioritySpells) {
                    if (purgedCount >= 4) break;
                    const take = Math.min(lp.quantity - 1, 4 - purgedCount);
                    lp.quantity -= take;
                    purgedCount += take;
                }
                cards = cards.filter(c => c.quantity > 0);
            }
        }

        // E. AUDITORÁ A DE ANTI-SINERGIAS COMPETITIVAS (COMPETITIVE_ANTI_SYNERGIES)
        COMPETITIVE_ANTI_SYNERGIES.forEach(anti => {
            if (!anti.card) return;
            const hasCard = cards.some(c => c && typeof c.name === 'string' && c.name.toLowerCase() === anti.card.toLowerCase());
            const hasConflict = strategyId && typeof strategyId === 'string' && (
                                strategyId.toLowerCase() === anti.strategy.toLowerCase() || 
                                (formData?.archetype || '').toLowerCase().includes(anti.strategy.toLowerCase()));
            
            if (hasCard && hasConflict) {
                const existingIdx = cards.findIndex(c => c && typeof c.name === 'string' && c.name.toLowerCase() === anti.card.toLowerCase());
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
    }

    // F. SOPORTE DE DOMAIN PARA LEYLINE BINDING
    const hasLeylineBinding = cards.some(c => c && typeof c.name === 'string' && c.name.toLowerCase() === "leyline binding");
    if (hasLeylineBinding && colors.size >= 2 && !spellAuditOnly && !preserveLands) {
        const triomes = ["Raffine's Tower", "Xander's Lounge", "Ziatora's Proving Ground", "Jetmir's Garden", "Spara's Headquarters", "Indatha Triome", "Ketria Triome", "Raugrin Triome", "Savai Triome", "Zagoth Triome"];
        const hasTriome = cards.some(c => c && c.category === 'Land' && triomes.includes(c.name));
        if (!hasTriome) {
            const complementTriome = colors.has("W") && colors.has("U") && colors.has("B") ? "Ziatora's Proving Ground" : "Spara's Headquarters";
            const logDomain = `[JUEZ PRO TOUR] Leyline Binding detectado sin Trioma de soporte. Inyectando 1x "${complementTriome}" para acelerar el Domain.`;
            console.log(logDomain);
            if (addLog) addLog(logDomain);

            const basicLandsList = cards.filter(c => c && c.category === 'Land' && c.name && typeof c.name === 'string' && isColoredBasicLand(c.name));
            if (basicLandsList.length > 0) {
                basicLandsList[0].quantity -= 1;
                cards.push({ name: complementTriome, quantity: 1, category: "Land", type_line: "Land — Triome", color_identity: ["G", "W", "U"] });
            }
            cards = cards.filter(c => c.quantity > 0);
        }
    }

    // G. PROTECCIÓN CONTRA BLOOD MOON EN MAZOS MULTICOLORES (3+ COLORES)
    if (colors.size >= 3 && !hasTribe && (formData?.format || '').toUpperCase() !== 'STANDARD' && !spellAuditOnly && !preserveLands) {
        const basicLands = cards.filter(c => c && c.category === 'Land' && c.name && typeof c.name === 'string' && isColoredBasicLand(c.name));
        const uniqueBasics = new Set(basicLands.map(b => b.name.toLowerCase()));
        
        const hasBasicOfColor = (color) => {
            const allowed = BASIC_LANDS_BY_COLOR[color] || [];
            return Array.from(uniqueBasics).some(name => allowed.includes(name));
        };

        const needsSnow = deckNeedsSnowLands(cards.filter(c => c.category !== 'Land'));
        const formatKey = (formData?.format || 'MODERN').toLowerCase();
        const canUseSnow = needsSnow && cachedAllCards.some(ac => ac && ac.name === "Snow-Covered Island" && ac.legalities && ac.legalities[formatKey] === 'legal');

        let basicsToAdd = [];
        if (colors.has("G") && !hasBasicOfColor("G")) basicsToAdd.push(canUseSnow ? "Snow-Covered Forest" : "Forest");
        if (colors.has("U") && !hasBasicOfColor("U")) basicsToAdd.push(canUseSnow ? "Snow-Covered Island" : "Island");
        if (colors.has("B") && !hasBasicOfColor("B")) basicsToAdd.push(canUseSnow ? "Snow-Covered Swamp" : "Swamp");

        if (basicsToAdd.length > 0) {
            const logMoon = `[JUEZ PRO TOUR] Mazo de 3+ colores vulnerable a Blood Moon. Inyectando tierras básicas CRÍTICAs: ${basicsToAdd.join(', ')}.`;
            console.log(logMoon);
            if (addLog) addLog(logMoon);

            basicsToAdd.forEach(basicName => {
                const duals = cards.filter(c => c && c.category === 'Land' && c.name && typeof c.name === 'string' && !isColoredBasicLand(c.name) && c.quantity > 1);
                if (duals.length > 0) {
                    duals[0].quantity -= 1;
                    cards = inyectarCartaDirecta(cards, { name: basicName, quantity: 1, category: "Land", cmc: 0 });
                }
            });
            cards = cards.filter(c => c.quantity > 0);
        }
    }

    const obtenerColorDeCarta = (cardName) => {
        if (!cardName) return null;
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
        if (!cardName) return [];
        const fromPool = ragPool.find(c => c && typeof c.name === 'string' && c.name.toLowerCase() === cardName.toLowerCase());
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

    if (!preserveSpells) {
    const logMsg = `[JUEZ FINAL] Iniciando auditoría bajo 12 Dimensiones Pro Tour.`;
    console.log(logMsg);
    if (addLog) addLog(logMsg);

    // 0.5. Reemplazar cualquier carta de reanimación Legacy no permitida en Modern de forma DINÁMICA
    const reanimateLegacyNames = ["animate dead", "exhume", "reanimate", "necromancy", "dance of the dead", "dread return"];
    cards = cards.map(c => {
        if (c && typeof c.name === 'string' && reanimateLegacyNames.includes(c.name.toLowerCase())) {
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

    // D. FAIL-SAFE: GARANTIZAR COMPONENTES DE REANIMACIÓN
    if (strategyId === 'reanimator') {
        const reanimateKeywords = [
            "persist", "unburial rites", "priest of fell rites", "late to dinner", 
            "goryo's vengeance", "vigor mortis", "animate dead", "exhume", "reanimate", 
            "necromancy", "dread return", "rescue from the underworld", "rise from the grave"
        ];
        const hasReanimateSpells = cards.some(c => c && typeof c.name === 'string' && (
            reanimateKeywords.includes(c.name.toLowerCase()) || 
            (c.oracle_text && c.oracle_text.toLowerCase().includes("return target creature card from your graveyard to the battlefield"))
        ));

        if (!hasReanimateSpells) {
            const dynamicReanimator = getDynamicModernReanimateSpell();
            const logReanimate = `[JUEZ PRO TOUR] Mazo Reanimator detectado sin ningún hechizo de reanimación. Inyectando 4 copias de "${dynamicReanimator.name}".`;
            console.log(logReanimate);
            if (addLog) addLog(logReanimate);

            // Inyectar 4 copias del reanimador
            cards = inyectarCartaDirecta(cards, { 
                name: dynamicReanimator.name, 
                quantity: 4, 
                category: dynamicReanimator.category, 
                cmc: dynamicReanimator.cmc, 
                role: "reanimation_spells" 
            });

            // Equilibrar el mazo reduciendo 4 copias de hechizos genéricos que no sean tierras, finishers ni protegidos
            let removedQty = 0;
            const candidates = cards.filter(c => 
                c.category !== 'Land' && 
                c.name !== dynamicReanimator.name &&
                !(c.category === 'Creature' && c.cmc >= 6) &&
                !esRolProtegido(c.role) && 
                c.quantity > 1
            );

            for (let cand of candidates) {
                if (removedQty >= 4) break;
                const take = Math.min(cand.quantity - 1, 4 - removedQty);
                cand.quantity -= take;
                removedQty += take;
            }

            // Si aún no hemos liberado los 4 slots, quitamos singletons genéricos
            if (removedQty < 4) {
                const singletons = cards.filter(c => 
                    c.category !== 'Land' && 
                    c.name !== dynamicReanimator.name &&
                    !(c.category === 'Creature' && c.cmc >= 6) &&
                    !esRolProtegido(c.role)
                );
                for (let sing of singletons) {
                    if (removedQty >= 4) break;
                    sing.quantity = 0;
                    removedQty += 1;
                }
            }
            cards = cards.filter(c => c.quantity > 0);
        }
    }

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

        const getCardColorsReal = (cardName) => {
            if (!cardName) return [];
            const fromPool = ragPool.find(p => p && typeof p.name === 'string' && p.name.toLowerCase() === cardName.toLowerCase());
            if (fromPool && fromPool.colors) {
                return fromPool.colors;
            }
            const dbCard = cachedAllCards.find(ac => ac && ac.name && ac.name.toLowerCase() === cardName.toLowerCase());
            if (dbCard && dbCard.colors) {
                return dbCard.colors;
            }
            const guessed = obtenerColorDeCarta(cardName);
            return guessed ? [guessed] : [];
        };

        cards = cards.map(c => {
            if (c.category === 'Land') return c;

            // Determinar colores buscando en RAG y DB
            const cardColors = getCardColorsReal(c.name);
            const isColorless = cardColors.length === 0;
            
            // Si la carta tiene colores, verificar que todos estén en allowed colors
            const hasOffColor = !isColorless && cardColors.some(col => !colors.has(col));
            
            // Comprobar si la carta es real y legal en el formato seleccionado
            const isRealAndLegal = isCardFormatLegal(c.name);
            
            // Es inválida si tiene colores fuera del mazo o si no es una carta real legal
            const isInvalid = hasOffColor || !isRealAndLegal;

            if (isInvalid) {
                const isCreature = c.category === 'Creature';
                
                // Buscar reemplazo en el RAG pool que coincida con el tipo (Criatura/Hechizo) y NO sea Emeritus
                const replacementPool = ragPool.filter(poolCard => {
                    const poolCardIsCreature = (poolCard.type_line || '').toLowerCase().includes('creature');
                    const isEmeritus = poolCard && typeof poolCard.name === 'string' && poolCard.name.toLowerCase().includes('emeritus');
                    
                    if (isEmeritus) return false;
                    
                    let tribalMatchValid = true;
                    if (isCreature && poolCardIsCreature && hasTribe) {
                        const typeLower = (poolCard.type_line || '').toLowerCase();
                        const activeTribalSubtypes = MTG_TRIBES.find(t => t.id === tribeId)?.subtypes || [];
                        tribalMatchValid = activeTribalSubtypes.some(sub => typeLower.includes(sub));
                    }

                    return poolCardIsCreature === isCreature && 
                           poolCard && typeof poolCard.name === 'string' && poolCard.name.toLowerCase() !== c.name.toLowerCase() && 
                           tribalMatchValid;
                });
                
                // Filtrar el replacementPool para asegurar que sea compatible de color y legal en el formato
                const validReplacements = replacementPool.filter(poolCard => {
                    const cardColors = poolCard.colors || [];
                    const isColorCompatible = cardColors.length === 0 || cardColors.every(col => colors.has(col));
                    if (!isColorCompatible) return false;
                    
                    const isLegal = checkCardFormatLegality(poolCard.name, formData?.format || 'MODERN', !!formData?.allowCustomCards);
                    if (!isLegal) return false;
                    
                    return true;
                });
                
                // Ordenar por funcionalidad, cercanía de CMC y score RAG
                validReplacements.sort((a, b) => {
                    const scoreA = getFunctionalScore(a, c.role, c.name);
                    const scoreB = getFunctionalScore(b, c.role, c.name);
                    if (scoreA !== scoreB) return scoreB - scoreA;
                    
                    const diffA = Math.abs((a.mana_value || 0) - c.cmc);
                    const diffB = Math.abs((b.mana_value || 0) - c.cmc);
                    if (diffA !== diffB) return diffA - diffB;
                    
                    return (b.score || 0) - (a.score || 0);
                });
                
                let replacementName = "";
                let repCmc = c.cmc;
                let repCat = c.category;
                
                if (validReplacements.length > 0) {
                    const repCard = validReplacements[0];
                    replacementName = repCard.name;
                    repCmc = repCard.mana_value || c.cmc;
                    repCat = repCard.type_line ? repCard.type_line.split('—')[0].trim() : c.category;
                } else {
                    // Fallbacks directos si el pool RAG está vacío o no coincide
                    const rep = obtenerMejorCartaDeRemplazo(isCreature ? "Creature" : "Instant", c.cmc, Array.from(colors), formData?.format, [], [c.name], cachedAllCards, c.name, c.role);
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

        // 0.7.1 EQUIDAD DE COLOR MULTICOLOR (DIVERSIDAD OBLIGATORIA SI HAY MÁS DE 1 COLOR)
        if (colors.size > 1) {
            const targetColors = Array.from(colors);
            const spellCards = cards.filter(c => c.category !== 'Land');
            
            // Contar la presencia de colores en los hechizos no-tierra
            const colorCounts = {};
            targetColors.forEach(col => { colorCounts[col] = 0; });
            
            spellCards.forEach(c => {
                const cardCols = getCardColorsReal(c.name);
                cardCols.forEach(col => {
                    if (colorCounts[col] !== undefined) colorCounts[col]++;
                });
            });
            
            // Verificar si algún color requerido tiene 0 presencia
            const missingColors = targetColors.filter(col => colorCounts[col] === 0);
            
            if (missingColors.length > 0) {
                const logMsgDiv = `⚠️ [JUEZ COLOR DIVERSIDAD] Mazo requiere colores [${targetColors.join(", ")}], pero el color [${missingColors.join(", ")}] tiene 0 cartas en los hechizos. Iniciando inyección de balance de color...`;
                console.warn(logMsgDiv);
                if (addLog) addLog(logMsgDiv);

                missingColors.forEach(missingCol => {
                    let swapped = 0;
                    const maxSwaps = 4;

                    for (let i = cards.length - 1; i >= 0 && swapped < maxSwaps; i--) {
                        const targetCard = cards[i];
                        if (targetCard.category === 'Land') continue;

                        const targetCols = getCardColorsReal(targetCard.name);
                        const targetRole = targetCard.role || 'utility';

                        if (targetCols.length === 1 && colorCounts[targetCols[0]] > 6) {
                            const replacement = obtenerMejorCartaDeRemplazo(
                                targetCard.category,
                                targetCard.cmc,
                                [missingCol],
                                formData?.format,
                                ragPool,
                                [targetCard.name],
                                cachedAllCards,
                                targetCard.name,
                                targetRole
                            );

                            if (replacement && replacement.name) {
                                const repCmc = replacement.cmc || targetCard.cmc;
                                const repCat = replacement.category || targetCard.category;

                                const swapLog = `🎨 [JUEZ COLOR DIVERSIDAD] Reemplazando "${targetCard.name}" por "${replacement.name}" (${repCat}, CMC ${repCmc}, Rol: ${targetRole}) para asegurar presencia del color [${missingCol}].`;
                                console.log(swapLog);
                                if (addLog) addLog(swapLog);

                                cards[i] = {
                                    ...targetCard,
                                    name: replacement.name,
                                    cmc: repCmc,
                                    category: repCat,
                                    role: targetRole
                                };
                                colorCounts[targetCols[0]]--;
                                colorCounts[missingCol] = (colorCounts[missingCol] || 0) + 1;
                                swapped++;
                            }
                        }
                    }
                });
            }
        }
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
        
        const logTribalStart = `🛡️ [JUEZ TRIBAL] Iniciando auditoría tribal. Nivel de pureza dinámico: ${purityLevel.toUpperCase()}`;
        console.log(logTribalStart);
        if (addLog) addLog(logTribalStart);

        cards = cards.map(c => {
            if (c.category !== 'Creature') return c; // Solo validamos criaturas
            
            const poolCard = ragPool.find(p => p && typeof p.name === 'string' && p.name.toLowerCase() === c.name.toLowerCase());
            let typeLine = poolCard && poolCard.type_line ? poolCard.type_line.toLowerCase() : (c.type_line || c.type || '').toLowerCase();
            let oracleText = poolCard && poolCard.oracle_text ? poolCard.oracle_text.toLowerCase() : (c.oracle_text || c.text || '').toLowerCase();
            
            // Alucinación o carta no indexada
            if (!poolCard && !c.isMustInclude && !c.isCore) {
                // Solo forzamos evaluación no-tribal si no es un Must-Include del usuario
                typeLine = ''; 
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
                    const pIsEmeritus = pCard && typeof pCard.name === 'string' && pCard.name.toLowerCase().includes('emeritus');
                    
                    // Asegurarnos de que el reemplazo comparte al menos un color con la original (o la original es incolora)
                    const pColors = pCard.colors || [];
                    const matchesColor = cardColors.length === 0 || cardColors.some(col => pColors.includes(col)) || pColors.length === 0;

                    return isPCreature && hasPSubtype && !pIsEmeritus && pCard && typeof pCard.name === 'string' && pCard.name.toLowerCase() !== c.name.toLowerCase() && matchesColor;
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
            
            // Omitir regla si hay soporte de Scam o Blink (al menos 3 copias en el mazo)
            const scamOrBlinkSpells = ["not dead after all", "feign death", "undying malice", "ephemerate", "malakir rebirth", "supernatural stamina", "undying evil", "touch the spirit realm", "slip out the back", "cloudshift", "justiciar's portal"];
            const scamBlinkCount = cards.filter(s => s && s.name && scamOrBlinkSpells.includes(s.name.toLowerCase())).reduce((sum, s) => sum + s.quantity, 0);
            const hasScamBlinkSupport = scamBlinkCount >= 3;
            
            const isMulticolor3Plus = colors.size >= 3;
            const minRequiredPitchSources = hasScamBlinkSupport ? 0 : (isMulticolor3Plus ? 11 : 14);

            if (otherCount < minRequiredPitchSources) {
                const isCascade = strategyId && (strategyId.toLowerCase() === 'cascade' || strategyId.toLowerCase() === 'living end' || strategyId.toLowerCase().includes('cascade'));
                if (isCascade) {
                    const logMsgK = `[DIMENSIÓN K] Evoke Pitch Deficit Bypass: "${c.name}" no se transmuta porque la estrategia Cascade prohíbe cartas de CMC 1.`;
                    console.log(logMsgK);
                    if (addLog) addLog(logMsgK);
                    return c;
                }
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
                "archon of cruelty", "atraxa", "griselbrand", "primeval titan", "wurmcoil engine", "ulamog", "kozilek", "emrakul", "force of will", "force of negation",
                "allosaurus rider"
            ];
            const isCheatable = cheatableKeywords.some(kw => nameLower.includes(kw)) ||
                (strategyId === 'reanimator') ||
                (strategyId === 'graveyard') ||
                (strategyId === 'toolbox') ||
                (strategyId === 'tron') ||
                (strategyId === 'ramp' && c.cmc >= 6) ||
                (c.role && (c.role.includes("finisher") || c.role.includes("win_con") || c.role.includes("top_end") || c.role.includes("combo"))) ||
                (isControl && (c.category === 'Creature' || c.category === 'Planeswalker')); // Control legitima criaturas y planeswalkers CMC>=5 como finishers

            if (!isCheatable) {
                const isCascade = strategyId && (strategyId.toLowerCase() === 'cascade' || strategyId.toLowerCase() === 'living end' || strategyId.toLowerCase().includes('cascade'));
                const primaryColor = getCardColorFromPool(c.name)[0] || "B";
                const targetCmc = isCascade ? 3 : 1;
                const rep = obtenerMejorCartaDeRemplazo("Instant", targetCmc, [primaryColor], formData?.format, ragPool, [c.name]);
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
        const name = (c.name || '').toLowerCase();
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
    // Tolerancia dinámica (+/- 15%) para respetar la visión de la IA y permitir sinergias específicas
    if (Math.abs(diffB) > 0.15) {
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
        const logMsgC = `[DIMENSIÓN C] Velocity Bypass: Mazo Cascade detectado. Evitando INYECCIÓN de cantrips de coste 1.`;
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

            const logMsgD = `[DIMENSIÓN D] Plan B Resiliency: Mazo combo/lineal requiere PROTECCIÓN. Inyectando 4x "${protName}" para contrarrestar hate.`;
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
                const isBasic = isBasicLand(c.name);
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
                const allowedNames = BASIC_LANDS_BY_COLOR[l.color] || [];
                const basicLandIdx = cards.findIndex(c => c.category === 'Land' && allowedNames.includes(c.name.toLowerCase()) && c.quantity > 1);
                if (basicLandIdx !== -1) {
                    const basicName = cards[basicLandIdx].name;
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
        const basicLands = cards.filter(c => c.category === 'Land' && isColoredBasicLand(c.name));
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
    const isTronDeck = strategyId === 'tron' || (formData?.archetype || '').toLowerCase().includes("tron") || (formData?.arquetipo || '').toLowerCase().includes("tron");
    if (isTronDeck) {
        const urzaLands = ["Urza's Tower", "Urza's Power Plant", "Urza's Mine"];
        let injectedUrza = 0;
        urzaLands.forEach(uName => {
            const existing = cards.find(c => c && typeof c.name === 'string' && c.name.toLowerCase() === uName.toLowerCase());
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
            let otherLands = cards.filter(c => c && c.category === 'Land' && typeof c.name === 'string' && !urzaLands.map(u => u.toLowerCase()).includes(c.name.toLowerCase()));
            let removed = 0;
            for (let l of otherLands) {
                if (removed >= injectedUrza) break;
                const take = Math.min(l.quantity, injectedUrza - removed);
                l.quantity -= take;
                removed += take;
            }
            cards = cards.filter(c => c.quantity > 0);
            
            const logMsgTron = `[JUEZ TRON] EXCEPCIÓN Tron: Forzando 12 Urza Lands. Reemplazadas ${injectedUrza} tierras genéricas para hacer espacio.`;
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
        const hasNonCreature = cards.filter(c => c && c.category && typeof c.category === 'string' && c.category !== 'Land' && !(c.category || '').toLowerCase().includes('creature')).some(c => {
            const colorsSp = getCardColorFromPool(c?.name);
            return colorsSp.includes(col);
        });

        return cards.filter(c => c && c.category === 'Land').reduce((sum, land) => {
            const landName = land?.name || '';
            const produces = getLandColors(landName);
            if (produces.includes(col)) {
                // Si la tierra es tribal (Cavern of Souls, Secluded Courtyard, Unclaimed Territory)
                // y el mazo tiene hechizos no-criatura de ese color, no cuenta como fuente coloreada para ese color
                const landNameLower = landName.toLowerCase();
                const isTribalLand = ["cavern of souls", "secluded courtyard", "unclaimed territory"].some(tl => landNameLower.includes(tl));
                if (isTribalLand && hasNonCreature) {
                    return sum; // No cuenta como fuente de color normal
                }
                return sum + (land.quantity || 0);
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
                            const otherAllowed = BASIC_LANDS_BY_COLOR[other] || [];
                            const otherBasicLand = cards.find(c => c.category === 'Land' && otherAllowed.includes(c.name.toLowerCase()) && c.quantity > qtyToConvert);
                            if (otherBasicLand) {
                                const otherBasicName = otherBasicLand.name;
                                const isSnow = otherBasicName.toLowerCase().startsWith("snow-covered") || otherBasicName.toLowerCase().includes("nevada");
                                
                                let colBasicName = "Island";
                                if (col === "W") colBasicName = isSnow ? "Snow-Covered Plains" : "Plains";
                                else if (col === "B") colBasicName = isSnow ? "Snow-Covered Swamp" : "Swamp";
                                else if (col === "R") colBasicName = isSnow ? "Snow-Covered Mountain" : "Mountain";
                                else if (col === "G") colBasicName = isSnow ? "Snow-Covered Forest" : "Forest";
                                else if (col === "U") colBasicName = isSnow ? "Snow-Covered Island" : "Island";

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
    } // End of if (!preserveSpells)

    // === DIMENSIÓN J: SIDEBOARD EXCELLENCE ===
    const isStandard = (formData?.format || '').toUpperCase() === 'STANDARD';
    const activeRarityMode = formData?.rarityMode || 'high-power';

    let sideboardHatePool;
    let genericCandidates;

    if (activeRarityMode === 'pauper') {
        sideboardHatePool = {
            "W": ["Dawnbringer Cleric", "Loran's Escape", "Prismatic Strands", "Standard Bearer", "Destroy Evil"],
            "U": ["Spell Stutter", "Negate", "Dispel", "Essence Scatter", "Vapor Snag"],
            "B": ["Duress", "Feed the Swarm", "Nihil Spellbomb", "Tragic Slip", "Toxin Analysis"],
            "R": ["Shock", "Fiery Impulse", "Smash to Smithereens", "End the Festivities", "Cast into the Fire"],
            "G": ["Naturalize", "Return to Nature", "Nature's Claim", "Weather the Storm", "Life Goes On"]
        };
        genericCandidates = ["Nihil Spellbomb", "Honored Heirloom", "Jack-o'-Lantern"];
    } else if (activeRarityMode === 'artisan') {
        sideboardHatePool = {
            "W": ["Fragment Reality", "Loran's Escape", "Cast Out", "Path to Exile", "Destroy Evil"],
            "U": ["Spell Pierce", "Aether Gust", "Mystical Dispute", "Negate", "Dispel"],
            "B": ["Duress", "Fatal Push", "Cling to Dust", "Feed the Swarm", "Cast Down"],
            "R": ["Abrade", "Lithomantic Barrage", "Smash to Smithereens", "End the Festivities", "Cast into the Fire"],
            "G": ["Veil of Summer", "Haywire Mite", "Return to Nature", "Reclamation Sage", "Nihil Spellbomb"]
        };
        genericCandidates = ["Nihil Spellbomb", "Damping Sphere", "Honored Heirloom", "Jack-o'-Lantern"];
    } else {
        sideboardHatePool = isStandard ? {
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
        genericCandidates = isStandard ? 
            ["Soul-Guide Lantern", "Pithing Needle", "The Stone Brain", "Unlicensed Hearse", "Urabrask's Forge"] :
            ["Relic of Progenitus", "Damping Sphere", "Pithing Needle", "Tormod's Crypt", "Surgical Extraction", "Engineered Explosives", "Chalice of the Void"];
    }

    let sideCandidates = [];
    colors.forEach(col => {
        if (sideboardHatePool[col]) {
            sideboardHatePool[col].forEach(name => sideCandidates.push(name));
        }
    });

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
            "surgical extraction": 1, "engineered explosives": 0, "chalice of the void": 0,
            // pauper & artisan additions
            "dawnringer cleric": 2, "dust to dust": 3, "prismatic strands": 3, "standard bearer": 2,
            "fragment reality": 1, "loran's escape": 1, "cast out": 4, "blue elemental blast": 1,
            "hydroblast": 1, "spell stutter": 2, "dispel": 1, "cast down": 2, "nihil spellbomb": 1,
            "chainer's edict": 2, "toxin analysis": 1, "cling to dust": 1, "feed the swarm": 2,
            "red elemental blast": 1, "pyroblast": 1, "cast into the fire": 2, "abrade": 2,
            "gleeful demolition": 1, "nature's claim": 1, "weather the storm": 2, "deglamer": 2,
            "return to nature": 2, "reclamation sage": 3
        };

        // Categories
        const enchantments = ["rest in peace", "stony silence", "leyline of the void", "blood moon", "alpine moon", "roiling vortex", "temporary lockdown", "cast out"];
        const creatures = ["loran of the third path", "tishana's tidebinder", "graveyard trespasser", "tranquil frillback", "obstinate baloth", "haywire mite", "collector ouphe", "esper sentinel", "ragavan, nimble pilferer", "orcish bowmasters", "tarmogoyf", "delver of secrets", "steel overseer", "dawnringer cleric", "standard bearer", "spell stutter", "reclamation sage"];
        const sorceries = ["thoughtseize", "collective brutality", "glistening deluge", "lithomantic barrage", "brotherhood's end", "end the festivities", "pick your poison", "prismatic ending", "preordain", "dust to dust", "chainer's edict", "feed the swarm", "gleeful demolition"];
        const artifacts = ["relic of progenitus", "damping sphere", "pithing needle", "tormod's crypt", "surgical extraction", "engineered explosives", "chalice of the void", "soul-guide lantern", "the stone brain", "unlicensed hearse", "urabrask's forge", "nihil spellbomb"];
        
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
        const commonDualMap = {
            'UW': 'Tranquil Cove', 'BW': 'Scoured Barrens', 'RW': 'Wind-Scarred Crag', 'GW': 'Blossoming Sands',
            'BU': 'Dismal Backwater', 'RU': 'Swiftwater Cliffs', 'GU': 'Thornwood Falls', 'BR': 'Bloodfell Caves',
            'BG': 'Jungle Hollow', 'GR': 'Rugged Highlands'
        };
        const mainColors = Array.from(colors).filter(c => !orphanColors.includes(c) && c !== 'C' && c !== '');
        const mainColor = mainColors.length > 0 ? mainColors[0] : 'W';
        
        orphanColors.forEach(col => {
            if (sideCount >= 13) return; // Dejar espacio para al menos algunas cartas de odio
            const pairKey = [mainColor, col].sort().join('');
            const landName = (activeRarityMode === 'pauper' || activeRarityMode === 'artisan')
                ? (commonDualMap[pairKey] || "Terramorphic Expanse")
                : (shockMap[pairKey] || "City of Brass");
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
    // Inyectar tierras situacionales para cambiar la textura de la base de MANÁ contra Aggro o Control
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
        let antiControlLand;
        if (activeRarityMode === 'pauper' || activeRarityMode === 'artisan') {
            antiControlLand = 
                (pColor === 'W') ? "Secluded Steppe" :
                (pColor === 'U') ? "Lonely Sandbar" :
                (pColor === 'B') ? "Polluted Mire" :
                (pColor === 'R') ? "Forgotten Cave" :
                (pColor === 'G') ? "Tranquil Thicket" : "Ash Barrens";
        } else if (isStandard) {
            antiControlLand = 
                (pColor === 'W') ? "Eiganjo, Seat of the Empire" :
                (pColor === 'U') ? "Otawara, Soaring City" :
                (pColor === 'B') ? "Takenuma, Abandoned Mire" :
                (pColor === 'R') ? "Sokenzan, Crucible of Defiance" :
                (pColor === 'G') ? "Boseiju, Who Endures" : "Mirrex";
        } else {
            antiControlLand = 
                (pColor === 'W') ? "Castle Ardenvale" :
                (pColor === 'U') ? "Castle Vantress" :
                (pColor === 'B') ? "Castle Locthwain" :
                (pColor === 'R') ? "Den of the Bugbear" :
                (pColor === 'G') ? "Lair of the Hydra" : "Mutavault";
        }
        
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
    const uniqueCandidates = [...new Set(sideCandidates)];
    const blockSizes = [3, 3, 2, 2, 2, 2, 1];
    let blockIdx = 0;

    while (sideCount < 15 && candIdx < uniqueCandidates.length) {
        const cardName = uniqueCandidates[candIdx];
        candIdx++;

        if (sideboard.some(c => c.name.toLowerCase() === cardName.toLowerCase())) {
            continue;
        }

        const details = getSideboardCardDetails(cardName);
        const desiredQty = blockSizes[blockIdx % blockSizes.length];
        blockIdx++;

        const qtyToAdd = Math.min(desiredQty, 15 - sideCount);
        if (qtyToAdd > 0) {
            sideboard.push({
                name: cardName,
                quantity: qtyToAdd,
                category: details.category,
                cmc: details.cmc
            });
            sideCount += qtyToAdd;
        }
    }

    let failsafeProtect = 0;
    while (sideCount < 15 && failsafeProtect < 100) {
        failsafeProtect++;
        for (let item of sideboard) {
            if (sideCount >= 15) break;
            if (item.category !== 'Land' && item.quantity < 3) {
                item.quantity++;
                sideCount++;
            }
        }
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
            const isBasic = isBasicLand(c.name);
            existing.quantity = isBasic ? (existing.quantity + c.quantity) : Math.min(4, existing.quantity + c.quantity);
        } else {
            uniqueCards.push(c);
        }
    });
    cards = uniqueCards;
    return { cards, sideboard, sideboard_strategy };
}

const CRITICAL_SYNERGY_RULES = {
  cascade: {
    name: "Cascade (Rhinos / Living End)",
    rules: [
      "CRÍTICO: NO DEBES incluir NINGÚN hechizo (instantáneo, conjuro, criatura, artefacto, etc.) con coste de MANÁ 1 o 2 en TODO el mazo principal. Si lo haces, la mecánica de Cascada fallará miserablemente.",
      "Para la interacción temprana, usa EXCLUSIVAMENTE hechizos gratuitos (Force of Negation, Subtlety, Endurance, Force of Vigor) o cartas dobles (Fire // Ice, Dead // Gone) cuyo coste combinado sea 3 o mayor.",
      "Debes incluir hechizos con la habilidad de Cascada de coste 3 (Shardless Agent, Ardent Plea, Violent Outburst, Bloodbraid Marauder).",
      "Debes incluir tu objetivo de coste 0 (Crashing Footfalls, Living End, Glimpse of Tomorrow)."
    ]
  },
  storm: {
    name: "Storm Combo",
    rules: [
      "CRÍTICO: El mazo NO FUNCIONA sin motores de MANÁ inmensos y hechizos de reducción. Debes incluir rituales (Desperate Ritual, Pyretic Ritual, Manamorphose, Rite of Flame) y reductores (Ruby Medallion, Ral, Monsoon Mage, Baral).",
      "NUNCA incluyas grandes criaturas que cuesten MANÁ de color múltiple. Tu condición de victoria DEBE ser Grapeshot, Empty the Warrens, o Tendrils of Agony.",
      "El mazo debe estar compuesto principalmente de cantrips de coste 1 (Consider, Opt, Serum Visions) y rituales."
    ]
  },
  creativity: {
    name: "Indomitable Creativity",
    rules: [
      "CRÍTICO: Indomitable Creativity busca criaturas o artefactos. NUNCA incluyas criaturas o artefactos de bajo coste (como Llanowar Elves o Moxen), ya que arruinarán el combo.",
      "Las ÚNICAS criaturas del mazo deben ser finalizadores masivos y letales (Archon of Cruelty, Emrakul, Primeval Titan).",
      "Para generar objetivos sacrificables para Creativity, usa EXCLUSIVAMENTE Conjuros, Instantáneos o Tierras que generen fichas (Dwarven Mine, Hard Evidence, Fable of the Mirror-Breaker, Strike It Rich)."
    ]
  },
  amulet_titan: {
    name: "Amulet Titan",
    rules: [
      "CRÍTICO: El mazo REQUIERE Amulet of Vigor y Primeval Titan. Son las piezas innegociables del combo.",
      "CRÍTICO: La base de MANÁ DEBE basarse en Bouncelands (Tierras que rebotan, como Simic Growth Chamber, Gruul Turf). No hagas un ramp verde estándar.",
      "Debes incluir buscadores específicos (Summoner's Pact, Tolaria West) y tierras de utilidad masiva (Urza's Saga, Vesuva)."
    ]
  },
  deaths_shadow: {
    name: "Death's Shadow",
    rules: [
      "CRÍTICO: Tu objetivo es perder vida rápida y deliberadamente. NUNCA incluyas hechizos de ganancia de vida.",
      "DEBES incluir cartas que te dañen a ti mismo: Shocklands, Fetchlands, Street Wraith, Thoughtseize, Dismember.",
      "Tus criaturas deben aprovechar la baja vida (Death's Shadow, Scourge of the Skyclaves) apoyadas por criaturas agresivas eficientes (Murktide Regent, Ragavan) e interrupciones (Grief, Fatal Push, Stubborn Denial)."
    ]
  },
  prison: {
    name: "Prison / Taxes",
    rules: [
      "CRÍTICO: Tu objetivo es bloquear el juego en los turnos 1-2. DEBES incluir piezas asimétricas de Stax (Chalice of the Void, Blood Moon, Ensnaring Bridge, Trinisphere).",
      "Si construyes Taxes (Blanco), incluye Thalia, Guardian of Thraben, Leonin Arbiter, y Ghost Quarter/Tectonic Edge. No abuses de hechizos no-criatura si llevas Thalia.",
      "Si llevas Ensnaring Bridge, asegúrate de poder vaciar tu mano rápido. Usa aceleradores gratuitos (Simian Spirit Guide)."
    ]
  },
  scam: {
    name: "Rakdos Scam",
    rules: [
      "CRÍTICO: El núcleo del mazo es forzar el descarte en turno 1. DEBES incluir Elementales con Evoke (Grief, Fury) u Orcish Bowmasters.",
      "CRÍTICO: Debes acompañar los elementales con 'Scam spells' de coste 1 (Not Dead After All, Feign Death, Undying Malice, Ephemerate).",
      "El resto del mazo debe ser disrupción eficiente (Thoughtseize, Fatal Push) y valor (Fable of the Mirror-Breaker)."
    ]
  },
  affinity: {
    name: "Affinity / Artifacts",
    rules: [
      "CRÍTICO: El mazo requiere una densidad abrumadora de artefactos. El 80% del mazo principal deben ser artefactos.",
      "Incluye masivamente artefactos de coste 0-1 (Mox Opal, Ornithopter, Memnite, Shadowspear, Springleaf Drum).",
      "Incluye potentes payoffs por tener artefactos (Cranial Plating, Urza's Saga, Kappa Cannoneer, Thought Monitor)."
    ]
  },
    aristocrats: {
      name: "Aristocrats (Sacrifice)",
      rules: [
        "CRÍTICO: DEBES incluir un mínimo de 6-8 motores de sacrificio gratuitos (Sacrifice Outlets) de coste 1 o 2 (ej: Carrion Feeder, Viscera Seer, Woe Strider).",
        "DEBES incluir 8-10 generadores de fichas eficientes o criaturas recurrentes ('Fodder').",
        "DEBES incluir 4-6 efectos de drenaje al morir (Death Triggers como Blood Artist o Zulaport Cutthroat)."
      ]
    },
    tokens: {
      name: "Tokens (Go-Wide)",
      rules: [
        "CRÍTICO: Prioriza hechizos o criaturas que creen múltiples fichas por una sola carta (Lingering Souls, Spectral Procession).",
        "DEBES incluir 'Anthems' o 'Lords' (cartas que den +1/+1 a todas tus criaturas) para transformar fichas débiles en amenazas letales."
      ]
    },
    blink: {
      name: "Blink (Flicker)",
      rules: [
        "CRÍTICO: El 90% de tus criaturas DEBEN tener poderosas habilidades de 'Entra al campo de batalla' (ETB).",
        "DEBES incluir 6-8 hechizos o criaturas que exilien y devuelvan criaturas a la mesa (Ephemerate, Soulherder) para abusar de los ETB."
      ]
    },
    enchantress: {
      name: "Enchantress",
      rules: [
        "CRÍTICO: El mazo debe ser al menos 40% Encantamientos.",
        "DEBES incluir motores de robo basados en encantamientos (Argothian Enchantress, Sythis, Enchantress's Presence).",
        "Minimiza los instantáneos y conjuros; usa encantamientos como remoción (Oblivion Ring, Journey to Nowhere)."
      ]
    },
    landfall: {
      name: "Landfall",
      rules: [
        "CRÍTICO: DEBES incluir criaturas o encantamientos con la habilidad de Landfall que generen un impacto masivo en mesa.",
        "DEBES incluir hechizos o tierras que permitan jugar múltiples tierras por turno o buscar tierras (Fetchlands, Explore, Azusa)."
      ]
    },
    graveyard: {
      name: "Graveyard (Dredge / Self-Mill)",
      rules: [
        "CRÍTICO: DEBES incluir facilitadores para enviar tus propias cartas al cementerio rápidamente (Stitcher's Supplier, Hedron Crab o mecÚNICAS de Dredge).",
        "DEBES incluir cartas que se beneficien pasivamente o regresen del cementerio al campo (Bloodghast, Prized Amalgam). NO dependas de castear criaturas de forma normal."
      ]
    },
    lifegain: {
      name: "Lifegain",
      rules: [
        "CRÍTICO: DEBES incluir múltiples fuentes de ganancia de vida pasiva que se disparen con poco esfuerzo (Soul Warden, Authority of the Consuls).",
        "DEBES tener recompensas masivas (Payoffs) que crezcan o ganen la partida al ganar vida (Ajani's Pridemate, Voice of the Blessed, Aetherflux Reservoir)."
      ]
    },
    voltron: {
      name: "Voltron",
      rules: [
        "CRÍTICO: Céntrate en unas pocas (4-8) criaturas base que sean casi inmortales (Hexproof, Indestructible).",
        "Llena el resto del mazo con Auras o Equipos para convertirlas en atacantes letales en 1-2 turnos."
      ]
    },
    vehicles: {
      name: "Vehicles",
      rules: [
        "CRÍTICO: Mantén un balance estricto: necesitas tripulantes (criaturas de bajo coste/alta fuerza) y Vehículos.",
        "No pongas demasiados Vehículos sin criaturas, o no podrás pilotarlos."
      ]
    },
    toolbox: {
      name: "Toolbox",
      rules: [
        "CRÍTICO: DEBES incluir tutores de criaturas directos al campo de batalla (Chord of Calling, Eldritch Evolution).",
        "El mazo DEBE contener criaturas de '1 copia' (Silver bullets) para resolver situaciones ESPECÍFICAS (destruir artefactos, exiliar cementerios)."
      ]
    },
    affinity: {
      name: "Affinity / Artifacts",
      rules: [
        "CRÍTICO: El mazo DEBE ser casi en su totalidad Artefactos, incluyendo las Tierras (Artifact Lands si el formato lo permite).",
        "Aprovecha cartas con la mecánica Afinidad o habilidades de coste reducido por artefactos (Thoughtcast, Cranial Plating)."
      ]
    },
    sea_monsters: {
      name: "Sea Monsters",
      rules: [
        "CRÍTICO: DEBES incluir aceleración masiva (Ramp incoloro o verde) para jugar tus monstruos de coste masivo.",
        "Usa cartas que ralenticen la mesa del oponente (Whelming Wave, remoción masiva) para sobrevivir los primeros turnos."
      ]
    }
    , tribal_lords: {
    name: "Tribal Lords",
    rules: [
      "CRÍTICO: Si el mazo es Tribal (Elfos, Tritones, Trasgos, Humanos, Espíritus), el 80% de tus criaturas DEBEN ser de ese tipo exacto.",
      "Incluye innegociablemente a los 'Lords' que potencian al resto (ej. Lord of Atlantis, Elvish Archdruid, Goblin Chieftain, Supreme Phantom).",
      "Utiliza piezas de soporte tribal incoloras de máximo nivel como Cavern of Souls y Aether Vial."
    ]
  },
  reanimator: {
    name: "Reanimator",
    rules: [
      "CRÍTICO: Para que la reanimación funcione, DEBES incluir descartadores o looters eficientes en los turnos 1-2 (Faithless Looting, Cathartic Reunion, Stitcher's Supplier, Careful Study).",
      "Usa hechizos de reanimación poderosos (Persist, Exhume, Goryo's Vengeance, Animate Dead, Unburial Rites) apuntando a criaturas legendarias o gigantes que ganen la partida solas (Atraxa, Griselbrand, Archon of Cruelty)."
    ]
  },
  yawgmoth: {
    name: "Yawgmoth Combo",
    rules: [
      "CRÍTICO: Este es un combo basado en criaturas. Necesitas criaturas con Undying (Young Wolf, Strangleroot Geist, Geralf's Messenger).",
      "Necesitas al motor (Yawgmoth, Thran Physician) y un payoff de drenaje (Blood Artist, Zulaport Cutthroat).",
      "Utiliza buscadores de criaturas (Chord of Calling, Eldritch Evolution) para encontrar las piezas rápido."
    ]
  },
  tron: {
    name: "Big Mana (Urzatron)",
    rules: [
      "CRÍTICO: El mazo debe incluir obligatoriamente el trío de tierras de Urza (Urza's Tower, Urza's Mine, Urza's Power Plant).",
      "DEBES incluir cartas para buscar tierras ESPECÍFICAS temprano (Expedition Map, Sylvan Scrying, Ancient Stirrings).",
      "NO incluyas hechizos con doble coste de color. Usa remoción incolora o verde de bajo coste (Dismember, Oblivion Stone) para llegar vivo al lategame y lanzar finalizadores incoloros gigantes (Karn, Ulamog, Wurmcoil)."
    ]
  },
  spellslinger: {
    name: "Spellslinger (Murktide / Prowess)",
    rules: [
      "Mantén una densidad extrema de instantáneos y conjuros baratos de coste 1-2 (cantrips, daño directo) para alimentar rápidamente el cementerio para Murktide Regent o potenciar las criaturas con Prowess (Monastery Swiftspear, Dragon's Rage Channeler)."
    ]
  },
  burn: {
    name: "Burn Aggro",
    rules: [
      "CRÍTICO: La curva de MANÁ debe ser mínima (principalmente costes 1 y 2).",
      "NUNCA incluyas criaturas lentas. Maximiza los hechizos que hagan daño directo a la cabeza del rival (Lightning Bolt, Lava Spike, Boros Charm, Rift Bolt) y criaturas extremadamente agresivas (Goblin Guide)."
    ]
  },
  blink: {
    name: "Blink / Flicker",
    rules: [
      "Asegúrate de que tus criaturas tengan potentes efectos al entrar al campo de batalla (ETB) como Stonehorn Dignitary, Coiling Oracle, Eternal Witness, Mulldrifter, Solitude.",
      "Usa hechizos eficientes de parpadeo (Ephemerate, Soulherder, Cloudshift, Yorion)."
    ]
  },
  aristocrats: {
    name: "Aristocrats Sacrifice",
    rules: [
      "Mantén un equilibrio estricto de 3 piezas: Generadores de fichas/basura, Motores de sacrificio (Viscera Seer, Carrion Feeder) y Drenadores (Blood Artist, Meathook Massacre)."
    ]
  }
};

function getStrategyMatchKey(normalized) {
  if (normalized.includes('cascade') || normalized.includes('rhinos') || normalized.includes('living end')) return 'cascade';
  if (normalized.includes('storm')) return 'storm';
  if (normalized.includes('creativity')) return 'creativity';
  if (normalized.includes('amulet') || normalized.includes('titan shift') || normalized.includes('valakut')) return 'amulet_titan';
  if (normalized.includes('shadow')) return 'deaths_shadow';
  if (normalized.includes('prison') || normalized.includes('taxes') || normalized.includes('enchantress') || normalized.includes('stax')) return 'prison';
  if (normalized.includes('scam')) return 'scam';
  if (normalized.includes('affinity')) return 'affinity';
  if (normalized.includes('merfolk') || normalized.includes('elves') || normalized.includes('goblins') || normalized.includes('spirits') || normalized.includes('humans') || normalized.includes('faeries') || normalized.includes('soldiers')) return 'tribal_lords';
  if (normalized.includes('reanimator') || normalized.includes('atraxa') || normalized.includes('goryo')) return 'reanimator';
  if (normalized.includes('yawgmoth')) return 'yawgmoth';
  if (normalized.includes('tron')) return 'tron';
  if (normalized.includes('murktide') || normalized.includes('prowess')) return 'spellslinger';
  if (normalized.includes('burn')) return 'burn';
  if (normalized.includes('blink') || normalized.includes('ephemerate')) return 'blink';
  if (normalized.includes('aristocrat')) return 'aristocrats';
  return normalized;
}

function getArchetypePhilosophyPrompt(archetype) {
  const norm = (archetype || '').toLowerCase();
  
  const philosophies = {
    aggro: "Filosofía AGGRO: Busca ganar rápidamente en los primeros 4-5 turnos. Prioriza criaturas de coste 1-2 muy eficientes y daño directo o trucos de combate que empujen letal. Minimiza los costes altos (casi nulos >4) y los hechizos de valor lento.",
    midrange: "Filosofía MIDRANGE: Busca interactuar tempranamente, estabilizar la mesa y luego dominar el juego medio con amenazas muy eficientes que generen un '2-por-1' (ventaja de cartas intrínseca). Mezcla removal eficiente con criaturas resilientes.",
    control: "Filosofía CONTROL: Busca neutralizar el plan del rival mediante contrahechizos, removal y limpiamesas, sobreviviendo hasta el juego largo. Gana mediante ventaja de cartas masiva y unos pocos rematadores letales casi imparables.",
    combo: "Filosofía COMBO: Busca ensamblar una combinación de cartas específica que gane la partida inmediatamente o genere una ventaja inalcanzable. Requiere piezas de combo redundantes, mucha búsqueda (tutores/cantrips) y algo de PROTECCIÓN.",
    tempo: "Filosofía TEMPO: Busca establecer una amenaza barata rápidamente y luego protegerla e interrumpir el desarrollo del oponente con interacción barata (bounces, contrahechizos de coste 1-2) para cruzar la línea de meta antes de que el rival pueda jugar sus cartas potentes.",
    ramp: "Filosofía RAMP: Busca acelerar drásticamente su producción de MANÁ en los primeros turnos (con dorks o hechizos de búsqueda de tierras) para jugar amenazas de coste masivo (6+) mucho antes de lo normal.",
    prison: "Filosofía PRISON / STAX: Busca negar al oponente la posibilidad de jugar el juego. Usa piezas de odio estático (taxing, lock pieces) para asfixiar sus recursos hasta ganar eventualmente por desgaste o abandono."
  };

  for (const [key, desc] of Object.entries(philosophies)) {
    if (norm.includes(key)) {
      return `\n  === ARCHETYPE PHILOSOPHY ===\n  ${desc}\n  ============================\n`;
    }
  }
  
  return "";
}

function getStrategySynergyPrompt(strategyId) {
  const normalized = (strategyId || '').toLowerCase();
  const matchKey = getStrategyMatchKey(normalized);
  const ruleObj = CRITICAL_SYNERGY_RULES[matchKey];
  if (!ruleObj) return "";
  
  return `
=== CRITICAL MECHANICAL SYNERGY RULES FOR ${ruleObj.name.toUpperCase()} ===
${ruleObj.rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}
==========================================================================
`;
}

function performMechanicalAuditory(deckSpells, strategyId) {
  const normalized = (strategyId || '').toLowerCase();
  const matchKey = getStrategyMatchKey(normalized);
  let alerts = [];
  
  const getNames = (arr) => arr.map(s => s.name.toLowerCase());
  const hasCard = (namesArr, targets) => namesArr.some(n => targets.includes(n));
  const spellNames = getNames(deckSpells);

  if (matchKey === 'cascade') {
    const oneTwoDrops = deckSpells.filter(s => (s.cmc === 1 || s.cmc === 2) && !s.type_line.toLowerCase().includes('land'));
    const cascadeSpells = deckSpells.filter(s => ['shardless agent', 'ardent plea', 'violent outburst', 'bloodbraid marauder'].includes(s.name.toLowerCase()));
    
    if (oneTwoDrops.length > 0) {
      alerts.push(`CRITICAL WARNING: Mazo Cascade detectado con hechizos de coste 1 o 2 (ej. ${oneTwoDrops.slice(0,2).map(c=>c.name).join(', ')}). ¡ESTO ROMPE LA CASCADA! Elimina todo coste 1 o 2.`);
    }
    if (cascadeSpells.length === 0) alerts.push('CRITICAL WARNING: Faltan hechizos con la habilidad de Cascada de coste 3 (ej. Shardless Agent).');
  } else if (matchKey === 'storm') {
    const rituals = hasCard(spellNames, ['desperate ritual', 'pyretic ritual', 'manamorphose', 'seething song', 'rite of flame', 'cabal ritual', 'dark ritual']);
    const reducers = hasCard(spellNames, ['ruby medallion', 'baral, chief of compliance', 'goblin electromancer', 'ral, monsoon mage', 'helm of awakening']);
    const stormPayoffs = hasCard(spellNames, ['grapeshot', 'empty the warrens', 'tendrils of agony', 'brain freeze', 'chatterstorm']);
    
    if (!rituals) alerts.push('CRITICAL WARNING: Storm deck sin rituales de MANÁ (ej. Desperate Ritual).');
    if (!reducers) alerts.push('CRITICAL WARNING: Storm deck sin reductores de coste (ej. Ruby Medallion, Baral).');
    if (!stormPayoffs) alerts.push('CRITICAL WARNING: Storm deck sin finalizador de Tormenta (ej. Grapeshot).');
  } else if (matchKey === 'creativity') {
    const cheapTargets = deckSpells.filter(s => s.cmc <= 2 && (s.type_line.toLowerCase().includes('creature') || s.type_line.toLowerCase().includes('artifact')) && !s.type_line.toLowerCase().includes('land'));
    if (cheapTargets.length > 0) {
      alerts.push(`CRITICAL WARNING: Creativity detectado con objetivos baratos (ej. ${cheapTargets.slice(0,2).map(c=>c.name).join(', ')}). Indomitable Creativity golpeará estas cartas en lugar del finalizador.`);
    }
  } else if (matchKey === 'tron') {
    const payoffs = deckSpells.filter(s => s.cmc >= 6 && s.color_identity && s.color_identity.length === 0);
    const searchers = deckSpells.filter(s => ['expedition map', 'sylvan scrying', 'ancient stirrings', 'crop rotation'].includes(s.name.toLowerCase()));
    if (payoffs.length > 0 && searchers.length === 0) {
      alerts.push('WARNING: Tron deck sin buscadores de tierras de Urza (ej. Expedition Map, Sylvan Scrying).');
    }
    const heavyColor = deckSpells.filter(s => /\{[WUBRG]\}.*\{[WUBRG]\}/i.test(s.mana_cost) && !s.type_line.toLowerCase().includes('land'));
    if (heavyColor.length > 0) {
      alerts.push(`CRITICAL WARNING: Mazo Tron con hechizos de doble coste colorido (ej. ${heavyColor.slice(0,2).map(c=>c.name).join(', ')}). Es casi imposible de castear con tierras incoloras.`);
    }
  } else if (matchKey === 'amulet_titan') {
    const hasAmulet = hasCard(spellNames, ['amulet of vigor']);
    const hasTitan = hasCard(spellNames, ['primeval titan']);
    if (!hasAmulet || !hasTitan) {
      alerts.push('CRITICAL WARNING: Amulet Titan requiere Amulet of Vigor y Primeval Titan de forma obligatoria.');
    }
  } else if (matchKey === 'deaths_shadow') {
    const lifegain = deckSpells.filter(s => s.oracle_text && s.oracle_text.toLowerCase().includes('gain') && s.oracle_text.toLowerCase().includes('life') && !s.name.toLowerCase().includes('shadow'));
    if (lifegain.length > 0) {
      alerts.push(`WARNING: Death's Shadow detectado con cartas de ganar vida (ej. ${lifegain.slice(0,2).map(c=>c.name).join(', ')}). Esto va en contra de la estrategia del mazo.`);
    }
  } else if (matchKey === 'prison') {
    const hasLockPieces = hasCard(spellNames, ['chalice of the void', 'blood moon', 'ensnaring bridge', 'trinisphere', 'thalia, guardian of thraben']);
    if (!hasLockPieces) {
      alerts.push('WARNING: Prison/Taxes deck sin suficientes piezas de bloqueo simétricas o asimétricas.');
    }
  } else if (matchKey === 'scam') {
    const hasEvokeElementals = hasCard(spellNames, ['grief', 'fury', 'solitude', 'subtlety', 'endurance', 'orcish bowmasters']);
    const hasScamSpells = hasCard(spellNames, ['not dead after all', 'feign death', 'undying malice', 'ephemerate', 'malakir rebirth']);
    if (hasEvokeElementals && !hasScamSpells) {
      alerts.push('CRITICAL WARNING: Mazo Scam sin hechizos de reanimación temporal (Not Dead After All, Ephemerate) para abusar del Evoke.');
    }
  } else if (matchKey === 'reanimator') {
    const hasRestrictiveReanimators = hasCard(spellNames, ['unearth', 'claim // fame', 'claim/fame', 'claim']);
    const giantCreatures = deckSpells.filter(s => s.category === 'Creature' && s.cmc >= 4);
    const hasGeneralReanimators = hasCard(spellNames, ['persist', 'exhume', 'animate dead', 'necromancy', 'unburial rites', 'late to dinner', "goryo's vengeance", 'dread return']);
    
    if (hasRestrictiveReanimators && giantCreatures.length > 0 && !hasGeneralReanimators) {
      alerts.push(`CRITICAL WARNING: El mazo tiene criaturas gigantes para reanimar pero solo tiene hechizos de reanimación restrictivos de coste bajo (como Unearth). ¡Reemplázalos por Persist, Exhume, etc!`);
    }
    const discardOutlets = hasCard(spellNames, ['faithless looting', 'cathartic reunion', 'thrill of possibility', 'bitter reunion', "collector's vault", "stitcher's supplier", 'putrid imp', 'careful study']);
    if (!discardOutlets && hasGeneralReanimators) {
      alerts.push(`WARNING: Mazo Reanimator sin suficientes facilitadores de descarte tempranos. Añade Faithless Looting o similares.`);
    }
  } else if (matchKey === 'tribal_lords') {
    const creatures = deckSpells.filter(s => s.type_line.toLowerCase().includes('creature'));
    if (creatures.length < 20) {
      alerts.push('WARNING: Mazo Tribal con muy baja densidad de criaturas (<20). Asegúrate de tener suficientes para que los Lords sirvan de algo.');
    }
  }
  
  return alerts;
}

function findBestBlueprintRole(card, roles) {
  if (card.role && roles.some(r => r.name === card.role)) {
    return card.role;
  }
  
  const typeLower = (card.type_line || card.category || '').toLowerCase();
  const isCreature = typeLower.includes('creature');
  
  let bestRole = null;
  let bestScore = -1;
  
  for (const role of roles) {
    let score = 0;
    const roleLower = role.name.toLowerCase();
    
    if (isCreature && (roleLower.includes('creature') || role.finisherQuality === 'finisher')) {
      score += 10;
    } else if (!isCreature && !roleLower.includes('creature') && !roleLower.includes('finisher')) {
      score += 10;
    }
    
    const cmc = card.mana_value !== undefined ? card.mana_value : (card.cmc || 0);
    if (role.cmcCategory === '1' && cmc === 1) score += 5;
    else if (role.cmcCategory === '2' && cmc === 2) score += 5;
    else if (role.cmcCategory === '3' && cmc === 3) score += 5;
    else if (role.cmcCategory === '4+' && cmc >= 4) score += 5;
    else if (role.cmcCategory === '5+' && cmc >= 5) score += 5;
    
    if (score > bestScore) {
      bestScore = score;
      bestRole = role.name;
    }
  }
  
  return bestRole || roles[0]?.name;
}

function isAntiSynergistic(cardName, strategyId) {
  if (!cardName) return false;
  const nameLower = cardName.toLowerCase().trim();
  
  const match = COMPETITIVE_ANTI_SYNERGIES.find(cas => 
    cas.card && cas.strategy && strategyId &&
    cas.card.toLowerCase() === nameLower && 
    cas.strategy.toLowerCase() === strategyId.toLowerCase()
  );
  if (match) return true;
  
  if (nameLower === "thalia, guardian of thraben" && (strategyId === "spellslinger" || strategyId === "storm")) {
    return true;
  }
  if ((nameLower === "rest in peace" || nameLower === "grafdigger's cage" || nameLower === "leyline of the void") && 
      (strategyId === "reanimator" || strategyId === "graveyard" || strategyId === "aristocrats")) {
    return true;
  }
  
  return false;
}

export function mergeUserMustIncludeWithCore(mustIncludeStr, coreCards, allCards, format, totalSpellsMax, addLog) {
  const userCards = parseUserRulesString(mustIncludeStr);
  const merged = [];

  coreCards.forEach(c => {
    merged.push({ ...c, isCore: true });
  });

  for (const userCard of userCards) {
    if (!userCard || !userCard.name) continue;
    const dbCard = allCards.find(c => c && typeof c.name === 'string' && c.name.toLowerCase() === userCard.name.toLowerCase());
    if (!dbCard) {
      addLog(`[MUST-INCLUDE] Advertencia: "${userCard.name}" no encontrada en DB. Se omite.`);
      continue;
    }
    
    const formatKey = (format || 'MODERN').toUpperCase();
    const isLegal = isCardLegalForBattleBox(dbCard, formatKey);
    if (!isLegal) {
      addLog(`[MUST-INCLUDE] Advertencia: "${dbCard.name}" es ilegal o está vetada en ${formatKey}. Se omite.`);
      continue;
    }

    const maxCopies = getMaxAllowedCopies(dbCard.name, dbCard.type_line, dbCard.mana_value || dbCard.cmc || 2, []);
    const resolvedQty = Math.min(userCard.quantity, maxCopies);

    const existing = merged.find(c => c && typeof c.name === 'string' && c.name.toLowerCase() === dbCard.name.toLowerCase());
    if (existing) {
      addLog(`[MUST-INCLUDE] Sobrescribiendo cantidad de Core para "${dbCard.name}" con ${resolvedQty}x del usuario (antes ${existing.quantity}x).`);
      existing.quantity = resolvedQty;
      existing.isMustInclude = true;
    } else {
      const isL = dbCard.type_line?.toLowerCase().includes('land');
      const isC = dbCard.type_line?.toLowerCase().includes('creature');
      const isI = dbCard.type_line?.toLowerCase().includes('instant');
      const isS = dbCard.type_line?.toLowerCase().includes('sorcery');
      const resolvedCategory = isL ? 'Land' : (isC ? 'Creature' : (isI ? 'Instant' : (isS ? 'Sorcery' : 'Spell')));
      
      merged.push({
        ...dbCard,
        quantity: resolvedQty,
        category: resolvedCategory,
        role: "user_must_include",
        isMustInclude: true
      });
      addLog(`[MUST-INCLUDE] Inyectando carta del usuario: ${resolvedQty}x "${dbCard.name}"`);
    }
  }

  let totalSpellsCount = merged.reduce((sum, c) => sum + c.quantity, 0);
  if (totalSpellsCount > totalSpellsMax) {
    addLog(`[MUST-INCLUDE] Exceso de capacidad detectado (${totalSpellsCount} > ${totalSpellsMax} huecos). Recortando Core Package...`);
    
    const coreSpellsToTrim = merged.filter(c => c.isCore && !c.isMustInclude);
    const rolePriority = {
      cantrip: 1,
      cantrip_ritual: 1,
      ritual: 1,
      interaction: 2,
      tutor: 2,
      removal: 2,
      fodder: 3,
      payoff: 4,
      engine: 5,
      target: 5
    };
    coreSpellsToTrim.sort((a, b) => {
      const pA = rolePriority[a.role] || 3;
      const pB = rolePriority[b.role] || 3;
      return pA - pB;
    });

    for (const coreSpell of coreSpellsToTrim) {
      if (totalSpellsCount <= totalSpellsMax) break;
      const excess = totalSpellsCount - totalSpellsMax;
      const trimQty = Math.min(coreSpell.quantity, excess);
      coreSpell.quantity -= trimQty;
      totalSpellsCount -= trimQty;
      addLog(`[MUST-INCLUDE] Recortadas ${trimQty} copias de la carta Core de soporte "${coreSpell.name}".`);
    }

    return merged.filter(c => c.quantity > 0);
  }

  return merged;
}

export function assemblerLoop(rankedCards, blueprint, mergedCoreAndMustInclude, colors, format, ragPool, strategyId, addLog, formData) {
  const deck = [...mergedCoreAndMustInclude];
  const usedNames = new Map();
  deck.forEach(c => {
    if (c && typeof c.name === 'string') {
      usedNames.set(c.name.toLowerCase(), c.quantity);
    }
  });

  const residualBlueprint = blueprint.roles.map(r => ({ ...r, remaining: r.quantity }));
  for (const card of deck) {
    const bestRoleName = findBestBlueprintRole(card, residualBlueprint);
    const roleObj = residualBlueprint.find(r => r.name === bestRoleName);
    if (roleObj) {
      roleObj.remaining = Math.max(0, roleObj.remaining - card.quantity);
    }
  }

  const allowedColorsSet = new Set(colors || []);
  const isColorLegal = (card) => {
    if (allowedColorsSet.size === 0) return true;
    const cardColors = card.colors || card.color_identity || [];
    if (cardColors.length === 0) return true;
    return cardColors.some(c => allowedColorsSet.has(c));
  };

  // --- FASE 1: ORDENAMIENTO (PHASED ASSEMBLY) ---
  // Obligamos a la IA a construir primero el núcleo del mazo antes de evaluar hechizos de soporte (tutores, etc.)
  const rolePriorityMapping = {
    finisher: 1, engine: 1, target: 1, synergy: 1, payoff: 1, fodder: 1, core: 1, creature: 1,
    removal: 2, interaction: 2, counterspell: 2, protection: 2,
    tutor: 3, cantrip: 3, cantrip_ritual: 3, ritual: 3, ramp: 3, utility: 3,
    filler: 4
  };
  residualBlueprint.sort((a, b) => {
    const pA = rolePriorityMapping[a.name.toLowerCase()] || 2;
    const pB = rolePriorityMapping[b.name.toLowerCase()] || 2;
    return pA - pB;
  });

  const curveProfile = formData?.curveProfile || 'balanced';

  for (const role of residualBlueprint) {
    addLog(`[ENSAMBLADOR] Procesando rol: "${role.name}" (Objetivo: ${role.quantity} copias, Faltan: ${role.remaining})`);
    if (role.remaining <= 0) continue;

    // --- EL BOTÓN DE PÁNICO (Curva de MANÁ) ---
    const curveWarning = calculateRealTimeVMPWarning(deck.filter(c => c.category !== 'Land'), curveProfile);
    if (curveWarning.panicMode) {
      addLog(`[BOTÓN DE PÁNICO] Curva alta detectada (${curveWarning.currentVmp.toFixed(2)}). Restringiendo búsqueda a CMC <= ${curveWarning.maxAllowedCmc}`);
    }

    // --- EL IMÁN (Micro-Sinergias) ---
    const candidates = (rankedCards || [])
      .filter(rc => rc.role === role.name)
      .map(rc => {
        let synergyMultiplier = 1.0;
        deck.forEach(dCard => {
          if (!dCard.name) return;
          const anchor = MICRO_SYNERGIES_GRAPH[dCard.name.toLowerCase()];
          if (anchor) {
            const comboPiece = anchor.find(p => p.target === rc.name?.toLowerCase());
            if (comboPiece) {
              synergyMultiplier *= comboPiece.multiplier;
            }
          }
        });
        return {
          ...rc,
          effectivePriority: rc.priority / synergyMultiplier
        };
      })
      .sort((a, b) => a.effectivePriority - b.effectivePriority);

    for (const candidate of candidates) {
      if (role.remaining <= 0) break;

      const poolCard = ragPool.find(p => p && typeof p.name === 'string' && candidate && typeof candidate.name === 'string' && p.name.toLowerCase() === candidate.name.toLowerCase());
      if (!poolCard) continue;

      if (curveWarning.panicMode && (poolCard.mana_value || poolCard.cmc || 2) > curveWarning.maxAllowedCmc) {
        continue; // Vetado por el BOTÓN de PÁNICO
      }

      if (!isColorLegal(poolCard)) continue;
      if (isAntiSynergistic(poolCard.name, strategyId)) continue;

      // --- VETO CONTEXTUAL (Filtro de Cartas Muertas) ---
      let isContextuallyDead = false;
      const oracleText = poolCard.oracle_text ? poolCard.oracle_text.toLowerCase() : '';
      const tLine = poolCard.type_line ? poolCard.type_line.toLowerCase() : '';
      const combinedTextForVeto = `${oracleText} | ${tLine}`;
      
      for (const rule of CONTEXTUAL_DEPENDENCIES) {
        if (rule.keywords.some(kw => combinedTextForVeto.includes(kw))) {
          if (rule.requiresType) {
            const hasType = deck.some(c => c.type_line && c.type_line.toLowerCase().includes(rule.requiresType));
            if (!hasType) {
              isContextuallyDead = true;
              addLog(`[VETO CONTEXTUAL] Rechazada "${poolCard.name}" por falta de dependencias (${rule.requiresType}).`);
              break;
            }
          }
          if (rule.requiresText) {
            const hasText = deck.some(c => {
               const deckRagCard = ragPool.find(p => p.name.toLowerCase() === c.name.toLowerCase());
               return deckRagCard && deckRagCard.oracle_text && deckRagCard.oracle_text.toLowerCase().includes(rule.requiresText);
            });
            if (!hasText) {
              isContextuallyDead = true;
              addLog(`[VETO CONTEXTUAL] Rechazada "${poolCard.name}" por falta de soporte mecánico (${rule.requiresText}).`);
              break;
            }
          }
        }
      }
      
      if (isContextuallyDead) continue;

      const maxLimit = getMaxAllowedCopies(poolCard.name, poolCard.type_line || poolCard.category, poolCard.mana_value || poolCard.cmc || 2, ragPool);
      const alreadyUsed = poolCard.name ? (usedNames.get(poolCard.name.toLowerCase()) || 0) : 0;
      if (alreadyUsed >= maxLimit) continue;

      // Determinar el límite Pro-Tour de copias (4x para hechizos clave/baratos/cantrips, 1-2x para legendarias/finishers)
      const proCopies = getProCopiesForCard(poolCard, role.name, ragPool, formData);
      const suggestedLimit = candidate.isMustInclude 
        ? (candidate.quantity || proCopies)
        : Math.max(candidate.quantity && candidate.quantity > 1 ? candidate.quantity : 1, proCopies);
      
      const allowedToPlace = Math.min(suggestedLimit - alreadyUsed, maxLimit - alreadyUsed);
      if (allowedToPlace <= 0) continue;

      let targetCopies = Math.min(allowedToPlace, role.remaining);

      if (poolCard.functionalTag) {
        const tagTotal = deck
          .filter(d => d.functionalTag === poolCard.functionalTag)
          .reduce((sum, d) => sum + d.quantity, 0);
        targetCopies = Math.min(targetCopies, Math.max(0, 6 - tagTotal));
      }

      if (targetCopies > 0) {
        deck.push({
          name: poolCard.name,
          quantity: targetCopies,
          category: poolCard.type_line?.toLowerCase().includes('creature') ? 'Creature' : (poolCard.type_line?.toLowerCase().includes('instant') ? 'Instant' : 'Spell'),
          cmc: poolCard.mana_value || poolCard.cmc || 2,
          role: role.name,
          mana_cost: poolCard.mana_cost || '',
          type_line: poolCard.type_line || '',
          oracle_text: poolCard.oracle_text || poolCard.text || '',
          _ragPoolRef: ragPool,
          functionalTag: poolCard.functionalTag || null
        });
        usedNames.set(poolCard.name.toLowerCase(), alreadyUsed + targetCopies);
        role.remaining -= targetCopies;
        addLog(`[ENSAMBLADOR] Añadido por IA: ${targetCopies}x "${poolCard.name}" para el rol "${role.name}"`);
      }
    }

    if (role.remaining > 0) {
      addLog(`[ENSAMBLADOR] IA no completó el rol "${role.name}". Buscando en RAG Pool fallback...`);
      const isCreatureRole = role.name.toLowerCase().includes('creature') || role.finisherQuality === 'finisher';
      
      const cmcFilteredFallbacks = ragPool
        .filter(p => p && typeof p.name === 'string' && !usedNames.has(p.name.toLowerCase()))
        .filter(p => {
          const typeLower = (p.type_line || '').toLowerCase();
          const isC = typeLower.includes('creature');
          return isCreatureRole ? isC : !isC;
        })
        .filter(p => isColorLegal(p))
        .filter(p => p.name && !isAntiSynergistic(p.name, strategyId))
        .filter(p => {
          if (curveWarning.panicMode && (p.mana_value || p.cmc || 2) > curveWarning.maxAllowedCmc) {
            return false; // Vetado por el BOTÓN de PÁNICO
          }
          // Fallback Contextual Veto
          const oText = p.oracle_text ? p.oracle_text.toLowerCase() : '';
          const tpLine = p.type_line ? p.type_line.toLowerCase() : '';
          const combText = `${oText} | ${tpLine}`;
          for (const rule of CONTEXTUAL_DEPENDENCIES) {
            if (rule.keywords.some(kw => combText.includes(kw))) {
              if (rule.requiresType && !deck.some(c => c.type_line && c.type_line.toLowerCase().includes(rule.requiresType))) return false;
            }
          }
          return true;
        });

      // Intentar filtrar por CMC del rol (Problema 3)
      let fallbacks = cmcFilteredFallbacks.filter(p => {
        const cmc = p.mana_value !== undefined ? p.mana_value : (p.cmc || 0);
        if (role.cmcCategory === '1') return cmc === 1;
        if (role.cmcCategory === '2') return cmc === 2;
        if (role.cmcCategory === '3') return cmc === 3;
        if (role.cmcCategory === '4+') return cmc >= 4;
        if (role.cmcCategory === '5+') return cmc >= 5;
        return true;
      });

      if (fallbacks.length === 0) {
        addLog(`[ENSAMBLADOR] Fallback de CMC estricto (${role.cmcCategory}) vacío para rol "${role.name}". Relajando restricción.`);
        fallbacks = cmcFilteredFallbacks;
      }

      fallbacks.sort((a, b) => b.score - a.score);

      for (const fb of fallbacks) {
        if (role.remaining <= 0) break;
        const maxLimit = getMaxAllowedCopies(fb.name, fb.type_line || fb.category, fb.mana_value || fb.cmc || 2, ragPool);
        const alreadyUsed = fb.name ? (usedNames.get(fb.name.toLowerCase()) || 0) : 0;
        if (alreadyUsed >= maxLimit) continue;

        const proLimit = getProCopiesForCard(fb, role.name, ragPool, formData);
        if (alreadyUsed >= proLimit) continue;

        let targetCopies = Math.min(role.remaining, proLimit - alreadyUsed);
        
        if (targetCopies > 0) {
          deck.push({
            name: fb.name,
            quantity: targetCopies,
            category: fb.type_line?.toLowerCase().includes('creature') ? 'Creature' : (fb.type_line?.toLowerCase().includes('instant') ? 'Instant' : 'Spell'),
            cmc: fb.mana_value || fb.cmc || 2,
            role: role.name,
            mana_cost: fb.mana_cost || '',
            type_line: fb.type_line || '',
            functionalTag: fb.functionalTag || null
          });
          usedNames.set(fb.name.toLowerCase(), alreadyUsed + targetCopies);
          role.remaining -= targetCopies;
          addLog(`[ENSAMBLADOR] Añadido por FALLBACK: ${targetCopies}x "${fb.name}" para el rol "${role.name}"`);
        }
      }
    }
  }

  const currentTotal = deck.reduce((sum, c) => sum + c.quantity, 0);
  const targetTotal = blueprint.totalSpells;
  let finalGap = targetTotal - currentTotal;
  if (finalGap > 0) {
    addLog(`[ENSAMBLADOR] Failsafe: Faltan ${finalGap} cartas para llegar al total. Rellenando con mejores cartas del RAG Pool...`);
    const extraSpells = ragPool
      .filter(p => p && typeof p.name === 'string' && !usedNames.has(p.name.toLowerCase()))
      .filter(p => isColorLegal(p))
      .filter(p => p.name && !isAntiSynergistic(p.name, strategyId))
      .sort((a, b) => b.score - a.score);

    for (const spell of extraSpells) {
      if (finalGap <= 0) break;
      const maxLimit = getMaxAllowedCopies(spell.name, spell.type_line || spell.category, spell.mana_value || spell.cmc || 2, ragPool);
      const alreadyUsed = usedNames.get(spell.name.toLowerCase()) || 0;
      if (alreadyUsed >= maxLimit) continue;

      const proLimit = getProCopiesForCard(spell, "filler", ragPool, formData);
      if (alreadyUsed >= proLimit) continue;

      const toAdd = Math.min(finalGap, proLimit - alreadyUsed);
      if (toAdd > 0) {
        deck.push({
          name: spell.name,
          quantity: toAdd,
          category: spell.type_line?.toLowerCase().includes('creature') ? 'Creature' : 'Spell',
          cmc: spell.mana_value || spell.cmc || 2,
          role: "filler",
          mana_cost: spell.mana_cost || '',
          type_line: spell.type_line || ''
        });
        usedNames.set(spell.name.toLowerCase(), alreadyUsed + toAdd);
        finalGap -= toAdd;
        addLog(`[ENSAMBLADOR FAILSAFE] Inyectada filler: ${toAdd}x "${spell.name}"`);
      }
    }
  }

  return deck;
}

function adjustManaCurve(deckSpells, curveProfile, ragPool, strategyId, allowedColors, addLog) {
  const calculateDeckVMP = (spells) => {
    let sum = 0;
    let count = 0;
    spells.forEach(c => {
      sum += (c.cmc || 0) * c.quantity;
      count += c.quantity;
    });
    return count > 0 ? sum / count : 0;
  };

  const vmp = calculateDeckVMP(deckSpells);
  addLog(`[CURVA DE MANÁ] VMP Inicial de Hechizos: ${vmp.toFixed(2)}. Perfil deseado: ${curveProfile}`);

  const bounds = CURVE_BOUNDS[curveProfile] || CURVE_BOUNDS.balanced;
  let currentVMP = vmp;

  if (currentVMP >= bounds.min && currentVMP <= bounds.max) {
    return deckSpells;
  }

  let iterations = 0;
  const maxIterations = 8;
  const colorsSet = new Set(allowedColors || []);
  const isColorLegal = (card) => {
    if (colorsSet.size === 0) return true;
    const cardColors = card.colors || card.color_identity || [];
    if (cardColors.length === 0) return true;
    return cardColors.some(c => colorsSet.has(c));
  };

  const spells = [...deckSpells];

  while ((currentVMP < bounds.min || currentVMP > bounds.max) && iterations < maxIterations) {
    iterations++;
    const oldVmp = currentVMP;

    if (currentVMP > bounds.max) {
      // VMP demasiado alto -> Intentar bajar la curva
      let adjustedInternally = false;
      
      // 1. Ajuste interno: Incrementar copias de cartas baratas existentes, decrementar caras existentes
      const cheapCandidates = spells.filter(c => c.cmc <= 2 && c.quantity > 0 && !c.isHiddenSynergy && c.quantity < getMaxAllowedCopies(c.name, c.category, c.cmc, ragPool));
      const expensiveCandidates = spells.filter(c => !c.isCore && !c.isMustInclude && !c.isHiddenSynergy && c.cmc >= 3 && c.quantity > 1);

      if (cheapCandidates.length > 0 && expensiveCandidates.length > 0) {
        cheapCandidates.sort((a, b) => a.cmc - b.cmc || a.quantity - b.quantity);
        expensiveCandidates.sort((a, b) => b.cmc - a.cmc);
        
        const cheapCard = cheapCandidates[0];
        const expensiveCard = expensiveCandidates[0];
        
        cheapCard.quantity++;
        expensiveCard.quantity--;
        addLog(`[CURVA DE MANÁ] Ajuste interno: +1x "${cheapCard.name}" (CMC ${cheapCard.cmc}) y -1x "${expensiveCard.name}" (CMC ${expensiveCard.cmc})`);
        adjustedInternally = true;
      }
      
      // 2. Swap externo en bloque
      if (!adjustedInternally) {
        const expensiveCard = spells
          .filter(c => !c.isCore && !c.isMustInclude && !c.isHiddenSynergy && c.cmc >= 3 && c.quantity > 0)
          .sort((a, b) => {
            const qA = a.quantity >= 2 ? 1 : 0;
            const qB = b.quantity >= 2 ? 1 : 0;
            if (qA !== qB) return qB - qA; // Priorizar las que tienen >= 2 copias
            return b.cmc - a.cmc;
          })[0];

        if (!expensiveCard) break;

        const cheapReplacement = ragPool
          .filter(p => p && typeof p.name === 'string' && !spells.some(s => s && typeof s.name === 'string' && s.name.toLowerCase() === p.name.toLowerCase()))
          .filter(p => p.mana_value <= 2)
          .filter(p => isColorLegal(p))
          .filter(p => p.name && !isAntiSynergistic(p.name, strategyId))
          .sort((a, b) => b.score - a.score)[0];

        if (!cheapReplacement) break;

        // Intentar meter al menos 2 copias para evitar singletons, máximo las que tiene la cara
        const swapQty = Math.max(2, Math.min(expensiveCard.quantity, 3));
        const actualSwapQty = Math.min(expensiveCard.quantity, swapQty);

        addLog(`[CURVA DE MANÁ] Swap externo: Reemplazando ${actualSwapQty}x "${expensiveCard.name}" (CMC ${expensiveCard.cmc}) por ${actualSwapQty}x "${cheapReplacement.name}" (CMC ${cheapReplacement.mana_value})`);
        
        expensiveCard.quantity -= actualSwapQty;
        const existingCheap = spells.find(s => s && typeof s.name === 'string' && s.name.toLowerCase() === cheapReplacement.name.toLowerCase());
        if (existingCheap) {
          existingCheap.quantity += actualSwapQty;
        } else {
          spells.push({
            name: cheapReplacement.name,
            quantity: actualSwapQty,
            category: cheapReplacement.type_line?.toLowerCase().includes('creature') ? 'Creature' : 'Spell',
            cmc: cheapReplacement.mana_value || 1,
            role: expensiveCard.role,
            mana_cost: cheapReplacement.mana_cost || '',
            type_line: cheapReplacement.type_line || ''
          });
        }
      }
    } else {
      // VMP demasiado bajo -> Intentar subir la curva
      let adjustedInternally = false;
      
      // 1. Ajuste interno: Incrementar copias de cartas caras existentes, decrementar baratas existentes
      const expensiveCandidates = spells.filter(c => c.cmc >= 3 && c.quantity > 0 && c.quantity < getMaxAllowedCopies(c.name, c.category, c.cmc, ragPool));
      const cheapCandidates = spells.filter(c => !c.isCore && !c.isMustInclude && c.cmc <= 2 && c.quantity > 1);

      if (expensiveCandidates.length > 0 && cheapCandidates.length > 0) {
        expensiveCandidates.sort((a, b) => b.cmc - a.cmc || a.quantity - b.quantity);
        cheapCandidates.sort((a, b) => a.cmc - b.cmc);
        
        const expensiveCard = expensiveCandidates[0];
        const cheapCard = cheapCandidates[0];
        
        expensiveCard.quantity++;
        cheapCard.quantity--;
        addLog(`[CURVA DE MANÁ] Ajuste interno: +1x "${expensiveCard.name}" (CMC ${expensiveCard.cmc}) y -1x "${cheapCard.name}" (CMC ${cheapCard.cmc})`);
        adjustedInternally = true;
      }
      
      // 2. Swap externo en bloque
      if (!adjustedInternally) {
        const cheapCard = spells
          .filter(c => !c.isCore && !c.isMustInclude && c.cmc <= 2 && c.quantity > 0)
          .sort((a, b) => {
            const qA = a.quantity >= 2 ? 1 : 0;
            const qB = b.quantity >= 2 ? 1 : 0;
            if (qA !== qB) return qB - qA; // Priorizar las que tienen >= 2 copias
            return a.cmc - b.cmc;
          })[0];

        if (!cheapCard) break;

        const expensiveReplacement = ragPool
          .filter(p => p && typeof p.name === 'string' && !spells.some(s => s && typeof s.name === 'string' && s.name.toLowerCase() === p.name.toLowerCase()))
          .filter(p => p.mana_value >= 3)
          .filter(p => isColorLegal(p))
          .filter(p => p.name && !isAntiSynergistic(p.name, strategyId))
          .sort((a, b) => b.score - a.score)[0];

        if (!expensiveReplacement) break;

        const swapQty = Math.max(2, Math.min(cheapCard.quantity, 3));
        const actualSwapQty = Math.min(cheapCard.quantity, swapQty);

        addLog(`[CURVA DE MANÁ] Swap externo: Reemplazando ${actualSwapQty}x "${cheapCard.name}" (CMC ${cheapCard.cmc}) por ${actualSwapQty}x "${expensiveReplacement.name}" (CMC ${expensiveReplacement.mana_value})`);
        
        cheapCard.quantity -= actualSwapQty;
        const existingExpensive = spells.find(s => s && typeof s.name === 'string' && s.name.toLowerCase() === expensiveReplacement.name.toLowerCase());
        if (existingExpensive) {
          existingExpensive.quantity += actualSwapQty;
        } else {
          spells.push({
            name: expensiveReplacement.name,
            quantity: actualSwapQty,
            category: expensiveReplacement.type_line?.toLowerCase().includes('creature') ? 'Creature' : 'Spell',
            cmc: expensiveReplacement.mana_value || 3,
            role: cheapCard.role,
            mana_cost: expensiveReplacement.mana_cost || '',
            type_line: expensiveReplacement.type_line || ''
          });
        }
      }
    }

    for (let i = spells.length - 1; i >= 0; i--) {
      if (spells[i].quantity <= 0) {
        spells.splice(i, 1);
      }
    }

    currentVMP = calculateDeckVMP(spells);
    if (currentVMP === oldVmp) break;
  }

  addLog(`[CURVA DE MANÁ] VMP Final de Hechizos: ${currentVMP.toFixed(2)} (Rango: ${bounds.min}-${bounds.max})`);
  return spells;
}

const guessCardColor = (cardName) => {
    if (!cardName) return null;
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

export async function generateBlueprintFromAI(formData, aiConfig, onProgress = () => {}) {
   const logs = [];
   const addLog = (msg) => {
     logs.push(msg);
     console.log(`[Blueprint Log] ${msg}`);
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
           description: match.description,
           isDynamic: true
         };
       }
     }
     if (!archetypeObj) archetypeObj = {};
     const tribeObj = MTG_TRIBES.find(t => t.id === formData.tribe || t.label === formData.tribe) || null;
     const tribeLabel = tribeObj ? tribeObj.label : formData.tribe || 'Ninguna';
     const tribeSubtypes = tribeObj && tribeObj.subtypes ? tribeObj.subtypes.join(', ') : formData.tribe || 'Cualquiera';

     if (tribeObj && tribeObj.colors && strategyObj && strategyObj.colors) {
       const tribeColors = tribeObj.colors;
       const strategyColors = strategyObj.colors;
       const intersection = tribeColors.filter(c => strategyColors.includes(c));
       
       if (intersection.length === 0) {
         const errorMsg = `⚠️ La Tribu "${tribeObj.label}" [${tribeColors.join(',')}] y la Estrategia "${strategyObj.label}" [${strategyColors.join(',')}] no comparten ningún color.`;
         addLog(`[ERROR INTERSECCIÓN DE COLOR] ${errorMsg}`);
         throw new Error(errorMsg);
       }
     }

     let baseIdent_ColorStr = (formData.colores && formData.colores.length>0) ? formData.colores.join(",") : "B,R"; 

     const dnaData = ARCHETYPE_DNA[strategyId] || ARCHETYPE_DNA[formData.archetype] || {
       prioridad: "Eficiencia, consistencia en la curva, sinergias de juego justo y ventaja de cartas.",
       estilo: "General / Tradicional",
       regla_de_oro: "Prioriza cartas con buen valor individual y sinergias directas con el resto de tus amenazas."
     };

     addLog(`Iniciando invocación de blueprint de mazo con arquetipo TAXONÓMICO: ${formData.archetype || 'midrange'} y estrategia ${strategyId}`);
     
     const curveProfile = formData.curveProfile || 'balanced';
     
     const formatMod = FORMAT_CURVE_MODIFIERS[(formData.format || 'MODERN').toUpperCase()] || FORMAT_CURVE_MODIFIERS.MODERN;

     onProgress('strategist', '🏗️ Arquitecto de Plantillas (IA) diseñando Blueprint a medida...');
     const blueprintPrompt = `
Eres el "Blueprint Architect" del Pro Tour de Magic.
Diseña el plano estructural perfecto y a medida para este mazo.
- Archetype: ${formData.archetype || 'Midrange'}
- Strategy: ${strategyObj.label || strategyId || 'General'}
- Tribe: ${tribeLabel} (Subtypes: ${tribeSubtypes})
- Colors: [${baseIdent_ColorStr}]
- Curve: ${curveProfile}
- Format: ${formData.format || 'MODERN'}
- User Custom Instructions / Theme: ${formData.prompt || 'Ninguno'}
- Format CMC Constraint: ${formatMod.maxViableCMC}.
- Speed Target: ${formatMod.comboSpeedTarget}.
  ${getArchetypePhilosophyPrompt(formData.archetype)}
  ${getStrategySynergyPrompt(strategyId)}

  REGLA DE ORO TRIBAL: Si la tribu no es "none", el 85-90% de tus roles DEBEN ser rellenados por CRIATURAS DE ESA TRIBU.

Define las cantidades exactas de cartas para cada rol ESTRATÉGICO clave:
- name: Nombre corto descriptivo del rol.
- quantity: Cantidad de copias.
- cmcCategory: "1", "2", "3", "4", "4+", "5+", "any".
- finisherQuality: "finisher" o "standard".
- purposeDescription: Propósito del rol sin mencionar nombres de cartas.
- search_query: Consulta Scryfall de alta precisión para este rol.
  Sigue estas REGLAS INVIOLABLES DE EXPERTO EN SCRYFALL:
  1. PRECEDENCIA DE OPERADORES: El AND es implícito. El OR se evalúa después del AND. Si mezclas AND y OR, DEBES usar paréntesis. 
     * INCORRECTO: "o:landfall o:token OR o:draw" (Scryfall lo entiende como (landfall AND token) OR draw, atrapando cartas que roban sin landfall).
     * CORRECTO: "o:landfall (o:token or o:draw)"
  2. EVITA SOBRE-FILTRAR: No pongas múltiples condiciones restrictivas juntas si buscas un rol amplio.
     * INCORRECTO para Removal: "o:damage o:destroy type:instant" (exige que un instantáneo tenga ambas palabras a la vez; no encontrará Lightning Bolt ni Doom Blade).
     * CORRECTO para Removal: "type:instant (o:damage or o:destroy)"
  3. AMENAZAS/FINISHERS DE LANDFALL Y OTROS ARQUETIPOS: No uses "o:power o:toughness" para buscar bombas, ya que cartas icónicas como Rampaging Baloths o Avenger of Zendikar no contienen esas palabras en su texto oracle.
     * CORRECTO para Finishers de Landfall: "o:landfall type:creature mv>=5" o "o:landfall (o:token or o:counter) mv>=5"
  4. SINTAXIS LIMPIA: Usa siempre minúsculas para los operadores lógicos inside parents, ej: "o:landfall (o:token or o:draw)".
  5. NO INCLUYAS FILTROS DE FORMATO: No incluyas filtros de formato como "f:modern" o "f:standard" ni "is:legal" en tus consultas, ya que la aplicación se encarga de inyectar los filtros de legalidad dinámicamente.
  6. PROHIBICIÓN TRIBAL: La tribu seleccionada es "${tribeLabel}". Si la tribu es "Ninguna", "none" o está vacía, tus search_query NUNCA deben contener tipos de criatura específicos como t:insect, t:spider, t:goblin, t:elf, t:zombie, etc., NI referencias a sinergias tribales explícitas como "o:other goblins", "o:among insects", "o:for each elf". Las cartas seleccionadas deben funcionar INDEPENDIENTEMENTE sin requerir otras criaturas de una tribu concreta. Usa únicamente mecánicas independientes como o:etb, o:draw, o:deathtouch, o:lifelink, pow>=2, o:enters, o:dies.

Adicionalmente:
- deckName: Nombre creativo.
- lore: Frase breve.
- strategy: Breve descripción.
- mulligan: Guía de mulligan.
- totalSpells: Número total de cartas de mazo (sin tierras).

La suma de los roles debe ser exactamente totalSpells. NUNCA incluyas tierras.
`;

     let blueprint = getStrategyFallbackBlueprint(formData.archetype, strategyId, formData);
     try {
         const bpResponse = await callAI([
             { role: 'system', content: 'Crea el plano (Blueprint) estructural óptimo en JSON puro.' },
             { role: 'user', content: blueprintPrompt }
         ], aiConfig, { 
             forceJSON: true, 
             maxTokens: 3000, 
             schema: GEMINI_BLUEPRINT_SCHEMA,
             selectedModel: formData.selectedModel,
             temperature: formData.creativity !== undefined ? (formData.creativity / 100) : undefined
         });
         blueprint = typeof bpResponse === 'string' ? cleanAndParseJSON(bpResponse) : bpResponse;
         
         const targetTotalSpells = Number(blueprint.totalSpells) || 38;
         const rolesSum = Array.isArray(blueprint.roles) 
           ? blueprint.roles.reduce((s, r) => s + (Number(r.quantity) || 0), 0) 
           : 0;

         // Si el blueprint devuelto por la IA está incompleto (ej. truncado con solo 1 rol o suma < totalSpells - 4)
         if (!Array.isArray(blueprint.roles) || blueprint.roles.length < 2 || rolesSum < (targetTotalSpells - 4)) {
           addLog(`⚠️ [BLUEPRINT VALIDATION] Blueprint IA incompleto o truncado (Suma: ${rolesSum}/${targetTotalSpells}, Roles: ${blueprint.roles?.length || 0}). Usando Blueprint Estratégico completo.`);
           const fallback = getStrategyFallbackBlueprint(formData.archetype, strategyId, formData);
           blueprint.roles = fallback.roles || [];
           blueprint.totalSpells = fallback.totalSpells || targetTotalSpells;
           blueprint.deckName = blueprint.deckName || fallback.deckName;
           blueprint.lore = blueprint.lore || fallback.lore;
           blueprint.strategy = blueprint.strategy || fallback.strategy;
           blueprint.mulligan = blueprint.mulligan || fallback.mulligan;
         } else if (rolesSum !== targetTotalSpells && blueprint.roles.length > 0) {
           // Auto-normalización si la suma difiere ligeramente por 1 o 2 cartas
           const diff = targetTotalSpells - rolesSum;
           blueprint.roles[0].quantity = Math.max(1, (Number(blueprint.roles[0].quantity) || 0) + diff);
           addLog(`🔧 [BLUEPRINT NORMALIZER] Ajustada cuota de rol principal "${blueprint.roles[0].name}" en ${diff > 0 ? '+' : ''}${diff} para igualar exactamente ${targetTotalSpells} hechizos.`);
         }
         

         // Generar contrato de estado DeckDNA60 e Inyectar Core Packages
         const deckDNA60 = createDeckDNA60(formData, archetypeObj);
         const skeletonData = buildDeckSkeletonAndSlots(deckDNA60);
         deckDNA60.corePackages = skeletonData.injectedCoreCards;

         return {
           blueprint: {
             ...blueprint,
             deckDNA60,
             gamePlan: deckDNA60.gamePlan,
             corePackages: skeletonData.injectedCoreCards,
             emptySlots: skeletonData.emptySlots
           },
           strategyId,
           dnaData,
           logs,
           archetypeObj,
           strategyObj,
           curveProfile,
           STRICT_INSTRUCTIONS_PROMPT,
           contextGen_Prompt,
           genResponseRawJson_Object
         };
     } catch(err) {
         addLog(`[BLUEPRINT AI] Error generando Blueprint Dinámico, usando Fallback: ${err.message}`);
     }

     return {
       blueprint,
       strategyId,
       dnaData,
       logs,
       archetypeObj,
       strategyObj,
       curveProfile,
       STRICT_INSTRUCTIONS_PROMPT,
       contextGen_Prompt,
       genResponseRawJson_Object
     };
   } catch(e) {
     addLog(`[BLUEPRINT ERROR] ${e.message}`);
     throw e;
   }
}

export async function assembleDeckFromBlueprint(blueprint, formData, aiConfig, onProgress = () => {}, preCalculatedData = {}) {
   const logs = preCalculatedData.logs || [];
   const addLog = (msg) => {
     logs.push(msg);
     console.log(`[Assemble Log] ${msg}`);
   };

   let STRICT_INSTRUCTIONS_PROMPT = preCalculatedData.STRICT_INSTRUCTIONS_PROMPT || "";
   let contextGen_Prompt = preCalculatedData.contextGen_Prompt || "";
   let genResponseRawJson_Object = preCalculatedData.genResponseRawJson_Object || "";

   try {
     const strategyObj = preCalculatedData.strategyObj || MTG_STRATEGIES.find(s => s.label === formData.strategy || s.id === formData.strategy) || {};
     let strategyId = preCalculatedData.strategyId || strategyObj.id || formData.strategy || "";
     strategyId = inferStrategyFromArchetype(formData.archetype, strategyId, formData.prompt);
     const dnaData = preCalculatedData.dnaData || ARCHETYPE_DNA[strategyId] || ARCHETYPE_DNA[formData.archetype] || {
       prioridad: "Eficiencia, consistencia en la curva, sinergias de juego justo y ventaja de cartas.",
       estilo: "General / Tradicional",
       regla_de_oro: "Prioriza cartas con buen valor individual y sinergias directas con el resto de tus amenazas."
     };
     const curveProfile = formData.curveProfile || 'balanced';

      const tribeObj = MTG_TRIBES.find(t => t.id === formData.tribe || t.label === formData.tribe) || null;
      const tribeLabel = tribeObj ? tribeObj.label : formData.tribe || 'Ninguna';
      const tribeSubtypes = tribeObj && tribeObj.subtypes ? tribeObj.subtypes.join(', ') : formData.tribe || 'Cualquiera';
      let baseIdent_ColorStr = (formData.colores && formData.colores.length > 0) ? formData.colores.join(",") : "B,R";

      let commanderCard = null;
     if ((formData.format || '').toUpperCase() === 'COMMANDER') {
       if (formData.selectedCommander) {
         commanderCard = formData.selectedCommander;
       } else if (blueprint.suggestedCommanders && blueprint.suggestedCommanders.length > 0) {
         commanderCard = blueprint.suggestedCommanders[0];
       }
       if (commanderCard) {
         addLog(`[COMMANDER] Comandante activo: ${commanderCard}.`);
       }
     }
     let archetypeObj = preCalculatedData.archetypeObj;
     if (!archetypeObj) {
       archetypeObj = BATTLEBOX_ARCHETYPES.find(a => a.id === formData.archetype);
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
             description: match.description,
             isDynamic: true
           };
         }
       }
     }
     if (!archetypeObj) archetypeObj = {};

     // DNA skeleton retrieval
      let dnaSkeleton = null;
      try {
        if (archetypeObj?.isDynamic) {
          dnaSkeleton = await obtenerEsqueletoDNA(formData.archetype, strategyId, formData.format || 'MODERN', formData.colores);
          if (dnaSkeleton) {
            addLog(`[DNA] ADN competitivo detectado con ${dnaSkeleton.length} cartas de esqueleto.`);
          }
        } else {
          addLog(`[DNA] Arquetipo genérico de Senda 1 (Sandbox): omitiendo búsqueda de esqueleto de ADN.`);
        }
      } catch(e) {
        addLog(`[DNA] Error buscando ADN: ${e.message}`);
      }

      // 1. Carga de allCards
      onProgress('strategist', '📚 Cargando catálogo completo de la biblioteca...');
      const allCards = await getAllCards();
      cachedAllCards = allCards;

      // Apply budget restriction if defined
      let filteredAllCards = allCards;
      if (formData.maxBudget && formData.maxBudget !== 'unlimited') {
        const budgetVal = parseFloat(formData.maxBudget);
        filteredAllCards = allCards.filter(c => {
          const price = parseFloat(c.prices?.usd || c.price || 0);
          return price === 0 || price <= budgetVal;
        });
        addLog(`[RESTRICCIÓN PRESUPUESTO] Catálogo filtrado por precio <= $${budgetVal}. Quedan ${filteredAllCards.length}/${allCards.length} cartas.`);
      }

      // Inject core packages
      let mustIncludeStr = formData.mustInclude || '';
      if (formData.selectedCorePackages && formData.selectedCorePackages.length > 0) {
        const pkgSpells = [];
        if (formData.selectedCorePackages.includes('cantrips')) {
          pkgSpells.push("Brainstorm:4", "Ponder:4", "Preordain:4");
        }
        if (formData.selectedCorePackages.includes('removal')) {
          pkgSpells.push("Lightning Bolt:4", "Fatal Push:4", "Path to Exile:2");
        }
        if (formData.selectedCorePackages.includes('discard')) {
          pkgSpells.push("Thoughtseize:4", "Inquisition of Kozilek:2");
        }
        if (pkgSpells.length > 0) {
          if (mustIncludeStr) {
            mustIncludeStr += ',' + pkgSpells.join(',');
          } else {
            mustIncludeStr = pkgSpells.join(',');
          }
          addLog(`[CORE PACKAGES] Inyectando paquetes core en mustInclude: ${pkgSpells.join(', ')}`);
        }
      }

      // Commander handling: remove commander from deck of 99 spells
      if (commanderCard) {
        const commLower = commanderCard.toLowerCase();
        mustIncludeStr = mustIncludeStr.split(',').map(s => s.trim()).filter(s => {
          const cleanName = s.split(':')[0].trim().toLowerCase();
          return cleanName !== commLower;
        }).join(',');
      }



    // --- BYPASS DETERMINISTA SENDA 2 (RECETAS DEL META) ---
    if (archetypeObj?.isDynamic && dnaSkeleton && dnaSkeleton.length > 0) {
      addLog(`[SENDA 2 BYPASS] Iniciando flujo ultra-fiel para Receta de Meta Dinámica: ${formData.archetype}`);
      onProgress('assembler', '⚙️ Procesando esqueleto competitivo real (Filtrando tierras y vetos)...');
      
      const dnaSpells = [];
      const banlistSwaps = [];
      
      // 1. Filtrar tierras y aplicar banlist/vetos sobre los hechizos
      for (const item of dnaSkeleton) {
        if (!item || !item.name) continue;
        
        let dbCard = allCards.find(ac => ac && ac.name && ac.name.toLowerCase() === item.name.toLowerCase());
        if (!dbCard) {
          dbCard = allCards.find(ac => ac && ac.name && ac.name.toLowerCase().includes(item.name.toLowerCase()));
        }
        
        if (dbCard) {
          const typeLine = (dbCard.type_line || '').toLowerCase();
          // Excluir tierras del construido real (fetchlands, shocklands, etc.)
          if (typeLine.includes('land')) {
            // EXCEPCIÓN: Conservar tierras indispensables para motores (Tron, etc.) o utilidades del ADN
            const nameL = dbCard.name.toLowerCase();
            const isEssentialEngineLand = nameL.includes("urza's mine") || nameL.includes("urza's tower") || nameL.includes("urza's power plant") || 
                                          nameL.includes("urza's saga") || nameL.includes("boseiju, who endures") || nameL.includes("otawara, soaring city") ||
                                          nameL.includes("takenuma, abandoned mire") || nameL.includes("eiganjo, seat of the empire") || nameL.includes("sokenzan, crucible of defiance");
            if (!isEssentialEngineLand) {
              continue; // Ignorar el resto
            }
          }
          
          // Comprobar si está vetada
          const isBanned = BATTLEBOX_VETOS.includes(dbCard.name) || 
                           (formData.customBanlist && formData.customBanlist.toLowerCase().includes(dbCard.name.toLowerCase()));
          
          if (isBanned) {
            const isCreature = typeLine.includes('creature');
            const replacementName = getIntelligentSubstitution(dbCard.name, isCreature ? 'creature' : 'spell');
            let replacementCard = allCards.find(ac => ac && ac.name && ac.name.toLowerCase() === replacementName.toLowerCase());
            if (replacementCard) {
              banlistSwaps.push({ original: dbCard.name, replacement: replacementCard.name });
              dnaSpells.push({
                name: replacementCard.name,
                quantity: item.quantity,
                category: replacementCard.type_line?.toLowerCase().includes('creature') ? 'Creature' : (replacementCard.type_line?.toLowerCase().includes('instant') ? 'Instant' : 'Spell'),
                cmc: replacementCard.mana_value || replacementCard.cmc || 2,
                role: 'substitution_banned',
                mana_cost: replacementCard.mana_cost || '',
                type_line: replacementCard.type_line || '',
                isMustInclude: true
              });
              addLog(`[SENDA 2 VETO] Carta vetada "${dbCard.name}" sustituida por "${replacementCard.name}".`);
            }
          } else {
            // COMPROBACIÓN DE COSTES TRIPLES EXTREMOS (Acordado en Grill-Me)
            let finalCard = dbCard;
            let finalQty = item.quantity;
            let finalRole = 'competitivo_dna';
            
            const cost = dbCard.mana_cost || '';
            const isTripleColor = cost.includes('{W}{W}{W}') || cost.includes('{U}{U}{U}') || cost.includes('{B}{B}{B}') || cost.includes('{R}{R}{R}') || cost.includes('{G}{G}{G}');
            const hasManyColors = (formData.colores || []).length >= 3;
            
            if (isTripleColor && hasManyColors) {
              const isCreature = typeLine.includes('creature');
              const replacementName = getIntelligentSubstitution(dbCard.name, isCreature ? 'creature' : 'spell');
              let replacementCard = allCards.find(ac => ac && ac.name && ac.name.toLowerCase() === replacementName.toLowerCase());
              if (replacementCard) {
                banlistSwaps.push({ original: dbCard.name, replacement: `${replacementCard.name} (exceso pips)` });
                finalCard = replacementCard;
                finalRole = 'substitution_heavy_pips';
                addLog(`[SENDA 2 PIPS] Coste triple "${dbCard.name}" en mazo tricolor+ sustituido por "${replacementCard.name}" para evitar atascos de maná.`);
              }
            }
            
            dnaSpells.push({
              name: finalCard.name,
              quantity: finalQty,
              category: finalCard.type_line?.toLowerCase().includes('creature') ? 'Creature' : (finalCard.type_line?.toLowerCase().includes('instant') ? 'Instant' : 'Spell'),
              cmc: finalCard.mana_value || finalCard.cmc || 2,
              role: finalRole,
              mana_cost: finalCard.mana_cost || '',
              type_line: finalCard.type_line || ''
            });
          }
        } else {
          dnaSpells.push({
            name: item.name,
            quantity: item.quantity,
            category: 'Spell',
            cmc: 2,
            role: 'competitivo_dna_desconocido',
            mana_cost: '',
            type_line: ''
          });
        }
      }
      
      // AUDITORÍA FASE: ENSAMBLADOR
      const trackedDnaSpells = trackDeckEntries(dnaSpells, 'ENSAMBLADOR', 'Senda2_DNA');
      logDeckSnapshot(trackedDnaSpells, 'ENSAMBLADOR', blueprint, addLog);
      auditBlueprintInvariants(trackedDnaSpells, blueprint, 'ENSAMBLADOR', addLog);

      // 2. Consolidar copias duplicadas y aplicar capado
      const consolidatedMap = new Map();
      for (const card of trackedDnaSpells) {
        const key = card.name.toLowerCase();
        if (consolidatedMap.has(key)) {
          const ext = consolidatedMap.get(key);
          ext.quantity += card.quantity;
          ext.copies += card.copies;
        } else {
          consolidatedMap.set(key, { ...card });
        }
      }
      
      let finalSpells = Array.from(consolidatedMap.values());
      
      // AUDITORÍA FASE: CONSOLIDACIÓN
      computeDeckDiff(trackedDnaSpells, finalSpells, 'CONSOLIDACIÓN', 'Consolidación de duplicados', addLog);
      logDeckSnapshot(finalSpells, 'CONSOLIDACIÓN', blueprint, addLog);
      
      for (const card of finalSpells) {
        const cap = getMaxAllowedCopies(card.name, card.category, card.cmc, allCards);
        if (card.quantity > cap) {
          addLog(`[SENDA 2 BYPASS] Capando "${card.name}" de ${card.quantity} a ${cap} copias por reglas de consistencia.`);
          card.quantity = cap;
          card.copies = cap;
        }
      }
      
      // AUDITORÍA FASE: CONTROL_DE_CAPS
      computeDeckDiff(Array.from(consolidatedMap.values()), finalSpells, 'CONTROL_DE_CAPS', 'Capado de copias máximas', addLog);
      logDeckSnapshot(finalSpells, 'CONTROL_DE_CAPS', blueprint, addLog);

      // 3. Determinar tamaño de la baraja y cantidad de tierras
      const hasYorion = finalSpells.some(s => s.name.toLowerCase().includes("yorion, sky nomad")) || 
                       (formData.companero && formData.companero.toLowerCase().includes("yorion"));
      const deckSize = hasYorion ? 80 : 60;
      
      const targetLandCount = calculatePerfectLandCount(finalSpells, formData, hasYorion);
      const targetSpellsCount = deckSize - targetLandCount;
      
      // 4. Cuadrar hechizos (inyectar o recortar)
      let currentSpellsSum = finalSpells.reduce((sum, c) => sum + c.quantity, 0);
      const prevSpellsBeforeSquare = [...finalSpells];
      
      if (currentSpellsSum < targetSpellsCount) {
        addLog(`[SENDA 2 BYPASS] Déficit de hechizos (${currentSpellsSum}/${targetSpellsCount}). Inyectando del RAG pool...`);
        const tempRag = await buildCardPool({
          ...formData,
          injectedCoreNames: finalSpells.map(s => s.name),
          excludedNames: finalSpells.map(s => s.name)
        });
        
        finalSpells = distribuirOInyectarHechizosFaltantes(finalSpells, targetSpellsCount, formData.colores || [], addLog, tempRag.pool, formData);
      } else if (currentSpellsSum > targetSpellsCount) {
        addLog(`[SENDA 2 BYPASS] Exceso de hechizos (${currentSpellsSum}/${targetSpellsCount}). Recortando excedentes...`);
        const mustIncludeNamesList = (formData.mustInclude || '').toLowerCase().split(/[,\n]/).map(s => s.trim()).filter(Boolean);
        finalSpells = recortarHechizosExcedentesInteligente(finalSpells, targetSpellsCount, addLog, mustIncludeNamesList);
      }
      
      finalSpells = finalSpells.filter(c => c.category !== 'Land');
      computeDeckDiff(prevSpellsBeforeSquare, finalSpells, 'AJUSTE_CUADRADO_SPELLS', 'Cuadrado numérico de hechizos', addLog);
      
      // 5. Calcular pips de maná y generar la base de tierras
      const recalculatedPips = { W: 0, U: 0, B: 0, R: 0, G: 0 };
      finalSpells.forEach(card => {
        let cost = card.mana_cost || '';
        const qty = Number(card.quantity || 1);
        let hasPips = false;
        if (cost.includes('{W}')) { recalculatedPips.W += (cost.match(/\{W\}/g) || []).length * qty; hasPips = true; }
        if (cost.includes('{U}')) { recalculatedPips.U += (cost.match(/\{U\}/g) || []).length * qty; hasPips = true; }
        if (cost.includes('{B}')) { recalculatedPips.B += (cost.match(/\{B\}/g) || []).length * qty; hasPips = true; }
        if (cost.includes('{R}')) { recalculatedPips.R += (cost.match(/\{R\}/g) || []).length * qty; hasPips = true; }
        if (cost.includes('{G}')) { recalculatedPips.G += (cost.match(/\{G\}/g) || []).length * qty; hasPips = true; }
        
        if (!hasPips && card.color_identity) {
          card.color_identity.forEach(col => {
            const upperCol = String(col).toUpperCase();
            if (recalculatedPips[upperCol] !== undefined) {
              recalculatedPips[upperCol] += 1 * qty;
            }
          });
        }
      });
      
      const requestedColors = formData.colores || [];
      const usedColors = Object.keys(recalculatedPips).filter(color => recalculatedPips[color] > 0 || requestedColors.includes(color));
      
      const utilityLandsToRecommend = archetypeObj.signatureCards || [];
      
      addLog(`[SENDA 2 BYPASS] Generando base de tierras de Battle Box con target ${targetLandCount} tierras...`);
      const newLands = await generateManaBase(
        recalculatedPips, 
        targetLandCount, 
        usedColors, 
        formData, 
        finalSpells, 
        utilityLandsToRecommend
      );
      
      const finalMainDeck = [...finalSpells, ...newLands];
      
      // AUDITORÍA FASE: CÁLCULO_DE_TIERRAS & CONSOLIDACIÓN_SUPREMA
      logDeckSnapshot(finalMainDeck, 'CÁLCULO_DE_TIERRAS', blueprint, addLog);
      logDeckSnapshot(finalMainDeck, 'CONSOLIDACIÓN_SUPREMA', blueprint, addLog);
      auditBlueprintInvariants(finalMainDeck, blueprint, 'CONSOLIDACIÓN_SUPREMA', addLog);

      
      // 7. Generar Sideboard dinámico de 15 cartas
      onProgress('assembler', '🛡️ Sideboard Architect analizando debilidades del mazo...');
      addLog(`[SENDA 2 BYPASS] Generando sideboard dinámico...`);
      let rawSideboard = [];
      try {
        rawSideboard = await forgeSideboard(finalSpells, formData, aiConfig);
      } catch (errSide) {
        addLog(`[SENDA 2 BYPASS WARNING] Fallo al generar sideboard con IA, usando fallback genérico: ${errSide.message}`);
        rawSideboard = finalSpells.slice(0, 15).map(c => ({ ...c, quantity: 1, role: 'sideboard_fallback' }));
      }
      
      // 8. Llamada rápida a la IA para redactar la metadata (Nombre, Lore, Mulligan, Estrategia) en español
      onProgress('judge', '🔮 Revelación del Oráculo IA (Generando metadatos)...');
      addLog(`[SENDA 2 BYPASS] Invocando Oráculo para obtener metadatos...`);
      
      let deckName = archetypeObj.label;
      let lore = `Una baraja fiel a la estrategia competitiva de ${archetypeObj.label} en formato ${formData.format || 'MODERN'}.`;
      let strategyText = `Usa tus hechizos principales para dominar el tablero según el plan de juego clásico de ${archetypeObj.label}.`;
      let mulliganText = `Busca manos iniciales equilibradas con al menos 2-3 fuentes de maná de tus colores principales y juego temprano en curva.`;
      
      try {
        const metadataPrompt = `
Eres el "Master Deck Architect". Hemos construido un mazo competitivo real:
- Arquetipo: ${archetypeObj.label}
- Cartas Hechizos: ${finalSpells.slice(0, 20).map(c => `${c.quantity}x ${c.name}`).join(', ')}
- Formato: ${formData.format || 'MODERN'}

Genera los campos de metadatos del mazo en JSON puro en español:
{
  "deckName": "Nombre temático evocador y competitivo en español para el mazo",
  "lore": "Una frase de lore épico e histórico de este mazo en español",
  "strategy": "Plan de juego principal y cómo ganar (1-2 frases en español)",
  "mulligan": "Qué manos iniciales quedarse (1-2 frases en español)"
}
`;
        const metaResponse = await callAI([
            { role: 'system', content: 'Genera metadatos del mazo en JSON puro en español.' },
            { role: 'user', content: metadataPrompt }
        ], aiConfig, { forceJSON: true, maxTokens: 400 });
        
        const parsedMeta = typeof metaResponse === 'string' ? cleanAndParseJSON(metaResponse) : metaResponse;
        if (parsedMeta) {
          if (parsedMeta.deckName) deckName = parsedMeta.deckName;
          if (parsedMeta.lore) lore = parsedMeta.lore;
          if (parsedMeta.strategy) strategyText = parsedMeta.strategy;
          if (parsedMeta.mulligan) mulliganText = parsedMeta.mulligan;
        }
      } catch (errMeta) {
        addLog(`[SENDA 2 BYPASS WARNING] Fallo al generar metadatos por IA, usando fallback estático: ${errMeta.message}`);
      }
      
      const deckDNA60 = blueprint?.deckDNA60 || createDeckDNA60(formData, archetypeObj);
      const radarEvaluation = evaluateConsistencyRadar(finalMainDeck, deckDNA60);

      addLog(`[SENDA 2 BYPASS] Mazo generado exitosamente de forma determinista y fiel. Salud Radar: ${radarEvaluation.overallHealth}%`);
      onProgress('done', '✨ Mazo predefinido forjado con éxito.');
      
      return {
        cards: finalMainDeck,
        sideboard: rawSideboard,
        sideboard_strategy: strategyText,
        deckName: deckName,
        lore: lore,
        strategy: strategyText,
        mulligan: mulliganText,
        archetype: archetypeObj.label,
        banlistSwaps: banlistSwaps,
        deckDNA60,
        radarEvaluation,
        generationLogs: {
          logs: logs,
          systemPrompt: 'Bypass determinista Senda 2',
          contextPrompt: '',
          rawResponse: 'Determinista',
          error: null
        }
      };

    }
    // --- FIN DE BYPASS DETERMINISTA SENDA 2 ---

    const selectedFormat = (formData.format || 'modern').toLowerCase();
    const bannedCards = allCards.filter(c => c.legalities && c.legalities[selectedFormat] === 'banned').map(c => c.name);
    const bannedText = bannedCards.length > 0 
      ? `\n\n9. BANNED CARDS AWARENESS: You MUST NOT include, suggest or rely on the following cards, as they are BANNED in the selected format (${selectedFormat}): ${bannedCards.join(', ')}. If the archetype historically depended on them, design a legal modern adaptation without them.` 
      : "";

    // 2. Inyectar Core y mezclar con Must-Includes
    onProgress('strategist', '🧪 Inyectando Núcleos de Estrategia y Requisitos obligatorios...');
    
    // --- NUEVO: Inyectar Combos Dinámicos ---
    const dynamicCombos = await buscarCombosDinamicos(strategyId, formData.format || 'MODERN');
    if (dynamicCombos.length > 0) {
      addLog(`[COMBOS] Inyectando ${dynamicCombos.length} combos desde Commander Spellbook.`);
      const comboCardsList = [];
      dynamicCombos.forEach(combo => {
        combo.cards.forEach(c => comboCardsList.push(c.name));
      });
      const comboCardsText = comboCardsList.join(',');
      
      if (formData.mustInclude) {
        formData.mustInclude += `,${comboCardsText}`;
      } else {
        formData.mustInclude = comboCardsText;
      }
    }
    const hasTribe = formData.tribe && formData.tribe !== 'none' && formData.tribe !== 'ninguna';
    let coreCards = [];
    if (hasTribe) {
      const baseCore = injectCorePackage(strategyId, formData.colores || [], formData.format || 'MODERN', allCards);
      if (baseCore && baseCore.length > 0) {
        const tribeIdLower = (formData.tribe || '').toLowerCase();
        const activeTribe = MTG_TRIBES.find(t => 
          (t.id || '').toLowerCase() === tribeIdLower || 
          (t.label || '').toLowerCase() === tribeIdLower
        );
        const tribalSubtypes = activeTribe && activeTribe.subtypes 
          ? activeTribe.subtypes.map(s => s.toLowerCase()) 
          : [tribeIdLower];
          
        coreCards = baseCore.map(card => {
          const typeLineLower = (card.type_line || '').toLowerCase();
          const isCreature = typeLineLower.includes('creature');
          if (isCreature) {
            const belongsToTribe = tribalSubtypes.some(sub => typeLineLower.includes(sub));
            if (!belongsToTribe) {
              addLog(`[SENDA 1 TRIBAL CORE] Capando criatura no-tribal de soporte "${card.name}" a 2 copias.`);
              return { ...card, quantity: Math.min(2, card.quantity) };
            }
          }
          return card;
        });
      }
    } else {
      coreCards = injectCorePackage(strategyId, formData.colores || [], formData.format || 'MODERN', allCards);
    }
    const mergedCoreAndMustInclude = mergeUserMustIncludeWithCore(formData.mustInclude, coreCards, allCards, formData.format || 'MODERN', blueprint.totalSpells, addLog);
    const injectedCoreNames = mergedCoreAndMustInclude.filter(c => c && typeof c.name === 'string').map(c => c.name);
    const excludedNames = mergedCoreAndMustInclude.filter(c => c && typeof c.name === 'string').map(c => c.name);
    const mustIncludeNamesList = mergedCoreAndMustInclude.filter(c => c && c.isMustInclude && typeof c.name === 'string').map(c => c.name.toLowerCase());

    // 3. Carga el pool del RAG con el boost relacional de los inyectados
    onProgress('strategist', '🔍 Oráculo RAG escaneando biblioteca (filtrando élite)...');
    const ragResult = await buildCardPool({
      ...formData,
      injectedCoreNames,
      excludedNames,
      blueprintRoles: blueprint.roles,
      dnaSkeleton: dnaSkeleton
    });
    const poolText = ragResult.pool.map(c => `- ${c.name} (Coste: ${c.mana_cost || '?'}, Tipo: ${c.type_line}, Oracle: "${(c.oracle_text || '').replace(/\n/g, ' ').replace(/"/g, "'")}", Meta: ${c.metaPercent}%, Sinergia: ${c.score})`).join('\n');
    addLog(`RAG pool seleccionado con ${ragResult.pool.length} cartas.`);

    // GUARDIA: Pool mínimo viable
    if (ragResult.pool.length < 80) {
      const errorMsg = `⚠️ La base de datos local solo contiene ${ragResult.pool.length} cartas utilizables para "${formData.archetype || 'el arquetipo seleccionado'}". Se necesitan al menos 80 cartas en el pool para generar un mazo competitivo. Por favor, importa el archivo JSON completo de Scryfall (default-cards.json u oracle-cards.json) desde la pantalla principal para poblar la base de datos local.`;
      addLog(`[ERROR POOL INSUFICIENTE] ${errorMsg}`);
      throw new Error(errorMsg);
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
    const logBlueprint = `═══ BLUEPRINT ═══\nPlano: ${formData.archetype} + ${strategyId}\n` + 
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
    const logRag = `═══ RAG POOL (Top 10) ═══\n${top10}\n  Distribución: CMC1→${cmcDist[1]||0} | CMC2→${cmcDist[2]||0} | CMC3→${cmcDist[3]||0} | CMC4→${cmcDist[4]||0} | CMC5+→${cmcDist[5]||0}`;
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

        // === CLASIFICADOR SEMÁNTICO DE ROLES (MULTI-FASE) ===
    const phase1Keywords = /core|combo|lord|finisher|payoff|commander|threat/i;
    const phase3Keywords = /removal|counter|interaction|protection|disruption|tax|sweeper|board_wipe/i;
    
    const phase1Roles = [];
    const phase2Roles = [];
    const phase3Roles = [];

    blueprint.roles.forEach(role => {
      if (phase1Keywords.test(role.name) || role.finisherQuality === 'finisher') {
        phase1Roles.push(role);
      } else if (phase3Keywords.test(role.name)) {
        phase3Roles.push(role);
      } else {
        phase2Roles.push(role);
      }
    });

    addLog(`[AGENTIC FLOW] Clasificación de Roles: Fase 1 (${phase1Roles.length}), Fase 2 (${phase2Roles.length}), Fase 3 (${phase3Roles.length})`);

    let currentDeckContext = [];
    const paramsForPrompt = {
      colors: formData.colores || [],
      archetype: formData.archetype,
      tribe: formData.tribe,
      strategy: formData.strategy || strategyId,
      userPrompt: formData.prompt,
      archData: archetypeObj,
      dnaSkeleton: dnaSkeleton,
      rarityMode: activeRarityMode,
      engineFlavor: formData.engineFlavor || null,
      vetoedKeywords: formData.vetoedKeywords || [],
      vetoedCards: formData.vetoedCards || []
    };

    const runAgenticPhase = async (phaseName, targetRoles, attemptName) => {
      if (targetRoles.length === 0) return [];
      addLog(`[AGENTIC FLOW] Iniciando ${phaseName}...`);
      onProgress('assembler', `🤖 [${phaseName}] ${attemptName}...`);
      
      const activationSignals = extractActivationSignals(currentDeckContext, ragResult.pool);
      if (activationSignals.length > 0) {
        addLog(`[PHASE MEMORY] Inferencia dinámica: señales activadas = [${activationSignals.join(', ')}]`);
      }
      
      let userVetoText = "";
      if (formData.vetoedKeywords && formData.vetoedKeywords.length > 0) {
        const kws = Array.isArray(formData.vetoedKeywords) ? formData.vetoedKeywords : String(formData.vetoedKeywords).split(',');
        userVetoText += `\n- STRICT VETO: Do NOT suggest or include cards featuring these mechanics/keywords under any circumstance: ${kws.map(k => k.trim()).join(', ')}.`;
      }
      if (formData.vetoedCards && formData.vetoedCards.length > 0) {
        const vcs = Array.isArray(formData.vetoedCards) ? formData.vetoedCards.map(c => typeof c === 'string' ? c : c.name || '') : String(formData.vetoedCards).split(',');
        userVetoText += `\n- STRICT VETO: Do NOT suggest or include these specific cards under any circumstance: ${vcs.map(v => v.trim()).join(', ')}.`;
      }
      if (formData.engineFlavor) {
        userVetoText += `\n- STRATEGIC FOCUS: Prioritize and enforce compatibility with the selected engine/flavor: "${formData.engineFlavor}".`;
      }

      const phasePrompt = buildAgenticPhasePrompt(paramsForPrompt, phaseName, targetRoles, currentDeckContext, activationSignals);
      const contextGen_Prompt = `
      === RAG CARD POOL (MANDATORY SOURCE) ===
      Select cards primarily from this pre-filtered competitive pool:
      ${poolText}
      ========================================
      ${formData.prompt ? `\n=== STRICT OVERRIDE: USER INSTRUCTIONS ===\n"${formData.prompt}"\n========================================` : ''}
      ${userVetoText}
      `;

      try {
        const responseJson = await callAI([
            { role: 'system', content: phasePrompt },
            { role: 'user', content: contextGen_Prompt }
        ], aiConfig, { 
          forceJSON: true, maxTokens: 4000, schema: GEMINI_PHASE_SCHEMA,
          tools: DECK_BUILDER_TOOLS,
          onRetry: (attempt, delay, status) => {
            onProgress('assembler', `⏳ ${phaseName} saturada (${status}). Reintento ${attempt}...`);
            addLog(`[Retry ${phaseName}] Intento ${attempt}, status: ${status}`);
          }
        });
        
        const parsed = typeof responseJson === 'string' ? cleanAndParseJSON(responseJson) : responseJson;
        return (parsed && Array.isArray(parsed.cards)) ? parsed.cards : [];
      } catch (error) {
        addLog(`[Error ${phaseName}]: ${error.message}`);
        return [];
      }
    };

    // FASE 1: Núcleo y Motores
    const phase1Cards = await runAgenticPhase("FASE 1 (Núcleo y Motores)", phase1Roles, "Motores y Finishers");
    currentDeckContext = [...currentDeckContext, ...phase1Cards];

    // FASE 2: Sinergias y Alimento
    const phase2Cards = await runAgenticPhase("FASE 2 (Sinergias y Alimento)", phase2Roles, "Sinergias y Soporte");
    currentDeckContext = [...currentDeckContext, ...phase2Cards];

    // FASE 3: Interacción y Pegamento
    const phase3Cards = await runAgenticPhase("FASE 3 (Pegamento e Interacción)", phase3Roles, "Interacción y PROTECCIÓN");
    currentDeckContext = [...currentDeckContext, ...phase3Cards];

    addLog("[AGENTIC FLOW] Todas las fases completadas exitosamente.");

    // AUDITORÍA FASE: ENSAMBLADOR
    currentDeckContext = trackDeckEntries(currentDeckContext, 'ENSAMBLADOR', 'Senda1_Agentic');
    logDeckSnapshot(currentDeckContext, 'ENSAMBLADOR', blueprint, addLog);
    auditBlueprintInvariants(currentDeckContext, blueprint, 'ENSAMBLADOR', addLog);

    // --- NUEVO PASO: FASE 4 - BUCLE DE DEBATE DE COMITÉ (PRO TOUR COMMITTEE DEBATE) ---
    addLog("[AGENTIC FLOW] Iniciando Bucle de Debate de Comité (Pro Tour Committee Debate)...");
    onProgress('assembler', '⚖️ Comité de Agentes (Estratega + Auditor) debatiendo optimizaciones...');
    
    let debateIteration = 0;
    const maxDebateIterations = 2;
    let debateFinished = false;

    while (debateIteration < maxDebateIterations && !debateFinished) {
      debateIteration++;
      addLog(`[AGENTIC FLOW] Iteración de Debate ${debateIteration} de ${maxDebateIterations}`);
      const prevContextBeforeDebate = [...currentDeckContext];
      
      try {
        const internalAudit = await internalSynergyAudit(currentDeckContext, formData, aiConfig);
        
        const hasSuggestions = internalAudit && internalAudit.suggestions && internalAudit.suggestions.length > 0;
        const hasAlerts = internalAudit && internalAudit.criticalAlerts && internalAudit.criticalAlerts.length > 0;
        
        if (!hasSuggestions && !hasAlerts) {
          addLog(`[AGENTIC FLOW] Auditoría limpia en iteración ${debateIteration}. Finalizando debate.`);
          debateFinished = true;
          break;
        }

        // Formatear alertas y sugerencias
        const criticalAlertsText = (internalAudit.criticalAlerts || []).join('\n');
        const suggestionsText = (internalAudit.suggestions || []).map(sug => sug.text).join('\n');
        
        // Formatear baraja actual
        const currentDeckListText = currentDeckContext.map(c => `${c.quantity}x ${c.name} (Rol: ${c.role}, CMC: ${c.cmc || '?'})`).join('\n');
        
        // Formatear pool del RAG para que la IA elija de ahí
        const ragPoolListText = ragResult.pool.slice(0, 40).map(c => `- ${c.name} (CMC: ${c.mana_value}, Tipo: ${c.type_line}, Sinergia: ${c.score})`).join('\n');
        
        const criticSystemPrompt = `Eres un "Pro Tour Deck Auditor", un refinador y crítico experto de barajas competitivas de Magic: The Gathering.
Tu misión es optimizar y corregir el borrador de hechizos que te proporciona el Diseñador, resolviendo todas las alertas y sugerencias señaladas por el Juez Interno.
Estás en la ronda de debate número ${debateIteration} de ${maxDebateIterations}.

=== DATOS DE CONSTRUCCIÓN ===
- Arquetipo: ${formData.archetype || 'Midrange'}
- Estrategia: ${strategyObj.label || strategyId || 'General'}
- Tribu: ${tribeLabel}
- Colores: [${baseIdent_ColorStr}]
- Formato: ${formData.format || 'MODERN'}
- Instrucciones del Usuario / Temática: ${formData.prompt || 'Ninguno'}

=== REPORTE DEL JUEZ INTERNO ===
Alertas Críticas:
${criticalAlertsText || 'Ninguna'}

Sugerencias de Cambio:
${suggestionsText || 'Ninguna'}

=== POOL DE CARTAS RAG COMPATIBLES (SELECCIÓN PRE-FILTRADA) ===
Para tus reemplazos, prioriza siempre cartas de este pool de alta calidad:
${ragPoolListText}

=== DIRECTRICES DE OPTIMIZACIÓN (CRÍTICAS) ===
1. Resuelve todos los problemas señalados por el Juez Interno realizando swaps (intercambios) de cartas coherentes.
2. Mantén la cantidad total de copias de hechizos exactamente en ${blueprint.totalSpells} copias.
3. Asegura que todas las cartas que agregues sean legales en el formato (${formData.format || 'MODERN'}) y compartan la identidad de color permitida ([${baseIdent_ColorStr}]).
4. Si la tribu es "${tribeLabel}" (y no es 'Ninguna'), prioriza criaturas de esa tribu para no diluir la sinergia.
5. NO incluyas tierras de ningún tipo.
6. Tu respuesta final debe ser exclusivamente un objeto JSON que siga el esquema requerido, detallando tu razonamiento en español y proporcionando la lista definitiva y optimizada de hechizos en 'optimized_cards'.`;

        const criticUserPrompt = `A continuación se muestra el borrador actual de hechizos para optimizar:

=== BORRADOR ACTUAL DE HECHIZOS (SIN TIERRAS) ===
${currentDeckListText}

Genera la lista de hechizos completamente corregida y optimizada en JSON.`;

        const criticResponse = await callAI([
          { role: 'system', content: criticSystemPrompt },
          { role: 'user', content: criticUserPrompt }
        ], aiConfig, { forceJSON: true, maxTokens: 2000, schema: OPTIMIZATION_SCHEMA });

        const parsedCritic = typeof criticResponse === 'string' ? cleanAndParseJSON(criticResponse) : criticResponse;
        
        if (parsedCritic && parsedCritic.optimized_cards && parsedCritic.optimized_cards.length > 0) {
          addLog(`[AGENTIC CRITIC - DEBATE ROUND ${debateIteration}] Razón del cambio: ${parsedCritic.reasoning}`);
          
          const newDeckContext = [];
          for (const oc of parsedCritic.optimized_cards) {
            let dbCard = allCards.find(ac => ac && ac.name && ac.name.toLowerCase() === oc.name.toLowerCase());
            if (!dbCard) {
              dbCard = allCards.find(ac => ac && ac.name && ac.name.toLowerCase().includes(oc.name.toLowerCase()));
            }
            
            if (dbCard) {
              newDeckContext.push({
                name: dbCard.name,
                quantity: oc.quantity || 1,
                category: dbCard.type_line?.toLowerCase().includes('creature') ? 'Creature' : (dbCard.type_line?.toLowerCase().includes('instant') ? 'Instant' : 'Spell'),
                cmc: dbCard.mana_value || dbCard.cmc || 2,
                role: oc.role || 'optimizer_swap',
                mana_cost: dbCard.mana_cost || '',
                type_line: dbCard.type_line || ''
              });

              const existsInRag = ragResult.pool.some(p => p.name.toLowerCase() === dbCard.name.toLowerCase());
              if (!existsInRag) {
                ragResult.pool.push({
                  id: dbCard.id || `custom-${dbCard.name.replace(/\s+/g, '-').toLowerCase()}`,
                  name: dbCard.name,
                  mana_value: dbCard.mana_value || dbCard.cmc || 2,
                  type_line: dbCard.type_line || '',
                  oracle_text: dbCard.oracle_text || '',
                  colors: dbCard.colors || [],
                  color_identity: dbCard.color_identity || [],
                  mana_cost: dbCard.mana_cost || '',
                  rarity: dbCard.rarity || 'common',
                  score: 999,
                  metaPercent: 0
                });
              }
            } else {
              addLog(`[AGENTIC CRITIC] Advertencia: No se encontró la carta "${oc.name}" en la base de datos local. Omitiendo swap.`);
            }
          }

          if (newDeckContext.length > 0) {
            const newTotal = newDeckContext.reduce((sum, c) => sum + c.quantity, 0);
            addLog(`[AGENTIC CRITIC] Mazo optimizado con éxito en ronda ${debateIteration}. Nuevo total de copias: ${newTotal} (Objetivo: ${blueprint.totalSpells})`);
            currentDeckContext = newDeckContext;
            computeDeckDiff(prevContextBeforeDebate, currentDeckContext, `AUDITOR_DEBATE_${debateIteration}`, parsedCritic.reasoning, addLog);
          }
        }
      } catch (e) {
        addLog(`[AGENTIC FLOW] Error en Debate Iteración ${debateIteration}: ${e.message}`);
        debateFinished = true;
      }
    }

    // AUDITORÍA FASE: AUDITOR
    currentDeckContext = trackDeckEntries(currentDeckContext, 'AUDITOR', 'Senda1_Committee');
    logDeckSnapshot(currentDeckContext, 'AUDITOR', blueprint, addLog);
    auditBlueprintInvariants(currentDeckContext, blueprint, 'AUDITOR', addLog);


    // Transformar el resultado al formato compatible con el assemblerLoop actual, preservando la cantidad elegida por la IA (Problema 2)
    let rankedCards = currentDeckContext.map((c, index) => ({
      name: c.name,
      role: c.role,
      priority: 1, // Prioridad 1 porque la IA eligió la cantidad exacta
      quantity: c.quantity,
      toolbox: false
    }));

    let metricsPIPsStruct = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    
    addLog(`[ENSAMBLADOR] Llenando Blueprint determinista (total spells objetivo: ${blueprint.totalSpells})`);
  let assembledSpells = assemblerLoop(
    rankedCards,
    blueprint,
    mergedCoreAndMustInclude,
    formData.colores || [],
    formData.format || 'MODERN',
    ragResult.pool,
    strategyId,
    addLog,
    formData
  );

  addLog(`[ENSAMBLADOR] Hechizos ensamblados: ${assembledSpells.length} tipos de cartas.`);

  // Ajuste iterativo de curva
  addLog(`[CURVA DE MANÁ] Ajustando curva de MANÁ para perfil: ${curveProfile}`);
  assembledSpells = adjustManaCurve(
    assembledSpells,
    curveProfile,
    ragResult.pool,
    strategyId,
    formData.colores || [],
    addLog
  );

  // --- NUEVO FASE 2: VALIDACIÓN DE CONDICIONES DE VICTORIA (Problema 5) ---
  assembledSpells = validarCondicionesDeVictoria(
    assembledSpells,
    strategyId,
    formData.archetype,
    ragResult.pool,
    addLog,
    formData
  );

  let sanitizedFinals_ArraySpells = assembledSpells;

  const hasYorion = sanitizedFinals_ArraySpells.some(s => s && typeof s.name === 'string' && s.name.toLowerCase().includes("yorion, sky nomad")) || (formData?.companero && typeof formData.companero === 'string' && formData.companero.toLowerCase().includes("yorion"));
  const deckSize = hasYorion ? 80 : 60;

  // 1. Primer paso: Ejecutar aplicarJuezFinal solo para HECHIZOS (spellAuditOnly=true, preserveLands=true, preserveSpells=false)
  addLog("[FASE 1] Ejecutando Auditoría de Hechizos Inicial...");
  let validResultsStruct = { cards: sanitizedFinals_ArraySpells };
  const spellJuezResult = await aplicarJuezFinal(validResultsStruct, dnaData, formData, addLog, ragResult.pool, true, true, false, blueprint);


  let auditedSpells = (spellJuezResult.cards || []).filter(c => c && c.category !== 'Land');

  // AUDITORÍA FASE: JUEZ
  auditedSpells = trackDeckEntries(auditedSpells, 'JUEZ', 'AplicarJuezFinal');
  computeDeckDiff(sanitizedFinals_ArraySpells, auditedSpells, 'JUEZ', 'Auditoría inicial de hechizos del Juez', addLog);
  logDeckSnapshot(auditedSpells, 'JUEZ', blueprint, addLog);
  auditBlueprintInvariants(auditedSpells, blueprint, 'JUEZ', addLog);

  // 2. CONSOLIDACIÓN de hechizos (caps y control de duplicados antes de tierras)
  addLog("[FASE 1] Consolidando hechizos y aplicando caps antes del cálculo de tierras...");
  const consolidatedSpellsMap = new Map();
  for (const card of auditedSpells) {
      if (!card.name || card.quantity <= 0) continue;
      const nameClean = card.name.trim();
      const key = nameClean.toLowerCase();
      if (consolidatedSpellsMap.has(key)) {
          const existing = consolidatedSpellsMap.get(key);
          existing.quantity += card.quantity;
          if (!existing.role && card.role) existing.role = card.role;
          if (!existing.category && card.category) existing.category = card.category;
          if ((existing.cmc === undefined || existing.cmc === null) && card.cmc !== undefined) existing.cmc = card.cmc;
      } else {
          consolidatedSpellsMap.set(key, { ...card, name: nameClean });
      }
  }

  let consolidatedSpells = Array.from(consolidatedSpellsMap.values());

  // AUDITORÍA FASE: CONSOLIDACIÓN
  computeDeckDiff(auditedSpells, consolidatedSpells, 'CONSOLIDACIÓN', 'Consolidación de hechizos duplicados', addLog);
  logDeckSnapshot(consolidatedSpells, 'CONSOLIDACIÓN', blueprint, addLog);

  // Aplicar getMaxAllowedCopies
  for (const card of consolidatedSpells) {
      const cap = getMaxAllowedCopies(card.name, card.category, card.cmc, ragResult.pool);
      if (card.quantity > cap) {
          addLog(`[CONSOLIDACIÓN SP] Redundancia CRÍTICA en "${card.name}": ${card.quantity} copias exceden el límite de ${cap}. Capando a ${cap}.`);
          card.quantity = cap;
      }
  }

  // AUDITORÍA FASE: CONTROL_DE_CAPS
  computeDeckDiff(Array.from(consolidatedSpellsMap.values()), consolidatedSpells, 'CONTROL_DE_CAPS', 'Capado de copias máximas', addLog);
  logDeckSnapshot(consolidatedSpells, 'CONTROL_DE_CAPS', blueprint, addLog);


  // Calcular el land count objetivo final
  let metricalTargetLnd = calculatePerfectLandCount(consolidatedSpells, formData, hasYorion);

  // === VALIDACIÓN SEMÁNTICA DE ESTRATEGIA Y CURVA ===
  let totalSpellsCmc = 0;
  let totalSpellsQty = 0;
  consolidatedSpells.forEach(c => {
    const qty = c.quantity || 1;
    const cmc = c.cmc ?? c.mana_value ?? 2;
    totalSpellsCmc += cmc * qty;
    totalSpellsQty += qty;
  });
  const avgCmcSpells = totalSpellsQty > 0 ? (totalSpellsCmc / totalSpellsQty) : 0;
  
  const lowCmcRampCount = consolidatedSpells.filter(c => {
    const cmc = c.cmc ?? c.mana_value ?? 2;
    const isRamp = (c.role || '').toLowerCase().includes('ramp') || 
                   (c.role || '').toLowerCase().includes('dork') ||
                   (c.oracle_text || '').toLowerCase().includes('search your library for a land') ||
                   (c.oracle_text || '').toLowerCase().includes('search your library for a basic land') ||
                   (c.oracle_text || '').toLowerCase().includes('add ');
    return cmc <= 2 && isRamp;
  }).reduce((sum, c) => sum + (c.quantity || 1), 0);

  const earlyInteractionCount = consolidatedSpells.filter(c => {
    const cmc = c.cmc ?? c.mana_value ?? 2;
    const nameL = (c.name || '').toLowerCase();
    const roleL = (c.role || '').toLowerCase();
    const isInter = roleL.includes('removal') || roleL.includes('interaction') || roleL.includes('counter') ||
                    nameL.includes('counterspell') || nameL.includes('push') || nameL.includes('bolt') || nameL.includes('path to exile') || nameL.includes('swords');
    return cmc <= 2 && isInter;
  }).reduce((sum, c) => sum + (c.quantity || 1), 0);

  if (avgCmcSpells >= 4.2 && lowCmcRampCount === 0) {
    addLog(`[VALIDACIÓN ESTRATEGIA] Mazo pesado sin rampa detectado (CMC promedio: ${avgCmcSpells.toFixed(2)}). Ajustado a ${metricalTargetLnd} tierras para evitar land screw.`);
  } else if (avgCmcSpells <= 1.9) {
    addLog(`[VALIDACIÓN ESTRATEGIA] Mazo ultra-ligero detectado (CMC promedio: ${avgCmcSpells.toFixed(2)}). Ajustado a ${metricalTargetLnd} tierras para evitar land flood.`);
  }

  if (earlyInteractionCount >= 6) {
    formData.maxColorlessLandsLimit = 2;
    addLog(`[VALIDACIÓN ESTRATEGIA] Alta densidad de interacción barata detectada (${earlyInteractionCount} copias). Limitando tierras incoloras a un máximo de 2 para asegurar pips de color.`);
  }

  const targetSpellsCount = deckSize - metricalTargetLnd;

  // Ajustar la suma de hechizos para que coincida exactamente con targetSpellsCount
  let consolidatedSpellsSum = consolidatedSpells.reduce((sum, c) => sum + (c.quantity || 0), 0);
  if (consolidatedSpellsSum < targetSpellsCount) {
      addLog(`[CONSOLIDACIÓN SP] Ajustando déficit en hechizos (${consolidatedSpellsSum}/${targetSpellsCount})...`);
      consolidatedSpells = distribuirOInyectarHechizosFaltantes(consolidatedSpells, targetSpellsCount, formData?.colores || [], addLog, ragResult.pool, formData, blueprint);
  } else if (consolidatedSpellsSum > targetSpellsCount) {
      addLog(`[CONSOLIDACIÓN SP] Ajustando exceso en hechizos (${consolidatedSpellsSum}/${targetSpellsCount})...`);
      consolidatedSpells = recortarHechizosExcedentesInteligente(consolidatedSpells, targetSpellsCount, addLog, mustIncludeNamesList);
  }

  // Asegurar que la categoría no sea Land para los hechizos finales
  consolidatedSpells = consolidatedSpells.filter(c => c.category !== 'Land');

  // =========================================================================
  // ⚔️ PASO 4: PURGA DE INVÁLIDOS & PASO 5: HARD ENFORCEMENT DE INTERACCIÓN
  // =========================================================================
  const deckColors = formData?.colores || ['G'];

  addLog("[JUEZ CONTRATO] 🛡️ Ejecutando PURGA DE INVÁLIDOS y filtrado por Lista Negra...");
  consolidatedSpells = purgaDeInvalidos(consolidatedSpells, blueprint, deckColors, addLog);

  addLog("[JUEZ CONTRATO] ⚔️ Ejecutando HARD ENFORCEMENT DE INTERACCIÓN (Mínimo 6 copias)...");
  consolidatedSpells = hardEnforceInteraction(consolidatedSpells, blueprint, deckColors, addLog);

  // Recalcular el CMC promedio real tras la inyección de interacción
  const updatedVmp = calculateVMP(consolidatedSpells);
  metricalTargetLnd = calculatePerfectLandCount(consolidatedSpells, updatedVmp, formData);
  addLog(`[CÁLCULO CONTEXTUAL TIERRAS] VMP final de hechizos: ${updatedVmp.toFixed(2)}. Tierras meta fijadas en: ${metricalTargetLnd}.`);

  // Recalcular pips reales con la lista final de hechizos

  let recalculatedPips = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  consolidatedSpells.forEach(card => {
      const poolCard = (ragResult?.pool || []).find(c => c && typeof c.name === 'string' && card && typeof card.name === 'string' && c.name.trim().toLowerCase() === card.name.trim().toLowerCase()) || {};
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

  Object.keys(recalculatedPips).forEach(color => {
      metricsPIPsStruct[color] = recalculatedPips[color];
  });

  // --- POST-SIDEBOARD MANA CHECK ---
  // Si una carta del banquillo requiere un color que no está presente en los hechizos del mazo principal (y por ende no genera fuentes),
  // añadir 2 pips virtuales de ese color a metricsPIPsStruct antes de invocar a generateManaBase para que el generador de tierras lo soporte.
  if (spellJuezResult && spellJuezResult.sideboard && Array.isArray(spellJuezResult.sideboard)) {
    const sideboardColors = new Set();
    spellJuezResult.sideboard.forEach(card => {
      if (!card || !card.name) return;
      const poolCard = (ragResult?.pool || []).find(p => p && p.name && p.name.toLowerCase() === card.name.toLowerCase());
      let cardColors = poolCard?.colors || poolCard?.color_identity || card.colors || card.color_identity || [];
      if (typeof cardColors === 'string') cardColors = [cardColors];
      
      if (cardColors.length === 0) {
        const guessed = guessCardColor(card.name);
        if (guessed) cardColors = [guessed];
      }
      
      cardColors.forEach(col => {
        const colUpper = String(col).toUpperCase();
        if (['W', 'U', 'B', 'R', 'G'].includes(colUpper)) {
          sideboardColors.add(colUpper);
        }
      });
    });

    sideboardColors.forEach(col => {
      if ((recalculatedPips[col] || 0) === 0) {
        addLog(`[POST-SIDEBOARD CHECK] Banquillo requiere color "${col}" no presente en Maindeck. Añadiendo 2 pips virtuales a metricsPIPsStruct.`);
        metricsPIPsStruct[col] = (metricsPIPsStruct[col] || 0) + 2;
      }
    });
  }

  // Generar base de tierras
  onProgress('judge', '🌐 Trazando Matemática Perfecta del Flujo Natural Generando Pips Lands de JS Puro..');
  const requestedColorsSet = new Set(formData?.colores || []);
  let validCurrentGenUsedStrPipKeysBaseArrayDetected = Object.keys(metricsPIPsStruct).filter(mX => metricsPIPsStruct[mX] > 0 || requestedColorsSet.has(mX));

  const aiUtilityLands = validResultsStruct.utility_lands_recommendations || [];
  addLog(`Generando lands con pipBalance: ${JSON.stringify(metricsPIPsStruct)} y total lands: ${metricalTargetLnd}, utility recomendadas: ${aiUtilityLands.join(', ')}`);
  const finalCalculatedLands = await generateManaBase(metricsPIPsStruct, metricalTargetLnd, validCurrentGenUsedStrPipKeysBaseArrayDetected, formData, consolidatedSpells, aiUtilityLands);

  const logKarsten = `═══ KARSTEN MATH (Tierras inyectadas) ═══\n  Pips Base: ${JSON.stringify(metricsPIPsStruct)}\n${finalCalculatedLands.map(l => `  ${l.quantity}x ${l.name}`).join('\n')}`;
  addLog(logKarsten);
  console.log(logKarsten);

  // Fusionar hechizos finalizados + tierras generadas
  validResultsStruct.cards = [ ...consolidatedSpells, ...finalCalculatedLands ];

  // Segundo paso: Ejecutar aplicarJuezFinal para tierras y sideboard (preserveSpells=true, preserveLands=false, spellAuditOnly=false)
  addLog("[FASE 1] Ejecutando Auditoría de Tierras y Generación de Sideboard...");
  const finalJuezResult = await aplicarJuezFinal(validResultsStruct, dnaData, formData, addLog, ragResult.pool, false, false, true, blueprint);

  validResultsStruct.cards = finalJuezResult.cards;
  validResultsStruct.sideboard = finalJuezResult.sideboard;
  validResultsStruct.sideboard_strategy = finalJuezResult.sideboard_strategy;

  // =========================================================================
  // ⚔️ SANITIZACIÓN Y CONSOLIDACIÓN SUPREMA FINAL (EL JUEZ INVICTO)
  // =========================================================================
  addLog("[JUEZ SUPREMO] Iniciando capa de CONSOLIDACIÓN y control de caps definitivos...");

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
          addLog(`[CONSOLIDACIÓN SUPREMA] Redundancia CRÍTICA detectada en "${card.name}": ${card.quantity} copias exceden el límite Pro Tour de ${cap}. Capando a ${cap} copias.`);
          card.quantity = cap;
      }
  }

  // 4. Separar Hechizos y Tierras para forzar exactitud matemática
  const targetLandsCount = metricalTargetLnd;

  let finalSpells = consolidatedList.filter(c => c.category !== 'Land');
  let finalLands = consolidatedList.filter(c => c.category === 'Land');

  let finalSpellsSum = finalSpells.reduce((sum, c) => sum + (c.quantity || 0), 0);
  let finalLandsSum = finalLands.reduce((sum, c) => sum + (c.quantity || 0), 0);

  // Ajustar Hechizos
  if (finalSpellsSum < targetSpellsCount) {
      addLog(`[CONSOLIDACIÓN SUPREMA] Déficit en hechizos (${finalSpellsSum}/${targetSpellsCount}). Inyectando COMPENSACIÓN inteligente...`);
      finalSpells = distribuirOInyectarHechizosFaltantes(finalSpells, targetSpellsCount, formData?.colores || [], addLog, ragResult.pool, formData, blueprint);
  } else if (finalSpellsSum > targetSpellsCount) {
      addLog(`[CONSOLIDACIÓN SUPREMA] Exceso en hechizos (${finalSpellsSum}/${targetSpellsCount}). Recortando de forma táctica...`);
      finalSpells = recortarHechizosExcedentesInteligente(finalSpells, targetSpellsCount, addLog, mustIncludeNamesList);
  }

  // Ajustar Tierras
  if (finalLandsSum < targetLandsCount) {
      let missing = targetLandsCount - finalLandsSum;
      addLog(`[CONSOLIDACIÓN SUPREMA] Déficit en tierras (${finalLandsSum}/${targetLandsCount}). Añadiendo ${missing} tierras básicas...`);
      const basicLand = finalLands.find(l => isBasicLand(l.name));
      if (basicLand) {
          basicLand.quantity += missing;
      } else {
          const colors = formData?.colores || [];
          const needsSnow = deckNeedsSnowLands(finalSpells);
          const formatKey = (formData?.format || 'MODERN').toLowerCase();
          const canUseSnow = needsSnow && cachedAllCards.some(ac => ac && ac.name === "Snow-Covered Island" && ac.legalities && ac.legalities[formatKey] === 'legal');

          let basicLandName = "Swamp";
          if (colors.includes("W")) basicLandName = canUseSnow ? "Snow-Covered Plains" : "Plains";
          else if (colors.includes("U")) basicLandName = canUseSnow ? "Snow-Covered Island" : "Island";
          else if (colors.includes("R")) basicLandName = canUseSnow ? "Snow-Covered Mountain" : "Mountain";
          else if (colors.includes("G")) basicLandName = canUseSnow ? "Snow-Covered Forest" : "Forest";
          
          finalLands.push({
              name: basicLandName,
              quantity: missing,
              category: "Land",
              type_line: canUseSnow ? `Basic Snow Land — ${basicLandName.replace('Snow-Covered ', '')}` : `Basic Land — ${basicLandName}`,
              cmc: 0
          });
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
              const isBasicA = isBasicLand(a.name);
              const isBasicB = isBasicLand(b.name);
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

  // 5.5 GARANTÍA ESTRICTA INVIOLABLE DE EXACTAMENTE 60 CARTAS (ARREGLO DE BUG DE 61+ CARTAS)
  let exactTotal = validResultsStruct.cards.reduce((sum, c) => sum + (c.quantity || 0), 0);
  const targetDeckTotal = deckSize || 60;
  if (exactTotal > targetDeckTotal) {
    let excess = exactTotal - targetDeckTotal;
    addLog(`[CONSOLIDACIÓN SUPREMA] ✂️ EXCESO DETECTADO: El mazo tiene ${exactTotal} cartas (Objetivo: ${targetDeckTotal}). Aplicando recorte estricto de ${excess} copias...`);

    const sobranteFinisher = validResultsStruct.cards.find(c => (c.role || '').includes('finisher') && c.quantity > 2 && !isLand(c));
    if (sobranteFinisher) {
      sobranteFinisher.quantity -= excess;
      addLog(`[RECORTE ESTRICTO 60] -${excess}x "${sobranteFinisher.name}" (Finisher).`);
    } else {
      const spellToTrim = validResultsStruct.cards.slice().reverse().find(c => !isLand(c) && c.quantity > 1);
      if (spellToTrim) {
        spellToTrim.quantity -= excess;
        addLog(`[RECORTE ESTRICTO 60] -${excess}x "${spellToTrim.name}".`);
      } else {
        validResultsStruct.cards[validResultsStruct.cards.length - 1].quantity -= excess;
      }
    }
    validResultsStruct.cards = validResultsStruct.cards.filter(c => c.quantity > 0);
  }

  const finalTotal = validResultsStruct.cards.reduce((sum, c) => sum + c.quantity, 0);
  addLog(`[CONSOLIDACIÓN SUPREMA] Mazo verificado con éxito. Total absoluto de cartas: ${finalTotal}/${deckSize}.`);
    
  // AUDITORÍA FASE: CONSOLIDACIÓN_SUPREMA
  validResultsStruct.cards = trackDeckEntries(validResultsStruct.cards, 'CONSOLIDACIÓN_SUPREMA', 'FinalDeck');
  logDeckSnapshot(validResultsStruct.cards, 'CONSOLIDACIÓN_SUPREMA', blueprint, addLog);
  auditBlueprintInvariants(validResultsStruct.cards, blueprint, 'CONSOLIDACIÓN_SUPREMA', addLog);

  // Filtrar cartas que hayan quedado con cantidad 0
  validResultsStruct.cards = validResultsStruct.cards.filter(c => c.quantity > 0);


    
    // === DETERMINISTIC HYPERGEOMETRIC VALIDATION API (POST /api/alg) ===
    let validationEngine = 'local';
    let validationData = null;
    try {
        const apiEndpoint = API_ENDPOINTS.VALIDATION.API_ALG;
        addLog(`[HYPERGEOMETRIC API] Enviando mazo para VALIDACIÓN determinista a ${apiEndpoint}...`);
        
        onProgress('validate', '📊 Validando base de MANÁ con el Motor Hipergeométrico...');
        
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
        addLog(`[HYPERGEOMETRIC API] VALIDACIÓN determinista completada exitosamente vía Spicerack.`);
        
        // Inyectar recomendaciones de optimización adicionales si están presentes en la respuesta
        if (validationData?.recommendations && Array.isArray(validationData.recommendations)) {
            addLog(`[HYPERGEOMETRIC API] Añadiendo recomendaciones de optimización del motor.`);
            if (!validResultsStruct.recommendations) {
                validResultsStruct.recommendations = [];
            }
            const cleanRecs = validationData.recommendations.map(r => {
                if (typeof r === 'string') return { title: 'Optimización de MANÁ', description: r };
                return { title: r.title || 'Optimización de MANÁ', description: r.description || '' };
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
    
    // Sincronizar estrategia, mulligan, nombre y lore del Blueprint de la IA o el Fallback
    validResultsStruct.deckName = blueprint?.deckName || `${formData.archetype || 'Midrange'} ${formData.strategy || ''}`;
    validResultsStruct.lore = blueprint?.lore || `Un mazo de estilo ${formData.archetype || 'Midrange'} enfocado en la estrategia ${formData.strategy || 'general'}.`;
    validResultsStruct.strategy = blueprint?.strategy || dnaData.prioridad || "";
    validResultsStruct.mulligan = blueprint?.mulligan || "Conserva manos con al menos 2-3 tierras de tus colores y una curva activa.";

    // Agregar logs detallados al metadata para el Oráculo
    validResultsStruct.banlistSwaps = [];
    validResultsStruct.generationLogs = {
      logs: logs,
      systemPrompt: STRICT_INSTRUCTIONS_PROMPT,
      contextPrompt: contextGen_Prompt,
      rawResponse: typeof genResponseRawJson_Object === 'string' ? genResponseRawJson_Object : JSON.stringify(genResponseRawJson_Object)
    };

    // -----------------------------------------------------------------------------
    // BUCLE DE AUTO-CORRECCIÓN AGÉNTICA PRE-FLIGHT (DISPARADO ANTES DE PRESENTAR EL MAZO)
    // -----------------------------------------------------------------------------
    addLog(`[PRE-FLIGHT LOOP] Iniciando evaluación determinista de calidad agéntica...`);
    try {
      const allDeckCards = [...(validResultsStruct.cards || [])];
      const healthEval = evaluateDeckHealthFast(allDeckCards, formData);
      addLog(`[PRE-FLIGHT LOOP] Score de Salud Inicial: ${healthEval.score}/100`);

      if (healthEval.score < 85) {
        addLog(`[PRE-FLIGHT LOOP] ⚠️ Score < 85 detectado (${healthEval.score}/100). Activando 1 micro-ciclo de optimización silenciosa...`);
        const { applyAuditChangesProgrammatically } = await import('./deckOptimizerService.js');
        const simulatedAuditResult = {
          criticalAlerts: healthEval.criticalViolations,
          warnings: healthEval.warnings,
          suggestions: healthEval.recommendedSwaps.map(s => `${s.cardName}: ${s.reason}`)
        };
        const correctedCards = applyAuditChangesProgrammatically(allDeckCards, simulatedAuditResult);
        if (correctedCards && correctedCards.length > 0) {
          validResultsStruct.cards = correctedCards;
          const reEval = evaluateDeckHealthFast(correctedCards, formData);
          addLog(`[PRE-FLIGHT LOOP] ✅ Micro-corrección completada. Nuevo Score de Salud: ${reEval.score}/100`);
        }
      } else {
        addLog(`[PRE-FLIGHT LOOP] ✅ Aprobación directa. Score ${healthEval.score}/100 en primer intento.`);
      }
    } catch (preFlightErr) {
      addLog(`[PRE-FLIGHT LOOP] ⚠️ Aviso: No se pudo completar el ciclo pre-flight: ${preFlightErr.message}`);
    }

    // === REPORTE DE AUDITORÍA Y VEREDICTO DE ARQUITECTURA TRANSACCIONAL ===
    const finalScoreReport = calculateMultiDimensionalStrategyScore(validResultsStruct.cards, blueprint, formData?.strategy);
    const complianceCheck = validateBlueprintCompliance(validResultsStruct.cards, blueprint);

    const auditReportText = `
=== BLUEPRINT COMPLIANCE AUDIT ===
${complianceCheck.roleAudits.map(r => `${r.roleName}: ${r.actualQty}/${r.expectedQty} [${r.isOk ? 'OK' : 'FAIL'}]`).join('\n')}

=== STRATEGY SCORE (9 DIMENSIONES) ===
Score Total: ${finalScoreReport.overallScore}/100
- Blueprint Compliance: ${finalScoreReport.dimensions.blueprintCompliance}%
- Strategy Execution: ${finalScoreReport.dimensions.strategyExecution}/100
- Consistency: ${finalScoreReport.dimensions.consistency}/100
- Curve Balance: ${finalScoreReport.dimensions.curve}/100
- Synergy: ${finalScoreReport.dimensions.synergy}/100
- Win Plan: ${finalScoreReport.dimensions.winPlan}/100

VEREDICTO TRANSACCIONAL:
Blueprint Respetado (100%): ${complianceCheck.isFulfilled ? 'SÍ' : 'NO'}
Plan Estratégico Intacto: ${finalScoreReport.isApproved ? 'SÍ' : 'NO'}
Aprobado: ${finalScoreReport.isApproved ? 'SÍ' : 'NO'}
=========================================
`;
    addLog(auditReportText);
    validResultsStruct.strategyScoreReport = finalScoreReport;

    // AUDITORÍA SEMÁNTICA Y GRAFO DE CONOCIMIENTO (NO-FILLER FILTER)
    const semanticCohesion = calculateGraphCohesion(validResultsStruct.cards || []);
    validResultsStruct.semanticCohesion = semanticCohesion;
    validResultsStruct.orphanCards = semanticCohesion.orphanCards || [];
    validResultsStruct.capabilitiesVector = semanticCohesion.capabilitiesVector || {};

    if (semanticCohesion.orphanCards && semanticCohesion.orphanCards.length > 0) {
      addLog(`[GRAFO SEMÁNTICO] ⚠️ Se han detectado ${semanticCohesion.orphanCards.length} cartas huérfanas/sobrantes con bajo ExecutionScore (<45). Cohesión Global: ${semanticCohesion.cohesionScore}%`);
    } else {
      addLog(`[GRAFO SEMÁNTICO] ✅ Cohesión Estratégica Completa: ${semanticCohesion.cohesionScore}%. Mazo 100% sinérgico sin cartas sobrantes.`);
    }

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

export async function forgeMazoPerfecto(formData, aiConfig, onProgress = () => {}) {
  onProgress('strategy', '🧠 Strategy Reasoning Engine: Construyendo Strategy Graph abstracto...');
  const abstractStrategyPlan = generateAbstractStrategyPlan(formData);
  const blueprintData = await generateBlueprintFromAI(formData, aiConfig, onProgress);
  const finalDeck = await assembleDeckFromBlueprint(blueprintData.blueprint, formData, aiConfig, onProgress, blueprintData);
  finalDeck.abstractStrategyPlan = abstractStrategyPlan;
  return finalDeck;
}






export function validarCondicionesDeVictoria(spells, strategyId, archetype, ragPool, addLog, formData) {
    const archLower = (archetype || '').toLowerCase();
    const stratLower = (strategyId || '').toLowerCase();
    
    addLog(`[WIN-COND VALIDATOR] Iniciando auditoría de condiciones de victoria para arquetipo: ${archetype}, estrategia: ${strategyId}...`);
    
    const creatures = spells.filter(s => s.category === 'Creature' || s.type_line?.toLowerCase().includes('creature'));
    
    let needsAdjustment = false;
    let adjustmentReason = "";
    let targetCategory = "Creature";
    let targetMinCmc = 1;
    let targetMaxCmc = 3;
    let targetRole = "win_condition";
    let targetQuantityNeeded = 0;
    
    // Case 1: Aggro - Requiere al menos 12 criaturas de coste 1-3
    const isAggro = archLower.includes('aggro') || archLower.includes('burn') || archLower.includes('affinity') || archLower.includes('prowess');
    if (isAggro) {
        const cheapCreatures = creatures.filter(c => c.cmc <= 3);
        const cheapQty = cheapCreatures.reduce((sum, c) => sum + c.quantity, 0);
        if (cheapQty < 12) {
            needsAdjustment = true;
            targetQuantityNeeded = 12 - cheapQty;
            adjustmentReason = `Mazo Aggro con insuficientes criaturas baratas (${cheapQty}/12). Necesita inyectar ${targetQuantityNeeded} criaturas baratas de ataque.`;
            targetCategory = "Creature";
            targetMinCmc = 1;
            targetMaxCmc = 3;
            targetRole = "aggro_threat";
        }
    }
    
    // Case 2: Control - Requiere al menos 3 finishers (criaturas de coste >= 4, planeswalkers, o roles de finisher)
    const isControl = archLower.includes('control') || stratLower.includes('prison') || stratLower.includes('taxes');
    if (isControl && !needsAdjustment) {
        const finishers = spells.filter(s => {
            const role = (s.role || '').toLowerCase();
            const type = (s.type_line || s.category || '').toLowerCase();
            const cmc = s.cmc || 0;
            return role.includes('finisher') || role.includes('win_cond') || type.includes('planeswalker') || (type.includes('creature') && cmc >= 4);
        });
        const finishersQty = finishers.reduce((sum, f) => sum + f.quantity, 0);
        if (finishersQty < 3) {
            needsAdjustment = true;
            targetQuantityNeeded = 3 - finishersQty;
            adjustmentReason = `Mazo de Control con insuficientes finishers (${finishersQty}/3). Necesita inyectar ${targetQuantityNeeded} finishers de lategame.`;
            targetCategory = "Creature";
            targetMinCmc = 4;
            targetMaxCmc = 7;
            targetRole = "control_finisher";
        }
    }
    
    // Case 3: Tribal - Si se especificó una tribu (y no es 'none'), al menos 12 criaturas deben ser de la tribu
    const activeTribe = formData?.tribe;
    const isTribal = activeTribe && activeTribe !== 'none' && activeTribe !== '';
    let tribeSubtypes = [];
    if (isTribal) {
        // Encontrar el objeto de la tribu en MTG_TRIBES
        const tribeObj = MTG_TRIBES.find(t => t.id === activeTribe || t.label === activeTribe) || null;
        if (tribeObj && tribeObj.subtypes) {
            tribeSubtypes = tribeObj.subtypes.map(s => s.toLowerCase());
        } else {
            // Fallback al singularMap clásico
            let t = activeTribe.toLowerCase().trim();
            const singularMap = {
                'ninjas': 'ninja',
                'elves': 'elf',
                'goblins': 'goblin',
                'faeries': 'faerie',
                'zombies': 'zombie',
                'merfolks': 'merfolk',
                'merfolk': 'merfolk',
                'slivers': 'sliver',
                'spirits': 'spirit',
                'humans': 'human',
                'dragons': 'dragon',
                'dinosaurs': 'dinosaur',
                'vampires': 'vampire',
                'cats': 'cat',
                'dogs': 'dog',
                'elementals': 'elemental',
                'knights': 'knight',
                'clerics': 'cleric',
                'wizards': 'wizard',
                'rogues': 'rogue',
                'warriors': 'warrior',
                'angels': 'angel',
                'demons': 'demon'
            };
            let tribeLowerSingular = t;
            if (singularMap[t]) {
                tribeLowerSingular = singularMap[t];
            } else if (t.endsWith('ves')) {
                tribeLowerSingular = t.substring(0, t.length - 3) + 'f';
            } else if (t.endsWith('ies')) {
                tribeLowerSingular = t.substring(0, t.length - 3) + 'ie';
            } else if (t.endsWith('s')) {
                tribeLowerSingular = t.slice(0, -1);
            } else {
                tribeLowerSingular = t;
            }
            tribeSubtypes = [tribeLowerSingular];
        }
    }
    if (isTribal && !needsAdjustment) {
        const tribalCreatures = creatures.filter(c => {
            if (!c.type_line) return false;
            const typeLower = c.type_line.toLowerCase();
            return tribeSubtypes.some(st => typeLower.includes(st));
        });
        const tribalQty = tribalCreatures.reduce((sum, c) => sum + c.quantity, 0);
        if (tribalQty < 12) {
            needsAdjustment = true;
            targetQuantityNeeded = 12 - tribalQty;
            adjustmentReason = `Mazo Tribal con muy pocos miembros de la tribu ${activeTribe} (${tribalQty}/12). Necesita inyectar ${targetQuantityNeeded} criaturas de tipo ${activeTribe}.`;
            targetCategory = "Creature";
            targetMinCmc = 1;
            targetMaxCmc = 4;
            targetRole = "tribal_creature";
        }
    }

    if (!needsAdjustment) {
        addLog(`[WIN-COND VALIDATOR] ✅ VALIDACIÓN superada. El mazo tiene condiciones de victoria consistentes.`);
        return spells;
    }
    
    addLog(`[WIN-COND VALIDATOR] ⚠️ Alerta: ${adjustmentReason}`);
    
    // Algoritmo de INYECCIÓN de emergencia:
    const allowedColors = formData?.colores || [];
    const colorsSet = new Set(allowedColors.length > 0 ? allowedColors : ['W', 'U', 'B', 'R', 'G']);
    
    let candidates = ragPool.filter(c => {
        if (!c || typeof c.name !== 'string') return false;
        
        // Excluir cartas custom
        if (c.id && (c.id.startsWith('custom-') || c.id.includes('custom'))) return false;
        const nameClean = c.name.toLowerCase().trim();
        if (nameClean.includes("hamato") || nameClean.includes("shredder") || nameClean.includes("yoshi") || nameClean.includes("oroku saki") || nameClean.includes("splinter, ")) {
            return false;
        }

        if (spells.some(s => s.name.toLowerCase() === nameClean)) return false;
        
        const typeLower = (c.type_line || '').toLowerCase();
        if (typeLower.includes("land")) return false;
        const poolIsCreature = typeLower.includes("creature");
        if (targetCategory === "Creature" && !poolIsCreature) return false;
        
        const cmc = c.mana_value !== undefined ? c.mana_value : (c.cmc || 0);
        if (cmc < targetMinCmc || cmc > targetMaxCmc) return false;
        
        const cardColors = c.colors || [];
        if (cardColors.length > 0 && !cardColors.every(col => colorsSet.has(col))) return false;
        
        if (isTribal) {
            if (!tribeSubtypes.some(st => typeLower.includes(st))) return false;
        }
        
        return true;
    });
    
    candidates.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    if (candidates.length === 0) {
        addLog(`[WIN-COND VALIDATOR] No se encontraron candidatos ideales en el RAG pool. Relajando restricciones de INYECCIÓN.`);
        candidates = ragPool.filter(c => {
            if (!c || typeof c.name !== 'string') return false;
            
            // Excluir cartas custom
            if (c.id && (c.id.startsWith('custom-') || c.id.includes('custom'))) return false;
            const nameClean = c.name.toLowerCase().trim();
            if (nameClean.includes("hamato") || nameClean.includes("shredder") || nameClean.includes("yoshi") || nameClean.includes("oroku saki") || nameClean.includes("splinter, ")) {
                return false;
            }

            if (spells.some(s => s.name.toLowerCase() === nameClean)) return false;
            const typeLower = (c.type_line || '').toLowerCase();
            return typeLower.includes("creature");
        }).sort((a, b) => (b.score || 0) - (a.score || 0));
    }
    
    let addedCount = 0;
    let index = 0;
    const cardsAdded = [];
    
    while (addedCount < targetQuantityNeeded && index < candidates.length) {
        const candidate = candidates[index++];
        const qtyToAdd = Math.min(targetQuantityNeeded - addedCount, 4);
        
        cardsAdded.push({
            name: candidate.name,
            quantity: qtyToAdd,
            category: candidate.type_line?.toLowerCase().includes('creature') ? 'Creature' : 'Spell',
            cmc: candidate.mana_value || 2,
            role: targetRole,
            mana_cost: candidate.mana_cost || '',
            type_line: candidate.type_line || ''
        });
        
        addedCount += qtyToAdd;
        addLog(`[WIN-COND VALIDATOR] INYECCIÓN de emergencia: +${qtyToAdd}x "${candidate.name}" (CMC ${candidate.mana_value}) como "${targetRole}"`);
    }
    
    if (addedCount === 0) {
        addLog(`[WIN-COND VALIDATOR] ❌ Error: No se pudo inyectar ninguna condición de victoria. Mazo sin modificar.`);
        return spells;
    }
    
    let spellsResult = [...spells];
    let toTrim = addedCount;
    
    const trimmableRoles = ['filler', 'cantrip', 'interaction', 'removal', 'protection', 'utility'];
    
    spellsResult.sort((a, b) => {
        const isMustA = a.isMustInclude || a.isCore ? 1 : 0;
        const isMustB = b.isMustInclude || b.isCore ? 1 : 0;
        if (isMustA !== isMustB) return isMustA - isMustB;
        
        const roleA = (a.role || '').toLowerCase();
        const roleB = (b.role || '').toLowerCase();
        const isTrimA = trimmableRoles.some(r => roleA.includes(r)) ? 0 : 1;
        const isTrimB = trimmableRoles.some(r => roleB.includes(r)) ? 0 : 1;
        if (isTrimA !== isTrimB) return isTrimA - isTrimB;
        
        return a.cmc - b.cmc;
    });
    
    for (let card of spellsResult) {
        if (toTrim <= 0) break;
        const minCopies = card.role === 'filler' ? 0 : 1;
        const canTrim = card.quantity - minCopies;
        if (canTrim > 0) {
            const trimQty = Math.min(canTrim, toTrim);
            card.quantity -= trimQty;
            toTrim -= trimQty;
            addLog(`[WIN-COND VALIDATOR] Recortadas ${trimQty} copias de "${card.name}" para acomodar la INYECCIÓN.`);
        }
    }
    
    if (toTrim > 0) {
        for (let i = spellsResult.length - 1; i >= 0; i--) {
            if (toTrim <= 0) break;
            const card = spellsResult[i];
            if (!card.isMustInclude && !card.isCore) {
                const trimQty = Math.min(card.quantity, toTrim);
                card.quantity -= trimQty;
                toTrim -= trimQty;
                addLog(`[WIN-COND VALIDATOR] Remoción completa: -${trimQty}x "${card.name}" para acomodar la INYECCIÓN.`);
            }
        }
    }
    
    spellsResult = spellsResult.filter(c => c.quantity > 0);
    spellsResult.push(...cardsAdded);
    
    return spellsResult;
}

export async function obtenerEsqueletoDNA(archetype, strategyId, format, colors) {
  const cleanNormArch = (archetype || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
  const cleanNormStrat = (strategyId || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
  const formatKey = (format || 'MODERN').toUpperCase();

  console.log(`[DNA MOTOR] Buscando ADN competitivo para arquetipo: ${archetype}, formato: ${format}...`);

  // 1. Intentar buscar en el Grafo Semántico de Obsidian (public/data/synergy_graph.json)
  try {
    const graphResponse = await fetch('/data/synergy_graph.json');
    if (graphResponse.ok) {
      const graph = await graphResponse.json();
      if (graph.decks) {
        // Encontrar barajas que coincidan con el arquetipo y formato
        const matchedDecks = Object.values(graph.decks).filter(deck => {
          const deckArchClean = (deck.archetype || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
          const deckFormat = (deck.format || '').toUpperCase();
          if (!deckArchClean || !cleanNormArch) return false;
          return (deckArchClean === cleanNormArch || cleanNormArch.includes(deckArchClean) || deckArchClean.includes(cleanNormArch)) && deckFormat === formatKey;
        });

        if (matchedDecks.length > 0) {
          matchedDecks.sort((a, b) => {
            return b.cards.length - a.cards.length; 
          });
          const bestDeck = matchedDecks[0];
          console.log(`[DNA MOTOR] ¡ADN Encontrado en Obsidian! Mazo: "${bestDeck.name}" por el jugador: ${bestDeck.player}`);
          return bestDeck.cards;
        }
      }
    }
  } catch (err) {
    console.warn(`[DNA MOTOR] No se pudo leer el grafo de Obsidian. Probando Mocks.`, err);
  }

  // 2. Intentar buscar en MOCK_METAGAME_DECKS de mtgtop8Service
  try {
    const { MOCK_METAGAME_DECKS } = await import('./mtgtop8Service.js');
    const mockDecks = MOCK_METAGAME_DECKS[formatKey] || [];
    const matchedMock = mockDecks.find(d => {
      const mockNameClean = d.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim();
      if (cleanNormStrat === 'ninjutsu' && (mockNameClean.includes('ninja') || mockNameClean.includes('ninjutsu'))) {
        return true;
      }
      const matchArch = cleanNormArch && (mockNameClean.includes(cleanNormArch) || cleanNormArch.includes(mockNameClean));
      const matchStrat = cleanNormStrat && (mockNameClean.includes(cleanNormStrat) || cleanNormStrat.includes(mockNameClean));
      return matchArch || matchStrat;
    });

    if (matchedMock) {
      console.log(`[DNA MOTOR] ¡ADN Encontrado en Mocks Competitivos! Mazo: "${matchedMock.name}"`);
      return matchedMock.main;
    }
  } catch (err) {
    console.warn(`[DNA MOTOR] Error cargando Mocks de metajuego:`, err);
  }

  return null;
}

export async function buscarCombosDinamicos(strategy, format) {
  console.log(`🔌 Buscando combos dinámicos para estrategia '${strategy}' en formato '${format}'...`);
  
  const searchQueryMap = {
    'twin': 'Splinter Twin',
    'kiki': 'Kiki-Jiki',
    'storm': 'Grapeshot',
    'yawgmoth': 'Yawgmoth, Thran Physician',
    'devoted': 'Devoted Druid',
    'heliod': 'Heliod, Sun-Crowned',
    'thopter': 'Thopter Foundry'
  };
  
  const query = searchQueryMap[strategy] || strategy;
  const url = `https://backend.commanderspellbook.com/variants/?q=cards="${encodeURIComponent(query)}"`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data = await response.json();
    const combos = [];
    
    if (data.results && data.results.length > 0) {
      for (let i = 0; i < Math.min(data.results.length, 2); i++) {
        const comboData = data.results[i];
        const cards = comboData.uses.map(u => u.card.name);
        
        if (cards.length > 3) continue;
        
        combos.push({
          id: `dynamic_${strategy}_${i}`,
          name: `Combo de ${cards[0]}`,
          cards: cards.map(c => ({ name: c, quantity: 4, role: 'combo_piece' }))
        });
      }
    }
    return combos;
  } catch (error) {
    console.error("Error fetching combos from Spellbook:", error);
    return [];
  }
}
