export const BATTLEBOX_FORMAT_NAME = "Ecosistema Battle Box Multiformato";

export function getBattleBoxFormatName(format = 'MODERN') {
  const normalized = (format || 'MODERN').toUpperCase();
  switch (normalized) {
    case 'STANDARD': return 'Standard Battle Box (Casual)';
    case 'PIONEER': return 'Pioneer Battle Box (Casual)';
    case 'MODERN': return 'Modern Battle Box (Casual)';
    case 'LEGACY': return 'Legacy Battle Box (Casual)';
    default: return `${format} Battle Box (Casual)`;
  }
}
export const MANA_COLORS = {
  W: '#f8f6d8',
  U: '#0e68ab',
  B: '#150b00',
  R: '#d3202a',
  G: '#00733e',
  C: '#96999a'
};

export const COLORS = [
  { id: 'W', name: 'Blanco', icon: '/ASSETS/manaBlanco.webp', color: MANA_COLORS.W, bg: 'bg-white', text: 'text-black' },
  { id: 'U', name: 'Azul', icon: '/ASSETS/manaAzul.webp', color: MANA_COLORS.U, bg: 'bg-blue-500', text: 'text-white' },
  { id: 'B', name: 'Negro', icon: '/ASSETS/manaNegro.webp', color: MANA_COLORS.B, bg: 'bg-gray-900', text: 'text-white' },
  { id: 'R', name: 'Rojo', icon: '/ASSETS/manaRojo.webp', color: MANA_COLORS.R, bg: 'bg-red-500', text: 'text-white' },
  { id: 'G', name: 'Verde', icon: '/ASSETS/manaVerde.webp', color: MANA_COLORS.G, bg: 'bg-green-600', text: 'text-white' },
  { id: 'C', name: 'Incoloro', icon: '/ASSETS/Manaincoloro.webp', color: MANA_COLORS.C, bg: 'bg-gray-400', text: 'text-black' }
];

export const BATTLEBOX_BANLIST = [
  // --- BANLIST OFICIAL DE MODERN ---
  "Ancestral Vision", "Ancient Den", "Arcum's Astrolabe", "Birthing Pod", "Blazing Shoal", 
  "Chrome Mox", "Cloudpost", "Dark Depths", "Deathrite Shaman", "Dig Through Time", 
  "Dread Return", "Eye of Ugin", "Faithless Looting", "Field of the Dead", "Gitaxian Probe", 
  "Glimpse of Nature", "Golgari Grave-Troll", "Great Furnace", "Green Sun's Zenith", "Grief", 
  "Hogaak, Arisen Necropolis", "Hypergenesis", "Krark-Clan Ironworks", "Mental Misstep", 
  "Mox Opal", "Mycosynth Lattice", "Mystic Sanctuary", "Oko, Thief of Crowns", "Once Upon a Time", 
  "Ponder", "Punishing Fire", "Rite of Flame", "Seat of the Synod", "Second Sunrise", 
  "Sensei's Divining Top", "Simian Spirit Guide", "Skullclamp", "Splinter Twin", "Summer Bloom", 
  "Tibalt's Trickery", "Treasure Cruise", "Tree of Tales", "Uro, Titan of Nature's Wrath", 
  "Vault of Whispers", "Violent Outburst", "Wrenn and Six", "Yorion, Sky Nomad",

  // --- VETOS CASUALES / OPRESORES DEL FORMATO (Mecánicas Antideportivas) ---
  // 1. Efectos de "Vida a X" directos
  "Master of Cruelties", "Sorin Markov", "Magister Sphinx", "Tree of Perdition",
  
  // 2. Infect letal no interactivo
  "Blightsteel Colossus", "Skithiryx, the Blight Dragon", "Glistener Elf", "Inkmoth Nexus", 
  "Triumph of the Orbs", "Tainted Strike", "Phyresis", "Hand of the Praetors",
  
  // 3. Aniquiladores masivos de base de tierras
  "Emrakul, the Aeons Torn", "Ulamog, the Infinite Gyre", "Kozilek, Butcher of Truth",
  
  // 4. Robar turnos o control mental extremo
  "Emrakul, the Promised End", "Mindslaver", "Worst Fears", "Karn Liberated",
  
  // 5. Victorias Instantáneas (Win the game de un solo paso)
  "Thassa's Oracle", "Approach of the Second Sun", "Felidar Sovereign", "Laboratory Maniac",
  "Jace, Wielder of Mysteries", "Test of Endurance", "Mayael's Aria",

  // 6. Trampas de maná tramposas o no interactivos
  "Show and Tell", "Sneak Attack", "Tinker", "Natural Order", "Entomb",
  
  // 7. Cartas opresivas de casual
  "Ragavan, Nimble Pilferer", "Sol Ring", "Mana Crypt", "Mana Vault", "Grim Monolith"
];

