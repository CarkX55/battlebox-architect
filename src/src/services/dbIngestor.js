const DB_NAME = 'MagicGrimorioDB';
const DB_VERSION = 1;
const STORE_NAME = 'cards';
const INDEX_NAME = 'cardIndex';

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex(INDEX_NAME, 'name', { unique: false });
      }
    };
  });
}

function extractCardData(card) {
  return {
    id: card.id,
    name: card.name || '',
    mana_cost: card.mana_cost || '',
    type_line: card.type_line || '',
    oracle_text: card.oracle_text || '',
    colors: card.colors || [],
    color_identity: card.color_identity || [],
    mana_value: card.cmc ?? card.mana_value ?? 3,
    rarity: card.rarity || 'common',
    legalities: card.legalities || {},
    image_uris: card.image_uris || null,
  };
}

export async function ingestScryfallData(jsonFile, onProgress) {
  const database = await openDB();
  
  const CHUNK_SIZE = 5000;
  let offset = 0;
  let totalSaved = 0;
  
  while (offset < jsonFile.length) {
    const chunk = jsonFile.slice(offset, offset + CHUNK_SIZE);
    const extractedCards = chunk.map(extractCardData);
    
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    for (const card of extractedCards) {
      store.put(card);
    }
    
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    
    totalSaved += extractedCards.length;
    offset += CHUNK_SIZE;
    
    if (onProgress) {
      onProgress({
        processed: totalSaved,
        percentage: Math.round((totalSaved / jsonFile.length) * 100),
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  return { saved: totalSaved };
}

export async function searchCards(query, limit = 20) {
  const database = await openDB();
  const tx = database.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index(INDEX_NAME);
  
  const startTime = performance.now();
  const lowerQuery = query.toLowerCase();
  
  return new Promise((resolve, reject) => {
    const results = [];
    const request = index.openCursor();
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && results.length < limit * 3) {
        const name = cursor.value.name?.toLowerCase() || '';
        if (name.includes(lowerQuery)) {
          results.push(cursor.value);
        }
        cursor.continue();
      } else {
        const latency = performance.now() - startTime;
        console.log(`⚡ [IDB Search] "${query}" → ${results.length} resultados en ${latency.toFixed(2)}ms`);
        
        if (results.length > 0) {
          const sample = results[0];
          console.log('📜 [Carta ejemplo]');
          console.log('  name:', sample.name);
          console.log('  oracle_text:', sample.oracle_text?.substring(0, 80) + '...');
          console.log('  colors:', sample.colors);
          console.log('  color_identity:', sample.color_identity);
          console.log('  mana_value:', sample.mana_value);
        }
        
        resolve(results.slice(0, limit));
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getCardCount() {
  const database = await openDB();
  const tx = database.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  
  return new Promise((resolve, reject) => {
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}