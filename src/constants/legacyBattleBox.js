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

export const BATTLEBOX_VETOS = [
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
  "Simian Spirit Guide": "Pyretic Ritual",
  "Elvish Spirit Guide": "Utopia Sprawl",
  "Mox Tantalite": "Mind Stone",
  "Lotus Bloom": "Pentad Prism",
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
  if (originalName && BANLIST_SUBSTITUTIONS[originalName]) {
    return BANLIST_SUBSTITUTIONS[originalName];
  }

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
    spellCount: 38,
    difficulty: 1,
    signatureCards: ['Lightning Bolt', 'Monastery Swiftspear'],
    jargonTags: ['Aggro', 'Burn'],
    beginnerTip: 'Ideal si prefieres partidas rápidas y directas. Presiona constantemente al oponente atacando con criaturas de bajo coste.'
  },
  {
    id: 'tempo',
    label: 'Tempo (Murktide / Shadow)',
    speed: 'Media-rápida',
    winTurn: '5-7',
    description: 'Pocas amenazas extremadamente eficientes (coste 1-2) defendidas con counterspells y remoción reactiva rápida.',
    recommendedColors: ['U', 'R', 'B', 'W'],
    landCount: 20,
    spellCount: 40,
    difficulty: 2,
    signatureCards: ['Murktide Regent', 'Death\'s Shadow'],
    jargonTags: ['Tempo', 'Cantrips'],
    beginnerTip: 'Ideal si te gusta frustrar al oponente. Juega una criatura fuerte pronto y protégela con contrahechizos e interacción barata.'
  },
  {
    id: 'midrange',
    label: 'Midrange (Jund / Rock / Omnath)',
    speed: 'Media',
    winTurn: '7-9',
    description: 'El equilibrio perfecto. Máximo valor en curva con disrupción selectiva (descarte/remoción) y amenazas sólidas de 2x1.',
    recommendedColors: ['B', 'G', 'W', 'R'],
    landCount: 24,
    spellCount: 36,
    difficulty: 2,
    signatureCards: ['Tarmogoyf', 'Thoughtseize'],
    jargonTags: ['Midrange', 'Value'],
    beginnerTip: 'El equilibrio perfecto. Recomendado si quieres adaptabilidad; combina buenas criaturas con descarte y remoción.'
  },
  {
    id: 'combo',
    label: 'Combo (Yawgmoth / Titan)',
    speed: 'Variable',
    winTurn: '5-8',
    description: 'Ensambla motores sinérgicos complejos o escala maná hacia amenazas gigantes e interactivas.',
    recommendedColors: ['W', 'U', 'B', 'R', 'G', 'C'],
    landCount: 22,
    spellCount: 38,
    difficulty: 3,
    signatureCards: ['Yawgmoth, Thran Physician', 'Primeval Titan'],
    jargonTags: ['Combo', 'Engine'],
    beginnerTip: 'Para amantes de los rompecabezas. Junta piezas clave para ganar al instante en un solo turno espectacular.'
  },
  {
    id: 'control',
    label: 'Control (Azorius / Jeskai)',
    speed: 'Lenta',
    winTurn: '10+',
    description: 'Neutraliza al oponente mediante contrahechizos, limpiamesas eficientes y motores de robo consistentes, con pocos finishers.',
    recommendedColors: ['U', 'W', 'B', 'R'],
    landCount: 26,
    spellCount: 34,
    difficulty: 2,
    signatureCards: ['Teferi, Hero of Dominaria', 'Supreme Verdict'],
    jargonTags: ['Control', 'Boardwipe'],
    beginnerTip: 'Para jugadores pacientes. Controla la mesa destruyendo amenazas enemigas y gana en partida larga con recursos infinitos.'
  },
  {
    id: 'prison',
    label: 'Taxes & Lock (Eldrazi / Stax)',
    speed: 'Muy lenta',
    winTurn: '12+',
    description: 'Asfixia el ritmo de juego del rival usando impuestos de maná (Thalia) y elementos fiscales que rompen la simetría.',
    recommendedColors: ['W', 'C', 'U', 'R'],
    landCount: 25,
    spellCount: 35,
    difficulty: 3,
    signatureCards: ['Thalia, Guardian of Thraben', 'Chalice of the Void'],
    jargonTags: ['Stax', 'Tax'],
    beginnerTip: 'Para jugadores tácticos. Pone reglas que ralentizan el juego y asfixian los recursos del oponente.'
  },
  {
    id: 'ramp',
    label: 'Ramp (Tron / Titan / Green Devotion)',
    speed: 'Media-lenta',
    winTurn: '6-8',
    description: 'Acelera el desarrollo de maná utilizando dorks, rocks y hechizos de búsqueda de tierras para lanzar amenazas masivas de coste 5+ en turnos tempranos.',
    recommendedColors: ['G', 'C', 'U', 'R', 'B'],
    landCount: 25,
    spellCount: 35,
    difficulty: 1,
    signatureCards: ['Karn Liberated', 'Cultivate'],
    jargonTags: ['Ramp', 'Tron'],
    beginnerTip: 'Para amantes del maná masivo. Acelera tus recursos para jugar criaturas gigantescas y finishers devastadores antes de tiempo.'
  }
];

export const BATTLEBOX_RULES = {
  minMain: 60,
  targetSideboard: 15,
  maxCopies: 4,
  noCombosBeforeTurn: 4,
  noFreeSpellsBeforeTurn: 4
};

export const UNIVERSAL_ENGINES = [
  {
    id: 'aristocrats_generic',
    label: 'Aristócratas / Sacrificio',
    description: 'Sacrifica tus criaturas para drenar vida y generar valor.',
    requiredColors: ['B', 'R', 'W'],
    vetoedKeywords: ['amass', 'orc'],
    boostKeywords: ['sacrifice', 'dies', 'graveyard', 'blood artist', 'zulaport', 'carrion feeder'],
    corePackageId: 'aristocrats'
  },
  {
    id: 'reanimator_generic',
    label: 'Reanimador / Graveyard Reanimate',
    description: 'Descarta monstruos enormes para resucitarlos rápido.',
    requiredColors: ['B', 'U', 'R', 'W'],
    vetoedKeywords: ['amass', 'orc'],
    boostKeywords: ['discard', 'reanimate', 'persist', 'unburial rites', 'archon of cruelty'],
    corePackageId: 'reanimator'
  },
  {
    id: 'spellslinger_generic',
    label: 'Spellslinger / Prowess',
    description: 'Lanza conjuros e instantáneos baratos para inflar tus criaturas.',
    requiredColors: ['U', 'R', 'W'],
    vetoedKeywords: ['graveyard', 'reanimate'],
    boostKeywords: ['instant', 'sorcery', 'prowess', 'magecraft', 'draw', 'lightning bolt'],
    corePackageId: 'spellslinger'
  },
  {
    id: 'blink_generic',
    label: 'Blink / Flicker (ETB Sinergia)',
    description: 'Exilia y regresa tus criaturas para repetir sus efectos de entrada.',
    requiredColors: ['W', 'U', 'G'],
    vetoedKeywords: ['sacrifice', 'discard'],
    boostKeywords: ['exile', 'return to battlefield', 'enters the battlefield', 'flicker', 'ephemerate'],
    corePackageId: 'blink'
  },
  {
    id: 'landfall_generic',
    label: 'Landfall / Sinergia de Tierras',
    description: 'Gana ventajas acumulativas cada vez que juegues una tierra.',
    requiredColors: ['G', 'R', 'U'],
    vetoedKeywords: ['sacrifice', 'discard'],
    boostKeywords: ['landfall', 'whenever a land enters', 'search your library for a land', 'valakut'],
    corePackageId: null
  },
  {
    id: 'graveyard_generic',
    label: 'Graveyard Value / Delirium / Dredge',
    description: 'Usa tu cementerio como una extensión de tu mano.',
    requiredColors: ['B', 'R', 'G', 'U'],
    vetoedKeywords: ['amass', 'orc'],
    boostKeywords: ['dredge', 'delirium', 'flashback', 'unearth', 'tarmogoyf', 'graveyard'],
    corePackageId: null
  },
  {
    id: 'lifegain_generic',
    label: 'Lifegain (Ganar Vidas)',
    description: 'Gana vidas de forma pasiva para disparar contadores y bonus.',
    requiredColors: ['W', 'B', 'G'],
    vetoedKeywords: [],
    boostKeywords: ['whenever you gain life', 'lifelink', 'gain life', 'soul warden', 'ajani\'s pridemate'],
    corePackageId: 'lifegain'
  },
  {
    id: 'prison_generic',
    label: 'Impuestos y Control Fiscal (Soft Prison)',
    description: 'Ralentiza la mesa del oponente cobrando impuestos de maná y ataques.',
    requiredColors: ['W', 'U', 'C'],
    vetoedKeywords: [],
    boostKeywords: ['costs', 'more to cast', 'can\'t attack', 'tax', 'thalia', 'ghostly prison'],
    corePackageId: null
  },
  {
    id: 'voltron_generic',
    label: 'Voltron (Equipos y Auras)',
    description: 'Potencia una única criatura con equipamientos pesados de bajo coste.',
    requiredColors: ['W', 'R'],
    vetoedKeywords: [],
    boostKeywords: ['equipped', 'equipment', 'aura', 'attach', 'colossus hammer', 'sigarda\'s aid'],
    corePackageId: 'voltron'
  },
  {
    id: 'tron_generic',
    label: 'Big Mana / Ramp (Tron & Titans)',
    description: 'Acelera masivamente el maná para invocar amenazas de CMC 5+.',
    requiredColors: ['G', 'C', 'R', 'U'],
    vetoedKeywords: [],
    boostKeywords: ['add ', 'mana', 'expedition map', 'ancient stirrings', 'wurmcoil', 'karn'],
    corePackageId: 'tron'
  },
  {
    id: 'vehicles_generic',
    label: 'Vehículos / Tripulación',
    description: 'Juega vehículos que esquivan limpiamesas conjuros y tripúlalos con criaturas.',
    requiredColors: ['R', 'W', 'U'],
    vetoedKeywords: [],
    boostKeywords: ['crew', 'vehicle', 'smuggler\'s copter', 'pilot'],
    corePackageId: null
  },
  {
    id: 'cascade_generic',
    label: 'Cascade / Cascada',
    description: 'Lanza hechizos con cascada para jugar gratis cartas de coste 0.',
    requiredColors: ['U', 'R', 'G', 'W', 'B'],
    vetoedKeywords: [],
    boostKeywords: ['cascade', 'suspend', 'crashing footfalls', 'shardless agent'],
    corePackageId: 'cascade'
  },
  {
    id: 'storm_generic',
    label: 'Storm / Tormenta',
    description: 'Encadena múltiples rituales y hechizos para lanzar un remate letal con Tormenta.',
    requiredColors: ['R', 'U', 'B'],
    vetoedKeywords: [],
    boostKeywords: ['storm', 'grapeshot', 'ritual', 'add {r}', 'add {u}', 'manamorphose', 'past in flames'],
    corePackageId: 'storm'
  },
  {
    id: 'affinity_generic',
    label: 'Affinity / Sinergias Metálicas',
    description: 'Despliega artefactos baratos de coste 0-1 para habilitar afinidad y metalcraft.',
    requiredColors: ['U', 'R', 'W', 'C'],
    vetoedKeywords: [],
    boostKeywords: ['affinity', 'metalcraft', 'artifact', 'steel overseer', 'cranial plating', 'memnite'],
    corePackageId: null
  }
];

