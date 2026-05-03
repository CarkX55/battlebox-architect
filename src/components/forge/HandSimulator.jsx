import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MagicCard from '../atoms/MagicCard';

export default function HandSimulator({ deck, isOpen, onClose }) {
  const [hand, setHand] = useState([]);

  const shuffleDeck = (cards) => {
    const flat = cards.flatMap(card => Array(card.quantity || 1).fill(card));
    const shuffled = [...flat];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const [currentDeck, setCurrentDeck] = useState([]);

  const restartSimulation = () => {
    if (!deck || deck.length === 0) return;
    const shuffled = shuffleDeck(deck);
    setHand(shuffled.slice(0, 7));
    setCurrentDeck(shuffled.slice(7));
  };

  const drawOne = () => {
    if (currentDeck.length === 0) return;
    const [next, ...rest] = currentDeck;
    setHand(prev => [...prev, next]);
    setCurrentDeck(rest);
  };

  useEffect(() => {
    if (isOpen) restartSimulation();
  }, [isOpen, deck]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#1a1612] border-2 border-grimorio-gold/50 rounded-2xl w-full max-w-6xl p-8 shadow-2xl overflow-hidden relative flex flex-col min-h-[600px]"
      >
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-4 shrink-0">
          <div>
            <h2 className="text-3xl font-cinzel text-grimorio-gold flex items-center gap-3">
              🃏 Simulador de Mano Inicial
            </h2>
            <p className="text-grimorio-parchment/50 text-sm mt-1">Prueba la consistencia de tu mazo institucional.</p>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={drawOne}
              disabled={currentDeck.length === 0}
              className="px-6 py-3 bg-blue-600/20 border border-blue-500/50 text-blue-400 font-bold rounded-lg hover:bg-blue-600/40 transition-all disabled:opacity-30 flex items-center gap-2"
            >
              📥 Robar Carta ({currentDeck.length})
            </button>
            <button
              onClick={restartSimulation}
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

        {/* Hand Grid - Compacto y cartas grandes */}
        <div className="flex-1 flex items-center justify-center relative py-12">
          <div className="relative w-full h-[400px] flex justify-center items-center">
            <AnimatePresence mode="popLayout">
            {hand.map((card, idx) => {
              const total = hand.length;
              const mid = (total - 1) / 2;
              
              const spread = total > 10 ? 60 : 90; // Un poco más de spread para cartas grandes
              const rotFactor = total > 10 ? 1.5 : 2.5; // Rotación más sutil
              
              const rotation = (idx - mid) * rotFactor;
              const yOffset = Math.pow(Math.abs(idx - mid), 1.5) * (total > 10 ? 5 : 10);
              const xOffset = (idx - mid) * spread;

              return (
                <motion.div
                  key={`${card.name}-${idx}`}
                  initial={{ opacity: 0, y: 200, rotate: 0 }}
                  animate={{ 
                    opacity: 1, 
                    y: yOffset, 
                    x: `calc(-50% + ${xOffset}px)`,
                    rotate: rotation,
                    zIndex: idx 
                  }}
                  whileHover={{ 
                    y: yOffset - 40,
                    x: `calc(-50% + ${xOffset}px)`,
                    rotate: 0,
                    scale: 1.2, 
                    zIndex: 100,
                    transition: { type: "spring", stiffness: 400, damping: 35 }
                  }}
                  exit={{ opacity: 0, scale: 0.8, y: 100 }}
                  transition={{ type: "spring", stiffness: 260, damping: 25 }}
                  className="absolute left-1/2 w-[240px]" // Cartas más grandes
                  style={{ transformOrigin: "bottom center" }}
                >
                  <MagicCard 
                    card={card} 
                    showQuantity={false} 
                    isInteractive={false}
                  />
                </motion.div>
              );
            })}
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-8 text-center shrink-0">
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
