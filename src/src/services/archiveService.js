const ARCHIVE_KEY = 'mtg_deck_archive';

export const archiveDeck = (deckData) => {
  try {
    const existing = localStorage.getItem(ARCHIVE_KEY);
    const archive = existing ? JSON.parse(existing) : [];
    
    const newEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...deckData
    };
    
    archive.unshift(newEntry); // Añadir al principio
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
    return true;
  } catch (error) {
    console.error('Error archiving deck:', error);
    return false;
  }
};

export const getArchivedDecks = () => {
  try {
    const existing = localStorage.getItem(ARCHIVE_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch (error) {
    console.error('Error fetching archive:', error);
    return [];
  }
};

export const deleteArchivedDeck = (id) => {
  try {
    const archive = getArchivedDecks();
    const filtered = archive.filter(d => d.id !== id);
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    return false;
  }
};

export const updateArchivedDeck = (id, updatedData) => {
  try {
    const archive = getArchivedDecks();
    const index = archive.findIndex(d => d.id === id);
    if (index === -1) return false;
    
    archive[index] = { 
      ...archive[index], 
      ...updatedData, 
      timestamp: new Date().toISOString() 
    };
    
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
    return true;
  } catch (error) {
    console.error('Error updating archive:', error);
    return false;
  }
};
