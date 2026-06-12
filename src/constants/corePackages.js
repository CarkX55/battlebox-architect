import { isCardLegalForBattleBox } from '../utils/legalityCheck.js';

export const CORE_PACKAGES = {
  aristocrats: {
    MODERN: {
      default: [
        { name: "Yawgmoth, Thran Physician", qty: 4, role: "engine" },
        { name: "Young Wolf", qty: 4, role: "fodder" },
        { name: "Blood Artist", qty: 2, role: "payoff", functionalTag: "drain_on_death" },
        { name: "Zulaport Cutthroat", qty: 2, role: "payoff", functionalTag: "drain_on_death" },
        { name: "Chord of Calling", qty: 3, role: "tutor" }
      ],
      colorVariants: {
        "BR": [
          { name: "Mayhem Devil", qty: 4, role: "payoff" },
          { name: "Cauldron Familiar", qty: 4, role: "fodder" },
          { name: "Witch's Oven", qty: 4, role: "engine" },
          { name: "Claim the Firstborn", qty: 4, role: "interaction" }
        ]
      }
    },
    STANDARD: {
      default: [
        { name: "Vein Ripper", qty: 3, role: "payoff" },
        { name: "Braids, Arisen Nightmare", qty: 4, role: "engine" }
      ]
    }
  },

  reanimator: {
    MODERN: {
      default: [
        { name: "Archon of Cruelty", qty: 4, role: "target" },
        { name: "Persist", qty: 4, role: "reanimate_spell" },
        { name: "Unmarked Grave", qty: 4, role: "enabler" },
        { name: "Faithful Mending", qty: 4, role: "enabler" }
      ],
      colorVariants: {
        "BW": [
          { name: "Archon of Cruelty", qty: 4, role: "target" },
          { name: "Unburial Rites", qty: 4, role: "reanimate_spell" },
          { name: "Priest of Fell Rites", qty: 3, role: "reanimate_spell" },
          { name: "Faithful Mending", qty: 4, role: "enabler" }
        ]
      }
    },
    STANDARD: {
      default: [
        { name: "Atraxa, Grand Unifier", qty: 4, role: "target" },
        { name: "Breach the Multiverse", qty: 3, role: "reanimate_spell" }
      ]
    }
  },

  cascade: {
    MODERN: {
      default: [
        { name: "Crashing Footfalls", qty: 4, role: "payoff" },
        { name: "Shardless Agent", qty: 4, role: "cascade_enabler" },
        { name: "Ardent Plea", qty: 4, role: "cascade_enabler" }
      ]
    }
  },

  tron: {
    MODERN: {
      default: [
        { name: "Ancient Stirrings", qty: 4, role: "tutor" },
        { name: "Chromatic Star", qty: 4, role: "cantrip" },
        { name: "Chromatic Sphere", qty: 4, role: "cantrip" },
        { name: "Expedition Map", qty: 4, role: "tutor" },
        { name: "Wurmcoil Engine", qty: 2, role: "finisher" },
        { name: "Karn, the Great Creator", qty: 4, role: "finisher" }
      ]
    }
  },

  storm: {
    MODERN: {
      default: [
        { name: "Grapeshot", qty: 2, role: "finisher" },
        { name: "Desperate Ritual", qty: 4, role: "ritual" },
        { name: "Pyretic Ritual", qty: 4, role: "ritual" },
        { name: "Manamorphose", qty: 4, role: "cantrip_ritual" },
        { name: "Baral, Chief of Compliance", qty: 4, role: "reducer" },
        { name: "Past in Flames", qty: 2, role: "engine" }
      ]
    }
  },

  voltron: {
    MODERN: {
      default: [
        { name: "Colossus Hammer", qty: 4, role: "equipment" },
        { name: "Sigarda's Aid", qty: 4, role: "enabler" },
        { name: "Puresteel Paladin", qty: 4, role: "enabler" }
      ]
    }
  },

  enchantress: {
    MODERN: {
      default: [
        { name: "Slippery Bogle", qty: 4, role: "hexproof_creature" },
        { name: "Gladecover Scout", qty: 4, role: "hexproof_creature" },
        { name: "Ethereal Armor", qty: 4, role: "aura" },
        { name: "All That Glitters", qty: 4, role: "aura" }
      ]
    }
  },

  lifegain: {
    MODERN: {
      default: [
        { name: "Soul Warden", qty: 4, role: "soul_sister" },
        { name: "Ajani's Pridemate", qty: 4, role: "payoff" },
        { name: "Speaker of the Heavens", qty: 4, role: "payoff" }
      ]
    }
  },

  spellslinger: {
    MODERN: {
      default: [
        { name: "Monastery Swiftspear", qty: 4, role: "prowess" },
        { name: "Soul-Scar Mage", qty: 4, role: "prowess" },
        { name: "Lightning Bolt", qty: 4, role: "burn" }
      ]
    }
  },

  blink: {
    MODERN: {
      default: [
        { name: "Ephemerate", qty: 4, role: "blink_spell" },
        { name: "Soulherder", qty: 4, role: "engine" },
        { name: "Charming Prince", qty: 4, role: "etb_creature" }
      ]
    }
  }
};

