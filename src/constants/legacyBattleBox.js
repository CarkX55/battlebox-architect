export const BATTLEBOX_FORMAT_NAME = "Legacy Battle Box (Casual)";

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
  // Aceleración de maná gratuita o demasiado eficiente (Rompe el ritmo del juego)
  "Sol Ring", "Mana Crypt", "Mox Diamond", "Chrome Mox", "Mox Opal",
  "Ancient Tomb", "City of Traitors", "Dark Ritual", "Rite of Flame",
  "Urza's Saga", "Tolarian Academy", "Cabal Coffers", "Basalt Monolith",
  "Mana Vault", "Grim Monolith", "Lotus Petal", "Lion's Eye Diamond", "Channel", "Mishra's Workshop",
  
  // Contrahechizos y remociones gratuitos (Pitch spells - Castigan el juego interactivo)
  "Force of Will", "Pact of Negation", "Force of Negation", "Mental Misstep",
  "Solitude", "Fury", "Endurance", "Grief", "Subtlety", "Daze", "Invigorate",
  
  // Lock pieces tempranos (Previenen que el oponente juegue)
  "Chalice of the Void", "Trinisphere", "Blood Moon", "Magus of the Moon", "Back to Basics",
  "Winter Orb", "Stasis", "Static Orb", "Ensnaring Bridge", "Strip Mine",

  // OPRESORES DE FORMATO Y VENTAJA DESPROPORCIONADA (Demasiado valor para Casual)
  "Griselbrand", "Oko, Thief of Crowns", "Uro, Titan of Nature's Wrath", "Ragavan, Nimble Pilferer", 
  "Wrenn and Six", "Necropotence", "Skullclamp", "Treasure Cruise", "Dig Through Time", "Sensei's Divining Top",

  // MECÁNICAS ANTIDEPORTIVAS (Victorias baratas, falta de interacción)
  // 1. Efectos de "Vida a X"
  "Master of Cruelties", "Sorin Markov", "Magister Sphinx", "Tree of Perdition",
  
  // 2. Infect (Gana con 10 contadores, ignora la vida total)
  "Blightsteel Colossus", "Skithiryx, the Blight Dragon", "Glistener Elf", "Inkmoth Nexus", 
  "Triumph of the Orbs", "Tainted Strike", "Phyresis", "Hand of the Praetors",
  
  // 3. Annihilator (Destruye la base de maná al atacar)
  "Emrakul, the Aeons Torn", "Ulamog, the Infinite Gyre", "Kozilek, Butcher of Truth",
  
  // 4. Roba-Turnos / Control Mental (Arruina la experiencia del rival)
  "Emrakul, the Promised End", "Mindslaver", "Worst Fears", "Karn Liberated",
  
  // 5. Victorias Instantáneas (Win the game)
  "Thassa's Oracle", "Approach of the Second Sun", "Felidar Sovereign", "Laboratory Maniac",
  "Jace, Wielder of Mysteries", "Test of Endurance", "Mayael's Aria",

  // 6. Trampas de Maná (Poner monstruos gratis muy pronto)
  "Show and Tell", "Sneak Attack", "Tinker", "Natural Order", "Entomb"
];

