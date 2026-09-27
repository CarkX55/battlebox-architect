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
  },

  ninjutsu: {
    MODERN: {
      default: [
        { name: "Ornithopter", qty: 4, role: "enabler" },
        { name: "Changeling Outcast", qty: 4, role: "enabler" },
        { name: "Moon-Circuit Hacker", qty: 4, role: "ninja_payoff" },
        { name: "Ninja of the Deep Hours", qty: 4, role: "ninja_payoff" },
        { name: "Thousand-Faced Shadow", qty: 2, role: "ninja_payoff" }
      ]
    }
  },

  faeries: {
    MODERN: {
      default: [
        { name: "Spellstutter Sprite", qty: 4, role: "interaction" },
        { name: "Bitterblossom", qty: 4, role: "engine" },
        { name: "Mistbind Clique", qty: 2, role: "finisher" },
        { name: "Faerie Seer", qty: 4, role: "enabler" }
      ]
    }
  },

  dragons: {
    MODERN: {
      default: [
        { name: "Dragonlord's Servant", qty: 4, role: "ramp" },
        { name: "Dragonspeaker Shaman", qty: 2, role: "ramp" },
        { name: "Thunderbreak Regent", qty: 4, role: "threat" },
        { name: "Goldspan Dragon", qty: 2, role: "finisher" }
      ]
    }
  },

  dinosaurs: {
    MODERN: {
      default: [
        { name: "Marauding Raptor", qty: 4, role: "engine" },
        { name: "Drover of the Mighty", qty: 4, role: "ramp" },
        { name: "Regisaur Alpha", qty: 2, role: "threat" },
        { name: "Carnage Tyrant", qty: 2, role: "finisher" }
      ]
    }
  },

  angels: {
    MODERN: {
      default: [
        { name: "Giada, Font of Hope", qty: 4, role: "engine" },
        { name: "Righteous Valkyrie", qty: 4, role: "payoff" },
        { name: "Lyra Dawnbringer", qty: 2, role: "finisher" },
        { name: "Youthful Valkyrie", qty: 4, role: "threat" }
      ]
    }
  },

  pirates: {
    MODERN: {
      default: [
        { name: "Ragavan, Nimble Pilferer", qty: 4, role: "enabler" },
        { name: "Malcolm, Keen-Eyed Navigator", qty: 4, role: "engine" },
        { name: "Breeches, Eager Pillager", qty: 2, role: "payoff" },
        { name: "Kari Zev, Skyship Raider", qty: 4, role: "threat" }
      ]
    }
  },

  druids_shaman: {
    MODERN: {
      default: [
        { name: "Burning-Tree Emissary", qty: 4, role: "enabler" },
        { name: "Rage Forger", qty: 4, role: "payoff" },
        { name: "Elvish Archdruid", qty: 4, role: "ramp" },
        { name: "Bosk Banneret", qty: 4, role: "reducer" }
      ]
    }
  },

  discard_rack: {
    MODERN: {
      default: [
        { name: "The Rack", qty: 4, role: "payoff" },
        { name: "Shrieking Affliction", qty: 4, role: "payoff" },
        { name: "Waste Not", qty: 4, role: "engine" },
        { name: "Liliana's Caress", qty: 4, role: "engine" },
        { name: "Inquisition of Kozilek", qty: 4, role: "discard_spell" }
      ]
    }
  },

  dredge: {
    MODERN: {
      default: [
        { name: "Stinkweed Imp", qty: 4, role: "dredger" },
        { name: "Golgari Thug", qty: 4, role: "dredger" },
        { name: "Prized Amalgam", qty: 4, role: "payoff" },
        { name: "Narcomoeba", qty: 4, role: "payoff" },
        { name: "Cathartic Reunion", qty: 4, role: "enabler" }
      ]
    }
  },

  burn: {
    MODERN: {
      default: [
        { name: "Lightning Bolt", qty: 4, role: "burn" },
        { name: "Lava Spike", qty: 4, role: "burn" },
        { name: "Rift Bolt", qty: 4, role: "burn" },
        { name: "Skewer the Critics", qty: 4, role: "burn" },
        { name: "Monastery Swiftspear", qty: 4, role: "threat" },
        { name: "Goblin Guide", qty: 4, role: "threat" },
        { name: "Eidolon of the Great Revel", qty: 4, role: "disruption" },
        { name: "Searing Blaze", qty: 4, role: "interaction" }
      ],
      colorVariants: {
        "RW": [
          { name: "Lightning Bolt", qty: 4, role: "burn" },
          { name: "Lava Spike", qty: 4, role: "burn" },
          { name: "Rift Bolt", qty: 4, role: "burn" },
          { name: "Boros Charm", qty: 4, role: "finisher" },
          { name: "Lightning Helix", qty: 4, role: "interaction" },
          { name: "Monastery Swiftspear", qty: 4, role: "threat" },
          { name: "Goblin Guide", qty: 4, role: "threat" },
          { name: "Eidolon of the Great Revel", qty: 4, role: "disruption" },
          { name: "Searing Blaze", qty: 4, role: "interaction" }
        ],
        "R": [
          { name: "Lightning Bolt", qty: 4, role: "burn" },
          { name: "Lava Spike", qty: 4, role: "burn" },
          { name: "Rift Bolt", qty: 4, role: "burn" },
          { name: "Skewer the Critics", qty: 4, role: "burn" },
          { name: "Monastery Swiftspear", qty: 4, role: "threat" },
          { name: "Goblin Guide", qty: 4, role: "threat" },
          { name: "Eidolon of the Great Revel", qty: 4, role: "disruption" },
          { name: "Searing Blaze", qty: 4, role: "interaction" }
        ]
      }
    },
    PIONEER: {
      default: [
        { name: "Monastery Swiftspear", qty: 4, role: "threat" },
        { name: "Soul-Scar Mage", qty: 4, role: "threat" },
        { name: "Play with Fire", qty: 4, role: "burn" },
        { name: "Lightning Strike", qty: 4, role: "burn" },
        { name: "Skewer the Critics", qty: 4, role: "burn" },
        { name: "Eidolon of the Great Revel", qty: 4, role: "disruption" },
        { name: "Kumano Faces Kakkazan", qty: 4, role: "enabler" },
        { name: "Light Up the Stage", qty: 4, role: "draw" }
      ]
    },
    STANDARD: {
      default: [
        { name: "Monastery Swiftspear", qty: 4, role: "threat" },
        { name: "Play with Fire", qty: 4, role: "burn" },
        { name: "Lightning Strike", qty: 4, role: "burn" },
        { name: "Kumano Faces Kakkazan", qty: 4, role: "enabler" },
        { name: "Slickshot Show-Off", qty: 4, role: "threat" }
      ]
    }
  },

  elves: {
    MODERN: {
      default: [
        { name: "Elvish Archdruid", qty: 4, role: "lord" },
        { name: "Heritage Druid", qty: 4, role: "engine" },
        { name: "Dwynen's Elite", qty: 4, role: "fodder" },
        { name: "Llanowar Elves", qty: 4, role: "dork" },
        { name: "Elvish Mystic", qty: 4, role: "dork" },
        { name: "Nettle Sentinel", qty: 4, role: "enabler" },
        { name: "Leaf-Crowned Visionary", qty: 4, role: "lord_draw" },
        { name: "Collected Company", qty: 4, role: "engine" },
        { name: "Ezuri, Renegade Leader", qty: 2, role: "finisher" },
        { name: "Chord of Calling", qty: 2, role: "tutor" }
      ],
      colorVariants: {
        "BG": [
          { name: "Elvish Archdruid", qty: 4, role: "lord" },
          { name: "Heritage Druid", qty: 4, role: "engine" },
          { name: "Dwynen's Elite", qty: 4, role: "fodder" },
          { name: "Llanowar Elves", qty: 4, role: "dork" },
          { name: "Elvish Mystic", qty: 4, role: "dork" },
          { name: "Shaman of the Pack", qty: 4, role: "payoff" },
          { name: "Collected Company", qty: 4, role: "engine" },
          { name: "Chord of Calling", qty: 2, role: "tutor" }
        ]
      }
    },
    PIONEER: {
      default: [
        { name: "Llanowar Elves", qty: 4, role: "dork" },
        { name: "Elvish Mystic", qty: 4, role: "dork" },
        { name: "Elvish Warmaster", qty: 4, role: "engine" },
        { name: "Leaf-Crowned Visionary", qty: 4, role: "lord_draw" },
        { name: "Dwynen's Elite", qty: 4, role: "fodder" },
        { name: "Collected Company", qty: 4, role: "engine" }
      ]
    }
  },

  goblins: {
    MODERN: {
      default: [
        { name: "Goblin Guide", qty: 4, role: "threat" },
        { name: "Conspicuous Snoop", qty: 4, role: "engine" },
        { name: "Boggart Harbinger", qty: 4, role: "tutor" },
        { name: "Rundvelt Hordemaster", qty: 4, role: "lord" },
        { name: "Goblin Chieftain", qty: 4, role: "lord" },
        { name: "Skirk Prospector", qty: 4, role: "enabler" },
        { name: "Goblin Matron", qty: 4, role: "tutor" },
        { name: "Muxus, Goblin Grandee", qty: 2, role: "finisher" }
      ],
      colorVariants: {
        "BR": [
          { name: "Goblin Guide", qty: 4, role: "threat" },
          { name: "Conspicuous Snoop", qty: 4, role: "engine" },
          { name: "Munitions Expert", qty: 4, role: "interaction" },
          { name: "Rundvelt Hordemaster", qty: 4, role: "lord" },
          { name: "Goblin Chieftain", qty: 4, role: "lord" },
          { name: "Skirk Prospector", qty: 4, role: "enabler" },
          { name: "Goblin Matron", qty: 4, role: "tutor" },
          { name: "Muxus, Goblin Grandee", qty: 2, role: "finisher" }
        ]
      }
    }
  },

  merfolk: {
    MODERN: {
      default: [
        { name: "Lord of Atlantis", qty: 4, role: "lord" },
        { name: "Master of the Pearl Trident", qty: 4, role: "lord" },
        { name: "Vodalian Hexcatcher", qty: 4, role: "lord_interaction" },
        { name: "Silvergill Adept", qty: 4, role: "draw" },
        { name: "Tide Shaper", qty: 4, role: "disruption" },
        { name: "Aether Vial", qty: 4, role: "engine" },
        { name: "Counterspell", qty: 4, role: "interaction" },
        { name: "Svyelun of Sea and Sky", qty: 2, role: "finisher" },
        { name: "Harbinger of the Seas", qty: 3, role: "disruption" }
      ]
    }
  },

  affinity: {
    MODERN: {
      default: [
        { name: "Cranial Plating", qty: 4, role: "payoff" },
        { name: "Thought Monitor", qty: 4, role: "draw" },
        { name: "Thoughtcast", qty: 4, role: "draw" },
        { name: "Frogmite", qty: 4, role: "threat" },
        { name: "Myr Enforcer", qty: 4, role: "threat" },
        { name: "Springleaf Drum", qty: 4, role: "ramp" },
        { name: "Ornithopter", qty: 4, role: "enabler" },
        { name: "Memnite", qty: 4, role: "enabler" },
        { name: "Galvanic Blast", qty: 4, role: "burn" }
      ]
    }
  },

  control: {
    MODERN: {
      default: [
        { name: "Counterspell", qty: 4, role: "interaction" },
        { name: "Supreme Verdict", qty: 3, role: "sweeper" },
        { name: "Prismatic Ending", qty: 4, role: "removal" },
        { name: "Solitude", qty: 4, role: "removal" },
        { name: "Archmage's Charm", qty: 3, role: "modal" },
        { name: "Teferi, Hero of Dominaria", qty: 2, role: "finisher" },
        { name: "Teferi, Time Raveler", qty: 2, role: "disruption" },
        { name: "Memory Deluge", qty: 2, role: "draw" }
      ]
    },
    PIONEER: {
      default: [
        { name: "Supreme Verdict", qty: 3, role: "sweeper" },
        { name: "Teferi, Hero of Dominaria", qty: 2, role: "finisher" },
        { name: "The Wandering Emperor", qty: 3, role: "threat_removal" },
        { name: "Absorb", qty: 3, role: "counter" },
        { name: "No More Lies", qty: 4, role: "counter" },
        { name: "Portable Hole", qty: 4, role: "removal" },
        { name: "Memory Deluge", qty: 2, role: "draw" }
      ]
    }
  },

  midrange: {
    MODERN: {
      default: [
        { name: "Thoughtseize", qty: 4, role: "discard" },
        { name: "Inquisition of Kozilek", qty: 3, role: "discard" },
        { name: "Lightning Bolt", qty: 4, role: "removal" },
        { name: "Fatal Push", qty: 4, role: "removal" },
        { name: "Tarmogoyf", qty: 4, role: "threat" },
        { name: "Bloodbraid Elf", qty: 3, role: "value" },
        { name: "Liliana of the Veil", qty: 3, role: "planeswalker" },
        { name: "Fable of the Mirror-Breaker", qty: 4, role: "engine" }
      ],
      colorVariants: {
        "BR": [
          { name: "Thoughtseize", qty: 4, role: "discard" },
          { name: "Fatal Push", qty: 4, role: "removal" },
          { name: "Lightning Bolt", qty: 4, role: "removal" },
          { name: "Bloodtithe Harvester", qty: 4, role: "threat" },
          { name: "Fable of the Mirror-Breaker", qty: 4, role: "engine" },
          { name: "Dauthi Voidwalker", qty: 3, role: "threat_disruption" },
          { name: "Kroxa, Titan of Death's Hunger", qty: 2, role: "finisher" }
        ]
      }
    },
    PIONEER: {
      default: [
        { name: "Thoughtseize", qty: 4, role: "discard" },
        { name: "Fatal Push", qty: 4, role: "removal" },
        { name: "Bloodtithe Harvester", qty: 4, role: "threat" },
        { name: "Fable of the Mirror-Breaker", qty: 4, role: "engine" },
        { name: "Sheoldred, the Apocalypse", qty: 2, role: "finisher" },
        { name: "Bonecrusher Giant", qty: 4, role: "threat_removal" },
        { name: "Graveyard Trespasser", qty: 3, role: "disruption" }
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
  let pkg = CORE_PACKAGES[stratKey];
  if (!pkg) {
    if (stratKey.includes('burn') || stratKey.includes('sligh')) pkg = CORE_PACKAGES.burn;
    else if (stratKey.includes('elf') || stratKey.includes('elves')) pkg = CORE_PACKAGES.elves;
    else if (stratKey.includes('goblin')) pkg = CORE_PACKAGES.goblins;
    else if (stratKey.includes('merfolk')) pkg = CORE_PACKAGES.merfolk;
    else if (stratKey.includes('affinity') || stratKey.includes('robot')) pkg = CORE_PACKAGES.affinity;
    else if (stratKey.includes('control') || stratKey.includes('azorius')) pkg = CORE_PACKAGES.control;
    else if (stratKey.includes('midrange') || stratKey.includes('jund')) pkg = CORE_PACKAGES.midrange;
    else if (stratKey.includes('reanimat')) pkg = CORE_PACKAGES.reanimator;
    else if (stratKey.includes('aristocrat') || stratKey.includes('sacrifice')) pkg = CORE_PACKAGES.aristocrats;
    else if (stratKey.includes('tron')) pkg = CORE_PACKAGES.tron;
    else if (stratKey.includes('storm')) pkg = CORE_PACKAGES.storm;
    else if (stratKey.includes('dredge')) pkg = CORE_PACKAGES.dredge;
  }
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