export const MTG_TRIBES = [
  // TRIBUS CLÁSICAS
  { 
    id: 'human', 
    label: 'Humanos', 
    category: 'clasica', 
    colors: ['W', 'U', 'B', 'R', 'G'], 
    primaryColor: 'W', 
    strategies: ['tokens', 'voltron'], 
    archetypes: ['aggro', 'midrange', 'combo', 'prison'], 
    subtypes: ['human'],
    flavors: [
      {
        id: 'human_aggro',
        label: 'Gremio de Humanos (Aggro/Lords)',
        description: 'Acumula lords que potencian a todos tus atacantes humanos.',
        vetoedKeywords: [],
        boostKeywords: ['human', 'humans you control get', 'thalia\'s lieutenant', 'champion of the parish']
      },
      {
        id: 'human_taxes',
        label: 'Impuestos y Leyes (Hatebears)',
        description: 'Criaturas que entorpecen la estrategia del rival con reglas e impuestos.',
        vetoedKeywords: [],
        boostKeywords: ['human', 'costs', 'more to cast', 'can\'t search', 'thalia, guardian of thraben', 'magistrate'],
        corePackageId: 'prison'
      }
    ]
  },
  { 
    id: 'elf', 
    label: 'Elfos', 
    category: 'clasica', 
    colors: ['G', 'B', 'W'], 
    primaryColor: 'G', 
    strategies: ['tokens', 'toolbox'], 
    archetypes: ['aggro', 'midrange', 'combo', 'ramp'], 
    subtypes: ['elf'],
    flavors: [
      {
        id: 'elf_ramp',
        label: 'Devoción y Rampa (Big Mana)',
        description: 'Usa elfos dork para generar cantidades ingentes de maná y payoffs gigantes.',
        vetoedKeywords: [],
        boostKeywords: ['add ', 'mana', 'elf', 'archdruid', 'heritage druid', 'marwyn', 'craterhoof'],
        corePackageId: 'tron'
      },
      {
        id: 'elf_lords',
        label: 'Señores de Llanowar (Aggro)',
        description: 'Invade la mesa con elfos rápidos y señores que los potencian.',
        vetoedKeywords: [],
        boostKeywords: ['elves you control get', 'elf', 'elvish champion', 'eladamri', 'leaf-crowned visionary']
      },
      {
        id: 'elf_toolbox',
        label: 'Caja de Herramientas (Toolbox)',
        description: 'Busca los elfos y criaturas adecuadas para cada situación usando tutores.',
        vetoedKeywords: [],
        boostKeywords: ['search your library for a creature card', 'elf', 'chord of calling', 'yisan', 'fauna shaman']
      }
    ]
  },
  { 
    id: 'goblin', 
    label: 'Goblins', 
    category: 'clasica', 
    colors: ['R', 'B', 'G'], 
    primaryColor: 'R', 
    strategies: ['tokens', 'aristocrats'], 
    archetypes: ['aggro', 'midrange'], 
    subtypes: ['goblin'],
    flavors: [
      {
        id: 'goblin_aggro',
        label: 'Asalto de Goblins (Aggro/Burn)',
        description: 'Ataca rápido y lanza goblins directos a la cara del rival.',
        vetoedKeywords: [],
        boostKeywords: ['goblin', 'haste', 'damage to', 'goblin guide', 'goblin grenade', 'krenko']
      },
      {
        id: 'goblin_sacrifice',
        label: 'Combustión y Sacrificio',
        description: 'Sacrifica goblins para generar maná y daño letal.',
        vetoedKeywords: [],
        boostKeywords: ['sacrifice', 'dies', 'goblin', 'sling-gang lieutenant', 'squee, dubious', 'conspicuous snoop'],
        corePackageId: 'aristocrats'
      }
    ]
  },
  { 
    id: 'merfolk', 
    label: 'Tritones (Merfolk)', 
    category: 'clasica', 
    colors: ['U', 'G'], 
    primaryColor: 'U', 
    strategies: ['blink', 'tokens'], 
    archetypes: ['aggro', 'tempo', 'midrange'], 
    subtypes: ['merfolk'],
    flavors: [
      {
        id: 'merfolk_tempo',
        label: 'Tritones del Océano (Tempo)',
        description: 'Ataca con tritones imbloqueables y frena el ritmo del oponente.',
        vetoedKeywords: [],
        boostKeywords: ['merfolk', 'islandwalk', 'cannot be blocked', 'lord of atlantis', 'master of the pearl trident', 'tidebinder']
      }
    ]
  },
  { 
    id: 'zombie', 
    label: 'Zombies', 
    category: 'clasica', 
    colors: ['B', 'U'], 
    primaryColor: 'B', 
    strategies: ['aristocrats', 'reanimator', 'tokens'], 
    archetypes: ['aggro', 'midrange', 'combo'], 
    subtypes: ['zombie'],
    flavors: [
      {
        id: 'zombie_graveyard',
        label: 'Plaga y Cementerio',
        description: 'Zombies que vuelven del cementerio y generan valor recursivo.',
        vetoedKeywords: ['amass', 'orc', 'army'],
        boostKeywords: ['return from your graveyard', 'graveyard', 'zombie', 'gravecrawler', 'relentless dead', 'prized amalgam', 'stitcher\'s supplier'],
        corePackageId: 'reanimator'
      },
      {
        id: 'zombie_aristocrats',
        label: 'Aristócratas del Pantano',
        description: 'Sacrifica tus propios zombies para drenar vida al oponente.',
        vetoedKeywords: ['amass', 'orc', 'army'],
        boostKeywords: ['sacrifice', 'dies', 'zombie', 'plague belcher', 'diregraf captain', 'carrion feeder', 'blood artist'],
        corePackageId: 'aristocrats'
      },
      {
        id: 'zombie_lords',
        label: 'Señores de la Horda (Lords)',
        description: 'Dopa a todos tus zombies con señores tribales y ataca en masa.',
        vetoedKeywords: ['amass', 'orc', 'army'],
        boostKeywords: ['zombies you control get', 'zombie', 'death baron', 'cemetery reaper', 'lord of the accursed', 'diregraf colossus']
      },
      {
        id: 'zombie_amass',
        label: 'Horda Invasora (Amass)',
        description: 'Acumula un enorme ejército zombie usando mecánicas de Amass.',
        vetoedKeywords: [],
        boostKeywords: ['amass', 'army', 'zombie', 'dreadhorde invasion', 'lazotep chancellor', 'widespread brutality']
      }
    ]
  },
  { 
    id: 'vampire', 
    label: 'Vampiros', 
    category: 'clasica', 
    colors: ['B', 'R', 'W'], 
    primaryColor: 'B', 
    strategies: ['aristocrats', 'lifegain', 'reanimator'], 
    archetypes: ['aggro', 'midrange'], 
    subtypes: ['vampire'],
    flavors: [
      {
        id: 'vampire_aggro',
        label: 'Sed de Sangre (Lords/Aggro)',
        description: 'Ataca con vampiros voladores y rápidos potenciados por lords.',
        vetoedKeywords: [],
        boostKeywords: ['vampire', 'vampires you control get', 'flying', 'lifelink', 'legion lieutenant', 'stromkirk']
      },
      {
        id: 'vampire_drain',
        label: 'Drenaje de Sangre (Lifegain/Sacrifice)',
        description: 'Gana vida al atacar y drena al rival con sacrificios.',
        vetoedKeywords: [],
        boostKeywords: ['gain life', 'sacrifice', 'vampire', 'vein ripper', 'cruel celebrant', 'blood artist'],
        corePackageId: 'aristocrats'
      }
    ]
  },
  { id: 'spirit', label: 'Espíritus', category: 'clasica', colors: ['W', 'U'], primaryColor: ['W', 'U'], strategies: ['blink', 'tokens'], archetypes: ['aggro', 'tempo', 'midrange', 'control'], subtypes: ['spirit'] },
  { id: 'soldier', label: 'Soldados', category: 'clasica', colors: ['W', 'U'], primaryColor: 'W', strategies: ['tokens', 'voltron'], archetypes: ['aggro', 'midrange', 'prison'], subtypes: ['soldier'] },
  { id: 'knight', label: 'Caballeros', category: 'clasica', colors: ['W', 'B', 'R'], primaryColor: 'W', strategies: ['voltron', 'tokens'], archetypes: ['aggro', 'midrange'], subtypes: ['knight'] },

  // VOCACIONES
  { id: 'wizard', label: 'Magos (Wizards)', category: 'vocacion', colors: ['U', 'R', 'B'], primaryColor: 'U', strategies: ['spellslinger', 'blink'], archetypes: ['aggro', 'tempo', 'midrange', 'combo', 'control'], subtypes: ['wizard'] },
  { id: 'cleric', label: 'Clérigos', category: 'vocacion', colors: ['W', 'B'], primaryColor: 'W', strategies: ['lifegain', 'aristocrats', 'reanimator'], archetypes: ['aggro', 'midrange', 'combo', 'prison'], subtypes: ['cleric'] },
  { id: 'rogue', label: 'Pícaros (Rogues)', category: 'vocacion', colors: ['U', 'B'], primaryColor: ['U', 'B'], strategies: ['aristocrats'], archetypes: ['aggro', 'tempo', 'midrange', 'combo'], subtypes: ['rogue'] },
  { 
    id: 'shaman', 
    label: 'Chamanes', 
    category: 'vocacion', 
    colors: ['G', 'R', 'B'], 
    primaryColor: 'G', 
    strategies: ['tokens', 'landfall'], 
    archetypes: ['midrange', 'combo'], 
    subtypes: ['shaman'],
    flavors: [
      {
        id: 'shaman_rage',
        label: 'Furia Chamánica (Aggro/Lords)',
        description: 'Usa chamanes agresivos y potenciadores de contadores.',
        vetoedKeywords: [],
        boostKeywords: ['shaman', 'rage forger', 'burning-tree emissary', 'goblin ruin-blaster', 'bosk banneret']
      }
    ]
  },
  { 
    id: 'druid', 
    label: 'Druidas', 
    category: 'vocacion', 
    colors: ['G', 'W'], 
    primaryColor: 'G', 
    strategies: ['tokens', 'landfall'], 
    archetypes: ['midrange', 'combo', 'ramp'], 
    subtypes: ['druid'],
    flavors: [
      {
        id: 'druid_ramp',
        label: 'Círculo del Bosque (Big Mana/Ramp)',
        description: 'Genera maná masivo y acelera con devoción a las tierras.',
        vetoedKeywords: [],
        boostKeywords: ['druid', 'add ', 'mana', 'devoted druid', 'heritage druid', 'leaf-crowned visionary']
      }
    ]
  },
  { 
    id: 'ninja', 
    label: 'Ninjas', 
    category: 'vocacion', 
    colors: ['U', 'B'], 
    primaryColor: ['U', 'B'], 
    strategies: ['ninjutsu', 'blink'], 
    archetypes: ['tempo', 'midrange'], 
    subtypes: ['ninja'], 
    formats: ['MODERN'],
    flavors: [
      {
        id: 'ninja_tempo',
        label: 'Infiltración Ninja (Ninjutsu/Tempo)',
        description: 'Ataca con criaturas evasivas baratas y juega ninjas con descuento por combate.',
        vetoedKeywords: [],
        boostKeywords: ['ninja', 'ninjutsu', 'combat damage', 'can\'t be blocked', 'yuriko', 'thousand-faced shadow', 'ingenious artillerist', 'silver-raven']
      }
    ]
  },
  { 
    id: 'pirate', 
    label: 'Piratas', 
    category: 'vocacion', 
    colors: ['U', 'B', 'R'], 
    primaryColor: 'R', 
    strategies: ['tempo', 'tokens'], 
    archetypes: ['aggro', 'tempo', 'midrange'], 
    subtypes: ['pirate'],
    flavors: [
      {
        id: 'pirate_tempo',
        label: 'Invasores de Alta Mar (Tempo/Treasure)',
        description: 'Ataca con piratas veloces y genera tesoros para acelerar tus hechizos de tempo.',
        vetoedKeywords: [],
        boostKeywords: ['pirate', 'treasure', 'ragavan', 'malcolm', 'breeches', 'coercive portal']
      }
    ]
  },

  // MONSTRUOS
  { 
    id: 'angel', 
    label: 'Ángeles', 
    category: 'monstruo', 
    colors: ['W', 'R', 'B'], 
    primaryColor: 'W', 
    strategies: ['lifegain', 'blink', 'reanimator'], 
    archetypes: ['midrange', 'combo', 'control'], 
    subtypes: ['angel'],
    flavors: [
      {
        id: 'angel_lifegain',
        label: 'Corte Celestial (Lifegain Angels)',
        description: 'Invoca ángeles majestuosos que ganan vida y se potencian mutuamente.',
        vetoedKeywords: [],
        boostKeywords: ['angel', 'flying', 'gain life', 'angels you control', 'giada', 'righteous valkyrie', 'lyra dawnbringer']
      }
    ]
  },
  { 
    id: 'demon', 
    label: 'Demonios', 
    category: 'monstruo', 
    colors: ['B'], 
    primaryColor: 'B', 
    strategies: ['aristocrats', 'reanimator'], 
    archetypes: ['midrange', 'combo'], 
    subtypes: ['demon'],
    flavors: [
      {
        id: 'demon_pact',
        label: 'Pacto Infernal (Big Mana & Sacrifice)',
        description: 'Demonios colosales que exigen sacrificios y aplastan con poder puro.',
        vetoedKeywords: [],
        boostKeywords: ['demon', 'flying', 'sacrifice', 'demonic', 'archfiend of the dross', 'shadowborn apostle', 'razaketh']
      }
    ]
  },
  { 
    id: 'dragon', 
    label: 'Dragones', 
    category: 'monstruo', 
    colors: ['R', 'B', 'G'], 
    primaryColor: 'R', 
    strategies: ['reanimator', 'tokens'], 
    archetypes: ['midrange', 'combo'], 
    subtypes: ['dragon'],
    flavors: [
      {
        id: 'dragon_ramp',
        label: 'Tempestad de Dragones (Big Mana)',
        description: 'Lanza dragones voladores devastadores con prisa y daño directo.',
        vetoedKeywords: [],
        boostKeywords: ['dragon', 'flying', 'haste', 'dragons you control', 'sarkhan', 'thunderbreak regent', 'dragonlord']
      },
      {
        id: 'dragon_reanimator',
        label: 'Despertar de los Dragones (Reanimator)',
        description: 'Manda dragones legendarios al cementerio y revívelos velozmente.',
        vetoedKeywords: [],
        boostKeywords: ['dragon', 'reanimate', 'goryo\'s', 'archon', 'atarka', 'scion of the ur-dragon'],
        corePackageId: 'reanimator'
      }
    ]
  },
  { 
    id: 'dinosaur', 
    label: 'Dinosaurios', 
    category: 'monstruo', 
    colors: ['R', 'G', 'W'], 
    primaryColor: 'G', 
    strategies: ['landfall', 'tokens'], 
    archetypes: ['aggro', 'midrange', 'combo'], 
    subtypes: ['dinosaur'],
    flavors: [
      {
        id: 'dinosaur_enrage',
        label: 'Furia Jurásica (Enrage/Stomp)',
        description: 'Aprovecha habilidades de enfurecer al recibir daño y arrolla al rival.',
        vetoedKeywords: [],
        boostKeywords: ['dinosaur', 'enrage', 'trample', 'gishath', 'marauding raptor', 'carnage tyrant', 'ripjaw raptor']
      }
    ]
  },
  { 
    id: 'beast', 
    label: 'Bestias (Beasts)', 
    category: 'monstruo', 
    colors: ['G', 'R', 'W'], 
    primaryColor: 'G', 
    strategies: ['landfall', 'tokens'], 
    archetypes: ['aggro', 'midrange', 'ramp'], 
    subtypes: ['beast'],
    flavors: [
      {
        id: 'beast_stomp',
        label: 'Manada Salvafe (Beast Stompy)',
        description: 'Bestias salvajes de gran fuerza bruta y resistencia en combate.',
        vetoedKeywords: [],
        boostKeywords: ['beast', 'trample', 'garruk', 'ravenous baloth', 'leatherback baloth', 'questing beast']
      }
    ]
  },
  { id: 'elemental', label: 'Elementales', category: 'monstruo', colors: ['R', 'G', 'U', 'W', 'B'], primaryColor: ['R', 'G'], strategies: ['landfall', 'blink', 'reanimator'], archetypes: ['aggro', 'midrange', 'combo', 'ramp'], subtypes: ['elemental'] },

  // EXÓTICAS
  { 
    id: 'eldrazi', 
    label: 'Eldrazi (Eldrazi Tron / Aggro)', 
    category: 'exotica', 
    colors: ['W', 'U', 'B', 'R', 'G', 'C'], 
    primaryColor: 'C', 
    strategies: ['tokens', 'blink'], 
    archetypes: ['aggro', 'midrange', 'prison', 'ramp'], 
    subtypes: ['eldrazi'], 
    formats: ['MODERN'],
    flavors: [
      {
        id: 'eldrazi_tron',
        label: 'Eldrazi Tron (Incoloro / Big Mana)',
        description: 'Invoca titanes incoloros devastadores con tierras Tron y Eldrazi Temple.',
        vetoedKeywords: [],
        boostKeywords: ['eldrazi', 'thought-knot seer', 'reality smasher', 'matter reshaper', 'ulamog', 'karn', 'expedition map']
      }
    ]
  },
  { 
    id: 'faerie', 
    label: 'Hadas (Faeries)', 
    category: 'exotica', 
    colors: ['U', 'B'], 
    primaryColor: 'U', 
    strategies: ['blink', 'spellslinger'], 
    archetypes: ['tempo', 'midrange', 'control'], 
    subtypes: ['faerie', 'fairy'],
    flavors: [
      {
        id: 'faerie_tempo',
        label: 'Travesura de Hadas (Faeries Flash/Tempo)',
        description: 'Juega en el turno oponente con destello e interrumpe sus hechizos.',
        vetoedKeywords: [],
        boostKeywords: ['faerie', 'fairy', 'flash', 'flying', 'counter target', 'spellstutter', 'bitterblossom', 'mistbind clique']
      }
    ]
  },
  { 
    id: 'rat', 
    label: 'Ratas (Rats)', 
    category: 'exotica', 
    colors: ['B'], 
    primaryColor: 'B', 
    strategies: ['tokens', 'aristocrats'], 
    archetypes: ['aggro', 'midrange'], 
    subtypes: ['rat'],
    flavors: [
      {
        id: 'rat_plague',
        label: 'Plaga de Ratas (Rat Colony/Tokens)',
        description: 'Enjambre inagotable de ratas que crecen en grupo y drenan al rival.',
        vetoedKeywords: [],
        boostKeywords: ['rat', 'rats', 'pack rat', 'marrow-gnawer', 'lord skitter', 'rat colony', 'relentless rats']
      }
    ]
  },
  { 
    id: 'squirrel', 
    label: 'Ardillas (Squirrels)', 
    category: 'exotica', 
    colors: ['G', 'B'], 
    primaryColor: 'G', 
    strategies: ['tokens', 'aristocrats'], 
    archetypes: ['aggro', 'combo'], 
    subtypes: ['squirrel'],
    flavors: [
      {
        id: 'squirrel_swarm',
        label: 'Enjambre del Bosque (Squirrel Swarm)',
        description: 'Genera fichas de ardilla masivas impulsadas por Chatterfang.',
        vetoedKeywords: [],
        boostKeywords: ['squirrel', 'squirrels', 'chatterfang', 'squirrel sovereign', 'deep forest hermit', 'chatterstorm']
      }
    ]
  },
  { 
    id: 'cat', 
    label: 'Felinos (Cats)', 
    category: 'exotica', 
    colors: ['W', 'G'], 
    primaryColor: 'W', 
    strategies: ['voltron', 'tokens'], 
    archetypes: ['aggro', 'midrange'], 
    subtypes: ['cat', 'leonin'],
    flavors: [
      {
        id: 'cat_equipment',
        label: 'Orgullo de Felinos & Equipos',
        description: 'Gatos y Leonines ágiles equipados para el combate.',
        vetoedKeywords: [],
        boostKeywords: ['cat', 'leonin', 'equipment', 'kemba', 'king darien', 'feline sovereign', 'fleecemane lion']
      }
    ]
  },
  { id: 'constructs', label: 'Constructos & Myr (Affinity)', category: 'exotica', colors: ['C', 'U', 'R', 'W'], primaryColor: 'C', strategies: ['tokens', 'vehicles'], archetypes: ['aggro', 'midrange', 'combo', 'prison'], subtypes: ['construct', 'myr', 'golem', 'thopter'], formats: ['MODERN'] },
  { id: 'sliver-5c', label: 'Slivers (Pentacolor 5C)', category: 'exotica', colors: ['W', 'U', 'B', 'R', 'G'], primaryColor: ['W', 'U', 'B', 'R', 'G'], strategies: ['tokens', 'slivers'], archetypes: ['aggro', 'midrange', 'combo', 'tempo'], subtypes: ['sliver'], formats: ['MODERN'] },
  { id: 'sliver-bant', label: 'Slivers (Bant/Naya Base)', category: 'exotica', colors: ['W', 'U', 'G', 'R'], primaryColor: ['G', 'W'], strategies: ['tokens', 'slivers'], archetypes: ['aggro', 'midrange', 'combo', 'tempo'], subtypes: ['sliver'], formats: ['MODERN'] },

  // ALIANZAS Y MEZCLAS TEMÁTICAS
  { id: 'boros_guild', label: '⚔️ Gremio Boros (Prowess & Sunforger)', category: 'alianza', colors: ['W', 'R'], primaryColor: 'R', strategies: ['spellslinger', 'voltron'], archetypes: ['aggro', 'tempo', 'midrange'], subtypes: ['human', 'soldier', 'knight'] },
  { id: 'golgari_guild', label: '💀 Gremio Golgari (Dredge & Undergrowth)', category: 'alianza', colors: ['B', 'G'], primaryColor: 'B', strategies: ['reanimator', 'aristocrats'], archetypes: ['midrange', 'combo', 'reanimator'], subtypes: ['zombie', 'elf', 'plant', 'fungus'] },
  { id: 'dimir_guild', label: '👁️ Gremio Dimir (Infiltración & Tempo)', category: 'alianza', colors: ['U', 'B'], primaryColor: 'U', strategies: ['ninjutsu', 'spellslinger'], archetypes: ['tempo', 'control', 'midrange'], subtypes: ['rogue', 'ninja', 'faerie'] },
  { id: 'izzet_guild', label: '⚡ Gremio Izzet (Spellslinger & Prowess)', category: 'alianza', colors: ['U', 'R'], primaryColor: 'R', strategies: ['spellslinger'], archetypes: ['tempo', 'aggro', 'control'], subtypes: ['wizard', 'dragon'] },
  { id: 'orzhov_guild', label: '⚖️ Gremio Orzhov (Drenaje & Aristócratas)', category: 'alianza', colors: ['W', 'B'], primaryColor: 'B', strategies: ['aristocrats', 'lifegain'], archetypes: ['midrange', 'control', 'aristocrats'], subtypes: ['cleric', 'vampire', 'human'] },
  { id: 'simic_guild', label: '🌀 Gremio Simic (Evolución & Contadores +1/+1)', category: 'alianza', colors: ['G', 'U'], primaryColor: 'G', strategies: ['tokens', 'blink'], archetypes: ['midrange', 'ramp', 'tempo'], subtypes: ['merfolk', 'mutant', 'elf'] },
  { id: 'esper_shard', label: '🏛️ Alianza Esper (Artefactos & Destello)', category: 'alianza', colors: ['W', 'U', 'B'], primaryColor: 'U', strategies: ['spellslinger', 'blink'], archetypes: ['control', 'midrange', 'tempo'], subtypes: ['human', 'faerie', 'construct'] },
  { id: 'jund_shard', label: '🔥 Alianza Jund (Desgaste & Sacrificio)', category: 'alianza', colors: ['B', 'R', 'G'], primaryColor: 'B', strategies: ['aristocrats'], archetypes: ['midrange', 'combo', 'aggro'], subtypes: ['goblin', 'dragon', 'shaman'] },
  { id: 'naya_shard', label: '🌿 Alianza Naya (Bestias & Enjambre)', category: 'alianza', colors: ['R', 'G', 'W'], primaryColor: 'G', strategies: ['tokens', 'landfall'], archetypes: ['aggro', 'ramp', 'midrange'], subtypes: ['dinosaur', 'beast', 'cat'] },
  { id: 'jeskai_shard', label: '✨ Alianza Jeskai (Prowess & Tempo Burn)', category: 'alianza', colors: ['U', 'R', 'W'], primaryColor: 'R', strategies: ['spellslinger'], archetypes: ['tempo', 'aggro', 'control'], subtypes: ['monk', 'wizard', 'human'] },
  { id: 'sultai_shard', label: '🐊 Alianza Sultai (Reanimación & Cementerio)', category: 'alianza', colors: ['B', 'G', 'U'], primaryColor: 'B', strategies: ['reanimator', 'aristocrats'], archetypes: ['midrange', 'combo', 'control', 'reanimator'], subtypes: ['naga', 'zombie', 'elf'] },
  { id: 'outlaws', label: '⚖️ Forajidos (Asesinos, Mercenarios, Piratas, Pícaros)', category: 'alianza', colors: ['B', 'R', 'U'], primaryColor: 'B', strategies: ['aristocrats', 'ninjutsu', 'tokens'], archetypes: ['aggro', 'tempo', 'midrange'], subtypes: ['assassin', 'mercenary', 'pirate', 'rogue', 'warlock'] },
  { id: 'party', label: '🎲 Grupo de Aventura (Clérigo, Pícaro, Guerrero, Mago)', category: 'alianza', colors: ['W', 'U', 'B', 'R', 'G'], primaryColor: ['W', 'U', 'B', 'R'], strategies: ['blink', 'toolbox'], archetypes: ['midrange', 'prison', 'aggro'], subtypes: ['cleric', 'rogue', 'warrior', 'wizard'] },
  { id: 'human_army', label: '⚔️ Ejército (Humanos, Soldados, Caballeros)', category: 'alianza', colors: ['W', 'R'], primaryColor: 'W', strategies: ['tokens', 'voltron'], archetypes: ['aggro', 'midrange', 'prison'], subtypes: ['human', 'soldier', 'knight'] },
  { id: 'goblin_horde', label: '🔥 Horda (Goblins, Orcos, Ogros)', category: 'alianza', colors: ['R', 'B'], primaryColor: 'R', strategies: ['tokens', 'aristocrats'], archetypes: ['aggro', 'midrange'], subtypes: ['goblin', 'orc', 'ogre'] },
  { id: 'elf_druid', label: '🌿 Naturaleza (Elfos, Druidas, Elementales)', category: 'alianza', colors: ['G', 'R', 'U'], primaryColor: 'G', strategies: ['tokens', 'landfall'], archetypes: ['midrange', 'combo', 'ramp'], subtypes: ['elf', 'druid', 'elemental'] },
  { id: 'sea_monsters', label: '🌊 Terrores Marinos (Tritones, Krakens, Leviatanes)', category: 'alianza', colors: ['U', 'G'], primaryColor: 'U', strategies: ['sea_monsters', 'blink'], archetypes: ['tempo', 'midrange', 'combo', 'control', 'ramp'], subtypes: ['merfolk', 'kraken', 'leviathan', 'octopus', 'rose-monsters', 'serpent'], formats: ['MODERN'] },
  { id: 'undead_scourge', label: '💀 Plaga (Zombies, Esqueletos, Horrores)', category: 'alianza', colors: ['B', 'U'], primaryColor: 'B', strategies: ['aristocrats', 'reanimator', 'graveyard'], archetypes: ['midrange', 'combo', 'control', 'reanimator'], subtypes: ['zombie', 'skeleton', 'horror'] },
  { id: 'apex_predators', label: '🦖 Depredadores del Ápice (Dinosaurios, Bestias, Hidras)', category: 'alianza', colors: ['G', 'R', 'W'], primaryColor: 'G', strategies: ['landfall', 'tokens', 'lifegain'], archetypes: ['midrange', 'ramp', 'aggro'], subtypes: ['dinosaur', 'beast', 'hydra', 'wurm', 'dragon'] },
  { id: 'sliver', label: 'Slivers (Fectidios Sinérgicos)', category: 'exotica', colors: ['W', 'U', 'B', 'R', 'G'], primaryColor: ['W', 'U', 'B', 'R', 'G'], strategies: ['tokens', 'voltron'], archetypes: ['aggro', 'midrange', 'combo'], subtypes: ['sliver'], formats: ['MODERN'] }
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
    keywords: ['persist', 'goryo\'s vengeance', 'unburial rites', 'discard', 'put target creature', 'graveyard onto the battlefield', 'priest of fell rites', 'late to dinner', 'archon of cruelty', 'atraxa'],
    formats: ['MODERN']
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
    keywords: ['equipped creature', 'enchanted creature', 'equipment', 'aura', 'colossus hammer', 'sigarda\'s aid', 'puresteel paladin'],
    formats: ['MODERN']
  },
  { 
    id: 'tron', 
    label: 'Big Mana (Tron, Eldrazi & Titans)', 
    colors: ['G', 'C', 'R', 'U'], 
    primaryColor: ['G', 'C'],
    archetypes: ['ramp', 'combo', 'midrange', 'prison'],
    mechanics: 'Ensambla el trío de tierras de Urza o acelera masivamente en los primeros turnos para encadenar Eldrazis legendarios o Titanes devastadores.',
    keywords: ["urza's", 'power plant', 'mine', 'tower', 'expedition map', 'sylvan scrying', 'ancient stirrings', 'chromatic star', 'chromatic sphere', 'karn', 'wurmcoil', 'ulamog', 'titan'],
    formats: ['MODERN']
  },
  { 
    id: 'ramp', 
    label: 'Ramp / Big Mana (Colored)', 
    colors: ['G', 'C', 'U', 'R', 'B', 'W'], 
    primaryColor: 'G',
    archetypes: ['ramp', 'midrange', 'combo'],
    mechanics: 'Acelera tu maná usando criaturas (Mana Dorks) o conjuros de búsqueda de tierras para lanzar finishers de alto coste de tus propios colores.',
    keywords: ['ramp', 'search your library for a land', 'mana dork', 'cultivate', 'farseek', 'rampant growth', 'birds of paradise', 'llanowar elves', 'titan', 'craterhoof'],
    formats: ['MODERN', 'STANDARD', 'PIONEER']
  },
  { 
    id: 'vehicles', 
    label: 'Vehículos (Copter & Crew)', 
    colors: ['R', 'W', 'U'], 
    primaryColor: 'R',
    archetypes: ['aggro', 'tempo', 'midrange'],
    mechanics: 'Tripula vehículos evasivos o destructivos (Smuggler\'s Copter) esquivando limpiamesas conjuros.',
    keywords: ['crew', 'vehicle', 'smuggler\'s copter', 'heart of kiran', 'pilot']
  },
  { 
    id: 'cascade', 
    label: 'Cascade (Rhinos / Living End)', 
    colors: ['W', 'U', 'R', 'G', 'B'], 
    primaryColor: ['U', 'G'],
    archetypes: ['combo', 'tempo'],
    mechanics: 'Ensambla cascadas de coste 3 para castear automáticamente hechizos demoledores de coste 0.',
    keywords: ['cascade', 'suspend', 'crashing footfalls', 'living end', 'shardless agent', 'ardent plea'],
    formats: ['MODERN']
  },
  { 
    id: 'storm', 
    label: 'Storm Combo (Ruby Storm / Grapeshot)', 
    colors: ['R', 'U', 'B'], 
    primaryColor: ['R', 'U'],
    archetypes: ['combo'],
    mechanics: 'Encadena múltiples rituales y hechizos cantrips de coste bajo en un solo turno para finalizar con un hechizo con la mecánica de Tormenta (Grapeshot, Empty the Warrens).',
    keywords: ['storm', 'grapeshot', 'empty the warrens', 'add {r}', 'add {u}', 'ritual', 'manamorphose', 'ruby medallion', 'ral, monsoon mage', 'baral', 'electromancer', 'past in flames', 'wish', 'tendrils of agony', 'desperate ritual', 'pyretic ritual', 'seething song', 'strike', 'draw'],
    formats: ['MODERN']
  },
  {
    id: "ninjutsu",
    label: "Ninjutsu / Tempo",
    mechanics: "Atacar con criaturas evasivas baratas y regresarlas a la mano para jugar Ninjas con descuento.",
    colors: ["U", "B"],
    primaryColor: ["U", "B"],
    archetypes: ['tempo', 'aggro']
  },
  {
    id: "slivers",
    label: "Sliver Hive",
    mechanics: "Colmena de criaturas que comparten habilidades y se potencian mutuamente de forma exponencial.",
    colors: ["W", "U", "B", "R", "G"],
    primaryColor: ["W", "U", "B", "R", "G"],
    archetypes: ['aggro', 'midrange', 'combo']
  },
  { 
    id: 'toolbox', 
    label: 'Toolbox (Tutors & Silver Bullets)', 
    colors: ['G', 'W', 'B', 'R'], 
    primaryColor: 'G',
    archetypes: ['midrange', 'combo'],
    mechanics: 'Utiliza tutores y motores de búsqueda para encontrar criaturas específicas ("Silver Bullets") y responder a cualquier amenaza o ensamblar un combo letal.',
    keywords: ['search your library for a creature card', 'chord of calling', 'eldritch evolution', 'birthing pod', 'tutor', 'silver bullet', 'toolbox', 'yisan', 'fauna shaman'],
    formats: ['MODERN', 'STANDARD', 'PIONEER']
  },
  {
    id: 'affinity',
    label: 'Affinity (Artefactos y Sinergias Metálicas)',
    colors: ['U', 'R', 'B', 'W', 'G', 'C'],
    primaryColor: ['U', 'R'],
    archetypes: ['aggro', 'midrange', 'combo'],
    mechanics: 'Despliega rápidamente una masa crítica de artefactos de bajo coste para habilitar afinidad por artefactos y metalcraft.',
    keywords: ['affinity', 'metalcraft', 'improvise', 'artifact', 'steel overseer', 'cranial plating', 'springleaf drum', 'memnite', 'ornithopter', 'frogmite', 'thought monitor', 'patchwork automaton', 'sojourner\'s companion', 'welder', 'daretti', 'sai, master', 'emry', 'urza, lord', 'shalt', 'retrovierte', 'construct', 'servo', 'thopter', 'myr', 'gingerbrute', 'stonecoil', 'scales', 'plating', 'drum', 'monitor', 'enforcer', 'companion', 'skitterbeam', 'cannoneer', 'synthesizer', 'esper sentinel'],
    formats: ['MODERN']
  },
  {
    id: 'sea_monsters',
    label: 'Sea Monsters (Krakens, Leviatanes y Gigantes Marinos)',
    colors: ['U', 'G'],
    primaryColor: 'U',
    archetypes: ['midrange', 'control', 'ramp'],
    mechanics: 'Controla el juego temprano y rampa para lanzar enormes criaturas marinas del fondo del océano.',
    keywords: ['kraken', 'leviathan', 'octopus', 'serpent', 'sea monsters', 'quest for ula\'s temple', 'whelming wave', 'serpent of yawning depths', 'kiora', 'scourge of fleecemere', 'seamonster', 'fish', 'marid', 'shipbreaker', 'spire goliath', 'tromokratis', 'lorthos', 'inkwell leviathan', 'simic sky swallower', 'aesi', 'tatyova', 'ramp', 'sea'],
    formats: ['MODERN']
  }
];

