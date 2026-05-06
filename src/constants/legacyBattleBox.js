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
  { id: 'W', name: 'Blanco', icon: '/ASSETS/manaBlanco.webp', color: MANA_COLORS.W, bg: 'bg-white', border: 'border-white', text: 'text-black' },
  { id: 'U', name: 'Azul', icon: '/ASSETS/manaAzul.webp', color: MANA_COLORS.U, bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-white' },
  { id: 'B', name: 'Negro', icon: '/ASSETS/manaNegro.webp', color: MANA_COLORS.B, bg: 'bg-gray-900', border: 'border-gray-700', text: 'text-white' },
  { id: 'R', name: 'Rojo', icon: '/ASSETS/manaRojo.webp', color: MANA_COLORS.R, bg: 'bg-red-500', border: 'border-red-500', text: 'text-white' },
  { id: 'G', name: 'Verde', icon: '/ASSETS/manaVerde.webp', color: MANA_COLORS.G, bg: 'bg-green-600', border: 'border-green-600', text: 'text-white' },
  { id: 'C', name: 'Incoloro', icon: '/ASSETS/Manaincoloro.webp', color: MANA_COLORS.C, bg: 'bg-gray-400', border: 'border-gray-400', text: 'text-black' }
];



export const BATTLEBOX_BANLIST = [
  // Aceleración de maná gratuita o demasiado eficiente
  "Sol Ring", "Mana Crypt", "Mox Diamond", "Chrome Mox", "Mox Opal",
  "Ancient Tomb", "City of Traitors", "Dark Ritual", "Rite of Flame",
  "Urza's Saga", "Tolarian Academy", "Cabal Coffers", "Basalt Monolith",
  "Mana Vault", "Grim Monolith",
  
  // Contrahechizos y remociones gratuitos (pitch spells)
  "Force of Will", "Pact of Negation", "Force of Negation", "Mental Misstep",
  "Solitude", "Fury", "Endurance", "Grief", "Subtlety",
  
  // Lock pieces tempranos
  "Chalice of the Void", "Trinisphere"
];

