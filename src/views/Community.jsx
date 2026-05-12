import { useState, useEffect } from 'react';
import { getCommunityDecks } from '../services/archiveService';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { useAppStore } from '../store/useAppStore';
import ManaOrb from '../components/atoms/ManaOrb';

export default function Community() {
  const { setCurrentView, setActiveDeck } = useAppStore();
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDecks = async () => {
      setLoading(true);
      const communityDecks = await getCommunityDecks();
      setDecks(communityDecks);
      setLoading(false);
    };
    fetchDecks();
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-cinzel text-magic-gold mb-2 flex items-center justify-center gap-4">
          <img src="/ASSETS/iconoDeck.webp" alt="Comunidad" className="w-16 h-16 object-contain drop-shadow-[0_0_20px_rgba(34,197,94,0.4)]" />
          Comunidad de Forjadores
        </h2>
        <p className="text-[#f4ece0]/80 font-medium">
          Explora, copia y domina los mazos creados por la comunidad global
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-magic-gold"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence>
            {decks.map((deck) => (
              <motion.div
                key={deck.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="frosted-panel p-6 relative group border-[#22c55e]/40 hover:border-[#4ade80]/60 transition-all duration-300 hover:shadow-[0_0_50px_rgba(34,197,94,0.3)] bg-black/70 backdrop-blur-xl overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-cinzel text-magic-gold flex items-center gap-3">
                      {deck.name}
                    </h3>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[10px] px-2 py-0.5 bg-[#22c55e]/30 text-[#86efac] border border-[#4ade80]/50 rounded uppercase font-bold tracking-wider shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                        {deck.format || 'Legacy Battle Box (Casual)'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-magic-gold/10 text-magic-gold border border-magic-gold/30 rounded uppercase font-bold tracking-wider">
                        {deck.archetype}
                      </span>
                    </div>
                  </div>
                </div>

                {deck.lore && (
                  <p className="text-[15px] text-white/95 italic mb-6 line-clamp-3 font-serif leading-relaxed drop-shadow-sm border-l-2 border-[#4ade80]/40 pl-4">
                    "{deck.lore}"
                  </p>
                )}

                <div className="flex justify-between items-end">
                  <div className="flex gap-1">
                    {deck.colors?.map(c => (
                      <ManaOrb key={c} color={c} size="w-8 h-8" />
                    ))}
                  </div>
                  <div className="text-[10px] text-[#4ade80] font-bold tracking-tighter uppercase drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]">
                    {new Date(deck.timestamp).toLocaleDateString()}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex gap-3">
                  <button 
                    className="flex-1 py-2.5 btn-stone-secondary text-[#4ade80] hover:text-[#86efac] border-[#22c55e]/30 hover:border-[#4ade80]/60 transition-all shadow-[inset_0_0_20px_rgba(34,197,94,0.1)]"
                    onClick={() => {
                      setActiveDeck(deck);
                      setCurrentView('BattleBox');
                    }}
                  >
                    Examinar Mazo
                  </button>
                  <button 
                    className="flex-1 py-2.5 btn-stone-secondary hover:border-white/40 transition-all"
                    onClick={() => {
                      const text = deck.cards.map(c => `${c.count} ${c.name}`).join('\n');
                      navigator.clipboard.writeText(text);
                      alert('Lista copiada al portapapeles');
                    }}
                  >
                    Copiar Lista
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {decks.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-[#4ade80]/30 rounded-xl bg-black/70 backdrop-blur-xl frosted-panel shadow-[0_0_30px_rgba(34,197,94,0.1)]">
              <p className="text-[#4ade80] font-serif text-xl drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]">Aún no hay grimorios en la comunidad...</p>
              <p className="text-white/40 text-sm mt-2">Sé el primero en forjar un mazo y subirlo a la nube usando el botón "☁️ Nube".</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}