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

// Tabla de sustitución automática: si el Juez JS detecta una carta prohibida,
// la reemplaza por esta alternativa legal del mismo rol/color.
export const BANLIST_SUBSTITUTIONS = {
  // Maná rápido → rocks/ramp lentos
  "Sol Ring": "Mind Stone", "Mana Crypt": "Arcane Signet", "Mox Diamond": "Fellwar Stone",
  "Chrome Mox": "Coldsteel Heart", "Mox Opal": "Springleaf Drum",
  "Ancient Tomb": "Castle Locthwain", "City of Traitors": "Ghost Quarter",
  "Dark Ritual": "Cabal Ritual", "Rite of Flame": "Pyretic Ritual",
  "Urza's Saga": "Inventors' Fair", "Tolarian Academy": "Academy Ruins",
  "Cabal Coffers": "Cabal Stronghold", "Basalt Monolith": "Worn Powerstone",
  "Mana Vault": "Thran Dynamo", "Grim Monolith": "Hedron Archive",
  "Lotus Petal": "Chromatic Star", "Lion's Eye Diamond": "Chromatic Sphere",
  "Channel": "Cultivate", "Mishra's Workshop": "Darksteel Citadel",
  // Counters/remoción gratuita → versiones de pago
  "Force of Will": "Counterspell", "Pact of Negation": "Negate",
  "Force of Negation": "Dovin's Veto", "Mental Misstep": "Spell Snare",
  "Solitude": "Swords to Plowshares", "Fury": "Anger of the Gods",
  "Endurance": "Scavenging Ooze", "Grief": "Thoughtseize",
  "Subtlety": "Brainstorm", "Daze": "Mana Leak", "Invigorate": "Giant Growth",
  // Lock pieces → versiones justas
  "Chalice of the Void": "Pithing Needle", "Trinisphere": "Damping Sphere",
  "Blood Moon": "Alpine Moon", "Magus of the Moon": "Harsh Mentor",
  "Back to Basics": "Spreading Seas", "Winter Orb": "Aven Mindcensor",
  "Stasis": "Propaganda", "Static Orb": "Ghostly Prison",
  "Ensnaring Bridge": "Meekstone", "Strip Mine": "Ghost Quarter",
  // Opresores → alternativas potentes pero justas
  "Griselbrand": "Rune-Scarred Demon", "Oko, Thief of Crowns": "Teferi, Hero of Dominaria",
  "Uro, Titan of Nature's Wrath": "Coiling Oracle", "Ragavan, Nimble Pilferer": "Goblin Guide",
  "Wrenn and Six": "Sylvan Library", "Necropotence": "Phyrexian Arena",
  "Skullclamp": "Mask of Memory", "Treasure Cruise": "Deep Analysis",
  "Dig Through Time": "Fact or Fiction", "Sensei's Divining Top": "Scroll Rack",
  // Mecánicas antideportivas
  "Master of Cruelties": "Rakdos, Lord of Riots", "Sorin Markov": "Sorin, Solemn Visitor",
  "Magister Sphinx": "Sphinx of the Steel Wind", "Tree of Perdition": "Tree of Redemption",
  "Blightsteel Colossus": "Darksteel Colossus", "Skithiryx, the Blight Dragon": "Kokusho, the Evening Star",
  "Glistener Elf": "Llanowar Elves", "Inkmoth Nexus": "Mutavault",
  "Triumph of the Orbs": "Overrun", "Tainted Strike": "Supernatural Stamina",
  "Phyresis": "Unholy Strength", "Hand of the Praetors": "Lord of the Undead",
  "Emrakul, the Aeons Torn": "Ulamog, the Ceaseless Hunger",
  "Ulamog, the Infinite Gyre": "Artisan of Kozilek",
  "Kozilek, Butcher of Truth": "Kozilek, the Great Distortion",
  "Emrakul, the Promised End": "Void Winnower", "Mindslaver": "Gonti, Lord of Luxury",
  "Worst Fears": "Praetor's Grasp", "Karn Liberated": "Karn, Scion of Urza",
  "Thassa's Oracle": "Thassa, Deep-Dwelling", "Approach of the Second Sun": "Entreat the Angels",
  "Felidar Sovereign": "Archangel of Thune", "Laboratory Maniac": "Talrand, Sky Summoner",
  "Jace, Wielder of Mysteries": "Jace, Architect of Thought",
  "Test of Endurance": "Ajani's Pridemate", "Mayael's Aria": "Mayael the Anima",
  "Show and Tell": "Collected Company", "Sneak Attack": "Through the Breach",
  "Tinker": "Whir of Invention", "Natural Order": "Green Sun's Zenith", "Entomb": "Buried Alive"
};

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
  // --- TRIBUS CLÁSICAS ---
  { id: 'human', label: 'Humanos', colors: ['W', 'U', 'B', 'R', 'G'], primaryColor: 'W', strategies: ['tokens', 'aristocrats', 'prision', 'voltron', 'lifegain'], archetypes: ['aggro-sinergico', 'midrange'] },
  { id: 'elf', label: 'Elfos', colors: ['G', 'B', 'W'], primaryColor: 'G', strategies: ['tokens', 'lifegain', 'aristocrats'], archetypes: ['aggro-sinergico', 'combo', 'ramp-tron'] },
  { id: 'goblin', label: 'Goblins', colors: ['R', 'B', 'G'], primaryColor: 'R', strategies: ['tokens', 'aristocrats'], archetypes: ['aggro-puro', 'aggro-sinergico', 'combo'] },
  { id: 'merfolk', label: 'Tritones (Merfolk)', colors: ['U', 'G'], primaryColor: 'U', strategies: ['blink', 'tokens'], archetypes: ['aggro-sinergico', 'tempo'] },
  { id: 'zombie', label: 'Zombies', colors: ['B', 'U'], primaryColor: 'B', strategies: ['aristocrats', 'reanimator', 'madness', 'mill', 'tokens'], archetypes: ['aggro-sinergico', 'midrange', 'combo'] },
  { id: 'vampire', label: 'Vampiros', colors: ['B', 'R', 'W'], primaryColor: 'B', strategies: ['aristocrats', 'lifegain', 'madness', 'reanimator'], archetypes: ['aggro-sinergico', 'midrange'] },
  { id: 'spirit', label: 'Espíritus', colors: ['W', 'U'], primaryColor: ['W', 'U'], strategies: ['blink', 'prision', 'tokens'], archetypes: ['tempo', 'control'] },
  { id: 'angel', label: 'Ángeles', colors: ['W', 'R', 'B'], primaryColor: 'W', strategies: ['lifegain', 'blink', 'prision', 'reanimator'], archetypes: ['midrange', 'control'] },
  { id: 'demon', label: 'Demonios', colors: ['B'], primaryColor: 'B', strategies: ['aristocrats', 'reanimator'], archetypes: ['midrange', 'control'] },
  { id: 'dragon', label: 'Dragones', colors: ['R', 'B', 'G'], primaryColor: 'R', strategies: ['reanimator', 'tokens', 'blink'], archetypes: ['midrange', 'ramp-tron'] },
  { id: 'eldrazi', label: 'Eldrazi', colors: ['W', 'U', 'B', 'R', 'G', 'C'], primaryColor: 'C', strategies: ['tokens', 'blink'], archetypes: ['ramp-tron', 'midrange', 'legacy-eldrazi'] },
  { id: 'faerie', label: 'Hadas', colors: ['U', 'B'], primaryColor: 'U', strategies: ['blink', 'mill', 'prision'], archetypes: ['tempo', 'control'] },
  { id: 'rogue', label: 'Pícaros (Rogues)', colors: ['U', 'B'], primaryColor: ['U', 'B'], strategies: ['mill', 'aristocrats'], archetypes: ['tempo', 'aggro-sinergico'] },
  { id: 'pirate', label: 'Piratas', colors: ['U', 'B', 'R'], primaryColor: 'R', strategies: ['aristocrats', 'tokens'], archetypes: ['aggro-sinergico', 'tempo'] },
  { id: 'dinosaur', label: 'Dinosaurios', colors: ['R', 'G', 'W'], primaryColor: 'G', strategies: ['landfall', 'tokens'], archetypes: ['midrange', 'ramp-tron'] },
  { id: 'cat', label: 'Gatos', colors: ['W', 'G'], primaryColor: 'W', strategies: ['lifegain', 'voltron', 'tokens'], archetypes: ['aggro-sinergico', 'midrange'] },
  { id: 'knight', label: 'Caballeros', colors: ['W', 'B', 'R'], primaryColor: 'W', strategies: ['voltron', 'tokens', 'aristocrats'], archetypes: ['aggro-sinergico', 'midrange'] },
  { id: 'wizard', label: 'Magos (Wizards)', colors: ['U', 'R', 'B'], primaryColor: 'U', strategies: ['spellslinger', 'blink', 'mill'], archetypes: ['tempo', 'control', 'combo'] },
  { id: 'soldier', label: 'Soldados', colors: ['W', 'U'], primaryColor: 'W', strategies: ['tokens', 'prision', 'voltron'], archetypes: ['aggro-puro', 'aggro-sinergico'] },
  { id: 'sliver', label: 'Slivers', colors: ['W', 'U', 'B', 'R', 'G'], primaryColor: ['W', 'U', 'B', 'R', 'G'], strategies: ['tokens', 'voltron'], archetypes: ['aggro-sinergico', 'combo'] },
  { id: 'ninja', label: 'Ninjas', colors: ['U', 'B'], primaryColor: ['U', 'B'], strategies: ['tempo', 'blink'], archetypes: ['tempo', 'aggro-sinergico'] },
  { id: 'rat', label: 'Ratas', colors: ['B'], primaryColor: 'B', strategies: ['aristocrats', 'tokens', 'madness'], archetypes: ['aggro-sinergico', 'midrange'] },
  { id: 'bird', label: 'Aves', colors: ['W', 'U'], primaryColor: ['W', 'U'], strategies: ['blink', 'tokens'], archetypes: ['tempo', 'aggro-sinergico'] },
  { id: 'snake', label: 'Serpientes', colors: ['G', 'U'], primaryColor: 'G', strategies: ['tokens', 'lifegain'], archetypes: ['midrange', 'aggro-sinergico'] },
  { id: 'dwarf', label: 'Enanos', colors: ['R', 'W'], primaryColor: 'R', strategies: ['vehicles', 'tokens'], archetypes: ['aggro-sinergico', 'midrange'] },
  { id: 'warrior', label: 'Guerreros', colors: ['R', 'G', 'W'], primaryColor: ['R', 'G'], strategies: ['voltron', 'tokens'], archetypes: ['aggro-puro', 'aggro-sinergico'] },
  { id: 'scarecrow', label: 'Espantapájaros', colors: ['W', 'U', 'B', 'R', 'G'], primaryColor: ['W', 'U', 'B', 'R', 'G'], strategies: ['blink', 'midrange'], archetypes: ['midrange', 'control'] },
  { id: 'myr', label: 'Myr', colors: ['C'], primaryColor: 'C', strategies: ['tokens', 'ramp-tron'], archetypes: ['ramp-tron', 'aggro-sinergico'] },
  { id: 'naga', label: 'Nagas (Serpientes)', colors: ['G', 'U', 'B'], primaryColor: ['G', 'U'], strategies: ['delirium', 'spellslinger', 'tokens', 'landfall', 'madness'], archetypes: ['midrange', 'control', 'aggro-sinergico'] },

  // --- ALIANZAS Y SINDICATOS (BATCHING) ---
  { id: 'outlaws', label: '⚖️ Forajidos (Asesinos, Mercenarios, Piratas, Pícaros, Brujos)', colors: ['B', 'R', 'U'], primaryColor: 'B', strategies: ['aristocrats', 'tempo', 'tokens', 'madness'], archetypes: ['aggro-sinergico', 'tempo', 'midrange'] },
  { id: 'party', label: '🎲 Grupo de Aventura (Clérigo, Pícaro, Guerrero, Mago)', colors: ['W', 'U', 'B', 'R', 'G'], primaryColor: ['W', 'U', 'B', 'R'], strategies: ['midrange', 'tempo', 'aggro-sinergico', 'blink'], archetypes: ['midrange', 'tempo'] },
  { id: 'human_army', label: '⚔️ Ejército (Humanos, Soldados, Caballeros)', colors: ['W', 'R'], primaryColor: 'W', strategies: ['tokens', 'voltron', 'heroic'], archetypes: ['aggro-sinergico', 'aggro-puro', 'midrange'] },
  { id: 'goblin_horde', label: '🔥 Horda (Goblins, Orcos, Ogros)', colors: ['R', 'B'], primaryColor: 'R', strategies: ['tokens', 'aristocrats', 'aggro-puro'], archetypes: ['aggro-puro', 'aggro-sinergico'] },
  { id: 'elf_druid', label: '🌿 Naturaleza (Elfos, Druidas, Elementales, Chamanes)', colors: ['G', 'R', 'U'], primaryColor: 'G', strategies: ['tokens', 'ramp-tron', 'landfall'], archetypes: ['aggro-sinergico', 'ramp-tron', 'combo'] },
  { id: 'sea_monsters', label: '🌊 Terrores Marinos (Tritones, Krakens, Leviatanes, Pulpos)', colors: ['U', 'G'], primaryColor: 'U', strategies: ['tempo', 'ramp-tron', 'blink'], archetypes: ['tempo', 'ramp-tron', 'control'] },
  { id: 'undead_scourge', label: '💀 Plaga (Zombies, Esqueletos, Horrores)', colors: ['B', 'U'], primaryColor: 'B', strategies: ['aristocrats', 'reanimator', 'mill', 'delirium'], archetypes: ['midrange', 'combo', 'control'] },
  { id: 'constructs', label: '⚙️ Maquinaria Viviente (Myr, Golem, Constructos)', colors: ['C', 'U', 'R'], primaryColor: 'C', strategies: ['tokens', 'ramp-tron', 'vehicles'], archetypes: ['mud-artifacts', 'legacy-eldrazi', 'midrange'] }
];

