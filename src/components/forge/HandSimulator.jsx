import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MagicCard from '../atoms/MagicCard';

export default function HandSimulator({ deck, isOpen, onClose }) {
  const [hand, setHand] = useState([]);
  const [mulliganCount, setMulliganCount] = useState(0);

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
    setMulliganCount(prev => prev + 1);
  };

  const drawOne = () => {
    if (currentDeck.length === 0) return;
    const [next, ...rest] = currentDeck;
    setHand(prev => [...prev, next]);
    setCurrentDeck(rest);
  };

  useEffect(() => {
    if (isOpen) restartSimulation();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#0f0d0c] border-2 border-grimorio-gold/30 rounded-3xl w-full max-w-6xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative flex flex-col min-h-[650px]"
      >
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-4 shrink-0">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-cinzel text-grimorio-gold flex items-center justify-center md:justify-start gap-4">
              <img src="/ASSETS/ManoDragon.webp" alt="Mano Dragon" className="w-12 h-12 object-contain drop-shadow-[0_0_15px_rgba(255,202,88,0.4)]" />
              El Destino del Duelista
            </h2>
            <p className="text-grimorio-gold/40 font-serif text-sm mt-1 tracking-wide italic">"Siente el peso de las cartas antes del primer conjuro."</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={drawOne}
              disabled={currentDeck.length === 0}
              className="px-6 py-3 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold rounded-xl hover:bg-blue-500/20 transition-all disabled:opacity-20 flex items-center gap-3 group"
            >
              <span className="group-hover:translate-y-1 transition-transform">📥</span> Robar ({currentDeck.length})
            </button>
            <button
              onClick={restartSimulation}
              className="px-8 py-3 bg-grimorio-gold text-black font-black rounded-xl hover:bg-white transition-all shadow-[0_0_20px_rgba(193,155,69,0.3)] active:scale-95 uppercase text-xs tracking-widest"
            >
              🔄 Nuevo Mulligan
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-white/10 text-white/40 rounded-xl hover:text-white hover:bg-white/5 transition-all font-bold text-xs uppercase"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Hand Grid - Con animación de robo suave */}
        <div className="flex-1 flex items-center justify-center relative py-12">
          <div className="relative w-full h-[400px] flex justify-center items-center">
            <AnimatePresence mode="popLayout">
            {hand.map((card, idx) => {
              const total = hand.length;
              const mid = (total - 1) / 2;
              
              const spread = total > 10 ? 55 : 85; 
              const rotFactor = total > 10 ? 1.2 : 2.2; 
              
              const rotation = (idx - mid) * rotFactor;
              const yOffset = Math.pow(Math.abs(idx - mid), 1.5) * (total > 10 ? 4 : 8);
              const xOffset = (idx - mid) * spread;

              return (
                <motion.div
                  key={`${mulliganCount}-${card.name}-${idx}`}
                  variants={{
                    hidden: { opacity: 0, y: 400, x: -100, rotate: -20 },
                    visible: (i) => ({
                      opacity: 1,
                      y: yOffset,
                      x: `calc(-50% + ${xOffset}px)`,
                      rotate: rotation,
                      zIndex: i,
                      transition: {
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                        mass: 0.8,
                        delay: i * 0.05
                      }
                    }),
                    hover: {
                      y: yOffset - 80,
                      scale: 1.2,
                      rotate: 0,
                      zIndex: 100,
                      transition: { type: "spring", stiffness: 400, damping: 28 }
                    }
                  }}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                  custom={idx}
                  exit={{ opacity: 0, scale: 0.5, y: -200, transition: { duration: 0.2 } }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 35
                  }}
                  className="absolute left-1/2 w-[220px]"
                  style={{ transformOrigin: "bottom center" }}
                >
                  <MagicCard 
                    card={card} 
                    showQuantity={false} 
                    isInteractive={false}
                    className="shadow-2xl"
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
