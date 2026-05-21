// src/services/mtgtop8Service.js

/**
 * MOCK DATA DE METAJUEGO COMPETITIVO ELITE (MTG)
 * Estructuras de mazos de torneos reales de MTGTop8 para usar en modo offline o sin API Key.
 */
const MOCK_METAGAME_DECKS = {
  STANDARD: [
    {
      name: "Dimir Midrange",
      main: [
        { name: "Deep-Cavern Bat", quantity: 4 },
        { name: "Preacher of the Schism", quantity: 3 },
        { name: "Sheoldred, the Apocalypse", quantity: 3 },
        { name: "Gix, Yawgmoth Praetor", quantity: 2 },
        { name: "Spyglass Siren", quantity: 4 },
        { name: "Cut Down", quantity: 3 },
        { name: "Go for the Throat", quantity: 4 },
        { name: "Make Disappear", quantity: 3 },
        { name: "Duress", quantity: 2 },
        { name: "Tishana's Tidebinder", quantity: 2 },
        { name: "Tear Asunder", quantity: 2 },
        { name: "Subterranean Schism", quantity: 2 }
      ]
    },
    {
      name: "Boros Convoke",
      main: [
        { name: "Novice Inspector", quantity: 4 },
        { name: "Voldaren Epicure", quantity: 4 },
        { name: "Gleeful Demolition", quantity: 4 },
        { name: "Knight-Errant of Eos", quantity: 4 },
        { name: "Resolute Reinforcements", quantity: 4 },
        { name: "Sanguine Evangelist", quantity: 3 },
        { name: "Imodane's Recruiter", quantity: 3 },
        { name: "Warden of the Inner Sky", quantity: 4 },
        { name: "Lightning Helix", quantity: 3 },
        { name: "Warleader's Call", quantity: 3 },
        { name: "Case of the Gateway Express", quantity: 2 }
      ]
    },
    {
      name: "Esper Midrange",
      main: [
        { name: "Raffine, Scheming Seer", quantity: 4 },
        { name: "Deep-Cavern Bat", quantity: 4 },
        { name: "Dennick, Pious Apprentice", quantity: 2 },
        { name: "Sheoldred, the Apocalypse", quantity: 2 },
        { name: "Wedding Announcement", quantity: 3 },
        { name: "Go for the Throat", quantity: 3 },
        { name: "Make Disappear", quantity: 3 },
        { name: "Cut Down", quantity: 2 },
        { name: "No More Lies", quantity: 3 },
        { name: "The Wandering Emperor", quantity: 3 },
        { name: "Virtue of Loyalty", quantity: 3 }
      ]
    }
  ],
  PIONEER: [
    {
      name: "Rakdos Midrange",
      main: [
        { name: "Thoughtseize", quantity: 4 },
        { name: "Fatal Push", quantity: 4 },
        { name: "Bloodtithe Harvester", quantity: 4 },
        { name: "Fable of the Mirror-Breaker", quantity: 4 },
        { name: "Sheoldred, the Apocalypse", quantity: 3 },
        { name: "Bonecrusher Giant", quantity: 4 },
        { name: "Graveyard Trespasser", quantity: 2 },
        { name: "Kroxa, Titan of Death's Hunger", quantity: 1 },
        { name: "Dreadbore", quantity: 2 },
        { name: "Duress", quantity: 2 },
        { name: "Archfiend of the Dross", quantity: 2 },
        { name: "Bitter Triumph", quantity: 2 }
      ]
    },
    {
      name: "Azorius Control",
      main: [
        { name: "Teferi, Hero of Dominaria", quantity: 3 },
        { name: "The Wandering Emperor", quantity: 3 },
        { name: "Supreme Verdict", quantity: 3 },
        { name: "Censor", quantity: 4 },
        { name: "Dovin's Veto", quantity: 3 },
        { name: "Absorb", quantity: 2 },
        { name: "Temporary Lockdown", quantity: 3 },
        { name: "Lay Down Arms", quantity: 4 },
        { name: "Memory Deluge", quantity: 3 },
        { name: "March of Otherworldly Light", quantity: 2 },
        { name: "Get Lost", quantity: 2 },
        { name: "Shark Typhoon", quantity: 2 }
      ]
    },
    {
      name: "Izzet Phoenix",
      main: [
        { name: "Arclight Phoenix", quantity: 4 },
        { name: "Ledger Shredder", quantity: 4 },
        { name: "Consider", quantity: 4 },
        { name: "Opt", quantity: 4 },
        { name: "Sleight of Hand", quantity: 3 },
        { name: "Fiery Impulse", quantity: 3 },
        { name: "Lightning Axe", quantity: 2 },
        { name: "Treasure Cruise", quantity: 4 },
        { name: "Spikefield Hazard", quantity: 2 },
        { name: "Izzet Charm", quantity: 2 },
        { name: "Pieces of the Puzzle", quantity: 3 },
        { name: "Temporal Trespass", quantity: 1 }
      ]
    }
  ],
  MODERN: [
    {
      name: "Izzet Murktide",
      main: [
        { name: "Lightning Bolt", quantity: 4 },
        { name: "Counterspell", quantity: 4 },
        { name: "Murktide Regent", quantity: 4 },
        { name: "Dragon's Rage Channeler", quantity: 4 },
        { name: "Ragavan, Nimble Pilferer", quantity: 4 },
        { name: "Ledger Shredder", quantity: 2 },
        { name: "Preordain", quantity: 4 },
        { name: "Unholy Heat", quantity: 3 },
        { name: "Force of Negation", quantity: 2 },
        { name: "Spell Pierce", quantity: 2 },
        { name: "Consider", quantity: 4 },
        { name: "Archmage's Charm", quantity: 1 }
      ]
    },
    {
      name: "Golgari Yawgmoth",
      main: [
        { name: "Yawgmoth, Thran Physician", quantity: 4 },
        { name: "Chord of Calling", quantity: 4 },
        { name: "Young Wolf", quantity: 4 },
        { name: "Wall of Roots", quantity: 4 },
        { name: "Grist, the Hunger Tide", quantity: 3 },
        { name: "Orcish Bowmasters", quantity: 4 },
        { name: "Delighted Halfling", quantity: 4 },
        { name: "Eldritch Evolution", quantity: 3 },
        { name: "Strangleroot Geist", quantity: 2 },
        { name: "Hapatra, Vizier of Poisons", quantity: 1 },
        { name: "Haywire Mite", quantity: 2 },
        { name: "Fatal Push", quantity: 1 }
      ]
    },
    {
      name: "Dimir Mill",
      main: [
        { name: "Ruin Crab", quantity: 4 },
        { name: "Hedron Crab", quantity: 4 },
        { name: "Glimpse the Unthinkable", quantity: 4 },
        { name: "Fractured Sanity", quantity: 4 },
        { name: "Tasha's Hideous Laughter", quantity: 4 },
        { name: "Visions of Beyond", quantity: 4 },
        { name: "Archive Trap", quantity: 4 },
        { name: "Fatal Push", quantity: 3 },
        { name: "Counterspell", quantity: 3 },
        { name: "Drown in the Loch", quantity: 4 },
        { name: "Surgical Extraction", quantity: 2 }
      ]
    }
  ],
  LEGACY: [
    {
      name: "Dimir Rescator (Grief & Reanimate)",
      main: [
        { name: "Brainstorm", quantity: 4 },
        { name: "Ponder", quantity: 4 },
        { name: "Force of Will", quantity: 4 },
        { name: "Daze", quantity: 4 },
        { name: "Grief", quantity: 4 },
        { name: "Reanimate", quantity: 4 },
        { name: "Orcish Bowmasters", quantity: 4 },
        { name: "Murktide Regent", quantity: 2 },
        { name: "Troll of Khazad-dum", quantity: 3 },
        { name: "Snuff Out", quantity: 2 },
        { name: "Fatal Push", quantity: 2 },
        { name: "Thoughtseize", quantity: 3 }
      ]
    },
    {
      name: "Mono Red Initiative Aggro",
      main: [
        { name: "Caves of Chaos Adventurer", quantity: 4 },
        { name: "Broadside Bombardiers", quantity: 4 },
        { name: "Muxus, Goblin Grandee", quantity: 2 },
        { name: "Shatterskull Smashing", quantity: 2 },
        { name: "Simian Spirit Guide", quantity: 4 },
        { name: "Chrome Mox", quantity: 4 },
        { name: "Lotus Petal", quantity: 4 },
        { name: "Chalice of the Void", quantity: 4 },
        { name: "Trinisphere", quantity: 3 },
        { name: "Ancient Tomb", quantity: 4 },
        { name: "City of Traitors", quantity: 4 },
        { name: "Blood Moon", quantity: 4 }
      ]
    },
    {
      name: "Azorius Blink Control",
      main: [
        { name: "Swords to Plowshares", quantity: 4 },
        { name: "Brainstorm", quantity: 4 },
        { name: "Ponder", quantity: 4 },
        { name: "Force of Will", quantity: 4 },
        { name: "Solitude", quantity: 4 },
        { name: "Ephemerate", quantity: 3 },
        { name: "Teferi, Time Raveler", quantity: 3 },
        { name: "Snapcaster Mage", quantity: 2 },
        { name: "Lorien Revealed", quantity: 4 },
        { name: "Prismatic Ending", quantity: 3 },
        { name: "Spell Pierce", quantity: 2 },
        { name: "Stifle", quantity: 1 }
      ]
    }
  ]
};