/**
 * Inyecta el Core Package para una estrategia, formato y combinación de colores.
 * Realiza un doble filtro de legalidad sobre cada carta.
 * 
 * @param {string} strategyId ID de la estrategia
 * @param {string[]} colors Colores del mazo
 * @param {string} format Formato (MODERN, STANDARD, etc.)
 * @param {Object[]} allCards Array completo de cartas de la base de datos local
 * @returns {Object[]} Lista de cartas inyectadas del Core con quantity, role, etc.
 */
export function injectCorePackage(strategyId, colors, format, allCards) {
  if (!strategyId) return [];
  const stratKey = String(strategyId).toLowerCase();
  const pkg = CORE_PACKAGES[stratKey];
  if (!pkg) return [];

  const formatKey = (format || 'MODERN').toUpperCase();
  const formatPkg = pkg[formatKey] || pkg.MODERN || pkg.default;
  if (!formatPkg) return [];

  // Encontrar variante por color si existe
  const cleanColors = (colors || []).filter(c => c !== 'C').sort();
  const colorKey = cleanColors.join('');
  
  const variant = formatPkg.colorVariants?.[colorKey] || formatPkg.default;
  if (!variant) return [];

  const result = [];
  for (const item of variant) {
    if (!item || !item.name) continue;
    const dbCard = allCards.find(c => c && typeof c.name === 'string' && c.name.toLowerCase() === item.name.toLowerCase());
    if (dbCard) {
      if (isCardLegalForBattleBox(dbCard, formatKey)) {
        // Validación estricta de color
        const allowedColorsSet = new Set(colors || []);
        let isColorLegal = false;
        
        if (allowedColorsSet.size === 0) {
            isColorLegal = true;
        } else {
            const cardColors = dbCard.colors || dbCard.color_identity || [];
            if (cardColors.length === 0) {
                isColorLegal = true;
            } else if (strategyId && strategyId.toLowerCase() === 'reanimator' && 
                dbCard.type_line && dbCard.type_line.toLowerCase().includes('creature') && 
                (dbCard.mana_value || dbCard.cmc || 0) >= 6) {
                // Excepción: En Reanimator, los rematadores gigantes pueden ser de cualquier color
                isColorLegal = true;
            } else {
                isColorLegal = cardColors.every(c => allowedColorsSet.has(c));
            }
        }

        if (isColorLegal) {
            const isL = dbCard.type_line?.toLowerCase().includes('land');
            const isC = dbCard.type_line?.toLowerCase().includes('creature');
            const isI = dbCard.type_line?.toLowerCase().includes('instant');
            const isS = dbCard.type_line?.toLowerCase().includes('sorcery');
            const resolvedCategory = isL ? 'Land' : (isC ? 'Creature' : (isI ? 'Instant' : (isS ? 'Sorcery' : 'Spell')));
            
            result.push({
              ...dbCard,
              quantity: item.qty || 4,
              role: item.role,
              category: resolvedCategory,
              cmc: dbCard.mana_value || dbCard.cmc || 0,
              functionalTag: item.functionalTag || null,
              isCore: true
            });
        } else {
            console.warn(`[CORE PACKAGE] Carta "${item.name}" omitida en el Core de ${strategyId} por no coincidir con los colores del mazo.`);
        }
      } else {
        console.warn(`[CORE PACKAGE] Carta "${item.name}" omitida en el Core de ${strategyId} por ser ilegal/vetada en ${formatKey}.`);
      }
    } else {
      console.warn(`[CORE PACKAGE] Saltada carta "${item.name}" del Core de ${strategyId} (no encontrada en la base de datos local).`);
    }
  }

  return result;
}