// --- MOTOR CENTRALIZADO DE REGLAS PARASITARIAS (PODA PROACTIVA Y VALIDACIÓN) ---
export const PARASITIC_RULES = [
  {
    id: 'sliver',
    regex: /\bsliver\b/i,
    allowed: (formData) => {
      const tribe = (formData.tribe || '').toLowerCase();
      return tribe.includes('sliver');
    },
    message: 'requiere soporte de la tribu de Slivers'
  },
  {
    id: 'energy',
    regex: /\{e\}|energy counter/i,
    allowed: (formData) => {
      const format = (formData?.format || '').toUpperCase();
      return format === 'PIONEER' || format === 'MODERN';
    },
    message: 'requiere soporte de la mecánica de Energía'
  },
  {
    id: 'infect_poison',
    regex: /\binfect\b|\bpoison counter\b|\btoxic\b/i,
    allowed: (formData) => false,
    message: 'requiere soporte de la mecánica de Infección/Poison/Toxic'
  },
  {
    id: 'artifact_strict',
    regex: /as an additional cost to cast this spell, sacrifice an artifact|if you control an artifact|metalcraft|whenever an artifact enters|whenever you cast an artifact/i,
    allowed: (formData) => {
      const strat = (formData.strategy || '').toLowerCase();
      const tribe = (formData.tribe || '').toLowerCase();
      return strat.includes('vehicles') || strat.includes('affinity') || tribe.includes('construct') || tribe.includes('myr') || strat.includes('tron') || strat.includes('aristocrats');
    },
    message: 'requiere soporte dedicado de Artefactos'
  },
  {
    id: 'aura_strict',
    regex: /enchant creature|enchanted creature|whenever you cast an aura|aura/i,
    allowed: (formData) => {
      const strat = (formData.strategy || '').toLowerCase();
      return strat.includes('enchantress') || strat.includes('voltron') || strat.includes('aura');
    },
    message: 'requiere soporte dedicado de Auras o Encantamientos'
  },
  {
    id: 'elf_support',
    regex: /\bother elves\b|\banother elf\b|\belf you control\b/i,
    allowed: (formData) => {
      const tribe = (formData.tribe || '').toLowerCase();
      return tribe.includes('elf') || tribe.includes('nature');
    },
    message: 'requiere soporte de la tribu de Elfos'
  },
  {
    id: 'goblin_support',
    regex: /\bother goblins\b|\banother goblin\b|\bgoblin you control\b/i,
    allowed: (formData) => {
      const tribe = (formData.tribe || '').toLowerCase();
      return tribe.includes('goblin') || tribe.includes('horde');
    },
    message: 'requiere soporte de la tribu de Goblins'
  },
  {
    id: 'merfolk_support',
    regex: /\bother merfolk\b|\banother merfolk\b|\bmerfolk you control\b/i,
    allowed: (formData) => {
      const tribe = (formData.tribe || '').toLowerCase();
      return tribe.includes('merfolk') || tribe.includes('sea_monsters');
    },
    message: 'requiere soporte de la tribu de Merfolks'
  },
  {
    id: 'zombie_support',
    regex: /\bother zombies\b|\banother zombie\b|\bzombie you control\b/i,
    allowed: (formData) => {
      const tribe = (formData.tribe || '').toLowerCase();
      return tribe.includes('zombie') || tribe.includes('undead');
    },
    message: 'requiere soporte de la tribu de Zombies'
  },
  {
    id: 'vampire_support',
    regex: /\bother vampires\b|\banother vampire\b|\bvampire you control\b/i,
    allowed: (formData) => {
      const tribe = (formData.tribe || '').toLowerCase();
      return tribe.includes('vampire') || tribe.includes('undead');
    },
    message: 'requiere soporte de la tribu de Vampiros'
  },
  {
    id: 'human_support',
    regex: /\bother humans\b|\banother human\b|\bhuman you control\b/i,
    allowed: (formData) => {
      const tribe = (formData.tribe || '').toLowerCase();
      return tribe.includes('human') || tribe.includes('army') || tribe.includes('party');
    },
    message: 'requiere soporte de la tribu de Humanos'
  },
  {
    id: 'spirit_support',
    regex: /\bother spirits\b|\banother spirit\b|\bspirit you control\b/i,
    allowed: (formData) => {
      const tribe = (formData.tribe || '').toLowerCase();
      return tribe.includes('spirit');
    },
    message: 'requiere soporte de la tribu de Espíritus'
  },
  {
    id: 'knight_support',
    regex: /\bother knights\b|\banother knight\b|\bknight you control\b/i,
    allowed: (formData) => {
      const tribe = (formData.tribe || '').toLowerCase();
      return tribe.includes('knight') || tribe.includes('army');
    },
    message: 'requiere soporte de la tribu de Caballeros'
  },
  {
    id: 'soldier_support',
    regex: /\bother soldiers\b|\banother soldier\b|\bsoldier you control\b/i,
    allowed: (formData) => {
      const tribe = (formData.tribe || '').toLowerCase();
      return tribe.includes('soldier') || tribe.includes('army');
    },
    message: 'requiere soporte de la tribu de Soldados'
  },
  {
    id: 'wizard_support',
    regex: /\bother wizards\b|\banother wizard\b|\bwizard you control\b/i,
    allowed: (formData) => {
      const tribe = (formData.tribe || '').toLowerCase();
      return tribe.includes('wizard') || tribe.includes('party');
    },
    message: 'requiere soporte de la tribu de Magos'
  },
  {
    id: 'dinosaur_support',
    regex: /\bother dinosaurs\b|\banother dinosaur\b|\bdinosaur you control\b/i,
    allowed: (formData) => {
      const tribe = (formData.tribe || '').toLowerCase();
      return tribe.includes('dinosaur') || tribe.includes('apex');
    },
    message: 'requiere soporte de la tribu de Dinosaurios'
  },
  {
    id: 'eldrazi_support',
    regex: /\bother eldrazi\b|\banother eldrazi\b|\beldrazi you control\b/i,
    allowed: (formData) => {
      const tribe = (formData.tribe || '').toLowerCase();
      return tribe.includes('eldrazi');
    },
    message: 'requiere soporte de la tribu de Eldrazis'
  }
];

