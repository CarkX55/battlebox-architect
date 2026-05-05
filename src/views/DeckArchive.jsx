import { useState, useEffect } from 'react';
import { getArchivedDecks, deleteArchivedDeck } from '../services/archiveService';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { useAppStore } from '../store/useAppStore';
import ManaOrb from '../components/atoms/ManaOrb';

export default function DeckArchive() {
  const { setCurrentView, setActiveDeck, selectedDecks, toggleDeckSelection, clearSelection } = useAppStore();
  const [decks, setDecks] = useState([]);

  useEffect(() => {
    setDecks(getArchivedDecks());
  }, []);

  const handleBalance = () => {
    if (selectedDecks.length < 2) return;
    setCurrentView('BattleBox');
  };

  const handleDelete = (id) => {
    if (confirm('¿Seguro que quieres eliminar este mazo del archivo?')) {
      deleteArchivedDeck(id);
      setDecks(getArchivedDecks());
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-cinzel text-magic-gold mb-2 flex items-center justify-center gap-4">
          <img src="/ASSETS/TomoHome.png" alt="Tomo" className="w-20 h-20 object-contain drop-shadow-[0_0_20px_rgba(255,202,88,0.4)]" />
          Archivo de Mazos
        </h2>
        <p className="text-[#f4ece0]/80 font-medium">
          Mazos guardados para comparación y equilibrado con IA
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence>
          {decks.map((deck) => (
            <motion.div
              key={deck.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "frosted-panel p-6 relative group transition-all",
                selectedDecks.includes(deck.id) ? "border-[#ffca58] shadow-[0_0_30px_rgba(255,202,88,0.2)]" : "border-[#ffca58]/20"
              )}
            >
              <div 
                onClick={() => toggleDeckSelection(deck.id)}
                className={cn(
                  "absolute -top-2 -right-2 w-7 h-7 rounded-full border-2 flex items-center justify-center cursor-pointer z-20 transition-all",
                  selectedDecks.includes(deck.id) 
                    ? "bg-[#ffca58] border-black text-black scale-110 shadow-[0_0_15px_rgba(255,202,88,0.5)]" 
                    : "bg-black/60 border-[#ffca58]/30 text-[#ffca58]/20 hover:border-[#ffca58]/60"
                )}
              >
                {selectedDecks.includes(deck.id) ? (
                  <motion.span 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }}
                    className="text-xs font-bold"
                  >
                    ✓
                  </motion.span>
                ) : null}
              </div>

              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-cinzel text-magic-gold flex items-center gap-3">
                    <img src="/ASSETS/iconoDeck.png" alt="Deck Icon" className="w-9 h-9 object-contain" />
                    {deck.name}
                  </h3>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10px] px-2 py-0.5 bg-white/5 text-[#ffca58] border border-[#ffca58]/30 rounded uppercase font-bold tracking-wider">
                      {deck.format}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-white/5 text-[#f4ece0] border border-white/20 rounded uppercase font-bold tracking-wider">
                      {deck.archetype}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(deck.id)}
                  className="text-red-500/50 hover:text-red-500 transition-colors p-2"
                  title="Eliminar"
                >
                  🗑️
                </button>
              </div>

              {deck.lore && (
                <p className="text-sm text-[#f4ece0]/80 italic mb-4 line-clamp-3 font-serif leading-relaxed">
                  "{deck.lore}"
                </p>
              )}

              <div className="flex justify-between items-end">
                <div className="flex gap-1">
                  {deck.colors?.map(c => (
                    <ManaOrb key={c} color={c} size="w-8 h-8" />
                  ))}
                </div>
                <div className="text-[10px] text-[#f4ece0]/60 font-bold tracking-tighter uppercase">
                  {new Date(deck.timestamp).toLocaleDateString()}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex gap-3">
                <button 
                  className="flex-1 py-2.5 btn-stone-secondary"
                  onClick={() => {
                    setActiveDeck(deck);
                    setCurrentView('BattleBox');
                  }}
                >
                  Ver Detalles
                </button>
                <button 
                  className="flex-1 py-2.5 btn-stone-secondary"
                  onClick={() => alert('Copia la lista al portapapeles para la IA de razonamiento')}
                >
                  Copiar Lista
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {decks.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-grimorio-gold/20 rounded-xl">
            <p className="text-grimorio-gold/40 font-serif text-xl">El archivo está vacío...</p>
            <p className="text-grimorio-parchment/30 text-sm mt-2">Forja un mazo y usa el botón "Archivar" para guardarlo aquí.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedDecks.length > 0 && (
          <div className="fixed bottom-10 inset-x-0 z-50 pointer-events-none flex justify-center">
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="frosted-panel border-[#ffca58] p-5 shadow-[0_15px_50px_rgba(0,0,0,0.8)] flex items-center gap-8 pointer-events-auto min-w-[500px]"
            >
              <div className="flex items-center gap-4 border-r border-[#ffca58]/20 pr-8">
                <div className="w-10 h-10 bg-[#ffca58]/10 rounded-full flex items-center justify-center border border-[#ffca58]/20">
                  <span className="text-xl">⚖️</span>
                </div>
                <div>
                  <p className="text-[#ffca58] font-cinzel text-sm font-bold tracking-[0.2em] uppercase leading-none">Sesión de Equilibrado</p>
                  <p className="text-[10px] text-[#f4ece0]/40 font-medium mt-1">{selectedDecks.length} pergaminos seleccionados</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <button 
                  onClick={clearSelection}
                  className="text-[10px] font-cinzel text-white/30 hover:text-white uppercase tracking-widest transition-colors"
                >
                  Limpiar Selección
                </button>
                <button 
                  disabled={selectedDecks.length < 2}
                  onClick={handleBalance}
                  className={cn(
                    "px-8 py-3 rounded-lg font-cinzel font-black uppercase text-[11px] tracking-[0.2em] transition-all relative overflow-hidden group shadow-lg",
                    selectedDecks.length >= 2
                      ? "bg-[#ffca58] text-black hover:scale-105 shadow-[0_0_20px_rgba(255,202,88,0.3)]"
                      : "bg-white/5 text-white/20 border border-white/10"
                  )}
                >
                  {selectedDecks.length < 2 ? 'Selecciona 2+ Mazos' : 'Equilibrar con IA'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
