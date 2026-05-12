const DB_NAME = 'mtg_cards_db';
const DB_VERSION = 2;
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
      if (event.oldVersion < 1) {
        database.createObjectStore(STORE_NAME, { keyPath: 'name' });
      } else {
        // DB_VERSION incremented, delete old and recreate
        database.deleteObjectStore(STORE_NAME);
        database.createObjectStore(STORE_NAME, { keyPath: 'name' });
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
    const request = store.get(name);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function fetchCardFromScryfall(cardName) {
  let cleanName = cardName.replace(/^\d+x\s+/, '').trim();
  
  if (cleanName.includes('/') && !cleanName.includes('//')) {
    cleanName = cleanName.replace(/\s*\/\s*/g, ' // ');
  }
  
  const searchQuery = `!"${cleanName}" -is:ub -is:digital`;
  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(searchQuery)}`;
  
  try {
    let data;
    const response = await fetch(url);
    if (!response.ok) {
      const fallbackUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cleanName)}`;
      const fallbackResponse = await fetch(fallbackUrl);
      if (!fallbackResponse.ok) return null;
      data = await fallbackResponse.json();
    } else {
      const json = await response.json();
      if (!json.data || json.data.length === 0) return null;
      data = json.data[0];
    }
    
    const card = {
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
      image_uris: data.image_uris ? {
        normal: data.image_uris.normal,
        large: data.image_uris.large,
        small: data.image_uris.small
      } : data.card_faces?.[0]?.image_uris ? {
        normal: data.card_faces[0].image_uris.normal,
        large: data.card_faces[0].image_uris.large
      } : null
    };
    
    await saveCardToDB(card);
    
    return card;
  } catch (error) {
    console.error(`Error fetching ${cardName}:`, error);
    return null;
  }
}

export function isLegalInLegacy(card) {
  if (!card.legalities) return true; // Default to true if not available
  return card.legalities.legacy === 'legal';
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

export async function hydrateCard(card) {
  const { name, quantity = 4 } = card;
  
  let hydrated = await getCardFromDB(name);
  
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
  
  return {
    ...hydrated,
    quantity
  };
}

export async function hydrateDeckCards(cards) {
  console.log(`🚀 Hidratando ${cards.length} cartas en paralelo...`);
  
  // Procesar todas las cartas en paralelo para máxima velocidad
  const hydrated = await Promise.all(cards.map(card => hydrateCard(card)));
  
  console.log(`✅ ${hydrated.length} cartas hidratadas`);
  return hydrated;
}