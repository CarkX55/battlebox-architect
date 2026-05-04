import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

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
      })
      .catch(() => {
        setLoadError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [card.name]);

  const hasFaces = scryfallData?.card_faces && 
                   scryfallData.card_faces.length > 1 && 
                   scryfallData.card_faces[0].image_uris;
  
  // Estrategia Progresiva: 'small' por defecto, 'normal' al pasar el ratón
  const getImageUrl = (highRes = false) => {
    const uris = scryfallData || card;
    const faceIndex = isFlipped ? 1 : 0;
    
    if (hasFaces && scryfallData.card_faces[faceIndex].image_uris) {
      const faceUris = scryfallData.card_faces[faceIndex].image_uris;
      return highRes ? (faceUris.normal || faceUris.large) : (faceUris.small || faceUris.normal);
    }
    
    const baseUris = uris.image_uris;
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

        {hasFaces && (
          <button
            onClick={handleFlip}
            className="absolute top-2 right-2 p-1.5 bg-grimorio-gold text-black rounded-full shadow-lg 
                       hover:scale-110 active:scale-95 transition-all z-30"
          >
            <span className="text-xs">🔄</span>
          </button>
        )}
      </div>
    </motion.div>
  );
});

export default MagicCard;
