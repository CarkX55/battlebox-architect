import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { BATTLEBOX_BANLIST, COLORS } from '../../constants/legacyBattleBox';
import { Search, Filter, ShieldAlert, Swords, Zap, Scroll, Book, Box, Gem, Map, X, Plus, Check, RefreshCw } from 'lucide-react';

export default function CardSearch({ onAddCard }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [addedAnimation, setAddedAnimation] = useState(null); // ID de la carta añadida recientemente
  const [flipStates, setFlipStates] = useState({}); // { cardId: 0 o 1 }
  
  // Filtros Avanzados
  const [isModernOnly, setIsModernOnly] = useState(true);
  const [selectedType, setSelectedType] = useState(''); // creature, instant, sorcery, etc.
  const [selectedColors, setSelectedColors] = useState([]); // W, U, B, R, G, C
  const [showFilters, setShowFilters] = useState(false);

  const cardTypes = [
    { id: 'creature', icon: <Swords size={14} />, label: 'Criatura' },
    { id: 'instant', icon: <Zap size={14} />, label: 'Instantáneo' },
    { id: 'sorcery', icon: <Scroll size={14} />, label: 'Conjuro' },
    { id: 'enchantment', icon: <Book size={14} />, label: 'Encantamiento' },
    { id: 'artifact', icon: <Box size={14} />, label: 'Artefacto' },
    { id: 'planeswalker', icon: <Gem size={14} />, label: 'Planeswalker' },
    { id: 'land', icon: <Map size={14} />, label: 'Tierra' },
  ];

  const handleAddFast = (e, card) => {
    e.stopPropagation();
    onAddCard(card);
    setAddedAnimation(card.id);
    setTimeout(() => setAddedAnimation(null), 1000);
  };

  const toggleFlip = (e, cardId) => {
    e.stopPropagation();
    setFlipStates(prev => ({
      ...prev,
      [cardId]: prev[cardId] === 1 ? 0 : 1
    }));
  };

  const toggleColor = (colorId) => {
    setSelectedColors(prev => 
      prev.includes(colorId) 
        ? prev.filter(c => c !== colorId) 
        : [...prev, colorId]
    );
  };

  useEffect(() => {
    if (query.length < 3 && !selectedType && selectedColors.length === 0) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        let scryfallQuery = query || '';
        
        if (isModernOnly) scryfallQuery += ' f:modern';
        if (selectedType) scryfallQuery += ` t:${selectedType}`;
        
        if (selectedColors.length > 0) {
          const colorsQuery = selectedColors.join('').toLowerCase();
          // Usamos identity para que busque cartas que entren en esos colores (ideal para Commander/BattleBox)
          // o color (c:) para búsqueda exacta. Usaremos c: para ser más precisos con lo que pide el usuario.
          scryfallQuery += ` c:${colorsQuery}`;
        }
        
        // Excluir universos más allá por defecto para mantener estética MTG pura
        scryfallQuery += ' -is:universesbeyond';

        const res = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(scryfallQuery)}`);
        const data = await res.json();
        if (data.data) {
          setResults(data.data.slice(0, 50)); // Limitamos a 50 para rendimiento
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, isModernOnly, selectedType, selectedColors]);

  const isBanned = (cardName) => BATTLEBOX_BANLIST.includes(cardName);
  
  const isUnsportsmanlike = (card) => {
    const text = (card.oracle_text || "").toLowerCase();
    return text.includes("infect") || 
           text.includes("annihilator") || 
           text.includes("win the game") || 
           text.includes("life total becomes") ||
           text.includes("poison counter");
  };

  return (
    <div className="relative w-full max-w-lg mx-auto mb-12">
      {/* Barra de Búsqueda Estilo Grimorio */}
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-magic-gold/40 group-focus-within:text-magic-gold transition-colors">
          <Search size={20} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Invocar carta por nombre..."
          className="w-full pl-12 pr-12 py-4 bg-black/60 border-2 border-magic-gold/20 rounded-2xl 
                     text-magic-gold placeholder:text-magic-gold/30 focus:border-magic-gold/50 focus:outline-none
                     transition-all shadow-[0_0_20px_rgba(0,0,0,0.4)] backdrop-blur-md"
        />
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all",
            showFilters ? "bg-magic-gold text-black shadow-[0_0_15px_rgba(193,155,69,0.5)]" : "text-magic-gold/40 hover:text-magic-gold hover:bg-white/5"
          )}
        >
          <Filter size={18} />
        </button>
        {loading && (
          <div className="absolute right-14 top-1/2 -translate-y-1/2 animate-spin text-magic-gold">
            <Zap size={16} />
          </div>
        )}
      </div>

      {/* Panel de Filtros Rápidos */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3"
          >
            <div className="p-5 bg-black/60 border border-magic-gold/20 rounded-2xl backdrop-blur-xl shadow-2xl flex flex-col gap-5">
              {/* Filtro de Colores */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <span className="text-[10px] font-bold text-magic-gold/40 uppercase tracking-widest">Sintonía de Maná</span>
                <div className="flex gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color.id}
                      onClick={() => toggleColor(color.id)}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all duration-300 relative group overflow-hidden",
                        selectedColors.includes(color.id) 
                          ? "border-magic-gold scale-110 shadow-[0_0_15px_rgba(193,155,69,0.4)]" 
                          : "border-transparent grayscale opacity-40 hover:grayscale-0 hover:opacity-100"
                      )}
                    >
                      <img src={color.icon} alt={color.name} className="w-full h-full object-cover" />
                      {selectedColors.includes(color.id) && (
                        <div className="absolute inset-0 bg-magic-gold/10" />
                      )}
                    </button>
                  ))}
                  {selectedColors.length > 0 && (
                    <button 
                      onClick={() => setSelectedColors([])}
                      className="ml-2 text-red-400/50 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {cardTypes.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(selectedType === type.id ? '' : type.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border",
                        selectedType === type.id 
                          ? "bg-magic-gold text-black border-magic-gold shadow-[0_0_10px_rgba(193,155,69,0.3)]" 
                          : "bg-white/5 text-magic-gold/60 border-white/10 hover:border-magic-gold/30"
                      )}
                    >
                      {type.icon}
                      {type.label}
                    </button>
                  ))}
                </div>
                
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div 
                    onClick={() => setIsModernOnly(!isModernOnly)}
                    className={cn(
                      "w-10 h-5 rounded-full relative transition-all duration-300",
                      isModernOnly ? "bg-green-500/40 border-green-500/50" : "bg-gray-800 border-gray-700"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-3 h-3 rounded-full transition-all duration-300",
                      isModernOnly ? "left-6 bg-green-400" : "left-1 bg-gray-500"
                    )} />
                  </div>
                  <span className="text-[10px] font-bold text-magic-gold/60 uppercase tracking-widest group-hover:text-magic-gold transition-colors">
                    Solo Modern
                  </span>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resultados con Detección de Banlist */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onMouseLeave={() => setHoveredCard(null)}
            className="absolute z-[100] w-full mt-4 bg-[#0a0a0c]/95 border-2 border-magic-gold/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-y-auto max-h-[450px] backdrop-blur-xl scrollbar-thin scrollbar-thumb-magic-gold/20"
          >
            {results.map(card => {
              const banned = isBanned(card.name);
              return (
                <div
                  key={card.id}
                  onMouseEnter={() => setHoveredCard(card)}
                  onClick={() => {
                    if (banned) return;
                    onAddCard(card);
                    setQuery('');
                    setResults([]);
                    setHoveredCard(null);
                  }}
                  className={cn(
                    "group relative flex items-center gap-4 p-4 transition-all border-b border-white/5 last:border-0",
                    banned ? "opacity-50 cursor-not-allowed bg-red-950/10" : "hover:bg-magic-gold/5 cursor-pointer"
                  )}
                >
                  <div className="w-12 h-16 bg-gray-900 rounded-lg overflow-hidden flex-shrink-0 border border-white/10 shadow-lg">
                    <img 
                      src={card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small} 
                      alt={card.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        "font-cinzel font-bold truncate transition-colors",
                        banned ? "text-red-400" : "text-magic-gold group-hover:text-white"
                      )}>
                        {card.name}
                      </p>
                      {banned && (
                        <span className="flex items-center gap-1 text-[8px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30 uppercase tracking-tighter">
                          <ShieldAlert size={10} /> Prohibida
                        </span>
                      )}
                      {!banned && isUnsportsmanlike(card) && (
                        <span className="flex items-center gap-1 text-[8px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-tighter" title="Esta carta tiene mecánicas que pueden no ser divertidas en juego casual">
                          <AlertTriangle size={10} /> Antideportiva
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-white/40 truncate italic">{card.type_line}</p>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex gap-2 items-center">
                    {/* Botón de Transformación (Giro) */}
                    {card.card_faces && (
                      <button
                        onClick={(e) => toggleFlip(e, card.id)}
                        className={cn(
                          "p-2 rounded-full transition-all duration-300 border border-magic-gold/20 text-magic-gold/40 hover:bg-magic-gold/10 hover:text-magic-gold hover:border-magic-gold/40",
                          flipStates[card.id] === 1 && "rotate-180 text-magic-gold border-magic-gold/60 bg-magic-gold/10"
                        )}
                        title="Ver otra cara"
                      >
                        <RefreshCw size={14} />
                      </button>
                    )}

                    {/* Botón de Añadido Rápido (+) */}
                    {!banned && (
                      <button
                        onClick={(e) => handleAddFast(e, card)}
                        className={cn(
                          "p-2 rounded-full transition-all duration-300 border",
                          addedAnimation === card.id
                            ? "bg-green-500/20 border-green-500/50 text-green-400 scale-110"
                            : "bg-white/5 border-white/10 text-magic-gold/40 hover:bg-magic-gold/20 hover:border-magic-gold/50 hover:text-magic-gold hover:scale-110"
                        )}
                      >
                        {addedAnimation === card.id ? <Check size={16} /> : <Plus size={16} />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vista Previa Epic-Style */}
      <AnimatePresence>
        {hoveredCard && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 20 }}
            className="fixed pointer-events-none z-[120] hidden xl:block"
            style={{
              left: 'calc(50% + 280px)',
              top: '50%',
              transform: 'translateY(-50%)'
            }}
          >
            <div className="relative w-80 shadow-[0_0_80px_rgba(0,0,0,1)] rounded-[4.7%] overflow-hidden border-2 border-magic-gold/50 bg-black">
              <img 
                src={
                  hoveredCard.card_faces 
                    ? hoveredCard.card_faces[flipStates[hoveredCard.id] || 0]?.image_uris?.normal 
                    : hoveredCard.image_uris?.normal
                } 
                alt={hoveredCard.name} 
                className="w-full h-auto block"
              />
              {isBanned(hoveredCard.name) && (
                <div className="absolute inset-0 bg-red-950/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center border-4 border-red-600/50">
                  <ShieldAlert size={60} className="text-red-500 mb-4 animate-pulse" />
                  <h3 className="font-cinzel text-2xl font-bold text-white mb-2 shadow-black text-shadow-lg">CARTA PROHIBIDA</h3>
                  <p className="text-red-200 text-xs font-bold uppercase tracking-widest">No permitida en Modern Casual</p>
                </div>
              )}
              {hoveredCard.card_faces && (
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-magic-gold/30 flex items-center gap-2">
                  <RefreshCw size={12} className={cn("text-magic-gold", flipStates[hoveredCard.id] === 1 && "rotate-180")} />
                  <span className="text-[10px] font-bold text-magic-gold uppercase tracking-tighter">
                    Cara {flipStates[hoveredCard.id] === 1 ? 'B' : 'A'}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