// Matrix estática de exclusión competitiva de no-bos para el Juez Supremo
export const COMPETITIVE_ANTI_SYNERGIES = [
  {
    card: "Murktide Regent",
    strategy: "cascade",
    replacement: "Orcish Bowmasters",
    reason: "Murktide Regent requiere exiliar recursos del cementerio, provocando fricción (non-bo) con habilitadores de Cascade."
  },
  {
    card: "Thalia, Guardian of Thraben",
    strategy: "spellslinger",
    replacement: "Dragon's Rage Channeler",
    reason: "Thalia cobra impuestos a tus propios instantáneos/conjuros en una estrategia de Prowess o Spellslinger."
  },
  {
    card: "Rest in Peace",
    strategy: "graveyard",
    replacement: "Prismatic Ending",
    reason: "Rest in Peace aniquila tus propios motores de cementerio (Dredge/Delirium) en el mazo principal."
  },
  {
    card: "Grafdigger's Cage",
    strategy: "reanimator",
    replacement: "Thoughtseize",
    reason: "Grafdigger's Cage bloquea la reanimación de criaturas de tu propio cementerio."
  }
];

export function inferStrategyFromArchetype(archetypeId, currentStrategyId, promptText = '') {
  const s = (currentStrategyId || '').toLowerCase();
  let cleanStrategyId = s.replace('_generic', '').trim();

  if (cleanStrategyId && cleanStrategyId !== 'general') {
    if (s.includes('aristocrat') || s.includes('sacrificio') || s.includes('sacrifice')) cleanStrategyId = 'aristocrats';
    else if (s.includes('reanimador') || s.includes('reanimate') || s.includes('reanimator')) cleanStrategyId = 'reanimator';
    else if (s.includes('spellslinger') || s.includes('prowess')) cleanStrategyId = 'spellslinger';
    else if (s.includes('blink') || s.includes('flicker')) cleanStrategyId = 'blink';
    else if (s.includes('landfall') || s.includes('tierras')) cleanStrategyId = 'landfall';
    else if (s.includes('ramp') || s.includes('rampa')) cleanStrategyId = 'ramp';
    else if (s.includes('graveyard') || s.includes('delirium') || s.includes('cementerio')) cleanStrategyId = 'graveyard';
    else if (s.includes('lifegain') || s.includes('vidas')) cleanStrategyId = 'lifegain';
    else if (s.includes('prison') || s.includes('impuestos') || s.includes('taxes') || s.includes('fiscal')) cleanStrategyId = 'prison';
    else if (s.includes('voltron') || s.includes('equipos') || s.includes('auras')) cleanStrategyId = 'voltron';
    else if (s.includes('vehicle') || s.includes('vehículo') || s.includes('tripulación')) cleanStrategyId = 'vehicles';
    else if (s.includes('cascade') || s.includes('cascada')) cleanStrategyId = 'cascade';
    else if (s.includes('storm') || s.includes('tormenta')) cleanStrategyId = 'storm';
    else if (s.includes('affinity') || s.includes('metálica')) cleanStrategyId = 'affinity';
    else if (s.includes('sea monsters') || s.includes('sea_monsters') || s.includes('terrores marinos') || s.includes('krakens')) cleanStrategyId = 'sea_monsters';
    else if (s.includes('tokens') || s.includes('fichas') || s.includes('enjambre')) cleanStrategyId = 'tokens';
    else if (s.includes('toolbox') || s.includes('tutores')) cleanStrategyId = 'toolbox';
    
    const knownIds = ['aristocrats', 'reanimator', 'tokens', 'spellslinger', 'blink', 'enchantress', 'landfall', 'ramp', 'graveyard', 'lifegain', 'prison', 'voltron', 'tron', 'vehicles', 'cascade', 'storm', 'toolbox', 'affinity', 'sea_monsters'];
    
    if (knownIds.includes(cleanStrategyId)) {
      return cleanStrategyId;
    }
  }

  const stringToAnalyze = `${currentStrategyId || ''} ${archetypeId || ''} ${promptText || ''}`.toLowerCase().trim();
  if (!stringToAnalyze) return '';

  if (stringToAnalyze.includes('storm') || stringToAnalyze.includes('grapeshot') || stringToAnalyze.includes('past in flames') || stringToAnalyze.includes('ruby storm')) return 'storm';
  if (stringToAnalyze.includes('prowess') || stringToAnalyze.includes('spellslinger') || stringToAnalyze.includes('phoenix') || stringToAnalyze.includes('murktide') || stringToAnalyze.includes('delver') || stringToAnalyze.includes('lesson')) return 'spellslinger';
  if (stringToAnalyze.includes('reanimator') || stringToAnalyze.includes('reanim') || stringToAnalyze.includes('superior reanimator')) return 'reanimator';
  if (stringToAnalyze.includes('aristocrats') || stringToAnalyze.includes('sacrifice') || stringToAnalyze.includes('sacrificio') || stringToAnalyze.includes('yawgmoth') || stringToAnalyze.includes('broodscale') || stringToAnalyze.includes('bloodchief')) return 'aristocrats';
  if (stringToAnalyze.includes('blink') || stringToAnalyze.includes('flicker') || stringToAnalyze.includes('ephemerate')) return 'blink';
  if (stringToAnalyze.includes('hammer') || stringToAnalyze.includes('voltron') || stringToAnalyze.includes('sigarda') || stringToAnalyze.includes('momo') || stringToAnalyze.includes('flier') || stringToAnalyze.includes('equipos') || stringToAnalyze.includes('auras')) return 'voltron';
  if (stringToAnalyze.includes('tron') || stringToAnalyze.includes('urza')) return 'tron';
  if (stringToAnalyze.includes('landfall') || stringToAnalyze.includes('tierras') || stringToAnalyze.includes('rhythm') || stringToAnalyze.includes('harmonizer') || stringToAnalyze.includes('nature') || stringToAnalyze.includes('domain') || stringToAnalyze.includes('amulet') || stringToAnalyze.includes('titan') || stringToAnalyze.includes('valakut')) return 'landfall';
  if (stringToAnalyze.includes('ramp') || stringToAnalyze.includes('rampa')) return 'ramp';
  if (stringToAnalyze.includes('cascade') || stringToAnalyze.includes('living end') || stringToAnalyze.includes('footfalls') || stringToAnalyze.includes('rhinos')) return 'cascade';
  if (stringToAnalyze.includes('dredge') || stringToAnalyze.includes('delirium') || stringToAnalyze.includes('graveyard') || stringToAnalyze.includes('underworld') || stringToAnalyze.includes('scam') || stringToAnalyze.includes('cementerio')) return 'graveyard';
  if (stringToAnalyze.includes('lifegain') || stringToAnalyze.includes('sisters') || stringToAnalyze.includes('soul sisters') || stringToAnalyze.includes('vidas')) return 'lifegain';
  if (stringToAnalyze.includes('prison') || stringToAnalyze.includes('taxes') || stringToAnalyze.includes('stax') || stringToAnalyze.includes('death and taxes') || stringToAnalyze.includes('impuestos') || stringToAnalyze.includes('fiscal')) return 'prison';
  if (stringToAnalyze.includes('enchantress') || stringToAnalyze.includes('bogles') || stringToAnalyze.includes('auras')) return 'enchantress';
  if (stringToAnalyze.includes('affinity') || stringToAnalyze.includes('ciampolini') || stringToAnalyze.includes('pinnacle') || stringToAnalyze.includes('artefactos') || stringToAnalyze.includes('metálica')) return 'affinity';
  if (stringToAnalyze.includes('vehicles') || stringToAnalyze.includes('vehículos') || stringToAnalyze.includes('vehiculo') || stringToAnalyze.includes('crew') || stringToAnalyze.includes('copter') || stringToAnalyze.includes('tripulación')) return 'vehicles';
  if (stringToAnalyze.includes('sea monsters') || stringToAnalyze.includes('sea_monsters') || stringToAnalyze.includes('krakens') || stringToAnalyze.includes('leviatanes') || stringToAnalyze.includes('terrores marinos')) return 'sea_monsters';
  if (stringToAnalyze.includes('tokens') || stringToAnalyze.includes('token') || stringToAnalyze.includes('fichas') || stringToAnalyze.includes('enjambre') || stringToAnalyze.includes('convoke')) return 'tokens';
  if (stringToAnalyze.includes('allosaurus') || stringToAnalyze.includes('neoform') || stringToAnalyze.includes('evolution') || stringToAnalyze.includes('toolbox') || stringToAnalyze.includes('pod') || stringToAnalyze.includes('chord') || stringToAnalyze.includes('creativity') || stringToAnalyze.includes('polymorph') || stringToAnalyze.includes('combo') || stringToAnalyze.includes('tutores')) return 'toolbox';
  if (stringToAnalyze.includes('superior') || stringToAnalyze.includes('doomsday')) return 'prison';
  
  return currentStrategyId || '';
}