// Tabla de sustitución automática para el Juez JS en Modern:
export const BANLIST_SUBSTITUTIONS = {
  // Aceleradores y rocas prohibidos -> opciones legales en Modern
  "Sol Ring": "Mind Stone", 
  "Mana Crypt": "Arcane Signet", 
  "Mox Diamond": "Fellwar Stone",
  "Chrome Mox": "Coldsteel Heart", 
  "Mox Opal": "Springleaf Drum",
  "Ancient Tomb": "Castle Locthwain", 
  "City of Traitors": "Ghost Quarter",
  "Dark Ritual": "Strike It Rich", 
  "Rite of Flame": "Pyretic Ritual",
  "Urza's Saga": "Inventors' Fair", 
  "Tolarian Academy": "Academy Ruins",
  "Cabal Coffers": "Cabal Stronghold", 
  "Basalt Monolith": "Worn Powerstone",
  "Mana Vault": "Thran Dynamo", 
  "Grim Monolith": "Hedron Archive",
  "Lotus Petal": "Chromatic Star", 
  "Lion's Eye Diamond": "Chromatic Sphere",
  "Channel": "Cultivate", 
  "Mishra's Workshop": "Darksteel Citadel",
  "Faithless Looting": "Thrill of Possibility",

  // Counters / Interactores gratuitos -> versiones legales y justas de Modern
  "Force of Will": "Counterspell", 
  "Pact of Negation": "Negate",
  "Force of Negation": "Dovin's Veto", 
  "Mental Misstep": "Spell Snare",
  "Solitude": "Swords to Plowshares", // Swords no es legal en Modern, pero se maneja en otro nivel; mejor inyectar Prismatic Ending o Leyline Binding.
  "Swords to Plowshares": "Path to Exile",
  "Fury": "Anger of the Gods",
  "Endurance": "Scavenging Ooze", 
  "Grief": "Thoughtseize",
  "Subtlety": "Mana Leak", 
  "Daze": "Spell Pierce", 
  "Invigorate": "Giant Growth",
  
  // Lock pieces -> versiones justas
  "Chalice of the Void": "Pithing Needle", 
  "Trinisphere": "Damping Sphere",
  "Blood Moon": "Alpine Moon", 
  "Magus of the Moon": "Harsh Mentor",
  "Back to Basics": "Spreading Seas", 
  "Winter Orb": "Aven Mindcensor",
  "Stasis": "Propaganda", 
  "Static Orb": "Ghostly Prison",
  "Ensnaring Bridge": "Meekstone", 
  "Strip Mine": "Ghost Quarter",
  
  // Opresores -> alternativas potentes pero justas
  "Griselbrand": "Archon of Cruelty", 
  "Oko, Thief of Crowns": "Teferi, Hero of Dominaria",
  "Uro, Titan of Nature's Wrath": "Coiling Oracle", 
  "Ragavan, Nimble Pilferer": "Dragon's Rage Channeler",
  "Wrenn and Six": "Abundant Growth", 
  "Necropotence": "Phyrexian Arena",
  "Skullclamp": "Mask of Memory", 
  "Treasure Cruise": "Fact or Fiction",
  "Dig Through Time": "Memory Deluge", 
  "Sensei's Divining Top": "Mishra's Bauble",
  
  // Mecánicas antideportivas
  "Master of Cruelties": "Rakdos, Lord of Riots", 
  "Sorin Markov": "Sorin, Solemn Visitor",
  "Magister Sphinx": "Sphinx of the Steel Wind", 
  "Tree of Perdition": "Tree of Redemption",
  "Blightsteel Colossus": "Darksteel Colossus", 
  "Skithiryx, the Blight Dragon": "Kokusho, the Evening Star",
  "Glistener Elf": "Llanowar Elves", 
  "Inkmoth Nexus": "Mutavault",
  "Triumph of the Orbs": "Overrun", 
  "Tainted Strike": "Supernatural Stamina",
  "Phyresis": "Unholy Strength", 
  "Hand of the Praetors": "Lord of the Undead",
  "Emrakul, the Aeons Torn": "Ulamog, the Ceaseless Hunger",
  "Ulamog, the Infinite Gyre": "Artisan of Kozilek",
  "Kozilek, Butcher of Truth": "Kozilek, the Great Distortion",
  "Emrakul, the Promised End": "Void Winnower", 
  "Mindslaver": "Gonti, Lord of Luxury",
  "Worst Fears": "Praetor's Grasp", 
  "Karn Liberated": "Karn, Scion of Urza",
  "Thassa's Oracle": "Thassa, Deep-Dwelling", 
  "Approach of the Second Sun": "Entreat the Angels",
  "Felidar Sovereign": "Archangel of Thune", 
  "Laboratory Maniac": "Talrand, Sky Summoner",
  "Jace, Wielder of Mysteries": "Jace, Architect of Thought",
  "Test of Endurance": "Ajani's Pridemate", 
  "Mayael's Aria": "Mayael the Anima",
  "Show and Tell": "Collected Company", 
  "Sneak Attack": "Through the Breach",
  "Tinker": "Whir of Invention", 
  "Natural Order": "Chord of Calling", 
  "Entomb": "Unmarked Grave"
};

