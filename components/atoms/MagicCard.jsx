import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export default function MagicCard({ 
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
  
  useEffect(() => {
    // Si ya tenemos la imagen hidratada (no está vacía), no hacemos peticiones redundantes a Scryfall.
    if (card.image_uris?.normal && card.image_uris.normal !== '') {
      return;
    }

    setIsLoading(true);
    setLoadError(false);
    
    let cleanName = card.name.replace(/^\d+x\s+/, '').trim();
    // Arreglar cartas dobles que vengan con un solo /
    if (cleanName.includes('/') && !cleanName.includes('//')) {
      cleanName = cleanName.replace(/\s*\/\s*/g, ' // ');
    }
    
    // Buscar la carta exacta, omitiendo Universes Beyond y cartas de Arena
    const searchQuery = `!"${cleanName}" -is:ub -is:digital`;
    
    fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(searchQuery)}`)
      .then(res => {
        if (!res.ok) {
          // Fallback al endpoint exacto normal si falla la búsqueda estricta
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

  // Una carta solo tiene 'caras' reales (para voltear) si cada cara tiene su propio image_uris.
  // Las cartas 'Split' o 'Adventure' tienen card_faces pero comparten un solo image_uris principal.
  const hasFaces = scryfallData?.card_faces && 
                   scryfallData.card_faces.length > 1 && 
                   scryfallData.card_faces[0].image_uris;
  
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
        {imageUrl ? (
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

        {/* Controles de edición (Cantidades) */}
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

        {/* Cantidad (solo modo lectura) */}
        {showQuantity && card.quantity > 1 && !isEditing && (
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
