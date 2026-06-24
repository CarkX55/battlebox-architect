import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useIsTouchDevice } from '../../hooks/useIsMobile';
import { vibrateTouch } from '../../utils/haptic';
import MobileCardPreview from './MobileCardPreview';
import { BATTLEBOX_VETOS, BANLIST_SUBSTITUTIONS } from '../../constants/legacyBattleBox';

const MagicCard = memo(function MagicCard({ 
  card, 
  isEditing = false, 
  onRemove = null, 
  onAdd = null,
  showQuantity = true,
  isInteractive = true,
  className = "",
  deficitInfo = null
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [scryfallData, setScryfallData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highResLoaded, setHighResLoaded] = useState(false);
  const [meldData, setMeldData] = useState(null);

  const isTouch = useIsTouchDevice();
  const [pressTimer, setPressTimer] = useState(null);
  const [isPressing, setIsPressing] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  
  useEffect(() => {
    if (card.image_uris?.small || card.image_uris?.normal) {
      return;
    }

    setIsLoading(true);
    setLoadError(false);
    
    let cleanName = card.name.replace(/^\d+x\s+/, '').trim();
    if (cleanName.includes('//')) {
      cleanName = cleanName.split('//')[0].trim();
    } else if (cleanName.includes('/')) {
      cleanName = cleanName.split('/')[0].trim();
    }
    
    const searchQuery = `!"${cleanName}" -is:ub -is:digital`;
    
    fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(searchQuery)}`)
      .then(res => {
        if (!res.ok) {
          return fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cleanName)}`).then(r => {
             if (!r.ok) throw new Error('Not found');
             return r.json();
          });
        }
        return res.json().then(json => {
          if (!json.data || json.data.length === 0) throw new Error('Not found');
          return json.data[0];
        });
      })
      .then(data => {
        setScryfallData(data);
        if (data.layout === 'meld' && data.all_parts) {
          const meldPart = data.all_parts.find(p => p.component === 'meld_result');
          if (meldPart && meldPart.uri) {
            fetch(meldPart.uri)
              .then(r => r.json())
              .then(m => setMeldData(m))
              .catch(() => console.warn("Failed to load meld result"));
          }
        }
      })
      .catch(() => {
        setLoadError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [card.name]);

  const cardData = scryfallData || card;
  const isMeld = cardData?.layout === 'meld' && !!meldData;
  const hasFaces = (cardData?.card_faces && cardData.card_faces.length > 1) || isMeld;
  
  // Estrategia Progresiva: 'small' por defecto, 'normal' al pasar el ratón
  const getImageUrl = (highRes = false) => {
    if (isFlipped && isMeld && meldData?.image_uris) {
      return highRes ? (meldData.image_uris.normal || meldData.image_uris.large) : (meldData.image_uris.small || meldData.image_uris.normal);
    }
    
    const faceIndex = isFlipped && !isMeld ? 1 : 0;
    
    if (hasFaces && !isMeld && cardData.card_faces[faceIndex]?.image_uris) {
      const faceUris = cardData.card_faces[faceIndex].image_uris;
      return highRes ? (faceUris.normal || faceUris.large) : (faceUris.small || faceUris.normal);
    }
    
    const baseUris = cardData?.image_uris;
    if (!baseUris) return null;
    return highRes ? (baseUris.normal || baseUris.large) : (baseUris.small || baseUris.normal);
  };

  const lowResUrl = getImageUrl(false);
  const highResUrl = getImageUrl(true);

  const handleFlip = (e) => {
    e.stopPropagation();
    setIsFlipped(!isFlipped);
  };

  const handleTouchStart = (e) => {
    if (!isInteractive) return;
    setHighResLoaded(true);
    setIsPressing(true);
    
    const timer = setTimeout(() => {
      vibrateTouch();
      setShowMobilePreview(true);
      setIsPressing(false);
    }, 300);
    setPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
    setIsPressing(false);
  };

  const handleCardClick = (e) => {
    if (!isInteractive) return;
    if (isTouch) {
      const now = Date.now();
      const DOUBLE_PRESS_DELAY = 300;
      if (now - lastTap < DOUBLE_PRESS_DELAY) {
        if (hasFaces) {
          e.stopPropagation();
          vibrateTouch();
          setIsFlipped(!isFlipped);
        }
      }
      setLastTap(now);
    }
  };

  return (
    <>
      <motion.div
        onMouseEnter={() => setHighResLoaded(true)}
        whileHover={isInteractive && !isTouch ? { 
          scale: 1.05, 
          y: -5,
          boxShadow: '0 0 25px rgba(193,155,69,0.5)',
          zIndex: 100
        } : {}}
        animate={isPressing ? { scale: 0.95 } : { scale: 1 }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        onClick={handleCardClick}
        className={cn("relative group cursor-pointer hover:z-[100]", className)}
      >
        <div className={cn(
          "relative rounded-xl overflow-hidden border-2",
          "border-grimorio-gold/20 group-hover:border-grimorio-gold/60",
          "transition-all duration-300 shadow-xl bg-[#0d0b0a] aspect-[63/88]"
        )}>
          {lowResUrl ? (
            <div className="w-full h-full">
              {/* Imagen de baja resolución (siempre presente como base) */}
              <img 
                src={lowResUrl} 
                alt={card.name}
                className={cn(
                  "w-full h-full object-fill transition-opacity duration-300",
                  highResLoaded ? "opacity-0 absolute inset-0" : "opacity-100"
                )}
                loading="lazy"
              />
              {/* Imagen de alta resolución (se activa al hover/toque) */}
              {highResLoaded && (
                <motion.img 
                  key={isFlipped ? 'back-hd' : 'front-hd'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={highResUrl} 
                  alt={`${card.name} HD`}
                  className="w-full h-full object-fill block"
                  decoding="async"
                />
              )}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-grimorio-gold border-t-transparent rounded-full animate-spin mb-2" />
              ) : (
                <span className="text-grimorio-gold/50 text-[10px] font-cinzel">SCRYFALL MISSING</span>
              )}
              <span className="text-grimorio-parchment text-[10px] font-bold mt-2 uppercase">{card.name}</span>
            </div>
          )}

          {isEditing && (
            <div className="absolute top-2 left-2 flex items-center bg-[#1a1612]/95 border border-grimorio-gold/50 rounded shadow-lg z-40 overflow-hidden">
              {onRemove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(card.name);
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  className="px-2.5 py-1 text-red-400 hover:bg-red-500/20 transition-colors font-bold text-lg leading-none flex items-center justify-center"
                >
                  -
                </button>
              )}
              <span className="px-2 py-1 text-xs text-grimorio-gold font-bold border-l border-r border-grimorio-gold/20 flex items-center justify-center bg-black/40">
                {card.quantity || 1}
              </span>
              {onAdd && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd(card.name);
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  className="px-2.5 py-1 text-green-400 hover:bg-green-500/20 transition-colors font-bold text-lg leading-none flex items-center justify-center"
                >
                  +
                </button>
              )}
            </div>
          )}

          {showQuantity && card.quantity > 1 && !isEditing && (
            <div className="absolute bottom-2 left-2 bg-[#1a1612]/90 border border-grimorio-gold/50 text-grimorio-gold text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg z-20">
              {card.quantity}x
            </div>
          )}
        </div>

        {card?.name && BATTLEBOX_VETOS.includes(card.name) && (
          <div 
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="absolute top-2 right-2 z-[60] group/tooltip-veto"
          >
            <div className="w-6 h-6 rounded-full bg-black/95 border border-red-500/80 flex items-center justify-center cursor-help shadow-lg backdrop-blur-sm hover:bg-black transition-colors">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            </div>
            
            {/* Tooltip de Veto */}
            <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-black/95 border border-red-500/50 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.95)] opacity-0 pointer-events-none group-hover/tooltip-veto:opacity-100 transition-opacity duration-200 z-[9999] text-[11px] text-red-200 leading-relaxed font-sans backdrop-blur-md">
              <div className="absolute -top-1 right-2 w-2 h-2 bg-red-500 rotate-45 border-t border-l border-red-500/50" />
              <p className="font-semibold text-red-400 uppercase tracking-wider mb-1">Carta Vetada</p>
              <p>
                Esta carta está vetada en el formato casual de Battle Box.
                {BANLIST_SUBSTITUTIONS[card.name] && (
                  <>
                    {" "}Recomendación: Reemplazar por <span className="text-green-400 font-bold">{BANLIST_SUBSTITUTIONS[card.name]}</span>.
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        {deficitInfo && !deficitInfo.ok && (
          <div 
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="absolute top-1/2 -translate-y-1/2 right-2 z-[60] group/tooltip"
          >
            <div className="w-6 h-6 rounded-full bg-black/95 border border-[#D4AF37] flex items-center justify-center cursor-help shadow-lg backdrop-blur-sm hover:bg-black transition-colors">
              <AlertTriangle className="w-3.5 h-3.5 text-[#D4AF37]" />
            </div>
            
            {/* Tooltip de Radiancia */}
            <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-black/95 border border-[#D4AF37]/50 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.95)] opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity duration-200 z-[9999] text-[11px] text-gray-200 leading-relaxed font-sans backdrop-blur-md">
              <div className="absolute -top-1 right-2 w-2 h-2 bg-[#D4AF37] rotate-45 border-t border-l border-[#D4AF37]/50" />
              <p className="font-semibold text-[#D4AF37] uppercase tracking-wider mb-1">Inconsistencia de Maná</p>
              <p>
                Inconsistencia estadística: Requiere <span className="text-[#D4AF37] font-bold">{deficitInfo.required}</span> fuentes de <span className="font-bold text-white">{{ W: 'Blanco', U: 'Azul', B: 'Negro', R: 'Rojo', G: 'Verde' }[deficitInfo.color] || deficitInfo.color}</span> para lanzarse consistentemente en curva, pero el mazo actual solo tiene <span className="text-red-400 font-bold">{deficitInfo.actual}</span> (Déficit: <span className="text-red-400 font-bold">-{deficitInfo.deficit}</span> fuentes).
              </p>
            </div>
          </div>
        )}

        {hasFaces && !isTouch && (
          <button
            onClick={handleFlip}
            className={cn(
              "absolute -bottom-3 left-1/2 -translate-x-1/2 p-2 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.8)] z-50 transition-all duration-300 border-2",
              isFlipped 
                ? "bg-magic-gold text-black border-magic-gold shadow-[0_0_20px_rgba(255,202,88,0.6)]" 
                : "bg-[#1a1612] text-magic-gold border-magic-gold/50 hover:bg-[#2a241e] hover:border-magic-gold hover:shadow-[0_0_15px_rgba(255,202,88,0.3)]"
            )}
            title="Transformar Carta"
          >
            <RefreshCw size={14} className={cn("transition-transform duration-500", isFlipped && "rotate-180")} />
          </button>
        )}
      </motion.div>

      {/* Vista previa móvil en pulsación larga */}
      <AnimatePresence>
        {showMobilePreview && (
          <MobileCardPreview
            card={card}
            onClose={() => setShowMobilePreview(false)}
            onAdd={onAdd}
            onRemove={onRemove}
            initialFlipped={isFlipped}
          />
        )}
      </AnimatePresence>
    </>
  );
});

export default MagicCard;
