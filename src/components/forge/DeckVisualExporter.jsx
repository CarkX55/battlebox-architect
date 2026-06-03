import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Image, Check, Heart, Shield, Award, HelpCircle, Activity } from 'lucide-react';
import { cn } from '../../utils/cn';
import { auditarMazo } from '../../services/deckAuditorService';

/**
 * DeckVisualExporter: Generador de Grid Visual premium (Social Decklist Card)
 * Organiza las cartas en cascada apilada por coste de maná y tipo de carta
 * con gradientes dorados y orbes neón, permitiendo compartir tu creación.
 */
export default function DeckVisualExporter({ deck, sideboard = [], isOpen, onClose, deckName = 'Mazo Forjado', archetype = 'Midrange', colors = [], formData = {}, onOptimize }) {
  const [activeTab, setActiveTab] = useState('main'); // 'main' | 'sideboard' | 'audit'
  const [likeCount, setLikeCount] = useState(12);
  const [hasLiked, setHasLiked] = useState(false);

  const auditReport = useMemo(() => {
    return auditarMazo(deck || [], sideboard || [], formData);
  }, [deck, sideboard, formData]);

  // Clasificar las cartas del mazo principal por Coste de Maná Convertido (CMC)
  const columnsByCmc = useMemo(() => {
    if (!deck || deck.length === 0) return {};
    
    const cols = {
      '0': [],
      '1': [],
      '2': [],
      '3': [],
      '4': [],
      '5+': [],
      'Tierras': []
    };

    const isLandCard = (c) => {
      if (!c) return false;
      const category = (c.category || '').toLowerCase();
      const typeLine = (c.type_line || c.type || '').toLowerCase();
      const name = (c.name || '').toLowerCase();
      
      return (
        category.includes('land') || 
        category.includes('tierra') || 
        typeLine.includes('land') || 
        typeLine.includes('tierra') ||
        ['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes', 'llanura', 'isla', 'pantano', 'montaña', 'bosque', 'yermo'].includes(name)
      );
    };

    deck.forEach(c => {
      const isLand = isLandCard(c);
      
      if (isLand) {
        cols['Tierras'].push(c);
      } else {
        const cmc = c.mana_value || 0;
        if (cmc === 0) cols['0'].push(c);
        else if (cmc === 1) cols['1'].push(c);
        else if (cmc === 2) cols['2'].push(c);
        else if (cmc === 3) cols['3'].push(c);
        else if (cmc === 4) cols['4'].push(c);
        else cols['5+'].push(c);
      }
    });

    // Ordenar cartas dentro de cada columna alfabéticamente
    Object.keys(cols).forEach(key => {
      cols[key].sort((a, b) => a.name.localeCompare(b.name));
    });

    return cols;
  }, [deck]);

  // Clasificar el sideboard
  const sideboardCards = useMemo(() => {
    return [...sideboard].sort((a, b) => (a.mana_value || 0) - (b.mana_value || 0));
  }, [sideboard]);

  const handleLike = () => {
    if (hasLiked) {
      setLikeCount(prev => prev - 1);
      setHasLiked(false);
    } else {
      setLikeCount(prev => prev + 1);
      setHasLiked(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#0c0a09] border-2 border-grimorio-gold/30 rounded-3xl w-full max-w-6xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[92vh] relative"
      >
        {/* Decorative subtle border line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-grimorio-gold to-transparent" />

        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <Image className="text-grimorio-gold w-6 h-6 animate-pulse" />
            <div>
              <h3 className="font-cinzel text-lg text-grimorio-gold tracking-wide">
                Expositor Visual del Duelista
              </h3>
              <p className="text-[10px] text-gray-500 font-sans tracking-wider uppercase">
                Social Decklist Card • Grid de costura por curva de maná
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Selector de Pestañas Mazo/Side/Audit */}
            <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 text-[10px]">
              <button 
                onClick={() => setActiveTab('main')}
                className={cn("px-3 py-1.5 rounded transition-all font-bold font-sans uppercase", activeTab === 'main' ? "bg-grimorio-gold text-black shadow-lg" : "text-gray-400 hover:text-gray-200")}
              >
                Mazo Principal
              </button>
              <button 
                onClick={() => setActiveTab('sideboard')}
                className={cn("px-3 py-1.5 rounded transition-all font-bold font-sans uppercase", activeTab === 'sideboard' ? "bg-grimorio-gold text-black shadow-lg" : "text-gray-400 hover:text-gray-200")}
              >
                Banquillo
              </button>
              <button 
                onClick={() => setActiveTab('audit')}
                className={cn("px-3 py-1.5 rounded transition-all font-bold font-sans uppercase flex items-center gap-1", activeTab === 'audit' ? "bg-purple-600 text-white shadow-lg" : "text-gray-400 hover:text-gray-200")}
              >
                <Activity size={12} />
                Auditoría
              </button>
            </div>

            <button 
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Visual Poster Card Container (El Canvas Hermoso) */}
        <div className="flex-1 overflow-y-auto pr-1 select-none flex flex-col justify-start">
          <div className="border border-grimorio-gold/20 rounded-2xl p-6 bg-gradient-to-b from-[#13110f] via-[#090807] to-[#0c0a09] relative shadow-2xl overflow-hidden flex flex-col gap-6 shrink-0">
            
            {/* Background glowing light for aesthetics */}
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#D4AF37]/5 blur-[120px] rounded-full -z-10" />

            {/* Poster Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-grimorio-gold/10 pb-4 shrink-0">
              <div className="flex items-center gap-4">
                {/* Logo o Icono de Duelista con Sello de Grado */}
                <div className="relative w-14 h-14 bg-gradient-to-br from-grimorio-gold to-[#4a3318] rounded-xl flex items-center justify-center border border-grimorio-gold/30 shadow-[0_0_15px_rgba(212,175,55,0.2)] shrink-0">
                  <Award className="text-black w-8 h-8 font-black" />
                  <div className={cn(
                    "absolute -bottom-2 -right-2 w-7 h-7 rounded-full border-2 flex items-center justify-center font-black text-sm shadow-xl",
                    auditReport.grade === 'S' ? "bg-yellow-400 border-white text-black" :
                    auditReport.grade === 'A' ? "bg-emerald-500 border-black text-white" :
                    auditReport.grade === 'B' ? "bg-blue-500 border-black text-white" :
                    auditReport.grade === 'C' ? "bg-orange-500 border-black text-white" :
                    "bg-red-600 border-black text-white"
                  )}>
                    {auditReport.grade}
                  </div>
                </div>
                <div>
                  <h4 className="font-cinzel text-2xl text-magic-gold tracking-wide leading-tight drop-shadow-md flex items-center gap-2">
                    {deckName}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">
                      {archetype} Archetype
                    </span>
                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                    <span className="text-[10px] text-[#D4AF37] uppercase font-bold font-sans">
                      {deck.reduce((sum, c) => sum + (c.quantity || 1), 0)} Cartas
                    </span>
                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                    <span className="text-[10px] text-purple-400 uppercase font-bold font-sans cursor-pointer hover:underline" onClick={() => setActiveTab('audit')}>
                      Score: {auditReport.score}/100
                    </span>
                  </div>
                </div>
              </div>

              {/* Orbes de Maná de la Identidad de Color */}
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5 bg-black/40 border border-white/5 p-2 rounded-xl">
                  {colors.map(c => {
                    const iconPath = {
                      'W': '/ASSETS/manaBlanco.webp',
                      'U': '/ASSETS/manaAzul.webp',
                      'B': '/ASSETS/manaNegro.webp',
                      'R': '/ASSETS/manaRojo.webp',
                      'G': '/ASSETS/manaVerde.webp',
                      'C': '/ASSETS/Manaincoloro.webp'
                    }[c];
                    return iconPath ? <img key={c} src={iconPath} alt={c} className="w-6 h-6 object-contain drop-shadow" title={c} /> : null;
                  })}
                </div>

                {/* Like Button Interactivo */}
                <button
                  onClick={handleLike}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs transition-all active:scale-95 shadow-md",
                    hasLiked 
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-400" 
                      : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                  )}
                >
                  <Heart size={14} className={hasLiked ? "fill-rose-500" : ""} />
                  <span className="font-bold">{likeCount}</span>
                </button>
              </div>
            </div>

            {/* Poster Content: The Cascade Grid */}
            <AnimatePresence mode="wait">
              {activeTab === 'main' ? (
                <motion.div 
                  key="main"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 min-h-[400px]"
                >
                  {Object.keys(columnsByCmc).map((cmcKey) => {
                    const colCards = columnsByCmc[cmcKey];
                    const colQuantity = colCards.reduce((sum, c) => sum + (c.quantity || 1), 0);

                    return (
                      <div key={cmcKey} className="flex flex-col gap-3 min-h-0">
                        {/* Cabecera de Columna */}
                        <div className="flex justify-between items-center border-b border-white/10 pb-1 shrink-0">
                          <span className="font-cinzel text-[10px] text-magic-gold uppercase tracking-widest font-bold">
                            {cmcKey === 'Tierras' ? 'Tierras' : `Coste ${cmcKey}`}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            x{colQuantity}
                          </span>
                        </div>

                        {/* Cartas Apiladas (Casada) */}
                        <div className="flex-1 flex flex-col relative min-h-0 pb-4">
                          {colCards.length === 0 ? (
                            <div className="h-24 border border-dashed border-white/5 rounded-xl flex items-center justify-center text-[9px] text-gray-600 font-serif italic text-center p-2">
                              Vacío
                            </div>
                          ) : (
                            <div className="space-y-[-110%] hover:space-y-[-80%] transition-all duration-300">
                              {colCards.map((c, index) => {
                                const imageUrl = c.image_uris?.normal || c.image_uris?.small || `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(c.name)}&format=image`;
                                const isFoil = c.rarity === 'mythic' || c.rarity === 'rare';

                                return (
                                  <motion.div
                                    key={`${c.name}-${index}`}
                                    className="relative w-full rounded-xl overflow-hidden shadow-lg border border-white/5 hover:border-grimorio-gold/50 hover:shadow-2xl transition-all duration-300 hover:z-20 cursor-help"
                                    style={{ 
                                      transformOrigin: 'top center'
                                    }}
                                    whileHover={{ scale: 1.05 }}
                                  >
                                    {isFoil && (
                                      /* Foil rainbow shimmer overlay effect */
                                      <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 via-pink-500/5 to-cyan-500/10 mix-blend-color-dodge opacity-60 pointer-events-none" />
                                    )}

                                    <img
                                      src={imageUrl}
                                      alt={c.name}
                                      className="w-full h-auto object-cover rounded-xl"
                                      loading="lazy"
                                    />
                                    
                                    {/* Insignia de Cantidad Flotante */}
                                    <div className="absolute top-2 right-2 bg-black/80 border border-grimorio-gold/30 w-6 h-6 rounded-md flex items-center justify-center font-sans font-bold text-xs text-white shadow-md">
                                      x{c.quantity}
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              ) : activeTab === 'audit' ? (
                // --- VISTA AUDITORIA ---
                <motion.div 
                  key="audit"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 min-h-[400px] text-white"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <Activity className="text-purple-400" />
                      <h3 className="text-xl font-cinzel text-purple-300">Auditoría del Juez Supremo</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-magic-gold drop-shadow-md">{auditReport.score}/100</div>
                      <div className="text-xs uppercase tracking-widest text-gray-400">Grado Competitivo</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Fortalezas */}
                    <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-xl">
                      <h4 className="text-emerald-400 font-bold uppercase text-xs mb-3 flex items-center gap-2">
                        <Check size={14} /> Puntos Fuertes ({auditReport.strengths.length})
                      </h4>
                      <ul className="space-y-2 text-sm text-emerald-100/70 list-disc pl-4 font-serif">
                        {auditReport.strengths.length > 0 ? (
                          auditReport.strengths.map((str, i) => <li key={i}>{str}</li>)
                        ) : (
                          <li className="italic opacity-50">No hay puntos fuertes destacables.</li>
                        )}
                      </ul>
                    </div>

                    {/* Debilidades */}
                    <div className="bg-rose-950/20 border border-rose-500/20 p-4 rounded-xl">
                      <h4 className="text-rose-400 font-bold uppercase text-xs mb-3 flex items-center gap-2">
                        <X size={14} /> Advertencias ({auditReport.warnings.length})
                      </h4>
                      <ul className="space-y-2 text-sm text-rose-100/70 list-disc pl-4 font-serif">
                        {auditReport.warnings.length > 0 ? (
                          auditReport.warnings.map((warn, i) => <li key={i}>{warn}</li>)
                        ) : (
                          <li className="italic opacity-50 text-emerald-400">¡Ninguna! Tu mazo es perfecto.</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Metricas */}
                  <div className="grid grid-cols-4 gap-4 mt-6">
                    <div className="bg-black/50 p-3 rounded-lg border border-white/5 text-center">
                      <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Maná Score</div>
                      <div className="text-xl font-black text-white">{auditReport.metrics.manaScore}/30</div>
                    </div>
                    <div className="bg-black/50 p-3 rounded-lg border border-white/5 text-center">
                      <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Curva (VMP)</div>
                      <div className="text-xl font-black text-white">{auditReport.metrics.vmp}</div>
                    </div>
                    <div className="bg-black/50 p-3 rounded-lg border border-white/5 text-center">
                      <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Consistencia</div>
                      <div className="text-xl font-black text-white">{auditReport.metrics.consistencyScore}/20</div>
                    </div>
                    <div className="bg-black/50 p-3 rounded-lg border border-white/5 text-center">
                      <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Estructura</div>
                      <div className="text-xl font-black text-white">{auditReport.metrics.structureScore}/30</div>
                    </div>
                  </div>

                  {/* Botón de Optimización Automática */}
                  {auditReport.grade !== 'S' && onOptimize && (
                    <div className="mt-6 flex justify-center border-t border-white/10 pt-6">
                      <button
                        onClick={() => {
                          onOptimize(auditReport);
                          setActiveTab('main'); // Volver al grid para ver los cambios
                        }}
                        className="btn-magic-glass shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] flex items-center gap-2 border-[#D4AF37]/50 text-[#D4AF37] px-6 py-3 text-sm bg-gradient-to-r from-yellow-900/40 to-yellow-600/20 rounded-xl font-bold uppercase tracking-wider"
                      >
                        <Sparkles size={16} /> Optimizar Mazo Automáticamente
                      </button>
                    </div>
                  )}

                </motion.div>
              ) : (
                // --- VISTA SIDEBOARD COLLAGE ---
                <motion.div 
                  key="side"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4 min-h-[400px]"
                >
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2 shrink-0">
                    <Shield size={14} className="text-grimorio-gold" />
                    <span className="text-xs font-cinzel text-magic-gold uppercase tracking-wider">Cartas de Banquillo</span>
                  </div>

                  {sideboardCards.length === 0 ? (
                    <div className="py-24 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                      <HelpCircle className="text-gray-700 w-10 h-10" />
                      <p className="text-xs text-gray-500 font-serif italic">
                        No hay cartas agregadas al Sideboard actualmente. ¡Usa Sideboard Architect para generarlo!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                      {sideboardCards.map((c, index) => {
                        const imageUrl = c.image_uris?.normal || c.image_uris?.small || `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(c.name)}&format=image`;
                        return (
                          <motion.div
                            key={`side-${c.name}-${index}`}
                            className="relative rounded-xl overflow-hidden border border-white/10 shadow-lg hover:border-grimorio-gold/50 cursor-pointer"
                            whileHover={{ scale: 1.05 }}
                          >
                            <img
                              src={imageUrl}
                              alt={c.name}
                              className="w-full h-auto object-cover rounded-xl"
                            />
                            <div className="absolute top-2 right-2 bg-black/80 border border-grimorio-gold/30 w-6 h-6 rounded-md flex items-center justify-center font-sans font-bold text-xs text-white shadow-md">
                              x{c.quantity}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 text-center sm:text-left">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono">
            <span>🛡️</span>
            <span>Estilo visual premium estructurado para catalogación y redes sociales.</span>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-xs font-bold uppercase transition-all"
          >
            Cerrar Expositor
          </button>
        </div>
      </motion.div>
    </div>
  );
}
