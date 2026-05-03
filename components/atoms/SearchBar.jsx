import { useState, useEffect, useRef } from 'react';
import { searchCards } from '../../services/dbIngestor';
import { isLegalInLegacy } from '../../services/cardHydrator';
import { cn } from '../../utils/cn';

const RARITY_COLORS = {
  mythic: 'text-red-400',
  rare: 'text-yellow-400',
  uncommon: 'text-white',
  common: 'text-gray-400',
};

function CardPreview({ card }) {
  const isLegacyLegal = isLegalInLegacy(card);
  
  return (
    <div className={cn(
      "w-full px-4 py-3 flex items-center gap-4 text-left hover:bg-grimorio-gold/10 transition-all border-b border-grimorio-gold/10 last:border-b-0 group",
      !isLegacyLegal && "opacity-70 grayscale-[0.5]"
    )}>
      <div className="relative w-14 h-20 rounded-lg overflow-hidden shadow-lg border-2 border-grimorio-gold/30 flex-shrink-0">
        {card.image_uris?.normal ? (
          <img src={card.image_uris.normal} alt={card.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-grimorio-gold/20 flex items-center justify-center">
            <span className="text-grimorio-gold text-xs">SIN IMAGEN</span>
          </div>
        )}
        {!isLegacyLegal && (
          <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center">
            <span className="text-white font-bold text-[10px] rotate-[-45deg] border border-white px-1">BANNED</span>
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-grimorio-parchment font-semibold text-lg truncate group-hover:text-grimorio-gold transition-colors">
            {card.name}
          </p>
          {!isLegacyLegal && (
            <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 font-bold uppercase tracking-tighter">
              Legacy Banned
            </span>
          )}
          {card.mana_value !== undefined && (
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-grimorio-gold/20 border border-grimorio-gold/50 flex items-center justify-center text-xs text-grimorio-gold font-bold">
              {card.mana_value}
            </span>
          )}
        </div>
        
        <p className="text-grimorio-gold/70 text-sm truncate font-serif italic">
          {card.type_line}
        </p>
        
        {card.oracle_text && (
          <p className="text-gray-400 text-xs truncate leading-relaxed">
            {card.oracle_text.substring(0, 80)}...
          </p>
        )}
        
        {card.colors?.length > 0 && (
          <div className="flex gap-1 mt-1">
            {card.colors.map((color) => (
              <span
                key={color}
                className={cn(
                  "w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center",
                  color === 'W' && "bg-white text-black",
                  color === 'U' && "bg-blue-500 text-white",
                  color === 'B' && "bg-black text-white",
                  color === 'R' && "bg-red-500 text-white",
                  color === 'G' && "bg-green-600 text-white"
                )}
              >
                {color}
              </span>
            ))}
          </div>
        )}
      </div>
      
      <div className={cn("text-xs uppercase tracking-wider font-bold", RARITY_COLORS[card.rarity] || 'text-gray-400')}>
        {card.rarity}
      </div>
    </div>
  );
}

export default function SearchBar({ onSelect, placeholder = 'Buscar en el Grimorio...' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const hits = await searchCards(query, 8);
        setResults(hits);
        setShowResults(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (card) => {
    if (onSelect) onSelect(card);
    setQuery(card.name);
    setShowResults(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          className="w-full px-5 py-4 bg-gradient-to-b from-grimorio-dark to-black 
                     border-2 border-grimorio-gold/40 rounded-xl 
                     text-grimorio-parchment text-lg placeholder-grimorio-gold/40
                     focus:outline-none focus:border-grimorio-gold focus:shadow-[0_0_20px_rgba(193,155,69,0.3)]
                     transition-all font-serif shadow-inner"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
          {isSearching ? (
            <div className="w-6 h-6 border-2 border-grimorio-gold/30 border-t-grimorio-gold rounded-full animate-spin" />
          ) : (
            <svg className="w-6 h-6 text-grimorio-gold/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-3 bg-gradient-to-b from-[#1a1612] to-black 
                    border-2 border-grimorio-gold/50 rounded-xl overflow-hidden shadow-2xl
                    animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="p-2 border-b border-grimorio-gold/20 bg-grimorio-gold/5">
            <p className="text-xs text-grimorio-gold/60 uppercase tracking-widest px-2">
              {results.length} resultados en el Grimorio
            </p>
          </div>
          
          <div className="max-h-[400px] overflow-y-autoscrollbar-thin scrollbar-thumb-grimorio-gold/30">
            {results.map((card) => (
              <button
                key={card.id}
                onClick={() => handleSelect(card)}
                className="w-full"
              >
                <CardPreview card={card} />
              </button>
            ))}
          </div>
          
          <div className="p-2 border-t border-grimorio-gold/20 bg-grimorio-gold/5 text-center">
            <p className="text-xs text-grimorio-gold/40">Presiona Enter para seleccionar • Esc para cerrar</p>
          </div>
        </div>
      )}

      {showResults && query && results.length === 0 && !isSearching && (
        <div className="absolute z-50 w-full mt-3 p-8 bg-grimorio-dark border-2 border-grimorio-gold/30 
                    rounded-xl text-center">
          <p className="text-grimorio-gold text-lg font-serif">📜 No se encontraron cartas</p>
          <p className="text-grimorio-parchment/50 text-sm mt-2">Intenta con otro nombre o término de búsqueda</p>
        </div>
      )}
    </div>
  );
}