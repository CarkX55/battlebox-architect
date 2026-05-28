const DB_NAME = 'MagicGrimorioDB';
const DB_VERSION = 1;
const STORE_NAME = 'cards';

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
    request.onsuccess = () => resolve(request.result || null);
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
  
  if (cleanName.includes('/') && !cleanName.includes('//')) {
    cleanName = cleanName.replace(/\s*\/\s*/g, ' // ');
  }
  
  const searchQuery = `!"${cleanName}" -is:ub -is:digital -is:split -is:adventure`; 
  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(searchQuery)}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

  try {
    let data;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      const fallbackUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cleanName)}`;
      const fallbackResponse = await fetch(fallbackUrl, { signal: controller.signal });
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
      } : null
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
  
  if (!hydrated) {
    console.log(`🔍 No cache: ${name}, buscando en Scryfall...`);
    hydrated = await fetchCardFromScryfall(name);
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