export const HISTORICAL_DECKS_CATALOG = {
  combo: [
    { id: 'cascade_rhinos', title: '🦏 Cascade Rhinos', description: 'Ensambla piezas de coste 3 para lanzar gratis manadas de rinocerontes arrolladores.', colors: ['U', 'R', 'G'], difficulty: 'Fácil', formats: ['MODERN'] },
    { id: 'living_end', title: '💀 Living End', description: 'Cicla enormes bestias al cementerio y resucítalas todas a la vez barriendo la mesa.', colors: ['U', 'B', 'G'], difficulty: 'Media', formats: ['MODERN'] },
    { id: 'storm', title: '⚡ Storm (Tormenta)', description: 'Encadena múltiples rituales y cantrips para finalizar con metralla letal.', colors: ['U', 'R'], difficulty: 'Difícil', formats: ['MODERN'] },
    { id: 'hammer_time', title: '🔨 Hammer Time', description: 'Usa pura magia blanca para equipar un martillo gigante gratis y matar en turno 2.', colors: ['W'], difficulty: 'Media', formats: ['MODERN'] },
    { id: 'creativity', title: '🎨 Indomitable Creativity', description: 'Destruye tus propias fichas para invocar Arcontes de la Crueldad directamente del mazo.', colors: ['U', 'R', 'B', 'G'], difficulty: 'Media', formats: ['MODERN'] },
    { id: 'standard_atraxa', title: '🔮 Reanimator Atraxa', description: 'Descarta a Atraxa y revívela en los primeros turnos para tomar el control absoluto.', colors: ['W', 'U', 'B', 'G'], difficulty: 'Media', formats: ['STANDARD'] },
    { id: 'pioneer_lotus', title: '🪷 Lotus Field Combo', description: 'Desgira Lotus Field repetidamente para generar maná infinito y lanzar Ultimatum.', colors: ['U', 'G'], difficulty: 'Difícil', formats: ['PIONEER'] },
    { id: 'pioneer_amalia', title: '🩸 Amalia Combo', description: 'Gana vida sin parar para que Amalia explore, destruya la mesa y ataque con poder letal.', colors: ['W', 'B', 'G'], difficulty: 'Difícil', formats: ['PIONEER'] },
    { id: 'pioneer_greasefang', title: '🐀 Greasefang Vehicles', description: 'Descarta Parhelion II y devuélvelo al campo con Greasefang en turno 3 para atacar de inmediato.', colors: ['W', 'B', 'Esper'], difficulty: 'Media', formats: ['PIONEER'] }
  ],
  ramp: [
    { id: 'tron', title: '⚙️ Urzatron', description: 'Reúne las 3 tierras de Urza para lanzar gigantescos Eldrazis y Titanes.', colors: ['G', 'C'], difficulty: 'Fácil', formats: ['MODERN'] },
    { id: 'titan_shift', title: '🌋 Titan Shift', description: 'Rampa agresivamente y lanza a Primeval Titan o Scapeshift para daño letal con Valakut.', colors: ['R', 'G'], difficulty: 'Media', formats: ['MODERN'] },
    { id: 'amulet_titan', title: '🧭 Amulet Titan', description: 'Usa Amulet of Vigor y tierras rebotadoras para generar maná infinito y lanzar Titanes.', colors: ['G'], difficulty: 'Difícil', formats: ['MODERN'] },
    { id: 'standard_domain', title: '🌈 Domain Ramp', description: 'Acelera todas las tierras básicas para dominar con Leyline Binding y Atraxa.', colors: ['W', 'U', 'B', 'R', 'G'], difficulty: 'Media', formats: ['STANDARD'] },
    { id: 'pioneer_devotion', title: '🌳 Mono-Green Devotion', description: 'Genera maná masivo con Nykthos para jugar Karn o Storm the Festival.', colors: ['G'], difficulty: 'Media', formats: ['PIONEER'] },
    { id: 'pioneer_enigmatic', title: '🔥 Enigmatic Fires', description: 'Sacrifica encantamientos con Enigmatic Incarnation para buscar respuestas plateadas del mazo.', colors: ['W', 'U', 'B', 'R', 'G'], difficulty: 'Difícil', formats: ['PIONEER'] }
  ],
  aggro: [
    { id: 'burn', title: '🔥 Burn', description: 'Usa hechizos de daño directo a la cara del rival para ganar rápidamente.', colors: ['R', 'W'], difficulty: 'Fácil', formats: ['MODERN', 'STANDARD'] },
    { id: 'affinity', title: '🤖 Affinity', description: 'Despliega rápidamente un enjambre de criaturas artefacto sinérgicas.', colors: ['U', 'R', 'W'], difficulty: 'Media', formats: ['MODERN'] },
    { id: 'merfolk', title: '🐟 Merfolk', description: 'Inunda la mesa con tritones imbloqueables que se potencian unos a otros.', colors: ['U'], difficulty: 'Media', formats: ['MODERN'] },
    { id: 'prowess', title: '🥋 Izzet Prowess', description: 'Lanza cantrips veloces para hinchar a tus criaturas y atacar con fuerza masiva.', colors: ['U', 'R'], difficulty: 'Media', formats: ['MODERN'] },
    { id: 'standard_mono_red', title: '👺 Mono-Red Aggro', description: 'Criaturas rápidas con prisa y chispas letales para finalizar el combate.', colors: ['R'], difficulty: 'Fácil', formats: ['STANDARD'] },
    { id: 'standard_convoke', title: '⚔️ Boros Convoke', description: 'Crea fichas en los primeros turnos para invocar criaturas gigantes gratuitamente.', colors: ['W', 'R'], difficulty: 'Media', formats: ['STANDARD', 'PIONEER'] },
    { id: 'pioneer_heroic', title: '🛡️ Boros Heroic', description: 'Apunta hechizos a tus propias criaturas para hacerlas inmensas e imbloqueables.', colors: ['W', 'R'], difficulty: 'Fácil', formats: ['PIONEER'] },
    { id: 'pioneer_humans', title: '🧑‍🤝‍🧑 Mono-White Humans', description: 'Curva agresiva de humanos respaldada por Thalia y Adeline.', colors: ['W'], difficulty: 'Fácil', formats: ['PIONEER'] }
  ],
  control: [
    { id: 'uw_control', title: '⚖️ Azorius Control', description: 'Respuestas puras. Contrarresta, limpia la mesa y gana con Planeswalkers.', colors: ['W', 'U'], difficulty: 'Difícil', formats: ['MODERN', 'STANDARD', 'PIONEER'] },
    { id: 'tron_blue', title: '❄️ Mono-Blue Tron', description: 'Versión controlera de Tron que usa Mindslaver y contrahechizos para dominar el lategame.', colors: ['U', 'C'], difficulty: 'Difícil', formats: ['MODERN'] },
    { id: 'standard_dimir', title: '🦇 Dimir Control', description: 'Remoción barata, descarte selectivo y contrahechizos para ahogar al rival.', colors: ['U', 'B'], difficulty: 'Difícil', formats: ['STANDARD'] },
    { id: 'pioneer_ub_control', title: '🧠 Dimir Control', description: 'Interacción pura en Pioneer, controlando la mano y la mesa hasta ganar con Gearhulk.', colors: ['U', 'B'], difficulty: 'Difícil', formats: ['PIONEER'] }
  ],
  midrange: [
    { id: 'jund', title: '🦖 Jund', description: 'El mazo más eficiente carta por carta. Descarta, destruye y domina con Tarmogoyf.', colors: ['B', 'R', 'G'], difficulty: 'Difícil', formats: ['MODERN'] },
    { id: 'rakdos_scam', title: '👺 Rakdos Scam', description: 'Obliga a descartar en turno 1 con Grief y revívelo inmediatamente.', colors: ['B', 'R'], difficulty: 'Fácil', formats: ['MODERN'] },
    { id: 'yawgmoth', title: '🩺 Yawgmoth Combo', description: 'Sinergia de criaturas con Persist y Undying para que Yawgmoth drene la vida del rival.', colors: ['B', 'G'], difficulty: 'Difícil', formats: ['MODERN'] },
    { id: 'death_and_taxes', title: '⚖️ Death & Taxes', description: 'Entorpece la curva de maná del rival con Thalia y Leonin Arbiter mientras atacas por el aire.', colors: ['W'], difficulty: 'Difícil', formats: ['MODERN'] },
    { id: 'standard_golgari', title: '🍄 Golgari Midrange', description: 'Valor puro con criaturas resilientes y la mejor remoción del formato.', colors: ['B', 'G'], difficulty: 'Media', formats: ['STANDARD'] },
    { id: 'pioneer_vampires', title: '🧛 Rakdos Vampires', description: 'Sorin Imperious Bloodlord invoca gratis a Vein Ripper en turno 3 para drenar sin piedad.', colors: ['B', 'R'], difficulty: 'Media', formats: ['PIONEER'] },
    { id: 'pioneer_rakdos_mid', title: '👺 Rakdos Midrange', description: 'Atracción fatal, Fable of the Mirror-Breaker y Sheoldred para ganar por puro desgaste.', colors: ['B', 'R'], difficulty: 'Media', formats: ['PIONEER'] },
    { id: 'pioneer_waste_not', title: '💀 Mono-Black Waste Not', description: 'Ataque frontal a la mano con descarte para aprovechar los beneficios constantes de Waste Not.', colors: ['B'], difficulty: 'Media', formats: ['PIONEER'] }
  ],
  tribal: [
    { id: 'elves', title: '🧝 Elves', description: 'Genera cantidades absurdas de maná y criaturas para ganar con Ezuri o Craterhoof.', colors: ['G'], difficulty: 'Media', formats: ['MODERN'] },
    { id: 'goblins', title: '👺 Goblins', description: 'Invoca hordas de trasgos veloces o busca combos infinitos con Conspicuous Snoop.', colors: ['R', 'B'], difficulty: 'Media', formats: ['MODERN'] },
    { id: 'spirits', title: '👻 Bant Spirits', description: 'Criaturas voladoras flash que protegen la mesa con Queller y Rattlechains.', colors: ['W', 'U', 'G'], difficulty: 'Media', formats: ['MODERN'] },
    { id: 'humans', title: '🛡️ 5-Color Humans', description: 'Perturba al rival con criaturas humanas agresivas (Meddling Mage, Thalia) usando Cavern of Souls.', colors: ['W', 'U', 'B', 'R', 'G'], difficulty: 'Difícil', formats: ['MODERN'] },
    { id: 'standard_soldiers', title: '⚔️ Azorius Soldiers', description: 'Un ejército de soldados sinérgicos que atacan juntos y protegen a sus comandantes.', colors: ['W', 'U'], difficulty: 'Fácil', formats: ['STANDARD'] }
  ],
  tempo: [
    { id: 'murktide', title: '🐉 Izzet Murktide', description: 'Pocas criaturas súper eficientes, muchos cantrips y protección barata.', colors: ['U', 'R'], difficulty: 'Difícil', formats: ['MODERN'] },
    { id: 'shadow', title: '💀 Death\'s Shadow', description: 'Baja tu propia vida rápidamente con Shocklands para invocar un Avatar letal por 1 maná.', colors: ['U', 'B', 'R'], difficulty: 'Difícil', formats: ['MODERN'] },
    { id: 'standard_faeries', title: '🧚 Dimir Faeries', description: 'Criaturas con flash y contrahechizos para jugar siempre en el turno del rival.', colors: ['U', 'B'], difficulty: 'Difícil', formats: ['STANDARD'] },
    { id: 'pioneer_phoenix', title: '🔥 Izzet Phoenix', description: 'Lanza tres cantrips o hechizos de descarte baratos para resucitar Fénix desde el cementerio.', colors: ['U', 'R'], difficulty: 'Media', formats: ['PIONEER'] }
  ],
  prison: [
    { id: 'mono_red_prison', title: '⛓️ Mono-Red Prison', description: 'Bloquea el juego con Blood Moon y Chalice of the Void en turno 1.', colors: ['R'], difficulty: 'Media', formats: ['MODERN'] },
    { id: 'eldrazi_tron', title: '🐙 Eldrazi Tron', description: 'Chalice of the Void y tierras de dolor para bajar Eldrazis destructivos.', colors: ['C'], difficulty: 'Media', formats: ['MODERN'] },
    { id: 'enchantress', title: '🌿 Enchantress Lock', description: 'Prisión de encantamientos (Ghostly Prison, Blood Moon) hasta ahogar al oponente.', colors: ['W', 'G'], difficulty: 'Difícil', formats: ['MODERN'] }
  ]
};