export const MTG_STRATEGIES = [
  { 
    id: 'aristocrats', 
    label: 'Aristocrats (Sacrificio por valor)', 
    colors: ['B', 'R', 'W'], 
    primaryColor: 'B',
    archetypes: ['aggro-sinergico', 'midrange', 'combo'],
    mechanics: 'Combina "Sacrifice Outlets" (permanentes que te permiten sacrificar criaturas sin coste de maná repetidamente) con "Death Triggers" (efectos que drenan vida, roban cartas o destruyen al morir) y generadores de tokens o criaturas que regresan del cementerio.' 
  },
  { 
    id: 'reanimator', 
    label: 'Reanimator (Revivir criaturas)', 
    colors: ['B', 'U', 'R', 'W'], 
    primaryColor: 'B',
    archetypes: ['combo', 'midrange', 'ramp-tron'],
    mechanics: 'Enfocado en usar efectos de descarte rápido ("Discard Outlets") o autodeckeo para poner criaturas de coste muy alto en el cementerio, y luego usar hechizos baratos de reanimación para ponerlos directamente en el campo de batalla en los primeros turnos.' 
  },
  { 
    id: 'tokens', 
    label: 'Tokens (Fichas y Enjambre)', 
    colors: ['W', 'G', 'R'], 
    primaryColor: ['W', 'G'],
    archetypes: ['aggro-puro', 'aggro-sinergico', 'midrange'],
    mechanics: 'Maximiza la presencia en mesa mediante hechizos o criaturas que generan múltiples fichas, potenciándolas masivamente con efectos "Anthem" (+1/+1 global) o castigando al oponente por la cantidad de permanentes al entrar.' 
  },
  { 
    id: 'spellslinger', 
    label: 'Spellslinger / Prowess (Conjuros e Instantáneos)', 
    colors: ['U', 'R', 'W'], 
    primaryColor: ['U', 'R'],
    archetypes: ['tempo', 'combo', 'aggro-puro'],
    mechanics: 'Mazo con muy pocas criaturas. Prioriza criaturas de bajo coste que crecen ("Prowess") o generan valor ("Magecraft") cada vez que se lanza un hechizo que no sea de criatura. Alta densidad de robo de cartas barato y daño directo.' 
  },
  { 
    id: 'blink', 
    label: 'Blink / Flicker (Exiliar y volver al campo)', 
    colors: ['W', 'U'], 
    primaryColor: ['W', 'U'],
    archetypes: ['tempo', 'midrange', 'control'],
    mechanics: 'Usa criaturas con poderosos efectos de "Entrada al Campo de Batalla" (ETB) junto con instantáneos o permanentes que exilian y devuelven tus criaturas al instante, reutilizando sus habilidades y protegiéndolas de la remoción del oponente.' 
  },
  { 
    id: 'mill', 
    label: 'Mill (Deckeo)', 
    colors: ['U', 'B'], 
    primaryColor: 'U',
    archetypes: ['combo', 'control'],
    mechanics: 'Condición de victoria alternativa: agotar la biblioteca del oponente mediante hechizos que envían cartas de su mazo directamente a su cementerio. Suele ir acompañado de control para sobrevivir.' 
  },
  { 
    id: 'enchantress', 
    label: 'Enchantress / Auras (Sinergia de Encantamientos)', 
    colors: ['W', 'G'], 
    primaryColor: 'G',
    archetypes: ['midrange', 'combo', 'prision'],
    mechanics: 'Construye un motor inagotable de robo de cartas usando criaturas que te hacen robar cada vez que juegas un encantamiento. Usa auras potenciadoras sobre criaturas resistentes o encantamientos tipo "Cárcel" (Prison) para neutralizar al oponente.' 
  },
  { 
    id: 'landfall', 
    label: 'Landfall (Sinergia de Tierras)', 
    colors: ['G', 'R', 'U'], 
    primaryColor: 'G',
    archetypes: ['midrange', 'ramp-tron'],
    mechanics: 'Saca ventaja de habilidades que se disparan cada vez que una tierra entra a tu campo. Usa hechizos que buscan tierras adicionales en un mismo turno o tierras tipo "Fetchland" para multiplicar los disparos.' 
  },
  { 
    id: 'madness', 
    label: 'Madness / Descarte (Abusar del cementerio)', 
    colors: ['B', 'R'], 
    primaryColor: 'R',
    archetypes: ['aggro-puro', 'aggro-sinergico', 'midrange'],
    mechanics: 'Convierte el descartar tus propias cartas en una ventaja. Incluye "Discard Outlets" que te den beneficios por descartar, combinados con hechizos que tienen la mecánica "Madness" o criaturas que pueden lanzarse desde el cementerio.' 
  },
  { 
    id: 'lifegain', 
    label: 'Lifegain (Ganancia de vidas y contadores)', 
    colors: ['W', 'B', 'G'], 
    primaryColor: 'W',
    archetypes: ['aggro-sinergico', 'midrange'],
    mechanics: 'No solo se trata de sobrevivir, sino de convertir la vida en un recurso ofensivo. Usa cartas de coste muy bajo que ganan vidas constantemente junto con criaturas que reciben contadores +1/+1 o disparan efectos dañinos cada vez que ganas vida.' 
  },
  { 
    id: 'prison', 
    label: 'Soft Prison / Pillow Fort (Impuestos y ralentización)', 
    colors: ['W', 'U'], 
    primaryColor: 'W',
    archetypes: ['prision', 'control'],
    mechanics: 'Evita los ataques y corta el avance del oponente usando artefactos y encantamientos que imponen costes adicionales ("Impuestos") para atacar, robar o lanzar hechizos. Gana el juego muy lentamente cuando el oponente no puede hacer nada.' 
  },
  { 
    id: 'voltron', 
    label: 'Voltron (Equipos y Auras sobre una criatura)', 
    colors: ['W', 'R'], 
    primaryColor: 'W',
    archetypes: ['aggro-puro', 'aggro-sinergico', 'midrange'],
    mechanics: 'Centra toda tu estrategia en jugar una o dos criaturas extremadamente evasivas (volar, imbloqueable) o difíciles de matar (hexproof, indestructible), y llénalas de "Equipos" o "Auras" para matar en pocos golpes.' 
  },
  { 
    id: 'vehicles', 
    label: 'Vehículos (Pilotos y Maquinaria)', 
    colors: ['R', 'W', 'U'], 
    primaryColor: 'R',
    archetypes: ['aggro-sinergico', 'midrange'],
    mechanics: 'Utiliza criaturas eficientes de bajo coste ("Pilotos") para activar ("Crew") artefactos masivos. Se beneficia de una alta resiliencia frente a hechizos que destruyen criaturas a nivel global (Board Wipes).' 
  },
  { 
    id: 'delirium', 
    label: 'Delirium / Threshold (Tipos en Cementerio)', 
    colors: ['B', 'G'], 
    primaryColor: 'B',
    archetypes: ['midrange', 'control'],
    mechanics: 'Estrategia basada en llenar tu propio cementerio con una diversidad de tipos de cartas (Criatura, Tierra, Artefacto, Instantáneo) para desbloquear habilidades sobrealimentadas en tus criaturas y hechizos ("Delirium").' 
  },
  { 
    id: 'heroic', 
    label: 'Heroic (Targeting y Buffs)', 
    colors: ['W', 'R'], 
    primaryColor: 'W',
    archetypes: ['aggro-puro', 'aggro-sinergico'],
    mechanics: 'Basado en lanzar hechizos (Auras, trucos de combate) que hagan objetivo a tus propias criaturas para disparar habilidades heroicas, creando amenazas inmensas rápidamente.' 
  },
  { 
    id: 'sagas', 
    label: 'Sagas / Historias (Control por Encantamientos)', 
    colors: ['W', 'U', 'G'], 
    primaryColor: 'W',
    archetypes: ['midrange', 'control', 'prision'],
    mechanics: 'Abusa de encantamientos con mecánicas de "Saga" que otorgan efectos poderosos a lo largo de varios turnos. Usa efectos de proliferar o manipulación de contadores para repetir capítulos específicos.' 
  },
  { 
    id: 'domain', 
    label: 'Domain (5-Color Soup)', 
    colors: ['W', 'U', 'B', 'R', 'G'], 
    primaryColor: ['W', 'U', 'B', 'R', 'G'],
    archetypes: ['midrange', 'control'],
    mechanics: 'Aprovecha la presencia de múltiples tipos de tierras básicas (Llanura, Isla, Pantano, Montaña, Bosque) para maximizar el poder de los hechizos con la palabra clave "Dominio".' 
  },
  { 
    id: 'energy', 
    label: 'Energía (Gestión de Recursos)', 
    colors: ['R', 'U', 'G'], 
    primaryColor: ['R', 'U'],
    archetypes: ['midrange', 'tempo'],
    mechanics: 'Genera contadores de "Energía" al lanzar hechizos o jugar criaturas, y los gasta como recurso secundario para activar habilidades poderosas. No se vacía entre turnos.' 
  }
];