export const ROLE_BASED_SUBS = {
  "mana_acceleration": ["Strike It Rich", "Mind Stone", "Pentad Prism"], 
  "tutor": ["Chord of Calling", "Eladamri's Call", "Whir of Invention"], 
  "reanimate_spell": ["Persist", "Unburial Rites", "Goryo's Vengeance", "Late to Dinner", "Priest of Fell Rites"]
};

export function getIntelligentSubstitution(originalName, role) {
  let inferredRole = role;
  if (!inferredRole && originalName) {
    const nameLower = originalName.toLowerCase();
    if (nameLower.includes("ritual") || nameLower.includes("mox") || nameLower.includes("ring") || nameLower.includes("crypt") || nameLower.includes("monolith") || nameLower.includes("vault") || nameLower.includes("petal") || nameLower.includes("diamond") || nameLower.includes("tomb") || nameLower.includes("academy")) {
      inferredRole = "mana_acceleration";
    } else if (nameLower.includes("tutor") || nameLower.includes("entomb") || nameLower.includes("tinker") || nameLower.includes("natural order")) {
      inferredRole = "tutor";
    } else if (nameLower.includes("reanimate") || nameLower.includes("exhume") || nameLower.includes("animate dead") || nameLower.includes("necromancy") || nameLower.includes("buried alive") || nameLower.includes("persist")) {
      inferredRole = "reanimate_spell";
    }
  }

  if (inferredRole === 'reanimator' || inferredRole === 'reanimate_spell') {
    return ROLE_BASED_SUBS.reanimate_spell[0];
  }
  if (inferredRole === 'tutor') {
    return ROLE_BASED_SUBS.tutor[0];
  }
  if (inferredRole === 'mana_acceleration') {
    return ROLE_BASED_SUBS.mana_acceleration[0];
  }

  return BANLIST_SUBSTITUTIONS[originalName] || "Thoughtseize";
}