// --- EL IMÁN: GRAFO ESTRICTO DE MICRO-SINERGIAS ---
// Mapea una "Carta Ancla" con sus "Piezas Combo" y un multiplicador de prioridad.
// Si la Carta Ancla está en el mazo, la Pieza Combo verá su prioridad mejorada exponencialmente.
export const MICRO_SYNERGIES_GRAPH = {
  "yawgmoth, thran physician": [
    { target: "young wolf", multiplier: 10.0 },
    { target: "strangleroot geist", multiplier: 8.0 },
    { target: "blood artist", multiplier: 5.0 },
    { target: "chord of calling", multiplier: 5.0 }
  ],
  "thassa's oracle": [
    { target: "demonic consultation", multiplier: 15.0 },
    { target: "tainted pact", multiplier: 15.0 }
  ],
  "karn, the great creator": [
    { target: "mycosynth lattice", multiplier: 10.0 },
    { target: "liquimetal coating", multiplier: 8.0 },
    { target: "ensnaring bridge", multiplier: 5.0 }
  ],
  "kiki-jiki, mirror breaker": [
    { target: "restoration angel", multiplier: 10.0 },
    { target: "deceiver exarch", multiplier: 10.0 },
    { target: "pestermite", multiplier: 10.0 },
    { target: "zealous conscripts", multiplier: 10.0 }
  ],
  "devoted druid": [
    { target: "vizier of remedies", multiplier: 15.0 },
    { target: "duskwatch recruiter", multiplier: 5.0 }
  ],
  "urza's tower": [
    { target: "urza's mine", multiplier: 20.0 },
    { target: "urza's power plant", multiplier: 20.0 },
    { target: "expedition map", multiplier: 10.0 },
    { target: "sylvan scrying", multiplier: 10.0 },
    { target: "karn liberated", multiplier: 5.0 }
  ],
  "urza's mine": [
    { target: "urza's tower", multiplier: 20.0 },
    { target: "urza's power plant", multiplier: 20.0 }
  ],
  "urza's power plant": [
    { target: "urza's tower", multiplier: 20.0 },
    { target: "urza's mine", multiplier: 20.0 }
  ],
  "helkite tyrant": [
    { target: "mycosynth lattice", multiplier: 10.0 }
  ],
  "cauldron familiar": [
    { target: "witch's oven", multiplier: 15.0 },
    { target: "trail of crumbs", multiplier: 8.0 }
  ],
  "witch's oven": [
    { target: "cauldron familiar", multiplier: 15.0 }
  ]
};

