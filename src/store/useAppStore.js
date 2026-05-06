import { create } from 'zustand';

export const useAppStore = create((set) => ({
  currentView: 'Home',
  activeDeck: null,
  selectedDecks: [],
  isDbLoading: false,
  loadingProgress: 0,
  setCurrentView: (view) => set({ currentView: view }),
  setActiveDeck: (deck) => set({ activeDeck: deck }),
  setDbLoading: (loading) => set({ isDbLoading: loading }),
  setLoadingProgress: (progress) => set({ loadingProgress: progress }),
  toggleDeckSelection: (deckId) => set((state) => ({
    selectedDecks: state.selectedDecks.includes(deckId)
      ? state.selectedDecks.filter(id => id !== deckId)
      : [...state.selectedDecks, deckId]
  })),
  clearSelection: () => set({ selectedDecks: [] }),
}));