export const BATTLEBOX_ARCHETYPES = [
  {
    id: 'aggro-puro',
    label: 'Aggro Puro (Burn, Zoo)',
    speed: 'Muy rápida',
    winTurn: '4–5',
    description: 'Criaturas baratas y daño directo, máxima eficiencia de maná desde el turno 1.',
    recommendedColors: ['R', 'W', 'G']
  },
  {
    id: 'aggro-sinergico',
    label: 'Aggro Sinérgico (Tribal)',
    speed: 'Rápida',
    winTurn: '5–6',
    description: 'Aceleración basada en criaturas, acumulación de ventaja tribal, overrun.',
    recommendedColors: ['G', 'U', 'W']
  },
  {
    id: 'tempo',
    label: 'Tempo',
    speed: 'Media‑rápida',
    winTurn: '6–8',
    description: 'Amenaza temprana (1–2 manás) protegida con interrupción barata (contrahechizos de pago).',
    recommendedColors: ['U', 'R', 'B']
  },
  {
    id: 'midrange',
    label: 'Midrange',
    speed: 'Media',
    winTurn: '8–10',
    description: 'Criaturas eficientes de coste 2–4, ventaja de cartas, disrupción de mano y removal de calidad.',
    recommendedColors: ['B', 'G', 'W', 'R']
  },
  {
    id: 'ramp-tron',
    label: 'Ramp / Tron',
    speed: 'Media‑lenta',
    winTurn: '8–12',
    description: 'Aceleración con tierras o hechizos para lanzar amenazas de 7+ manás.',
    recommendedColors: ['G', 'U', 'C']
  },
  {
    id: 'combo',
    label: 'Combo (Interactivo)',
    speed: 'Media (con pico)',
    winTurn: '6–8',
    description: 'Combinación de 3+ cartas, frágil a removal/counters. No gana antes del turno 4.',
    recommendedColors: ['U', 'B', 'R', 'G']
  },
  {
    id: 'control',
    label: 'Control',
    speed: 'Lenta',
    winTurn: '12–20',
    description: 'Contrahechizos pagables, limpiamesas, ventaja de cartas y una amenaza imparable al final.',
    recommendedColors: ['U', 'W', 'B']
  },
  {
    id: 'prision',
    label: 'Prisión / Encantamientos',
    speed: 'Muy lenta',
    winTurn: '15+',
    description: 'Bloqueo progresivo con encantamientos o artefactos, gana por desgaste.',
    recommendedColors: ['W', 'G', 'U', 'C']
  },
  {
    id: 'legacy-eldrazi',
    label: 'Legacy Eldrazi (Incoloro)',
    speed: 'Rápida-Media',
    winTurn: '5–8',
    description: 'Amenazas masivas e incoloras que utilizan tierras de utilidad y aceleración incolora.',
    recommendedColors: ['C']
  },
  {
    id: 'mud-artifacts',
    label: 'MUD / Mono-Brown (Artefactos)',
    speed: 'Media',
    winTurn: '6–9',
    description: 'Gran mazo de artefactos, robots masivos y aceleración incolora basada en estructuras mecánicas.',
    recommendedColors: ['C']
  },
  {
    id: 'colorless-stax',
    label: 'Stax Incoloro (Cárcel)',
    speed: 'Muy lenta',
    winTurn: '12+',
    description: 'Control absoluto mediante impuestos, artefactos de bloqueo (Chalice, Lodestone) y agotamiento del rival.',
    recommendedColors: ['C']
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
  { id: 'human', label: 'Humanos', colors: ['W', 'U', 'B', 'R', 'G'], strategies: ['tokens', 'aristocrats', 'prison', 'voltron', 'lifegain'], archetypes: ['aggro-sinergico', 'midrange'] },
  { id: 'elf', label: 'Elfos', colors: ['G', 'B', 'W'], strategies: ['tokens', 'lifegain', 'aristocrats'], archetypes: ['aggro-sinergico', 'combo', 'ramp-tron'] },
  { id: 'goblin', label: 'Goblins', colors: ['R', 'B', 'G'], strategies: ['tokens', 'aristocrats'], archetypes: ['aggro-puro', 'aggro-sinergico', 'combo'] },
  { id: 'merfolk', label: 'Tritones (Merfolk)', colors: ['U', 'G'], strategies: ['blink', 'tokens'], archetypes: ['aggro-sinergico', 'tempo'] },
  { id: 'zombie', label: 'Zombies', colors: ['B', 'U'], strategies: ['aristocrats', 'reanimator', 'madness', 'mill', 'tokens'], archetypes: ['aggro-sinergico', 'midrange', 'combo'] },
  { id: 'vampire', label: 'Vampiros', colors: ['B', 'R', 'W'], strategies: ['aristocrats', 'lifegain', 'madness'], archetypes: ['aggro-sinergico', 'midrange'] },
  { id: 'spirit', label: 'Espíritus', colors: ['W', 'U'], strategies: ['blink', 'prison', 'tokens'], archetypes: ['tempo', 'control-puro'] },
  { id: 'angel', label: 'Ángeles', colors: ['W', 'R', 'B'], strategies: ['lifegain', 'blink', 'prison', 'reanimator'], archetypes: ['midrange', 'control-puro'] },
  { id: 'demon', label: 'Demonios', colors: ['B'], strategies: ['aristocrats', 'reanimator'], archetypes: ['midrange', 'control-puro'] },
  { id: 'dragon', label: 'Dragones', colors: ['R', 'B', 'G'], strategies: ['reanimator', 'tokens', 'blink'], archetypes: ['midrange', 'ramp-tron'] },
  { id: 'eldrazi', label: 'Eldrazi', colors: ['W', 'U', 'B', 'R', 'G', 'C'], strategies: ['tokens', 'blink'], archetypes: ['ramp-tron', 'midrange', 'legacy-eldrazi'] },
  { id: 'faerie', label: 'Hadas', colors: ['U', 'B'], strategies: ['blink', 'mill', 'prison'], archetypes: ['tempo', 'control-puro'] },
  { id: 'rogue', label: 'Pícaros (Rogues)', colors: ['U', 'B'], strategies: ['mill', 'aristocrats'], archetypes: ['tempo', 'aggro-sinergico'] },
  { id: 'pirate', label: 'Piratas', colors: ['U', 'B', 'R'], strategies: ['aristocrats', 'tokens'], archetypes: ['aggro-sinergico', 'tempo'] },
  { id: 'dinosaur', label: 'Dinosaurios', colors: ['R', 'G', 'W'], strategies: ['landfall', 'tokens'], archetypes: ['midrange', 'ramp-tron'] },
  { id: 'cat', label: 'Gatos', colors: ['W', 'G'], strategies: ['lifegain', 'voltron', 'tokens'], archetypes: ['aggro-sinergico', 'midrange'] },
  { id: 'knight', label: 'Caballeros', colors: ['W', 'B', 'R'], strategies: ['voltron', 'tokens', 'aristocrats'], archetypes: ['aggro-sinergico', 'midrange'] },
  { id: 'wizard', label: 'Magos (Wizards)', colors: ['U', 'R', 'B'], strategies: ['spellslinger', 'blink', 'mill'], archetypes: ['tempo', 'control-puro', 'combo'] },
  { id: 'soldier', label: 'Soldados', colors: ['W', 'U'], strategies: ['tokens', 'prison', 'voltron'], archetypes: ['aggro-puro', 'aggro-sinergico'] },
  { id: 'sliver', label: 'Slivers', colors: ['W', 'U', 'B', 'R', 'G'], strategies: ['tokens', 'voltron'], archetypes: ['aggro-sinergico', 'combo'] }
];

export const MTG_STRATEGIES = [
  { id: 'aristocrats', label: 'Aristocrats (Sacrificio por valor)', colors: ['B', 'R', 'W'], archetypes: ['aggro-sinergico', 'midrange', 'combo'] },
  { id: 'reanimator', label: 'Reanimator (Revivir criaturas)', colors: ['B', 'U', 'R', 'W'], archetypes: ['combo', 'midrange', 'ramp-tron'] },
  { id: 'tokens', label: 'Tokens (Fichas y Enjambre)', colors: ['W', 'G', 'R'], archetypes: ['aggro-puro', 'aggro-sinergico', 'midrange'] },
  { id: 'spellslinger', label: 'Spellslinger / Prowess (Conjuros e Instantáneos)', colors: ['U', 'R', 'W'], archetypes: ['tempo', 'combo', 'aggro-puro'] },
  { id: 'blink', label: 'Blink / Flicker (Exiliar y volver al campo)', colors: ['W', 'U'], archetypes: ['tempo', 'midrange', 'control-puro'] },
  { id: 'mill', label: 'Mill (Deckeo)', colors: ['U', 'B'], archetypes: ['combo', 'control-puro'] },
  { id: 'enchantress', label: 'Enchantress / Auras (Sinergia de Encantamientos)', colors: ['W', 'G'], archetypes: ['midrange', 'combo', 'prision'] },
  { id: 'landfall', label: 'Landfall (Sinergia de Tierras)', colors: ['G', 'R', 'U'], archetypes: ['midrange', 'ramp-tron'] },
  { id: 'madness', label: 'Madness / Descarte (Abusar del cementerio)', colors: ['B', 'R'], archetypes: ['aggro-puro', 'aggro-sinergico', 'midrange'] },
  { id: 'infect', label: 'Infect / Toxic (Veneno)', colors: ['B', 'G', 'U'], archetypes: ['aggro-puro', 'tempo'] },
  { id: 'lifegain', label: 'Lifegain (Ganancia de vidas y contadores)', colors: ['W', 'B', 'G'], archetypes: ['aggro-sinergico', 'midrange'] },
  { id: 'prison', label: 'Soft Prison / Pillow Fort (Impuestos y ralentización)', colors: ['W', 'U'], archetypes: ['prision', 'control-puro'] },
  { id: 'voltron', label: 'Voltron (Equipos y Auras sobre una criatura)', colors: ['W', 'R'], archetypes: ['aggro-puro', 'aggro-sinergico', 'midrange'] }
];
