import { getAllCards } from './dbIngestor.js';
import { parseSemanticCard } from './semanticCardParser.js';
import { analyzeCardIntelligence } from './cardIntelligenceEngine.js';

const getFetchOptions = (signal) => {
  const options = { signal };
  if (typeof window === 'undefined') {
    options.headers = {
      'User-Agent': 'BattleBoxArchitect/1.0 (contact: battleboxforge@gmail.com)'
    };
  }
  return options;
};

const DB_NAME = 'MagicGrimorioDB';
const DB_VERSION = 2;
const STORE_NAME = 'cards';
const STORE_TAGS = 'oracle_tags';

let db = null;

async function openDB() {
  if (db) return db;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('cardIndex', 'name', { unique: false });
      }
    };
  });
}
export async function saveCardToDB(card) {
  if (typeof indexedDB === 'undefined' || !card) {
    return;
  }
  if (!card.semantic_representation) {
    card.semantic_representation = parseSemanticCard(card);
  }
  if (!card.card_intelligence) {
    card.card_intelligence = analyzeCardIntelligence(card);
  }
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(card);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCardFromDB(name) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('cardIndex');
    const request = index.get(name);
    request.onsuccess = () => {
      const result = request.result || null;
      if (result) {
        if (!result.semantic_representation) {
          result.semantic_representation = parseSemanticCard(result);
        }
        if (!result.card_intelligence) {
          result.card_intelligence = analyzeCardIntelligence(result);
        }
      }
      resolve(result);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getAllCardNamesFromDB() {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('cardIndex');
    const request = index.getAllKeys();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function editDistance(s1, s2) {
  let costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) {
      costs[s2.length] = lastValue;
    }
  }
  return costs[s2.length];
}

function getSimilarity(s1, s2) {
  let longer = s1.toLowerCase().trim();
  let shorter = s2.toLowerCase().trim();
  if (longer.length < shorter.length) {
    let temp = longer;
    longer = shorter;
    shorter = temp;
  }
  let longerLength = longer.length;
  if (longerLength === 0) {
    return 1.0;
  }
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

export async function findFuzzyMatchInDB(cardName) {
  const target = cardName.replace(/^\d+x\s+/, '').trim().toLowerCase();
  if (!target) return null;
  
  const allKeys = await getAllCardNamesFromDB();
  let bestMatch = null;
  let bestScore = 0;
  let iterations = 0;
  
  for (const key of allKeys) {
    iterations++;
    if (iterations % 1000 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    const keyLower = key.toLowerCase();
    
    // Coincidencia exacta
    if (keyLower === target) {
      return key;
    }

    // Coincidencia de cara exacta (Aventura / MDFC)
    // Ejemplo: Si buscamos "Lightning Bolt" y la llave es "Emeritus of Conflict // Lightning Bolt"
    if (keyLower.includes(' // ')) {
      const faces = keyLower.split(' // ');
      if (faces[0] === target || faces[1] === target) {
        // En lugar de devolver la carta doble, ignoramos este match para que Scryfall
        // descargue e hidrate la versión pura de una sola cara (si existe).
        // A menos que realmente no haya otra, pero priorizaremos el fetch normal.
        continue;
      }
    }
    
    // Optimization: skip Levenshtein if length diff is too large
    if (Math.abs(target.length - keyLower.length) > Math.max(target.length, keyLower.length) * 0.2) {
      continue;
    }
    
    const score = getSimilarity(target, keyLower);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = key;
    }
  }
  
  if (bestScore >= 0.85) {
    console.log(`🎯 [Fuzzy Matcher] Auto-corregido: "${cardName}" -> "${bestMatch}" (Confianza: ${Math.round(bestScore * 100)}%)`);
    return bestMatch;
  }
  
  return null;
}

async function fetchCardFromScryfall(cardName) {
  let cleanName = cardName.replace(/^\d+x\s+/, '').trim();
  
  if (cleanName.includes('//')) {
    cleanName = cleanName.split('//')[0].trim();
  } else if (cleanName.includes('/')) {
    cleanName = cleanName.split('/')[0].trim();
  }
  
  const searchQuery = `!"${cleanName}" -is:ub -is:digital`; 
  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(searchQuery)}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

  try {
    let data;
    const response = await fetch(url, getFetchOptions(controller.signal));
    if (!response.ok) {
      const fallbackUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cleanName)}`;
      const fallbackResponse = await fetch(fallbackUrl, getFetchOptions(controller.signal));
      if (!fallbackResponse.ok) {
        clearTimeout(timeoutId);
        return null;
      }
      data = await fallbackResponse.json();
    } else {
      const json = await response.json();
      if (!json.data || json.data.length === 0) {
        clearTimeout(timeoutId);
        return null;
      }
      const exactMatch = json.data.find(c => c.name.toLowerCase() === cleanName.toLowerCase());
      data = exactMatch || json.data[0];
    }
    clearTimeout(timeoutId);
    
    const card = {
      id: data.id || `custom-${data.name.replace(/\s+/g, '-').toLowerCase()}`,
      name: data.name,
      type_line: data.type_line,
      rarity: data.rarity || 'common',
      oracle_text: data.oracle_text || '',
      mana_value: data.cmc || 0,
      mana_cost: data.mana_cost || data.card_faces?.[0]?.mana_cost || '',
      color_identity: data.color_identity || [],
      produced_mana: data.produced_mana || [],
      category: categorizeCard(data.type_line, data.oracle_text),
      legalities: data.legalities || {},
      prices: data.prices || {},
      card_faces: data.card_faces || null,
      image_uris: data.image_uris ? {
        normal: data.image_uris.normal,
        large: data.image_uris.large,
        small: data.image_uris.small
      } : data.card_faces?.[0]?.image_uris ? {
        normal: data.card_faces[0].image_uris.normal,
        large: data.card_faces[0].image_uris.large,
        small: data.card_faces[0].image_uris.small
      } : null,
      power: data.power ?? data.card_faces?.[0]?.power ?? '',
      toughness: data.toughness ?? data.card_faces?.[0]?.toughness ?? ''
    };
    
    await saveCardToDB(card);
    
    return card;
  } catch (error) {
    console.error(`Error fetching ${cardName}:`, error);
    return null;
  }
}

export function isLegalInLegacy(card, format = 'MODERN') {
  if (!card.legalities) return true; // Default to true if not available
  const key = format.toLowerCase();
  return card.legalities[key] === 'legal';
}

function categorizeCard(typeLine, oracleText = '') {
  const type = (typeLine || '').toLowerCase();
  
  if (type.includes('land') || type.includes('basic land')) return 'Land';
  if (type.includes('creature')) return 'Creature';
  if (type.includes('instant')) return 'Instant';
  if (type.includes('sorcery')) return 'Sorcery';
  if (type.includes('enchantment')) return 'Enchantment';
  if (type.includes('artifact')) return 'Artifact';
  if (type.includes('planeswalker')) return 'Planeswalker';
  
  return 'Creature';
}

const ISLAND_FALLBACK = {
  name: "Island",
  type_line: "Basic Land — Island",
  rarity: "common",
  oracle_text: "({T}: Add {U}.)",
  mana_value: 0,
  mana_cost: "",
  color_identity: ["U"],
  produced_mana: ["U"],
  category: "Land",
  legalities: { modern: "legal" },
  prices: { usd: "0.05" },
  image_uris: {
    normal: "https://cards.scryfall.io/normal/front/1/2/12f2c1ff-b8dc-4c49-be72-132d78dfbc49.jpg",
    large: "https://cards.scryfall.io/large/front/1/2/12f2c1ff-b8dc-4c49-be72-132d78dfbc49.jpg",
    small: "https://cards.scryfall.io/small/front/1/2/12f2c1ff-b8dc-4c49-be72-132d78dfbc49.jpg"
  }
};

export async function hydrateCard(card, rarityMode = 'high-power') {
  const { name, quantity = 4 } = card;
  
  let hydrated = await getCardFromDB(name);
  
  const isCreature = hydrated && (hydrated.type_line || '').toLowerCase().includes('creature');
  const isMissingAttributes = isCreature && (hydrated.power === undefined || hydrated.power === '');
  
  if (!hydrated || isMissingAttributes) {
    if (!hydrated) {
      // Intentar buscar coincidencia difusa en IndexedDB
      const fuzzyName = await findFuzzyMatchInDB(name);
      if (fuzzyName && fuzzyName !== name) {
        hydrated = await getCardFromDB(fuzzyName);
        if (hydrated) {
          console.log(`🎯 Coincidencia difusa encontrada en IndexedDB: "${name}" -> "${fuzzyName}"`);
        }
      }
    }
    
    // Check again if still missing attributes
    const stillMissing = !hydrated || (hydrated && (hydrated.type_line || '').toLowerCase().includes('creature') && (hydrated.power === undefined || hydrated.power === ''));
    if (stillMissing) {
      console.log(`🔍 No cache o incompleta: ${name}, buscando/actualizando en Scryfall...`);
      hydrated = await fetchCardFromScryfall(name);
    }
  } else {
    console.log(`✅ Cache hit: ${name}`);
  }
  
  if (!hydrated) {
    return {
      name,
      quantity,
      mana_value: card.mana_value || 0,
      type_line: card.type_line || 'Unknown',
      category: card.category || 'Creature',
      image_uris: { normal: '' }
    };
  }

  // Lógica de veto por rareza
  if (rarityMode === 'pauper' && hydrated.rarity !== 'common') {
    console.warn(`⚠️ Veto de Rareza (Pauper): "${hydrated.name}" es de rareza "${hydrated.rarity}" y ha sido reemplazada por "Island".`);
    return {
      ...ISLAND_FALLBACK,
      quantity
    };
  }
  
  if (rarityMode === 'artisan' && hydrated.rarity !== 'common' && hydrated.rarity !== 'uncommon') {
    console.warn(`⚠️ Veto de Rareza (Artisan): "${hydrated.name}" es de rareza "${hydrated.rarity}" y ha sido reemplazada por "Island".`);
    return {
      ...ISLAND_FALLBACK,
      quantity
    };
  }
  
  return {
    ...hydrated,
    quantity
  };
}

export async function hydrateDeckCards(cards, rarityModeOrProgress, onProgressCb) {
  let rarityMode = 'high-power';
  let onProgress = onProgressCb;
  
  if (typeof rarityModeOrProgress === 'function') {
    onProgress = rarityModeOrProgress;
  } else if (typeof rarityModeOrProgress === 'string') {
    rarityMode = rarityModeOrProgress;
  }

  console.log(`🚀 Hidratando ${cards.length} cartas con control de tasa de Scryfall...`);
  
  const hydrated = [];
  let current = 0;
  for (const card of cards) {
    current++;
    if (onProgress) onProgress(current, cards.length);

    const cached = await getCardFromDB(card.name);
    let isCached = !!cached;
    
    if (!isCached) {
      const fuzzyName = await findFuzzyMatchInDB(card.name);
      if (fuzzyName) {
        const fuzzyCached = await getCardFromDB(fuzzyName);
        if (fuzzyCached) {
          isCached = true;
          card.name = fuzzyName; // Auto-corregimos el nombre del mazo para usar el de caché
        }
      }
    }
    
    if (!isCached) {
      // Si no está en caché local, espaciamos la petición 100ms para cumplir con el rate limit de Scryfall de manera conservadora
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const result = await hydrateCard(card, rarityMode);
    hydrated.push(result);
  }
  
  console.log(`✅ ${hydrated.length} cartas hidratadas exitosamente`);
  return hydrated;
}

export const SEMANTIC_TAG_MAP = {
  "removal": "function:removal",
  "sweeper": "oracletag:board-wipe",
  "board wipe": "oracletag:board-wipe",
  "draw": "oracletag:draw",
  "card advantage": "oracletag:draw",
  "ramp": "oracletag:ramp",
  "counter": "function:counterspell",
  "counterspell": "function:counterspell",
  "burn": "function:burn",
  "discard": "function:discard",
  "reanimate": "function:reanimate",
  "tutor": "function:tutor",
  "protection": "function:protection",
  // Blink / Flicker
  "blink": "oracletag:blink",
  "flicker": "oracletag:blink",
  "etb": "oracletag:etb",
  "enters the battlefield": "oracletag:etb",
  // Cantrip
  "cantrip": "oracletag:cantrip",
  "filter": "oracletag:cantrip",
  // Tokens
  "tokens": "oracletag:token-generator",
  "token generator": "oracletag:token-generator",
  "token-generator": "oracletag:token-generator",
  // Lords
  "lord": "oracletag:lord",
  "anthem": "oracletag:lord",
  // Sacrificio
  "sac outlet": "oracletag:sacrifice-outlet",
  "sacrifice outlet": "oracletag:sacrifice-outlet",
  "sac-outlet": "oracletag:sacrifice-outlet",
  // Reanimador
  "reanimate target": "oracletag:reanimation-target",
  "reanimation target": "oracletag:reanimation-target",
  // Landfall
  "landfall": "oracletag:landfall",
  "land synergy": "oracletag:landfall",
  // Habilidades de Combate
  "haste": "keyword:haste",
  "trample": "keyword:trample",
  "lifelink": "keyword:lifelink",
  "flying": "keyword:flying",
  "deathtouch": "keyword:deathtouch",
  "hexproof": "keyword:hexproof",
  "indestructible": "keyword:indestructible",
  "menace": "keyword:menace",
  "vigilance": "keyword:vigilance",
  // Mecánicas de Reducción/Mágicas
  "affinity": "oracletag:affinity",
  "delve": "keyword:delve",
  "convoke": "keyword:convoke",
  "cascade": "keyword:cascade",
  "proliferate": "keyword:proliferate",
  "+1/+1 counter": "oracletag:counter-synergy",
  "graveyard-synergy": "oracletag:graveyard-synergy",
  "spellslinger-synergy": "oracletag:spellslinger-synergy",
  "historic": "oracletag:historic",
  "metalcraft": "oracletag:metalcraft",
  "ninjutsu": "keyword:ninjutsu",
  // Nuevos tags de la Mejora 1
  "storm": "oracletag:storm",
  "storm count": "oracletag:storm",
  "cost reducer": "oracletag:cost-reducer",
  "mana dork": "oracletag:mana-dork",
  "value engine": "oracletag:value-engine",
  "graveyard filler": "oracletag:graveyard-filler",
  "self-mill": "oracletag:self-mill",
  "hate bear": "oracletag:hate-bear",
  "tempo play": "oracletag:tempo",
  "evasion": "oracletag:evasion",
  "wrath effect": "oracletag:wrath",
  "blink target": "oracletag:blink-target",
  "etb trigger": "oracletag:etb",
  "dies trigger": "oracletag:dies-trigger",
  "combat trick": "oracletag:combat-trick",
  "fog effect": "oracletag:fog",
  "counterspell": "oracletag:counterspell",
  "hand disruption": "oracletag:hand-disruption",
  "land destruction": "oracletag:land-destruction",
  "stax piece": "oracletag:stax",
  "combo piece": "oracletag:combo-piece"
};

export async function buscarCartasEnBibliotecaTool(args) {
  const { colors, query, type_line, max_cmc, format } = args;
  console.log(`🔌 [Tool] buscar_cartas_en_biblioteca_tool solicitada con:`, args);

  let mappedQuery = query;
  if (query) {
    const qLower = query.toLowerCase();
    for (const [key, tag] of Object.entries(SEMANTIC_TAG_MAP)) {
      if (qLower.includes(key)) {
        mappedQuery = tag;
        break;
      }
    }
  }

  // Construir la consulta de Scryfall
  let scryfallQuery = [];
  
  if (colors && colors.length > 0) {
    scryfallQuery.push(`id<=${colors.join('')}`);
  }
  
  if (type_line) {
    scryfallQuery.push(`t:${type_line}`);
  }
  
  if (max_cmc !== undefined) {
    scryfallQuery.push(`cmc<=${max_cmc}`);
  }
  
  if (mappedQuery) {
    scryfallQuery.push(mappedQuery);
  }
  
  if (format) {
    scryfallQuery.push(`f:${format.toLowerCase()}`);
  }
  
  scryfallQuery.push('-is:ub -is:digital');
  
  const searchUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(scryfallQuery.join(' '))}&order=edhrec`;
  console.log(`🔌 [Tool] Consultando Scryfall: ${searchUrl}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 sec timeout

  try {
    const response = await fetch(searchUrl, getFetchOptions(controller.signal));
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Scryfall HTTP error status: ${response.status}`);
    }
    
    const json = await response.json();
    const data = json.data || [];
    
    const results = [];
    for (let i = 0; i < Math.min(data.length, 15); i++) {
      const d = data[i];
      const card = {
        id: d.id || `custom-${d.name.replace(/\s+/g, '-').toLowerCase()}`,
        name: d.name,
        type_line: d.type_line,
        rarity: d.rarity || 'common',
        oracle_text: d.oracle_text || '',
        mana_value: d.cmc || 0,
        mana_cost: d.mana_cost || d.card_faces?.[0]?.mana_cost || '',
        color_identity: d.color_identity || [],
        produced_mana: d.produced_mana || [],
        category: categorizeCard(d.type_line, d.oracle_text),
        legalities: d.legalities || {},
        prices: d.prices || {},
        card_faces: d.card_faces || null,
        image_uris: d.image_uris ? {
          normal: d.image_uris.normal,
          large: d.image_uris.large,
          small: d.image_uris.small
        } : d.card_faces?.[0]?.image_uris ? {
          normal: d.card_faces[0].image_uris.normal,
          large: d.card_faces[0].image_uris.large,
          small: d.card_faces[0].image_uris.small
        } : null
      };
      
      // Guardar en la caché local IndexedDB
      await saveCardToDB(card);
      
      results.push({
        name: card.name,
        mana_cost: card.mana_cost,
        type_line: card.type_line,
        oracle_text: card.oracle_text
      });
    }
    
    return { results, message: `Se encontraron ${data.length} cartas. Devolviendo las 15 mejores.` };
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`🔌 [Tool] Scryfall falló (error/timeout). Iniciando paracaídas de búsqueda local offline...`);
    
    try {
      const allCards = await getAllCards();
      const formatKey = format ? format.toLowerCase() : 'modern';
      
      // Filtrar localmente en base a los criterios
      let localResults = allCards
        .filter(c => {
          // Filtro de legalidad
          if (c.legalities && c.legalities[formatKey] !== 'legal') return false;
          
          // Filtro de colores (si se especifican)
          if (colors && colors.length > 0) {
            const cardColors = c.colors || [];
            // Debe pertenecer a la identidad de color permitida
            const isColorLegal = cardColors.every(col => colors.includes(col));
            if (!isColorLegal) return false;
          }
          
          // Filtro de tipo de carta
          if (type_line) {
            const tLineLower = type_line.toLowerCase();
            const cardTypeLower = (c.type_line || '').toLowerCase();
            if (!cardTypeLower.includes(tLineLower)) return false;
          }
          
          // Filtro de CMC
          if (max_cmc !== undefined) {
            const val = c.mana_value !== undefined ? c.mana_value : 3;
            if (val > max_cmc) return false;
          }
          
          // Excluir custom cards en formatos estándar si aplica
          if (['modern', 'pioneer', 'standard', 'legacy'].includes(formatKey)) {
            const nameLower = (c.name || '').toLowerCase();
            if (c.id && (c.id.startsWith('custom-') || c.id.includes('custom'))) return false;
            if (nameLower.includes("hamato") || nameLower.includes("shredder") || nameLower.includes("yoshi") || nameLower.includes("oroku saki") || nameLower.includes("splinter, ")) {
              return false;
            }
          }
          
          // Filtro semántico por query
          if (query) {
            const qLower = query.toLowerCase();
            const nameLower = (c.name || '').toLowerCase();
            const oracleLower = (c.oracle_text || '').toLowerCase();
            const typeLower = (c.type_line || '').toLowerCase();
            const combinedText = `${nameLower} | ${typeLower} | ${oracleLower}`;
            
            // Si hay un mapping exacto para tags del Tagger, buscar los términos clave correspondientes en el oracle text/tipo
            const tagKeyWords = {
              "removal": ["destroy", "exile", "deals", "damage to target", "damage to any target"],
              "sweeper": ["destroy all", "exile all", "damage to each creature", "all creatures"],
              "board wipe": ["destroy all", "exile all", "damage to each creature", "all creatures"],
              "draw": ["draw a card", "draw cards", "draws a card"],
              "card advantage": ["draw a card", "draw cards", "draws a card", "look at the top"],
              "ramp": ["search your library for a land", "search your library for a basic land", "put onto the battlefield", "add "],
              "counter": ["counter target"],
              "counterspell": ["counter target"],
              "burn": ["deals", "damage to any target", "damage to target player"],
              "discard": ["discard", "discards"],
              "reanimate": ["return target", "card from your graveyard to the battlefield", "graveyard to the battlefield"],
              "tutor": ["search your library", "tutor"],
              "protection": ["gain protection", "gains protection", "hexproof", "shroud", "prevent all damage", "indestructible"],
              "blink": ["exile target", "then return", "battlefield under", "flicker"],
              "flicker": ["exile target", "then return", "battlefield under", "flicker"],
              "etb": ["enters the battlefield"],
              "tokens": ["create", "token"],
              "lord": ["creatures you control get", "other creatures you control get", "anthem"],
              "sac outlet": ["sacrifice a", "sacrifice another"],
              "landfall": ["landfall", "land enters the battlefield"]
            };
            
            // Buscar si coincide con el término literal o con las palabras clave de su tag
            let isMatch = nameLower.includes(qLower) || oracleLower.includes(qLower);
            if (!isMatch) {
              // Buscar en la lista de keywords del tag
              for (const [key, keywords] of Object.entries(tagKeyWords)) {
                if (qLower.includes(key)) {
                  if (keywords.some(kw => oracleLower.includes(kw))) {
                    isMatch = true;
                    break;
                  }
                }
              }
            }
            if (!isMatch) return false;
          }
          
          return true;
        })
        .slice(0, 15)
        .map(c => ({
          name: c.name,
          mana_cost: c.mana_cost || '',
          type_line: c.type_line || '',
          oracle_text: c.oracle_text || ''
        }));
        
      console.log(`🔌 [Tool Fallback] Se encontraron ${localResults.length} cartas en la base de datos local.`);
      return { results: localResults, message: `Scryfall offline/timeout. Devolviendo ${localResults.length} cartas de la base de datos local.` };
    } catch (fallbackErr) {
      console.error(`🔌 [Tool Fallback] Error crítico en el paracaídas local offline:`, fallbackErr);
      return { results: [], message: `Error crítico en la búsqueda local: ${fallbackErr.message}` };
    }
  }
}