export const BATTLEBOX_ARCHETYPES = [
  {
    id: 'aggro',
    label: 'Aggro (Burn / Convoke / Hammer)',
    speed: 'Rápida',
    winTurn: '4-5',
    description: 'Curva extremadamente baja. Presión rápida con criaturas de coste 1-2 e interacción directa de daño.',
    recommendedColors: ['R', 'W', 'G', 'B'],
    landCount: 22,
    spellCount: 38
  },
  {
    id: 'tempo',
    label: 'Tempo (Murktide / Shadow)',
    speed: 'Media-rápida',
    winTurn: '5-7',
    description: 'Pocas amenazas extremadamente eficientes (coste 1-2) defendidas con counterspells y remoción reactiva rápida.',
    recommendedColors: ['U', 'R', 'B', 'W'],
    landCount: 20,
    spellCount: 40
  },
  {
    id: 'midrange',
    label: 'Midrange (Jund / Rock / Omnath)',
    speed: 'Media',
    winTurn: '7-9',
    description: 'El equilibrio perfecto. Máximo valor en curva con disrupción selectiva (descarte/remoción) y amenazas sólidas de 2x1.',
    recommendedColors: ['B', 'G', 'W', 'R'],
    landCount: 24,
    spellCount: 36
  },
  {
    id: 'combo',
    label: 'Combo (Yawgmoth / Titan)',
    speed: 'Variable',
    winTurn: '5-8',
    description: 'Ensambla motores sinérgicos complejos o escala maná hacia amenazas gigantes e interactivas.',
    recommendedColors: ['U', 'B', 'R', 'G', 'C'],
    landCount: 22,
    spellCount: 38
  },
  {
    id: 'control',
    label: 'Control (Azorius / Jeskai)',
    speed: 'Lenta',
    winTurn: '10+',
    description: 'Neutraliza al oponente mediante contrahechizos, limpiamesas eficientes y motores de robo consistentes, con pocos finishers.',
    recommendedColors: ['U', 'W', 'B', 'R'],
    landCount: 26,
    spellCount: 34
  },
  {
    id: 'prison',
    label: 'Taxes & Lock (Eldrazi / Stax)',
    speed: 'Muy lenta',
    winTurn: '12+',
    description: 'Asfixia el ritmo de juego del rival usando impuestos de maná (Thalia) y elementos fiscales que rompen la simetría.',
    recommendedColors: ['W', 'C', 'U', 'R'],
    landCount: 25,
    spellCount: 35
  }
];

export const BATTLEBOX_RULES = {
  minMain: 60,
  targetSideboard: 15,
  maxCopies: 4,
  noCombosBeforeTurn: 4,
  noFreeSpellsBeforeTurn: 4
};