/**
 * Guarda los datos de metagame del formato seleccionado en localStorage de forma segura.
 */
export const saveMetaToDB = (format, data) => {
  try {
    const key = `mtgtop8_meta_${format.toUpperCase()}`;
    localStorage.setItem(key, JSON.stringify(data));
    console.log(`[MTGTop8] Perfil metagame de ${format} guardado exitosamente.`);
    return true;
  } catch (err) {
    console.error("[MTGTop8] Error al guardar metagame en localStorage:", err);
    return false;
  }
};

/**
 * Carga los datos de metagame del formato seleccionado. Si no hay en localStorage, carga los mock correspondientes.
 */
export const loadMetaFromDB = (format) => {
  const targetFormat = format ? format.toUpperCase() : "MODERN";
  try {
    const key = `mtgtop8_meta_${targetFormat}`;
    const localData = localStorage.getItem(key);
    if (localData) {
      return JSON.parse(localData);
    }
  } catch (err) {
    console.error(`[MTGTop8] Error al cargar metagame para ${targetFormat}:`, err);
  }

  // Fallback a los datos Mock de alta calidad
  console.log(`[MTGTop8] Cargando Mock Data Competitiva para ${targetFormat}...`);
  return computeMetaFromDecklistsList(MOCK_METAGAME_DECKS[targetFormat] || MOCK_METAGAME_DECKS.MODERN);
};

