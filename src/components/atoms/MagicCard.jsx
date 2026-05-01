import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export default function MagicCard({ 
  card, 
  isEditing = false, 
  onRemove = null, 
  showQuantity = true,
  isInteractive = true,
  className = ""
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [scryfallData, setScryfallData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // Si ya tenemos la imagen en el objeto card y no es una land básica, podemos usarla
    // Pero para asegurar consistencia (especialmente con lands), hidratamos desde Scryfall
    setIsLoading(true);
    setLoadError(false);
    
    fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
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

  const hasFaces = scryfallData?.card_faces && scryfallData.card_faces.length > 1;
  
  // Lógica de determinación de imagen
  let imageUrl = card.image_uris?.normal || card.image_uris?.large;
  
  if (scryfallData) {
    if (hasFaces) {
      imageUrl = isFlipped 
        ? scryfallData.card_faces[1].image_uris?.normal 
        : scryfallData.card_faces[0].image_uris?.normal;
    } else {
      imageUrl = scryfallData.image_uris?.normal || scryfallData.image_uris?.large || imageUrl;
    }
  }

  const handleFlip = (e) => {
    e.stopPropagation();
    setIsFlipped(!isFlipped);
  };

  return (
    <motion.div
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
        "transition-all duration-300 shadow-xl bg-[#0d0b0a]"
      )}>
        {imageUrl && !loadError ? (
          <motion.img 
            key={isFlipped ? 'back' : 'front'}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
            src={imageUrl} 
            alt={card.name}
            className="w-full h-auto aspect-[63/88] object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full aspect-[63/88] flex flex-col items-center justify-center p-4 text-center">
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-grimorio-gold border-t-transparent rounded-full animate-spin mb-2" />
            ) : (
              <span className="text-grimorio-gold/50 text-[10px] font-cinzel">SCRYFALL MISSING</span>
            )}
            <span className="text-grimorio-parchment text-[10px] font-bold mt-2 uppercase">{card.name}</span>
          </div>
        )}

        {/* Borrado */}
        {isEditing && onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(card.name);
            }}
            className="absolute top-2 left-2 p-1.5 bg-red-600/90 text-white rounded-full shadow-lg 
                       hover:bg-red-700 transition-all z-40 border border-white/20"
          >
            <span className="text-[10px]">❌</span>
          </button>
        )}

        {/* Cantidad */}
        {showQuantity && card.quantity > 1 && (
          <div className="absolute bottom-2 left-2 bg-[#1a1612]/90 border border-grimorio-gold/50 text-grimorio-gold text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg z-20">
            {card.quantity}x
          </div>
        )}

        {/* Transformar */}
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
}