export const MTG_TRIBES = [
  // TRIBUS CLÁSICAS
  { id: 'human', label: 'Humanos', category: 'clasica', colors: ['W', 'U', 'B', 'R', 'G'], primaryColor: 'W', strategies: ['tokens', 'voltron'], archetypes: ['aggro', 'midrange', 'combo', 'prison'], subtypes: ['human'] },
  { id: 'elf', label: 'Elfos', category: 'clasica', colors: ['G', 'B', 'W'], primaryColor: 'G', strategies: ['tokens', 'combo'], archetypes: ['aggro', 'midrange', 'combo'], subtypes: ['elf'] },
  { id: 'goblin', label: 'Goblins', category: 'clasica', colors: ['R', 'B', 'G'], primaryColor: 'R', strategies: ['tokens', 'aristocrats'], archetypes: ['aggro', 'midrange'], subtypes: ['goblin'] },
  { id: 'merfolk', label: 'Tritones (Merfolk)', category: 'clasica', colors: ['U', 'G'], primaryColor: 'U', strategies: ['blink', 'tokens'], archetypes: ['aggro', 'tempo', 'midrange'], subtypes: ['merfolk'] },
  { id: 'zombie', label: 'Zombies', category: 'clasica', colors: ['B', 'U'], primaryColor: 'B', strategies: ['aristocrats', 'reanimator', 'tokens'], archetypes: ['aggro', 'midrange', 'combo'], subtypes: ['zombie'] },
  { id: 'vampire', label: 'Vampiros', category: 'clasica', colors: ['B', 'R', 'W'], primaryColor: 'B', strategies: ['aristocrats', 'lifegain', 'reanimator'], archetypes: ['aggro', 'midrange'], subtypes: ['vampire'] },
  { id: 'spirit', label: 'Espíritus', category: 'clasica', colors: ['W', 'U'], primaryColor: ['W', 'U'], strategies: ['blink', 'tokens'], archetypes: ['aggro', 'tempo', 'midrange', 'control'], subtypes: ['spirit'] },
  { id: 'soldier', label: 'Soldados', category: 'clasica', colors: ['W', 'U'], primaryColor: 'W', strategies: ['tokens', 'voltron'], archetypes: ['aggro', 'midrange', 'prison'], subtypes: ['soldier'] },
  { id: 'knight', label: 'Caballeros', category: 'clasica', colors: ['W', 'B', 'R'], primaryColor: 'W', strategies: ['voltron', 'tokens'], archetypes: ['aggro', 'midrange'], subtypes: ['knight'] },

  // VOCACIONES
  { id: 'wizard', label: 'Magos (Wizards)', category: 'vocacion', colors: ['U', 'R', 'B'], primaryColor: 'U', strategies: ['spellslinger', 'blink'], archetypes: ['aggro', 'tempo', 'midrange', 'combo', 'control'], subtypes: ['wizard'] },
  { id: 'cleric', label: 'Clérigos', category: 'vocacion', colors: ['W', 'B'], primaryColor: 'W', strategies: ['lifegain', 'aristocrats', 'reanimator'], archetypes: ['aggro', 'midrange', 'combo', 'prison'], subtypes: ['cleric'] },
  { id: 'rogue', label: 'Pícaros (Rogues)', category: 'vocacion', colors: ['U', 'B'], primaryColor: ['U', 'B'], strategies: ['aristocrats'], archetypes: ['aggro', 'tempo', 'midrange', 'combo'], subtypes: ['rogue'] },
  { id: 'shaman', label: 'Chamanes', category: 'vocacion', colors: ['G', 'R', 'B'], primaryColor: 'G', strategies: ['tokens', 'landfall'], archetypes: ['midrange', 'combo'], subtypes: ['shaman'] },
  { id: 'druid', label: 'Druidas', category: 'vocacion', colors: ['G', 'W'], primaryColor: 'G', strategies: ['tokens', 'landfall'], archetypes: ['midrange', 'combo'], subtypes: ['druid'] },
  { id: 'ninja', label: 'Ninjas', category: 'vocacion', colors: ['U', 'B'], primaryColor: ['U', 'B'], strategies: ['tempo', 'blink'], archetypes: ['tempo', 'midrange'], subtypes: ['ninja'] },

  // MONSTRUOS
  { id: 'angel', label: 'Ángeles', category: 'monstruo', colors: ['W', 'R', 'B'], primaryColor: 'W', strategies: ['lifegain', 'blink', 'reanimator'], archetypes: ['midrange', 'combo', 'control'], subtypes: ['angel'] },
  { id: 'demon', label: 'Demonios', category: 'monstruo', colors: ['B'], primaryColor: 'B', strategies: ['aristocrats', 'reanimator'], archetypes: ['midrange', 'combo'], subtypes: ['demon'] },
  { id: 'dragon', label: 'Dragones', category: 'monstruo', colors: ['R', 'B', 'G'], primaryColor: 'R', strategies: ['reanimator', 'tokens'], archetypes: ['midrange', 'combo'], subtypes: ['dragon'] },
  { id: 'dinosaur', label: 'Dinosaurios', category: 'monstruo', colors: ['R', 'G', 'W'], primaryColor: 'G', strategies: ['landfall', 'tokens'], archetypes: ['aggro', 'midrange', 'combo'], subtypes: ['dinosaur'] },
  { id: 'elemental', label: 'Elementales', category: 'monstruo', colors: ['R', 'G', 'U', 'W', 'B'], primaryColor: ['R', 'G'], strategies: ['landfall', 'blink', 'reanimator'], archetypes: ['aggro', 'midrange', 'combo'], subtypes: ['elemental'] },

  // EXÓTICAS
  { id: 'eldrazi', label: 'Eldrazi (Eldrazi Tron / Aggro)', category: 'exotica', colors: ['W', 'U', 'B', 'R', 'G', 'C'], primaryColor: 'C', strategies: ['tokens', 'blink'], archetypes: ['aggro', 'midrange', 'prison'], subtypes: ['eldrazi'] },
  { id: 'faerie', label: 'Hadas (Faeries)', category: 'exotica', colors: ['U', 'B'], primaryColor: 'U', strategies: ['blink', 'tempo'], archetypes: ['tempo', 'midrange', 'control'], subtypes: ['faerie', 'fairy'] },
  { id: 'constructs', label: 'Constructos & Myr (Affinity)', category: 'exotica', colors: ['C', 'U', 'R', 'W'], primaryColor: 'C', strategies: ['tokens', 'vehicles'], archetypes: ['aggro', 'midrange', 'combo', 'prison'], subtypes: ['construct', 'myr', 'golem', 'thopter'] },
  { id: 'sliver-5c', label: 'Slivers (Pentacolor 5C)', category: 'exotica', colors: ['W', 'U', 'B', 'R', 'G'], primaryColor: ['W', 'U', 'B', 'R', 'G'], strategies: ['tokens', 'combo'], archetypes: ['aggro', 'midrange'], subtypes: ['sliver'] },
  { id: 'sliver-bant', label: 'Slivers (Bant/Naya Base)', category: 'exotica', colors: ['W', 'U', 'G', 'R'], primaryColor: ['G', 'W'], strategies: ['tokens', 'combo'], archetypes: ['aggro', 'midrange'], subtypes: ['sliver'] },

  // ALIANZAS Y MEZCLAS TEMÁTICAS
  { id: 'outlaws', label: '⚖️ Forajidos (Asesinos, Mercenarios, Piratas, Pícaros)', category: 'alianza', colors: ['B', 'R', 'U'], primaryColor: 'B', strategies: ['aristocrats', 'tempo', 'tokens'], archetypes: ['aggro', 'tempo', 'midrange'], subtypes: ['assassin', 'mercenary', 'pirate', 'rogue', 'warlock'] },
  { id: 'party', label: '🎲 Grupo de Aventura (Clérigo, Pícaro, Guerrero, Mago)', category: 'alianza', colors: ['W', 'U', 'B', 'R', 'G'], primaryColor: ['W', 'U', 'B', 'R'], strategies: ['midrange', 'tempo', 'aggro', 'blink'], archetypes: ['midrange'], subtypes: ['cleric', 'rogue', 'warrior', 'wizard'] },
  { id: 'human_army', label: '⚔️ Ejército (Humanos, Soldados, Caballeros)', category: 'alianza', colors: ['W', 'R'], primaryColor: 'W', strategies: ['tokens', 'voltron'], archetypes: ['aggro', 'midrange', 'prison'], subtypes: ['human', 'soldier', 'knight'] },
  { id: 'goblin_horde', label: '🔥 Horda (Goblins, Orcos, Ogros)', category: 'alianza', colors: ['R', 'B'], primaryColor: 'R', strategies: ['tokens', 'aristocrats'], archetypes: ['aggro', 'midrange'], subtypes: ['goblin', 'orc', 'ogre'] },
  { id: 'elf_druid', label: '🌿 Naturaleza (Elfos, Druidas, Elementales)', category: 'alianza', colors: ['G', 'R', 'U'], primaryColor: 'G', strategies: ['tokens', 'landfall'], archetypes: ['midrange', 'combo'], subtypes: ['elf', 'druid', 'elemental'] },
  { id: 'sea_monsters', label: '🌊 Terrores Marinos (Tritones, Krakens, Leviatanes)', category: 'alianza', colors: ['U', 'G'], primaryColor: 'U', strategies: ['tempo', 'combo', 'blink'], archetypes: ['tempo', 'midrange', 'combo', 'control'], subtypes: ['merfolk', 'kraken', 'leviathan', 'octopus', 'serpent'] },
  { id: 'undead_scourge', label: '💀 Plaga (Zombies, Esqueletos, Horrores)', category: 'alianza', colors: ['B', 'U'], primaryColor: 'B', strategies: ['aristocrats', 'reanimator', 'graveyard'], archetypes: ['midrange', 'combo', 'control'], subtypes: ['zombie', 'skeleton', 'horror', 'vampire', 'shade'] },
  { id: 'apex_predators', label: '🦖 Depredadores del Ápice (Dinosaurios, Bestias, Hidras)', category: 'alianza', colors: ['G', 'R', 'W'], primaryColor: 'G', strategies: ['landfall', 'tokens', 'lifegain'], archetypes: ['midrange'], subtypes: ['dinosaur', 'beast', 'hydra', 'wurm', 'dragon'] },
  { id: 'sliver', label: 'Slivers (Fectidios Sinérgicos)', category: 'exotica', colors: ['W', 'U', 'B', 'R', 'G'], primaryColor: ['W', 'U', 'B', 'R', 'G'], strategies: ['tokens', 'voltron'], archetypes: ['aggro', 'midrange', 'combo'], subtypes: ['sliver'] }
];