/**
 * Parsea y calcula la coocurrencia y frecuencia de uso para un conjunto de barajas.
 */
export function computeMetaFromDecklistsList(decks) {
  const staplesFreq = {};
  const cooccurrence = {};
  let totalDecks = decks.length || 1;

  // 1. Contabilizar frecuencias
  decks.forEach(deck => {
    const cards = deck.main.map(c => c.name.toLowerCase().trim());
    cards.forEach(card => {
      staplesFreq[card] = (staplesFreq[card] || 0) + 1;
    });

    // 2. Contabilizar coocurrencia
    for (let i = 0; i < cards.length; i++) {
      const cardA = cards[i];
      if (!cooccurrence[cardA]) cooccurrence[cardA] = {};
      for (let j = i + 1; j < cards.length; j++) {
        const cardB = cards[j];
        cooccurrence[cardA][cardB] = (cooccurrence[cardA][cardB] || 0) + 1;

        if (!cooccurrence[cardB]) cooccurrence[cardB] = {};
        cooccurrence[cardB][cardA] = (cooccurrence[cardB][cardA] || 0) + 1;
      }
    }
  });

  // Convertir frecuencias a porcentajes relativos
  const staplesPercentage = {};
  Object.keys(staplesFreq).forEach(card => {
    staplesPercentage[card] = Math.round((staplesFreq[card] / totalDecks) * 100);
  });

  // Convertir coocurrencia a coeficientes (porcentajes de par)
  const cooccurrenceCoeff = {};
  Object.keys(cooccurrence).forEach(cardA => {
    cooccurrenceCoeff[cardA] = {};
    Object.keys(cooccurrence[cardA]).forEach(cardB => {
      cooccurrenceCoeff[cardA][cardB] = Math.round((cooccurrence[cardA][cardB] / totalDecks) * 100);
    });
  });

  return {
    lastIngestionDate: Date.now(),
    totalDecks: totalDecks,
    staples: staplesPercentage,
    synergies: cooccurrenceCoeff,
    source: "Mock Competitivo Local"
  };
}

/**
 * Consulta la API de Apify para ejecutar el scraper de MTGTop8 y descargar torneos en tiempo real.
 */
