import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, Plus, Minus, Info } from 'lucide-react';
import { cn } from '../../utils/cn';
import { vibrateTouch } from '../../utils/haptic';

export default function MobileCardPreview({ 
  card, 
  onClose, 
  onAdd = null, 
  onRemove = null,
  initialFlipped = false
}) {
  const [isFlipped, setIsFlipped] = useState(initialFlipped);
  const [scryfallData, setScryfallData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If card doesn't have image uris, let's fetch them from Scryfall
    if (card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal) {
      return;
    }

    setIsLoading(true);
    let cleanName = card.name.replace(/^\d+x\s+/, '').trim();
    if (cleanName.includes('//')) {
      cleanName = cleanName.split('//')[0].trim();
    } else if (cleanName.includes('/')) {
      cleanName = cleanName.split('/')[0].trim();
    }

    fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cleanName)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setScryfallData(data);
      })
      .catch(err => console.error("Error fetching preview card:", err))
      .finally(() => setIsLoading(false));
  }, [card]);

  const activeCard = scryfallData || card;
  const isMeld = activeCard?.layout === 'meld';
  const hasFaces = (activeCard?.card_faces && activeCard.card_faces.length > 1) || isMeld;

  const getImageUrl = () => {
    const faceIndex = isFlipped ? 1 : 0;
    if (hasFaces && !isMeld && activeCard.card_faces?.[faceIndex]?.image_uris) {
      return activeCard.card_faces[faceIndex].image_uris.large || activeCard.card_faces[faceIndex].image_uris.normal;
    }
    return activeCard.image_uris?.large || activeCard.image_uris?.normal;
  };

  const imageUrl = getImageUrl();

  const handleFlip = (e) => {
    e.stopPropagation();
    vibrateTouch();
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          vibrateTouch();
          onClose();
        }}
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
      />

      {/* Preview Card Modal */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        transition={{ type: 'spring', damping: 25, stiffness: 250 }}
        className="relative z-10 w-full max-w-sm flex flex-col items-center gap-6"
      >
        {/* Close Button */}
        <button 
          onClick={() => {
            vibrateTouch();
            onClose();
          }}
          className="absolute -top-12 right-2 bg-black/60 border border-magic-gold/20 text-[#f4ece0]/60 p-2 rounded-full hover:text-white"
        >
          <X size={20} />
        </button>

        {/* Card Frame */}
        <div className="relative w-full aspect-[63/88] rounded-[4.7%] overflow-hidden border-2 border-magic-gold/40 shadow-[0_0_50px_rgba(255,202,88,0.2)] bg-[#0d0b0a]">
          {isLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-magic-gold/20 border-t-magic-gold rounded-full animate-spin" />
              <p className="font-cinzel text-xs text-magic-gold/60 tracking-wider">Invocando Ilustración...</p>
            </div>
          ) : imageUrl ? (
            <img 
              src={imageUrl} 
              alt={activeCard.name} 
              className="w-full h-full object-fill block"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
              <Info className="w-8 h-8 text-magic-gold/30 mb-2" />
              <p className="font-cinzel text-magic-gold/50 text-xs">IMAGEN NO DISPONIBLE</p>
              <p className="text-white/60 text-sm font-bold mt-2 uppercase">{activeCard.name}</p>
            </div>
          )}

          {/* Double face flip overlay indicator */}
          {hasFaces && (
            <button
              onClick={handleFlip}
              className="absolute bottom-4 right-4 bg-magic-gold text-black p-3 rounded-full shadow-2xl border border-white/20 active:scale-95 transition-transform z-30"
              title="Voltear cara"
            >
              <RefreshCw size={18} className={cn("transition-transform duration-500", isFlipped && "rotate-180")} />
            </button>
          )}
        </div>

        {/* Action Controls for Builder/Forge */}
        {(onAdd || onRemove) && (
          <div className="flex items-center gap-4 px-6 py-3 bg-[#13110f]/95 border border-magic-gold/30 rounded-2xl shadow-2xl backdrop-blur-xl">
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  vibrateTouch();
                  onRemove(activeCard.name);
                }}
                className="w-12 h-12 bg-red-950/20 border border-red-500/30 text-red-400 rounded-xl flex items-center justify-center active:bg-red-500/20 transition-all"
              >
                <Minus size={20} />
              </button>
            )}
            
            <div className="flex flex-col items-center min-w-[80px]">
              <span className="text-[10px] text-magic-gold/60 font-cinzel uppercase tracking-wider">Cantidad</span>
              <span className="text-xl font-bold font-mono text-white">
                {card.quantity || 1}
              </span>
            </div>

            {onAdd && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  vibrateTouch();
                  onAdd(activeCard.name);
                }}
                className="w-12 h-12 bg-green-950/20 border border-green-500/30 text-green-400 rounded-xl flex items-center justify-center active:bg-green-500/20 transition-all"
              >
                <Plus size={20} />
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
