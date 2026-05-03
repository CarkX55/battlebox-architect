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
        <h2 className="text-4xl font-cinzel text-grimorio-gold mb-2">📦 Archivo de Mazos</h2>
        <p className="text-grimorio-parchment/60">
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
                "bg-gradient-to-b from-[#2a2318] to-black border-2 rounded-xl p-6 shadow-xl relative group transition-all",
                selectedDecks.includes(deck.id) ? "border-grimorio-gold shadow-[0_0_20px_rgba(193,155,69,0.3)]" : "border-grimorio-gold/30"
              )}
            >
              <div 
                onClick={() => toggleDeckSelection(deck.id)}
                className={cn(
                  "absolute -top-3 -right-3 w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-pointer z-10 transition-all",
                  selectedDecks.includes(deck.id) 
                    ? "bg-grimorio-gold border-grimorio-dark text-grimorio-dark scale-110" 
                    : "bg-grimorio-dark border-grimorio-gold/30 text-grimorio-gold/20"
                )}
              >
                {selectedDecks.includes(deck.id) ? '✓' : ''}
              </div>

              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-cinzel text-grimorio-gold">{deck.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] px-2 py-0.5 bg-grimorio-gold/20 text-grimorio-gold border border-grimorio-gold/30 rounded uppercase font-bold">
                      {deck.format}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-white/10 text-grimorio-parchment border border-white/20 rounded uppercase font-bold">
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
                <p className="text-sm text-grimorio-parchment/70 italic mb-4 line-clamp-3 font-serif">
                  "{deck.lore}"
                </p>
              )}

              <div className="flex justify-between items-end">
                <div className="flex gap-1">
                  {deck.colors?.map(c => (
                    <ManaOrb key={c} color={c} size="w-5 h-5" />
                  ))}
                </div>
                <div className="text-xs text-grimorio-gold/40">
                  {new Date(deck.timestamp).toLocaleDateString()}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-grimorio-gold/10 flex gap-3">
                <button 
                  className="flex-1 py-2 bg-grimorio-gold/10 hover:bg-grimorio-gold/20 border border-grimorio-gold/30 rounded text-grimorio-gold text-xs font-bold uppercase transition-all"
                  onClick={() => {
                    setActiveDeck(deck);
                    setCurrentView('BattleBox');
                  }}
                >
                  Ver Detalles
                </button>
                <button 
                  className="flex-1 py-2 bg-grimorio-gold/10 hover:bg-grimorio-gold/20 border border-grimorio-gold/30 rounded text-grimorio-gold text-xs font-bold uppercase transition-all"
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
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-grimorio-dark border-2 border-grimorio-gold p-4 rounded-2xl shadow-2xl z-50 flex items-center gap-6 min-w-[400px]"
          >
            <div className="flex-1">
              <p className="text-grimorio-gold font-cinzel text-sm">Sesión de Equilibrado</p>
              <p className="text-xs text-grimorio-parchment/60">{selectedDecks.length} mazos seleccionados</p>
            </div>
            <button 
              onClick={clearSelection}
              className="text-xs text-grimorio-parchment/40 hover:text-grimorio-parchment transition-colors"
            >
              Limpiar
            </button>
            <button 
              disabled={selectedDecks.length < 2}
              onClick={handleBalance}
              className="px-6 py-2 bg-grimorio-gold text-grimorio-dark rounded font-bold uppercase text-xs hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              ⚖️ Equilibrar con IA
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
