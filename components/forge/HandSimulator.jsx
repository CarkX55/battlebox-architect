import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MagicCard from '../atoms/MagicCard';

export default function HandSimulator({ deck, isOpen, onClose }) {
  const [hand, setHand] = useState([]);

  const drawHand = () => {
    if (!deck || deck.length === 0) return;
    
    // Expand deck into a single list of cards based on quantity
    const flatDeck = deck.flatMap(card => Array(card.quantity).fill(card));
    
    // Shuffle
    const shuffled = [...flatDeck].sort(() => Math.random() - 0.5);
    
    // Draw 7
    setHand(shuffled.slice(0, 7));
  };

  useEffect(() => {
    if (isOpen) drawHand();
  }, [isOpen, deck]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#1a1612] border-2 border-grimorio-gold/50 rounded-2xl w-full max-w-6xl p-8 shadow-2xl overflow-hidden relative"
      >
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
          <div>
            <h2 className="text-3xl font-cinzel text-grimorio-gold flex items-center gap-3">
              🃏 Simulador de Mano Inicial
            </h2>
            <p className="text-grimorio-parchment/50 text-sm mt-1">Prueba la consistencia de tu mazo institucional.</p>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={drawHand}
              className="px-8 py-3 bg-grimorio-gold text-black font-bold rounded-lg hover:bg-grimorio-gold/80 transition-all shadow-lg active:scale-95"
            >
              🔄 Nuevo Mulligan
            </button>
            <button
              onClick={onClose}
              className="px-8 py-3 border-2 border-grimorio-gold/30 text-grimorio-gold rounded-lg hover:bg-grimorio-gold/10 transition-all font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Hand Grid - Adjusted for larger cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8 justify-items-center min-h-[400px]">
          <AnimatePresence mode="popLayout">
            {hand.map((card, idx) => (
              <motion.div
                key={`${card.name}-${idx}`}
                initial={{ opacity: 0, y: 50, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: idx * 0.08, type: "spring", stiffness: 200 }}
                className="w-full max-w-[240px]"
              >
                <MagicCard 
                  card={card} 
                  showQuantity={false} 
                  isInteractive={true}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="mt-12 text-center">
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key={hand[0]?.name}
            className="text-grimorio-gold/60 font-cinzel text-sm italic tracking-widest uppercase"
          >
            "Un buen general conoce su mano antes de la batalla."
          </motion.p>
        </div>

        {/* Decorative corner element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-grimorio-gold/5 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-grimorio-gold/5 blur-[80px] pointer-events-none" />
      </motion.div>
    </div>
  );
}
