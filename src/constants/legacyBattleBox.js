export const BATTLEBOX_FORMAT_NAME = "Legacy Battle Box (Casual)";

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
    recommendedColors: ['G', 'U']
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
    recommendedColors: ['W', 'G', 'U']
  }
];

export const BATTLEBOX_RULES = {
  minMain: 60,
  targetSideboard: 15,
  maxCopies: 4,
  noCombosBeforeTurn: 4,
  noFreeSpellsBeforeTurn: 4
};
