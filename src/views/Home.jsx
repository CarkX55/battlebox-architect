import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '../hooks/useIsMobile';
import { vibrateTouch } from '../utils/haptic';
import { cn } from '../utils/cn';

const DataIngestor = lazy(() => import('../components/molecules/DataIngestor'));
import { getCardCount } from '../services/dbIngestor';

export default function Home() {
  const isMobile = useIsMobile();
  const [cardCount, setCardCount] = useState(() => {
    const cached = localStorage.getItem('mtg_card_count');
    return cached ? parseInt(cached) : 0;
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isScrollOpen, setIsScrollOpen] = useState(false);
  const openSound = useRef(null);
  const closeSound = useRef(null);

  useEffect(() => {
    getCardCount().then((count) => {
      setCardCount(count);
      localStorage.setItem('mtg_card_count', count.toString());
      setIsLoaded(true);
    }).catch((err) => {
      console.error('Error:', err);
      setIsLoaded(true);
    });

    const timer = setTimeout(() => {
      openSound.current = new Audio('/ASSETS/audios/scroll_open.MP3');
      closeSound.current = new Audio('/ASSETS/audios/scroll_close.MP3');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleOpenScroll = () => {
    vibrateTouch();
    if (openSound.current) {
      openSound.current.currentTime = 0;
      openSound.current.play().catch(e => console.log("Audio playback failed:", e));
    }
    setIsScrollOpen(true);
  };

  const handleCloseScroll = () => {
    vibrateTouch();
    if (closeSound.current) {
      closeSound.current.currentTime = 0;
      closeSound.current.play().catch(e => console.log("Audio playback failed:", e));
    }
    setIsScrollOpen(false);
  };

  return (
    <div className={cn("flex flex-col items-center justify-start min-h-screen px-4", isMobile ? "py-4" : "py-12")}>
      <div className="relative w-full max-w-6xl grid grid-cols-1 grid-rows-1 items-start justify-items-center">
        <AnimatePresence>
          {!isScrollOpen ? (
            <motion.div
              key="closed-scroll"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ 
                opacity: 0, 
                scale: 0.95,
                transition: { duration: 0.5 } 
              }}
              className="col-start-1 row-start-1 relative cursor-pointer z-20 w-full"
              onClick={handleOpenScroll}
            >
              <img 
                src="/ASSETS/pergamino.webp" 
                alt="Pergamino Cerrado" 
                className="w-full h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                fetchpriority="high"
              />
              
              <motion.div
                className="absolute top-[52%] left-1/2 cursor-pointer"
                style={{ x: "-50%", y: "-50%" }}
                initial={{ opacity: 0, scale: 2, filter: "brightness(3) blur(15px)" }}
                animate={{ opacity: 1, scale: 1, filter: "brightness(1) blur(0px)" }}
                whileHover={{ scale: 1.1, filter: "brightness(1.2) drop-shadow(0 0 20px rgba(255,0,0,0.6))" }}
                whileTap={{ scale: 0.9 }}
                transition={{ 
                  delay: 0.5, 
                  duration: 1,
                  ease: "easeOut" 
                }}
                onClick={handleOpenScroll}
              >
                <img 
                  src="/ASSETS/SelloRojo.webp" 
                  alt="Sello Real" 
                  className={cn("drop-shadow-[0_0_30px_rgba(255,0,0,0.8)]", isMobile ? "w-20 h-20" : "w-32 h-32")}
                />
                <div className="absolute inset-0 bg-red-600/20 blur-3xl rounded-full -z-10" />
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-grimorio-gold font-cinzel text-sm tracking-widest whitespace-nowrap uppercase drop-shadow-[0_2px_10px_rgba(212,175,55,0.3)] drop-shadow-[0_4px_4px_rgba(0,0,0,1)]"
              >
                Pulsa el sello para desenrollar
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="open-scroll"
              initial={{ opacity: 0, height: 0, transformOrigin: "top" }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ 
                opacity: 0, 
                height: 0,
                transition: { duration: 1.5, ease: [0.16, 1, 0.3, 1] } 
              }}
              transition={{ 
                duration: 1.2,
                ease: [0.16, 1, 0.3, 1]
              }}
              className={cn(
                "col-start-1 row-start-1 relative w-full z-10 overflow-hidden shadow-2xl flex flex-col items-center",
                isMobile ? "rounded-2xl" : "rounded-b-3xl"
              )}
              style={isMobile ? {
                backgroundImage: "url('/ASSETS/PergAbierto.webp')",
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                minHeight: '75vh',
                padding: '12vh 6vw 5vh 6vw'
              } : {}}
            >
              {!isMobile && (
                <img 
                  src="/ASSETS/PergAbierto.webp" 
                  alt="Pergamino Abierto" 
                  className="w-full h-auto block drop-shadow-[0_40px_80px_rgba(0,0,0,0.9)]"
                  loading="lazy"
                />
              )}

              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.5, duration: 1.0, ease: "easeOut" }}
                className={cn(
                  "flex flex-col items-center overflow-y-auto custom-scrollbar w-full",
                  isMobile ? "h-[50vh] relative" : "absolute inset-0 z-10 pl-20 pr-10 pt-80 pb-24"
                )}
              >
                <div className={cn("w-full flex flex-col items-center text-center", isMobile ? "space-y-6" : "space-y-12", isMobile ? "max-w-full" : "max-w-2xl")}>
                  
                  <div className="w-full flex justify-center">
                    <img 
                      src="/ASSETS/PergaQuemado.webp" 
                      alt="Título Quemado" 
                      className="w-full h-auto drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
                      loading="lazy"
                    />
                  </div>

                  <div className="w-full">
                    <div className="h-px w-64 bg-black/20 mx-auto" />
                    <p className={cn("text-black/80 font-serif italic", isMobile ? "text-lg mt-2" : "text-2xl mt-4")}>
                      Arquitecto de mazos equilibrados
                    </p>
                  </div>

                  {!isLoaded ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <div className="w-12 h-12 border-4 border-black/10 border-t-grimorio-gold rounded-full animate-spin" />
                      <p className="font-cinzel text-xs text-black/40 tracking-widest uppercase animate-pulse">Consultando Registros...</p>
                    </div>
                  ) : cardCount === 0 ? (
                    <div className="w-full">
                      <Suspense fallback={<div className="animate-pulse text-black/40">Cargando Ingestor...</div>}>
                        <DataIngestor onComplete={async () => {
                          setTimeout(async () => {
                            const count = await getCardCount();
                            setCardCount(count);
                            localStorage.setItem('mtg_card_count', count.toString());
                          }, 1500);
                        }} />
                      </Suspense>
                    </div>
                  ) : (
                    <div className="w-full space-y-12">
                      <div className={cn("grid gap-6 w-full", isMobile ? "grid-cols-1" : "grid-cols-3")}>
                        {[
                          { label: "Cartas indexadas", value: cardCount.toLocaleString() },
                          { label: "Motor Karsten", value: "Fase 1" },
                          { label: "Estado del sistema", value: "Listo" }
                        ].map((stat, i) => (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 + (i * 0.1) }}
                            className="text-center group flex flex-col items-center"
                          >
                            <p className={cn("text-black font-cinzel font-black tracking-tight drop-shadow-sm group-hover:scale-105 transition-transform duration-500", isMobile ? "text-3xl" : "text-5xl")}>
                              {stat.value}
                            </p>
                            <p className="text-black/50 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 border-t border-black/10 pt-2 w-full max-w-[120px]">
                              {stat.label}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCloseScroll}
                  className="mt-8 mb-4 px-8 py-2.5 relative overflow-hidden group
                             bg-black/50 backdrop-blur-md border border-white/10 rounded-full
                             text-white/40 font-cinzel text-[11px] font-bold uppercase tracking-[0.4em]
                             hover:text-[#dc2626] hover:bg-black/70 hover:border-[#dc2626]/50
                             transition-all duration-500 shadow-[0_0_20px_rgba(0,0,0,0.5)]
                             hover:shadow-[0_0_25px_rgba(220,38,38,0.5)] shrink-0"
                  style={{
                    backgroundImage: "url('/ASSETS/FrostedGlass.webp')",
                    backgroundSize: 'cover',
                    backgroundBlendMode: 'overlay',
                    filter: 'brightness(1.3)'
                  }}
                >
                  <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] 
                                bg-gradient-to-r from-transparent via-white/15 to-transparent 
                                transition-transform duration-1000 ease-out" />
                  <span className="relative drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Volver a Enrollar</span>
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}