export async function fetchMTGTop8Decklists(apifyToken, format, maxItems = 30, initialMetaWindow = 8) {
  if (!apifyToken) {
    throw new Error("Se requiere un Token de API de Apify para llamadas en vivo.");
  }

  // Mapear el formato interno a los códigos de MTGTop8
  const formatMapping = {
    'STANDARD': 'ST',
    'PIONEER': 'PI',
    'MODERN': 'MO',
    'LEGACY': 'LE'
  };
  const mtgFormat = formatMapping[format.toUpperCase()] || 'ST';

  // Endpoint de ejecución síncrona de Apify (corre el actor y devuelve el dataset directamente)
  const runSyncUrl = `https://api.apify.com/v2/acts/jungle_synthesizer~mtgtop8-magic-tournament-archive-scraper/run-sync-get-dataset-items?token=${apifyToken}`;

  const windowsToTry = Array.from(new Set([initialMetaWindow, 16, 32, 52]));
  let events = [];
  let currentWindowUsed = initialMetaWindow;

  for (let windowSize of windowsToTry) {
    currentWindowUsed = windowSize;
    console.log(`[MTGTop8 Apify] Paso 1: Intentando obtener torneos de ${format} con ventana de ${windowSize} semanas...`);

    try {
      const eventsResponse = await fetch(runSyncUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode: "format_events",
          format: mtgFormat,
          metaWindow: windowSize,
          maxItems: 8, // Ampliamos a 8 torneos posibles para raspar más
          sp_intended_usage: "Analisis de metajuego educativo y simulacion de barajas",
          sp_improvement_suggestions: "Ninguna sugerencia, funciona excelente",
          contactEmail: "battleboxforge@gmail.com"
        })
      });

      if (!eventsResponse.ok) {
        if (eventsResponse.status === 401) {
          throw new Error("Token de API de Apify inválido o expirado (401).");
        }
        throw new Error(`Error al obtener eventos de Apify (HTTP ${eventsResponse.status}).`);
      }

      const parsedEvents = await eventsResponse.json();
      if (parsedEvents && parsedEvents.length > 0) {
        events = parsedEvents;
        console.log(`[MTGTop8 Apify] ¡Éxito! Encontrados ${events.length} torneos con ventana de ${windowSize} semanas.`);
        break; // Detenemos la búsqueda si encontramos eventos
      }
    } catch (e) {
      console.warn(`[MTGTop8 Apify] Intento fallido para ventana de ${windowSize} semanas:`, e.message);
      if (e.message.includes("Token de API de Apify inválido")) {
        throw e; // Lanza de inmediato si es problema de auth
      }
    }
  }

  if (!events || events.length === 0) {
    throw new Error(`No se encontraron torneos en la ventana especificada.`);
  }

  // Extraer las URLs de hasta 10 torneos para maximizar la cobertura del escáner
  const targetEvents = events.slice(0, 10);
  console.log("[MTGTop8 Apify] Objetos de torneo crudos recibidos de Apify:", JSON.stringify(targetEvents, null, 2));

  const eventUrls = targetEvents.map(e => {
    const possibleUrl = e.event_url || e.url || e.eventUrl || e.event_Url;
    if (possibleUrl) return possibleUrl;

    const possibleId = e.event_id || e.eventId || e.id || e.event_Id;
    if (possibleId) {
      return `https://mtgtop8.com/event?e=${possibleId}&f=${mtgFormat}`;
    }
    return null;
  }).filter(Boolean);

  console.log(`[MTGTop8 Apify] Paso 2: Raspando barajas de los torneos:`, eventUrls);

  if (eventUrls.length === 0) {
    throw new Error("No se pudo extraer ninguna URL de torneo válida de los metadatos recibidos.");
  }

  try {
    // Paso 2: Obtener barajas de estos eventos
    const decksResponse = await fetch(runSyncUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      mode: "event",
      eventUrls: eventUrls,
      includeSideboard: true,
      maxItems: maxItems,
      sp_intended_usage: "Analisis de metajuego educativo y simulacion de barajas",
      sp_improvement_suggestions: "Ninguna sugerencia, funciona excelente",
      contactEmail: "battleboxforge@gmail.com"
    })
  });

  if (!decksResponse.ok) {
    throw new Error(`Error al obtener barajas de Apify (HTTP ${decksResponse.status}).`);
  }

  const items = await decksResponse.json();
  console.log(`[MTGTop8 Apify] Recibidos ${items?.length || 0} registros de barajas.`);

  if (!items || items.length === 0) {
    throw new Error("No se encontraron registros de barajas en los torneos seleccionados.");
  }

  // Parseador de una carta individual en formato "4 Lightning Bolt" o "4  Lightning Bolt" o "4x Lightning Bolt"
  const parseMTGTop8Card = (cardStr) => {
    const trimmed = cardStr.trim();
    const match = trimmed.match(/^(\d+)\s*x?\s+(.+)$/);
    if (match) {
      return {
        name: match[2].trim(),
        quantity: parseInt(match[1], 10)
      };
    }
    return null;
  };

  // Convertir cada registro de mazo al formato de ingesta
  const processedDecks = [];
  items.forEach((item, idx) => {
    const mainCards = [];
    const rawBoard = item.mainboard || item.main || item.mainboard_cards || item.cards;
    let cardsSource = [];

    if (typeof rawBoard === 'string') {
      cardsSource = rawBoard.split(',');
    } else if (Array.isArray(rawBoard)) {
      cardsSource = rawBoard;
    }

    cardsSource.forEach(c => {
      if (typeof c === 'string') {
        const parsed = parseMTGTop8Card(c);
        if (parsed) mainCards.push(parsed);
      } else if (c && typeof c === 'object') {
        const name = c.name || c.card || c.title || c.cardName || c.card_name;
        const quantity = parseInt(c.quantity || c.qty || c.count || c.amount || 1, 10);
        if (name) {
          mainCards.push({ name: name.trim(), quantity });
        }
      }
    });

    if (mainCards.length > 0) {
      processedDecks.push({
        name: item.deck_archetype || item.archetype || item.deck_name || item.name || `Mazo MTGTop8 #${idx + 1}`,
        main: mainCards
      });
    }
  });

  if (processedDecks.length === 0) {
    throw new Error("No se pudo parsear ninguna carta del metajuego de MTGTop8.");
  }

  // Calcular perfil del metagame real
  const metaProfile = computeMetaFromDecklistsList(processedDecks);
  metaProfile.source = `MTGTop8 (Apify API - ${targetEvents.length} Torneos)`;
  metaProfile.lastIngestionDate = Date.now();

  // Guardar en la base de datos de metajuegos locales
  saveMetaToDB(format, metaProfile);

  return metaProfile;
} catch (err) {
  console.warn("[MTGTop8 Apify] Fallo al consultar scraper, aplicando fallback de seguridad local:", err.message);
  // Graceful fallback to mock data so the app doesn't crash or show a failure state to the user
  const fallbackFormat = format ? format.toUpperCase() : "MODERN";
  const mockMeta = computeMetaFromDecklistsList(MOCK_METAGAME_DECKS[fallbackFormat] || MOCK_METAGAME_DECKS.MODERN);
  mockMeta.source = `Mock Local (${err.message.includes("Token") ? "Falta Token" : "Conexión/Vacío"} - Fallback)`;
  mockMeta.lastIngestionDate = Date.now();
  saveMetaToDB(format, mockMeta);
  return mockMeta;
}
}

