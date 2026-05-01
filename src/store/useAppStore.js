import { create } from 'zustand';

export const useAppStore = create((set) => ({
  currentView: 'Home',
  activeDeck: null,
  selectedDecks: [],
  setCurrentView: (view) => set({ currentView: view }),
  setActiveDeck: (deck) => set({ activeDeck: deck }),
  toggleDeckSelection: (deckId) => set((state) => ({
    selectedDecks: state.selectedDecks.includes(deckId)
      ? state.selectedDecks.filter(id => id !== deckId)
      : [...state.selectedDecks, deckId]
  })),
  clearSelection: () => set({ selectedDecks: [] }),
}));