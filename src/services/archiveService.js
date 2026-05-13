import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const ARCHIVE_KEY = 'mtg_deck_archive';

// Verifica si Firebase está configurado
const isFirebaseConfigured = () => !!import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== "tu_api_key";

// Archiva SOLAMENTE en local
export const archiveDeck = (deckData) => {
  try {
    const existing = localStorage.getItem(ARCHIVE_KEY);
    const archive = existing ? JSON.parse(existing) : [];
    
    const newEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...deckData
    };
    
    archive.unshift(newEntry);
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
    return true;
  } catch (error) {
    console.error('Error archiving deck locally:', error);
    return false;
  }
};

// Archiva SOLAMENTE en la nube (Comunidad)
export const archiveDeckOnline = async (deckData) => {
  try {
    if (!isFirebaseConfigured()) {
      console.warn("Firebase no está configurado. Revisa tu archivo .env");
      return false;
    }

    const newEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...deckData
    };

    await addDoc(collection(db, 'community_decks'), newEntry);
    return true;
  } catch (error) {
    console.error('Error uploading deck to cloud:', error);
    return false;
  }
};

export const getCommunityDecks = async () => {
  try {
    if (!isFirebaseConfigured()) return [];
    
    const q = query(collection(db, 'community_decks'), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    const decks = [];
    querySnapshot.forEach((doc) => {
      decks.push({ id: doc.id, ...doc.data() });
    });
    return decks;
  } catch (error) {
    console.error('Error fetching community decks:', error);
    return [];
  }
};

export const deleteCommunityDeck = async (id) => {
  try {
    if (!isFirebaseConfigured()) return false;
    await deleteDoc(doc(db, 'community_decks', id));
    return true;
  } catch (error) {
    console.error('Error deleting community deck:', error);
    return false;
  }
};


export const getArchivedDecks = () => {
  try {
    const existing = localStorage.getItem(ARCHIVE_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch (error) {
    console.error('Error fetching local archive:', error);
    return [];
  }
};

export const deleteArchivedDeck = (id) => {
  try {
    const archive = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]');
    const filtered = archive.filter(d => d.id !== id);
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting local archive:', error);
    return false;
  }
};

export const updateArchivedDeck = (id, updatedData) => {
  try {
    const archive = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]');
    const index = archive.findIndex(d => d.id === id);
    if (index !== -1) {
      archive[index] = { ...archive[index], ...updatedData, timestamp: new Date().toISOString() };
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
    }
    return true;
  } catch (error) {
    console.error('Error updating local archive:', error);
    return false;
  }
};
