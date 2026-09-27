/**
 * src/constants/duelPacks.js
 * 
 * Presets de Duelos Equilibrados (Duel Packs 50/50) para 60 cartas construido.
 * Diseñados para partidas casuales equilibradas entre amigos.
 * Calibrados para turnos de victoria equivalentes y planes de interacción cruzados.
 */

export const DUEL_PACK_PRESETS = [
  {
    id: 'burn_vs_merfolk',
    title: '🔥 Fuego vs Océano (Burn vs Merfolk)',
    subtitle: 'Aggro directo frente a Tempo disruptivo. Carreras al límite y lucha feroz por la iniciativa.',
    format: 'MODERN',
    targetKillTurn: 4,
    deck1: {
      name: 'Boros Burn',
      archetype: 'aggro',
      colores: ['R', 'W'],
      strategy: 'burn',
      speed: 'EXPLOSIVE',
      desc: '36 puntos de daño directo con Lightning Bolt, Lava Spike, Boros Charm y criaturas con prisa.'
    },
    deck2: {
      name: 'Mono-Blue Merfolk',
      archetype: 'tempo',
      colores: ['U'],
      tribe: 'Tritones (Merfolk)',
      strategy: 'merfolk',
      speed: 'EXPLOSIVE',
      desc: 'Señores marítimos, Counterspell, Aether Vial y tropas imbloqueables para neutralizar la agresión.'
    }
  },
  {
    id: 'elves_vs_goblins',
    title: '🌲 Elfos vs Trasgos (Guerra Tribal)',
    subtitle: 'El choque tribal por excelencia: Crecimiento exponencial de maná contra horda explosiva.',
    format: 'MODERN',
    targetKillTurn: 4,
    deck1: {
      name: 'Mono-Green Elves',
      archetype: 'aggro',
      colores: ['G'],
      tribe: 'Elfos',
      strategy: 'elves',
      speed: 'EXPLOSIVE',
      desc: 'Elvish Archdruid, Collected Company y Ezuri para un asalto arrollador y masivo.'
    },
    deck2: {
      name: 'Rakdos Goblins',
      archetype: 'aggro',
      colores: ['B', 'R'],
      tribe: 'Goblins',
      strategy: 'goblins',
      speed: 'EXPLOSIVE',
      desc: 'Goblin Guide, Munitions Expert, Rundvelt Hordemaster y Muxus para daño y recurrencia incesante.'
    }
  },
  {
    id: 'rakdos_vs_azorius',
    title: '💀 Jaque al Rey (Rakdos Midrange vs Azorius Control)',
    subtitle: 'Guerra mental y desgaste puro: La remoción más eficiente contra contrahechizos y barredores.',
    format: 'MODERN',
    targetKillTurn: 5,
    deck1: {
      name: 'Rakdos Midrange',
      archetype: 'midrange',
      colores: ['B', 'R'],
      strategy: 'midrange',
      speed: 'BALANCED',
      desc: 'Thoughtseize, Fatal Push, Fable of the Mirror-Breaker y Kroxa para desmantelar la mano rival.'
    },
    deck2: {
      name: 'Azorius Control',
      archetype: 'control',
      colores: ['W', 'U'],
      strategy: 'control',
      speed: 'BALANCED',
      desc: 'Counterspell, Supreme Verdict, Solitude y Teferi para controlar la mesa y sellar la partida.'
    }
  },
  {
    id: 'affinity_vs_aristocrats',
    title: '⚙️ Acero y Sacrificio (Affinity vs Aristócratas)',
    subtitle: 'Enjambre mecánico ultrarrápido contra motor de sacrificio y drenaje de vidas.',
    format: 'MODERN',
    targetKillTurn: 4,
    deck1: {
      name: 'Affinity Robots',
      archetype: 'aggro',
      colores: ['U'],
      strategy: 'affinity',
      speed: 'EXPLOSIVE',
      desc: 'Cranial Plating, Thoughtcast, Thought Monitor, Frogmite y Ornithopter a velocidad de relámpago.'
    },
    deck2: {
      name: 'Golgari Aristocrats',
      archetype: 'combo',
      colores: ['B', 'G'],
      strategy: 'aristocrats',
      speed: 'EXPLOSIVE',
      desc: 'Yawgmoth, Young Wolf, Blood Artist y Zulaport Cutthroat drenando vida en cadena recursiva.'
    }
  },
  {
    id: 'prowess_vs_reanimator',
    title: '⚡ Velocidad vs Colosos (Izzet Prowess vs Reanimator)',
    subtitle: 'Chispas y destreza hiper-eficiente frente a invocación temprana de titanes indestructibles.',
    format: 'MODERN',
    targetKillTurn: 4,
    deck1: {
      name: 'Izzet Prowess',
      archetype: 'aggro',
      colores: ['U', 'R'],
      strategy: 'spellslinger',
      speed: 'EXPLOSIVE',
      desc: 'Monastery Swiftspear, Soul-Scar Mage, cantrips veloces y ráfagas de daño que hinchan a tus atacantes.'
    },
    deck2: {
      name: 'BW Reanimator',
      archetype: 'combo',
      colores: ['W', 'B'],
      strategy: 'reanimator',
      speed: 'EXPLOSIVE',
      desc: 'Persist, Unmarked Grave y Archon of Cruelty para castigar la mesa desde el cementerio.'
    }
  }
];