// --- DICCIONARIO OMNIPRESENTE DE DEPENDENCIAS (VETO CONTEXTUAL) ---
// Define requisitos estrictos que una carta necesita en el ecosistema actual del mazo.
// Si el mazo no cumple el requisito, la carta será vetada.
export const CONTEXTUAL_DEPENDENCIES = [
  // Encantamientos y Auras
  { keywords: ['search your library for an enchantment', 'search your library for an aura', 'constellation', 'enchant target', 'enchanted creature'], requiresType: 'enchantment' },
  // Artefactos y Equipos
  { keywords: ['search your library for an artifact', 'sacrifice an artifact', 'affinity for artifacts', 'metalcraft'], requiresType: 'artifact' },
  { keywords: ['equipped creature', 'equip {', 'search your library for an equipment'], requiresType: 'equipment' },
  // Planeswalkers
  { keywords: ['planeswalker you control', 'remove a loyalty counter'], requiresType: 'planeswalker' },
  // Tribus o Subtipos muy específicos en hechizos de soporte
  { keywords: ['dragon you control', 'reveal a dragon'], requiresType: 'dragon' },
  { keywords: ['zombie you control'], requiresType: 'zombie' },
  // Mecánicas que requieren enablers específicos
  { keywords: ['madness'], requiresText: 'discard' }
];

