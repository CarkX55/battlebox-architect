import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { RefreshCw } from 'lucide-react';

const MagicCard = memo(function MagicCard({ 
  card, 
  isEditing = false, 
  onRemove = null, 
  onAdd = null,
  showQuantity = true,
  isInteractive = true,
  className = ""
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [scryfallData, setScryfallData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highResLoaded, setHighResLoaded] = useState(false);
  const [meldData, setMeldData] = useState(null);
  
  useEffect(() => {
    if (card.image_uris?.small || card.image_uris?.normal) {
      return;
    }

    setIsLoading(true);
    setLoadError(false);
    
    let cleanName = card.name.replace(/^\d+x\s+/, '').trim();
    if (cleanName.includes('/') && !cleanName.includes('//')) {
      cleanName = cleanName.replace(/\s*\/\s*/g, ' // ');
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

  return (
    <motion.div
      onMouseEnter={() => setHighResLoaded(true)}
      whileHover={isInteractive ? { 
        scale: 1.05, 
        y: -5,
        boxShadow: '0 0 25px rgba(193,155,69,0.5)'
      } : {}}
      className={cn("relative group", className)}
    >
      <div className={cn(
        "relative rounded-xl overflow-hidden border-2",
        "border-grimorio-gold/20 group-hover:border-grimorio-gold/60",
        "transition-all duration-300 shadow-xl bg-[#0d0b0a] aspect-[63/88]"
      )}>
        {lowResUrl ? (
          <>
            {/* Imagen de baja resolución (siempre presente como base) */}
            <img 
              src={lowResUrl} 
              alt={card.name}
              className={cn(
                "w-full h-auto object-cover transition-opacity duration-300",
                highResLoaded ? "opacity-0 absolute inset-0" : "opacity-100"
              )}
              loading="lazy"
            />
            {/* Imagen de alta resolución (se activa al hover) */}
            {highResLoaded && (
              <motion.img 
                key={isFlipped ? 'back-hd' : 'front-hd'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                src={highResUrl} 
                alt={`${card.name} HD`}
                className="w-full h-auto object-cover"
                decoding="async"
              />
            )}
          </>
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
                className="px-2 py-1 text-green-400 hover:bg-green-500/20 transition-colors font-bold text-lg leading-none flex items-center justify-center"
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

      {hasFaces && (
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
  );
});

export default MagicCard;