export const BATTLEBOX_ARCHETYPES = [
  {
    id: 'aggro-puro',
    label: 'Aggro Puro (Burn, Zoo)',
    speed: 'Muy rápida',
    winTurn: '4–5',
    description: 'Criaturas baratas y daño directo, máxima eficiencia de maná desde el turno 1.',
    recommendedColors: ['R', 'W', 'G'],
    landCount: 21,
    spellCount: 39
  },
  {
    id: 'aggro-sinergico',
    label: 'Aggro Sinérgico (Tribal)',
    speed: 'Rápida',
    winTurn: '5–6',
    description: 'Aceleración basada en criaturas, acumulación de ventaja tribal, overrun.',
    recommendedColors: ['G', 'U', 'W'],
    landCount: 22,
    spellCount: 38
  },
  {
    id: 'tempo',
    label: 'Tempo',
    speed: 'Media‑rápida',
    winTurn: '6–8',
    description: 'Amenaza temprana (1–2 manás) protegida con interrupción barata (contrahechizos de pago).',
    recommendedColors: ['U', 'R', 'B'],
    landCount: 19,
    spellCount: 41
  },
  {
    id: 'midrange',
    label: 'Midrange',
    speed: 'Media',
    winTurn: '8–10',
    description: 'Criaturas eficientes de coste 2–4, ventaja de cartas, disrupción de mano y removal de calidad.',
    recommendedColors: ['B', 'G', 'W', 'R'],
    landCount: 24,
    spellCount: 36
  },
  {
    id: 'ramp-tron',
    label: 'Ramp / Tron',
    speed: 'Media‑lenta',
    winTurn: '8–12',
    description: 'Aceleración con tierras o hechizos para lanzar amenazas de 7+ manás.',
    recommendedColors: ['G', 'U', 'C'],
    landCount: 26,
    spellCount: 34
  },
  {
    id: 'combo',
    label: 'Combo (Interactivo)',
    speed: 'Media (con pico)',
    winTurn: '6–8',
    description: 'Combinación de 3+ cartas, frágil a removal/counters. No gana antes del turno 4.',
    recommendedColors: ['U', 'B', 'R', 'G'],
    landCount: 22,
    spellCount: 38
  },
  {
    id: 'control',
    label: 'Control',
    speed: 'Lenta',
    winTurn: '12–20',
    description: 'Contrahechizos pagables, limpiamesas, ventaja de cartas y una amenaza imparable al final.',
    recommendedColors: ['U', 'W', 'B'],
    landCount: 26,
    spellCount: 34
  },
  {
    id: 'prision',
    label: 'Prisión / Encantamientos',
    speed: 'Muy lenta',
    winTurn: '15+',
    description: 'Bloqueo progresivo con encantamientos o artefactos, gana por desgaste.',
    recommendedColors: ['W', 'G', 'U', 'C'],
    landCount: 25,
    spellCount: 35
  },
  {
    id: 'legacy-eldrazi',
    label: 'Legacy Eldrazi (Incoloro)',
    speed: 'Rápida-Media',
    winTurn: '5–8',
    description: 'Amenazas masivas e incoloras que utilizan tierras de utilidad y aceleración incolora.',
    recommendedColors: ['C'],
    landCount: 24,
    spellCount: 36
  },
  {
    id: 'mud-artifacts',
    label: 'MUD / Mono-Brown (Artefactos)',
    speed: 'Media',
    winTurn: '6–9',
    description: 'Gran mazo de artefactos, robots masivos y aceleración incolora basada en estructuras mecánicas.',
    recommendedColors: ['C'],
    landCount: 25,
    spellCount: 35
  },
  {
    id: 'colorless-stax',
    label: 'Stax Incoloro (Cárcel)',
    speed: 'Muy lenta',
    winTurn: '12+',
    description: 'Control absoluto mediante impuestos, artefactos de bloqueo (Chalice, Lodestone) y agotamiento del rival.',
    recommendedColors: ['C'],
    landCount: 26,
    spellCount: 34
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
  { id: 'human', label: 'Humanos', colors: ['W', 'U', 'B', 'R', 'G'], strategies: ['tokens', 'aristocrats', 'prision', 'voltron', 'lifegain'], archetypes: ['aggro-sinergico', 'midrange'] },
  { id: 'elf', label: 'Elfos', colors: ['G', 'B', 'W'], strategies: ['tokens', 'lifegain', 'aristocrats'], archetypes: ['aggro-sinergico', 'combo', 'ramp-tron'] },
  { id: 'goblin', label: 'Goblins', colors: ['R', 'B', 'G'], strategies: ['tokens', 'aristocrats'], archetypes: ['aggro-puro', 'aggro-sinergico', 'combo'] },
  { id: 'merfolk', label: 'Tritones (Merfolk)', colors: ['U', 'G'], strategies: ['blink', 'tokens'], archetypes: ['aggro-sinergico', 'tempo'] },
  { id: 'zombie', label: 'Zombies', colors: ['B', 'U'], strategies: ['aristocrats', 'reanimator', 'madness', 'mill', 'tokens'], archetypes: ['aggro-sinergico', 'midrange', 'combo'] },
  { id: 'vampire', label: 'Vampiros', colors: ['B', 'R', 'W'], strategies: ['aristocrats', 'lifegain', 'madness'], archetypes: ['aggro-sinergico', 'midrange'] },
  { id: 'spirit', label: 'Espíritus', colors: ['W', 'U'], strategies: ['blink', 'prision', 'tokens'], archetypes: ['tempo', 'control'] },
  { id: 'angel', label: 'Ángeles', colors: ['W', 'R', 'B'], strategies: ['lifegain', 'blink', 'prision', 'reanimator'], archetypes: ['midrange', 'control'] },
  { id: 'demon', label: 'Demonios', colors: ['B'], strategies: ['aristocrats', 'reanimator'], archetypes: ['midrange', 'control'] },
  { id: 'dragon', label: 'Dragones', colors: ['R', 'B', 'G'], strategies: ['reanimator', 'tokens', 'blink'], archetypes: ['midrange', 'ramp-tron'] },
  { id: 'eldrazi', label: 'Eldrazi', colors: ['W', 'U', 'B', 'R', 'G', 'C'], strategies: ['tokens', 'blink'], archetypes: ['ramp-tron', 'midrange', 'legacy-eldrazi'] },
  { id: 'faerie', label: 'Hadas', colors: ['U', 'B'], strategies: ['blink', 'mill', 'prision'], archetypes: ['tempo', 'control'] },
  { id: 'rogue', label: 'Pícaros (Rogues)', colors: ['U', 'B'], strategies: ['mill', 'aristocrats'], archetypes: ['tempo', 'aggro-sinergico'] },
  { id: 'pirate', label: 'Piratas', colors: ['U', 'B', 'R'], strategies: ['aristocrats', 'tokens'], archetypes: ['aggro-sinergico', 'tempo'] },
  { id: 'dinosaur', label: 'Dinosaurios', colors: ['R', 'G', 'W'], strategies: ['landfall', 'tokens'], archetypes: ['midrange', 'ramp-tron'] },
  { id: 'cat', label: 'Gatos', colors: ['W', 'G'], strategies: ['lifegain', 'voltron', 'tokens'], archetypes: ['aggro-sinergico', 'midrange'] },
  { id: 'knight', label: 'Caballeros', colors: ['W', 'B', 'R'], strategies: ['voltron', 'tokens', 'aristocrats'], archetypes: ['aggro-sinergico', 'midrange'] },
  { id: 'wizard', label: 'Magos (Wizards)', colors: ['U', 'R', 'B'], strategies: ['spellslinger', 'blink', 'mill'], archetypes: ['tempo', 'control', 'combo'] },
  { id: 'soldier', label: 'Soldados', colors: ['W', 'U'], strategies: ['tokens', 'prision', 'voltron'], archetypes: ['aggro-puro', 'aggro-sinergico'] },
  { id: 'sliver', label: 'Slivers', colors: ['W', 'U', 'B', 'R', 'G'], strategies: ['tokens', 'voltron'], archetypes: ['aggro-sinergico', 'combo'] }
];

export const MTG_STRATEGIES = [
  { id: 'aristocrats', label: 'Aristocrats (Sacrificio por valor)', colors: ['B', 'R', 'W'], archetypes: ['aggro-sinergico', 'midrange', 'combo'] },
  { id: 'reanimator', label: 'Reanimator (Revivir criaturas)', colors: ['B', 'U', 'R', 'W'], archetypes: ['combo', 'midrange', 'ramp-tron'] },
  { id: 'tokens', label: 'Tokens (Fichas y Enjambre)', colors: ['W', 'G', 'R'], archetypes: ['aggro-puro', 'aggro-sinergico', 'midrange'] },
  { id: 'spellslinger', label: 'Spellslinger / Prowess (Conjuros e Instantáneos)', colors: ['U', 'R', 'W'], archetypes: ['tempo', 'combo', 'aggro-puro'] },
  { id: 'blink', label: 'Blink / Flicker (Exiliar y volver al campo)', colors: ['W', 'U'], archetypes: ['tempo', 'midrange', 'control'] },
  { id: 'mill', label: 'Mill (Deckeo)', colors: ['U', 'B'], archetypes: ['combo', 'control'] },
  { id: 'enchantress', label: 'Enchantress / Auras (Sinergia de Encantamientos)', colors: ['W', 'G'], archetypes: ['midrange', 'combo', 'prision'] },
  { id: 'landfall', label: 'Landfall (Sinergia de Tierras)', colors: ['G', 'R', 'U'], archetypes: ['midrange', 'ramp-tron'] },
  { id: 'madness', label: 'Madness / Descarte (Abusar del cementerio)', colors: ['B', 'R'], archetypes: ['aggro-puro', 'aggro-sinergico', 'midrange'] },
  { id: 'lifegain', label: 'Lifegain (Ganancia de vidas y contadores)', colors: ['W', 'B', 'G'], archetypes: ['aggro-sinergico', 'midrange'] },
  { id: 'prison', label: 'Soft Prison / Pillow Fort (Impuestos y ralentización)', colors: ['W', 'U'], archetypes: ['prision', 'control'] },
  { id: 'voltron', label: 'Voltron (Equipos y Auras sobre una criatura)', colors: ['W', 'R'], archetypes: ['aggro-puro', 'aggro-sinergico', 'midrange'] }
];