// --- REGLAS DE COOCURRENCIA (SINERGIAS CRUZADAS DE BATTLE BOX) ---
export const CO_OCCURRENCE_RULES = [
  {
    triggerCard: "amulet of vigor",
    boostKeywords: ["karoo", "bounce land", "growth chamber", "rot farm", "garrison", "chancery", "turf", "carnarium", "sanctuary", "basilica", "boilerworks", "aqueduct"],
    boostScore: 350,
    description: "Amulet of Vigor requiere tierras de rebote (bounce lands) en el pool."
  },
  {
    triggerCard: "hardened scales",
    boostKeywords: ["+1/+1 counter", "modular", "proliferate", "walking ballista", "arcbound ravager", "hangarback walker"],
    boostScore: 300,
    description: "Hardened Scales exige cartas de contadores +1/+1 o modular."
  },
  {
    triggerCard: "yawgmoth, thran physician",
    boostKeywords: ["undying", "persist", "blood artist", "zulaport", "young wolf", "strangleroot geist"],
    boostScore: 300,
    description: "Yawgmoth requiere criaturas con resurgir (Undying) y drenadores."
  },
  {
    triggerCard: "stoneforge mystic",
    boostKeywords: ["equipment", "colossus hammer", "shadowspear", "batterskull", "kaldra compleat", "sword of"],
    boostScore: 300,
    description: "Stoneforge Mystic requiere objetivos de equipo de alto impacto."
  }
];
