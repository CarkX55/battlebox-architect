import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

export default function CardSearch({ onAddCard }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const fullQuery = `${query} -is:universesbeyond`;
        const res = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(fullQuery)}`);
        const data = await res.json();
        if (data.data) {
          setResults(data.data); // Mostrar todos los resultados (Scryfall limita a ~175 por página)
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative w-full max-w-md mx-auto mb-8">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Buscar carta para añadir..."
          className="w-full px-4 py-3 bg-[#1a1612] border-2 border-grimorio-gold/30 rounded-lg 
                     text-grimorio-parchment focus:border-grimorio-gold focus:outline-none
                     transition-all shadow-inner"
        />
        {loading && (
          <div className="absolute right-3 top-3 animate-spin text-grimorio-gold">⌛</div>
        )}
      </div>

      <AnimatePresence>
        {results.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onMouseLeave={() => setHoveredCard(null)}
              className="absolute z-[100] w-full mt-2 bg-[#1a1612] border-2 border-grimorio-gold/50 rounded-lg shadow-2xl overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-grimorio-gold/30"
            >
              {results.map(card => (
                <div
                  key={card.id}
                  onMouseEnter={() => setHoveredCard(card)}
                  onClick={() => {
                    onAddCard(card);
                    setQuery('');
                    setResults([]);
                    setHoveredCard(null);
                  }}
                  className="group relative flex items-center gap-3 p-3 hover:bg-grimorio-gold/10 cursor-pointer border-b border-grimorio-gold/10 last:border-0"
                >
                  <div className="w-10 h-14 bg-gray-800 rounded overflow-hidden flex-shrink-0 border border-white/5">
                    <img 
                      src={card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small} 
                      alt={card.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-grimorio-parchment font-medium truncate group-hover:text-white transition-colors">{card.name}</p>
                    <p className="text-[10px] text-grimorio-parchment/50 truncate uppercase tracking-tighter">{card.type_line}</p>
                  </div>
                  <div className="text-grimorio-gold/40 group-hover:text-grimorio-gold font-bold text-xl transition-colors">+</div>
                </div>
              ))}
            </motion.div>

            {/* Vista Previa Fuera del Scroll (Portal-like) */}
            <AnimatePresence>
              {hoveredCard && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="fixed pointer-events-none z-[120]"
                  style={{
                    left: 'calc(50% + 240px)', // Ajustado para estar al lado del buscador
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                >
                  <div className="relative w-72 shadow-[0_0_60px_rgba(0,0,0,0.9)] rounded-[4.5%] overflow-hidden border-2 border-grimorio-gold/30 bg-[#1a1612]">
                    <img 
                      src={hoveredCard.image_uris?.normal || hoveredCard.card_faces?.[0]?.image_uris?.normal} 
                      alt={hoveredCard.name}
                      className="w-full h-auto block"
                    />
                    <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[4.5%]" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