export const TRIBE_CATEGORIES = {
  clasica: '🏛️ Razas Clásicas',
  vocacion: '⚔️ Vocaciones y Clases',
  monstruo: '🐉 Monstruos y Bestias',
  exotica: '✨ Exóticas y Especiales',
  alianza: '🤝 Alianzas y Mezclas Temáticas'
};

export const MTG_STRATEGIES = [
  { 
    id: 'aristocrats', 
    label: 'Aristocrats (Yawgmoth Sacrifice)', 
    colors: ['B', 'R', 'W'], 
    primaryColor: 'B',
    archetypes: ['midrange', 'combo'],
    mechanics: 'Combina "Sacrifice Outlets" con "Death Triggers" y generadores de tokens eficientes.',
    keywords: ['sacrifice', 'dies', 'graveyard', 'blood artist', 'zulaport', 'token', 'carrion feeder', 'viscera seer', 'sacrifices a creature', 'yawgmoth']
  },
  { 
    id: 'reanimator', 
    label: 'Reanimator (Persist / Goryo\'s)', 
    colors: ['B', 'U', 'R', 'W'], 
    primaryColor: 'B',
    archetypes: ['combo', 'midrange', 'control', 'tempo'],
    mechanics: 'Usa efectos de descarte para mandar monstruos al cementerio y revivirlos a ritmo instantáneo o con Persist.',
    keywords: ['persist', 'goryo\'s vengeance', 'unburial rites', 'discard', 'put target creature', 'graveyard onto the battlefield', 'priest of fell rites', 'late to dinner', 'archon of cruelty', 'atraxa']
  },
  { 
    id: 'tokens', 
    label: 'Tokens (Convoke & Enjambre)', 
    colors: ['W', 'G', 'R'], 
    primaryColor: ['W', 'G'],
    archetypes: ['aggro', 'midrange', 'combo'],
    mechanics: 'Maximiza presencia en mesa generando fichas y potenciándolas con Convoke y efectos grupales.',
    keywords: ['create', 'token', 'tokens', 'convoke', 'creatures you control get', 'intangible virtue', 'raise the alarm']
  },
  { 
    id: 'spellslinger', 
    label: 'Spellslinger (Prowess & Murktide)', 
    colors: ['U', 'R', 'W'], 
    primaryColor: ['U', 'R'],
    archetypes: ['tempo', 'combo', 'aggro', 'control', 'midrange'],
    mechanics: 'Criaturas de bajo coste con Prowess/Magecraft impulsadas por instantáneos y conjuros reactivos rápidos.',
    keywords: ['prowess', 'magecraft', 'whenever you cast an instant or sorcery', 'instant', 'sorcery', 'delver', 'sprite dragon', 'murktide regent']
  },
  { 
    id: 'blink', 
    label: 'Blink / Flicker (Ephemerate Sinergia)', 
    colors: ['W', 'U'], 
    primaryColor: ['W', 'U'],
    archetypes: ['tempo', 'midrange', 'control', 'combo'],
    mechanics: 'Abusa de habilidades al entrar (ETB) repitiéndolas infinitamente con Ephemerate y Soulherder.',
    keywords: ['exile target', 'return that card to the battlefield', 'enters the battlefield', 'ephemerate', 'soulherder', 'charming prince']
  },
  { 
    id: 'enchantress', 
    label: 'Enchantress (Selesnya Bogles)', 
    colors: ['W', 'G'], 
    primaryColor: 'G',
    archetypes: ['midrange', 'prison', 'combo'],
    mechanics: 'Curva de auras protectoras rápidas y motores de robo basados en encantamientos sobre criaturas evasivas.',
    keywords: ['whenever you cast an enchantment', 'enchantment', 'aura', 'sythis', 'gladecover scout', 'slippery bogle', 'ethereal armor']
  },
  { 
    id: 'landfall', 
    label: 'Landfall (Valakut & Amulet)', 
    colors: ['G', 'R', 'U'], 
    primaryColor: 'G',
    archetypes: ['midrange', 'combo'],
    mechanics: 'Sinergias con la entrada de tierras y fetchlands para generar maná explosivo y ventajas de mesa.',
    keywords: ['landfall', 'whenever a land enters the battlefield', 'valakut exploration', 'dryad of the ilysian grove', 'omnath, locus of creation']
  },
  { 
    id: 'graveyard', 
    label: 'Graveyard Value (Dredge / Delirium)', 
    colors: ['B', 'R', 'G'], 
    primaryColor: 'B',
    archetypes: ['midrange', 'combo', 'control', 'tempo'],
    mechanics: 'Explota el cementerio como recurso con habilidades de Dredge, Delirium (Tarmogoyf) y Flashback.',
    keywords: ['dredge', 'delirium', 'flashback', 'unearth', 'tarmogoyf', 'dragon\'s rage channeler', 'graveyard']
  },
  { 
    id: 'lifegain', 
    label: 'Lifegain (Heliod Sisters)', 
    colors: ['W', 'B', 'G'], 
    primaryColor: 'W',
    archetypes: ['aggro', 'midrange', 'combo'],
    mechanics: 'Ganar vidas pasivas para disparar contadores masivos (Heliod) o drenar letalmente.',
    keywords: ['whenever you gain life', 'lifelink', 'ajani\'s pridemate', 'soul warden', 'serra ascendant', 'heliod, sun-crowned', 'gain life']
  },
  { 
    id: 'prison', 
    label: 'Soft Prison (Damping & Impuestos)', 
    colors: ['W', 'U', 'C'], 
    primaryColor: 'W',
    archetypes: ['prison', 'control', 'midrange'],
    mechanics: 'Retrasa al rival mediante impuestos de maná de Thalia, esferas de amortiguación y bloqueos universales.',
    keywords: ['can\'t attack', 'costs 1 more', 'ghostly prison', 'ensnaring bridge', 'damping sphere', 'thalia, guardian of thraben', 'tax']
  },
  { 
    id: 'voltron', 
    label: 'Voltron (Hammer Time)', 
    colors: ['W', 'R'], 
    primaryColor: 'W',
    archetypes: ['aggro', 'midrange', 'combo'],
    mechanics: 'Equipa instantáneamente Colossus Hammer o auras sobre amenazas baratas imbloqueables.',
    keywords: ['equipped creature', 'enchanted creature', 'equipment', 'aura', 'colossus hammer', 'sigarda\'s aid', 'puresteel paladin']
  },
  { 
    id: 'vehicles', 
    label: 'Vehículos (Copter & Crew)', 
    colors: ['R', 'W', 'U'], 
    primaryColor: 'R',
    archetypes: ['aggro', 'tempo', 'midrange'],
    mechanics: 'Tripula vehículos evasivos o destructivos (Smuggler\'s Copter) esquivando limpiamesas conjuros.',
    keywords: ['crew', 'vehicle', 'smuggler\'s copter', 'heart of kiran', 'pilot']
  }
];
