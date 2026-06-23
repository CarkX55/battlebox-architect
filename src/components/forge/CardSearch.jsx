import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { BATTLEBOX_VETOS, COLORS } from '../../constants/legacyBattleBox';
import { Search, Filter, ShieldAlert, Swords, Zap, Scroll, Book, Box, Gem, Map, X, Plus, Check, RefreshCw, AlertTriangle, HelpCircle } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { vibrateTouch } from '../../utils/haptic';
import BottomSheet from '../atoms/BottomSheet';
import MobileCardPreview from '../atoms/MobileCardPreview';

export default function CardSearch({ onAddCard }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [addedAnimation, setAddedAnimation] = useState(null); // ID de la carta añadida recientemente
  const [flipStates, setFlipStates] = useState({}); // { cardId: 0 o 1 }
  
  const isMobile = useIsMobile();
  const [selectedMobileCard, setSelectedMobileCard] = useState(null);
  
  // Filtros Avanzados
  const [isModernOnly, setIsModernOnly] = useState(true);
  const [selectedType, setSelectedType] = useState(''); // creature, instant, sorcery, etc.
  const [selectedColors, setSelectedColors] = useState([]); // W, U, B, R, G, C
  const [showFilters, setShowFilters] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedRarity, setSelectedRarity] = useState(''); // common, uncommon, rare, mythic
  const [selectedManaValue, setSelectedManaValue] = useState(''); // '', 0-6, 7+
  const [oracleQuery, setOracleQuery] = useState(''); // rules text

  const toggleFilters = () => {
    setShowFilters(!showFilters);
    if (!showFilters) setShowHelp(false);
  };

  const toggleHelp = () => {
    setShowHelp(!showHelp);
    if (!showHelp) setShowFilters(false);
  };

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
    // Si no hay texto de búsqueda largo y tampoco hay ningún filtro activo, limpiamos resultados.
    if (
      query.length < 3 && 
      !selectedType && 
      selectedColors.length === 0 && 
      !selectedRarity && 
      selectedManaValue === '' && 
      !oracleQuery
    ) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const queryParts = [];

        // Soporte de nombres en cualquier idioma (incluyendo español)
        if (query) {
          queryParts.push(`lang:any ${query}`);
        }
        
        if (isModernOnly) queryParts.push('f:modern');
        if (selectedType) queryParts.push(`t:${selectedType}`);
        
        if (selectedColors.length > 0) {
          const colorsQuery = selectedColors.join('').toLowerCase();
          queryParts.push(`c:${colorsQuery}`);
        }

        if (selectedRarity) {
          queryParts.push(`r:${selectedRarity}`);
        }

        if (selectedManaValue !== '') {
          if (selectedManaValue === '7+') {
            queryParts.push('mv>=7');
          } else {
            queryParts.push(`mv:${selectedManaValue}`);
          }
        }

        if (oracleQuery) {
          queryParts.push(`o:"${oracleQuery}"`);
        }
        
        // Excluir universos más allá por defecto para mantener estética MTG pura
        queryParts.push('-is:universesbeyond');

        const scryfallQuery = queryParts.join(' ');

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
  }, [query, isModernOnly, selectedType, selectedColors, selectedRarity, selectedManaValue, oracleQuery]);

  const isVetoed = (cardName) => BATTLEBOX_VETOS.includes(cardName);
  
  const isUnsportsmanlike = (card) => {
    const text = (card.oracle_text || "").toLowerCase();
    return text.includes("infect") || 
           text.includes("annihilator") || 
           text.includes("win the game") || 
           text.includes("life total becomes") ||
           text.includes("poison counter");
  };

  const renderFiltersContent = () => {
    return (
      <>
        {/* Filtro de Colores */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 flex-wrap gap-2">
          <span className="text-[10px] font-bold text-magic-gold/40 uppercase tracking-widest">Sintonía de Maná</span>
          <div className="flex gap-2">
            {COLORS.map(color => (
              <button
                key={color.id}
                type="button"
                onClick={() => {
                  vibrateTouch();
                  toggleColor(color.id);
                }}
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
                type="button"
                onClick={() => {
                  vibrateTouch();
                  setSelectedColors([]);
                }}
                className="ml-2 text-red-400/50 hover:text-red-400 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filtro de Rarezas */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 flex-wrap gap-2">
          <span className="text-[10px] font-bold text-magic-gold/40 uppercase tracking-widest">Rareza</span>
          <div className="flex gap-2">
            {[
              { 
                id: 'common', 
                label: 'C', 
                fullName: 'Común', 
                activeColor: 'bg-zinc-600 text-white border-zinc-300 scale-115 ring-2 ring-zinc-400/50 shadow-[0_0_15px_rgba(255,255,255,0.5)]', 
                inactiveColor: 'bg-zinc-800/40 text-zinc-400 border-zinc-700/50 hover:bg-zinc-800/80 hover:text-zinc-200 hover:border-zinc-500' 
              },
              { 
                id: 'uncommon', 
                label: 'U', 
                fullName: 'Infrecuente', 
                activeColor: 'bg-slate-400 text-slate-950 border-slate-200 scale-115 ring-2 ring-slate-400/50 shadow-[0_0_15px_rgba(148,163,184,0.7)] font-black', 
                inactiveColor: 'bg-slate-700/30 text-slate-400 border-slate-700/50 hover:bg-slate-700/60 hover:text-slate-200 hover:border-slate-500' 
              },
              { 
                id: 'rare', 
                label: 'R', 
                fullName: 'Rara', 
                activeColor: 'bg-amber-500 text-black border-amber-300 scale-115 ring-2 ring-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.8)] font-black', 
                inactiveColor: 'bg-amber-950/20 text-amber-600 border-amber-900/30 hover:bg-amber-950/50 hover:text-amber-400 hover:border-amber-700' 
              },
              { 
                id: 'mythic', 
                label: 'M', 
                fullName: 'Mítica', 
                activeColor: 'bg-orange-600 text-white border-orange-300 scale-115 ring-2 ring-orange-400/50 shadow-[0_0_25px_rgba(249,115,22,0.9)] font-black', 
                inactiveColor: 'bg-orange-950/20 text-orange-600 border-orange-900/30 hover:bg-orange-950/50 hover:text-orange-400 hover:border-orange-700' 
              }
            ].map(rarity => (
              <button
                key={rarity.id}
                type="button"
                onClick={() => {
                  vibrateTouch();
                  setSelectedRarity(selectedRarity === rarity.id ? '' : rarity.id);
                }}
                className={cn(
                  "w-8 h-8 rounded-full border font-cinzel font-bold text-xs flex items-center justify-center transition-all duration-300",
                  selectedRarity === rarity.id 
                    ? rarity.activeColor 
                    : rarity.inactiveColor
                )}
                title={rarity.fullName}
              >
                {rarity.label}
              </button>
            ))}
            {selectedRarity && (
              <button 
                type="button"
                onClick={() => {
                  vibrateTouch();
                  setSelectedRarity('');
                }}
                className="ml-2 text-red-400/50 hover:text-red-400 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filtro de Valor de Maná (CMC) */}
        <div className="flex flex-col gap-2 border-b border-white/5 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-magic-gold/40 uppercase tracking-widest">Valor de Maná</span>
            {selectedManaValue !== '' && (
              <button 
                type="button"
                onClick={() => {
                  vibrateTouch();
                  setSelectedManaValue('');
                }}
                className="text-red-400/50 hover:text-red-400 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['0', '1', '2', '3', '4', '5', '6', '7+'].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  vibrateTouch();
                  setSelectedManaValue(selectedManaValue === val ? '' : val);
                }}
                className={cn(
                  "w-8 h-8 rounded-full border text-xs font-bold flex items-center justify-center transition-all duration-300",
                  selectedManaValue === val 
                    ? "bg-magic-gold text-black border-magic-gold shadow-[0_0_10px_rgba(193,155,69,0.3)] scale-105" 
                    : "bg-white/5 text-magic-gold/60 border-white/10 hover:border-magic-gold/30"
                )}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* Búsqueda por Texto (Oracle) / Habilidades */}
        <div className="flex flex-col gap-2 border-b border-white/5 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-magic-gold/40 uppercase tracking-widest">Texto de Reglas (Oracle) / Habilidades</span>
            {oracleQuery && (
              <button 
                type="button"
                onClick={() => {
                  vibrateTouch();
                  setOracleQuery('');
                }}
                className="text-red-400/50 hover:text-red-400 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={oracleQuery}
              onChange={(e) => setOracleQuery(e.target.value)}
              placeholder="Ej: deathtouch, flying, draw, exile..."
              className="flex-1 px-4 py-2 bg-black/40 border border-magic-gold/20 rounded-xl text-xs text-magic-gold placeholder:text-magic-gold/30 focus:border-magic-gold/50 focus:outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => {
                vibrateTouch();
                setOracleQuery(oracleQuery === '+1/+1' ? '' : '+1/+1');
              }}
              className={cn(
                "px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center gap-1",
                oracleQuery === '+1/+1'
                  ? "bg-magic-gold text-black border-magic-gold shadow-[0_0_10px_rgba(193,155,69,0.3)]"
                  : "bg-white/5 text-magic-gold/60 border-white/10 hover:border-magic-gold/30"
              )}
              title="Buscar cartas que den o usen contadores o buffs de +1/+1"
            >
              <Plus size={10} /> +1/+1
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {[
              { id: 'flying', label: 'Volar' },
              { id: 'haste', label: 'Prisa' },
              { id: 'trample', label: 'Arrollar' },
              { id: 'deathtouch', label: 'Toque Mortal' },
              { id: 'lifelink', label: 'Vínculo Vital' },
              { id: 'counterspell', label: 'Contrarrestar' }
            ].map(kw => (
              <button
                key={kw.id}
                type="button"
                onClick={() => {
                  vibrateTouch();
                  setOracleQuery(oracleQuery === kw.id ? '' : kw.id);
                }}
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border transition-all",
                  oracleQuery === kw.id
                    ? "bg-[#D4AF37]/20 border-[#D4AF37] text-white"
                    : "bg-transparent text-magic-gold/40 border-magic-gold/10 hover:border-magic-gold/30"
                )}
              >
                {kw.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tipos de Carta y Formato */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {cardTypes.map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => {
                  vibrateTouch();
                  setSelectedType(selectedType === type.id ? '' : type.id);
                }}
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
              onClick={() => {
                vibrateTouch();
                setIsModernOnly(!isModernOnly);
              }}
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
      </>
    );
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
          placeholder="Invocar carta por nombre o comandos..."
          className="w-full pl-12 pr-28 py-4 bg-black/60 border-2 border-magic-gold/20 rounded-2xl 
                     text-magic-gold placeholder:text-magic-gold/30 focus:border-magic-gold/50 focus:outline-none
                     transition-all shadow-[0_0_20px_rgba(0,0,0,0.4)] backdrop-blur-md"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
          {loading && (
            <div className="animate-spin text-magic-gold mr-0.5">
              <Zap size={16} />
            </div>
          )}
          <button
            onClick={toggleHelp}
            className={cn(
              "p-2 rounded-lg transition-all",
              showHelp ? "bg-magic-gold text-black shadow-[0_0_15px_rgba(193,155,69,0.5)]" : "text-magic-gold/40 hover:text-magic-gold hover:bg-white/5"
            )}
            title="Guía de Comandos de Búsqueda"
          >
            <HelpCircle size={18} />
          </button>
          <button 
            onClick={toggleFilters}
            className={cn(
              "p-2 rounded-lg transition-all",
              showFilters ? "bg-magic-gold text-black shadow-[0_0_15px_rgba(193,155,69,0.5)]" : "text-magic-gold/40 hover:text-magic-gold hover:bg-white/5"
            )}
            title="Filtros Avanzados"
          >
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Panel de Guía de Comandos */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3"
          >
            <div className="p-5 bg-black/80 border border-magic-gold/30 rounded-2xl backdrop-blur-xl shadow-2xl flex flex-col gap-4 text-xs text-grimorio-parchment/90">
              <div className="flex items-center justify-between border-b border-magic-gold/20 pb-2">
                <span className="text-[11px] font-bold text-magic-gold uppercase tracking-widest flex items-center gap-1.5">
                  <HelpCircle size={14} className="text-magic-gold" />
                  Biblioteca de Comandos de Búsqueda
                </span>
                <button 
                  onClick={() => setShowHelp(false)}
                  className="text-red-400/50 hover:text-red-400 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              
              <p className="text-[10px] text-white/50 leading-relaxed mb-1">
                Usa sintaxis Scryfall para afinar tus búsquedas en el Grimorio. Puedes escribir estos comandos directamente o combinarlos. <span className="text-magic-gold font-semibold">Haz clic en cualquier ejemplo para cargarlo directamente</span>:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {/* Categoría 1 */}
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-magic-gold/60 uppercase tracking-widest">Tipos y Colores</span>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { cmd: "t:creature", desc: "Buscar criaturas", example: "t:creature dragon" },
                      { cmd: "c:w", desc: "Cartas blancas (w, u, b, r, g, c)", example: "c:w instant" },
                      { cmd: "id:g", desc: "Identidad de color verde", example: "id:g t:land" },
                    ].map((item, i) => (
                      <div 
                        key={i} 
                        onClick={() => {
                          setQuery(item.example);
                          setShowHelp(false);
                        }}
                        className="p-1.5 rounded bg-black/40 border border-white/5 hover:border-magic-gold/40 hover:bg-magic-gold/5 transition-all cursor-pointer text-left"
                      >
                        <div className="font-mono text-magic-gold text-[11px] font-bold">{item.cmd}</div>
                        <div className="text-[10px] text-white/60">{item.desc} (Ej: <span className="underline italic text-white/80">{item.example}</span>)</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Categoría 2 */}
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-magic-gold/60 uppercase tracking-widest">Estadísticas y Costes</span>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { cmd: "mv:3", desc: "Costo de maná convertido (CMC) exacto", example: "mv:3 t:creature" },
                      { cmd: "mv>=5", desc: "Costo de maná mayor o igual a 5", example: "mv>=5 t:sorcery" },
                      { cmd: "pow>=4", desc: "Fuerza de la criatura (pow/tou)", example: "pow>=4 t:creature" },
                    ].map((item, i) => (
                      <div 
                        key={i} 
                        onClick={() => {
                          setQuery(item.example);
                          setShowHelp(false);
                        }}
                        className="p-1.5 rounded bg-black/40 border border-white/5 hover:border-magic-gold/40 hover:bg-magic-gold/5 transition-all cursor-pointer text-left"
                      >
                        <div className="font-mono text-magic-gold text-[11px] font-bold">{item.cmd}</div>
                        <div className="text-[10px] text-white/60">{item.desc} (Ej: <span className="underline italic text-white/80">{item.example}</span>)</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Categoría 3 */}
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-magic-gold/60 uppercase tracking-widest">Oracle (Reglas)</span>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { cmd: "o:flying", desc: "Texto contiene habilidad volar", example: "o:flying t:creature" },
                      { cmd: 'o:"draw a card"', desc: "Buscar frases de reglas exactas", example: 'o:"draw a card" t:instant' },
                      { cmd: 'o:"counter target"', desc: "Hechizos de contrarrestar", example: 'o:"counter target" c:u' },
                    ].map((item, i) => (
                      <div 
                        key={i} 
                        onClick={() => {
                          setQuery(item.example);
                          setShowHelp(false);
                        }}
                        className="p-1.5 rounded bg-black/40 border border-white/5 hover:border-magic-gold/40 hover:bg-magic-gold/5 transition-all cursor-pointer text-left"
                      >
                        <div className="font-mono text-magic-gold text-[11px] font-bold">{item.cmd}</div>
                        <div className="text-[10px] text-white/60">{item.desc} (Ej: <span className="underline italic text-white/80">{item.example}</span>)</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Categoría 4 */}
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-magic-gold/60 uppercase tracking-widest">Ediciones y Rarezas</span>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { cmd: "r:mythic", desc: "Buscar rarezas (common, uncommon, rare, mythic)", example: "r:mythic dragon" },
                      { cmd: "e:neo", desc: "Sigla de expansión (neo, mh3, otj...)", example: "e:neo r:rare" },
                      { cmd: "is:dual", desc: "Filtrar por tierras dobles", example: "is:dual t:land" },
                    ].map((item, i) => (
                      <div 
                        key={i} 
                        onClick={() => {
                          setQuery(item.example);
                          setShowHelp(false);
                        }}
                        className="p-1.5 rounded bg-black/40 border border-white/5 hover:border-magic-gold/40 hover:bg-magic-gold/5 transition-all cursor-pointer text-left"
                      >
                        <div className="font-mono text-magic-gold text-[11px] font-bold">{item.cmd}</div>
                        <div className="text-[10px] text-white/60">{item.desc} (Ej: <span className="underline italic text-white/80">{item.example}</span>)</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-magic-gold/20 pt-2 text-[9px] text-magic-gold/50 flex justify-between items-center italic">
                <span>Tip: Combina filtros: "t:creature c:r mv&lt;=3 o:haste"</span>
                <span className="font-sans">Desarrollado con motor Scryfall</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel de Filtros Rápidos */}
      {isMobile ? (
        <BottomSheet
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          title="Filtros de Búsqueda"
        >
          <div className="flex flex-col gap-5 pb-8">
            {renderFiltersContent()}
          </div>
        </BottomSheet>
      ) : (
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-3"
            >
              <div className="p-5 bg-black/60 border border-magic-gold/20 rounded-2xl backdrop-blur-xl shadow-2xl flex flex-col gap-5">
                {renderFiltersContent()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

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
              const banned = isVetoed(card.name);
              return (
                <div
                  key={card.id}
                  onMouseEnter={() => setHoveredCard(card)}
                  onClick={() => {
                    if (banned) return;
                    if (isMobile) {
                      setSelectedMobileCard(card);
                    } else {
                      onAddCard(card);
                      setQuery('');
                      setResults([]);
                      setHoveredCard(null);
                    }
                  }}
                  className={cn(
                    "group relative flex items-center gap-4 p-4 transition-all border-b border-white/5 last:border-0",
                    banned ? "opacity-50 cursor-not-allowed bg-red-950/10" : "hover:bg-magic-gold/5 cursor-pointer"
                  )}
                >
                  <div className="w-[44px] h-[61px] aspect-[63/88] bg-gray-900 rounded-lg overflow-hidden flex-shrink-0 border border-white/10 shadow-lg">
                    <img 
                      src={card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small} 
                      alt={card.name} 
                      className="w-full h-full object-fill"
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
                          <ShieldAlert size={10} /> Vetada
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
                  hoveredCard.image_uris?.normal || 
                  hoveredCard.card_faces?.[flipStates[hoveredCard.id] || 0]?.image_uris?.normal
                } 
                alt={hoveredCard.name} 
                className="w-full h-auto block"
              />
              {isVetoed(hoveredCard.name) && (
                <div className="absolute inset-0 bg-red-950/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center border-4 border-red-600/50">
                  <ShieldAlert size={60} className="text-red-500 mb-4 animate-pulse" />
                  <h3 className="font-cinzel text-2xl font-bold text-white mb-2 shadow-black text-shadow-lg">CARTA VETADA</h3>
                  <p className="text-red-200 text-xs font-bold uppercase tracking-widest">No permitida en Battle Box Casual</p>
                </div>
              )}
              {hoveredCard.card_faces && hoveredCard.card_faces[0]?.image_uris && (
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
      {/* Mobile Card Preview Modal */}
      {isMobile && selectedMobileCard && (
        <MobileCardPreview
          card={selectedMobileCard}
          onClose={() => setSelectedMobileCard(null)}
          onAdd={() => {
            onAddCard(selectedMobileCard);
            setSelectedMobileCard(null);
            setQuery('');
            setResults([]);
          }}
        />
      )}
    </div>
  );
}