/**
 * Utilidad de parsing para descomponer texto plano de Moxfield/MTGTop8 en objetos estructurados.
 */
export function parseDecklistText(text) {
  if (!text) return [];
  const lines = text.split("\n");
  const cards = [];

  let inSideboard = false;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Detectar separador de sideboard
    if (line.toLowerCase() === "sideboard" || line.toLowerCase().includes("// sideboard")) {
      inSideboard = true;
      continue;
    }

    // Ignorar cartas del sideboard en el cómputo principal si se desea, o procesarlas
    if (inSideboard) continue; 

    // Formato estándar: "4 Tarmogoyf" o "4x Tarmogoyf"
    const match = line.match(/^(\d+)\s*x?\s+(.+)$/i);
    if (match) {
      const quantity = parseInt(match[1], 10);
      const name = match[2].trim();
      cards.push({ name, quantity });
    }
  }

  return cards;
}

/**
 * Parsea múltiples mazos a partir de un texto plano, dividiéndolos por marcas comunes o saltos de línea dobles.
 */
export function parseMultipleDecklists(rawText) {
  if (!rawText) return [];
  
  // Separamos por "===", "---" o por dos o más saltos de línea consecutivos
  const parts = rawText.split(/(?:={3,}|-{3,}|(?:\r?\n\s*){2,})/);
  const decks = [];
  
  parts.forEach((part) => {
    const cleaned = part.trim();
    if (!cleaned) return;
    
    const parsedMain = parseDecklistText(cleaned);
    if (parsedMain.length > 0) {
      decks.push({
        name: `Mazo Importado #${decks.length + 1}`,
        main: parsedMain
      });
    }
  });
  
  return decks;
}
